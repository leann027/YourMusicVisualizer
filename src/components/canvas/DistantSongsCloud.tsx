'use client';

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { SongNode } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';

interface DistantSongsCloudProps {
  songs: SongNode[];
  genreColorMap: Map<string, string>;
  activeSongIds: Set<string>;
}

/**
 * Distant Songs Particle Cloud (`DistantSongsCloud`).
 *
 * Renders thousands of non-focused background songs in a single GPU draw call using `THREE.Points`.
 * Eliminates DOM portal overhead and ensures steady 60 FPS even when the music library contains
 * 2,000 to 3,000+ tracks.
 */
export const DistantSongsCloud: React.FC<DistantSongsCloudProps> = ({
  songs,
  genreColorMap,
  activeSongIds,
}) => {
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);

  const { geometry, count } = useMemo(() => {
    const backgroundSongs = songs.filter(
      (s) => !activeSongIds.has(s.id) && s.affinity >= minAffinityFilter
    );

    const positions = new Float32Array(backgroundSongs.length * 3);
    const colors = new Float32Array(backgroundSongs.length * 3);

    backgroundSongs.forEach((song, i) => {
      positions[i * 3] = song.position[0];
      positions[i * 3 + 1] = song.position[1];
      positions[i * 3 + 2] = song.position[2];

      const hexColor = genreColorMap.get(song.genreId) || '#00F5D4';
      const c = new THREE.Color(hexColor);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    });

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return { geometry: geom, count: backgroundSongs.length };
  }, [songs, genreColorMap, activeSongIds, minAffinityFilter]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  if (count === 0) return null;

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={3.2}
        vertexColors
        transparent
        opacity={Math.min(0.85, Math.max(0.18, stellarBrightness * 2.4))}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};
