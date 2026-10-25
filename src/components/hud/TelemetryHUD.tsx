'use client';

import React, { useMemo } from 'react';
import {
  Compass,
  Disc3,
  Gauge,
  Orbit,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { calculateStarVisualMetrics } from '../../types/music';

const AFFINITY_THRESHOLDS = [
  { label: 'Todas', value: 0 },
  { label: '≥70%', value: 0.7 },
  { label: '≥85%', value: 0.85 },
  { label: '≥92% Alfa', value: 0.92 },
];

export const TelemetryHUD: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const isFlying = useGalaxyStore((s) => s.isFlying);
  const lastFlightDurationMs = useGalaxyStore((s) => s.lastFlightDurationMs);
  const cameraDistance = useGalaxyStore((s) => s.cameraDistance);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const perfStats = useGalaxyStore((s) => s.perfStats);

  const selectSector = useGalaxyStore((s) => s.selectSector);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const resetToGalaxyView = useGalaxyStore((s) => s.resetToGalaxyView);
  const flyToNeighborSector = useGalaxyStore((s) => s.flyToNeighborSector);
  const setMinAffinityFilter = useGalaxyStore((s) => s.setMinAffinityFilter);

  const visibleCounts = useMemo(() => {
    const genres = data.genres.filter((g) => g.affinity >= minAffinityFilter).length;
    const artists = data.artists.filter((a) => a.affinity >= minAffinityFilter).length;
    const songs = data.songs.filter((s) => s.affinity >= minAffinityFilter).length;
    return { genres, artists, songs, total: genres + artists + songs };
  }, [data, minAffinityFilter]);

  const currentSector = data.genres.find((g) => g.id === selectedSectorId);

  const selectedMetrics = useMemo(
    () => (selectedNode ? calculateStarVisualMetrics(selectedNode) : null),
    [selectedNode]
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6 text-[#F2F4F8] font-mono select-none">
      {/* Top Telemetry Bar */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 border border-[#00F5D4]/25 bg-[#050508]/85 px-5 py-3 rounded">
        <div className="flex items-center gap-3">
          <Orbit className="h-5 w-5 text-[#00F5D4]" strokeWidth={2} />
          <h1 className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-extrabold tracking-tight text-[#F2F4F8]">
            YOUR<span className="text-[#00F5D4]">MUSIC</span>VISUALIZER
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs text-[#B8DCE8] tabular-nums">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#CCFF00]" strokeWidth={2} />
            <span>NODOS VISIBLES:</span>
            <strong className="text-[#CCFF00]">{visibleCounts.total}</strong>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
            <span>MODO CÁMARA:</span>
            <strong className="text-[#00F5D4] uppercase">
              {isFlying
                ? `VUELO GSAP (${lastFlightDurationMs}ms)`
                : `${cameraMode} · ${cameraDistance}pc`}
            </strong>
          </div>
          <div className="hidden lg:flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-[#FF2A85]" strokeWidth={2} />
            <span>MOTOR 3D:</span>
            <strong className="text-[#F2F4F8]">
              {perfStats.fps} FPS · {perfStats.drawCalls} DC
            </strong>
          </div>
        </div>
      </header>

      {/* Middle Workspace: Left Sector Navigation & Right Node Sleeve Inspection */}
      <div className="my-auto flex flex-col md:flex-row items-start justify-between gap-6 pointer-events-none py-3">
        {/* Left Control Column: Constellation Sectors & Affinity Threshold */}
        <aside className="pointer-events-auto flex flex-col gap-3 w-full md:w-72">
          <div className="flex flex-col gap-1.5 bg-[#090B12]/90 border border-[#00F5D4]/20 p-3.5 rounded">
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-tight text-[#F2F4F8] mb-1">
              Constelaciones por Estilo
            </h2>

            {data.genres.map((genre) => {
              const isActive =
                selectedSectorId === genre.id && cameraMode !== 'galaxy';
              const affinityPct = Math.round(genre.affinity * 100);
              return (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => selectSector(genre.id)}
                  className={`flex items-center justify-between px-3 py-2 text-left text-xs transition-transform duration-150 rounded border ${
                    isActive
                      ? 'bg-[#131826] border-[#CCFF00] text-[#F2F4F8] translate-x-1'
                      : 'bg-[#050508]/80 border-[#00F5D4]/20 text-[#B8DCE8] hover:border-[#00F5D4]/60 hover:text-[#F2F4F8]'
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

            <button
              type="button"
              onClick={resetToGalaxyView}
              className={`mt-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded border transition-colors duration-150 ${
                cameraMode === 'galaxy'
                  ? 'bg-[#00F5D4] text-[#050508] border-[#00F5D4]'
                  : 'bg-[#050508] text-[#00F5D4] border-[#00F5D4]/40 hover:bg-[#00F5D4]/15'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Vista Galáctica Completa</span>
            </button>
          </div>

          {/* Affinity Filter Control */}
          <div className="bg-[#090B12]/90 border border-[#00F5D4]/20 p-3.5 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#F2F4F8]">
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
                <span>Umbral de Afinidad</span>
              </span>
              <span className="text-[11px] tabular-nums text-[#CCFF00]">
                {Math.round(minAffinityFilter * 100)}% mín
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {AFFINITY_THRESHOLDS.map((item) => {
                const active = minAffinityFilter === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMinAffinityFilter(item.value)}
                    className={`py-1.5 px-1 text-[11px] font-semibold rounded border tabular-nums transition-colors duration-150 ${
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
          </div>
        </aside>

        {/* Right Active Star Inspection Placard (Archival Record-Sleeve Aesthetic) */}
        {selectedNode && selectedMetrics && (
          <section className="pointer-events-auto w-full md:w-88 rounded border border-[#FF2A85]/55 bg-[#0A0C14]/95 p-5 shadow-[0_14px_38px_rgba(5,5,8,0.85)]">
            <h2 className="font-[family-name:var(--font-syne)] text-2xl font-extrabold tracking-tight text-[#F2F4F8] leading-tight">
              {'name' in selectedNode ? selectedNode.name : selectedNode.title}
            </h2>

            {/* Post-heading classification & affinity badges (no eyebrow above heading) */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] tabular-nums">
              <span className="rounded bg-[#FF2A85] px-2 py-0.5 font-bold text-[#050508]">
                AFINIDAD {Math.round(selectedNode.affinity * 100)}%
              </span>
              <span className="rounded border border-[#00F5D4]/40 bg-[#050508] px-2 py-0.5 text-[#00F5D4] font-semibold">
                {selectedMetrics.spectralClass}
              </span>
              {'songCount' in selectedNode && (
                <span className="rounded border border-[#CCFF00]/40 bg-[#050508] px-2 py-0.5 text-[#CCFF00]">
                  {selectedNode.songCount} canciones
                </span>
              )}
            </div>

            {/* Logarithmic Star Sizing & Luminosity Readout */}
            <div className="mt-4 grid grid-cols-3 gap-2 rounded border border-[#00F5D4]/20 bg-[#050508] p-2.5 text-center tabular-nums">
              <div>
                <div className="text-[10px] text-[#B8DCE8]">RADIO NÚCLEO</div>
                <div className="text-xs font-bold text-[#00F5D4]">
                  {selectedMetrics.coreRadius.toFixed(2)} R☉
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#B8DCE8]">HALO CORONA</div>
                <div className="text-xs font-bold text-[#CCFF00]">
                  {selectedMetrics.coronaRadius.toFixed(2)} R☉
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#B8DCE8]">BRILLO EMISIVO</div>
                <div className="text-xs font-bold text-[#FF2A85]">
                  {selectedMetrics.emissiveIntensity.toFixed(2)} lm
                </div>
              </div>
            </div>

            {'description' in selectedNode && (
              <p className="mt-3 text-xs text-[#B8DCE8] leading-relaxed">
                {selectedNode.description}
              </p>
            )}

            {/* If Genre is selected: allow flying to any Artist star in this constellation */}
            {selectedNode.type === 'genre' && (
              <div className="mt-4 border-t border-[#00F5D4]/20 pt-3">
                <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8] mb-2">
                  Estrellas del Sector
                </h3>
                <div className="flex flex-col gap-1.5 text-xs max-h-44 overflow-y-auto pr-1">
                  {data.artists
                    .filter((a) => a.genreId === selectedNode.id)
                    .map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => selectNode(artist)}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded border border-[#00F5D4]/15 bg-[#050508] hover:border-[#00F5D4] text-left transition-colors duration-150 tabular-nums"
                      >
                        <span className="font-semibold text-[#F2F4F8] truncate">
                          {artist.name}
                        </span>
                        <span className="text-[11px] text-[#CCFF00]">
                          {artist.songCount}p · {Math.round(artist.affinity * 100)}%
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* If Artist is selected: list satellite songs */}
            {selectedNode.type === 'artist' && (
              <div className="mt-4 border-t border-[#00F5D4]/20 pt-3">
                <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8] mb-2">
                  Pistas en Órbita ({currentSector?.name.split('&')[0].trim()})
                </h3>
                <div className="flex flex-col gap-1.5 text-xs">
                  {data.songs
                    .filter((s) => s.artistId === selectedNode.id)
                    .map((song) => (
                      <button
                        key={song.id}
                        type="button"
                        onClick={() => selectNode(song)}
                        className="flex items-center justify-between py-1.5 px-2.5 rounded border border-[#00F5D4]/15 bg-[#050508] hover:border-[#FF2A85] text-left transition-colors duration-150 tabular-nums"
                      >
                        <span className="flex items-center gap-2 truncate text-[#F2F4F8]">
                          <Disc3 className="h-3.5 w-3.5 text-[#FF2A85] shrink-0" strokeWidth={2} />
                          <span className="truncate">{song.title}</span>
                        </span>
                        <span className="text-[11px] text-[#CCFF00] shrink-0">
                          {Math.floor(song.duration / 60)}:
                          {(song.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* If Song is selected: button to return to parent Artist star */}
            {selectedNode.type === 'song' && (
              <div className="mt-4 border-t border-[#00F5D4]/20 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    const parentArtist = data.artists.find(
                      (a) => a.id === selectedNode.artistId
                    );
                    if (parentArtist) selectNode(parentArtist);
                  }}
                  className="w-full flex items-center justify-between py-2 px-3 rounded border border-[#00F5D4]/40 bg-[#050508] hover:bg-[#00F5D4]/15 text-xs font-semibold text-[#00F5D4]"
                >
                  <span>Volver a la estrella del artista</span>
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Bottom Dock: Scale Formula Telemetry & Sector Flight Trigger */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 border border-[#00F5D4]/25 bg-[#050508]/85 px-5 py-2.5 rounded text-xs text-[#B8DCE8]">
        <div className="flex flex-wrap items-center gap-4 tabular-nums">
          <span className="text-[#F2F4F8] font-semibold">
            ESCALA LOGARÍTMICA:
          </span>
          <span>R = r₀ + w₁·ln(1 + canciones) + w₂·afinidad¹·⁵</span>
        </div>

        <button
          type="button"
          onClick={() => flyToNeighborSector(1)}
          className="flex items-center gap-1.5 rounded bg-[#00F5D4] px-3.5 py-1.5 text-xs font-bold text-[#050508] hover:bg-[#CCFF00] transition-colors duration-150"
        >
          <span>Volar a Constelación Vecina</span>
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </footer>
    </div>
  );
};
