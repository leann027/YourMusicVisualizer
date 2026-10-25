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
const UNIT_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 18, 18);
const UNIT_RING_GEOMETRY = new THREE.RingGeometry(1.42, 1.82, 28);

export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const hoveredNode = useGalaxyStore((s) => s.hoveredNode);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const cameraDistance = useGalaxyStore((s) => s.cameraDistance);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);
  const isAudioPlaying = useGalaxyStore((s) => s.isAudioPlaying);
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const hoverNode = useGalaxyStore((s) => s.hoverNode);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);

  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoveredNode?.id === node.id;
  const isPlayingNode =
    isAudioPlaying &&
    (playingTrackId === node.id ||
      (node.type === 'artist' &&
        selectedNode?.type === 'song' &&
        selectedNode.artistId === node.id &&
        playingTrackId === selectedNode.id));
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

  // Calibrated stellar respiration, orbital drift & FFT audio-reactive corona shimmer
  useFrame((state) => {
    if (isFilteredOut) return;
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    // Story 2: Gentle celestial drift & planetary undulating motion
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

    const audioKick =
      fft.isPlaying && (isPlayingNode || isSelected)
        ? fft.subBass * 0.42 + fft.energy * 0.25
        : fft.isPlaying
        ? fft.subBass * 0.08 * node.affinity
        : 0;

    if (meshRef.current) {
      const amp = isSelected ? 0.12 : isHovered ? 0.08 : 0.035 * node.affinity;
      const s =
        metrics.coreRadius *
        (1 +
          Math.sin(t * metrics.pulseFrequency + node.position[0]) * amp +
          audioKick);
      meshRef.current.scale.setScalar(s);
    }

    if (coronaRef.current) {
      const coronaAudioBoost =
        fft.isPlaying && (isPlayingNode || isSelected)
          ? fft.midHarmonic * 0.65 + fft.highShimmer * 0.45
          : fft.isPlaying
          ? fft.energy * 0.14
          : 0;
      const coronaScale =
        metrics.coronaRadius *
        ((isSelected ? 1.25 : isHovered ? 1.12 : 1.0) +
          Math.cos(t * (metrics.pulseFrequency * 0.7) + node.position[1]) * 0.05 +
          coronaAudioBoost);
      coronaRef.current.scale.setScalar(coronaScale);
    }
  });

  // Smart LOD for DOM labels: prevents label clutter and keeps distant galaxy view clean
  const shouldShowLabel = useMemo(() => {
    if (isFilteredOut) return false;
    if (isSelected || isHovered) return true;

    const nodeSectorId = node.type === 'genre' ? node.id : node.genreId;

    if (cameraMode === 'galaxy') {
      // In galaxy overview, ONLY render Genre Constellation badges.
      // This leaves the galactic plane clean and makes distant viewing clear and uncluttered.
      return node.type === 'genre';
    }

    if (cameraMode === 'sector') {
      return (
        nodeSectorId === selectedSectorId &&
        (node.type === 'genre' || node.type === 'artist')
      );
    }

    // 'artist' or 'song' mode: show active sector's artists and the selected artist's songs
    if (node.type === 'song') {
      return (
        selectedNode?.id === node.artistId ||
        (selectedNode?.type === 'song' && selectedNode.artistId === node.artistId)
      );
    }

    return nodeSectorId === selectedSectorId && node.type === 'artist';
  }, [
    isFilteredOut,
    isSelected,
    isHovered,
    node,
    cameraMode,
    selectedSectorId,
    selectedNode,
  ]);

  const handleSelect = (e?: React.MouseEvent | THREE.Event | { stopPropagation?: () => void }) => {
    if (e && 'stopPropagation' in e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    selectNode(node);
    if (node.type === 'song') {
      webAudioEngine.playTrack(
        node.id,
        node.title,
        node.affinity,
        node.previewUrl
      );
      setAudioPlayback(node.id, true);
    } else if (isAudioPlaying) {
      const matchSong =
        node.type === 'artist'
          ? data.songs.find((s) => s.artistId === node.id && s.previewUrl) ||
            data.songs.find((s) => s.artistId === node.id)
          : data.songs.find((s) => s.genreId === node.id && s.previewUrl) ||
            data.songs.find((s) => s.genreId === node.id);
      if (matchSong) {
        webAudioEngine.playTrack(
          matchSong.id,
          matchSong.title,
          matchSong.affinity,
          matchSong.previewUrl
        );
        setAudioPlayback(matchSong.id, true);
      }
    }
  };

  const nodeLabel = 'name' in node ? node.name : node.title;
  const affinityPct = Math.round(node.affinity * 100);

  return (
    <group ref={groupRef} position={node.position} visible={!isFilteredOut}>
      {/* Invisible Expanded Raycast Hit Sphere for effortless clicking from any distance */}
      <mesh
        scale={Math.max(1.8, metrics.coreRadius * 2.6)}
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

      {/* Story 3: Distance-scaled interactive DOM label with direct click-to-select */}
      <Html
        key={`star-label-${node.id}`}
        position={[0, metrics.coronaRadius + (node.type === 'genre' ? 0.55 : 0.3), 0]}
        center
        distanceFactor={node.type === 'genre' ? 28 : 20}
        zIndexRange={[1, 5]}
        style={{
          display: shouldShowLabel ? 'block' : 'none',
          pointerEvents: shouldShowLabel ? 'auto' : 'none',
        }}
        className="select-none"
      >
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onPointerDown={handleSelect}
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
