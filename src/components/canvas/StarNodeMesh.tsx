'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MusicNode, calculateStarVisualMetrics } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

interface StarNodeMeshProps {
  node: MusicNode;
  genreColor: string;
}

// Shared unit geometries across all stars to minimize WebGL memory & state switches
const UNIT_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 16, 16);
const UNIT_RING_GEOMETRY = new THREE.RingGeometry(1.42, 1.82, 28);
const UNIT_RIPPLE_GEOMETRY = new THREE.RingGeometry(1.4, 1.6, 36);

export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);

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
  useFrame((state) => {
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
  });

  // Smart LOD for DOM labels: prevents label clutter and keeps distant galaxy view clean
  const shouldShowLabel = useMemo(() => {
    if (isFilteredOut) return false;
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

    // 'artist' or 'song' mode: show active sector's artists and the selected artist's songs
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

      {/* High-affinity Equatorial Diffraction Ring (O-Supergiant & Selected stars) */}
      {(node.type === 'genre' || node.affinity >= 0.92 || isSelected) && (
        <mesh
          geometry={UNIT_RING_GEOMETRY}
          scale={metrics.coreRadius * (isSelected ? 1.2 : 1.0)}
          rotation={[Math.PI / 2.3, 0.25, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#CCFF00' : starColor}
            side={THREE.DoubleSide}
            transparent
            opacity={
              (isSelected ? 0.55 : 0.25 * node.affinity) * stellarBrightness
            }
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
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

      {/* Memory & UX optimization: keep Drei <Html> mounted with CSS visibility to prevent React 19 removeChild portal collisions */}
      <Html
        key={`star-label-${node.id}`}
        position={[0, metrics.coronaRadius + (node.type === 'genre' ? 0.55 : 0.3), 0]}
        center
        distanceFactor={node.type === 'genre' ? 28 : 20}
        zIndexRange={[1, 5]}
        className="select-none pointer-events-auto"
        style={{
          display: shouldShowLabel ? 'block' : 'none',
          pointerEvents: shouldShowLabel ? 'auto' : 'none',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(e);
          }}
          onPointerOver={() => hoverNode(node)}
          onPointerOut={() => hoverNode(null)}
          className={`cursor-pointer whitespace-nowrap font-mono tabular-nums tracking-tight transition-transform hover:scale-105 active:scale-95 ${
            node.type === 'genre'
              ? `px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-[0_0_14px_rgba(0,245,212,0.35)] backdrop-blur-md ${
                  isSelected
                    ? 'bg-[#F2F4F8] text-[#050508] border-[#CCFF00] shadow-[0_0_18px_rgba(204,255,0,0.5)]'
                    : isHovered
                    ? 'bg-[#050508]/95 text-[#00F5D4] border-[#00F5D4]'
                    : 'bg-[#050508]/85 text-[#F2F4F8] border-[#00F5D4]/40'
                }`
              : `px-2 py-0.5 rounded text-[10px] ${
                  isSelected
                    ? 'bg-[#F2F4F8] text-[#050508] font-bold shadow-[0_4px_14px_rgba(0,245,212,0.45)]'
                    : isHovered
                    ? 'bg-[#050508]/95 text-[#F2F4F8] border border-[#00F5D4]'
                    : 'bg-[#050508]/80 text-[#B8DCE8] border border-[#00F5D4]/20'
                }`
          }`}
        >
          <span>{nodeLabel}</span>
          {node.type !== 'song' && (
            <span
              className={`ml-1.5 text-[9px] ${
                isSelected ? 'text-[#050508]/80' : 'text-[#00F5D4]'
              }`}
            >
              {songCount}p · {affinityPct}%
            </span>
          )}
        </div>
      </Html>
    </group>
  );
};
