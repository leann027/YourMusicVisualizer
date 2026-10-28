import { createRng, Rng } from '../../../src/lib/math/prng';
import { RawTag } from '../../../src/lib/music/tagModel';

/**
 * Synthetic music libraries for the dynamic genre classifier (A2), shaped like Spotify + Last.fm
 * data: core style tags, generic tags shared across styles ("rock", "latin"), Last.fm noise, a
 * little cross-style bleed, and a few bridge songs that genuinely belong to two styles.
 * Every artist carries its ground-truth style so tests can measure cluster purity.
 */

export interface SyntheticSong {
  id: string;
  tags: RawTag[];
  bridgeStyle?: string; // expected secondary style
}

export interface SyntheticArtist {
  id: string;
  style: string;
  spotifyGenres: string[];
  artistTags: RawTag[];
  songs: SyntheticSong[];
}

interface StyleSpec {
  core: string[];
  generic: string[];
}

export const STYLES: Record<string, StyleSpec> = {
  rock_ar: { core: ['rock nacional', 'rock argentino', 'argentine rock'], generic: ['rock', 'latin rock'] },
  cumbia: { core: ['cumbia', 'cumbia argentina', 'tropical'], generic: ['latin', 'cumbia villera'] },
  shoegaze: { core: ['shoegaze', 'dream pop', 'noise pop'], generic: ['indie', 'alternative'] },
  techno: { core: ['techno', 'minimal techno', 'tech house'], generic: ['electronic', 'house'] },
  jazz: { core: ['jazz', 'modern jazz', 'jazz fusion'], generic: ['bebop', 'instrumental'] },
  jpop: { core: ['j-pop', 'anime', 'j-rock'], generic: ['japanese', 'city pop'] },
  trap: { core: ['trap latino', 'reggaeton', 'urbano latino'], generic: ['latin', 'trap', 'hip hop'] },
  hardrock: { core: ['hard rock', 'heavy metal', 'classic rock'], generic: ['rock', 'metal'] },
};

export const ELECTRONIC_SUBSTYLES: Record<string, StyleSpec> = {
  techno: { core: ['techno', 'minimal techno'], generic: ['electronic', 'dance'] },
  house: { core: ['house', 'deep house'], generic: ['electronic', 'dance'] },
  techhouse: { core: ['tech house', 'house'], generic: ['electronic', 'techno'] },
  progressive: { core: ['progressive house', 'house'], generic: ['electronic', 'dance'] },
};

const NOISE = ['seen live', 'favorites', 'female vocalists', 'awesome'];

/** Pairs of styles with bridge songs: [style of the artist, other style]. */
const BRIDGES: [string, string][] = [
  ['cumbia', 'rock_ar'],
  ['shoegaze', 'jpop'],
  ['techno', 'jazz'],
];

function pick<T>(rng: Rng, list: T[]): T {
  return list[Math.floor(rng() * list.length)];
}

function makeArtist(rng: Rng, style: string, spec: StyleSpec, styles: Record<string, StyleSpec>, index: number): SyntheticArtist {
  const id = `${style}-${index}`;
  const core = [...spec.core].sort(() => rng() - 0.5);
  const spotifyGenres = rng() < 0.6 ? core.slice(0, 1 + Math.floor(rng() * 2)) : [];
  const artistTags: RawTag[] = [
    { name: core[0], weight: 100 },
    { name: core[1], weight: 40 + Math.floor(rng() * 50) },
    { name: pick(rng, spec.generic), weight: 20 + Math.floor(rng() * 50) },
  ];
  if (rng() < 0.5) artistTags.push({ name: pick(rng, NOISE), weight: 30 + Math.floor(rng() * 60) });
  if (rng() < 0.15) {
    // light bleed from another style (a single weak tag)
    const other = pick(rng, Object.keys(styles).filter((s) => s !== style));
    artistTags.push({ name: pick(rng, styles[other].core), weight: 5 + Math.floor(rng() * 10) });
  }
  const songCount = 2 + Math.floor(rng() * 6);
  const songs: SyntheticSong[] = Array.from({ length: songCount }, (_, s) => ({
    id: `${id}-song-${s}`,
    tags: [
      { name: pick(rng, spec.core), weight: 100 },
      ...(rng() < 0.6 ? [{ name: pick(rng, spec.generic), weight: 30 + Math.floor(rng() * 40) }] : []),
      ...(rng() < 0.3 ? [{ name: pick(rng, NOISE), weight: 50 }] : []),
    ],
  }));
  return { id, style, spotifyGenres, artistTags, songs };
}

/** 8 styles × 8–15 artists, with bridge songs between some styles. */
export function variedLibrary(seed = 7): SyntheticArtist[] {
  const rng = createRng(seed);
  const artists: SyntheticArtist[] = [];
  for (const [style, spec] of Object.entries(STYLES)) {
    const n = 8 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) artists.push(makeArtist(rng, style, spec, STYLES, i));
  }
  // bridge songs: 3 per pair, owned by an artist of the first style, tagged with both styles
  for (const [style, other] of BRIDGES) {
    const owner = artists.find((a) => a.style === style)!;
    for (let b = 0; b < 3; b++) {
      owner.songs.push({
        id: `${owner.id}-bridge-${other}-${b}`,
        tags: [
          { name: STYLES[style].core[0], weight: 100 },
          { name: STYLES[other].core[b % STYLES[other].core.length], weight: 100 },
        ],
        bridgeStyle: other,
      });
    }
  }
  return artists;
}

/** One broad style (electronic) split in close sub-styles. */
export function homogeneousLibrary(seed = 11): SyntheticArtist[] {
  const rng = createRng(seed);
  const artists: SyntheticArtist[] = [];
  for (const [style, spec] of Object.entries(ELECTRONIC_SUBSTYLES)) {
    for (let i = 0; i < 10; i++) artists.push(makeArtist(rng, style, spec, ELECTRONIC_SUBSTYLES, i));
  }
  return artists;
}

/** ~800 artists / ~3000+ songs for the time budget. */
export function largeLibrary(seed = 13): SyntheticArtist[] {
  const rng = createRng(seed);
  const artists: SyntheticArtist[] = [];
  const styles = Object.entries(STYLES);
  for (let i = 0; i < 800; i++) {
    const [style, spec] = styles[i % styles.length];
    artists.push(makeArtist(rng, style, spec, STYLES, i));
  }
  return artists;
}

/** Artists with no data at all (no Spotify genres, no Last.fm tags). */
export function unknownArtists(): SyntheticArtist[] {
  return [0, 1].map((i) => ({
    id: `unknown-${i}`,
    style: 'unknown',
    spotifyGenres: [],
    artistTags: [],
    songs: [{ id: `unknown-${i}-song-0`, tags: [] }],
  }));
}
