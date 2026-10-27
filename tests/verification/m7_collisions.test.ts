import * as THREE from 'three';
import { createHash } from 'node:crypto';
import {
  buildNebulaCollisionGeometry,
  COLLISION_KIND,
  COLLISION_SHARE,
  hueMix,
  NEBULA_COLLISION_ATTRIBUTES,
  nebulaCollisionCounts,
} from '../../src/components/canvas/nebulaV3/nebulaCollisionGeometry';
import {
  createNebulaCollisionMaterial,
  createNebulaCollisionUniforms,
  NEBULA_COLLISION_CACHE_KEY,
  NEBULA_COLLISION_VERTEX_SHADER,
} from '../../src/components/canvas/nebulaV3/shaders/nebulaCollisionShaders';
import { NEBULA_FIELD_DENSITY } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { NEBULA_FIELD_CACHE_KEY } from '../../src/components/canvas/nebulaV3/shaders/nebulaFieldShaders';
import { computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
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

const hashGeometry = (geometry: THREE.BufferGeometry) => {
  const h = createHash('sha256');
  for (const name of Object.keys(NEBULA_COLLISION_ATTRIBUTES)) {
    const arr = geometry.getAttribute(name).array as Float32Array;
    h.update(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength));
  }
  return h.digest('hex');
};
const vec = (arr: Float32Array, i: number): [number, number, number] => [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: number[]) => Math.hypot(a[0], a[1], a[2]);

console.log('================================================================');
console.log('SUITE M7.1: Nebulosas v3 collision particles');
console.log('================================================================');

// ---------- helpers ----------
assert(Math.abs(hueMix(0.9, 0.1, 0.5) - 0) < 1e-9, 'hueMix wraps around the colour wheel');
assert(Math.abs(hueMix(0.2, 0.4, 0.25) - 0.25) < 1e-9, 'hueMix interpolates on the short arc');
assert(JSON.stringify(nebulaCollisionCounts([2, 6, 0], 1000)) === JSON.stringify([38, 113, 12]), 'counts proportional to strength with min 12 (15% budget)', JSON.stringify(nebulaCollisionCounts([2, 6, 0], 1000)));
assert(Math.abs(COLLISION_SHARE - 0.15) < 1e-9, 'collisions get 15% of the particle budget');

// ---------- material ----------
const mat = createNebulaCollisionMaterial();
assert(NEBULA_COLLISION_CACHE_KEY === 'nebula-collisions-v3' && mat.customProgramCacheKey() === NEBULA_COLLISION_CACHE_KEY, 'cache key nebula-collisions-v3');
assert((NEBULA_COLLISION_CACHE_KEY as string) !== NEBULA_FIELD_CACHE_KEY, 'collision program distinct from the field program');
mat.uniforms.uGain.value = 2;
mat.uniforms.uBoostRid.value = 3;
assert(mat.customProgramCacheKey() === NEBULA_COLLISION_CACHE_KEY, 'cache key unchanged by uniforms');
assert(mat.transparent && !mat.depthWrite && mat.blending === THREE.AdditiveBlending, 'additive, transparent, no depth write');
assert(
  createNebulaCollisionUniforms().uBoostRid.value === -1 && createNebulaCollisionUniforms().uTideOffset.value.every((v) => v === 0),
  'no tide boost by default (rid -1, zero offsets)'
);
assert(createNebulaCollisionUniforms().uTideOffset.value !== createNebulaCollisionUniforms().uTideOffset.value, 'each material gets its own tide offsets');
assert(createNebulaCollisionUniforms().uClashSize.value === 2.6 && createNebulaCollisionUniforms().uClashAlpha.value === 1.8, 'clash look defaults to the calibrated 2.6 · 1.8');
const declared = [...NEBULA_COLLISION_VERTEX_SHADER.matchAll(/attribute (float|vec3) (\w+);/g)].map((m) => ({ name: m[2], size: m[1] === 'vec3' ? 3 : 1 }));
const geomAttrs = Object.entries(NEBULA_COLLISION_ATTRIBUTES).filter(([n]) => n !== 'position');
assert(geomAttrs.every(([n, s]) => declared.some((d) => d.name === n && d.size === s)), 'every geometry attribute declared with matching type');
assert(declared.every((d) => d.name in NEBULA_COLLISION_ATTRIBUTES), 'no shader attribute missing from the geometry');
assert(
  Object.keys(createNebulaCollisionUniforms()).every((u) => new RegExp(`uniform float ${u}(\\[\\d+\\])?;`).test(NEBULA_COLLISION_VERTEX_SHADER)),
  'every uniform declared in the vertex shader'
);
mat.dispose();

// ---------- geometry on presets ----------
const presets: [string, MusicGalaxyData][] = [
  ['preset50', GALAXY_PRESET_50],
  ['preset300', GALAXY_PRESET_300],
];
for (const [name, data] of presets) {
  const layout = computeNebulaLayout(data);
  const N = NEBULA_FIELD_DENSITY.full;
  const { geometry, countsByRelation } = buildNebulaCollisionGeometry(layout, N);
  const total = geometry.getAttribute('position').count;
  const relations = layout.relations;

  assert(Math.abs(total - N * COLLISION_SHARE) <= relations.length, `${name}: total ≈ ${COLLISION_SHARE.toFixed(2)}·N`, `${total}`);
  const totalStrength = relations.reduce((a, r) => a + r.strength, 0);
  const dev = relations.map((r, i) => Math.abs(countsByRelation[i] - (N * COLLISION_SHARE * r.strength) / totalStrength));
  assert(Math.max(...dev) <= 1, `${name}: per-collision counts proportional to strength`, `max dev ${Math.max(...dev).toFixed(2)}`);

  const kind = geometry.getAttribute('kind').array as Float32Array;
  const gid = geometry.getAttribute('gid').array as Float32Array;
  const gid2 = geometry.getAttribute('gid2').array as Float32Array;
  const pos = geometry.getAttribute('position').array as Float32Array;
  const anchor = geometry.getAttribute('anchor').array as Float32Array;
  const axis = geometry.getAttribute('axis').array as Float32Array;
  const aff = geometry.getAttribute('aAffinity').array as Float32Array;
  const coreOf = new Map(layout.cores.map((c) => [c.genreId, c]));
  const gidOf = new Map(layout.data.genres.map((g, i) => [g.id, i]));

  const kinds = { 3: 0, 4: 0, 5: 0 } as Record<number, number>;
  let wrongPair = 0;
  let frontOff = 0;
  let tideOff = 0;
  let affOff = 0;
  let i = 0;
  relations.forEach((r, ri) => {
    const A = coreOf.get(r.a)!;
    const B = coreOf.get(r.b)!;
    const minAff = Math.min(layout.data.genres[gidOf.get(r.a)!].affinity, layout.data.genres[gidOf.get(r.b)!].affinity);
    for (let j = 0; j < countsByRelation[ri]; j++, i++) {
      kinds[kind[i]]++;
      if (gid[i] !== gidOf.get(r.a) || gid2[i] !== gidOf.get(r.b)) wrongPair++;
      if (Math.abs(aff[i] - minAff) > 1e-6) affOff++;
      if (kind[i] === COLLISION_KIND.front) {
        const rel = sub(vec(pos, i), r.contact);
        const depth = Math.abs(dot(rel, r.dir));
        const radial = len(sub(rel, r.dir.map((d) => d * dot(rel, r.dir))));
        if (radial > r.radius * 1.1 || depth > r.radius * 0.6) frontOff++;
      } else if (kind[i] === COLLISION_KIND.tide) {
        const a0 = vec(anchor, i);
        const a1 = vec(axis, i);
        const ab = len(sub(a0, A.center)) < 1e-4 && len(sub(a1, B.center)) < 1e-4;
        const ba = len(sub(a0, B.center)) < 1e-4 && len(sub(a1, A.center)) < 1e-4;
        if (!ab && !ba) tideOff++;
      }
    }
  });
  const share = [kinds[3], kinds[4], kinds[5]].map((k) => k / total);
  assert(
    Math.abs(share[0] - 0.55) <= 0.04 && Math.abs(share[1] - 0.25) <= 0.04 && Math.abs(share[2] - 0.2) <= 0.04,
    `${name}: kind shares ≈ 55/25/20%`,
    share.map((s) => (s * 100).toFixed(1)).join('/')
  );
  assert(wrongPair === 0, `${name}: every particle tagged with its genre pair`);
  assert(affOff === 0, `${name}: aAffinity = min of the pair's genre affinities`);
  assert(frontOff / Math.max(1, kinds[3]) < 0.01, `${name}: shock front within 1.1·radius of contact, near its plane`, `${frontOff} off`);
  assert(tideOff === 0, `${name}: tides run from one core to the other`);
  assert(
    Object.keys(NEBULA_COLLISION_ATTRIBUTES).every((a) => (geometry.getAttribute(a).array as Float32Array).every(Number.isFinite)),
    `${name}: all values finite`
  );
  assert(hashGeometry(geometry) === hashGeometry(buildNebulaCollisionGeometry(layout, N).geometry), `${name}: deterministic`);
  console.log(`    ↳ ${name}: ${relations.length} collisions · ${total} particles · ${share.map((s) => (s * 100).toFixed(0)).join('/')}%`);
  geometry.dispose();
}

// ---------- stability: a collision does not change when an unrelated genre disappears ----------
const full = computeNebulaLayout(GALAXY_PRESET_150);
const involved = new Set(full.relations.flatMap((r) => [r.a, r.b]));
const lonely = GALAXY_PRESET_150.genres.find((g) => !involved.has(g.id));
if (lonely) {
  const reduced = computeNebulaLayout({
    ...GALAXY_PRESET_150,
    genres: GALAXY_PRESET_150.genres.filter((g) => g.id !== lonely.id),
    artists: GALAXY_PRESET_150.artists.filter((a) => a.genreId !== lonely.id),
    songs: GALAXY_PRESET_150.songs.filter((s) => s.genreId !== lonely.id),
  });
  const pairKey = (r: { a: string; b: string }) => `${r.a}|${r.b}`;
  assert(
    JSON.stringify(full.relations.map(pairKey)) === JSON.stringify(reduced.relations.map(pairKey)),
    'stability: removing a genre without collisions keeps the same collisions'
  );
} else {
  assert(true, 'stability: every genre collides in preset 150 (nothing to remove)');
}

console.log('\n================================================================');
console.log('SUMMARY OF M7.1 VERIFICATION');
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
  console.log('\nALL M7.1 TESTS PASSED');
  process.exit(0);
}
