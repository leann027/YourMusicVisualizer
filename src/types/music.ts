export type NodeType = 'genre' | 'artist' | 'song';

export interface GenreNode {
  id: string;
  type: 'genre';
  name: string;
  color: string;
  accentColor: string;
  position: [number, number, number];
  songCount: number;
  description: string;
}

export interface ArtistNode {
  id: string;
  type: 'artist';
  genreId: string;
  name: string;
  songCount: number;
  affinity: number; // 0 to 1
  position: [number, number, number];
  portraitUrl?: string;
}

export interface SongNode {
  id: string;
  type: 'song';
  artistId: string;
  genreId: string;
  title: string;
  duration: number; // in seconds
  affinity: number;
  position: [number, number, number];
  previewUrl?: string;
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

/**
 * Calculates a star's visual radius based on song count and affinity.
 * Uses logarithmic scaling to avoid excessive size disparities.
 */
export function calculateStarRadius(songCount: number, type: NodeType, affinity: number = 0.5): number {
  if (type === 'genre') {
    return 1.4 + Math.log(1 + songCount) * 0.22;
  }
  if (type === 'artist') {
    return 0.5 + Math.log(1 + songCount) * 0.18 + affinity * 0.35;
  }
  // type === 'song'
  return 0.22 + affinity * 0.15;
}
