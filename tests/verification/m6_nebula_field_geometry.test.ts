import * as THREE from 'three';
import { createHash } from 'node:crypto';
import {
  buildNebulaFieldGeometry,
  FIELD_SHARE,
  NEBULA_FIELD_DENSITY,
  NEBULA_KIND,
  nebulaFieldCounts,
} from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { fbm3, vnoise3 } from '../../src/lib/math/noise';
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

const EXPECTED_ATTRIBUTES: Record<string, number> = {
  position: 3, color: 3, anchor: 3, axis: 3, size: 1, alpha: 1,
  kind: 1, gid: 1, aid: 1, spin: 1, seed: 1, aAffinity: 1,
};

const hashGeometry = (geometry: THREE.BufferGeometry) => {
  const h = createHash('sha256');
  for (const name of Object.keys(EXPECTED_ATTRIBUTES)) {
    const arr = geometry.getAttribute(name).array as Float32Array;
    h.update(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength));
  }
  return h.digest('hex');
};

console.log('================================================================');
console.log('SUITE M6.1: Nebulosas v3 gas field geometry');
console.log('================================================================');

// ---------- noise ----------
const samples = Array.from({ length: 2000 }, (_, i) => fbm3(i * 0.37, i * 0.11, i * 0.53));
assert(samples.every((v) => v >= 0 && v < 1), 'noise: fbm3 in [0, 1)');
assert(vnoise3(1.3, 2.7, -4.1) === vnoise3(1.3, 2.7, -4.1), 'noise: deterministic');
assert(Math.abs(vnoise3(2, 3, 4) - vnoise3(2.0001, 3, 4)) < 0.01, 'noise: continuous');

// ---------- counts ----------
const counts = nebulaFieldCounts([10, 30, 0], 1000);
assert(JSON.stringify(counts) === JSON.stringify([213, 638, 5]), 'counts: proportional to songCount with min 5', JSON.stringify(counts));

// ---------- presets ----------
const presets: [string, MusicGalaxyData][] = [
  ['preset50', GALAXY_PRESET_50],
  ['preset300', GALAXY_PRESET_300],
];

for (const [name, data] of presets) {
  const layout = computeNebulaLayout(data);
  const coreOf = new Map(layout.cores.map((c) => [c.genreId, c]));
  for (const N of [NEBULA_FIELD_DENSITY.full, NEBULA_FIELD_DENSITY.reduced]) {
    const label = `${name}@${N / 1000}k`;
    const t0 = performance.now();
    const { geometry, genreIds, countsByGenre } = buildNebulaFieldGeometry(layout, N);
    const ms = performance.now() - t0;
    const total = geometry.getAttribute('position').count;

    // 1. attributes and size
    const attrsOk = Object.entries(EXPECTED_ATTRIBUTES).every(
      ([attr, size]) => geometry.getAttribute(attr)?.itemSize === size && geometry.getAttribute(attr).count === total
    );
    assert(attrsOk, `${label}: every attribute present with the right item size`);
    assert(Math.abs(total - N * FIELD_SHARE) <= genreIds.length, `${label}: total ≈ ${FIELD_SHARE}·N`, `${total}`);
    assert(JSON.stringify(genreIds) === JSON.stringify(data.genres.map((g) => g.id)), `${label}: genreIds in data order`);

    // 2. per-genre counts proportional to songCount
    const totalSongs = data.genres.reduce((a, g) => a + g.songCount, 0);
    const deviations = data.genres.map((g, gid) => Math.abs(countsByGenre[gid] - (N * FIELD_SHARE * g.songCount) / totalSongs));
    assert(Math.max(...deviations) <= 1, `${label}: per-genre counts within ±1 of songCount share`, `max dev ${Math.max(...deviations).toFixed(2)}`);
    const gid = geometry.getAttribute('gid').array as Float32Array;
    const actualPerGenre = new Array(genreIds.length).fill(0);
    for (const g of gid) actualPerGenre[g]++;
    assert(JSON.stringify(actualPerGenre) === JSON.stringify(countsByGenre), `${label}: gid attribute matches counts`);

    // 3. kind proportions 42 / 52 / 6 ± 3%
    const kind = geometry.getAttribute('kind').array as Float32Array;
    const kinds = [0, 0, 0];
    for (const k of kind) kinds[k]++;
    const share = kinds.map((k) => k / total);
    assert(
      Math.abs(share[0] - 0.42) <= 0.03 && Math.abs(share[1] - 0.52) <= 0.03 && Math.abs(share[2] - 0.06) <= 0.03,
      `${label}: kind shares ≈ 42/52/6%`,
      share.map((s) => (s * 100).toFixed(1)).join('/')
    );

    // 4. finite values, affinity range and source
    const finite = Object.keys(EXPECTED_ATTRIBUTES).every((attr) =>
      (geometry.getAttribute(attr).array as Float32Array).every(Number.isFinite)
    );
    assert(finite, `${label}: all attribute values finite`);
    const aff = geometry.getAttribute('aAffinity').array as Float32Array;
    const aid = geometry.getAttribute('aid').array as Float32Array;
    const anchor = geometry.getAttribute('anchor').array as Float32Array;
    const pos = geometry.getAttribute('position').array as Float32Array;
    const artistsByGenre = data.genres.map((g) => layout.data.artists.filter((a) => a.genreId === g.id));
    let affinityMismatch = 0;
    let dustAnchorMismatch = 0;
    let gasOutside = 0;
    let nonDustWithArtist = 0;
    for (let i = 0; i < total; i++) {
      const g = layout.data.genres[gid[i]];
      if (kind[i] === NEBULA_KIND.dust) {
        const artist = artistsByGenre[gid[i]][aid[i]];
        if (!artist) {
          dustAnchorMismatch++;
          continue;
        }
        if (Math.abs(aff[i] - artist.affinity) > 1e-6) affinityMismatch++;
        const ap = artist.position;
        if (Math.abs(anchor[i * 3] - ap[0]) > 1e-4 || Math.abs(anchor[i * 3 + 1] - ap[1]) > 1e-4 || Math.abs(anchor[i * 3 + 2] - ap[2]) > 1e-4) dustAnchorMismatch++;
      } else {
        if (aid[i] !== -1) nonDustWithArtist++;
        if (Math.abs(aff[i] - g.affinity) > 1e-6) affinityMismatch++;
        const core = coreOf.get(g.id)!;
        const d = Math.hypot(pos[i * 3] - core.center[0], pos[i * 3 + 1] - core.center[1], pos[i * 3 + 2] - core.center[2]);
        if (d > core.radius * 1.6) gasOutside++;
      }
    }
    assert(aff.every((a) => a >= 0 && a <= 1), `${label}: aAffinity in [0, 1]`);
    assert(affinityMismatch === 0, `${label}: dust carries artist affinity, gas/front genre affinity`, `${affinityMismatch} mismatches`);
    assert(dustAnchorMismatch === 0, `${label}: dust anchored to an artist of its own genre`, `${dustAnchorMismatch} mismatches`);
    assert(nonDustWithArtist === 0, `${label}: gas and front have aid = -1`);
    assert(gasOutside / total < 0.005, `${label}: gas and front within 1.6·S of their core`, `${gasOutside} outside`);

    // 5. determinism and time budget
    const again = buildNebulaFieldGeometry(layout, N);
    assert(hashGeometry(geometry) === hashGeometry(again.geometry), `${label}: deterministic (same hash)`);
    assert(ms < 400, `${label}: built in < 400 ms`, `${ms.toFixed(0)} ms`);
    const bytes = Object.values(EXPECTED_ATTRIBUTES).reduce((a, s) => a + s * 4, 0) * total;
    console.log(`    ↳ ${label}: ${total} particles · ${ms.toFixed(0)} ms · ${(bytes / 1e6).toFixed(2)} MB`);
    geometry.dispose();
    again.geometry.dispose();
  }
}

// 6. a genre's particles do not change when another genre is removed (per-genre seeds)
const full = computeNebulaLayout(GALAXY_PRESET_150);
const lastGenre = GALAXY_PRESET_150.genres[GALAXY_PRESET_150.genres.length - 1].id;
const reducedData: MusicGalaxyData = {
  ...GALAXY_PRESET_150,
  genres: GALAXY_PRESET_150.genres.filter((g) => g.id !== lastGenre),
  artists: GALAXY_PRESET_150.artists.filter((a) => a.genreId !== lastGenre),
  songs: GALAXY_PRESET_150.songs.filter((s) => s.genreId !== lastGenre),
};
const reduced = computeNebulaLayout(reducedData);
// compare gas only relative to the core: the core itself moves when the relaxation loses a genre
const relativeGas = (r: ReturnType<typeof buildNebulaFieldGeometry>, layout: typeof full, genreId: string) => {
  const g = r.genreIds.indexOf(genreId);
  const core = layout.cores.find((c) => c.genreId === genreId)!;
  const gidArr = r.geometry.getAttribute('gid').array as Float32Array;
  const kindArr = r.geometry.getAttribute('kind').array as Float32Array;
  const p = r.geometry.getAttribute('position').array as Float32Array;
  const out: number[] = [];
  for (let i = 0; i < gidArr.length; i++) {
    if (gidArr[i] !== g || kindArr[i] !== NEBULA_KIND.gas) continue;
    out.push(p[i * 3] - core.center[0], p[i * 3 + 1] - core.center[1], p[i * 3 + 2] - core.center[2]);
  }
  return out;
};
const firstId = GALAXY_PRESET_150.genres[0].id;
const fullField = buildNebulaFieldGeometry(full, NEBULA_FIELD_DENSITY.full);
const reducedField = buildNebulaFieldGeometry(reduced, NEBULA_FIELD_DENSITY.full);
const a = relativeGas(fullField, full, firstId);
const b = relativeGas(reducedField, reduced, firstId);
const prefix = Math.min(a.length, b.length);
assert(
  // float32 positions: compare with a tolerance, not as rounded strings
  prefix > 0 && a.slice(0, prefix).every((v, i) => Math.abs(v - b[i]) < 1e-3),
  'stability: a nebula keeps its gas shape when another genre disappears'
);

console.log('\n================================================================');
console.log('SUMMARY OF M6.1 VERIFICATION');
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
  console.log('\nALL M6.1 TESTS PASSED');
  process.exit(0);
}
