'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
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
const UNIT_DIFFRACTION_GEOMETRY = new THREE.PlaneGeometry(3.6, 0.05);

/**
 * Injects silky radial falloff & Cassini divisions into planetary ring materials
 * so dust rings look like authentic celestial disks rather than solid plastic washers.
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
    // Exact radial distance in planar UV space (center at 0.5, 0.5)
    float rDist = length(vRingUv - vec2(0.5));
    float rNorm = clamp((rDist - 0.35) / (0.495 - 0.35), 0.0, 1.0);
    // Smooth bell curve: mathematically 0 at inner AND outer edges (zero sharp plastic cliffs)
    float radialFade = sin(rNorm * 3.14159265);
    // Translucent Cassini division micro-grooves
    float divisions = 0.72 + 0.28 * sin(rNorm * 37.7);
    diffuseColor.a *= (radialFade * radialFade * divisions);
    `
  );
}

/**
 * Injects atmospheric limb darkening (Fresnel thermal gradient) into star cores
 * giving them genuine astronomical depth instead of flat plastic discs.
 */
function starCoreOnBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader = `
    varying vec3 vLocalNormal;
    varying vec3 vViewDir;
    ${shader.vertexShader}
  `.replace(
    '#include <defaultnormal_vertex>',
    `
    #include <defaultnormal_vertex>
    vLocalNormal = normalize(transformedNormal);
    vViewDir = -mvPosition.xyz;
    `
  );
  shader.fragmentShader = `
    varying vec3 vLocalNormal;
    varying vec3 vViewDir;
    ${shader.fragmentShader}
  `.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    vec3 vDir = normalize(vViewDir);
    float NdotV = clamp(dot(vLocalNormal, vDir), 0.0, 1.0);
    // Stellar limb darkening: incandescent hot core, soft atmospheric edge falloff
    float limb = pow(NdotV, 0.45);
    diffuseColor.rgb = mix(diffuseColor.rgb * 0.70, diffuseColor.rgb * 1.25, limb);
    `
  );
}

export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const satelliteRef = useRef<THREE.Group>(null);
  const diffractionRef = useRef<THREE.Group>(null);

  // Performance-critical: Selective subscriptions prevent mass re-renders across 100+ stars
  const selectedNodeId = useGalaxyStore((s) => s.selectedNode?.id);
  const isSelected = selectedNodeId === node.id;
  const isParentArtistSelected = node.type === 'song' && selectedNodeId === node.artistId;
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

  // Authentic stellar core tint: preserves natural color with subtle high-affinity thermal heat (never washes out into blinding white)
  const coreColor = useMemo(() => {
    const base = new THREE.Color(starColor);
    const white = new THREE.Color('#F2F4F8');
    base.lerp(white, node.affinity * 0.10);
    return '#' + base.getHexString();
  }, [starColor, node.affinity]);

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

    // Strict Proximity Anti-Glare: smoothly eliminates the outer additive corona as camera approaches
    let coronaProximity = 1.0;
    let distToCam = 100.0;
    if (groupRef.current) {
      distToCam = camera.position.distanceTo(groupRef.current.position);
      // Fades smoothly from distance 24 down to 7.5, completely zero at <= 7.5
      coronaProximity = THREE.MathUtils.clamp((distToCam - 7.5) / 16.5, 0.0, 1.0);
    }

    if (coronaRef.current) {
      if (coronaProximity <= 0.001) {
        coronaRef.current.visible = false;
      } else {
        coronaRef.current.visible = true;
        const curScale = metrics.coreRadius * (1.05 + 0.30 * coronaProximity);
        coronaRef.current.scale.setScalar(curScale);

        const coronaMat = coronaRef.current.material as THREE.MeshBasicMaterial;
        if (coronaMat) {
          coronaMat.opacity = metrics.coronaOpacity * stellarBrightness * 0.35 * coronaProximity;
        }
      }
    }

    if (diffractionRef.current) {
      // Hide diffraction spikes when camera is closer than 16 units
      diffractionRef.current.visible = distToCam >= 16.0;
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
      const s =
        metrics.coreRadius *
        (1 +
          Math.sin(t * 0.8 + node.position[0]) * 0.035 +
          audioKick);
      meshRef.current.scale.setScalar(s);
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

  // Smart LOD for labels: shows song titles whenever parent artist is selected or camera is focused
  const shouldShowLabel = useMemo(() => {
    if (isFilteredOut) return false;
    if (isSelected || isHovered || isPlayingNode) return true;

    if (node.type === 'song') {
      return (
        isParentArtistSelected ||
        (cameraMode === 'artist' && node.artistId === selectedNodeId)
      );
    }

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
    isPlayingNode,
    node,
    isParentArtistSelected,
    cameraMode,
    selectedNodeId,
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

      {/* Outer Bioluminescent Corona (steady, calm ambient glow - zero glare/flare-up on approach) */}
      <mesh
        ref={coronaRef}
        geometry={UNIT_SPHERE_GEOMETRY}
        scale={metrics.coronaRadius * (0.8 + 0.3 * stellarBrightness)}
        visible={stellarBrightness > 0.12}
      >
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={metrics.coronaOpacity * stellarBrightness * 0.70}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Primary Equatorial Accretion Ring (Tier 2/3 artists or selected artist/song, never on genres) */}
      {node.type !== 'genre' && (metrics.hasAccretionRing || isSelected) && (
        <mesh
          ref={ringRef}
          geometry={UNIT_RING_GEOMETRY}
          scale={metrics.coreRadius * 1.05}
          rotation={[Math.PI / 2.3, 0.25, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#CCFF00' : starColor}
            side={THREE.DoubleSide}
            transparent
            opacity={Math.min(0.35, 0.16 + 0.18 * node.affinity) * stellarBrightness}
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
            opacity={0.28 * stellarBrightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            onBeforeCompile={softRingOnBeforeCompile}
          />
        </mesh>
      )}

      {/* 4-Point Optical Diffraction Spikes (Tier 3 Supergiant Artists - fades on close approach) */}
      {node.type === 'artist' && metrics.artistTier === 'supergiant' && (
        <group ref={diffractionRef}>
          <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <mesh geometry={UNIT_DIFFRACTION_GEOMETRY} scale={metrics.coreRadius * 2.8}>
              <meshBasicMaterial
                color={starColor}
                transparent
                opacity={0.28 * stellarBrightness}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <mesh
              geometry={UNIT_DIFFRACTION_GEOMETRY}
              scale={metrics.coreRadius * 2.8}
              rotation={[0, 0, Math.PI / 2]}
            >
              <meshBasicMaterial
                color={starColor}
                transparent
                opacity={0.28 * stellarBrightness}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </Billboard>
        </group>
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

      {/* Core Star Sphere: Atmospheric limb darkening prevents flat plastic bead appearance */}
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
        <meshBasicMaterial color={coreColor} onBeforeCompile={starCoreOnBeforeCompile} />
      </mesh>

      {/* Native WebGL SDF Text & Billboard: zero DOM nodes, 60 FPS GPU-rendered, completely eliminates React 19 removeChild collision */}
      {shouldShowLabel && (
        <Billboard
          position={[
            0,
            metrics.coronaRadius + (node.type === 'genre' ? 0.90 : node.type === 'artist' ? 0.45 : 0.28),
            0,
          ]}
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            fontSize={node.type === 'genre' ? 0.65 : node.type === 'artist' ? 0.36 : 0.22}
            color={isSelected || isPlayingNode ? '#CCFF00' : isHovered ? '#00F5D4' : '#F2F4F8'}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={node.type === 'genre' ? 0.08 : node.type === 'artist' ? 0.052 : 0.036}
            outlineColor="#020205"
            outlineOpacity={1.0}
            renderOrder={99}
            depthOffset={-1}
            letterSpacing={0.02}
            maxWidth={node.type === 'song' ? 3.5 : 5.0}
            textAlign="center"
          >
            {nodeLabel}
          </Text>
          <Text
            position={[0, -0.05, 0]}
            fontSize={node.type === 'genre' ? 0.30 : node.type === 'artist' ? 0.20 : 0.15}
            color={isSelected || isPlayingNode ? '#CCFF00' : '#00F5D4'}
            anchorX="center"
            anchorY="top"
            outlineWidth={0.035}
            outlineColor="#020205"
            outlineOpacity={1.0}
            renderOrder={99}
            depthOffset={-1}
          >
            {node.type === 'song'
              ? (node.duration ? `${Math.floor(node.duration / 60)}:${Math.floor(node.duration % 60).toString().padStart(2, '0')} · ${affinityPct}%` : `${affinityPct}%`)
              : `${songCount}p · ${affinityPct}%`}
          </Text>
        </Billboard>
      )}
    </group>
  );
};
