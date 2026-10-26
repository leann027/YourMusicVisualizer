export type NodeType = 'genre' | 'artist' | 'song';

export type SpectralClass = 'O-SUPERGIANT' | 'B-LUMINOUS' | 'A-MAIN' | 'K-SUBDWARF';

export interface GenreNode {
  id: string;
  type: 'genre';
  name: string;
  color: string;
  accentColor: string;
  position: [number, number, number];
  songCount: number;
  affinity: number; // 0 to 1 aggregate sector affinity
  description: string;
  subgenre?: string;
  tags?: string[];
  macroGenreId?: string;
}

export interface ArtistNode {
  id: string;
  type: 'artist';
  genreId: string;
  name: string;
  songCount: number;
  affinity: number; // 0 to 1
  position: [number, number, number];
  catalogCode: string;
  origin: string;
  bio: string;
  sleeveBg: string;
  sleeveAccent: string;
  imageUrl?: string;
  spotifyUrl?: string;
  subgenre?: string;
  tags?: string[];
}

export interface SongNode {
  id: string;
  type: 'song';
  artistId: string;
  genreId: string;
  title: string;
  album: string;
  duration: number; // in seconds
  affinity: number; // 0 to 1
  position: [number, number, number];
  previewUrl?: string;
  imageUrl?: string;
  spotifyUrl?: string;
  subgenre?: string;
  tags?: string[];
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
  product?: string;
}

export type MusicNode = GenreNode | ArtistNode | SongNode;

export interface MusicLink {
  source: string;
  target: string;
  strength: number; // 0 to 1
  type: 'genre-artist' | 'artist-song' | 'influence';
}

export interface MusicGalaxyData {
  genres: GenreNode[];
  artists: ArtistNode[];
  songs: SongNode[];
  links: MusicLink[];
}

export interface StarVisualMetrics {
  coreRadius: number;
  coronaRadius: number;
  emissiveIntensity: number;
  coronaOpacity: number;
  pulseFrequency: number;
  spectralClass: SpectralClass;
}

/**
 * Calculates a star's visual radius based on song count and affinity.
 * Uses logarithmic song-count scaling combined with non-linear affinity weighting,
 * proportioned so stars remain distinct points of light without overlapping neighbors.
 */
export function calculateStarRadius(
  songCount: number,
  type: NodeType,
  affinity: number = 0.5
): number {
  const clampedAffinity = Math.max(0, Math.min(1, affinity));
  const safeSongs = Math.max(1, songCount);

  if (type === 'genre') {
    return 0.44 + Math.log(1 + safeSongs) * 0.075 + Math.pow(clampedAffinity, 1.3) * 0.16;
  }
  if (type === 'artist') {
    return 0.13 + Math.log(1 + safeSongs) * 0.048 + Math.pow(clampedAffinity, 1.5) * 0.16;
  }
  // type === 'song'
  return 0.055 + Math.pow(clampedAffinity, 1.4) * 0.065;
}

/**
 * Derives the full set of visual parameters (radius, corona spread, emissive glow,
 * and spectral class) from a node's songCount and user affinity.
 */
export function calculateStarVisualMetrics(node: MusicNode): StarVisualMetrics {
  const songCount = 'songCount' in node ? node.songCount : 1;
  const affinity = Math.max(0, Math.min(1, node.affinity));
  const coreRadius = calculateStarRadius(songCount, node.type, affinity);

  const affinityCurve = Math.pow(affinity, 1.6);

  const coronaMultiplier =
    node.type === 'genre'
      ? 1.35 + affinityCurve * 0.35
      : node.type === 'artist'
      ? 1.25 + affinityCurve * 0.35
      : 1.15 + affinityCurve * 0.25;

  const coronaRadius = coreRadius * coronaMultiplier;
  const emissiveIntensity = 0.4 + affinityCurve * 1.2;
  const coronaOpacity = 0.06 + affinityCurve * 0.14;
  const pulseFrequency = 1.0 + affinity * 1.5;

  let spectralClass: SpectralClass = 'K-SUBDWARF';
  if (affinity >= 0.92) spectralClass = 'O-SUPERGIANT';
  else if (affinity >= 0.82) spectralClass = 'B-LUMINOUS';
  else if (affinity >= 0.68) spectralClass = 'A-MAIN';

  return {
    coreRadius,
    coronaRadius,
    emissiveIntensity,
    coronaOpacity,
    pulseFrequency,
    spectralClass,
  };
}
