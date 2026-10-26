'use client';

import {
  ArtistNode,
  GenreNode,
  MusicGalaxyData,
  MusicLink,
  SongNode,
} from '../../types/music';
import { classifyUniversalMusic } from '../music/genreClassifier';
import { computeTfIdfLinks, normalizeMusicalTag } from '../music/taxonomy';

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
  // Cohesive, dynamic clustering:
  // Dynamically spaces genres around the galaxy disc so they never collide and don't drift into distant voids
  const count = Math.max(1, totalCount);
  const baseRadius =
    count <= 4
      ? 18.0
      : count <= 8
      ? 22.5
      : count <= 14
      ? 27.0
      : Math.min(34.0, 25.0 + Math.sqrt(count) * 1.8);

  // Harmonious angular distribution around the galactic disk
  const angle = (index * (Math.PI * 2)) / count + (index % 2 === 0 ? 0.12 : -0.12);
  // Natural radial variance gives organic wispiness without clumping
  const r = baseRadius * (0.92 + (index % 3) * 0.08);
  // Gentle vertical elevation preserves the unified galactic disc
  const elevation = Math.sin(index * 1.9) * (count <= 8 ? 2.5 : 3.6);

  const cx = Number((Math.cos(angle) * r).toFixed(2));
  const cy = Number(elevation.toFixed(2));
  const cz = Number((Math.sin(angle) * r * 0.88).toFixed(2));

  const paletteColor = SECTOR_PALETTE[index % SECTOR_PALETTE.length].color;
  const paletteBg = SECTOR_PALETTE[index % SECTOR_PALETTE.length].bg;

  return { color: paletteColor, bg: paletteBg, center: [cx, cy, cz] };
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

  for (const rawTrack of payload.tracks) {
    if (!rawTrack.title || !rawTrack.artist) continue;

    // Use instant 0ms universal music classification for accurate genre clustering
    const classification = classifyUniversalMusic(
      rawTrack.artist,
      rawTrack.genre,
      rawTrack.title
    );
    const genreName = (
      rawTrack.genre && rawTrack.genre !== 'CONSTELACIÓN INDEPENDIENTE'
        ? rawTrack.genre
        : classification.genre
    ).trim().toUpperCase();

    if (!rawTrack.secondaryGenre) {
      rawTrack.secondaryGenre = classification.secondaryGenre;
    }

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
  const totalGenres = genreBuckets.size;
  for (const [, gBucket] of genreBuckets) {
    const palette = getDynamicSectorPlacement(genreIdx, totalGenres, gBucket.name);
    const genreId = `genre-${slugify(gBucket.name)}-${genreIdx}`;
    const [gx, gy, gz] = palette.center;

    let genreSongTotal = 0;
    let genreAffinitySum = 0;
    let artistIdx = 0;
    const artistCount = gBucket.artists.size;

    for (const [, aBucket] of gBucket.artists) {
      const artistId = `artist-${slugify(aBucket.name)}`;
      // Harmonious phyllotactic / spiral dispersion around the genre core star
      // Distributes artist stars cleanly with generous orbital envelopes for their song planetary systems
      const artistDist = 4.8 + Math.sqrt(artistIdx + 0.8) * 2.2 + (artistIdx % 2 === 0 ? 0.4 : -0.4);
      const angle = (artistIdx * (Math.PI * 2)) / Math.max(1, artistCount) + (genreIdx * 0.55);
      const ax = Number((gx + Math.cos(angle) * artistDist).toFixed(2));
      const ay = Number(
        (gy + Math.sin(artistIdx * 2.1) * 1.2 + (artistIdx % 2 === 0 ? 0.4 : -0.4)).toFixed(2)
      );
      const az = Number((gz + Math.sin(angle) * artistDist).toFixed(2));

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
        // Planetary orbital disk around parent artist star with clear separation from artist core
        // Golden angle ensures no two songs align along the same radial ray
        const goldenSongAngle = tIdx * 2.3999632 + (artistIdx * 0.6);
        // Minimum orbital radius starts at 2.1 to be well outside the artist star's corona (~1.4)
        const sRadius = 2.1 + Math.sqrt(tIdx + 1) * 0.85;
        const sx = Number((ax + Math.cos(goldenSongAngle) * sRadius).toFixed(2));
        const sy = Number(
          (ay + Math.sin(tIdx * 1.8 + artistIdx) * 0.45 + (tIdx % 2 === 0 ? 0.25 : -0.25)).toFixed(2)
        );
        const sz = Number((az + Math.sin(goldenSongAngle) * sRadius).toFixed(2));
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
          subgenre: songSubgenre,
          tags: songTags,
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
      accentColor: palette.bg,
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

  return { genres, artists, songs, links };
}
