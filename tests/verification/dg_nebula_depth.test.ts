import * as THREE from 'three';
import {
  buildNebulaDepthGeometry,
  DEPTH_KIND,
  GAS_SPIN,
  gasSpinDir,
  NEBULA_DEPTH_ATTRIBUTES,
  NEBULA_DEPTH_COUNTS,
} from '../../src/components/canvas/nebulaV3/nebulaDepthGeometry';
import {
  createNebulaDepthUniforms,
  createNebulaFogMaterial,
  createNebulaLanesMaterial,
  NEBULA_DEPTH_VERTEX_SHADER,
  NEBULA_FOG_CACHE_KEY,
  NEBULA_LANES_CACHE_KEY,
} from '../../src/components/canvas/nebulaV3/shaders/nebulaDepthShaders';
import { buildNebulaFieldGeometry, NEBULA_KIND } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';

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

console.log('================================================================');
console.log('SUITE B2: nebula depth (fog, emission knots, dust lanes)');
console.log('================================================================');

const layout = getNebulaLayout(GALAXY_PRESET_300);
const depth = buildNebulaDepthGeometry(layout, 'full');
const field = buildNebulaFieldGeometry(layout, 20000);
const frames = layout.cores;
const genreCount = depth.genreIds.length;

const arr = (g: THREE.BufferGeometry, name: string) => g.getAttribute(name).array as Float32Array;
const countBy = (g: THREE.BufferGeometry, kind: number, gid: number) => {
  const k = arr(g, 'kind');
  const ids = arr(g, 'gid');
  let n = 0;
  for (let i = 0; i < k.length; i++) if (k[i] === kind && ids[i] === gid) n++;
  return n;
};

// ---------- 1. Structure ----------
assert(JSON.stringify(depth.genreIds) === JSON.stringify(field.genreIds), 'genre order (gid) identical to the gas field');
for (const g of [depth.glow, depth.lanes]) {
  assert(
    Object.entries(NEBULA_DEPTH_ATTRIBUTES).every(([name, size]) => g.getAttribute(name)?.itemSize === size),
    `${g === depth.glow ? 'fog' : 'lanes'}: every attribute present with its item size`
  );
}
const fogCounts = depth.genreIds.map((_, gid) => countBy(depth.glow, DEPTH_KIND.fog, gid));
assert(fogCounts.every((c) => c === NEBULA_DEPTH_COUNTS.fog), `${NEBULA_DEPTH_COUNTS.fog} fog puffs per nebula`, fogCounts.join(','));
const knotCounts = depth.genreIds.map((_, gid) => countBy(depth.glow, DEPTH_KIND.knot, gid));
const artistsPerGenre = depth.genreIds.map((id) => layout.data.artists.filter((a) => a.genreId === id).length);
assert(
  knotCounts.every((c, gid) => c === 1 + Math.min(NEBULA_DEPTH_COUNTS.maxArtistKnots, artistsPerGenre[gid])),
  'emission knots: one at the core plus up to 5 at the biggest artists',
  knotCounts.join(',')
);
const laneCounts = depth.genreIds.map((_, gid) => countBy(depth.lanes, DEPTH_KIND.lane, gid));
assert(laneCounts.every((c) => c > NEBULA_DEPTH_COUNTS.lanes.full * 0.8 && c <= NEBULA_DEPTH_COUNTS.lanes.full), 'dust lanes: close to the budget in every nebula', laneCounts.join(','));
const reduced = buildNebulaDepthGeometry(layout, 'reduced');
assert(reduced.lanes.getAttribute('position').count < depth.lanes.getAttribute('position').count, 'reduced density: fewer lane particles');

// ---------- 2. Placement ----------
const frameOf = new Map(frames.map((f) => [f.genreId, f]));
const inside = (g: THREE.BufferGeometry, maxRatio: number) => {
  const p = arr(g, 'position');
  const ids = arr(g, 'gid');
  let worst = 0;
  for (let i = 0; i < ids.length; i++) {
    const f = frameOf.get(depth.genreIds[ids[i]])!;
    const d = Math.hypot(p[i * 3] - f.center[0], p[i * 3 + 1] - f.center[1], p[i * 3 + 2] - f.center[2]) / f.radius;
    worst = Math.max(worst, d);
  }
  return { ok: worst <= maxRatio, worst };
};
const lanesInside = inside(depth.lanes, 1.0);
assert(lanesInside.ok, 'dust lanes stay inside their nebula (≤ S)', lanesInside.worst.toFixed(2));
const glowInside = inside(depth.glow, 1.6);
assert(glowInside.ok, 'fog and knots stay around their nebula (≤ 1.6·S)', glowInside.worst.toFixed(2));

// lanes are ribbons, not a filled ball: their noise samples sit near the fBm mid-level, so they cover
// only a thin shell of the volume; check they are flatter along the nebula normal than in its plane
const lp = arr(depth.lanes, 'position');
const lids = arr(depth.lanes, 'gid');
let alongNormal = 0;
let inPlane = 0;
for (let i = 0; i < lids.length; i++) {
  const f = frameOf.get(depth.genreIds[lids[i]])!;
  const d = [lp[i * 3] - f.center[0], lp[i * 3 + 1] - f.center[1], lp[i * 3 + 2] - f.center[2]];
  const n = d[0] * f.normal[0] + d[1] * f.normal[1] + d[2] * f.normal[2];
  alongNormal += n * n;
  inPlane += d[0] * d[0] + d[1] * d[1] + d[2] * d[2] - n * n;
}
assert(alongNormal / lids.length < (inPlane / lids.length) * 0.5, 'dust lanes lie flatter than the cloud (ribbons near the nebula plane)');

// ---------- 3. Turn with the gas ----------
const fieldSpin = arr(field.geometry, 'spin');
const fieldKind = arr(field.geometry, 'kind');
const fieldGid = arr(field.geometry, 'gid');
const gasSpinOf = new Map<number, number>();
for (let i = 0; i < fieldKind.length; i++) if (fieldKind[i] === NEBULA_KIND.gas && !gasSpinOf.has(fieldGid[i])) gasSpinOf.set(fieldGid[i], fieldSpin[i]);
const depthSpin = arr(depth.lanes, 'spin');
const spinMatches = depth.genreIds.every((id, gid) => {
  const i = Array.from(lids).indexOf(gid);
  return Math.abs(depthSpin[i] - gasSpinOf.get(gid)!) < 1e-6 && Math.abs(depthSpin[i] - GAS_SPIN * gasSpinDir(id)) < 1e-6;
});
assert(spinMatches, 'lanes and fog spin exactly like the gas of their nebula');
const knotSpinZero = Array.from(arr(depth.glow, 'kind')).every((k, i) => k !== DEPTH_KIND.knot || arr(depth.glow, 'spin')[i] === 0);
assert(knotSpinZero, 'emission knots stay put (artists and stars do not move)');

// ---------- 4. Determinism and other datasets ----------
const again = buildNebulaDepthGeometry(layout, 'full');
assert(
  ['glow', 'lanes'].every((k) =>
    Object.keys(NEBULA_DEPTH_ATTRIBUTES).every((name) => {
      const a = arr(again[k as 'glow' | 'lanes'], name);
      const b = arr(depth[k as 'glow' | 'lanes'], name);
      return a.length === b.length && a.every((v, i) => v === b[i]);
    })
  ),
  'deterministic: same layout → same buffers'
);
const small = buildNebulaDepthGeometry(getNebulaLayout(GALAXY_PRESET_50), 'full');
assert(small.genreIds.length === GALAXY_PRESET_50.genres.length && small.lanes.getAttribute('position').count > 0, 'preset 50: every nebula gets depth layers');
assert(genreCount === GALAXY_PRESET_300.genres.length, 'preset 300: every nebula gets depth layers');

// ---------- 5. Materials ----------
const fog = createNebulaFogMaterial();
const lanes = createNebulaLanesMaterial();
assert(fog.customProgramCacheKey() === NEBULA_FOG_CACHE_KEY && NEBULA_FOG_CACHE_KEY === 'ymv-nebula-fog-v1', 'fog cache key ymv-nebula-fog-v1');
assert(lanes.customProgramCacheKey() === NEBULA_LANES_CACHE_KEY && NEBULA_LANES_CACHE_KEY === 'ymv-nebula-lanes-v1', 'lanes cache key ymv-nebula-lanes-v1');
fog.uniforms.uFocusGid.value = 2;
lanes.uniforms.uLaneGain.value = 3;
assert(fog.customProgramCacheKey() === NEBULA_FOG_CACHE_KEY && lanes.customProgramCacheKey() === NEBULA_LANES_CACHE_KEY, 'cache keys independent of uniforms');
assert(fog.blending === THREE.AdditiveBlending && fog.depthWrite === false, 'fog: additive, no depth write');
assert(lanes.blending === THREE.MultiplyBlending && lanes.premultipliedAlpha && lanes.depthWrite === false, 'lanes: multiply blending (premultiplied), no depth write');
assert(
  Object.keys(createNebulaDepthUniforms()).every((u) => NEBULA_DEPTH_VERTEX_SHADER.includes(`uniform float ${u};`)),
  'every uniform declared in the shared vertex shader'
);

console.log('\n================================================================');
console.log('SUMMARY OF B2 VERIFICATION');
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
  console.log('\nALL B2 TESTS PASSED');
  process.exit(0);
}
