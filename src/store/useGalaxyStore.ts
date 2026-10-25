import { create } from 'zustand';
import { MusicGalaxyData, MusicNode } from '../types/music';
import { mockMusicGalaxy } from '../data/mockMusicGalaxy';

interface GalaxyState {
  data: MusicGalaxyData;
  selectedNode: MusicNode | null;
  hoveredNode: MusicNode | null;
  selectedSectorId: string | null;
  
  // Actions
  selectNode: (node: MusicNode | null) => void;
  hoverNode: (node: MusicNode | null) => void;
  selectSector: (genreId: string | null) => void;
}

export const useGalaxyStore = create<GalaxyState>((set) => ({
  data: mockMusicGalaxy,
  selectedNode: mockMusicGalaxy.artists[0], // Daft Punk as initial focus
  hoveredNode: null,
  selectedSectorId: 'genre-electro',

  selectNode: (node) => set({ selectedNode: node }),
  hoverNode: (node) => set({ hoveredNode: node }),
  selectSector: (genreId) => set({ selectedSectorId: genreId }),
}));
