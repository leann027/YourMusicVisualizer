import { computeGenreRelations, GenreRelation } from '../../src/lib/layout/genreRelations';
import {
  BLACK_HOLE_CLEARANCE,
  clearanceAt,
  computeNebulaCores,
  MAX_VOID_SHIFT,
  nebulaRadius,
  WORLD_SCALE,
} from '../../src/lib/layout/nebulaLayout';
import { createRng, gauss, goldenFibonacci, randDir } from '../../src/lib/math/prng';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../src/types/music';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details = '') {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ name, passed: false, details });
    console.error(`  [FAIL] ${name}: ${details}`);
  }
}

// Spearman rank correlation (average ranks for ties)
function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
      for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const rx = rank(xs);
  const ry = rank(ys);
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  return num / Math.sqrt(dx * dy);
}

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

console.log('================================================================');
console.log('SUITE M5.4a: PRNG helpers and nebula cores');
console.log('================================================================');

// ---------- PRNG ----------
const r1 = createRng(11);
const r2 = createRng(11);
const seqA = Array.from({ length: 50 }, () => r1());
const seqB = Array.from({ length: 50 }, () => r2());
assert(JSON.stringify(seqA) === JSON.stringify(seqB), 'prng: same seed → same sequence');
assert(seqA.every((x) => x >= 0 && x < 1), 'prng: values in [0, 1)');
assert(JSON.stringify(Array.from({ length: 5 }, createRng(12))) !== JSON.stringify(seqA.slice(0, 5)), 'prng: different seed → different sequence');
const g = createRng(3);
const samples = Array.from({ length: 4000 }, () => gauss(g));
const gMean = samples.reduce((a, b) => a + b, 0) / samples.length;
const gVar = samples.reduce((a, b) => a + (b - gMean) ** 2, 0) / samples.length;
assert(Math.abs(gMean) < 0.08 && Math.abs(gVar - 1) < 0.1, 'prng: gauss ~ N(0,1)', `mean ${gMean.toFixed(3)} var ${gVar.toFixed(3)}`);
const dRng = createRng(5);
assert(Array.from({ length: 200 }, () => randDir(dRng)).every((v) => Math.abs(Math.hypot(...v) - 1) < 1e-9), 'prng: randDir returns unit vectors');
assert(Array.from({ length: 12 }, (_, i) => goldenFibonacci(i, 12)).every((v) => Math.abs(Math.hypot(...v) - 1) < 1e-9), 'prng: goldenFibonacci on unit sphere');

// ---------- radius ----------
assert(Math.abs(nebulaRadius(42, 42) - 64 * WORLD_SCALE) < 1e-9, 'radius: largest genre S = 64·WORLD_SCALE');
assert(Math.abs(nebulaRadius(0, 42) - 34 * WORLD_SCALE) < 1e-9, 'radius: empty genre S = 34·WORLD_SCALE');
assert(nebulaRadius(10, 40) < nebulaRadius(30, 40), 'radius: grows with song count');

// ---------- edge cases ----------
const one: MusicGalaxyData = { ...GALAXY_PRESET_50, genres: GALAXY_PRESET_50.genres.slice(0, 1) };
assert(JSON.stringify(computeNebulaCores(one, [])[0].center) === '[0,0,0]', 'edge: single genre sits at origin');
assert(computeNebulaCores({ ...GALAXY_PRESET_50, genres: [] }, []).length === 0, 'edge: no genres → no cores');

// ---------- presets ----------
const presets: [string, MusicGalaxyData][] = [
  ['preset50', GALAXY_PRESET_50],
  ['preset150', GALAXY_PRESET_150],
  ['preset300', GALAXY_PRESET_300],
];

for (const [name, data] of presets) {
  const relations: GenreRelation[] = computeGenreRelations(data);
  const cores = computeNebulaCores(data, relations);
  const again = computeNebulaCores(data, relations);
  assert(JSON.stringify(cores) === JSON.stringify(again), `${name}: deterministic`);
  assert(cores.length === data.genres.length, `${name}: one core per genre`);
  assert(cores.every((c) => c.center.every(Number.isFinite) && Number.isFinite(c.radius)), `${name}: all finite`);
  assert(cores.every((c) => c.radius >= 4.7 && c.radius <= 9.0), `${name}: S within 4.7–9.0 u`);

  const strengthOf = new Map(relations.map((r) => [[r.a, r.b].sort().join('|'), r.strength]));
  let minUnrelated = Infinity;
  const related: { strength: number; ratio: number }[] = [];
  for (let i = 0; i < cores.length; i++) {
    for (let j = i + 1; j < cores.length; j++) {
      const ratio = dist(cores[i].center, cores[j].center) / (cores[i].radius + cores[j].radius);
      const strength = strengthOf.get([cores[i].genreId, cores[j].genreId].sort().join('|'));
      if (strength === undefined) minUnrelated = Math.min(minUnrelated, ratio);
      else related.push({ strength, ratio });
    }
  }
  assert(minUnrelated >= 1.2, `${name}: unrelated pairs ≥ (Sa+Sb)·1.2`, `min ratio ${minUnrelated.toFixed(3)}`);
  assert(related.every((r) => r.ratio < 1), `${name}: related pairs overlap (d < Sa+Sb)`, `max ratio ${Math.max(...related.map((r) => r.ratio)).toFixed(3)}`);
  const rho = spearman(related.map((r) => r.strength), related.map((r) => r.ratio));
  assert(rho < -0.5, `${name}: stronger relation → more overlap (Spearman < -0.5)`, `rho ${rho.toFixed(3)}`);

  // M8.1: the cosmos is shifted (rigidly) so the black hole at the origin sits in a void
  const mean = [0, 1, 2].map((k) => cores.reduce((a, c) => a + c.center[k], 0) / cores.length);
  assert(Math.hypot(mean[0], mean[1], mean[2]) <= MAX_VOID_SHIFT + 1e-9, `${name}: centroid within ${MAX_VOID_SHIFT} u of the black hole`, JSON.stringify(mean));
  const clearance = clearanceAt(cores, [0, 0, 0]);
  assert(clearance >= BLACK_HOLE_CLEARANCE, `${name}: ≥ ${BLACK_HOLE_CLEARANCE} u free around the black hole`, clearance.toFixed(2));
  const extent = Math.max(...cores.map((c) => Math.hypot(...c.center) + c.radius));
  assert(extent < 45, `${name}: fits the galaxy view (extent < 45 u)`, `extent ${extent.toFixed(1)}`);
  console.log(
    `    ↳ ${name}: minUnrelated ${minUnrelated.toFixed(2)} · rho ${rho.toFixed(2)} · extent ${extent.toFixed(1)} u · black hole clearance ${clearance.toFixed(2)} u`
  );
}

console.log('\n================================================================');
console.log('SUMMARY OF M5.4a VERIFICATION');
console.log('================================================================');
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`Total assertions: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.error('\nFAILED ASSERTIONS:');
  results.filter((r) => !r.passed).forEach((r) => console.error(`  - ${r.name}: ${r.details}`));
  process.exit(1);
} else {
  console.log('\nALL M5.4a TESTS PASSED');
  process.exit(0);
}
