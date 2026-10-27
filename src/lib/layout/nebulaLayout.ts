import { ArtistNode, GenreNode, MusicGalaxyData, SongNode } from '../../types/music';
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
const RELAX_ITERATIONS = 320;
const SPRING_K = 0.08;
const REPULSION_K = 0.5;
const UNRELATED_GAP = 1.3; // unrelated nebulae are pushed to (Sa+Sb)·1.3
const OVERLAP_MIN = 0.95; // related target distance (Sa+Sb)·(0.95 − 0.35·n/nMax)
const OVERLAP_RANGE = 0.35;

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
    });
  }

  return { data: { ...data, genres, artists, songs }, cores: frames, relations };
}

/** Store shortcut: the Nebulosas v3 positions for `data`. */
export function applyNebulaLayout(data: MusicGalaxyData): MusicGalaxyData {
  return computeNebulaLayout(data).data;
}
