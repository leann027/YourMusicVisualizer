import { MusicGalaxyData } from '../../types/music';
import { goldenFibonacci } from '../math/prng';
import { GenreRelation } from './genreRelations';

/**
 * Nebulosas v3 Spatial Layout (`nebulaLayout.ts`).
 *
 * Port of `layout()` from docs/reference/nebulosas-v3.html (scale ~200 u) to Novafy's
 * ~30 u world: genre nebulae start on a two-layer Fibonacci sphere and relax with springs
 * (related genres overlap in proportion to their relation strength) and repulsion
 * (unrelated genres keep apart).
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
