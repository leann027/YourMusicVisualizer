'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MusicNode, calculateStarVisualMetrics } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';

interface StarNodeMeshProps {
  node: MusicNode;
  genreColor: string;
}

// Shared unit geometries across all stars to minimize WebGL memory & state switches
const UNIT_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 18, 18);
const UNIT_RING_GEOMETRY = new THREE.RingGeometry(1.42, 1.82, 28);

export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const hoveredNode = useGalaxyStore((s) => s.hoveredNode);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const hoverNode = useGalaxyStore((s) => s.hoverNode);

  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoveredNode?.id === node.id;
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

  // Calibrated stellar respiration & corona shimmer (disabled under prefers-reduced-motion)
  useFrame((state) => {
    if (prefersReducedMotion || isFilteredOut) return;
    const t = state.clock.getElapsedTime();

    if (meshRef.current) {
      const amp = isSelected ? 0.12 : isHovered ? 0.08 : 0.035 * node.affinity;
      const s =
        metrics.coreRadius *
        (1 + Math.sin(t * metrics.pulseFrequency + node.position[0]) * amp);
      meshRef.current.scale.setScalar(s);
    }

    if (coronaRef.current) {
      const coronaScale =
        metrics.coronaRadius *
        ((isSelected ? 1.25 : isHovered ? 1.12 : 1.0) +
          Math.cos(t * (metrics.pulseFrequency * 0.7) + node.position[1]) * 0.05);
      coronaRef.current.scale.setScalar(coronaScale);
    }
  });

  // Smart LOD for DOM labels: prevents label clutter and keeps frame times at 60 FPS
  const shouldShowLabel = useMemo(() => {
    if (isFilteredOut) return false;
    if (isSelected || isHovered) return true;

    const nodeSectorId = node.type === 'genre' ? node.id : node.genreId;

    if (cameraMode === 'galaxy') {
      return (
        node.type === 'genre' ||
        (node.type === 'artist' && node.affinity >= 0.92)
      );
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

  const nodeLabel = 'name' in node ? node.name : node.title;
  const affinityPct = Math.round(node.affinity * 100);

  return (
    <group position={node.position} visible={!isFilteredOut}>
      {/* Outer Bioluminescent Corona (scaled by affinity^1.6) */}
      <mesh ref={coronaRef} geometry={UNIT_SPHERE_GEOMETRY} scale={metrics.coronaRadius}>
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={
            isSelected
              ? Math.min(0.48, metrics.coronaOpacity + 0.16)
              : isHovered
              ? Math.min(0.38, metrics.coronaOpacity + 0.1)
              : metrics.coronaOpacity
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
            opacity={isSelected ? 0.65 : 0.3 * node.affinity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Core Star Sphere (radius = logarithmic songCount + affinity curve) */}
      <mesh
        ref={meshRef}
        geometry={UNIT_SPHERE_GEOMETRY}
        scale={metrics.coreRadius}
        onClick={(e) => {
          e.stopPropagation();
          selectNode(node);
        }}
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

      {/* LOD 3D Telemetry Label (screen-space sized, layered below HUD z-20) */}
      {shouldShowLabel && (
        <Html
          position={[0, metrics.coronaRadius + 0.32, 0]}
          center
          zIndexRange={[1, 5]}
          className="pointer-events-none select-none"
        >
          <div
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-mono tabular-nums tracking-tight ${
              isSelected
                ? 'bg-[#F2F4F8] text-[#050508] font-bold shadow-[0_4px_14px_rgba(0,245,212,0.45)]'
                : isHovered
                ? 'bg-[#050508]/95 text-[#F2F4F8] border border-[#00F5D4]'
                : node.type === 'genre'
                ? 'bg-[#050508]/90 text-[#F2F4F8] border border-[#00F5D4]/40 font-semibold'
                : 'bg-[#050508]/75 text-[#B8DCE8] border border-[#00F5D4]/15'
            }`}
          >
            <span>{nodeLabel}</span>
            {node.type !== 'song' && (
              <span
                className={`ml-1.5 text-[10px] ${
                  isSelected ? 'text-[#050508]/80' : 'text-[#00F5D4]'
                }`}
              >
                {songCount}p · {affinityPct}%
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};
