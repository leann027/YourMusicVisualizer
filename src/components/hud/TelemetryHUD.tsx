'use client';

import React, { useId, useMemo } from 'react';
import {
  Compass,
  Gauge,
  Orbit,
  Sparkles,
  Sun,
  ChevronRight,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { StellarSearchBar } from './StellarSearchBar';
import { ArtistSleeveCard } from './ArtistSleeveCard';
import { DataSourceModal } from './DataSourceModal';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

const AFFINITY_THRESHOLDS = [
  { label: 'Todas', value: 0 },
  { label: '≥70%', value: 0.7 },
  { label: '≥85%', value: 0.85 },
  { label: '≥92% Alfa', value: 0.92 },
];

export const TelemetryHUD: React.FC = () => {
  const sliderId = useId();
  const brightnessSliderId = useId();
  const data = useGalaxyStore((s) => s.data);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const isFlying = useGalaxyStore((s) => s.isFlying);
  const lastFlightDurationMs = useGalaxyStore((s) => s.lastFlightDurationMs);
  const cameraDistance = useGalaxyStore((s) => s.cameraDistance);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);
  const isAudioPlaying = useGalaxyStore((s) => s.isAudioPlaying);
  const bloomEnabled = useGalaxyStore((s) => s.bloomEnabled);
  const perfStats = useGalaxyStore((s) => s.perfStats);

  const selectSector = useGalaxyStore((s) => s.selectSector);
  const resetToGalaxyView = useGalaxyStore((s) => s.resetToGalaxyView);
  const flyToNeighborSector = useGalaxyStore((s) => s.flyToNeighborSector);
  const setMinAffinityFilter = useGalaxyStore((s) => s.setMinAffinityFilter);
  const setStellarBrightness = useGalaxyStore((s) => s.setStellarBrightness);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);
  const toggleBloom = useGalaxyStore((s) => s.toggleBloom);

  const syncAudioWithSector = (targetGenreId: string) => {
    if (!isAudioPlaying) return;
    const sectorSong =
      data.songs.find((s) => s.genreId === targetGenreId && s.previewUrl) ||
      data.songs.find((s) => s.genreId === targetGenreId);
    if (sectorSong) {
      webAudioEngine.playTrack(
        sectorSong.id,
        sectorSong.title,
        sectorSong.affinity,
        sectorSong.previewUrl
      );
      setAudioPlayback(sectorSong.id, true);
    } else {
      webAudioEngine.stopCurrentSource();
      setAudioPlayback(null, false);
    }
  };

  const handleSelectSector = (genreId: string) => {
    selectSector(genreId);
    syncAudioWithSector(genreId);
  };

  const handleFlyToNeighbor = () => {
    if (!data.genres.length) return;
    const currentIndex = data.genres.findIndex((g) => g.id === selectedSectorId);
    const nextIndex =
      (currentIndex + 1 + data.genres.length) % data.genres.length;
    const nextGenre = data.genres[nextIndex];
    flyToNeighborSector(1);
    if (nextGenre) {
      syncAudioWithSector(nextGenre.id);
    }
  };

  const handleToggleMasterAudio = () => {
    if (isAudioPlaying) {
      webAudioEngine.stopCurrentSource();
      setAudioPlayback(null, false);
      return;
    }

    // Pick selected song, or first song of selected artist/genre, or first song in galaxy
    let targetSong =
      selectedNode?.type === 'song'
        ? selectedNode
        : selectedNode?.type === 'artist'
        ? data.songs.find(
            (s) => s.artistId === selectedNode.id && s.previewUrl
          ) || data.songs.find((s) => s.artistId === selectedNode.id)
        : selectedNode?.type === 'genre'
        ? data.songs.find(
            (s) => s.genreId === selectedNode.id && s.previewUrl
          ) || data.songs.find((s) => s.genreId === selectedNode.id)
        : undefined;
    if (!targetSong && selectedSectorId) {
      targetSong =
        data.songs.find(
          (s) => s.genreId === selectedSectorId && s.previewUrl
        ) || data.songs.find((s) => s.genreId === selectedSectorId);
    }
    if (!targetSong) {
      targetSong = data.songs[0];
    }
    if (targetSong) {
      webAudioEngine.playTrack(
        targetSong.id,
        targetSong.title,
        targetSong.affinity,
        targetSong.previewUrl
      );
      setAudioPlayback(targetSong.id, true);
    }
  };

  const activeSongTitle = useMemo(() => {
    if (!playingTrackId) return null;
    return data.songs.find((s) => s.id === playingTrackId)?.title || null;
  }, [data.songs, playingTrackId]);

  const visibleCounts = useMemo(() => {
    const genres = data.genres.filter((g) => g.affinity >= minAffinityFilter).length;
    const artists = data.artists.filter((a) => a.affinity >= minAffinityFilter).length;
    const songs = data.songs.filter((s) => s.affinity >= minAffinityFilter).length;
    return { genres, artists, songs, total: genres + artists + songs };
  }, [data, minAffinityFilter]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6 text-[#F2F4F8] font-mono select-none">
      {/* Top Telemetry Bar + Stellar Search Combobox */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 border border-[#00F5D4]/25 bg-[#050508]/90 px-4 md:px-5 py-2.5 rounded">
        <div className="flex items-center gap-3">
          <Orbit className="h-5 w-5 text-[#00F5D4] shrink-0" strokeWidth={2} />
          <h1 className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-extrabold tracking-tight text-[#F2F4F8]">
            YOUR<span className="text-[#00F5D4]">MUSIC</span>VISUALIZER
          </h1>
        </div>

        {/* Story 7: Top Stellar Search Combobox */}
        <StellarSearchBar />

        <div className="hidden xl:flex flex-wrap items-center gap-5 text-xs text-[#B8DCE8] tabular-nums">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
            <span>NODOS:</span>
            <strong className="text-[#CCFF00]">{visibleCounts.total}</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
            <span>CÁMARA:</span>
            <strong className="text-[#00F5D4] uppercase">
              {isFlying
                ? `VUELO (${lastFlightDurationMs}ms)`
                : `${cameraMode} · ${cameraDistance}pc`}
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-[#FF2A85]" strokeWidth={2} />
            <span>MOTOR:</span>
            <strong className="text-[#F2F4F8]">
              {perfStats.fps} FPS · {perfStats.drawCalls} DC
            </strong>
          </div>
        </div>
      </header>

      {/* Middle Workspace: Left Sector Navigation & Right Archival Record-Sleeve Card */}
      <div className="my-auto flex flex-col md:flex-row items-start justify-between gap-6 pointer-events-none py-3">
        {/* Left Control Column: Constellation Sectors & Affinity Threshold */}
        <nav
          aria-label="Navegación de sectores constelares y filtro de afinidad"
          className="pointer-events-auto flex flex-col gap-3 w-full md:w-72"
        >
          <div className="flex flex-col gap-1.5 bg-[#090B12]/90 border border-[#00F5D4]/20 p-3.5 rounded">
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-tight text-[#F2F4F8] mb-1">
              Constelaciones por Estilo
            </h2>

            <div className="flex flex-col gap-1.5 max-h-[38vh] overflow-y-auto pr-1">
              {data.genres.map((genre) => {
                const isActive =
                  selectedSectorId === genre.id && cameraMode !== 'galaxy';
                const affinityPct = Math.round(genre.affinity * 100);
                return (
                  <button
                    key={genre.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleSelectSector(genre.id)}
                    className={`min-h-9 flex items-center justify-between px-3 py-2 text-left text-xs transition-transform duration-150 rounded border ${
                      isActive
                        ? 'bg-[#131826] border-[#CCFF00] text-[#F2F4F8] translate-x-1'
                        : 'bg-[#050508]/85 border-[#00F5D4]/20 text-[#B8DCE8] hover:border-[#00F5D4]/60 hover:text-[#F2F4F8]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: genre.color }}
                      />
                      <span className="truncate font-semibold">
                        {genre.name.split('&')[0].trim()}
                      </span>
                    </span>
                    <span className="text-[11px] tabular-nums text-[#CCFF00] shrink-0">
                      {genre.songCount}p · {affinityPct}%
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-pressed={cameraMode === 'galaxy'}
              onClick={resetToGalaxyView}
              className={`mt-1 min-h-9 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded border transition-colors duration-150 ${
                cameraMode === 'galaxy'
                  ? 'bg-[#00F5D4] text-[#050508] border-[#00F5D4]'
                  : 'bg-[#050508] text-[#00F5D4] border-[#00F5D4]/40 hover:bg-[#00F5D4]/15'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Vista Galáctica Completa</span>
            </button>
          </div>

          {/* Affinity Filter Control (Story 8: Presets + Continuous Slider) */}
          <div className="bg-[#090B12]/90 border border-[#00F5D4]/20 p-3.5 rounded">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor={sliderId}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#F2F4F8]"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
                <span>Umbral de Afinidad</span>
              </label>
              <span className="text-[11px] tabular-nums text-[#CCFF00] font-bold">
                {Math.round(minAffinityFilter * 100)}% mín
              </span>
            </div>

            <input
              id={sliderId}
              name="minAffinityThreshold"
              type="range"
              min={0}
              max={95}
              step={1}
              value={Math.round(minAffinityFilter * 100)}
              onChange={(e) =>
                setMinAffinityFilter(Number(e.target.value) / 100)
              }
              className="w-full h-6 mb-2 accent-[#00F5D4] cursor-pointer"
            />

            <div
              role="group"
              aria-label="Preajustes rápidos de umbral mínimo de afinidad"
              className="grid grid-cols-4 gap-1.5"
            >
              {AFFINITY_THRESHOLDS.map((item) => {
                const active =
                  Math.abs(minAffinityFilter - item.value) < 0.005;
                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMinAffinityFilter(item.value)}
                    className={`min-h-8 py-1.5 px-1 text-[11px] font-semibold rounded border tabular-nums transition-colors duration-150 ${
                      active
                        ? 'bg-[#CCFF00] text-[#050508] border-[#CCFF00]'
                        : 'bg-[#050508] text-[#B8DCE8] border-[#00F5D4]/25 hover:border-[#00F5D4]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Slider Configurable de Brillo y Resplandor Estelar */}
            <div className="mt-3 border-t border-[#00F5D4]/20 pt-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor={brightnessSliderId}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#F2F4F8]"
                >
                  <Sun className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
                  <span>Brillo Estelar</span>
                </label>
                <span className="text-[11px] tabular-nums text-[#00F5D4] font-bold">
                  {Math.round(stellarBrightness * 100)}%
                </span>
              </div>

              <input
                id={brightnessSliderId}
                name="stellarBrightnessSlider"
                type="range"
                min={10}
                max={150}
                step={5}
                value={Math.round(stellarBrightness * 100)}
                onChange={(e) =>
                  setStellarBrightness(Number(e.target.value) / 100)
                }
                className="w-full h-6 mb-2 accent-[#CCFF00] cursor-pointer"
              />

              <div
                role="group"
                aria-label="Preajustes rápidos de brillo estelar"
                className="grid grid-cols-3 gap-1.5"
              >
                {[
                  { label: 'Sutil', val: 0.3 },
                  { label: 'Medio', val: 0.65 },
                  { label: 'Intenso', val: 1.0 },
                ].map((preset) => {
                  const active =
                    Math.abs(stellarBrightness - preset.val) < 0.05;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setStellarBrightness(preset.val)}
                      className={`min-h-7 py-1 px-1 text-[10px] font-semibold rounded border transition-colors ${
                        active
                          ? 'bg-[#00F5D4] text-[#050508] border-[#00F5D4]'
                          : 'bg-[#050508] text-[#B8DCE8] border-[#00F5D4]/25 hover:border-[#00F5D4]'
                      }`}
                    >
                      {preset.label} ({Math.round(preset.val * 100)}%)
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* Story 4: Right Active Star Inspection Placard (Archival Record-Sleeve Aesthetic) */}
        <ArtistSleeveCard />
      </div>

      {/* Bottom Dock: Scale Formula Telemetry, Audio FFT Pulse & Bloom Controls */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 border border-[#00F5D4]/25 bg-[#050508]/90 px-4 md:px-5 py-2.5 rounded text-xs text-[#B8DCE8]">
        <div className="flex flex-wrap items-center gap-4 tabular-nums">
          <span className="text-[#F2F4F8] font-semibold">
            ESCALA LOGARÍTMICA:
          </span>
          <span className="hidden lg:inline">
            R = r₀ + w₁·ln(1 + canciones) + w₂·afinidad¹·⁵
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Story 8: Streaming / Local Data Importer Dialog */}
          <DataSourceModal />

          <button
            type="button"
            aria-pressed={isAudioPlaying}
            onClick={handleToggleMasterAudio}
            className={`min-h-9 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              isAudioPlaying
                ? 'border-[#CCFF00] bg-[#131826] text-[#CCFF00]'
                : 'border-[#00F5D4]/40 bg-[#050508] text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8]'
            }`}
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
                <span>
                  FFT ACTIVO{activeSongTitle ? `: ${activeSongTitle}` : ''}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
                <span>Activar Pulso FFT</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-pressed={bloomEnabled}
            onClick={toggleBloom}
            className={`min-h-9 flex items-center gap-1.5 rounded border px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
              bloomEnabled
                ? 'border-[#FF2A85] bg-[#131826] text-[#F2F4F8]'
                : 'border-[#00F5D4]/30 bg-[#050508] text-[#B8DCE8] hover:border-[#FF2A85]'
            }`}
          >
            <Zap
              className={`h-3.5 w-3.5 ${
                bloomEnabled ? 'text-[#FF2A85]' : 'text-[#B8DCE8]'
              }`}
              strokeWidth={2}
            />
            <span>Bloom {bloomEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleFlyToNeighbor}
            className="min-h-9 flex items-center gap-1.5 rounded bg-[#00F5D4] px-3.5 py-1.5 text-xs font-bold text-[#050508] hover:bg-[#CCFF00] transition-colors duration-150"
          >
            <span>Volar a Constelación Vecina</span>
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </div>
  );
};
