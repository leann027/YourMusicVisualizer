import { ArtistNode, GenreNode, MusicGalaxyData, SongNode } from '../../types/music';

/**
 * Classic Spatial Layout (`classicLayout.ts`).
 *
 * Pure post-pass extracted from `libraryImporter.ts` (Nebulosas v3 · M5.1): genres on a
 * galactic disc ring, artists in a spiral around their genre core and songs on golden-angle
 * orbits around their artist. Indices come from array order, so the importer only has to
 * emit genres, artists and songs in build order.
 */

type Vec3 = [number, number, number];

const round2 = (value: number) => Number(value.toFixed(2));

/**
 * Non-colliding genre core position on the galactic disc for genre `index` of `totalCount`.
 */
export function classicSectorCenter(index: number, totalCount: number): Vec3 {
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

  return [round2(Math.cos(angle) * r), round2(elevation), round2(Math.sin(angle) * r * 0.88)];
}

function classicArtistPosition(
  genreCenter: Vec3,
  genreIdx: number,
  artistIdx: number,
  artistCount: number
): Vec3 {
  const [gx, gy, gz] = genreCenter;
  // Phyllotactic / spiral dispersion with generous orbital envelopes for song planetary systems
  const artistDist = 4.8 + Math.sqrt(artistIdx + 0.8) * 2.2 + (artistIdx % 2 === 0 ? 0.4 : -0.4);
  const angle = (artistIdx * (Math.PI * 2)) / Math.max(1, artistCount) + genreIdx * 0.55;
  return [
    round2(gx + Math.cos(angle) * artistDist),
    round2(gy + Math.sin(artistIdx * 2.1) * 1.2 + (artistIdx % 2 === 0 ? 0.4 : -0.4)),
    round2(gz + Math.sin(angle) * artistDist),
  ];
}

function classicSongPosition(artistPos: Vec3, artistIdx: number, songIdx: number): Vec3 {
  const [ax, ay, az] = artistPos;
  // Golden angle ensures no two songs align along the same radial ray
  const goldenSongAngle = songIdx * 2.3999632 + artistIdx * 0.6;
  // Minimum orbital radius starts at 2.1 to be well outside the artist star's corona (~1.4)
  const sRadius = 2.1 + Math.sqrt(songIdx + 1) * 0.85;
  return [
    round2(ax + Math.cos(goldenSongAngle) * sRadius),
    round2(ay + Math.sin(songIdx * 1.8 + artistIdx) * 0.45 + (songIdx % 2 === 0 ? 0.25 : -0.25)),
    round2(az + Math.sin(goldenSongAngle) * sRadius),
  ];
}

// Artists can share an id across genres (same artist split by the classifier), so key by both.
const artistKey = (genreId: string, artistId: string) => `${genreId}::${artistId}`;

/**
 * Returns a copy of `data` with classic layout positions for every genre, artist and song.
 * Links and every non-positional field are kept as-is; the input is not mutated.
 */
export function applyClassicLayout(data: MusicGalaxyData): MusicGalaxyData {
  const genreIndex = new Map<string, number>();
  const genres: GenreNode[] = data.genres.map((genre, idx) => {
    genreIndex.set(genre.id, idx);
    return { ...genre, position: classicSectorCenter(idx, data.genres.length) };
  });
  const genreCenter = new Map(genres.map((g) => [g.id, g.position]));

  const artistCountByGenre = new Map<string, number>();
  for (const artist of data.artists) {
    artistCountByGenre.set(artist.genreId, (artistCountByGenre.get(artist.genreId) ?? 0) + 1);
  }

  const nextArtistIdx = new Map<string, number>();
  const artistPlacement = new Map<string, { position: Vec3; artistIdx: number }>();
  const artists: ArtistNode[] = data.artists.map((artist) => {
    const artistIdx = nextArtistIdx.get(artist.genreId) ?? 0;
    nextArtistIdx.set(artist.genreId, artistIdx + 1);
    const position = classicArtistPosition(
      genreCenter.get(artist.genreId) ?? [0, 0, 0],
      genreIndex.get(artist.genreId) ?? 0,
      artistIdx,
      artistCountByGenre.get(artist.genreId) ?? 1
    );
    artistPlacement.set(artistKey(artist.genreId, artist.id), { position, artistIdx });
    return { ...artist, position };
  });

  const nextSongIdx = new Map<string, number>();
  const songs: SongNode[] = data.songs.map((song) => {
    const key = artistKey(song.genreId, song.artistId);
    const songIdx = nextSongIdx.get(key) ?? 0;
    nextSongIdx.set(key, songIdx + 1);
    const placement = artistPlacement.get(key);
    if (!placement) return { ...song };
    return { ...song, position: classicSongPosition(placement.position, placement.artistIdx, songIdx) };
  });

  return { ...data, genres, artists, songs };
}
