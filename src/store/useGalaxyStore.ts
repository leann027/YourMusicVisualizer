import { create } from 'zustand';
import { MusicGalaxyData, MusicNode, SpotifyUserProfile } from '../types/music';
import {
  GALAXY_PRESET_50,
  GALAXY_PRESET_150,
  GALAXY_PRESET_300,
} from '../data/galaxyPresets';
import { getNebulaLayout } from '../lib/layout/nebulaLayout';

export type CameraViewMode = 'galaxy' | 'sector' | 'artist' | 'song' | 'collision';

/** A collision between two related genre nebulae (Nebulosas v3), ids sorted a < b. */
export interface CollisionSelection {
  a: string;
  b: string;
}

export type RendererMode = 'classic' | 'nebula';

export type NebulaFieldDensity = 'full' | 'reduced';

/** The dataset components render for `mode`: classic is the imported data as-is. */
export function layoutForMode(baseData: MusicGalaxyData, mode: RendererMode): MusicGalaxyData {
  // getNebulaLayout caches per dataset, so mode/preset switches keep stable references
  return mode === 'classic' ? baseData : getNebulaLayout(baseData).data;
}

/** Same node (by id, and genre for artists split across genres) inside another dataset. */
function remapNode(node: MusicNode | null, data: MusicGalaxyData): MusicNode | null {
  if (!node) return null;
  if (node.type === 'genre') return data.genres.find((g) => g.id === node.id) ?? null;
  if (node.type === 'artist') {
    return data.artists.find((a) => a.id === node.id && a.genreId === node.genreId) ?? null;
  }
  return data.songs.find((s) => s.id === node.id) ?? null;
}

// Parses the ?renderer= query param; anything unknown is ignored.
export function parseRendererParam(value: string | null): RendererMode | null {
  return value === 'classic' || value === 'nebula' ? value : null;
}

export interface RenderPerfStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
}

interface GalaxyState {
  baseData: MusicGalaxyData; // as imported (classic layout positions)
  data: MusicGalaxyData; // what components render: baseData laid out for rendererMode
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
  rendererMode: RendererMode;
  nebulaFieldDensity: NebulaFieldDensity; // drops to 'reduced' once if FPS stay low (one-way per session)
  selectedCollision: CollisionSelection | null; // nebula mode only; cameraMode is 'collision' while set
  nebulaGenreLabelIds: string[] | null; // nebula galaxy view: genre labels allowed (5 nearest), null = no limit

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
  setRendererMode: (mode: RendererMode) => void;
  reduceNebulaFieldDensity: () => void;
  selectCollision: (pair: CollisionSelection | null) => void;
  setNebulaGenreLabelIds: (ids: string[] | null) => void;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  baseData: GALAXY_PRESET_50,
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
  linksVisible: false,
  stellarBrightness: 0.25,
  perfStats: {
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
  },
  isWarpActive: true,
  hasWarpCompleted: false,
  rendererMode: 'classic',
  nebulaFieldDensity: 'full',
  selectedCollision: null,
  nebulaGenreLabelIds: null,

  finishWarp: () => set({ isWarpActive: false, hasWarpCompleted: true }),
  skipWarp: () => set({ isWarpActive: false, hasWarpCompleted: true }),

  selectNode: (node) => {
    if (!node) {
      set((state) => ({
        selectedNode: null,
        selectedCollision: null,
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
      selectedCollision: null,
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
      selectedCollision: null,
      cameraMode: 'sector',
      isSleeveCollapsed: false,
      flightVersion: state.flightVersion + 1,
    }));
  },

  resetToGalaxyView: () =>
    set((state) => ({
      cameraMode: 'galaxy',
      selectedCollision: null,
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
      selectedCollision: null,
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

    set((state) => {
      const data = layoutForMode(presetData, state.rendererMode);
      return {
        baseData: presetData,
        data,
        selectedCollision: null,
        dataSourceLabel: label,
        activePresetScale: scale,
        spotifyUser: null,
        selectedNode: data.artists[0] || data.genres[0] || null,
        selectedSectorId: presetData.genres[0]?.id || null,
        cameraMode: 'galaxy',
        minAffinityFilter: 0,
        searchQuery: '',
        playingTrackId: null,
        isAudioPlaying: false,
        flightVersion: state.flightVersion + 1,
      };
    });
  },

  loadCustomGalaxyData: (baseData, dataSourceLabel, spotifyUser = null) =>
    set((state) => {
      const data = layoutForMode(baseData, state.rendererMode);
      return {
        baseData,
        data,
        selectedCollision: null,
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
      };
    }),

  restoreDefaultGalaxy: () => {
    get().setPresetScale(50);
  },

  updatePerfStats: (perfStats) => set({ perfStats }),

  selectCollision: (pair) => {
    const state = get();
    if (!pair) {
      if (!state.selectedCollision) return;
      set({ selectedCollision: null, cameraMode: 'galaxy', flightVersion: state.flightVersion + 1 });
      return;
    }
    const [a, b] = pair.a < pair.b ? [pair.a, pair.b] : [pair.b, pair.a];
    // only real collisions of the current nebula layout can be selected
    if (state.rendererMode !== 'nebula') return;
    const exists = getNebulaLayout(state.baseData).relations.some((r) => r.a === a && r.b === b);
    if (!exists) return;
    set({
      selectedCollision: { a, b },
      selectedSectorId: a,
      cameraMode: 'collision',
      isSleeveCollapsed: false,
      flightVersion: state.flightVersion + 1,
    });
  },

  setNebulaGenreLabelIds: (ids) => {
    const current = get().nebulaGenreLabelIds;
    if (current === ids || (current && ids && current.join() === ids.join())) return;
    set({ nebulaGenreLabelIds: ids });
  },

  reduceNebulaFieldDensity: () => {
    if (get().nebulaFieldDensity === 'reduced') return;
    set({ nebulaFieldDensity: 'reduced' });
  },

  setRendererMode: (rendererMode) => {
    if (get().rendererMode === rendererMode) return;
    set((state) => {
      const data = layoutForMode(state.baseData, rendererMode);
      // collisions only exist in nebula mode: leaving it returns to the galaxy view
      const leavingCollision = rendererMode === 'classic' && state.selectedCollision !== null;
      return {
        rendererMode,
        data,
        selectedNode: remapNode(state.selectedNode, data),
        hoveredNode: remapNode(state.hoveredNode, data),
        selectedCollision: rendererMode === 'classic' ? null : state.selectedCollision,
        cameraMode: leavingCollision ? 'galaxy' : state.cameraMode,
        // reframe the selection at its new position (not during the warp-in: it flies there itself)
        flightVersion: state.isWarpActive ? state.flightVersion : state.flightVersion + 1,
      };
    });
  },
}));
