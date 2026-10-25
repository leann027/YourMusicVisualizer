import { create } from 'zustand';
import { MusicGalaxyData, MusicNode } from '../types/music';
import { mockMusicGalaxy } from '../data/mockMusicGalaxy';

export type CameraViewMode = 'galaxy' | 'sector' | 'artist' | 'song';

export interface RenderPerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
}

interface GalaxyState {
  data: MusicGalaxyData;
  selectedNode: MusicNode | null;
  hoveredNode: MusicNode | null;
  selectedSectorId: string | null;
  cameraMode: CameraViewMode;
  flightVersion: number; // increments on every intentional camera flight request
  isFlying: boolean;
  lastFlightDurationMs: number;
  cameraDistance: number;
  minAffinityFilter: number;
  perfStats: RenderPerfStats;

  // Actions
  selectNode: (node: MusicNode | null) => void;
  hoverNode: (node: MusicNode | null) => void;
  selectSector: (genreId: string) => void;
  resetToGalaxyView: () => void;
  flyToNeighborSector: (step?: 1 | -1) => void;
  setFlightState: (isFlying: boolean, durationMs?: number) => void;
  setCameraDistance: (distance: number) => void;
  setMinAffinityFilter: (minAffinity: number) => void;
  updatePerfStats: (stats: RenderPerfStats) => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  data: mockMusicGalaxy,
  selectedNode: mockMusicGalaxy.artists[0], // Daft Punk initial focus
  hoveredNode: null,
  selectedSectorId: 'genre-electro',
  cameraMode: 'galaxy',
  flightVersion: 0,
  isFlying: false,
  lastFlightDurationMs: 750,
  cameraDistance: 33.1,
  minAffinityFilter: 0,
  perfStats: {
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
  },

  selectNode: (node) => {
    if (!node) {
      set((state) => ({
        selectedNode: null,
        cameraMode: 'galaxy',
        flightVersion: state.flightVersion + 1,
      }));
      return;
    }

    const sectorId =
      node.type === 'genre' ? node.id : node.genreId;
    const mode: CameraViewMode =
      node.type === 'genre'
        ? 'sector'
        : node.type === 'artist'
        ? 'artist'
        : 'song';

    set((state) => ({
      selectedNode: node,
      selectedSectorId: sectorId,
      cameraMode: mode,
      flightVersion: state.flightVersion + 1,
    }));
  },

  hoverNode: (node) => set({ hoveredNode: node }),

  selectSector: (genreId) => {
    const genre = get().data.genres.find((g) => g.id === genreId) || null;
    set((state) => ({
      selectedSectorId: genreId,
      selectedNode: genre,
      cameraMode: 'sector',
      flightVersion: state.flightVersion + 1,
    }));
  },

  resetToGalaxyView: () =>
    set((state) => ({
      cameraMode: 'galaxy',
      flightVersion: state.flightVersion + 1,
    })),

  flyToNeighborSector: (step = 1) => {
    const { data, selectedSectorId } = get();
    const genres = data.genres;
    if (!genres.length) return;
    const currentIndex = genres.findIndex((g) => g.id === selectedSectorId);
    const nextIndex =
      (currentIndex + step + genres.length) % genres.length;
    const nextGenre = genres[nextIndex];
    set((state) => ({
      selectedSectorId: nextGenre.id,
      selectedNode: nextGenre,
      cameraMode: 'sector',
      flightVersion: state.flightVersion + 1,
    }));
  },

  setFlightState: (isFlying, durationMs) =>
    set((state) => ({
      isFlying,
      lastFlightDurationMs:
        durationMs !== undefined ? durationMs : state.lastFlightDurationMs,
    })),

  setCameraDistance: (cameraDistance) => set({ cameraDistance }),

  setMinAffinityFilter: (minAffinityFilter) => set({ minAffinityFilter }),

  updatePerfStats: (perfStats) => set({ perfStats }),
}));
