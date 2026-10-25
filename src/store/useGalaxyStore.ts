import { create } from 'zustand';
import { MusicGalaxyData, MusicNode, SpotifyUserProfile } from '../types/music';
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
  dataSourceLabel: string;
  spotifyUser: SpotifyUserProfile | null;
  selectedNode: MusicNode | null;
  hoveredNode: MusicNode | null;
  selectedSectorId: string | null;
  cameraMode: CameraViewMode;
  flightVersion: number; // increments on every intentional camera flight request
  isFlying: boolean;
  lastFlightDurationMs: number;
  cameraDistance: number;
  minAffinityFilter: number;
  searchQuery: string;
  isSleeveCollapsed: boolean;
  playingTrackId: string | null;
  isAudioPlaying: boolean;
  bloomEnabled: boolean;
  stellarBrightness: number;
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
  setStellarBrightness: (brightness: number) => void;
  setSearchQuery: (query: string) => void;
  toggleSleeveCollapsed: () => void;
  setAudioPlayback: (trackId: string | null, isPlaying: boolean) => void;
  toggleBloom: () => void;
  loadCustomGalaxyData: (
    data: MusicGalaxyData,
    sourceLabel: string,
    spotifyUser?: SpotifyUserProfile | null
  ) => void;
  restoreDefaultGalaxy: () => void;
  updatePerfStats: (stats: RenderPerfStats) => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  data: mockMusicGalaxy,
  dataSourceLabel: 'Universo Base (42 Nodos)',
  spotifyUser: null,
  selectedNode: mockMusicGalaxy.artists[0], // Daft Punk initial focus
  hoveredNode: null,
  selectedSectorId: 'genre-electro',
  cameraMode: 'galaxy',
  flightVersion: 0,
  isFlying: false,
  lastFlightDurationMs: 750,
  cameraDistance: 33.1,
  minAffinityFilter: 0,
  searchQuery: '',
  isSleeveCollapsed: false,
  playingTrackId: null,
  isAudioPlaying: false,
  bloomEnabled: true,
  stellarBrightness: 0.65,
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
      isSleeveCollapsed: false,
      minAffinityFilter:
        node.affinity < state.minAffinityFilter ? 0 : state.minAffinityFilter,
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
      isSleeveCollapsed: false,
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

  setStellarBrightness: (stellarBrightness) =>
    set({
      stellarBrightness: Math.max(0.1, Math.min(1.5, stellarBrightness)),
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  toggleSleeveCollapsed: () =>
    set((state) => ({ isSleeveCollapsed: !state.isSleeveCollapsed })),

  setAudioPlayback: (playingTrackId, isAudioPlaying) =>
    set({ playingTrackId, isAudioPlaying }),

  toggleBloom: () =>
    set((state) => ({ bloomEnabled: !state.bloomEnabled })),

  loadCustomGalaxyData: (data, dataSourceLabel, spotifyUser = null) =>
    set((state) => ({
      data,
      dataSourceLabel,
      spotifyUser,
      selectedNode: data.artists[0] || data.genres[0] || null,
      selectedSectorId: data.genres[0]?.id || null,
      cameraMode: 'galaxy',
      minAffinityFilter: 0,
      searchQuery: '',
      playingTrackId: null,
      isAudioPlaying: false,
      flightVersion: state.flightVersion + 1,
    })),

  restoreDefaultGalaxy: () =>
    set((state) => ({
      data: mockMusicGalaxy,
      dataSourceLabel: 'Universo Base (42 Nodos)',
      spotifyUser: null,
      selectedNode: mockMusicGalaxy.artists[0],
      selectedSectorId: 'genre-electro',
      cameraMode: 'galaxy',
      minAffinityFilter: 0,
      searchQuery: '',
      playingTrackId: null,
      isAudioPlaying: false,
      flightVersion: state.flightVersion + 1,
    })),

  updatePerfStats: (perfStats) => set({ perfStats }),
}));
