'use client';

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { MusicNode, calculateStarRadius } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';

interface StarNodeMeshProps {
  node: MusicNode;
  genreColor: string;
}

export const StarNodeMesh: React.FC<StarNodeMeshProps> = ({ node, genreColor }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const hoveredNode = useGalaxyStore((s) => s.hoveredNode);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const hoverNode = useGalaxyStore((s) => s.hoverNode);

  const isSelected = selectedNode?.id === node.id;
  const isHovered = hoveredNode?.id === node.id;

  const songCount = 'songCount' in node ? node.songCount : 1;
  const affinity = 'affinity' in node ? node.affinity : 0.8;

  const radius = useMemo(() => {
    return calculateStarRadius(songCount, node.type, affinity);
  }, [songCount, node.type, affinity]);

  // Determine star color
  const starColor = useMemo(() => {
    if (node.type === 'genre') return node.color;
    return genreColor || '#00F5D4';
  }, [node, genreColor]);

  // Subtle pulsing animation on frame
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      const pulseSpeed = node.type === 'genre' ? 1.5 : 2.5;
      const pulseMagnitude = isSelected ? 0.12 : isHovered ? 0.08 : 0.04;
      const scale = 1 + Math.sin(time * pulseSpeed + node.position[0]) * pulseMagnitude;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  const nodeLabel = 'name' in node ? node.name : node.title;

  return (
    <group position={node.position}>
      {/* Outer Corona / Halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * (isSelected ? 1.8 : 1.35), 16, 16]} />
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={isSelected ? 0.35 : isHovered ? 0.25 : 0.12}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Core Star Sphere */}
      <mesh
        ref={meshRef}
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
        <sphereGeometry args={[radius, 32, 32]} />
        <meshStandardMaterial
          color={starColor}
          emissive={starColor}
          emissiveIntensity={isSelected ? 2.0 : isHovered ? 1.5 : 0.8}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      {/* Dynamic 3D Label */}
      <Html
        position={[0, radius + 0.35, 0]}
        center
        distanceFactor={18}
        className="pointer-events-none select-none transition-all duration-200"
      >
        <div
          className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap font-mono tracking-tight transition-all duration-200 ${
            isSelected
              ? 'bg-[#F2F4F8] text-[#050508] font-bold shadow-[0_0_15px_rgba(0,245,212,0.6)] scale-110'
              : isHovered
              ? 'bg-[#050508]/90 text-[#F2F4F8] border border-[#00F5D4] scale-105'
              : node.type === 'genre'
              ? 'bg-[#050508]/80 text-[#F2F4F8] border border-white/20 font-semibold'
              : 'text-[#9BA3B8] opacity-80'
          }`}
        >
          {nodeLabel}
          {node.type !== 'song' && (
            <span className="ml-1 opacity-70 text-[9px]">({songCount}★)</span>
          )}
        </div>
      </Html>
    </group>
  );
};
