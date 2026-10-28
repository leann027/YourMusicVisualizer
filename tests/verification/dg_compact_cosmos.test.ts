import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { buildMusicGalaxyFromPayload } from '../../src/lib/importers/libraryImporter';
import { computeGenreRelations } from '../../src/lib/layout/genreRelations';
import { BLACK_HOLE_CLEARANCE, clearanceAt, computeNebulaCores, NebulaCore } from '../../src/lib/layout/nebulaLayout';
import { nebulaOverviewPose } from '../../src/components/canvas/nebulaV3/overviewCamera';
import { MusicGalaxyData } from '../../src/types/music';
import { homogeneousLibrary, SyntheticArtist, variedLibrary } from './fixtures/syntheticLibraries';

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

const WIDE = 16 / 9;
/**
 * Overview camera distance before C1 (16:9, measured on the A3 presets) and the share of it allowed
 * now. The 50-song preset was already framed by its width, so it only must not get farther.
 */
const PRE_C1_CAMERA: Record<string, { distance: number; maxShare: number }> = {
  preset50: { distance: 75, maxShare: 1 },
  preset150: { distance: 107, maxShare: 0.8 },
  preset300: { distance: 105, maxShare: 0.8 },
};

const cameraDistance = (cores: NebulaCore[]) => {
  const pose = nebulaOverviewPose(cores, WIDE);
  return Math.hypot(pose.eye[0] - pose.target[0], pose.eye[1] - pose.target[1], pose.eye[2] - pose.target[2]);
};
const height = (cores: NebulaCore[]) =>
  Math.max(...cores.map((c) => c.center[1] + c.radius)) - Math.min(...cores.map((c) => c.center[1] - c.radius));
const horizontalDiameter = (cores: NebulaCore[]) => 2 * Math.max(...cores.map((c) => Math.hypot(c.center[0], c.center[2]) + c.radius));

/** Ratio d/(Sa+Sb): largest for related pairs, smallest for unrelated pairs. */
function pairRatios(data: MusicGalaxyData, cores: NebulaCore[]) {
  const related = new Set(computeGenreRelations(data).flatMap((r) => [`${r.a}|${r.b}`, `${r.b}|${r.a}`]));
  let maxRelated = 0;
  let minUnrelated = Infinity;
  for (let i = 0; i < cores.length; i++) {
    for (let j = i + 1; j < cores.length; j++) {
      const a = cores[i];
      const b = cores[j];
      const ratio = Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1], a.center[2] - b.center[2]) / (a.radius + b.radius);
      if (related.has(`${a.genreId}|${b.genreId}`)) maxRelated = Math.max(maxRelated, ratio);
      else minUnrelated = Math.min(minUnrelated, ratio);
    }
  }
  return { maxRelated, minUnrelated };
}

const fromSynthetic = (library: SyntheticArtist[]) =>
  buildMusicGalaxyFromPayload({
    source: 'custom-json',
    tracks: library.flatMap((a) =>
      a.songs.map((s) => ({ title: s.id, artist: a.id, spotifyGenres: a.spotifyGenres, artistTags: a.artistTags, trackTags: s.tags }))
    ),
  });

console.log('================================================================');
console.log('SUITE C1: compact, wide cosmos for the nebula overview');
console.log('================================================================');

const datasets: [string, MusicGalaxyData][] = [
  ['preset50', GALAXY_PRESET_50],
  ['preset150', GALAXY_PRESET_150],
  ['preset300', GALAXY_PRESET_300],
  ['varied', fromSynthetic(variedLibrary())],
  ['homogeneous', fromSynthetic(homogeneousLibrary())],
];

for (const [name, data] of datasets) {
  const relations = computeGenreRelations(data);
  const cores = computeNebulaCores(data, relations);
  const cam = cameraDistance(cores);
  const h = height(cores);
  const w = horizontalDiameter(cores);
  console.log(`    ↳ ${name}: ${cores.length} nebulae · camera ${cam.toFixed(0)} · height ${h.toFixed(0)} · width ${w.toFixed(0)}`);

  const pre = PRE_C1_CAMERA[name];
  if (pre) {
    assert(
      cam <= pre.distance * pre.maxShare,
      `${name}: overview camera ≤ ${Math.round(pre.maxShare * 100)}% of its pre-C1 distance`,
      `${cam.toFixed(1)} vs ${pre.distance}`
    );
  }
  if (cores.length > 2) {
    assert(h < w, `${name}: the cosmos is lower than it is wide`, `height ${h.toFixed(1)} · width ${w.toFixed(1)}`);
  }

  const { maxRelated, minUnrelated } = pairRatios(data, cores);
  if (maxRelated > 0) assert(maxRelated < 1, `${name}: related nebulae still overlap (d < Sa+Sb)`, maxRelated.toFixed(3));
  if (Number.isFinite(minUnrelated)) assert(minUnrelated >= 1.2, `${name}: unrelated nebulae still ≥ (Sa+Sb)·1.2`, minUnrelated.toFixed(3));
  const clearance = clearanceAt(cores, [0, 0, 0]);
  assert(clearance >= BLACK_HOLE_CLEARANCE, `${name}: ≥ ${BLACK_HOLE_CLEARANCE} u free around the black hole`, clearance.toFixed(2));
  assert(
    JSON.stringify(computeNebulaCores(data, computeGenreRelations(data))) === JSON.stringify(cores),
    `${name}: deterministic`
  );
}

// C1b: small cosmos (one nebula, two overlapping ones) also leave the black hole in free space
const homogeneous = datasets.find(([name]) => name === 'homogeneous')![1];
const single: MusicGalaxyData = {
  ...homogeneous,
  genres: homogeneous.genres.slice(0, 1),
  artists: homogeneous.artists.filter((a) => a.genreId === homogeneous.genres[0].id),
  songs: homogeneous.songs.filter((s) => s.genreId === homogeneous.genres[0].id),
};
const singleCores = computeNebulaCores(single, []);
const singleShift = Math.hypot(...singleCores[0].center);
assert(clearanceAt(singleCores, [0, 0, 0]) >= BLACK_HOLE_CLEARANCE - 1e-9, 'single nebula: black hole outside the gas', clearanceAt(singleCores, [0, 0, 0]).toFixed(2));
assert(singleShift <= singleCores[0].radius + BLACK_HOLE_CLEARANCE + 1, 'single nebula: right beside the black hole (smallest shift)', singleShift.toFixed(2));
const t0 = performance.now();
computeNebulaCores(homogeneous, computeGenreRelations(homogeneous));
assert(performance.now() - t0 < 500, 'small cosmos: widened void search < 500 ms', `${(performance.now() - t0).toFixed(0)} ms`);

console.log('\n================================================================');
console.log('SUMMARY OF C1 VERIFICATION');
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
  console.log('\nALL C1 TESTS PASSED');
  process.exit(0);
}
