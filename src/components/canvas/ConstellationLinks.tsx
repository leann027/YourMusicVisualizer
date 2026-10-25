'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

// Pre-allocated colors outside useFrame so 0 allocations occur per frame
const COLOR_DEFAULT = new THREE.Color('#00F5D4');
const COLOR_HIGHLIGHT = new THREE.Color('#CCFF00');
const COLOR_BRIDGE = new THREE.Color('#FF2A85');

export const ConstellationLinks: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const hoveredNode = useGalaxyStore((s) => s.hoveredNode);

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  // Map of all nodes by id for quick coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    data.genres.forEach((g) => map.set(g.id, g.position));
    data.artists.forEach((a) => map.set(a.id, a.position));
    data.songs.forEach((s) => map.set(s.id, s.position));
    return map;
  }, [data]);

  // Pre-build static linePositions and mutable lineColors buffers once per data change
  const { linePositions, lineColors, validLinks } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const links: typeof data.links = [];

    data.links.forEach((link) => {
      const p1 = nodeMap.get(link.source);
      const p2 = nodeMap.get(link.target);

      if (p1 && p2) {
        positions.push(p1[0], p1[1], p1[2]);
        positions.push(p2[0], p2[1], p2[2]);

        const baseColor =
          link.type === 'influence' ? COLOR_BRIDGE : COLOR_DEFAULT;
        colors.push(baseColor.r * 0.35, baseColor.g * 0.35, baseColor.b * 0.35);
        colors.push(baseColor.r * 0.35, baseColor.g * 0.35, baseColor.b * 0.35);
        links.push(link);
      }
    });

    return {
      linePositions: new Float32Array(positions),
      lineColors: new Float32Array(colors),
      validLinks: links,
    };
  }, [data, nodeMap]);

  // Explicit disposal on unmount to prevent GPU buffer leaks
  useEffect(() => {
    const geo = geometryRef.current;
    const mat = materialRef.current;
    return () => {
      geo?.dispose();
      mat?.dispose();
    };
  }, []);

  // Modulate filament luminosity in-place from Web Audio FFT & active/hovered node connections (Story 6)
  useFrame((state) => {
    const geo = geometryRef.current;
    if (!geo) return;
    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!colorAttr) return;

    const fft = webAudioEngine.sampleFFT();
    const t = state.clock.getElapsedTime();
    const focusId = hoveredNode?.id || selectedNode?.id || null;

    const arr = colorAttr.array as Float32Array;

    for (let i = 0; i < validLinks.length; i++) {
      const link = validLinks[i];
      const isConnectedToFocus =
        focusId !== null &&
        (link.source === focusId || link.target === focusId);
      const isCrossGenreBridge = link.type === 'influence';

      const baseColor = isConnectedToFocus
        ? COLOR_HIGHLIGHT
        : isCrossGenreBridge
        ? COLOR_BRIDGE
        : COLOR_DEFAULT;

      let intensity = isConnectedToFocus
        ? 0.92
        : isCrossGenreBridge
        ? 0.52
        : 0.24;

      if (fft.isPlaying) {
        const wave = 0.5 + 0.5 * Math.sin(t * 7.5 + i * 0.65);
        const audioBoost = isCrossGenreBridge
          ? fft.midHarmonic * 0.75 + fft.subBass * 0.45
          : isConnectedToFocus
          ? fft.subBass * 0.8 + fft.highShimmer * 0.5
          : fft.energy * 0.35 * wave;
        intensity = Math.min(1.45, intensity + audioBoost);
      }

      const idx = i * 6;
      const r = baseColor.r * intensity;
      const g = baseColor.g * intensity;
      const b = baseColor.b * intensity;

      arr[idx] = r;
      arr[idx + 1] = g;
      arr[idx + 2] = b;
      arr[idx + 3] = r;
      arr[idx + 4] = g;
      arr[idx + 5] = b;
    }

    colorAttr.needsUpdate = true;

    if (materialRef.current) {
      materialRef.current.opacity = fft.isPlaying
        ? Math.min(1.0, 0.78 + fft.energy * 0.22)
        : 0.8;
    }
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef}>
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
        ref={materialRef}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};
