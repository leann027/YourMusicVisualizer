import { create } from 'zustand';
import { MusicGalaxyData, MusicNode, SpotifyUserProfile } from '../types/music';
import {
  GALAXY_PRESET_50,
  GALAXY_PRESET_150,
  GALAXY_PRESET_300,
} from '../data/galaxyPresets';

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
  activePresetScale: 50 | 150 | 300 | 'custom';
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
  linksVisible: boolean;
  stellarBrightness: number;
  perfStats: RenderPerfStats;
  isWarpActive: boolean;
  hasWarpCompleted: boolean;

  // Actions
  finishWarp: () => void;
  skipWarp: () => void;
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
  toggleLinksVisible: () => void;
  setPresetScale: (scale: 50 | 150 | 300) => void;
  loadCustomGalaxyData: (
    data: MusicGalaxyData,
    sourceLabel: string,
    spotifyUser?: SpotifyUserProfile | null
  ) => void;
  restoreDefaultGalaxy: () => void;
  updatePerfStats: (stats: RenderPerfStats) => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  data: GALAXY_PRESET_50,
  dataSourceLabel: 'Cosmos Íntimo (50 Pistas)',
  activePresetScale: 50,
  spotifyUser: null,
  selectedNode: GALAXY_PRESET_50.artists[0] || null,
  hoveredNode: null,
  selectedSectorId: GALAXY_PRESET_50.genres[0]?.id || null,
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
  linksVisible: true,
  stellarBrightness: 0.25,
  perfStats: {
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
  },
  isWarpActive: true,
  hasWarpCompleted: false,

  finishWarp: () => set({ isWarpActive: false, hasWarpCompleted: true }),
  skipWarp: () => set({ isWarpActive: false, hasWarpCompleted: true }),

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

  toggleLinksVisible: () =>
    set((state) => ({ linksVisible: !state.linksVisible })),

  setPresetScale: (scale) => {
    const presetData =
      scale === 50
        ? GALAXY_PRESET_50
        : scale === 150
        ? GALAXY_PRESET_150
        : GALAXY_PRESET_300;
    const label =
      scale === 50
        ? 'Cosmos Íntimo (50 Pistas)'
        : scale === 150
        ? 'Galaxia Expandida (150 Pistas)'
        : 'Supercúmulo Estelar (300 Pistas)';

    set((state) => ({
      data: presetData,
      dataSourceLabel: label,
      activePresetScale: scale,
      spotifyUser: null,
      selectedNode: presetData.artists[0] || presetData.genres[0] || null,
      selectedSectorId: presetData.genres[0]?.id || null,
      cameraMode: 'galaxy',
      minAffinityFilter: 0,
      searchQuery: '',
      playingTrackId: null,
      isAudioPlaying: false,
      flightVersion: state.flightVersion + 1,
    }));
  },

  loadCustomGalaxyData: (data, dataSourceLabel, spotifyUser = null) =>
    set((state) => ({
      data,
      dataSourceLabel,
      activePresetScale: 'custom',
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

  restoreDefaultGalaxy: () => {
    get().setPresetScale(50);
  },

  updatePerfStats: (perfStats) => set({ perfStats }),
}));
