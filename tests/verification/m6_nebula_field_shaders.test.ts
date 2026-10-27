import * as THREE from 'three';
import {
  createNebulaFieldMaterial,
  createNebulaFieldUniforms,
  NEBULA_FIELD_CACHE_KEY,
  NEBULA_FIELD_FRAGMENT_SHADER,
  NEBULA_FIELD_SIZE_ATTENUATION,
  NEBULA_FIELD_VERTEX_SHADER,
} from '../../src/components/canvas/nebulaV3/shaders/nebulaFieldShaders';
import { NEBULA_FIELD_ATTRIBUTES } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { WORLD_SCALE } from '../../src/lib/layout/nebulaLayout';

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
console.log('SUITE M6.2: Nebulosas v3 gas field material');
console.log('================================================================');

// 1. Cache key: constant, shared and independent of uniform values (§7.5.2)
const a = createNebulaFieldMaterial();
const b = createNebulaFieldMaterial();
assert(NEBULA_FIELD_CACHE_KEY === 'nebula-field-v3', 'cache key is nebula-field-v3');
assert(a.customProgramCacheKey() === NEBULA_FIELD_CACHE_KEY, 'material uses NEBULA_FIELD_CACHE_KEY');
assert(a.customProgramCacheKey() === b.customProgramCacheKey(), 'cache key identical across instances');
a.uniforms.uGain.value = 1.4;
a.uniforms.uFocusGid.value = 3;
a.uniforms.uFocusAmt.value = 1;
a.uniforms.uMinAffinity.value = 0.9;
assert(a.customProgramCacheKey() === NEBULA_FIELD_CACHE_KEY, 'cache key unchanged by brightness/focus/affinity uniforms');
assert(a.vertexShader === b.vertexShader && a.fragmentShader === b.fragmentShader, 'shader source independent of state');

// 2. Material flags
assert(a.transparent === true, 'transparent');
assert(a.depthWrite === false, 'depthWrite disabled');
assert(a.blending === THREE.AdditiveBlending, 'additive blending');

// 3. Uniforms present with neutral defaults
const defaults = createNebulaFieldUniforms();
const expected: Record<string, number> = {
  uTime: 0, uPixelRatio: 1, uGain: 1, uMinAffinity: 0, uFocusGid: -1, uFocusAmt: 0,
  uArtistAid: -1, uArtistAmt: 0, uPlayingGid: -1, uSubBass: 0, uHighShimmer: 0,
};
assert(
  Object.entries(expected).every(([k, v]) => defaults[k]?.value === v) && Object.keys(defaults).length === Object.keys(expected).length,
  'uniforms present with neutral defaults',
  JSON.stringify(Object.fromEntries(Object.entries(defaults).map(([k, u]) => [k, u.value])))
);
assert(
  Object.keys(expected).every((u) => new RegExp(`uniform float ${u};`).test(NEBULA_FIELD_VERTEX_SHADER)),
  'every uniform declared in the vertex shader'
);
assert(createNebulaFieldUniforms() !== createNebulaFieldUniforms(), 'each material gets its own uniform objects');

// 4. Attribute names match the geometry (both directions)
const declared = [...NEBULA_FIELD_VERTEX_SHADER.matchAll(/attribute (float|vec3) (\w+);/g)].map((m) => ({
  name: m[2],
  size: m[1] === 'vec3' ? 3 : 1,
}));
const geometryAttrs = Object.entries(NEBULA_FIELD_ATTRIBUTES).filter(([name]) => name !== 'position'); // position comes from Three's prefix
assert(
  geometryAttrs.every(([name, size]) => declared.some((d) => d.name === name && d.size === size)),
  'every geometry attribute declared in the shader with matching type',
  geometryAttrs.filter(([name]) => !declared.some((d) => d.name === name)).map(([n]) => n).join(', ')
);
assert(
  declared.every((d) => d.name in NEBULA_FIELD_ATTRIBUTES),
  'shader declares no attribute missing from the geometry',
  declared.filter((d) => !(d.name in NEBULA_FIELD_ATTRIBUTES)).map((d) => d.name).join(', ')
);

// 5. Scale and shader content
assert(Math.abs(NEBULA_FIELD_SIZE_ATTENUATION - 260 * WORLD_SCALE) < 1e-9, 'size attenuation = 260·WORLD_SCALE');
assert(NEBULA_FIELD_VERTEX_SHADER.includes(NEBULA_FIELD_SIZE_ATTENUATION.toFixed(2)), 'vertex shader uses the scaled attenuation');
assert(NEBULA_FIELD_FRAGMENT_SHADER.includes('exp(-dist * dist * 160.0)'), 'fragment keeps the classic pinprick spark');
assert(/smoothstep\(uMinAffinity - 0\.02, uMinAffinity, aAffinity\)/.test(NEBULA_FIELD_VERTEX_SHADER), 'vertex applies the affinity filter');

// 6. JS replica of the orbit: uTime = 0 keeps particles still, rotation preserves distance to the anchor
const rotateAround = (v: THREE.Vector3, k: THREE.Vector3, angle: number) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return v.clone().multiplyScalar(c).add(new THREE.Vector3().crossVectors(k, v).multiplyScalar(s)).add(k.clone().multiplyScalar(k.dot(v) * (1 - c)));
};
const offset = new THREE.Vector3(1.2, -0.4, 2.1);
const axis = new THREE.Vector3(0.3, 0.9, -0.2).normalize();
assert(rotateAround(offset, axis, 0).distanceTo(offset) < 1e-12, 'orbit: angle 0 (uTime = 0) leaves the particle still');
assert(Math.abs(rotateAround(offset, axis, 2.7).length() - offset.length()) < 1e-12, 'orbit: rotation preserves the distance to the anchor');
assert(
  Math.abs(rotateAround(offset, axis, 1.3).dot(axis) - offset.dot(axis)) < 1e-12,
  'orbit: rotation preserves the height along the axis'
);

a.dispose();
b.dispose();

console.log('\n================================================================');
console.log('SUMMARY OF M6.2 VERIFICATION');
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
  console.log('\nALL M6.2 TESTS PASSED');
  process.exit(0);
}
