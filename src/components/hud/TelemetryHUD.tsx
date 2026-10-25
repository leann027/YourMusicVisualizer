'use client';

import React from 'react';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export const TelemetryHUD: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const selectSector = useGalaxyStore((s) => s.selectSector);
  const selectNode = useGalaxyStore((s) => s.selectNode);

  const totalArtists = data.artists.length;
  const totalSongs = data.songs.length;
  const totalGenres = data.genres.length;

  const currentSector = data.genres.find((g) => g.id === selectedSectorId);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-7 text-[#F2F4F8] font-mono select-none">
      {/* Top Telemetry Header */}
      <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 backdrop-blur-sm bg-[#050508]/60 px-5 py-3 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-[#00F5D4] shadow-[0_0_10px_#00F5D4] animate-pulse" />
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-[#F2F4F8]">
            YOUR<span className="text-[#00F5D4]">MUSIC</span>VISUALIZER
          </h1>
          <span className="hidden sm:inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] text-[#CCFF00]">
            HISTORIA 1 · WALKING SKELETON
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[#9BA3B8]">
          <div>
            ESTRELLAS ACTIVAS:{' '}
            <strong className="text-[#CCFF00]">{totalGenres + totalArtists + totalSongs}</strong>
          </div>
          <div className="hidden sm:block">
            GÉNEROS: <strong className="text-[#F2F4F8]">{totalGenres}</strong>
          </div>
          <div className="hidden sm:block">
            ARTISTAS: <strong className="text-[#00F5D4]">{totalArtists}</strong>
          </div>
          <div>
            SECTOR:{' '}
            <strong className="text-[#FF2A85] uppercase">
              {currentSector?.name.split('&')[0] || 'GALAXY VIEW'}
            </strong>
          </div>
        </div>
      </header>

      {/* Middle Row: Left Sector Pills & Right Inspection Card */}
      <div className="my-auto flex flex-col md:flex-row items-start justify-between gap-6 pointer-events-none py-4">
        {/* Left Sector Switcher */}
        <aside className="pointer-events-auto flex flex-col gap-2 w-full md:w-64">
          <div className="text-[10px] text-[#9BA3B8] uppercase tracking-wider mb-1">
            SECTORES CONSTELARES
          </div>
          {data.genres.map((genre, idx) => {
            const isActive = selectedSectorId === genre.id;
            return (
              <button
                key={genre.id}
                onClick={() => {
                  selectSector(genre.id);
                  selectNode(genre);
                }}
                className={`flex items-center justify-between px-3 py-2 text-left text-xs transition-all duration-200 border-l-4 rounded-r bg-[#0c0e16]/80 backdrop-blur-md hover:bg-white/10 ${
                  isActive ? 'border-[#CCFF00] text-[#F2F4F8] shadow-lg scale-102' : 'text-[#9BA3B8]'
                }`}
                style={{ borderLeftColor: genre.color }}
              >
                <span className="truncate pr-2">
                  0{idx + 1} // {genre.name.split('&')[0]}
                </span>
                <span className="text-[10px] font-bold opacity-80">{genre.songCount}★</span>
              </button>
            );
          })}
        </aside>

        {/* Right Active Node Inspection Card (Raised Record-Sleeve Style) */}
        {selectedNode && (
          <section className="pointer-events-auto w-full md:w-80 rounded-md border border-white/15 bg-[#0e101a]/95 p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between text-[10px] text-[#00F5D4] uppercase tracking-widest pb-2 border-b border-white/10">
              <span>
                {selectedNode.type === 'genre'
                  ? 'NÚCLEO DE GÉNERO'
                  : selectedNode.type === 'artist'
                  ? 'ESTRELLA DE ARTISTA'
                  : 'NODO DE CANCIÓN'}
              </span>
              {'affinity' in selectedNode && (
                <span className="font-bold text-[#CCFF00]">
                  AFINIDAD {Math.round(selectedNode.affinity * 100)}%
                </span>
              )}
            </div>

            <h2 className="mt-3 text-xl md:text-2xl font-bold tracking-tight text-[#F2F4F8] leading-tight">
              {'name' in selectedNode ? selectedNode.name : selectedNode.title}
            </h2>

            <div className="mt-2 text-xs text-[#9BA3B8] flex items-center gap-2">
              {'songCount' in selectedNode && (
                <span className="rounded bg-white/10 px-2 py-0.5 text-white font-semibold">
                  {selectedNode.songCount} canciones
                </span>
              )}
              {selectedNode.type === 'artist' && (
                <span className="text-[11px] text-[#00F5D4]">
                  Constelación {data.genres.find((g) => g.id === selectedNode.genreId)?.name.split('&')[0]}
                </span>
              )}
            </div>

            {'description' in selectedNode && (
              <p className="mt-3 text-xs text-[#9BA3B8] leading-relaxed border-t border-white/5 pt-2">
                {selectedNode.description}
              </p>
            )}

            {/* If Artist, display sample track list */}
            {selectedNode.type === 'artist' && (
              <div className="mt-4 border-t border-white/10 pt-3">
                <div className="text-[10px] uppercase text-[#9BA3B8] tracking-wider mb-2">
                  PISTAS RELACIONADAS EN CONSTELACIÓN
                </div>
                <div className="flex flex-col gap-1.5 text-xs">
                  {data.songs
                    .filter((s) => s.artistId === selectedNode.id)
                    .map((song, i) => (
                      <div
                        key={song.id}
                        onClick={() => selectNode(song)}
                        className="flex items-center justify-between py-1 px-2 rounded hover:bg-white/10 cursor-pointer text-[#F2F4F8]"
                      >
                        <span className="truncate">
                          0{i + 1}. {song.title}
                        </span>
                        <span className="text-[10px] text-[#CCFF00]">
                          {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Bottom Status & Controls Bar */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-3 backdrop-blur-sm bg-[#050508]/60 px-5 py-2.5 rounded-b-lg text-xs text-[#9BA3B8]">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">CONTROLES:</span>
          <span>Arrastrar para rotar</span>
          <span>·</span>
          <span>Rueda para zoom</span>
          <span>·</span>
          <span>Clic en estrella para inspeccionar</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00F5D4]" />
            <span className="text-[11px]">Electro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#FF2A85]" />
            <span className="text-[11px]">Art Rock</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#CCFF00]" />
            <span className="text-[11px]">IDM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
            <span className="text-[11px]">Dream Pop</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
