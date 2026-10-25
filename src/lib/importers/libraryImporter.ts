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
  secondaryGenre?: string;
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
  { color: '#00F5D4', bg: '#0E1726', center: [-24, 7, -18] as [number, number, number] },
  { color: '#FF2A85', bg: '#1F0C1D', center: [24, -6, -16] as [number, number, number] },
  { color: '#CCFF00', bg: '#141B0B', center: [-14, -14, 22] as [number, number, number] },
  { color: '#38BDF8', bg: '#0B192C', center: [20, 15, 18] as [number, number, number] },
  { color: '#00F5D4', bg: '#0E1726', center: [0, 20, -28] as [number, number, number] },
  { color: '#FF2A85', bg: '#1F0C1D', center: [-30, -8, 10] as [number, number, number] },
  { color: '#CCFF00', bg: '#141B0B', center: [30, 8, 8] as [number, number, number] },
  { color: '#38BDF8', bg: '#0B192C', center: [0, -18, -24] as [number, number, number] },
  { color: '#00F5D4', bg: '#0E1726', center: [-18, 18, 14] as [number, number, number] },
  { color: '#FF2A85', bg: '#1F0C1D', center: [16, -18, 16] as [number, number, number] },
  { color: '#CCFF00', bg: '#141B0B', center: [-32, 5, -22] as [number, number, number] },
  { color: '#38BDF8', bg: '#0B192C', center: [32, -4, -22] as [number, number, number] },
  { color: '#00F5D4', bg: '#0E1726', center: [-10, 4, 30] as [number, number, number] },
  { color: '#FF2A85', bg: '#1F0C1D', center: [12, -3, -32] as [number, number, number] },
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

  const artistByNameMap = new Map<string, ArtistNode>();
  const artistSecondaryGenreMap = new Map<string, string>();
  const genreByNameMap = new Map<string, GenreNode>();
  const collaborationEdges: Array<{
    primaryArtistId: string;
    songId: string;
    collaboratorName: string;
  }> = [];

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
      const ringIndex = Math.floor(artistIdx / 6);
      const itemsInRing = Math.min(6, Math.max(1, artistCount - ringIndex * 6));
      const posInRing = artistIdx % 6;
      const angle =
        (posInRing / itemsInRing) * Math.PI * 2 +
        genreIdx * 0.75 +
        ringIndex * 0.52;
      const radius = 7.5 + ringIndex * 4.2 + (artistIdx % 2) * 1.4;
      const ax = Number((gx + Math.cos(angle) * radius).toFixed(2));
      const ay = Number(
        (gy + Math.sin(angle * 1.5 + ringIndex) * (3.4 + ringIndex * 1.1)).toFixed(2)
      );
      const az = Number((gz + Math.sin(angle) * radius).toFixed(2));

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
      const firstTrackWithSecGenre = trackItems.find((t) => t.secondaryGenre);
      if (firstTrackWithSecGenre?.secondaryGenre) {
        artistSecondaryGenreMap.set(
          artistId,
          firstTrackWithSecGenre.secondaryGenre.toUpperCase()
        );
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
        position: [ax, ay, az],
        imageUrl: firstTrackWithImg?.artistImageUrl || firstTrackWithImg?.imageUrl,
        spotifyUrl:
          firstTrackWithArtistUrl?.artistSpotifyUrl ||
          firstTrackWithArtistUrl?.spotifyUrl,
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
        const sAngle = (tIdx / Math.max(1, trackItems.length)) * Math.PI * 2;
        const sRadius = 1.85 + Math.floor(tIdx / 5) * 0.75;
        const sx = Number((ax + Math.cos(sAngle) * sRadius).toFixed(2));
        const sy = Number(
          (ay + (tIdx % 2 === 0 ? 0.95 : -0.85) + Math.sin(sAngle) * 0.35).toFixed(2)
        );
        const sz = Number((az + Math.sin(sAngle) * sRadius).toFixed(2));
        const songAff = Number(
          Math.min(0.99, Math.max(0.6, t.affinity ?? avgAffinity)).toFixed(2)
        );

        const resolvedPreviewUrl =
          t.previewUrl ||
          `/api/track-preview?artist=${encodeURIComponent(
            aBucket.name
          )}&title=${encodeURIComponent(t.title)}`;

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
          previewUrl: resolvedPreviewUrl,
          imageUrl: t.imageUrl,
          spotifyUrl: t.spotifyUrl,
        });

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

      artistIdx++;
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
      accentColor: '#CCFF00',
      position: [gx, gy, gz],
      description: `Sector constelar importado desde ${
        payload.profileName || 'biblioteca de usuario'
      } con ${artistCount} artistas en órbita.`,
    };

    genres.push(genreNode);
    genreByNameMap.set(gBucket.name.toUpperCase(), genreNode);

    genreIdx++;
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

  return { genres, artists, songs, links };
}
