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
  const linksVisible = useGalaxyStore((s) => s.linksVisible);
  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const hoveredNode = useGalaxyStore((s) => s.hoveredNode);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);

  // Map of all nodes by id for quick coordinate & metadata lookup
  const nodeMetaMap = useMemo(() => {
    const map = new Map<
      string,
      {
        pos: [number, number, number];
        affinity: number;
        sectorId: string;
        artistId?: string;
        type: 'genre' | 'artist' | 'song';
      }
    >();
    data.genres.forEach((g) =>
      map.set(g.id, {
        pos: g.position,
        affinity: g.affinity,
        sectorId: g.id,
        type: 'genre',
      })
    );
    data.artists.forEach((a) =>
      map.set(a.id, {
        pos: a.position,
        affinity: a.affinity,
        sectorId: a.genreId,
        type: 'artist',
      })
    );
    data.songs.forEach((s) =>
      map.set(s.id, {
        pos: s.position,
        affinity: s.affinity,
        sectorId: s.genreId,
        artistId: s.artistId,
        type: 'song',
      })
    );
    return map;
  }, [data]);

  // Pre-build static linePositions and mutable lineColors buffers filtered by affinity & camera mode
  const { linePositions, lineColors, validLinks } = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const links: typeof data.links = [];

    data.links.forEach((link) => {
      const n1 = nodeMetaMap.get(link.source);
      const n2 = nodeMetaMap.get(link.target);

      if (!n1 || !n2) return;

      // 1. Hide link if either connected star is hidden by the affinity threshold slider
      if (n1.affinity < minAffinityFilter || n2.affinity < minAffinityFilter) {
        return;
      }

      // 2. In 'galaxy' view, declutter the cosmos by hiding dense artist-song satellite links
      // unless that specific artist or song is selected or hovered
      if (link.type === 'artist-song') {
        const isFocused =
          (selectedNode &&
            (link.source === selectedNode.id ||
              link.target === selectedNode.id ||
              (selectedNode.type === 'song' &&
                selectedNode.artistId === link.source))) ||
          (hoveredNode &&
            (link.source === hoveredNode.id ||
              link.target === hoveredNode.id));

        const isInsideActiveSector =
          cameraMode !== 'galaxy' &&
          selectedSectorId &&
          (n1.sectorId === selectedSectorId || n2.sectorId === selectedSectorId);

        if (!isFocused && !isInsideActiveSector) {
          return;
        }
      }

      positions.push(n1.pos[0], n1.pos[1], n1.pos[2]);
      positions.push(n2.pos[0], n2.pos[1], n2.pos[2]);

      const baseColor =
        link.type === 'influence' ? COLOR_BRIDGE : COLOR_DEFAULT;
      colors.push(baseColor.r * 0.28, baseColor.g * 0.28, baseColor.b * 0.28);
      colors.push(baseColor.r * 0.28, baseColor.g * 0.28, baseColor.b * 0.28);
      links.push(link);
    });

    return {
      linePositions: new Float32Array(positions),
      lineColors: new Float32Array(colors),
      validLinks: links,
    };
  }, [
    data,
    nodeMetaMap,
    minAffinityFilter,
    cameraMode,
    selectedSectorId,
    selectedNode,
    hoveredNode,
  ]);

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
    if (!linksVisible) return;
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

      let intensity =
        (isConnectedToFocus
          ? 0.85
          : isCrossGenreBridge
          ? 0.42
          : 0.18) * (0.4 + 0.6 * stellarBrightness);

      if (fft.isPlaying) {
        const wave = 0.5 + 0.5 * Math.sin(t * 7.5 + i * 0.65);
        const audioBoost = isCrossGenreBridge
          ? fft.midHarmonic * 0.65 + fft.subBass * 0.35
          : isConnectedToFocus
          ? fft.subBass * 0.7 + fft.highShimmer * 0.4
          : fft.energy * 0.25 * wave;
        intensity = Math.min(1.2, intensity + audioBoost);
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
      materialRef.current.opacity = Math.max(
        0.15,
        Math.min(
          0.9,
          (fft.isPlaying ? 0.65 + fft.energy * 0.25 : 0.6) * stellarBrightness
        )
      );
    }
  });

  if (!linksVisible) {
    return null;
  }

  return (
    <lineSegments visible={linksVisible}>
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
