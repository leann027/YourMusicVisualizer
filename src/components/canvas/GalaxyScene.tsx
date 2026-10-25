'use client';

import React, { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { StarNodeMesh } from './StarNodeMesh';
import { NebulaClusters } from './NebulaClusters';
import { ConstellationLinks } from './ConstellationLinks';
import { CameraFlightController } from './CameraFlightController';
import { PostProcessingPipeline } from './PostProcessingPipeline';

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
      {/* Atmospheric Starfield Backdrop (1 draw call) */}
      <Stars
        radius={95}
        depth={55}
        count={1600}
        factor={3.2}
        saturation={0.2}
        fade
        speed={0.45}
      />

      {/* Cosmic Gas & Nebula Clusters around Genre Sectors (Story 4) */}
      <NebulaClusters />

      {/* Relational Filaments between Nodes (1 draw call) */}
      <ConstellationLinks />

      {/* Genre Core Stars (Supergiants) */}
      {data.genres.map((genre) => (
        <StarNodeMesh key={genre.id} node={genre} genreColor={genre.color} />
      ))}

      {/* Artist Stars (Scaled logarithmically by song count & non-linearly by affinity) */}
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

      {/* Calibrated GSAP + CameraControls Trajectory Controller */}
      <CameraFlightController />

      {/* Deferred UnrealBloomPass Post-Processing modulated by Web Audio FFT */}
      <PostProcessingPipeline />
    </>
  );
};
