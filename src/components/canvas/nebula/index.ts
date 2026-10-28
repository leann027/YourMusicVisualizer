'use client';

import React from 'react';
import { MusicGalaxyData, GenreNode } from '../../../types/music';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { SectorNebulaCluster } from './SectorNebulaCluster';

export interface NebulaClustersProps {
  data?: MusicGalaxyData;
  stellarBrightness?: number;
}

/**
 * Milky Way-style cosmic dust and interstellar nebular gas clusters (`NebulaClusters`).
 *
 * Renders radiant, organic gas clouds around genre sector centers (`data.genres`).
 * Density and particle count scale directly with genre song count.
 * Modulates opacity gently with `stellarBrightness` and breathes synchronously
 * with real-time Web Audio sub-bass frequencies. Zero geometric sphere silhouettes.
 */
export const NebulaClusters: React.FC<NebulaClustersProps> = ({ data: propData }) => {
  const storeGenres = useGalaxyStore((s) => s.data.genres);
  const genres: GenreNode[] = propData?.genres ?? storeGenres;

  if (!genres || genres.length === 0) return null;

  return React.createElement(
    'group',
    { name: 'galactic-nebula-clusters' },
    genres.map((genre: GenreNode) =>
      React.createElement(SectorNebulaCluster, { key: genre.id, genre })
    )
  );
};

export { SectorNebulaCluster } from './SectorNebulaCluster';
export type { SectorNebulaClusterProps } from './SectorNebulaCluster';
export * from './nebulaGeometry';
export * from './shaders/nebulaShaders';
