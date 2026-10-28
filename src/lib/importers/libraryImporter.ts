'use client';

import {
  ArtistNode,
  GenreNode,
  MusicGalaxyData,
  MusicLink,
  SongNode,
} from '../../types/music';
import { classifyUniversalMusic } from '../music/genreClassifier';
import { artistTagProfile, RawTag, songTagProfile } from '../music/tagModel';
import { classifyLibrary, UNCLASSIFIED_GENRE } from '../music/dynamicGenres';
import { computeTfIdfLinks, normalizeMusicalTag } from '../music/taxonomy';
import { applyClassicLayout, classicSectorCenter } from '../layout/classicLayout';

/**
 * Data Ingestion & Spatial Layout Engine (`libraryImporter.ts`).
 *
 * Converts real Spotify / Last.fm / JSON user library payloads into a normalized
 * 3D celestial graph (`MusicGalaxyData`) with deterministic orbital coordinates,
 * archival catalog codes, and cross-genre affinity bridges.
 */

export interface RawLibraryTrackInput {
  title: string;
  artist: string;
  genre?: string;
  subgenre?: string;
  tags?: string[];
  secondaryGenre?: string;
  spotifyGenres?: string[]; // artist genres from Spotify
  artistTags?: RawTag[]; // Last.fm artist tags (count 0..100)
  trackTags?: RawTag[]; // Last.fm tags of this song
  collaborators?: string[];
  album?: string;
  durationSec?: number;
  playCount?: number;
  affinity?: number;
  origin?: string;
  bio?: string;
  previewUrl?: string;
  imageUrl?: string;
  artistImageUrl?: string;
  spotifyUrl?: string;
  artistSpotifyUrl?: string;
}

export interface RawLibraryPayload {
  profileName?: string;
  source?: 'spotify' | 'lastfm' | 'custom-json';
  tracks: RawLibraryTrackInput[];
}

const SECTOR_PALETTE = [
  { color: '#00F5D4', bg: '#081D1A', center: [-24, 6, -18] as [number, number, number] }, // 1. Turquesa Espacial
  { color: '#FF2A85', bg: '#200C1D', center: [24, -6, -16] as [number, number, number] }, // 2. Magenta Cósmico
  { color: '#CCFF00', bg: '#141C0A', center: [-14, -14, 22] as [number, number, number] }, // 3. Verde Radiactivo
  { color: '#38BDF8', bg: '#0B1A2C', center: [20, 15, 18] as [number, number, number] }, // 4. Azul Zafiro / Hielo
  { color: '#A855F7', bg: '#1A0C2B', center: [0, 22, -26] as [number, number, number] }, // 5. Violeta Púlsar
  { color: '#F59E0B', bg: '#261708', center: [-28, -7, 12] as [number, number, number] }, // 6. Ámbar Supernova
  { color: '#EC4899', bg: '#260B1C', center: [28, 8, 8] as [number, number, number] }, // 7. Rosa Nebular
  { color: '#10B981', bg: '#071F18', center: [0, -20, -22] as [number, number, number] }, // 8. Esmeralda Interestelar
  { color: '#6366F1', bg: '#0E112B', center: [-18, 18, 14] as [number, number, number] }, // 9. Índigo Profundo
  { color: '#F43F5E', bg: '#260B14', center: [16, -18, 16] as [number, number, number] }, // 10. Carmesí Gigante Roja
  { color: '#14B8A6', bg: '#061E1D', center: [-32, 5, -20] as [number, number, number] }, // 11. Cian Acuático
  { color: '#EAB308', bg: '#231C06', center: [30, -5, -22] as [number, number, number] }, // 12. Oro Estelar
  { color: '#8B5CF6', bg: '#160D2A', center: [-10, 5, 28] as [number, number, number] }, // 13. Lavanda Astral
  { color: '#FB7185', bg: '#270E15', center: [12, -4, -30] as [number, number, number] }, // 14. Coral Solar
  { color: '#06B6D4', bg: '#071E24', center: [-22, -16, -12] as [number, number, number] }, // 15. Cian Eléctrico
  { color: '#D946EF', bg: '#250B27', center: [22, 12, -26] as [number, number, number] }, // 16. Fucsia Cuántico
  { color: '#22C55E', bg: '#06200F', center: [-12, -22, -10] as [number, number, number] }, // 17. Verde Neón
  { color: '#F97316', bg: '#241006', center: [26, -15, 2] as [number, number, number] }, // 18. Cobre Astral
  { color: '#2DD4BF', bg: '#061F1B', center: [-8, 24, -4] as [number, number, number] }, // 19. Menta Cósmica
  { color: '#E11D48', bg: '#23080F', center: [10, 22, -12] as [number, number, number] }, // 20. Rubí Interestelar
  { color: '#FF3399', bg: '#26071B', center: [14, 18, 22] as [number, number, number] }, // 21. Sakura Ciber-Neón (J-Pop, J-Rock & Anime)
];

/**
 * Dynamically computes non-colliding 3D celestial coordinates and harmonious neon palettes
 * for ANY arbitrary number of dynamic constellations created from user libraries.
 */
export function getDynamicSectorPlacement(
  index: number,
  totalCount: number,
  _genreName: string
): { color: string; bg: string; center: [number, number, number] } {
  void _genreName;
  // Positions come from the classic layout module; colors stay with the importer palette
  const center = classicSectorCenter(index, totalCount);

  if (index < SECTOR_PALETTE.length) {
    return { color: SECTOR_PALETTE[index].color, bg: SECTOR_PALETTE[index].bg, center };
  }
  // dynamic libraries can exceed the palette: extra hues spread by the golden angle
  const hue = ((index - SECTOR_PALETTE.length) * 0.381966 + 0.07) % 1;
  return { color: hslToHex(hue, 0.78, 0.6), bg: hslToHex(hue, 0.55, 0.08), center };
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Dynamic classification of a whole payload (A3): one weighted tag profile per artist (Spotify
 * genres, the track's `genre`, Last.fm artist and song tags, legacy `tags`), clustered with
 * classifyLibrary. Artists without tags fall back to the keyword classifier (never a random
 * genre) and otherwise to OTRAS ÓRBITAS. Returns genre per artist name and bridge genre per track.
 */
function classifyPayload(tracks: RawLibraryTrackInput[]): {
  artistGenre: Map<string, string>;
  trackSecondaryGenre: Map<RawLibraryTrackInput, string>;
} {
  const byArtist = new Map<string, RawLibraryTrackInput[]>();
  for (const t of tracks) {
    if (!t.title || !t.artist) continue;
    const name = t.artist.trim();
    if (!byArtist.has(name)) byArtist.set(name, []);
    byArtist.get(name)!.push(t);
  }
  const songTags = (t: RawLibraryTrackInput): RawTag[] =>
    t.trackTags ?? (t.tags ?? []).map((name) => ({ name, weight: 60 }));
  const artistNames = [...byArtist.keys()];
  const songKey = new Map<RawLibraryTrackInput, string>();
  tracks.forEach((t, i) => songKey.set(t, `t${i}`));

  const classification = classifyLibrary({
    artists: artistNames.map((name) => {
      const items = byArtist.get(name)!;
      const spotifyGenres = [...new Set(items.flatMap((t) => [...(t.spotifyGenres ?? []), ...(t.genre ? [t.genre] : [])]))];
      const artistTags = items.find((t) => t.artistTags?.length)?.artistTags;
      let profile = artistTagProfile({ spotifyGenres, artistTags, trackTags: items.map(songTags) });
      if (profile.length === 0) {
        const guess = classifyUniversalMusic(name, undefined, items[0].title).genre;
        profile = artistTagProfile({ fallbackGenre: guess || undefined });
      }
      return { id: name, songCount: items.length, profile };
    }),
    songs: [...byArtist.entries()].flatMap(([name, items]) =>
      items.map((t) => ({ id: songKey.get(t)!, artistId: name, profile: songTagProfile(songTags(t)) }))
    ),
  });

  const trackSecondaryGenre = new Map<RawLibraryTrackInput, string>();
  for (const [t, key] of songKey) {
    const bridge = classification.songSecondaryGenre.get(key);
    if (bridge) trackSecondaryGenre.set(t, bridge);
  }
  return { artistGenre: classification.artistGenre, trackSecondaryGenre };
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Curated Spotify / Last.fm High-Affinity Streaming Snapshot ("Perfil Streaming: Neo-Tokyo & Bristol")
 * allowing instant one-click switching or template export.
 */
export const SAMPLE_STREAMING_PAYLOAD: RawLibraryPayload = {
  profileName: 'Spotify / Last.fm · Sesión Neo-Tokyo & Bristol',
  source: 'spotify',
  tracks: [
    {
      title: 'Teardrop',
      artist: 'Massive Attack',
      genre: 'TRIP-HOP & BRISTOL DUB',
      album: 'Mezzanine (1998)',
      durationSec: 330,
      playCount: 94,
      affinity: 0.99,
      origin: 'Bristol, Reino Unido · 1988',
      bio: 'Pioneros del sonido Bristol: líneas de bajo sub-graves, ritmos hipnotizantes y atmósferas cinematográficas.',
    },
    {
      title: 'Angel',
      artist: 'Massive Attack',
      genre: 'TRIP-HOP & BRISTOL DUB',
      album: 'Mezzanine (1998)',
      durationSec: 379,
      playCount: 88,
      affinity: 0.97,
      origin: 'Bristol, Reino Unido · 1988',
    },
    {
      title: 'Glory Box',
      artist: 'Portishead',
      genre: 'TRIP-HOP & BRISTOL DUB',
      album: 'Dummy (1994)',
      durationSec: 306,
      playCount: 79,
      affinity: 0.95,
      origin: 'Bristol, Reino Unido · 1991',
      bio: 'Vinilos crujientes, órganos Rhodes melancólicos y producción noir analógica.',
    },
    {
      title: 'Roads',
      artist: 'Portishead',
      genre: 'TRIP-HOP & BRISTOL DUB',
      album: 'Dummy (1994)',
      durationSec: 305,
      playCount: 71,
      affinity: 0.93,
    },
    {
      title: 'Archangel',
      artist: 'Burial',
      genre: 'UK GARAGE & FUTURE BASS',
      album: 'Untrue (2007)',
      durationSec: 238,
      playCount: 92,
      affinity: 0.98,
      origin: 'Londres, Reino Unido · 2005',
      bio: 'Ecos nocturnos de Londres, percusiones 2-step desplazadas y voces espectrales en vinilo.',
    },
    {
      title: 'Near Dark',
      artist: 'Burial',
      genre: 'UK GARAGE & FUTURE BASS',
      album: 'Untrue (2007)',
      durationSec: 234,
      playCount: 84,
      affinity: 0.94,
    },
    {
      title: 'Two Thousand and Seventeen',
      artist: 'Four Tet',
      genre: 'UK GARAGE & FUTURE BASS',
      album: 'New Energy (2017)',
      durationSec: 252,
      playCount: 76,
      affinity: 0.92,
      origin: 'Londres, Reino Unido · 1998',
      bio: 'Folktrónica orgánica, síntesis modular micro-rítmica y texturas acústicas luminosas.',
    },
    {
      title: 'Merry Christmas Mr. Lawrence',
      artist: 'Ryuichi Sakamoto',
      genre: 'AMBIENT & NEO-CLASSICAL',
      album: '1996 (1996)',
      durationSec: 286,
      playCount: 96,
      affinity: 0.99,
      origin: 'Tokio, Japón · 1978',
      bio: 'Arquitecto entre el impresionismo acústico, la síntesis pionera de YMO y el minimalismo ambiental.',
    },
    {
      title: 'Async',
      artist: 'Ryuichi Sakamoto',
      genre: 'AMBIENT & NEO-CLASSICAL',
      album: 'async (2017)',
      durationSec: 245,
      playCount: 81,
      affinity: 0.95,
    },
    {
      title: 'Says',
      artist: 'Nils Frahm',
      genre: 'AMBIENT & NEO-CLASSICAL',
      album: 'Spaces (2013)',
      durationSec: 498,
      playCount: 85,
      affinity: 0.94,
      origin: 'Berlín, Alemania · 2005',
      bio: 'Pianos de fieltro íntimos entrelazados con arpegios analógicos Roland Juno y delays de cinta.',
    },
    {
      title: 'Technopolis',
      artist: 'Yellow Magic Orchestra',
      genre: 'CYBERPUNK & ELECTRO-POP',
      album: 'Solid State Survivor (1979)',
      durationSec: 254,
      playCount: 89,
      affinity: 0.96,
      origin: 'Tokio, Japón · 1978',
      bio: 'Precursores del synth-pop y electro japonés con secuenciadores controlados por microprocesador.',
    },
    {
      title: 'Rydeen',
      artist: 'Yellow Magic Orchestra',
      genre: 'CYBERPUNK & ELECTRO-POP',
      album: 'Solid State Survivor (1979)',
      durationSec: 266,
      playCount: 83,
      affinity: 0.94,
    },
    {
      title: 'Oblivion',
      artist: 'Grimes',
      genre: 'CYBERPUNK & ELECTRO-POP',
      album: 'Visions (2012)',
      durationSec: 251,
      playCount: 74,
      affinity: 0.89,
      origin: 'Vancouver, Canadá · 2010',
      bio: 'Dream-synth futurista, capas vocales etéreas y secuenciadores industriales de dormitorio.',
    },
    {
      title: 'Sparkle (スパークル)',
      artist: 'RADWIMPS',
      genre: 'J-POP, J-ROCK & ANIME',
      album: 'Your Name. (君の名は。)',
      durationSec: 537,
      playCount: 112,
      affinity: 0.99,
      origin: 'Kanagawa, Japón · 2001',
      bio: 'Composiciones cinemáticas, arreglos orquestales emotivos y rock alternativo japonés.',
    },
    {
      title: 'Yoru ni Kakeru (夜に駆ける)',
      artist: 'YOASOBI',
      genre: 'J-POP, J-ROCK & ANIME',
      album: 'THE BOOK (2021)',
      durationSec: 261,
      playCount: 124,
      affinity: 0.98,
      origin: 'Tokio, Japón · 2019',
      bio: 'Dúo vocal y de producción musical basado en narrativas literarias y melodías vertiginosas.',
    },
  ],
};

/**
 * Parses and validates a user-supplied JSON string or `RawLibraryPayload`
 * and builds a complete 3D `MusicGalaxyData` universe.
 */
export function buildMusicGalaxyFromPayload(
  payload: RawLibraryPayload
): MusicGalaxyData {
  if (!payload || !Array.isArray(payload.tracks) || payload.tracks.length === 0) {
    throw new Error(
      'El archivo JSON debe incluir un arreglo "tracks" con al menos una canción.'
    );
  }

  const genreBuckets = new Map<
    string,
    {
      name: string;
      artists: Map<
        string,
        {
          name: string;
          origin: string;
          bio: string;
          tracks: RawLibraryTrackInput[];
        }
      >;
    }
  >();

  const dynamic = classifyPayload(payload.tracks);

  for (const rawTrack of payload.tracks) {
    if (!rawTrack.title || !rawTrack.artist) continue;

    // dynamic classification: the whole library decides the nebulae (A3)
    const genreName = dynamic.artistGenre.get(rawTrack.artist.trim()) ?? UNCLASSIFIED_GENRE;

    if (!genreBuckets.has(genreName)) {
      genreBuckets.set(genreName, {
        name: genreName,
        artists: new Map(),
      });
    }

    const gBucket = genreBuckets.get(genreName)!;
    const artistName = rawTrack.artist.trim();

    if (!gBucket.artists.has(artistName)) {
      gBucket.artists.set(artistName, {
        name: artistName,
        origin: rawTrack.origin || 'Archivo Estelar · 2026',
        bio:
          rawTrack.bio ||
          `Artista importado desde ${
            payload.profileName || 'biblioteca de usuario'
          } en la constelación ${genreName}.`,
        tracks: [],
      });
    }

    gBucket.artists.get(artistName)!.tracks.push(rawTrack);
  }

  const genres: GenreNode[] = [];
  const artists: ArtistNode[] = [];
  const songs: SongNode[] = [];
  const links: MusicLink[] = [];

  const artistByNameMap = new Map<string, ArtistNode>();
  const artistSecondaryGenreMap = new Map<string, string>();
  const genreByNameMap = new Map<string, GenreNode>();
  // Secondary genre names per song, resolved to ids once every genre exists
  const songSecondaryGenres: Array<{ song: SongNode; genreName: string }> = [];
  const collaborationEdges: Array<{
    primaryArtistId: string;
    songId: string;
    collaboratorName: string;
  }> = [];

  let genreIdx = 0;
  const totalGenres = genreBuckets.size;
  for (const [, gBucket] of genreBuckets) {
    const palette = getDynamicSectorPlacement(genreIdx, totalGenres, gBucket.name);
    const genreId = `genre-${slugify(gBucket.name)}-${genreIdx}`;

    let genreSongTotal = 0;
    let genreAffinitySum = 0;
    const artistCount = gBucket.artists.size;

    for (const [, aBucket] of gBucket.artists) {
      const artistId = `artist-${slugify(aBucket.name)}`;

      const trackItems = aBucket.tracks;
      const avgAffinity =
        trackItems.reduce((acc, t) => acc + (t.affinity ?? 0.88), 0) /
        trackItems.length;
      const totalArtistSongs =
        payload.source === 'spotify'
          ? trackItems.length
          : trackItems.reduce(
              (acc, t) =>
                acc + (t.playCount ? Math.min(60, Math.round(t.playCount / 2)) : 12),
              0
            );

      genreSongTotal += totalArtistSongs;
      genreAffinitySum += avgAffinity;

      const codeNum = (100 + (hashString(aBucket.name) % 899)).toString();
      const initials = aBucket.name
        .replace(/[^a-zA-Z]/g, '')
        .slice(0, 2)
        .toUpperCase()
        .padEnd(2, 'X');

      const firstTrackWithImg = trackItems.find(
        (t) => t.artistImageUrl || t.imageUrl
      );
      const firstTrackWithArtistUrl = trackItems.find(
        (t) => t.artistSpotifyUrl || t.spotifyUrl
      );
      const firstBridge = trackItems.find((t) => dynamic.trackSecondaryGenre.has(t));
      if (firstBridge) {
        artistSecondaryGenreMap.set(artistId, dynamic.trackSecondaryGenre.get(firstBridge)!.toUpperCase());
      }

      const artistNode: ArtistNode = {
        id: artistId,
        name: aBucket.name,
        type: 'artist',
        genreId,
        affinity: Number(Math.min(0.99, Math.max(0.55, avgAffinity)).toFixed(2)),
        songCount: totalArtistSongs,
        catalogCode: `ST-${initials}-${codeNum}`,
        origin: aBucket.origin,
        bio: aBucket.bio,
        sleeveBg: palette.bg,
        sleeveAccent: palette.color,
        position: [0, 0, 0], // set by applyClassicLayout
        imageUrl: firstTrackWithImg?.artistImageUrl || firstTrackWithImg?.imageUrl,
        spotifyUrl:
          firstTrackWithArtistUrl?.artistSpotifyUrl ||
          firstTrackWithArtistUrl?.spotifyUrl,
        subgenre:
          trackItems.find((t) => t.subgenre)?.subgenre ||
          normalizeMusicalTag(gBucket.name)?.subgenre ||
          'General',
        tags: Array.from(
          new Set(
            trackItems.flatMap(
              (t) => t.tags || (t.subgenre ? [t.subgenre] : [])
            )
          )
        ),
      };

      artists.push(artistNode);
      artistByNameMap.set(aBucket.name.toLowerCase(), artistNode);

      links.push({
        source: genreId,
        target: artistId,
        strength: Number(avgAffinity.toFixed(2)),
        type: 'genre-artist',
      });

      trackItems.forEach((t, tIdx) => {
        const songId = `song-${slugify(aBucket.name)}-${slugify(t.title)}-${tIdx}`;
        const songAff = Number(
          Math.min(0.99, Math.max(0.6, t.affinity ?? avgAffinity)).toFixed(2)
        );

        const resolvedPreviewUrl =
          t.previewUrl ||
          `/api/track-preview?artist=${encodeURIComponent(
            aBucket.name
          )}&title=${encodeURIComponent(t.title)}`;

        const songSubgenre =
          t.subgenre ||
          normalizeMusicalTag(t.genre || '')?.subgenre ||
          artistNode.subgenre ||
          'Pista';

        const songTags =
          t.tags && t.tags.length > 0
            ? t.tags
            : [songSubgenre, t.genre || 'General'];

        const songNode: SongNode = {
          id: songId,
          title: t.title,
          album: t.album || 'Single Digital',
          type: 'song',
          artistId,
          genreId,
          affinity: songAff,
          duration: t.durationSec || 240,
          position: [0, 0, 0], // set by applyClassicLayout
          previewUrl: resolvedPreviewUrl,
          imageUrl: t.imageUrl,
          spotifyUrl: t.spotifyUrl,
          subgenre: songSubgenre,
          tags: songTags,
        };
        songs.push(songNode);
        const bridgeGenre = dynamic.trackSecondaryGenre.get(t);
        if (bridgeGenre) {
          songSecondaryGenres.push({ song: songNode, genreName: bridgeGenre.toUpperCase() });
        }

        links.push({
          source: artistId,
          target: songId,
          strength: songAff,
          type: 'artist-song',
        });

        if (t.collaborators?.length) {
          t.collaborators.forEach((collabName) => {
            collaborationEdges.push({
              primaryArtistId: artistId,
              songId,
              collaboratorName: collabName.trim().toLowerCase(),
            });
          });
        }
      });
    }

    const genreAffinity = Number(
      Math.min(0.99, genreAffinitySum / Math.max(1, artistCount)).toFixed(2)
    );

    const genreNode: GenreNode = {
      id: genreId,
      name: gBucket.name,
      type: 'genre',
      affinity: genreAffinity,
      songCount: genreSongTotal,
      color: palette.color,
      accentColor: palette.bg,
      position: [0, 0, 0], // set by applyClassicLayout
      description: `Sector constelar importado desde ${
        payload.profileName || 'biblioteca de usuario'
      } con ${artistCount} artistas en órbita.`,
    };

    genres.push(genreNode);
    genreByNameMap.set(gBucket.name.toUpperCase(), genreNode);

    genreIdx++;
  }

  for (const { song, genreName } of songSecondaryGenres) {
    const secGenreNode = genreByNameMap.get(genreName);
    if (secGenreNode && secGenreNode.id !== song.genreId) {
      song.secondaryGenreId = secGenreNode.id;
    }
  }

  const addedEdgeKeys = new Set<string>();
  const addUniqueInfluenceLink = (source: string, target: string, strength = 0.82) => {
    if (source === target) return;
    const key = source < target ? `${source}::${target}` : `${target}::${source}`;
    if (addedEdgeKeys.has(key)) return;
    addedEdgeKeys.add(key);
    links.push({
      source,
      target,
      strength,
      type: 'influence',
    });
  };

  // 1. Galactic Constellation Backbone: single clean ring connecting neighboring genre cores
  for (let i = 0; i < genres.length; i++) {
    const g1 = genres[i];
    const g2 = genres[(i + 1) % genres.length];
    addUniqueInfluenceLink(g1.id, g2.id, 0.88);
  }

  // 2. Real Song & Artist Collaborations (e.g. featured artists across genres)
  for (const edge of collaborationEdges) {
    const collabArtist = artistByNameMap.get(edge.collaboratorName);
    if (collabArtist && collabArtist.id !== edge.primaryArtistId) {
      addUniqueInfluenceLink(edge.primaryArtistId, collabArtist.id, 0.94);
    }
  }

  // 3. Cross-Genre Secondary Style Bridges: connect top-affinity artists (affinity >= 0.88) to secondary genre
  artists.forEach((artist) => {
    if (artist.affinity < 0.88) return;
    const secGenreName = artistSecondaryGenreMap.get(artist.id);
    const secGenreNode = secGenreName ? genreByNameMap.get(secGenreName) : undefined;

    if (secGenreNode && secGenreNode.id !== artist.genreId) {
      addUniqueInfluenceLink(artist.id, secGenreNode.id, 0.82);
    }
  });

  // 4. TF-IDF Stylistic Constellation Bridges (Story 3):
  // Connect artists sharing distinctive, specific subgenres while penalizing ubiquitous library tags
  const tfIdfEdges = computeTfIdfLinks(
    artists.map((a) => ({
      id: a.id,
      name: a.name,
      tags: a.tags && a.tags.length > 0 ? a.tags : (a.subgenre ? [a.subgenre] : []),
    })),
    {
      minSimilarity: 0.30,
      maxLinksPerNode: 2,
    }
  );

  for (const edge of tfIdfEdges) {
    addUniqueInfluenceLink(
      edge.source,
      edge.target,
      Number(Math.min(0.95, Math.max(0.65, edge.similarity)).toFixed(2))
    );
  }

  return applyClassicLayout({ genres, artists, songs, links });
}
