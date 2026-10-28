import { advanceTideOffsets, TIDE_BOOST_MAX, TIDE_GLOW_MAX, tideBoostTarget } from '../../src/components/canvas/nebulaV3/tideBoost';
import { collisionRelations, buildNebulaCollisionGeometry } from '../../src/components/canvas/nebulaV3/nebulaCollisionGeometry';
import { MAX_TIDE_COLLISIONS } from '../../src/components/canvas/nebulaV3/shaders/nebulaCollisionShaders';
import { getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';

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
console.log('SUITE M7.5: tide boost for playing bridge songs');
console.log('================================================================');

const layout = getNebulaLayout(GALAXY_PRESET_300);
const relations = collisionRelations(layout);
const target = relations[0];
const bridge = target.bridgeSongIds[0];
const plain = layout.data.songs.find((s) => !relations.some((r) => r.bridgeSongIds.includes(s.id)))!;

// 1. Targets
const boosted = tideBoostTarget(bridge, true, relations, 1);
assert(boosted.rid === 0, 'playing bridge song → its collision rid', JSON.stringify(boosted));
assert(boosted.speed === 1 + TIDE_BOOST_MAX && boosted.glow === TIDE_GLOW_MAX, 'full energy → max speed and glow');
assert(tideBoostTarget(bridge, true, relations, 0).speed === 1, 'silence → reference speed');
assert(tideBoostTarget(bridge, true, relations, 0.4).speed > 1 && tideBoostTarget(bridge, true, relations, 0.4).speed < tideBoostTarget(bridge, true, relations, 0.8).speed, 'speed grows with energy');
assert(tideBoostTarget(bridge, true, relations, 7).speed === 1 + TIDE_BOOST_MAX, 'energy clamped to 1');
assert(tideBoostTarget(bridge, false, relations, 1).rid === -1, 'paused → no boost');
assert(tideBoostTarget(plain.id, true, relations, 1).rid === -1, 'non-bridge song → no boost');
assert(tideBoostTarget(null, true, relations, 1).rid === -1 && tideBoostTarget('missing', true, relations, 1).rid === -1, 'nothing / unknown playing → no boost');

// 2. rid attribute matches collisionRelations order
const { geometry, countsByRelation } = buildNebulaCollisionGeometry(layout, 35000);
const rid = geometry.getAttribute('rid').array as Float32Array;
let start = 0;
const ridOk = countsByRelation.every((n, r) => {
  for (let i = start; i < start + n; i++) if (rid[i] !== r) return false;
  start += n;
  return true;
});
assert(ridOk, 'rid attribute = collision index in particle order');
assert(relations.length <= MAX_TIDE_COLLISIONS, `preset fits the ${MAX_TIDE_COLLISIONS} tide offsets`, `${relations.length}`);
geometry.dispose();

// 3. Phase continuity: speed changes abruptly every 0.5 s; the effective tide time never jumps
const offsets = new Float32Array(MAX_TIDE_COLLISIONS);
const dt = 1 / 60;
let time = 0;
let eased = 1;
let phase = 0; // effective tide time of the boosted collision: uTime + offset
let maxStep = 0;
let minStep = Infinity;
let naivePrev = 0;
let naiveMaxStep = 0;
for (let frame = 0; frame < 60 * 20; frame++) {
  const energy = Math.floor(frame / 30) % 2 === 0 ? 1 : 0; // square wave of energy
  const playing = frame < 60 * 15; // song stops at 15 s
  const t = tideBoostTarget(bridge, playing, relations, energy);
  eased += (t.speed - eased) * 0.1;
  time += dt;
  advanceTideOffsets(offsets, 0, eased, dt);
  const next = time + offsets[0];
  maxStep = Math.max(maxStep, next - phase);
  minStep = Math.min(minStep, next - phase);
  phase = next;
  // naive alternative: uTime · speed
  const naive = time * t.speed;
  if (frame > 0) naiveMaxStep = Math.max(naiveMaxStep, Math.abs(naive - naivePrev));
  naivePrev = naive;
}
assert(maxStep <= dt * (1 + TIDE_BOOST_MAX) + 1e-9, 'tide time never advances more than dt·max speed per frame', maxStep.toFixed(4));
assert(minStep >= dt - 1e-9, 'tide time never goes backwards (offset kept after the song stops)', minStep.toFixed(4));
assert(naiveMaxStep > 1, 'naive uTime·speed would jump (sanity check of the scenario)', naiveMaxStep.toFixed(2));
const untouched = Array.from(offsets).slice(1).every((v) => v === 0);
assert(untouched, 'other collisions keep their phase');
advanceTideOffsets(offsets, -1, 3, dt);
advanceTideOffsets(offsets, MAX_TIDE_COLLISIONS, 3, dt);
assert(Array.from(offsets).slice(1).every((v) => v === 0), 'rid -1 or out of range changes nothing');
console.log(`    ↳ boosted tide time ${phase.toFixed(2)} s vs ${time.toFixed(2)} s; naive max jump ${naiveMaxStep.toFixed(1)} s`);

console.log('\n================================================================');
console.log('SUMMARY OF M7.5 VERIFICATION');
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
  console.log('\nALL M7.5 TESTS PASSED');
  process.exit(0);
}
