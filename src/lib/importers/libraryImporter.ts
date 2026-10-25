'use client';

import {
  ArtistNode,
  GenreNode,
  MusicGalaxyData,
  MusicLink,
  SongNode,
} from '../../types/music';

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
  album?: string;
  durationSec?: number;
  playCount?: number;
  affinity?: number;
  origin?: string;
  bio?: string;
}

export interface RawLibraryPayload {
  profileName?: string;
  source?: 'spotify' | 'lastfm' | 'custom-json';
  tracks: RawLibraryTrackInput[];
}

const SECTOR_PALETTE = [
  { color: '#00F5D4', bg: '#0E1726', center: [-14, 4, -8] as [number, number, number] },
  { color: '#FF2A85', bg: '#1F0C1D', center: [15, -3, -6] as [number, number, number] },
  { color: '#CCFF00', bg: '#141B0B', center: [-6, -9, 12] as [number, number, number] },
  { color: '#38BDF8', bg: '#0B192C', center: [10, 9, 10] as [number, number, number] },
];

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

  for (const rawTrack of payload.tracks) {
    if (!rawTrack.title || !rawTrack.artist) continue;
    const genreName = (rawTrack.genre || 'CONSTELACIÓN INDEPENDIENTE')
      .trim()
      .toUpperCase();

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

  let genreIdx = 0;
  for (const [, gBucket] of genreBuckets) {
    const palette = SECTOR_PALETTE[genreIdx % SECTOR_PALETTE.length];
    const genreId = `genre-${slugify(gBucket.name)}-${genreIdx}`;
    const [gx, gy, gz] = palette.center;

    let genreSongTotal = 0;
    let genreAffinitySum = 0;
    let artistIdx = 0;
    const artistCount = gBucket.artists.size;

    for (const [, aBucket] of gBucket.artists) {
      const artistId = `artist-${slugify(aBucket.name)}`;
      const angle = (artistIdx / Math.max(1, artistCount)) * Math.PI * 2 + genreIdx * 0.6;
      const radius = 3.2 + (artistIdx % 2) * 1.4;
      const ax = Number((gx + Math.cos(angle) * radius).toFixed(2));
      const ay = Number((gy + Math.sin(angle * 1.3) * 2.1).toFixed(2));
      const az = Number((gz + Math.sin(angle) * radius).toFixed(2));

      const trackItems = aBucket.tracks;
      const avgAffinity =
        trackItems.reduce((acc, t) => acc + (t.affinity ?? 0.88), 0) /
        trackItems.length;
      const totalArtistSongs = trackItems.reduce(
        (acc, t) => acc + (t.playCount ? Math.min(60, Math.round(t.playCount / 2)) : 12),
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

      artists.push({
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
        position: [ax, ay, az],
      });

      links.push({
        source: genreId,
        target: artistId,
        strength: Number(avgAffinity.toFixed(2)),
        type: 'genre-artist',
      });

      trackItems.forEach((t, tIdx) => {
        const songId = `song-${slugify(aBucket.name)}-${slugify(t.title)}-${tIdx}`;
        const sAngle = (tIdx / Math.max(1, trackItems.length)) * Math.PI * 2;
        const sx = Number((ax + Math.cos(sAngle) * 1.55).toFixed(2));
        const sy = Number((ay + (tIdx % 2 === 0 ? 0.95 : -0.85)).toFixed(2));
        const sz = Number((az + Math.sin(sAngle) * 1.55).toFixed(2));
        const songAff = Number(
          Math.min(0.99, Math.max(0.6, t.affinity ?? avgAffinity)).toFixed(2)
        );

        songs.push({
          id: songId,
          title: t.title,
          album: t.album || 'Single Digital',
          type: 'song',
          artistId,
          genreId,
          affinity: songAff,
          duration: t.durationSec || 240,
          position: [sx, sy, sz],
        });

        links.push({
          source: artistId,
          target: songId,
          strength: songAff,
          type: 'artist-song',
        });
      });

      artistIdx++;
    }

    const genreAffinity = Number(
      Math.min(0.99, genreAffinitySum / Math.max(1, artistCount)).toFixed(2)
    );

    genres.push({
      id: genreId,
      name: gBucket.name,
      type: 'genre',
      affinity: genreAffinity,
      songCount: genreSongTotal,
      color: palette.color,
      accentColor: '#CCFF00',
      position: [gx, gy, gz],
      description: `Sector constelar importado desde ${
        payload.profileName || 'biblioteca de usuario'
      } con ${artistCount} artistas en órbita.`,
    });

    genreIdx++;
  }

  // Create cross-genre bridges between the top artists of adjacent sectors
  for (let i = 0; i < artists.length - 1; i++) {
    const a1 = artists[i];
    const a2 = artists[(i + 2) % artists.length];
    if (a1.genreId !== a2.genreId) {
      links.push({
        source: a1.id,
        target: a2.id,
        strength: 0.78,
        type: 'influence',
      });
    }
  }

  return { genres, artists, songs, links };
}
