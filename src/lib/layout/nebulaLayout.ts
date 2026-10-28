import { ArtistNode, GenreNode, MusicGalaxyData, MusicLink, SongNode } from '../../types/music';
// Per-id seeds keep a nebula's orientation stable when other genres change
import { createRng, gauss, goldenFibonacci, randDir, Rng, seedFromString } from '../math/prng';
import { computeGenreRelations, GenreRelation } from './genreRelations';

/**
 * Nebulosas v3 Spatial Layout (`nebulaLayout.ts`).
 *
 * Port of `layout()` from docs/reference/nebulosas-v3.html (scale ~200 u) to Novafy's
 * ~30 u world: genre nebulae start on a two-layer Fibonacci sphere and relax with springs
 * (related genres overlap in proportion to their relation strength) and repulsion
 * (unrelated genres keep apart). Artists spread by golden angle in each nebula's own
 * tilted plane, songs orbit them on compact rings, and bridge songs move to the contact
 * disc between the two nebulae they belong to.
 */

/** Reference units → Novafy world units. */
export const WORLD_SCALE = 0.14;

const INNER_SHELL = 120 * WORLD_SCALE;
const OUTER_SHELL = 210 * WORLD_SCALE;
const SHELL_Y_SQUASH = 0.75;
const RELAX_ITERATIONS = 420;
/**
 * Compaction phase (C1): during the first iterations every nebula is pulled weakly towards the
 * centre, harder vertically. The overview must frame the cosmos at any rotation around Y, so its
 * height sets the camera distance on wide screens; a lower, compact cosmos lets the camera come
 * ~30% closer. The remaining iterations relax without the pull, so springs and repulsion restore
 * every overlap / gap rule.
 */
export const COMPACT_ITERATIONS = 200;
export const COMPACT_PULL_H = 0.01;
export const COMPACT_PULL_V = 0.05;
const SPRING_K = 0.08;
const REPULSION_K = 0.5;
const UNRELATED_GAP = 1.3; // unrelated nebulae are pushed to (Sa+Sb)·1.3
const OVERLAP_MIN = 0.95; // related target distance (Sa+Sb)·(0.95 − 0.35·n/nMax)
const OVERLAP_RANGE = 0.35;
/** The black hole and its accretion disc span ~3.2 u: keep at least this much free space around the origin (M8.1). */
export const BLACK_HOLE_CLEARANCE = 3.3;
/** Largest rigid shift allowed to bring a void onto the black hole. */
export const MAX_VOID_SHIFT = 6;
const VOID_STEP = 0.5;

type Vec3 = [number, number, number];

export interface NebulaCore {
  genreId: string;
  center: Vec3;
  radius: number; // S: nebula radius in world units
}

/** Nebula radius S from the genre's song count (sqrt keeps big genres from dominating). */
export function nebulaRadius(songCount: number, maxSongCount: number): number {
  const ratio = maxSongCount > 0 ? Math.max(0, songCount) / maxSongCount : 0;
  return (34 + 30 * Math.sqrt(Math.min(1, ratio))) * WORLD_SCALE;
}

/** Free distance from `p` to the nearest nebula surface (negative inside a nebula). */
export function clearanceAt(cores: NebulaCore[], p: Vec3): number {
  let min = Infinity;
  for (const c of cores) {
    min = Math.min(min, Math.hypot(p[0] - c.center[0], p[1] - c.center[1], p[2] - c.center[2]) - c.radius);
  }
  return min;
}

/**
 * Centre of the emptiest point within MAX_VOID_SHIFT of the origin (grid search, deterministic).
 * Translating the cosmos by its negative puts the black hole in a void without changing any
 * distance between nebulae, so every layout guarantee is preserved.
 */
export function findCentralVoid(cores: NebulaCore[]): { point: Vec3; clearance: number } {
  let best = { point: [0, 0, 0] as Vec3, clearance: clearanceAt(cores, [0, 0, 0]) };
  const steps = Math.round(MAX_VOID_SHIFT / VOID_STEP);
  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      for (let k = -steps; k <= steps; k++) {
        const p: Vec3 = [i * VOID_STEP, j * VOID_STEP, k * VOID_STEP];
        if (Math.hypot(p[0], p[1], p[2]) > MAX_VOID_SHIFT) continue;
        const clearance = clearanceAt(cores, p);
        if (clearance > best.clearance) best = { point: p, clearance };
      }
    }
  }
  return best;
}

/**
 * Places every genre nebula. Deterministic: same data + relations → same cores.
 */
export function computeNebulaCores(data: MusicGalaxyData, relations: GenreRelation[]): NebulaCore[] {
  const count = data.genres.length;
  if (count === 0) return [];
  const maxSongs = Math.max(...data.genres.map((g) => g.songCount));

  const cores: NebulaCore[] = data.genres.map((genre, i) => {
    const dir = goldenFibonacci(i, count);
    const shell = i % 2 ? OUTER_SHELL : INNER_SHELL;
    return {
      genreId: genre.id,
      center: [dir[0] * shell, dir[1] * shell * SHELL_Y_SQUASH, dir[2] * shell],
      radius: nebulaRadius(genre.songCount, maxSongs),
    };
  });
  if (count === 1) {
    cores[0].center = [0, 0, 0];
    return cores;
  }

  const index = new Map(cores.map((c, i) => [c.genreId, i]));
  const maxStrength = Math.max(1, ...relations.map((r) => r.strength));
  const relationStrength = new Map<string, number>();
  for (const r of relations) {
    const i = index.get(r.a);
    const j = index.get(r.b);
    if (i === undefined || j === undefined) continue;
    relationStrength.set(i < j ? `${i}|${j}` : `${j}|${i}`, r.strength);
  }

  for (let it = 0; it < RELAX_ITERATIONS; it++) {
    if (it < COMPACT_ITERATIONS) {
      for (const c of cores) {
        c.center[0] *= 1 - COMPACT_PULL_H;
        c.center[1] *= 1 - COMPACT_PULL_V;
        c.center[2] *= 1 - COMPACT_PULL_H;
      }
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const A = cores[i].center;
        const B = cores[j].center;
        const dx = B[0] - A[0];
        const dy = B[1] - A[1];
        const dz = B[2] - A[2];
        const d = Math.hypot(dx, dy, dz) || 1;
        const sum = cores[i].radius + cores[j].radius;
        const strength = relationStrength.get(`${i}|${j}`);

        let force = 0;
        if (strength !== undefined) {
          // spring: related nebulae touch and overlap more the stronger the relation
          force = (sum * (OVERLAP_MIN - (OVERLAP_RANGE * strength) / maxStrength) - d) * SPRING_K;
        } else if (d < sum * UNRELATED_GAP) {
          force = (sum * UNRELATED_GAP - d) * REPULSION_K;
        }
        const ux = (dx / d) * force * 0.5;
        const uy = (dy / d) * force * 0.5;
        const uz = (dz / d) * force * 0.5;
        A[0] -= ux;
        A[1] -= uy;
        A[2] -= uz;
        B[0] += ux;
        B[1] += uy;
        B[2] += uz;
      }
    }
    // keep the whole cosmos centred on the black hole
    const mean: Vec3 = [0, 0, 0];
    for (const c of cores) {
      mean[0] += c.center[0] / count;
      mean[1] += c.center[1] / count;
      mean[2] += c.center[2] / count;
    }
    for (const c of cores) {
      c.center[0] -= mean[0];
      c.center[1] -= mean[1];
      c.center[2] -= mean[2];
    }
  }

  // M8.1: move the emptiest nearby point onto the central black hole (rigid translation)
  const { point } = findCentralVoid(cores);
  for (const c of cores) {
    c.center[0] -= point[0];
    c.center[1] -= point[1];
    c.center[2] -= point[2];
  }

  return cores;
}

// ---------- nodes: artists, songs and bridge songs (M5.4b) ----------

const ARTIST_MIN_RADIUS = 2.4; // genre corona (~1.4) + artist corona (~0.6) + margin
const ARTIST_MAX_RADIUS_FACTOR = 0.75; // artists stay inside 0.75·S
const ARTIST_VERTICAL_SPREAD = 0.08; // ·S
const SONG_ORBIT_MIN = 0.9; // outside the artist corona (~0.6)
const SONG_ORBIT_STEP = 0.35; // radius = 0.9 + √(i+1)·0.35 → 0.9–2.0 u for up to 10 songs
const SONG_VERTICAL_SPREAD = 0.15;
const CONTACT_RADIUS_FACTOR = 0.75; // contact disc radius = min(Sa,Sb)·0.75
const BRIDGE_DEPTH_SPREAD = 0.4;

export interface NebulaFrame extends NebulaCore {
  normal: Vec3; // nebula plane normal (artists and songs live in the u/v plane)
  u: Vec3;
  v: Vec3;
  axes: Vec3; // ellipsoid scale for the gas field (M6); nodes are not squashed
}

export interface NebulaRelation extends GenreRelation {
  contact: Vec3; // m = cA + dir·d·Sa/(Sa+Sb)
  dir: Vec3; // unit vector from nebula a towards nebula b
  radius: number; // contact disc radius
}

export interface NebulaLayoutResult {
  data: MusicGalaxyData;
  cores: NebulaFrame[];
  relations: NebulaRelation[];
  bridgeLinks: MusicLink[]; // 'bridge' threads for placed bridge songs (M7.2); data.links is untouched
}

const round2 = (value: number) => Number(value.toFixed(2));
const roundVec = (p: Vec3): Vec3 => [round2(p[0]), round2(p[1]), round2(p[2])];

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

/** Orthonormal basis (u, v) perpendicular to n. */
function basis(n: Vec3): [Vec3, Vec3] {
  const t: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(n, t));
  return [u, cross(n, u)];
}

/** Point at local (x along u, y along normal, z along v) in a nebula frame. */
function inFrame(origin: Vec3, frame: NebulaFrame, x: number, y: number, z: number): Vec3 {
  return [
    origin[0] + frame.u[0] * x + frame.normal[0] * y + frame.v[0] * z,
    origin[1] + frame.u[1] * x + frame.normal[1] * y + frame.v[1] * z,
    origin[2] + frame.u[2] * x + frame.normal[2] * y + frame.v[2] * z,
  ];
}

function frameFor(core: NebulaCore, rng: Rng): NebulaFrame {
  const normal = randDir(rng);
  const [u, v] = basis(normal);
  const axes: Vec3 = [1, 0.6 + 0.35 * rng(), 0.55 + 0.3 * rng()];
  return { ...core, normal, u, v, axes };
}

const artistKey = (genreId: string, artistId: string) => `${genreId}::${artistId}`;

/**
 * Full Nebulosas v3 layout: cores, every node position and the contact geometry of each
 * relation. Returns a copy of `data`; ids, links and array order are preserved.
 */
export function computeNebulaLayout(data: MusicGalaxyData): NebulaLayoutResult {
  const genreRelations = computeGenreRelations(data);
  const frames = computeNebulaCores(data, genreRelations).map((core) =>
    frameFor(core, createRng(seedFromString(core.genreId)))
  );
  const frameOf = new Map(frames.map((f) => [f.genreId, f]));

  const genres: GenreNode[] = data.genres.map((genre) => ({
    ...genre,
    position: roundVec(frameOf.get(genre.id)!.center),
  }));

  // Artists: golden angle in the nebula plane, between the genre corona and 0.75·S
  const artistCount = new Map<string, number>();
  for (const a of data.artists) artistCount.set(a.genreId, (artistCount.get(a.genreId) ?? 0) + 1);
  const nextArtistIdx = new Map<string, number>();
  const artistPlacement = new Map<string, { position: Vec3; artistIdx: number }>();
  const artists: ArtistNode[] = data.artists.map((artist) => {
    const frame = frameOf.get(artist.genreId);
    if (!frame) return { ...artist };
    const t = nextArtistIdx.get(artist.genreId) ?? 0;
    nextArtistIdx.set(artist.genreId, t + 1);
    const n = artistCount.get(artist.genreId) ?? 1;
    const rng = createRng(seedFromString(artistKey(artist.genreId, artist.id)));
    const maxRadius = Math.max(ARTIST_MIN_RADIUS, frame.radius * ARTIST_MAX_RADIUS_FACTOR);
    const rr = ARTIST_MIN_RADIUS + (maxRadius - ARTIST_MIN_RADIUS) * Math.sqrt((t + 0.5) / n);
    const angle = t * 2.39996 + rng() * 0.5;
    const position = roundVec(
      inFrame(frame.center, frame, Math.cos(angle) * rr, gauss(rng) * frame.radius * ARTIST_VERTICAL_SPREAD, Math.sin(angle) * rr)
    );
    artistPlacement.set(artistKey(artist.genreId, artist.id), { position, artistIdx: t });
    return { ...artist, position };
  });

  // Songs: compact golden-angle orbits around their artist, in the same plane
  const nextSongIdx = new Map<string, number>();
  const songs: SongNode[] = data.songs.map((song) => {
    const key = artistKey(song.genreId, song.artistId);
    const placement = artistPlacement.get(key);
    const frame = frameOf.get(song.genreId);
    if (!placement || !frame) return { ...song };
    const i = nextSongIdx.get(key) ?? 0;
    nextSongIdx.set(key, i + 1);
    const radius = SONG_ORBIT_MIN + Math.sqrt(i + 1) * SONG_ORBIT_STEP;
    const angle = i * 2.3999632 + placement.artistIdx * 0.6;
    const lift = Math.sin(i * 1.8 + placement.artistIdx) * SONG_VERTICAL_SPREAD;
    return {
      ...song,
      position: roundVec(inFrame(placement.position, frame, Math.cos(angle) * radius, lift, Math.sin(angle) * radius)),
    };
  });

  // Contact geometry per relation, and bridge songs moved into the contact disc
  const songIndex = new Map(songs.map((s, idx) => [s.id, idx]));
  const relations: NebulaRelation[] = [];
  const bridgeLinks: MusicLink[] = [];
  const maxStrength = Math.max(1, ...genreRelations.map((r) => r.strength));
  for (const relation of genreRelations) {
    const A = frameOf.get(relation.a);
    const B = frameOf.get(relation.b);
    if (!A || !B) continue;
    const delta: Vec3 = [B.center[0] - A.center[0], B.center[1] - A.center[1], B.center[2] - A.center[2]];
    const d = Math.hypot(delta[0], delta[1], delta[2]) || 1;
    const dir = normalize(delta);
    const share = (d * A.radius) / (A.radius + B.radius);
    const contact: Vec3 = [A.center[0] + dir[0] * share, A.center[1] + dir[1] * share, A.center[2] + dir[2] * share];
    const radius = Math.min(A.radius, B.radius) * CONTACT_RADIUS_FACTOR;
    relations.push({ ...relation, contact, dir, radius });

    const [u, v] = basis(dir);
    const rng = createRng(seedFromString(`${relation.a}|${relation.b}`));
    relation.bridgeSongIds.forEach((songId, q) => {
      const idx = songIndex.get(songId);
      if (idx === undefined) return;
      const angle = q * 2.4 + rng();
      const rho = radius * (0.15 + 0.3 * rng());
      const depth = gauss(rng) * BRIDGE_DEPTH_SPREAD;
      const p: Vec3 = [
        contact[0] + u[0] * Math.cos(angle) * rho + v[0] * Math.sin(angle) * rho + dir[0] * depth,
        contact[1] + u[1] * Math.cos(angle) * rho + v[1] * Math.sin(angle) * rho + dir[1] * depth,
        contact[2] + u[2] * Math.cos(angle) * rho + v[2] * Math.sin(angle) * rho + dir[2] * depth,
      ];
      songs[idx] = { ...songs[idx], position: roundVec(p) };
      // threads: artist → bridge song → core of the other genre of the pair
      const song = songs[idx];
      const otherGenre = song.genreId === relation.a ? relation.b : relation.a;
      const strength = Math.min(1, relation.strength / maxStrength);
      bridgeLinks.push({ source: song.artistId, target: song.id, strength, type: 'bridge' });
      bridgeLinks.push({ source: song.id, target: otherGenre, strength, type: 'bridge' });
    });
  }

  return { data: { ...data, genres, artists, songs }, cores: frames, relations, bridgeLinks };
}

/** Store shortcut: the Nebulosas v3 positions for `data`. */
export function applyNebulaLayout(data: MusicGalaxyData): MusicGalaxyData {
  return computeNebulaLayout(data).data;
}

// One layout per source dataset, shared by the store (positions) and NebulaField (cores/frames)
const nebulaLayoutCache = new WeakMap<MusicGalaxyData, NebulaLayoutResult>();

/** Cached computeNebulaLayout: the same dataset object always returns the same result object. */
export function getNebulaLayout(data: MusicGalaxyData): NebulaLayoutResult {
  let layout = nebulaLayoutCache.get(data);
  if (!layout) {
    layout = computeNebulaLayout(data);
    nebulaLayoutCache.set(data, layout);
  }
  return layout;
}
