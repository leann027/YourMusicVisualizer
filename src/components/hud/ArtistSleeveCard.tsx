'use client';

import React, { useMemo } from 'react';
import {
  ChevronRight,
  Disc3,
  Eye,
  EyeOff,
  MapPin,
  Mic2,
  Orbit,
  Radio,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import {
  ArtistNode,
  calculateStarVisualMetrics,
  GenreNode,
  SongNode,
} from '../../types/music';

interface ArchivalPortraitProps {
  artist: ArtistNode;
  spectralClass: string;
}

/**
 * Generates an Archival Record-Sleeve Square Studio Portrait (`posters-covers-sleeves-yeye-pop-sleeve` raise)
 * tailored to each artist's catalog code, palette accent, and affinity harmonics.
 */
const ArchivalStudioPortrait: React.FC<ArchivalPortraitProps> = ({
  artist,
  spectralClass,
}) => {
  const initials = useMemo(() => {
    const parts = artist.name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return artist.name.slice(0, 2).toUpperCase();
  }, [artist.name]);

  const seed = useMemo(() => {
    return artist.id
      .split('')
      .reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  }, [artist.id]);

  const bars = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => {
      const h = 14 + ((seed * (idx + 3)) % 36);
      return h;
    });
  }, [seed]);

  return (
    <div
      role="img"
      aria-label={`Retrato de archivo discográfico de ${artist.name}, catálogo ${artist.catalogCode}`}
      className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 aspect-square rounded border border-[#00F5D4]/35 overflow-hidden select-none shadow-[0_8px_20px_rgba(5,5,8,0.85)]"
      style={{ backgroundColor: artist.sleeveBg }}
    >
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        {/* Yé-Yé Pop Record-Sleeve Offset Geometric Blocks */}
        <rect
          x="0"
          y="0"
          width="120"
          height="120"
          fill={artist.sleeveBg}
        />
        <circle
          cx="88"
          cy="34"
          r="42"
          fill={artist.sleeveAccent}
          fillOpacity="0.18"
        />
        <circle
          cx="60"
          cy="60"
          r="46"
          fill="none"
          stroke={artist.sleeveAccent}
          strokeOpacity="0.55"
          strokeWidth="1.25"
        />
        <circle
          cx="60"
          cy="60"
          r="33"
          fill="none"
          stroke="#F2F4F8"
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        <circle
          cx="60"
          cy="60"
          r="19"
          fill="#050508"
          stroke={artist.sleeveAccent}
          strokeWidth="1.5"
        />
        <circle cx="60" cy="60" r="4.5" fill={artist.sleeveAccent} />

        {/* Acoustic Waveform Bars at Bottom Edge */}
        {bars.map((barHeight, i) => (
          <rect
            key={i}
            x={10 + i * 8.5}
            y={112 - barHeight * 0.45}
            width="4.5"
            height={barHeight * 0.45}
            rx="1"
            fill={i % 3 === 0 ? '#CCFF00' : artist.sleeveAccent}
            fillOpacity="0.85"
          />
        ))}
      </svg>

      {/* Catalog Monogram & Stamp Overlay */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2">
        <div className="flex items-center justify-between gap-1 text-[9px] font-bold tracking-tight">
          <span
            className="rounded px-1 py-0.5 text-[#050508]"
            style={{ backgroundColor: artist.sleeveAccent }}
          >
            {artist.catalogCode}
          </span>
          <span className="rounded bg-[#050508] px-1 py-0.5 text-[#F2F4F8] border border-[#F2F4F8]/25">
            {spectralClass.split('-')[0]}
          </span>
        </div>

        <div className="my-auto text-center font-[family-name:var(--font-syne)] text-xl font-extrabold tracking-tight text-[#F2F4F8] drop-shadow-[0_2px_6px_rgba(5,5,8,0.95)]">
          {initials}
        </div>

        <div className="text-[8px] font-semibold uppercase tracking-wider text-[#F2F4F8] bg-[#050508] px-1 py-0.5 rounded w-fit">
          STEREO · 33⅓ RPM
        </div>
      </div>
    </div>
  );
};

export const ArtistSleeveCard: React.FC = () => {
  const data = useGalaxyStore((s) => s.data);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const isSleeveCollapsed = useGalaxyStore((s) => s.isSleeveCollapsed);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const selectSector = useGalaxyStore((s) => s.selectSector);
  const toggleSleeveCollapsed = useGalaxyStore((s) => s.toggleSleeveCollapsed);

  const selectedMetrics = useMemo(
    () => (selectedNode ? calculateStarVisualMetrics(selectedNode) : null),
    [selectedNode]
  );

  if (!selectedNode || !selectedMetrics) {
    return null;
  }

  // Resolve artist context whether an ArtistNode or SongNode is selected
  const activeArtist: ArtistNode | null =
    selectedNode.type === 'artist'
      ? selectedNode
      : selectedNode.type === 'song'
      ? data.artists.find((a) => a.id === selectedNode.artistId) || null
      : null;

  const activeGenre: GenreNode | null =
    selectedNode.type === 'genre'
      ? selectedNode
      : data.genres.find((g) => g.id === selectedNode.genreId) || null;

  const artistSongs: SongNode[] = activeArtist
    ? data.songs.filter((s) => s.artistId === activeArtist.id)
    : [];

  const nodeTitle =
    'name' in selectedNode ? selectedNode.name : selectedNode.title;

  return (
    <aside
      aria-label="Ficha discográfica de inspección estelar"
      className="pointer-events-auto w-full md:w-96 rounded border border-[#FF2A85]/55 bg-[#0A0C14]/95 p-4 md:p-5 shadow-[0_16px_42px_rgba(5,5,8,0.9)] hud-transition"
    >
      {/* Heading row: Heading leads directly without any eyebrow above it */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-[family-name:var(--font-syne)] text-xl md:text-2xl font-extrabold tracking-tight text-[#F2F4F8] leading-tight">
          {nodeTitle}
        </h2>

        <button
          type="button"
          onClick={toggleSleeveCollapsed}
          aria-expanded={!isSleeveCollapsed}
          aria-label={
            isSleeveCollapsed
              ? 'Expandir ficha estelar'
              : 'Contraer ficha estelar para despejar el lienzo 3D'
          }
          className="flex min-h-8 min-w-8 shrink-0 items-center gap-1.5 rounded border border-[#00F5D4]/35 bg-[#050508] px-2.5 py-1 text-[11px] font-semibold text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8] transition-colors"
        >
          {isSleeveCollapsed ? (
            <>
              <Eye className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
              <span>Ficha</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
              <span>Ocultar</span>
            </>
          )}
        </button>
      </div>

      {/* Post-heading metadata badges (Catalog, Affinity, Spectral Class, Song count) */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums">
        <span className="rounded bg-[#FF2A85] px-2 py-0.5 font-bold text-[#050508]">
          AFINIDAD {Math.round(selectedNode.affinity * 100)}%
        </span>
        {activeArtist && (
          <span className="rounded border border-[#F2F4F8]/25 bg-[#050508] px-2 py-0.5 font-semibold text-[#F2F4F8]">
            CAT. {activeArtist.catalogCode}
          </span>
        )}
        <span className="rounded border border-[#00F5D4]/40 bg-[#050508] px-2 py-0.5 font-semibold text-[#00F5D4]">
          {selectedMetrics.spectralClass}
        </span>
        {'songCount' in selectedNode && (
          <span className="rounded border border-[#CCFF00]/40 bg-[#050508] px-2 py-0.5 text-[#CCFF00] font-semibold">
            {selectedNode.songCount} canciones
          </span>
        )}
      </div>

      {!isSleeveCollapsed && (
        <div className="mt-4 flex flex-col gap-3.5">
          {/* Archival Vinyl Record-Sleeve Studio Portrait + Origin & Bio for Artist or Song */}
          {activeArtist && (
            <div className="flex items-start gap-3.5 rounded border border-[#00F5D4]/20 bg-[#050508]/90 p-3">
              <ArchivalStudioPortrait
                artist={activeArtist}
                spectralClass={selectedMetrics.spectralClass}
              />

              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-[#00F5D4] font-semibold">
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{activeArtist.origin}</span>
                </div>

                {selectedNode.type === 'song' && (
                  <div className="rounded border border-[#CCFF00]/35 bg-[#090B12] px-2 py-1 text-[11px] text-[#CCFF00]">
                    Álbum: <strong>{selectedNode.album}</strong> ·{' '}
                    {Math.floor(selectedNode.duration / 60)}:
                    {(selectedNode.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}

                <p className="text-xs text-[#B8DCE8] leading-relaxed">
                  {activeArtist.bio}
                </p>
              </div>
            </div>
          )}

          {/* Genre description when a sector star is inspected */}
          {selectedNode.type === 'genre' && (
            <p className="text-xs text-[#B8DCE8] leading-relaxed rounded border border-[#00F5D4]/20 bg-[#050508]/90 p-3">
              {selectedNode.description}
            </p>
          )}

          {/* Logarithmic Star Sizing & Luminosity Readout */}
          <div className="grid grid-cols-3 gap-2 rounded border border-[#00F5D4]/20 bg-[#050508] p-2.5 text-center tabular-nums">
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

          {/* If Genre is selected: list Artist stars in this constellation */}
          {selectedNode.type === 'genre' && (
            <div className="border-t border-[#00F5D4]/20 pt-3">
              <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8] mb-2">
                Artistas en Constelación
              </h3>
              <ul
                role="list"
                className="flex flex-col gap-1.5 text-xs max-h-44 overflow-y-auto pr-1"
              >
                {data.artists
                  .filter((a) => a.genreId === selectedNode.id)
                  .map((artist) => (
                    <li key={artist.id}>
                      <button
                        type="button"
                        onClick={() => selectNode(artist)}
                        className="w-full min-h-9 flex items-center justify-between py-1.5 px-2.5 rounded border border-[#00F5D4]/20 bg-[#050508] hover:border-[#00F5D4] text-left transition-colors duration-150 tabular-nums"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Mic2
                            className="h-3.5 w-3.5 shrink-0"
                            style={{ color: artist.sleeveAccent }}
                            strokeWidth={2}
                          />
                          <span className="font-semibold text-[#F2F4F8] truncate">
                            {artist.name}
                          </span>
                        </span>
                        <span className="text-[11px] text-[#CCFF00] shrink-0">
                          {artist.songCount}p · {Math.round(artist.affinity * 100)}%
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* If Artist or Song is selected: Vinyl Side-A Tracklist in Orbit */}
          {activeArtist && artistSongs.length > 0 && (
            <div className="border-t border-[#00F5D4]/20 pt-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-[family-name:var(--font-syne)] text-sm font-bold text-[#F2F4F8]">
                  Lado A · Pistas en Órbita ({artistSongs.length})
                </h3>
                {activeGenre && (
                  <button
                    type="button"
                    onClick={() => selectSector(activeGenre.id)}
                    className="min-h-7 px-2 py-1 rounded border border-[#00F5D4]/30 bg-[#050508] flex items-center gap-1 text-[11px] font-semibold text-[#00F5D4] hover:border-[#00F5D4] transition-colors"
                  >
                    <Radio className="h-3 w-3" strokeWidth={2} />
                    <span>{activeGenre.name.split('&')[0].trim()}</span>
                  </button>
                )}
              </div>

              <ol
                role="list"
                aria-label={`Lista de canciones de ${activeArtist.name}`}
                className="flex flex-col gap-1.5 text-xs max-h-44 overflow-y-auto pr-1"
              >
                {artistSongs.map((song, idx) => {
                  const isCurrentSong =
                    selectedNode.type === 'song' && selectedNode.id === song.id;
                  return (
                    <li key={song.id}>
                      <button
                        type="button"
                        onClick={() => selectNode(song)}
                        aria-current={isCurrentSong ? 'true' : undefined}
                        className={`w-full min-h-9 flex items-center justify-between gap-2 py-1.5 px-2.5 rounded border text-left transition-colors duration-150 tabular-nums ${
                          isCurrentSong
                            ? 'border-[#CCFF00] bg-[#131826] text-[#F2F4F8]'
                            : 'border-[#00F5D4]/20 bg-[#050508] hover:border-[#FF2A85] text-[#F2F4F8]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-[#B8DCE8] w-5 shrink-0">
                            A{idx + 1}
                          </span>
                          <Disc3
                            className="h-3.5 w-3.5 text-[#FF2A85] shrink-0"
                            strokeWidth={2}
                          />
                          <span className="truncate font-semibold">
                            {song.title}
                          </span>
                        </span>

                        <span className="flex items-center gap-2 shrink-0 text-[11px]">
                          <span className="hidden sm:inline text-[#B8DCE8] truncate max-w-24">
                            {song.album}
                          </span>
                          <span className="text-[#CCFF00] font-semibold">
                            {Math.floor(song.duration / 60)}:
                            {(song.duration % 60).toString().padStart(2, '0')}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* If Song is selected: button to return to parent Artist star */}
          {selectedNode.type === 'song' && activeArtist && (
            <button
              type="button"
              onClick={() => selectNode(activeArtist)}
              className="w-full min-h-9 flex items-center justify-between py-2 px-3 rounded border border-[#00F5D4]/45 bg-[#050508] hover:bg-[#00F5D4]/15 text-xs font-semibold text-[#00F5D4] transition-colors"
            >
              <span className="flex items-center gap-2">
                <Orbit className="h-3.5 w-3.5" strokeWidth={2} />
                <span>Volver a la estrella de {activeArtist.name}</span>
              </span>
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
