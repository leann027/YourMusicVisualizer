'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Eye,
  EyeOff,
  MapPin,
  Mic2,
  Orbit,
  Pause,
  Play,
  Radio,
  X,
} from 'lucide-react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';
import {
  ArtistNode,
  calculateStarVisualMetrics,
  GenreNode,
  SongNode,
} from '../../types/music';

interface ArchivalPortraitProps {
  artist: ArtistNode;
  spectralClass: string;
  imageUrl?: string;
}

/**
 * Generates an Archival Record-Sleeve Square Studio Portrait (`posters-covers-sleeves-yeye-pop-sleeve` raise)
 * tailored to each artist's catalog code, palette accent, and affinity harmonics, or renders the real Spotify artwork when connected.
 */
const ArchivalStudioPortrait: React.FC<ArchivalPortraitProps> = ({
  artist,
  spectralClass,
  imageUrl,
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

  const activeImage = imageUrl || artist.imageUrl;

  return (
    <div
      role="img"
      aria-label={`Retrato de archivo discográfico de ${artist.name}, catálogo ${artist.catalogCode}`}
      className="relative w-20 h-20 sm:w-22 sm:h-22 shrink-0 aspect-square rounded-xl border border-[#00F5D4]/35 overflow-hidden select-none shadow-[0_8px_20px_rgba(5,5,8,0.85)]"
      style={{ backgroundColor: artist.sleeveBg }}
    >
      {activeImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={activeImage}
          alt={artist.name}
          width={112}
          height={112}
          className="h-full w-full object-cover"
        />
      ) : (
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
      )}

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

        {!activeImage && (
          <div className="my-auto text-center font-[family-name:var(--font-syne)] text-xl font-extrabold tracking-tight text-[#F2F4F8] drop-shadow-[0_2px_6px_rgba(5,5,8,0.95)]">
            {initials}
          </div>
        )}

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
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);
  const isAudioPlaying = useGalaxyStore((s) => s.isAudioPlaying);
  const selectNode = useGalaxyStore((s) => s.selectNode);
  const selectSector = useGalaxyStore((s) => s.selectSector);
  const toggleSleeveCollapsed = useGalaxyStore((s) => s.toggleSleeveCollapsed);
  const setAudioPlayback = useGalaxyStore((s) => s.setAudioPlayback);

  const [isDismissed, setIsDismissed] = useState(false);
  const prevSelectedNodeIdRef = useRef<string | null>(null);

  // Automatically reopen sleeve card when the user clicks or focuses a different musical node
  useEffect(() => {
    if (selectedNode && selectedNode.id !== prevSelectedNodeIdRef.current) {
      prevSelectedNodeIdRef.current = selectedNode.id;
      setIsDismissed(false);
    }
  }, [selectedNode]);

  const selectedMetrics = useMemo(
    () => (selectedNode ? calculateStarVisualMetrics(selectedNode) : null),
    [selectedNode]
  );

  // Resolve artist context whether an ArtistNode or SongNode is selected
  const activeArtist: ArtistNode | null =
    selectedNode?.type === 'artist'
      ? selectedNode
      : selectedNode?.type === 'song'
      ? data.artists.find((a) => a.id === selectedNode.artistId) || null
      : null;

  const activeGenre: GenreNode | null =
    selectedNode?.type === 'genre'
      ? selectedNode
      : selectedNode
      ? data.genres.find((g) => g.id === selectedNode.genreId) || null
      : null;

  const artistSongs: SongNode[] = activeArtist
    ? data.songs.filter((s) => s.artistId === activeArtist.id)
    : [];

  // Related cross-genre artists & sister genres connected via 'influence' links (Story 6)
  const { crossGenreInfluences, crossGenreSectors } = useMemo(() => {
    if (!selectedNode) {
      return { crossGenreInfluences: [], crossGenreSectors: [] };
    }
    const focusIds = new Set<string>([selectedNode.id]);
    if (activeArtist) focusIds.add(activeArtist.id);
    if (activeGenre) focusIds.add(activeGenre.id);

    const relatedIds = new Set<string>();
    data.links.forEach((link) => {
      if (link.type === 'influence') {
        if (focusIds.has(link.source)) relatedIds.add(link.target);
        if (focusIds.has(link.target)) relatedIds.add(link.source);
      }
    });

    const relArtists = data.artists
      .filter((a) => relatedIds.has(a.id) && a.id !== activeArtist?.id)
      .slice(0, 6);
    const relGenres = data.genres
      .filter((g) => relatedIds.has(g.id) && g.id !== activeGenre?.id)
      .slice(0, 4);

    return {
      crossGenreInfluences: relArtists,
      crossGenreSectors: relGenres,
    };
  }, [data.links, data.artists, data.genres, activeArtist, activeGenre, selectedNode]);

  if (!selectedNode || !selectedMetrics) {
    return null;
  }

  const handleJumpToBridgeNode = (target: ArtistNode | GenreNode) => {
    selectNode(target);
    const allSongs = data.songs;
    if (target.type === 'artist') {
      const artistSongs = allSongs.filter((s) => s.artistId === target.id);
      if (artistSongs.length > 0) {
        const withPreview = artistSongs.filter((s) => s.previewUrl);
        const candidates = withPreview.length > 0 ? withPreview : artistSongs;
        const randomSong = candidates[Math.floor(Math.random() * candidates.length)];
        webAudioEngine.playTrack(
          randomSong.id,
          randomSong.title,
          randomSong.affinity,
          randomSong.previewUrl
        );
        setAudioPlayback(randomSong.id, true);
      }
    } else if (target.type === 'genre') {
      const genreSongs = allSongs.filter((s) => s.genreId === target.id);
      if (genreSongs.length > 0) {
        const withPreview = genreSongs.filter((s) => s.previewUrl);
        const candidates = withPreview.length > 0 ? withPreview : genreSongs;
        const randomSong = candidates[Math.floor(Math.random() * candidates.length)];
        webAudioEngine.playTrack(
          randomSong.id,
          randomSong.title,
          randomSong.affinity,
          randomSong.previewUrl
        );
        setAudioPlayback(randomSong.id, true);
      }
    }
  };

  const handleToggleSongPreview = (song: SongNode) => {
    selectNode(song);
    const nowPlaying = webAudioEngine.toggleTrack(
      song.id,
      song.title,
      song.affinity,
      song.previewUrl
    );
    setAudioPlayback(nowPlaying ? song.id : null, nowPlaying);
  };

  const spotifyLinkUrl =
    selectedNode.type === 'song'
      ? selectedNode.spotifyUrl || activeArtist?.spotifyUrl
      : activeArtist?.spotifyUrl;

  const nodeTitle =
    'name' in selectedNode ? selectedNode.name : selectedNode.title;

  if (isDismissed) {
    return (
      <div className="pointer-events-auto fixed top-18 md:top-20 right-3 md:right-6 z-30">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          aria-label={`Reabrir ficha discográfica de ${nodeTitle}`}
          className="min-h-9 flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#FF2A85]/40 bg-[#080A14]/90 backdrop-blur-xl text-xs font-semibold text-[#F2F4F8] shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:border-[#FF2A85] hover:shadow-[0_0_12px_rgba(255,42,133,0.3)] transition-all active:scale-95"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF2A85] animate-pulse" />
          <span className="truncate max-w-[130px]">{nodeTitle}</span>
          <span className="text-[10px] text-[#00F5D4] font-mono">Ficha ▾</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Ficha discográfica de inspección estelar"
      className="pointer-events-auto fixed top-18 md:top-20 right-3 md:right-6 z-30 w-full sm:w-80 md:w-84 max-h-[calc(100dvh-10.5rem)] overflow-y-auto rounded-2xl border border-[#FF2A85]/35 bg-[#080A14]/85 backdrop-blur-xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] hud-transition"
    >
      {/* Heading row with title, minimize and close button */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-[family-name:var(--font-syne)] text-lg md:text-xl font-extrabold tracking-tight text-[#F2F4F8] leading-tight truncate">
          {nodeTitle}
        </h2>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleSleeveCollapsed}
            aria-expanded={!isSleeveCollapsed}
            aria-label={
              isSleeveCollapsed
                ? 'Expandir ficha estelar'
                : 'Contraer ficha estelar para despejar el lienzo 3D'
            }
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#00F5D4]/30 bg-[#050508]/80 text-[#B8DCE8] hover:border-[#00F5D4] hover:text-[#F2F4F8] transition-all duration-150 active:scale-95"
          >
            {isSleeveCollapsed ? (
              <Eye className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
            ) : (
              <EyeOff className="h-3.5 w-3.5 text-[#00F5D4]" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Cerrar ficha para despejar la vista estelar"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#FF2A85]/40 bg-[#050508]/80 text-[#FF2A85] hover:bg-[#FF2A85]/20 hover:border-[#FF2A85] transition-all duration-150 active:scale-95"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Post-heading metadata badges (Catalog, Affinity, Spectral Class, Song count, Spotify Link) */}
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
        {spotifyLinkUrl && (
          <a
            href={spotifyLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-6 inline-flex items-center gap-1 rounded border border-[#CCFF00]/60 bg-[#050508] px-2 py-0.5 font-bold text-[#CCFF00] hover:bg-[#CCFF00] hover:text-[#050508] transition-colors"
          >
            <span>Spotify</span>
            <ArrowUpRight className="h-3 w-3" strokeWidth={2.2} />
          </a>
        )}
      </div>

      {!isSleeveCollapsed && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Archival Vinyl Record-Sleeve Studio Portrait + Origin & Bio for Artist or Song */}
          {activeArtist && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#00F5D4]/20 bg-[#050508]/80 p-2.5">
              <ArchivalStudioPortrait
                artist={activeArtist}
                spectralClass={selectedMetrics.spectralClass}
                imageUrl={
                  selectedNode.type === 'song'
                    ? selectedNode.imageUrl || activeArtist.imageUrl
                    : activeArtist.imageUrl
                }
              />

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] text-[#00F5D4] font-semibold">
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{activeArtist.origin}</span>
                </div>

                {selectedNode.type === 'song' && (
                  <div className="rounded border border-[#CCFF00]/35 bg-[#090B12] px-2 py-0.5 text-[11px] text-[#CCFF00]">
                    Álbum: <strong>{selectedNode.album}</strong> ·{' '}
                    {Math.floor(selectedNode.duration / 60)}:
                    {(selectedNode.duration % 60).toString().padStart(2, '0')}
                  </div>
                )}

                <p className="text-xs text-[#B8DCE8] leading-snug line-clamp-3">
                  {activeArtist.bio}
                </p>
              </div>
            </div>
          )}

          {/* Genre description when a sector star is inspected */}
          {selectedNode.type === 'genre' && (
            <p className="text-xs text-[#B8DCE8] leading-relaxed rounded-xl border border-[#00F5D4]/20 bg-[#050508]/80 p-3">
              {selectedNode.description}
            </p>
          )}

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
                  const isTrackPlaying =
                    isAudioPlaying && playingTrackId === song.id;
                  return (
                    <li key={song.id}>
                      <button
                        type="button"
                        onClick={() => handleToggleSongPreview(song)}
                        aria-current={isCurrentSong ? 'true' : undefined}
                        aria-pressed={isTrackPlaying}
                        className={`w-full min-h-9 flex items-center justify-between gap-2 py-1.5 px-2.5 rounded border text-left transition-colors duration-150 tabular-nums ${
                          isTrackPlaying
                            ? 'border-[#00F5D4] bg-[#131826] text-[#F2F4F8]'
                            : isCurrentSong
                            ? 'border-[#CCFF00] bg-[#131826] text-[#F2F4F8]'
                            : 'border-[#00F5D4]/20 bg-[#050508] hover:border-[#FF2A85] text-[#F2F4F8]'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-[#B8DCE8] w-5 shrink-0">
                            A{idx + 1}
                          </span>
                          {isTrackPlaying ? (
                            <Pause
                              className="h-3.5 w-3.5 text-[#00F5D4] shrink-0"
                              strokeWidth={2.2}
                            />
                          ) : (
                            <Play
                              className="h-3.5 w-3.5 text-[#FF2A85] shrink-0"
                              strokeWidth={2}
                            />
                          )}
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

          {/* Cross-Genre Relational Filaments Section (Story 6) */}
          {(crossGenreInfluences.length > 0 || crossGenreSectors.length > 0) && (
            <div className="border-t border-[#00F5D4]/20 pt-2.5">
              <div className="text-[11px] font-semibold text-[#B8DCE8] mb-1.5">
                Puentes Inter-Estelares (Géneros y Artistas Relacionados):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {crossGenreSectors.map((relGenre) => (
                  <button
                    key={relGenre.id}
                    type="button"
                    onClick={() => handleJumpToBridgeNode(relGenre)}
                    className="min-h-7 flex items-center gap-1 rounded border border-[#00F5D4]/45 bg-[#050508] px-2.5 py-1 text-[11px] font-bold text-[#00F5D4] hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                  >
                    <Orbit className="h-3 w-3 text-[#00F5D4]" strokeWidth={2} />
                    <span>{relGenre.name.split('&')[0].trim()}</span>
                  </button>
                ))}
                {crossGenreInfluences.map((relArtist) => {
                  const relGenreObj = data.genres.find(
                    (g) => g.id === relArtist.genreId
                  );
                  const shortGenre = relGenreObj
                    ? relGenreObj.name.split('&')[0].trim()
                    : '';
                  return (
                    <button
                      key={relArtist.id}
                      type="button"
                      onClick={() => handleJumpToBridgeNode(relArtist)}
                      className="min-h-7 flex items-center gap-1 rounded border border-[#FF2A85]/45 bg-[#050508] px-2.5 py-1 text-[11px] font-semibold text-[#F2F4F8] hover:border-[#CCFF00] hover:text-[#CCFF00] transition-colors"
                    >
                      <Orbit className="h-3 w-3 text-[#FF2A85]" strokeWidth={2} />
                      <span>{relArtist.name}</span>
                      {shortGenre && (
                        <span className="text-[10px] text-[#B8DCE8]">
                          · {shortGenre}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
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
