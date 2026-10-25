'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export const ConstellationLinks: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);

  // Map of all nodes by id for quick coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    data.genres.forEach((g) => map.set(g.id, g.position));
    data.artists.forEach((a) => map.set(a.id, a.position));
    data.songs.forEach((s) => map.set(s.id, s.position));
    return map;
  }, [data]);

  // Construct line segments geometry
  const { linePositions, lineColors } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    const defaultColor = new THREE.Color('#00F5D4');
    const highlightColor = new THREE.Color('#CCFF00');
    const bridgeColor = new THREE.Color('#FF2A85');

    data.links.forEach((link) => {
      const p1 = nodeMap.get(link.source);
      const p2 = nodeMap.get(link.target);

      if (p1 && p2) {
        positions.push(p1[0], p1[1], p1[2]);
        positions.push(p2[0], p2[1], p2[2]);

        const isConnectedToSelected =
          selectedNode && (selectedNode.id === link.source || selectedNode.id === link.target);

        const color = isConnectedToSelected
          ? highlightColor
          : link.type === 'influence'
          ? bridgeColor
          : defaultColor;

        const alpha = isConnectedToSelected ? 0.9 : link.type === 'influence' ? 0.5 : 0.25;

        colors.push(color.r * alpha, color.g * alpha, color.b * alpha);
        colors.push(color.r * alpha, color.g * alpha, color.b * alpha);
      }
    });

    return {
      linePositions: new Float32Array(positions),
      lineColors: new Float32Array(colors),
    };
  }, [data, nodeMap, selectedNode]);

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[linePositions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[lineColors, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};
