import { MusicGalaxyData, SongNode } from '../../types/music';

/**
 * Genre Relations (`genreRelations.ts`).
 *
 * Measures how strongly each pair of genres is related, for the Nebulosas v3 layout
 * (related nebulae overlap) and collisions (M5.3). Sources, by weight:
 *   1. songs whose secondaryGenreId is the other genre        → 1 each (also bridge candidates)
 *   2. cross-genre `influence` links (artist→genre, artist↔artist) → 0.5 each
 *   3. artists of both genres sharing a tag                    → 0.25 each, capped per pair
 * The genre↔genre backbone ring is ignored: it links index neighbours, not related styles.
 */

export interface GenreRelation {
  a: string; // genreId, a < b
  b: string; // genreId
  sharedSongs: number; // songs with primary genre in one and secondary in the other
  bridgeSongIds: string[]; // up to 3, by affinity desc
  strength: number; // weighted evidence from every source; drives the layout spring
}

// Songs dominate: TF-IDF/collab links alone produced the strongest collisions with no bridge songs
const INFLUENCE_WEIGHT = 0.5;
const SHARED_TAG_WEIGHT = 0.25;
const SHARED_TAG_CAP = 2;
const MAX_BRIDGE_SONGS = 3;

interface PairAccumulator {
  a: string;
  b: string;
  bridgeSongs: SongNode[];
  influence: number;
  tagEvidence: number;
}

const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

export function computeGenreRelations(data: MusicGalaxyData, minShared = 2): GenreRelation[] {
  const genreIds = new Set(data.genres.map((g) => g.id));
  const pairs = new Map<string, PairAccumulator>();
  const pairFor = (x: string, y: string): PairAccumulator | null => {
    if (x === y || !genreIds.has(x) || !genreIds.has(y)) return null;
    const key = pairKey(x, y);
    let acc = pairs.get(key);
    if (!acc) {
      const [a, b] = x < y ? [x, y] : [y, x];
      acc = { a, b, bridgeSongs: [], influence: 0, tagEvidence: 0 };
      pairs.set(key, acc);
    }
    return acc;
  };

  // 1. Songs that belong to two genres
  for (const song of data.songs) {
    if (!song.secondaryGenreId) continue;
    pairFor(song.genreId, song.secondaryGenreId)?.bridgeSongs.push(song);
  }

  // 2. Cross-genre influence links. An artist id can appear in two genres (split by the
  // classifier), so a node maps to every genre it lives in.
  const genresOfNode = new Map<string, Set<string>>();
  const addNodeGenre = (id: string, genreId: string) => {
    if (!genresOfNode.has(id)) genresOfNode.set(id, new Set());
    genresOfNode.get(id)!.add(genreId);
  };
  for (const artist of data.artists) addNodeGenre(artist.id, artist.genreId);

  for (const link of data.links) {
    if (link.type !== 'influence') continue;
    const sourceIsGenre = genreIds.has(link.source);
    const targetIsGenre = genreIds.has(link.target);
    if (sourceIsGenre && targetIsGenre) continue; // backbone ring
    const sourceGenres = sourceIsGenre ? new Set([link.source]) : genresOfNode.get(link.source);
    const targetGenres = targetIsGenre ? new Set([link.target]) : genresOfNode.get(link.target);
    if (!sourceGenres || !targetGenres) continue;
    const touched = new Set<string>();
    for (const x of sourceGenres) {
      for (const y of targetGenres) {
        const acc = pairFor(x, y);
        if (!acc || touched.has(pairKey(x, y))) continue;
        touched.add(pairKey(x, y));
        acc.influence += INFLUENCE_WEIGHT;
      }
    }
  }

  // 3. Shared tags between artists of different genres (weak signal, capped per pair)
  const artistTags = data.artists.map((artist) => ({
    genreId: artist.genreId,
    tags: new Set((artist.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)),
  }));
  for (let i = 0; i < artistTags.length; i++) {
    const A = artistTags[i];
    if (!A.tags.size) continue;
    for (let j = i + 1; j < artistTags.length; j++) {
      const B = artistTags[j];
      if (A.genreId === B.genreId || !B.tags.size) continue;
      let shares = false;
      for (const tag of A.tags) {
        if (B.tags.has(tag)) {
          shares = true;
          break;
        }
      }
      if (!shares) continue;
      const acc = pairFor(A.genreId, B.genreId);
      if (acc) acc.tagEvidence = Math.min(SHARED_TAG_CAP, acc.tagEvidence + SHARED_TAG_WEIGHT);
    }
  }

  const relations: GenreRelation[] = [];
  for (const acc of pairs.values()) {
    const sharedSongs = acc.bridgeSongs.length;
    const strength = sharedSongs + acc.influence + acc.tagEvidence;
    if (strength < minShared) continue;
    const bridgeSongIds = [...acc.bridgeSongs]
      .sort((x, y) => y.affinity - x.affinity || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
      .slice(0, MAX_BRIDGE_SONGS)
      .map((s) => s.id);
    relations.push({ a: acc.a, b: acc.b, sharedSongs, bridgeSongIds, strength });
  }

  return relations.sort(
    (x, y) => y.strength - x.strength || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b))
  );
}
