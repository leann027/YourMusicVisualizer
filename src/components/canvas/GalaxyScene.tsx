'use client';

import React, { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { StarNodeMesh } from './StarNodeMesh';
import { NebulaClusters } from './NebulaClusters';
import { DistantSongsCloud } from './DistantSongsCloud';
import { CameraFlightController } from './CameraFlightController';
import { PostProcessingPipeline } from './PostProcessingPipeline';

export const GalaxyScene: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);

  // Map genre id to genre color
  const genreColorMap = useMemo(() => {
    const map = new Map<string, string>();
    data.genres.forEach((g) => map.set(g.id, g.color));
    return map;
  }, [data.genres]);

  // Hierarchical LOD: for libraries > 60 songs, background songs render in 1 GPU draw call
  // via DistantSongsCloud, and only the active sector/artist cluster mounts interactive 3D meshes.
  const { interactiveSongs, activeSongIds } = useMemo(() => {
    if (data.songs.length <= 60) {
      return {
        interactiveSongs: data.songs,
        activeSongIds: new Set(data.songs.map((s) => s.id)),
      };
    }

    const selectedArtistId =
      selectedNode?.type === 'artist'
        ? selectedNode.id
        : selectedNode?.type === 'song'
        ? selectedNode.artistId
        : null;

    const filtered = data.songs.filter((song) => {
      if (playingTrackId && song.id === playingTrackId) return true;
      if (selectedArtistId && song.artistId === selectedArtistId) return true;
      if (selectedSectorId && song.genreId === selectedSectorId) return true;
      return false;
    });

    return {
      interactiveSongs: filtered,
      activeSongIds: new Set(filtered.map((s) => s.id)),
    };
  }, [data.songs, selectedNode, selectedSectorId, playingTrackId]);

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

      {/* Background Song Stars Cloud for massive scalability (1 GPU draw call for thousands of stars) */}
      <DistantSongsCloud
        songs={data.songs}
        genreColorMap={genreColorMap}
        activeSongIds={activeSongIds}
      />

      {/* Interactive Song Nodes (Mounted only for active cluster to guarantee 60 FPS) */}
      {interactiveSongs.map((song) => (
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
