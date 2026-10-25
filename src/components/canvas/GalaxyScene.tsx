'use client';

import React, { useMemo } from 'react';
import { OrbitControls, Stars } from '@react-three/drei';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { StarNodeMesh } from './StarNodeMesh';
import { ConstellationLinks } from './ConstellationLinks';

export const GalaxyScene: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);

  // Map genre id to genre color
  const genreColorMap = useMemo(() => {
    const map = new Map<string, string>();
    data.genres.forEach((g) => map.set(g.id, g.color));
    return map;
  }, [data.genres]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 20, 10]} intensity={1.5} color="#F2F4F8" />
      <pointLight position={[-15, -10, -10]} intensity={0.8} color="#00F5D4" />
      <pointLight position={[15, 10, -15]} intensity={0.8} color="#FF2A85" />

      {/* Atmospheric Starfield Backdrop */}
      <Stars
        radius={90}
        depth={60}
        count={3500}
        factor={3.5}
        saturation={0.2}
        fade
        speed={0.8}
      />

      {/* Relational Filaments between Nodes */}
      <ConstellationLinks />

      {/* Genre Core Stars (Supergiants) */}
      {data.genres.map((genre) => (
        <StarNodeMesh key={genre.id} node={genre} genreColor={genre.color} />
      ))}

      {/* Artist Stars (Scaled by song count & affinity) */}
      {data.artists.map((artist) => (
        <StarNodeMesh
          key={artist.id}
          node={artist}
          genreColor={genreColorMap.get(artist.genreId) || '#00F5D4'}
        />
      ))}

      {/* Song Nodes (Micro satellites) */}
      {data.songs.map((song) => (
        <StarNodeMesh
          key={song.id}
          node={song}
          genreColor={genreColorMap.get(song.genreId) || '#00F5D4'}
        />
      ))}

      {/* Smooth Orbit & Exploration Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.7}
        zoomSpeed={1.0}
        minDistance={6}
        maxDistance={90}
        makeDefault
      />
    </>
  );
};
