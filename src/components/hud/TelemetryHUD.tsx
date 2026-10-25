'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  Compass,
  Network,
  Orbit,
  Sparkles,
  Sun,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  const [isConstellationsOpen, setIsConstellationsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const data = useGalaxyStore((s) => s.data);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);
  const isAudioPlaying = useGalaxyStore((s) => s.isAudioPlaying);
  const bloomEnabled = useGalaxyStore((s) => s.bloomEnabled);
  const linksVisible = useGalaxyStore((s) => s.linksVisible);

  const selectSector = useGalaxyStore((s) => s.selectSector);
  const resetToGalaxyView = useGalaxyStore((s) => s.resetToGalaxyView);
  const flyToNeighborSector = useGalaxyStore((s) => s.flyToNeighborSector);
  const setMinAffinityFilter = useGalaxyStore((s) => s.setMinAffinityFilter);
  const setStellarBrightness = useGalaxyStore((s) => s.setStellarBrightness);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);
  const toggleBloom = useGalaxyStore((s) => s.toggleBloom);
  const toggleLinksVisible = useGalaxyStore((s) => s.toggleLinksVisible);

  const activeSectorGenre = useMemo(() => {
    return data.genres.find((g) => g.id === selectedSectorId) || null;
  }, [data.genres, selectedSectorId]);

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
      {/* Top Floating Glass Header + Stellar Search Combobox */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 border border-[#00F5D4]/25 bg-[#080A14]/80 backdrop-blur-xl px-4 md:px-5 py-2 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <Orbit className="h-5 w-5 text-[#00F5D4] shrink-0 drop-shadow-[0_0_8px_rgba(0,245,212,0.6)]" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <h1 className="font-[family-name:var(--font-syne)] text-base md:text-lg font-black tracking-[0.16em] text-[#F2F4F8] leading-none">
              YOUR <span className="text-[#00F5D4]">MUSIC</span> VISUALIZER
            </h1>
            <span className="text-[9px] tracking-[0.24em] uppercase text-[#00F5D4] font-mono mt-0.5 font-semibold">
              COSMOS MUSICAL 3D
            </span>
          </div>
        </div>

        {/* Story 7: Top Stellar Search Combobox */}
        <StellarSearchBar />

        <div className="hidden xl:flex items-center gap-2 text-xs text-[#B8DCE8] tabular-nums">
          <div className="flex items-center gap-1.5 rounded-xl border border-[#CCFF00]/25 bg-[#050508]/75 px-3 py-1 shadow-[0_0_10px_rgba(204,255,0,0.1)]">
            <Sparkles className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-[#B8DCE8]">ESTRELLAS:</span>
            <strong className="text-[#CCFF00] font-bold">{visibleCounts.total}</strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-[#00F5D4]/25 bg-[#050508]/75 px-3 py-1 shadow-[0_0_10px_rgba(0,245,212,0.1)]">
            <Orbit className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
            <span className="text-[11px] font-semibold text-[#B8DCE8]">SECTOR:</span>
            <strong className="text-[#00F5D4] uppercase font-bold">
              {cameraMode === 'galaxy'
                ? 'VISTA GALÁCTICA'
                : activeSectorGenre
                ? activeSectorGenre.name.split('&')[0].trim()
                : 'SECTOR'}
            </strong>
          </div>
        </div>
      </header>

      {/* Middle Workspace: Left Floating Glass Capsules & Right Archival Record-Sleeve Card */}
      <div className="my-auto flex flex-col md:flex-row items-start justify-between gap-4 pointer-events-none py-3">
        {/* Left Floating Capsule Controls: Constellations Drawer & Cosmic Filters */}
        <nav
          aria-label="Controles estelares flotantes"
          className="pointer-events-auto flex flex-col gap-2.5 z-30"
        >
          {/* Constellations Capsule & Drawer */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsConstellationsOpen(!isConstellationsOpen);
                if (!isConstellationsOpen) setIsFiltersOpen(false);
              }}
              aria-expanded={isConstellationsOpen}
              className={`min-h-9 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl transition-all duration-200 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
                isConstellationsOpen || cameraMode !== 'galaxy'
                  ? 'bg-[#080A14]/90 border-[#CCFF00] text-[#F2F4F8] shadow-[0_0_14px_rgba(204,255,0,0.25)]'
                  : 'bg-[#080A14]/75 border-[#00F5D4]/30 text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8]'
              }`}
            >
              <Orbit
                className={`h-4 w-4 ${
                  isConstellationsOpen || cameraMode !== 'galaxy'
                    ? 'text-[#CCFF00]'
                    : 'text-[#00F5D4]'
                }`}
                strokeWidth={2}
              />
              <span className="text-xs font-bold tracking-tight">
                {cameraMode !== 'galaxy' && activeSectorGenre
                  ? activeSectorGenre.name.split('&')[0].trim()
                  : 'Constelaciones'}
              </span>
              <span className="rounded bg-[#050508] border border-[#00F5D4]/30 px-1.5 py-0.5 text-[10px] text-[#00F5D4] font-mono">
                {data.genres.length}
              </span>
              {isConstellationsOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#B8DCE8]" strokeWidth={2} />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#B8DCE8]" strokeWidth={2} />
              )}
            </button>

            {/* Floating Glass Constellations Panel */}
            {isConstellationsOpen && (
              <div className="absolute top-11 left-0 w-72 z-40 flex flex-col gap-2 rounded-2xl border border-[#00F5D4]/35 bg-[#080A14]/90 backdrop-blur-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.75)] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#00F5D4]/20">
                  <span className="text-xs font-bold text-[#F2F4F8] font-[family-name:var(--font-syne)]">
                    Sectores Constelares
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsConstellationsOpen(false)}
                    className="text-[11px] text-[#B8DCE8] hover:text-[#F2F4F8] transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
                <div className="flex flex-col gap-1 max-h-[42vh] overflow-y-auto pr-1">
                  {data.genres.map((genre) => {
                    const isActive =
                      selectedSectorId === genre.id && cameraMode !== 'galaxy';
                    const affinityPct = Math.round(genre.affinity * 100);
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          handleSelectSector(genre.id);
                          setIsConstellationsOpen(false);
                        }}
                        className={`min-h-8 flex items-center justify-between px-2.5 py-1.5 text-left text-xs transition-all duration-150 rounded-lg border ${
                          isActive
                            ? 'bg-[#131826] border-[#CCFF00] text-[#F2F4F8] shadow-[0_0_10px_rgba(204,255,0,0.3)]'
                            : 'bg-[#050508]/80 border-[#00F5D4]/20 text-[#B8DCE8] hover:border-[#00F5D4]/60 hover:text-[#F2F4F8]'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate pr-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: genre.color }}
                          />
                          <span className="truncate font-semibold">
                            {genre.name.split('&')[0].trim()}
                          </span>
                        </span>
                        <span className="text-[10px] tabular-nums text-[#CCFF00] shrink-0">
                          {genre.songCount}p · {affinityPct}%
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  aria-pressed={cameraMode === 'galaxy'}
                  onClick={() => {
                    resetToGalaxyView();
                    setIsConstellationsOpen(false);
                  }}
                  className={`min-h-8 flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all duration-150 ${
                    cameraMode === 'galaxy'
                      ? 'bg-[#00F5D4] text-[#050508] border-[#00F5D4] font-bold shadow-[0_0_12px_rgba(0,245,212,0.35)]'
                      : 'bg-[#050508] text-[#00F5D4] border-[#00F5D4]/40 hover:bg-[#00F5D4]/15'
                  }`}
                >
                  <Orbit className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Vista Galáctica Completa</span>
                </button>
              </div>
            )}
          </div>

          {/* Filters & Brightness Capsule & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsFiltersOpen(!isFiltersOpen);
                if (!isFiltersOpen) setIsConstellationsOpen(false);
              }}
              aria-expanded={isFiltersOpen}
              className={`min-h-9 flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl transition-all duration-200 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ${
                isFiltersOpen
                  ? 'bg-[#080A14]/90 border-[#CCFF00] text-[#F2F4F8] shadow-[0_0_14px_rgba(204,255,0,0.25)]'
                  : 'bg-[#080A14]/75 border-[#00F5D4]/30 text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
              <span className="text-xs font-semibold">Filtros & Brillo</span>
              {isFiltersOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#B8DCE8]" strokeWidth={2} />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#B8DCE8]" strokeWidth={2} />
              )}
            </button>

            {/* Floating Glass Filters Panel */}
            {isFiltersOpen && (
              <div className="absolute top-11 left-0 w-72 z-40 flex flex-col gap-3 rounded-2xl border border-[#00F5D4]/35 bg-[#080A14]/90 backdrop-blur-2xl p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-1 border-b border-[#00F5D4]/20">
                  <span className="text-xs font-bold text-[#F2F4F8] font-[family-name:var(--font-syne)]">
                    Ajustes Cósmicos
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen(false)}
                    className="text-[11px] text-[#B8DCE8] hover:text-[#F2F4F8] transition-colors"
                  >
                    Cerrar
                  </button>
                </div>

                {/* Affinity Slider */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={sliderId} className="text-[11px] font-semibold text-[#F2F4F8]">
                      Umbral Afinidad
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
                    onChange={(e) => setMinAffinityFilter(Number(e.target.value) / 100)}
                    className="w-full h-5 mb-1.5 accent-[#00F5D4] cursor-pointer"
                  />
                  <div className="grid grid-cols-4 gap-1">
                    {AFFINITY_THRESHOLDS.map((item) => {
                      const active = Math.abs(minAffinityFilter - item.value) < 0.005;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setMinAffinityFilter(item.value)}
                          className={`min-h-7 py-1 px-0.5 text-[10px] font-semibold rounded-lg border tabular-nums transition-all ${
                            active
                              ? 'bg-[#CCFF00] text-[#050508] border-[#CCFF00] font-bold'
                              : 'bg-[#050508] text-[#B8DCE8] border-[#00F5D4]/25 hover:border-[#00F5D4]'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Stellar Brightness Slider */}
                <div className="border-t border-[#00F5D4]/20 pt-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={brightnessSliderId} className="flex items-center gap-1 text-[11px] font-semibold text-[#F2F4F8]">
                      <Sun className="h-3 w-3 text-[#CCFF00]" strokeWidth={2} />
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
                    onChange={(e) => setStellarBrightness(Number(e.target.value) / 100)}
                    className="w-full h-5 mb-1.5 accent-[#CCFF00] cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: 'Sutil', val: 0.3 },
                      { label: 'Medio', val: 0.65 },
                      { label: 'Intenso', val: 1.0 },
                    ].map((preset) => {
                      const active = Math.abs(stellarBrightness - preset.val) < 0.05;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setStellarBrightness(preset.val)}
                          className={`min-h-7 py-1 px-1 text-[10px] font-semibold rounded-lg border transition-all ${
                            active
                              ? 'bg-[#00F5D4] text-[#050508] border-[#00F5D4] font-bold'
                              : 'bg-[#050508] text-[#B8DCE8] border-[#00F5D4]/25 hover:border-[#00F5D4]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Story 4: Right Active Star Inspection Placard (Archival Record-Sleeve Aesthetic) */}
        <ArtistSleeveCard />
      </div>

      {/* Bottom Floating Glass Dock */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-2.5 border border-[#00F5D4]/25 bg-[#080A14]/80 backdrop-blur-xl px-4 md:px-5 py-2 rounded-2xl text-xs text-[#B8DCE8] shadow-[0_12px_40px_rgba(0,0,0,0.65)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetToGalaxyView}
            className={`min-h-8 flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold transition-all duration-150 active:scale-95 ${
              cameraMode === 'galaxy'
                ? 'bg-[#00F5D4] text-[#050508] border-[#00F5D4] font-bold shadow-[0_0_12px_rgba(0,245,212,0.35)]'
                : 'bg-[#050508]/80 text-[#00F5D4] border-[#00F5D4]/40 hover:bg-[#00F5D4]/15'
            }`}
          >
            <Orbit className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Galaxia</span>
          </button>

          {activeSongTitle && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#CCFF00] border-l border-[#00F5D4]/20 pl-3">
              <Volume2 className="h-3 w-3 text-[#CCFF00]" strokeWidth={2} />
              <span className="truncate max-w-[180px] font-semibold">{activeSongTitle}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Story 8: Streaming / Local Data Importer Dialog */}
          <DataSourceModal />

          {/* Master Audio FFT Toggle */}
          <button
            type="button"
            aria-pressed={isAudioPlaying}
            onClick={handleToggleMasterAudio}
            className={`min-h-8 flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              isAudioPlaying
                ? 'border-[#CCFF00] bg-[#131826] text-[#CCFF00] shadow-[0_0_14px_rgba(204,255,0,0.3)]'
                : 'border-[#00F5D4]/30 bg-[#050508]/80 text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8]'
            }`}
          >
            {isAudioPlaying ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
                <span>FFT ACTIVO</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
                <span>Pulso FFT</span>
              </>
            )}
          </button>

          {/* Story 5: Constellation Links Toggle */}
          <button
            type="button"
            aria-pressed={linksVisible}
            onClick={toggleLinksVisible}
            aria-label={linksVisible ? 'Ocultar líneas de constelación' : 'Mostrar líneas de constelación'}
            className={`min-h-8 flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              linksVisible
                ? 'border-[#00F5D4] bg-[#131826] text-[#00F5D4] shadow-[0_0_12px_rgba(0,245,212,0.25)]'
                : 'border-[#00F5D4]/30 bg-[#050508]/80 text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8]'
            }`}
          >
            <Network className={`h-3.5 w-3.5 ${linksVisible ? 'text-[#00F5D4]' : 'text-[#B8DCE8]'}`} strokeWidth={2} />
            <span>Líneas {linksVisible ? 'ON' : 'OFF'}</span>
          </button>

          {/* Bloom Post-Processing Toggle */}
          <button
            type="button"
            aria-pressed={bloomEnabled}
            onClick={toggleBloom}
            aria-label={bloomEnabled ? 'Desactivar efecto Bloom' : 'Activar efecto Bloom'}
            className={`min-h-8 flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-all duration-150 active:scale-95 ${
              bloomEnabled
                ? 'border-[#FF2A85] bg-[#131826] text-[#F2F4F8] shadow-[0_0_12px_rgba(255,42,133,0.3)]'
                : 'border-[#00F5D4]/30 bg-[#050508]/80 text-[#B8DCE8] hover:border-[#FF2A85] hover:text-[#F2F4F8]'
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${bloomEnabled ? 'text-[#FF2A85]' : 'text-[#B8DCE8]'}`} strokeWidth={2} />
            <span>Bloom {bloomEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Flight to Neighbor Sector */}
          <button
            type="button"
            onClick={handleFlyToNeighbor}
            className="min-h-8 flex items-center gap-1 rounded-xl bg-[#00F5D4] px-3 py-1 text-xs font-bold text-[#050508] shadow-[0_0_12px_rgba(0,245,212,0.3)] hover:bg-[#CCFF00] transition-all duration-150 active:scale-95"
          >
            <span>Próxima</span>
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      </footer>
    </div>
  );
};
