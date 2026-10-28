import { computeBloomTargets } from '../../src/components/canvas/bloomTargets';
import { LOW_FPS_SAMPLES, shouldReduceNebulaDensity } from '../../src/components/canvas/nebulaV3/nebulaDensity';
import { parseNebulaTune } from '../../src/components/canvas/nebulaV3/nebulaTune';
import { useGalaxyStore } from '../../src/store/useGalaxyStore';

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

const near = (a: number, b: number) => Math.abs(a - b) < 1e-12;

console.log('================================================================');
console.log('SUITE M6.4: bloom per mode, adaptive density and look override');
console.log('================================================================');

// 1. Classic bloom: exactly the pre-M6.4 formula (inlined from PostProcessingPipeline)
const legacyClassic = (cameraDistance: number, isPlaying: boolean, subBass: number) => {
  const proximity = Math.min(1, Math.max(0.02, (cameraDistance - 5.0) / 22.0));
  const baseStrength = isPlaying ? 0.08 + subBass * 0.02 : 0.07;
  return { strength: baseStrength * proximity, radius: 0.16, threshold: 0.97 + (0.92 - 0.97) * proximity };
};
const cases: [number, boolean, number][] = [
  [33.1, false, 0], [33.1, true, 0.8], [8, false, 0], [8, true, 0.3], [4, true, 1], [60, false, 0],
];
for (const [dist, playing, sub] of cases) {
  const got = computeBloomTargets('classic', dist, { isPlaying: playing, subBass: sub });
  const want = legacyClassic(dist, playing, sub);
  assert(
    near(got.strength, want.strength) && near(got.radius, want.radius) && near(got.threshold, want.threshold),
    `classic bloom unchanged (d=${dist}, playing=${playing}, sub=${sub})`,
    `${JSON.stringify(got)} vs ${JSON.stringify(want)}`
  );
}

// 2. Nebula bloom: strength 0.06 and threshold 0.95 from afar, same anti-glare
const far = computeBloomTargets('nebula', 33.1, { isPlaying: false, subBass: 0 });
assert(near(far.strength, 0.06) && near(far.threshold, 0.95), 'nebula bloom far: strength 0.06, threshold 0.95', JSON.stringify(far));
const close = computeBloomTargets('nebula', 6, { isPlaying: false, subBass: 0 });
assert(close.strength < far.strength && close.threshold > far.threshold, 'nebula bloom keeps proximity anti-glare');
assert(
  computeBloomTargets('nebula', 33.1, { isPlaying: true, subBass: 1 }).strength > far.strength,
  'nebula bloom still pulses with sub-bass'
);

// 3. Adaptive density
const low = (n: number) => Array.from({ length: n }, () => 31);
assert(LOW_FPS_SAMPLES === 6, '6 samples × 500 ms = 3 s');
assert(!shouldReduceNebulaDensity(low(5)), '5 low samples are not enough');
assert(shouldReduceNebulaDensity(low(6)), '6 low samples trigger the reduction');
assert(!shouldReduceNebulaDensity([...low(3), 55, ...low(2)]), 'one good sample in the window resets the count');
assert(shouldReduceNebulaDensity([60, 60, ...low(6)]), 'only the last 6 samples count');
assert(!shouldReduceNebulaDensity([40, 40, 40, 40, 40, 40]), '40 FPS is not low (threshold is < 40)');

// 4. Store: one-way reduction that leaves data and selection alone
const store = useGalaxyStore;
const before = store.getState();
assert(before.nebulaFieldDensity === 'full', 'density starts full');
store.getState().reduceNebulaFieldDensity();
let after = store.getState();
assert(after.nebulaFieldDensity === 'reduced', 'reduceNebulaFieldDensity → reduced');
assert(after.data === before.data && after.selectedNode === before.selectedNode, 'density change keeps data and selection');
let emitted = 0;
const unsubscribe = store.subscribe(() => emitted++);
store.getState().reduceNebulaFieldDensity();
unsubscribe();
assert(emitted === 0, 'second reduction is a no-op');
store.getState().setPresetScale(300);
after = store.getState();
assert(after.nebulaFieldDensity === 'reduced', 'reduction persists across presets (one-way per session)');

// 5. Development look override
assert(JSON.stringify(parseNebulaTune('1.8,1.6')) === '{"size":1.8,"alpha":1.6}', 'parseNebulaTune parses size,alpha');
assert(parseNebulaTune(null) === null && parseNebulaTune('') === null, 'parseNebulaTune: empty → null');
assert(parseNebulaTune('abc') === null && parseNebulaTune('2') === null, 'parseNebulaTune: malformed → null');
assert(parseNebulaTune('0,1') === null && parseNebulaTune('7,1') === null, 'parseNebulaTune: out of range → null');

console.log('\n================================================================');
console.log('SUMMARY OF M6.4 VERIFICATION');
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
  console.log('\nALL M6.4 TESTS PASSED');
  process.exit(0);
}
