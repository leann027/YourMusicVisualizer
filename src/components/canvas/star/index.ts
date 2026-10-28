'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MusicNode, calculateStarVisualMetrics } from '../../../types/music';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { bridgeRingColor } from '../nebulaV3/bridges';

import { StarCoreMesh } from './StarCoreMesh';
import { StarAccretionRings } from './StarAccretionRings';
import { StarFeatures } from './StarFeatures';
import { StarPlaybackPulsar } from './StarPlaybackPulsar';
import { StarLabel } from './StarLabel';

export interface StarNodeMeshProps {
  node: MusicNode;
  genreColor: string;
}

export type GalaxyNode = MusicNode;

/**
 * Root coordinator component for celestial star nodes (`StarNodeMesh`).
 * Modularized into single-responsibility subcomponents:
 * - StarCoreMesh: Limb darkening core, hit sphere, and bioluminescent corona
 * - StarAccretionRings: Primary and secondary accretion disks
 * - StarFeatures: Polar jets, diffraction spikes, and micro-satellites
 * - StarPlaybackPulsar: Conditionally mounted ONLY during active playback for 3-ring waves and sparks
 * - StarLabel: Native WebGL SDF Billboard text with LOD calculation
 */
export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
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
  const rendererMode = useGalaxyStore((s) => s.rendererMode);
  const baseData = useGalaxyStore((s) => s.baseData);
  // nebula galaxy view shows only the 5 nearest genre labels (M8.3); classic has no limit
  const genreLabelAllowed = useGalaxyStore(
    (s) => node.type !== 'genre' || s.rendererMode !== 'nebula' || !s.nebulaGenreLabelIds || s.nebulaGenreLabelIds.includes(node.id)
  );
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const hoverNode = useGalaxyStore((s) => s.hoverNode);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);

  const isFilteredOut = node.affinity < minAffinityFilter;
  // Nebulosas v3 (B1): the visible star is a StarField point; this mesh keeps the interactive parts
  const luminous = rendererMode === 'nebula';
  const metrics = useMemo(() => calculateStarVisualMetrics(node), [node]);
  // Nebulosas v3: songs placed in a collision get a ring in the pair's mixed colour
  const bridgeColor = useMemo(
    () => (node.type === 'song' && rendererMode === 'nebula' ? bridgeRingColor(node.id, getNebulaLayout(baseData)) : null),
    [node, rendererMode, baseData]
  );

  const starColor = useMemo(() => {
    if (node.type === 'genre') return node.color;
    return genreColor || '#00F5D4';
  }, [node, genreColor]);

  // Authentic stellar core tint: preserves natural color with subtle high-affinity thermal heat
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

  // Calibrated stellar respiration, orbital drift & corona proximity anti-glare
  useFrame((state, delta) => {
    if (isFilteredOut) return;
    const t = state.clock.getElapsedTime();

    // Gentle celestial drift & planetary undulating motion (classic only: in nebula mode the
    // StarField point, the hit sphere and the camera all stay on node.position)
    if (!prefersReducedMotion && !luminous && groupRef.current) {
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
    if (shouldAnimate) {
      let audioKick = 0;
      if (isPlayingNode || isSelected) {
        const fft = webAudioEngine.sampleFFT();
        audioKick =
          fft.isPlaying && isPlayingNode
            ? fft.subBass * 0.20 + fft.energy * 0.10
            : fft.isPlaying && isSelected
            ? fft.subBass * 0.08
            : 0;

        if (coronaRef.current && isPlayingNode && fft.isPlaying) {
          const cScale =
            metrics.coronaRadius * (0.8 + 0.3 * stellarBrightness) * (1.0 + fft.subBass * 0.22);
          coronaRef.current.scale.setScalar(cScale);
        }
      }

      if (meshRef.current) {
        const s =
          metrics.coreRadius *
          (1 + Math.sin(t * 0.8 + node.position[0]) * 0.035 + audioKick);
        meshRef.current.scale.setScalar(s);
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
      return node.type === 'genre' && genreLabelAllowed;
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
    genreLabelAllowed,
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
    // Guard: ignore drag movements during camera orbits
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

  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    hoverNode(node);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    hoverNode(null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = 'auto';
    }
  };

  return React.createElement(
    'group',
    { ref: groupRef, position: node.position, visible: !isFilteredOut },
    React.createElement(StarCoreMesh, {
      metrics,
      coreColor,
      starColor,
      stellarBrightness,
      hitScale,
      meshRef,
      coronaRef,
      onSelect: handleSelect,
      onPointerOver: handlePointerOver,
      onPointerOut: handlePointerOut,
      showBody: !luminous,
    }),
    luminous
      ? null
      : React.createElement(StarAccretionRings, {
          nodeType: node.type,
          affinity: node.affinity,
          metrics,
          starColor,
          isSelected,
          stellarBrightness,
          ringRef,
        }),
    React.createElement(StarFeatures, {
      nodeType: node.type,
      metrics,
      starColor,
      stellarBrightness,
      diffractionRef,
      satelliteRef,
      bridgeColor,
      bodyFeatures: !luminous,
    }),
    isPlayingNode
      ? React.createElement(StarPlaybackPulsar, {
          metrics,
          stellarBrightness,
          prefersReducedMotion,
        })
      : null,
    React.createElement(StarLabel, {
      node,
      metrics,
      isSelected,
      isHovered,
      isPlayingNode,
      shouldShowLabel,
    })
  );
};

export { StarCoreMesh } from './StarCoreMesh';
export type { StarCoreMeshProps } from './StarCoreMesh';
export { StarAccretionRings } from './StarAccretionRings';
export type { StarAccretionRingsProps } from './StarAccretionRings';
export { StarFeatures } from './StarFeatures';
export type { StarFeaturesProps } from './StarFeatures';
export { StarPlaybackPulsar } from './StarPlaybackPulsar';
export type { StarPlaybackPulsarProps } from './StarPlaybackPulsar';
export { StarLabel } from './StarLabel';
export type { StarLabelProps } from './StarLabel';
export * from './starGeometries';
export * from './shaders/starShaders';
