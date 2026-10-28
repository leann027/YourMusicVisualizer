import { smoothIdf } from './tfidf';
import type { WeightedTag } from './tagModel';

/**
 * Dynamic genre classification (A2).
 *
 * Groups a library's artists by tag similarity: TF-IDF vectors per artist, seeds by dominant tag,
 * agglomerative merging of seeds while their centroids are similar enough, one reassignment pass
 * and absorption of tiny groups. The number of nebulae therefore follows the library (a
 * homogeneous library gives few, a varied one many). Groups are named after their most
 * distinctive tags, and songs whose own tags match another group become bridges to it.
 * Artists without any tag go to UNCLASSIFIED_GENRE — never a random genre.
 */

export const UNCLASSIFIED_GENRE = 'OTRAS ÓRBITAS';

/** Seeds whose centroids are at least this similar (cosine) merge into one nebula. */
export const MERGE_THRESHOLD = 0.3;
/** Groups with fewer songs, or a single artist, join the most similar group if they share anything. */
export const MIN_GROUP_SONGS = 3;
export const MIN_GROUP_ARTISTS = 2;
const SMALL_GROUP_MIN_SIMILARITY = 0.05;
/** A single artist with its own catalogue joins another group only if it is clearly similar. */
export const SINGLE_ARTIST_MIN_SIMILARITY = 0.15;
/** Beyond this many nebulae the least distinct ones keep merging. */
export const SOFT_MAX_GENRES = 30;
/** A song becomes a bridge when its tags are at least this similar to another group (calibrated on synthetic libraries: all bridges, no false ones). */
export const BRIDGE_MIN_SIMILARITY = 0.2;
/** Second tag joins the name when it scores at least this share of the first. */
const SECOND_NAME_TAG_SHARE = 0.35;

export interface LibraryArtist {
  id: string;
  songCount: number;
  profile: WeightedTag[];
}

export interface LibrarySong {
  id: string;
  artistId: string;
  profile: WeightedTag[];
}

export interface DynamicGenre {
  name: string;
  artistIds: string[];
  topTags: string[];
}

export interface LibraryClassification {
  genres: DynamicGenre[];
  artistGenre: Map<string, string>; // artistId → genre name
  songSecondaryGenre: Map<string, string>; // songId → bridge genre name
}

type Vector = Map<string, number>;

function normalize(v: Vector): Vector {
  let sum = 0;
  for (const w of v.values()) sum += w * w;
  const len = Math.sqrt(sum);
  if (len === 0) return v;
  const out: Vector = new Map();
  for (const [k, w] of v) out.set(k, w / len);
  return out;
}

function cosine(a: Vector, b: Vector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, w] of small) {
    const o = large.get(k);
    if (o !== undefined) dot += w * o;
  }
  return dot;
}

interface Group {
  members: number[]; // artist indices
  centroid: Vector;
  songs: number;
}

export function classifyLibrary(input: { artists: LibraryArtist[]; songs: LibrarySong[] }): LibraryClassification {
  const artists = input.artists;
  const tagged = artists.map((a, i) => ({ a, i })).filter(({ a }) => a.profile.length > 0);

  // 1. IDF over tagged artists, TF-IDF vector per artist
  const df = new Map<string, number>();
  for (const { a } of tagged) for (const t of a.profile) df.set(t.tag, (df.get(t.tag) ?? 0) + 1);
  const n = Math.max(1, tagged.length);
  const idf = (tag: string) => smoothIdf(n, df.get(tag) ?? 0);
  const toVector = (profile: WeightedTag[]) => {
    const v: Vector = new Map();
    for (const t of profile) v.set(t.tag, t.weight * idf(t.tag));
    return normalize(v);
  };
  const vectors = artists.map((a) => toVector(a.profile));
  const songsOf = (i: number) => Math.max(1, artists[i].songCount);

  const centroidOf = (members: number[]): Vector => {
    const acc: Vector = new Map();
    for (const i of members) for (const [k, w] of vectors[i]) acc.set(k, (acc.get(k) ?? 0) + w * songsOf(i));
    return normalize(acc);
  };
  const makeGroup = (members: number[]): Group => ({
    members: [...members].sort((x, y) => x - y),
    centroid: centroidOf(members),
    songs: members.reduce((s, i) => s + songsOf(i), 0),
  });

  // 2. Seeds by dominant tag
  const seedMap = new Map<string, number[]>();
  for (const { a, i } of tagged) {
    const key = a.profile[0].tag;
    if (!seedMap.has(key)) seedMap.set(key, []);
    seedMap.get(key)!.push(i);
  }
  let groups: Group[] = [...seedMap.keys()].sort().map((k) => makeGroup(seedMap.get(k)!));

  // 3. Agglomerative merging (cached similarity matrix), then the soft cap
  const mergeWhile = (keepGoing: (best: number, count: number) => boolean) => {
    const sim: number[][] = groups.map((g, i) => groups.map((h, j) => (i < j ? cosine(g.centroid, h.centroid) : 0)));
    while (groups.length > 1) {
      let best = -1;
      let bi = -1;
      let bj = -1;
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          if (sim[i][j] > best) {
            best = sim[i][j];
            bi = i;
            bj = j;
          }
        }
      }
      if (!keepGoing(best, groups.length)) break;
      const merged = makeGroup([...groups[bi].members, ...groups[bj].members]);
      groups.splice(bj, 1);
      sim.splice(bj, 1);
      for (const row of sim) row.splice(bj, 1);
      groups[bi] = merged;
      for (let k = 0; k < groups.length; k++) {
        if (k === bi) continue;
        const s = cosine(merged.centroid, groups[k].centroid);
        if (k < bi) sim[k][bi] = s;
        else sim[bi][k] = s;
      }
    }
  };
  mergeWhile((best) => best >= MERGE_THRESHOLD);
  mergeWhile((_, count) => count > SOFT_MAX_GENRES);

  // 4. One reassignment pass: every artist to its most similar centroid
  if (groups.length > 1) {
    const assigned: number[][] = groups.map(() => []);
    for (const { i } of tagged) {
      let best = 0;
      let bestSim = -1;
      groups.forEach((g, gi) => {
        const s = cosine(vectors[i], g.centroid);
        if (s > bestSim) {
          bestSim = s;
          best = gi;
        }
      });
      assigned[best].push(i);
    }
    groups = assigned.filter((m) => m.length > 0).map(makeGroup);
  }

  // 5. Tiny groups (few songs or a single artist) join the most similar one if they share anything
  for (let changed = true; changed; ) {
    changed = false;
    const order = groups.map((g, i) => ({ g, i })).sort((x, y) => x.g.songs - y.g.songs || x.i - y.i);
    for (const { g, i } of order) {
      const fewSongs = g.songs < MIN_GROUP_SONGS;
      if ((!fewSongs && g.members.length >= MIN_GROUP_ARTISTS) || groups.length < 2) continue;
      let target = -1;
      let bestSim = fewSongs ? SMALL_GROUP_MIN_SIMILARITY : SINGLE_ARTIST_MIN_SIMILARITY;
      groups.forEach((h, j) => {
        // a lone artist with its own catalogue only joins an established (multi-artist) nebula
        if (j === i || (!fewSongs && h.members.length < MIN_GROUP_ARTISTS)) return;
        const s = cosine(g.centroid, h.centroid);
        if (s >= bestSim) {
          bestSim = s;
          target = j;
        }
      });
      if (target < 0) continue;
      const merged = makeGroup([...groups[target].members, ...g.members]);
      groups = groups.filter((_, k) => k !== i && k !== target).concat(merged);
      changed = true;
      break;
    }
  }

  // 6. Names from the most distinctive tags (weight × songs × IDF), unique
  const ranked = groups
    .map((g) => {
      const score = new Map<string, number>();
      for (const i of g.members) for (const t of artists[i].profile) score.set(t.tag, (score.get(t.tag) ?? 0) + t.weight * songsOf(i) * idf(t.tag));
      const topTags = [...score.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
      return { g, topTags };
    })
    .sort((x, y) => y.g.songs - x.g.songs || x.topTags[0][0].localeCompare(y.topTags[0][0]));

  const used = new Set<string>();
  const nameFor = (topTags: [string, number][]): string => {
    const [first, firstScore] = topTags[0];
    const parts = [first];
    for (const [tag, score] of topTags.slice(1)) {
      if (parts.length >= 2) break;
      // "rock nacional" + "argentine rock" or "trap latino" + "urbano latino" repeat a word: skip
      const words = new Set(parts.flatMap((p) => p.split(' ')));
      const overlaps = tag.split(' ').some((w) => words.has(w));
      if (!overlaps && score >= firstScore * SECOND_NAME_TAG_SHARE) parts.push(tag);
    }
    let name = parts.join(' & ').toUpperCase();
    // unique names: add the next distinct tag if taken
    for (const [tag] of topTags) {
      if (!used.has(name)) break;
      if (!parts.includes(tag)) name = `${name} & ${tag.toUpperCase()}`;
    }
    let suffix = 2;
    const base = name;
    while (used.has(name)) name = `${base} ${suffix++}`;
    used.add(name);
    return name;
  };

  const genres: DynamicGenre[] = [];
  const artistGenre = new Map<string, string>();
  const centroids = new Map<string, Vector>();
  for (const { g, topTags } of ranked) {
    const name = nameFor(topTags);
    genres.push({ name, artistIds: g.members.map((i) => artists[i].id), topTags: topTags.slice(0, 5).map(([t]) => t) });
    centroids.set(name, g.centroid);
    for (const i of g.members) artistGenre.set(artists[i].id, name);
  }
  const untagged = artists.filter((a) => a.profile.length === 0);
  if (untagged.length) {
    genres.push({ name: UNCLASSIFIED_GENRE, artistIds: untagged.map((a) => a.id), topTags: [] });
    for (const a of untagged) artistGenre.set(a.id, UNCLASSIFIED_GENRE);
  }

  // 7. Bridges: songs whose own tags match another group
  const songSecondaryGenre = new Map<string, string>();
  for (const song of input.songs) {
    const primary = artistGenre.get(song.artistId);
    if (!primary || primary === UNCLASSIFIED_GENRE || song.profile.length === 0) continue;
    const v = toVector(song.profile);
    let best = '';
    let bestSim = BRIDGE_MIN_SIMILARITY;
    for (const [name, centroid] of centroids) {
      if (name === primary) continue;
      const s = cosine(v, centroid);
      if (s >= bestSim) {
        bestSim = s;
        best = name;
      }
    }
    if (best) songSecondaryGenre.set(song.id, best);
  }

  return { genres, artistGenre, songSecondaryGenre };
}
