'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { MusicNode, calculateStarVisualMetrics } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

interface StarNodeMeshProps {
  node: MusicNode;
  genreColor: string;
}

// Shared unit geometries across all stars to minimize WebGL memory & state switches
const UNIT_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 16, 16);
const UNIT_RING_GEOMETRY = new THREE.RingGeometry(1.35, 1.95, 32, 8);
const UNIT_OUTER_RING_GEOMETRY = new THREE.RingGeometry(2.0, 2.5, 36, 8);
const UNIT_RIPPLE_GEOMETRY = new THREE.RingGeometry(1.4, 1.6, 36);
const UNIT_POLAR_JET_GEOMETRY = new THREE.CylinderGeometry(0.04, 0.28, 4.0, 12, 1, true);
const UNIT_SATELLITE_GEOMETRY = new THREE.SphereGeometry(0.05, 8, 8);

/**
 * Injects a smooth sinusoidal radial falloff into RingGeometry materials
 * so planetary dust rings fade out seamlessly with zero sharp cutoffs.
 */
function softRingOnBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = `
    varying vec2 vRingUv;
    ${shader.vertexShader}
  `.replace(
    '#include <uv_vertex>',
    `
    #include <uv_vertex>
    vRingUv = uv;
    `
  );
  shader.fragmentShader = `
    varying vec2 vRingUv;
    ${shader.fragmentShader}
  `.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    float ringAlpha = sin(vRingUv.y * 3.14159265);
    diffuseColor.a *= (ringAlpha * ringAlpha);
    `
  );
}

export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const satelliteRef = useRef<THREE.Group>(null);

  // Performance-critical: Selective subscriptions prevent mass re-renders across 100+ stars
  const isSelected = useGalaxyStore((s) => s.selectedNode?.id === node.id);
  const isHovered = useGalaxyStore((s) => s.hoveredNode?.id === node.id);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const isPlayingNode = useGalaxyStore(
    (s) => s.isAudioPlaying && s.playingTrackId === node.id
  );
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const hoverNode = useGalaxyStore((s) => s.hoverNode);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);

  const isFilteredOut = node.affinity < minAffinityFilter;
  const songCount = 'songCount' in node ? node.songCount : 1;
  const metrics = useMemo(() => calculateStarVisualMetrics(node), [node]);

  const starColor = useMemo(() => {
    if (node.type === 'genre') return node.color;
    return genreColor || '#00F5D4';
  }, [node, genreColor]);

  // High-affinity stars have a hotter, brighter core tint
  const coreColor = useMemo(() => {
    const base = new THREE.Color(starColor);
    const white = new THREE.Color('#F2F4F8');
    base.lerp(white, isSelected ? 0.55 : node.affinity * 0.35);
    return '#' + base.getHexString();
  }, [starColor, isSelected, node.affinity]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Calibrated invisible hit sphere preventing overlap and mis-clicks during camera orbits
  const hitScale = useMemo(() => {
    if (node.type === 'genre') return Math.max(1.1, metrics.coreRadius * 1.35);
    if (node.type === 'artist') return Math.max(0.48, metrics.coreRadius * 1.4);
    return Math.max(0.24, metrics.coreRadius * 1.45);
  }, [node.type, metrics.coreRadius]);

  // Calibrated stellar respiration, orbital drift & FFT audio-reactive corona shimmer
  useFrame((state, delta) => {
    if (isFilteredOut) return;
    const t = state.clock.getElapsedTime();

    // Gentle celestial drift & planetary undulating motion
    if (!prefersReducedMotion && groupRef.current) {
      const seed = node.position[0] * 3.1 + node.position[2] * 7.3;
      if (node.type === 'song') {
        groupRef.current.position.x =
          node.position[0] + Math.sin(t * 0.45 + seed) * 0.22;
        groupRef.current.position.z =
          node.position[2] + Math.cos(t * 0.45 + seed) * 0.22;
        groupRef.current.position.y =
          node.position[1] + Math.sin(t * 0.65 + seed) * 0.12;
      } else if (node.type === 'artist') {
        groupRef.current.position.x =
          node.position[0] + Math.sin(t * 0.16 + seed) * 0.32;
        groupRef.current.position.z =
          node.position[2] + Math.cos(t * 0.16 + seed) * 0.32;
        groupRef.current.position.y =
          node.position[1] + Math.sin(t * 0.22 + seed) * 0.18;
      }
    }

    if (prefersReducedMotion) return;

    // Performance optimization: only compute dynamic scale animations for active/hovered/playing stars
    const shouldAnimate = isPlayingNode || isSelected || isHovered;
    if (!shouldAnimate) return;

    const fft = webAudioEngine.sampleFFT();
    // Gentle, photosensitive-safe audio respiration (zero sudden flashes or strobes)
    const audioKick =
      fft.isPlaying && (isPlayingNode || isSelected)
        ? fft.subBass * 0.08
        : 0;

    if (meshRef.current) {
      const amp = isSelected ? 0.06 : 0.04;
      const s =
        metrics.coreRadius *
        (1 +
          Math.sin(t * 0.8 + node.position[0]) * amp +
          audioKick);
      meshRef.current.scale.setScalar(s);
    }

    if (coronaRef.current) {
      const coronaScale =
        metrics.coronaRadius *
        ((isSelected ? 1.18 : 1.08) +
          Math.cos(t * 0.6 + node.position[1]) * 0.03);
      coronaRef.current.scale.setScalar(coronaScale);
    }

    // Serene, calm orbital ring for currently playing star (slow 4s smooth breathing)
    if (rippleRef.current && isPlayingNode) {
      const slowPhase = (t * 0.25) % 1.0;
      const rippleScale = metrics.coreRadius * (1.1 + slowPhase * 0.8);
      rippleRef.current.scale.setScalar(rippleScale);
      const rippleMat = rippleRef.current.material as THREE.MeshBasicMaterial;
      if (rippleMat) {
        const fade = (1.0 - slowPhase) * 0.45;
        rippleMat.opacity = Math.max(0, fade * stellarBrightness);
      }
    }

    if (ringRef.current && !prefersReducedMotion) {
      ringRef.current.rotation.z += delta * 0.20;
    }

    if (satelliteRef.current && !prefersReducedMotion) {
      satelliteRef.current.rotation.y += delta * 0.75;
    }
  });

  // Smart LOD for DOM labels: prevents label clutter and keeps distant galaxy view clean
  const shouldShowLabel = useMemo(() => {
    if (isFilteredOut) return false;
    // Songs never render Drei <Html> portals: saves DOM memory and prevents React 19 removeChild collision
    if (node.type === 'song') return false;
    if (isSelected || isHovered) return true;

    const nodeSectorId = node.type === 'genre' ? node.id : node.genreId;

    if (cameraMode === 'galaxy') {
      return node.type === 'genre';
    }

    if (cameraMode === 'sector') {
      return (
        nodeSectorId === selectedSectorId &&
        (node.type === 'genre' || node.type === 'artist')
      );
    }

    // 'artist' or 'song' mode: show active sector's artists
    return (
      nodeSectorId === selectedSectorId &&
      (node.type === 'genre' || node.type === 'artist' || isSelected)
    );
  }, [
    isFilteredOut,
    isSelected,
    isHovered,
    node,
    cameraMode,
    selectedSectorId,
  ]);

  const handleSelect = (
    e?: React.MouseEvent | THREE.Event | { stopPropagation?: () => void; delta?: number }
  ) => {
    // Crucial UX guard: If user was dragging / orbiting the camera (delta > 4px), ignore click!
    if (e && 'delta' in e && typeof e.delta === 'number' && e.delta > 4) {
      return;
    }
    if (e && 'stopPropagation' in e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    selectNode(node);
    const allSongs = useGalaxyStore.getState().data.songs;

    if (node.type === 'song') {
      webAudioEngine.playTrack(
        node.id,
        node.title,
        node.affinity,
        node.previewUrl
      );
      setAudioPlayback(node.id, true);
    } else if (node.type === 'artist') {
      // Story 1: Touching an artist star immediately picks a random song by that artist and plays it
      const artistSongs = allSongs.filter((s) => s.artistId === node.id);
      if (artistSongs.length > 0) {
        const withPreview = artistSongs.filter((s) => s.previewUrl);
        const candidates = withPreview.length > 0 ? withPreview : artistSongs;
        const randomSong = candidates[Math.floor(Math.random() * candidates.length)];
        webAudioEngine.playTrack(
          randomSong.id,
          randomSong.title,
          randomSong.affinity,
          randomSong.previewUrl
        );
        setAudioPlayback(randomSong.id, true);
      }
    } else if (node.type === 'genre') {
      // Touching a genre star plays a random track from that celestial constellation
      const genreSongs = allSongs.filter((s) => s.genreId === node.id);
      if (genreSongs.length > 0) {
        const withPreview = genreSongs.filter((s) => s.previewUrl);
        const candidates = withPreview.length > 0 ? withPreview : genreSongs;
        const randomSong = candidates[Math.floor(Math.random() * candidates.length)];
        webAudioEngine.playTrack(
          randomSong.id,
          randomSong.title,
          randomSong.affinity,
          randomSong.previewUrl
        );
        setAudioPlayback(randomSong.id, true);
      }
    }
  };

  const nodeLabel = 'name' in node ? node.name : node.title;
  const affinityPct = Math.round(node.affinity * 100);

  return (
    <group ref={groupRef} position={node.position} visible={!isFilteredOut}>
      {/* Invisible Raycast Hit Sphere calibrated to prevent mis-clicks during camera orbits */}
      <mesh
        scale={hitScale}
        onClick={handleSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          hoverNode(node);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverNode(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Outer Bioluminescent Corona (scaled by affinity^1.6 & stellarBrightness) */}
      <mesh
        ref={coronaRef}
        geometry={UNIT_SPHERE_GEOMETRY}
        scale={metrics.coronaRadius * (0.8 + 0.3 * stellarBrightness)}
        visible={stellarBrightness > 0.12}
      >
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={
            (isSelected
              ? Math.min(0.38, metrics.coronaOpacity + 0.12)
              : isHovered
              ? Math.min(0.28, metrics.coronaOpacity + 0.08)
              : metrics.coronaOpacity) * stellarBrightness
          }
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Primary Equatorial Accretion Ring (Tier 2/3 artists or selected artist/song, never on genres) */}
      {node.type !== 'genre' && (metrics.hasAccretionRing || isSelected) && (
        <mesh
          ref={ringRef}
          geometry={UNIT_RING_GEOMETRY}
          scale={metrics.coreRadius * (isSelected ? 1.25 : 1.05)}
          rotation={[Math.PI / 2.3, 0.25, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#CCFF00' : starColor}
            side={THREE.DoubleSide}
            transparent
            opacity={
              (isSelected ? 0.60 : Math.min(0.45, 0.18 + 0.25 * node.affinity)) * stellarBrightness
            }
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            onBeforeCompile={softRingOnBeforeCompile}
          />
        </mesh>
      )}

      {/* Secondary Counter-Rotating Accretion Ring (Tier 3 Supergiant Artists only) */}
      {node.type !== 'genre' && metrics.hasDoubleRing && (
        <mesh
          geometry={UNIT_OUTER_RING_GEOMETRY}
          scale={metrics.coreRadius * 1.15}
          rotation={[-Math.PI / 2.6, -0.35, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#00F5D4' : '#CCFF00'}
            side={THREE.DoubleSide}
            transparent
            opacity={(isSelected ? 0.65 : 0.35) * stellarBrightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            onBeforeCompile={softRingOnBeforeCompile}
          />
        </mesh>
      )}

      {/* Relativistic Polar Energy Jets (Tier 3 Dominant Sector Active Galactic Nuclei) */}
      {metrics.hasPolarJets && (
        <group>
          {/* North Polar Jet */}
          <mesh
            geometry={UNIT_POLAR_JET_GEOMETRY}
            position={[0, 2.2 * metrics.coreRadius, 0]}
          >
            <meshBasicMaterial
              color={starColor}
              transparent
              opacity={0.35 * stellarBrightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* South Polar Jet */}
          <mesh
            geometry={UNIT_POLAR_JET_GEOMETRY}
            position={[0, -2.2 * metrics.coreRadius, 0]}
            rotation={[Math.PI, 0, 0]}
          >
            <meshBasicMaterial
              color={starColor}
              transparent
              opacity={0.35 * stellarBrightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Orbiting Micro-Satellites (Tier 3 Supergiant Artists) */}
      {metrics.hasOrbitalSatellites && (
        <group ref={satelliteRef}>
          <mesh
            geometry={UNIT_SATELLITE_GEOMETRY}
            position={[metrics.coreRadius * 2.2, 0, 0]}
          >
            <meshBasicMaterial color="#CCFF00" />
          </mesh>
          <mesh
            geometry={UNIT_SATELLITE_GEOMETRY}
            position={[-metrics.coreRadius * 1.8, metrics.coreRadius * 0.35, metrics.coreRadius * 1.1]}
          >
            <meshBasicMaterial color="#00F5D4" />
          </mesh>
          <mesh
            geometry={UNIT_SATELLITE_GEOMETRY}
            position={[metrics.coreRadius * 0.9, -metrics.coreRadius * 0.45, -metrics.coreRadius * 1.9]}
          >
            <meshBasicMaterial color="#FF2A85" />
          </mesh>
        </group>
      )}

      {/* Audio Pulsar Shockwave Ripple when track is actively playing */}
      {isPlayingNode && (
        <mesh
          ref={rippleRef}
          geometry={UNIT_RIPPLE_GEOMETRY}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <meshBasicMaterial
            color="#00F5D4"
            side={THREE.DoubleSide}
            transparent
            opacity={0.65 * stellarBrightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Core Star Sphere */}
      <mesh
        ref={meshRef}
        geometry={UNIT_SPHERE_GEOMETRY}
        scale={metrics.coreRadius}
        onClick={handleSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          hoverNode(node);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          hoverNode(null);
          document.body.style.cursor = 'auto';
        }}
      >
        <meshBasicMaterial color={coreColor} />
      </mesh>

      {/* Native WebGL SDF Text & Billboard: zero DOM nodes, 60 FPS GPU-rendered, completely eliminates React 19 removeChild collision */}
      {node.type !== 'song' && shouldShowLabel && (
        <Billboard
          position={[0, metrics.coronaRadius + (node.type === 'genre' ? 0.85 : 0.45), 0]}
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            fontSize={node.type === 'genre' ? 0.72 : 0.44}
            color={isSelected ? '#CCFF00' : isHovered ? '#00F5D4' : '#F2F4F8'}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.045}
            outlineColor="#050508"
            renderOrder={99}
            depthOffset={-1}
            letterSpacing={0.02}
          >
            {nodeLabel}
          </Text>
          <Text
            position={[0, -0.06, 0]}
            fontSize={node.type === 'genre' ? 0.36 : 0.25}
            color={isSelected ? '#CCFF00' : '#00F5D4'}
            anchorX="center"
            anchorY="top"
            outlineWidth={0.03}
            outlineColor="#050508"
            renderOrder={99}
            depthOffset={-1}
          >
            {`${songCount}p · ${affinityPct}%`}
          </Text>
        </Billboard>
      )}
    </group>
  );
};
