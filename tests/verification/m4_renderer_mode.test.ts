import { parseRendererParam, useGalaxyStore } from '../../src/store/useGalaxyStore';

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
console.log('SUITE M4.1: rendererMode flag in useGalaxyStore');
console.log('================================================================');

const store = useGalaxyStore;

// Test 1: default mode
assert(
  store.getState().rendererMode === 'classic',
  'rendererMode defaults to classic',
  `got ${store.getState().rendererMode}`
);

// Test 2: switching modes does not touch data, selection or camera flights
const before = store.getState();
const snapshot = {
  data: before.data,
  selectedNode: before.selectedNode,
  selectedSectorId: before.selectedSectorId,
  cameraMode: before.cameraMode,
  flightVersion: before.flightVersion,
};

store.getState().setRendererMode('nebula');
let after = store.getState();
assert(after.rendererMode === 'nebula', 'setRendererMode(nebula) switches mode', `got ${after.rendererMode}`);
assert(after.data === snapshot.data, 'switching mode keeps data reference');
assert(after.selectedNode === snapshot.selectedNode, 'switching mode keeps selectedNode');
assert(after.selectedSectorId === snapshot.selectedSectorId, 'switching mode keeps selectedSectorId');
assert(after.cameraMode === snapshot.cameraMode, 'switching mode keeps cameraMode');
assert(after.flightVersion === snapshot.flightVersion, 'switching mode does not trigger a camera flight');

// Test 3: setting the same mode is a no-op (no state update emitted)
let emitted = 0;
const unsubscribe = store.subscribe(() => {
  emitted += 1;
});
store.getState().setRendererMode('nebula');
unsubscribe();
assert(emitted === 0, 'setRendererMode with current mode emits no update', `emitted ${emitted}`);

// Test 4: preset changes keep the selected renderer
store.getState().setPresetScale(150);
after = store.getState();
assert(after.activePresetScale === 150, 'setPresetScale(150) applied');
assert(after.rendererMode === 'nebula', 'setPresetScale keeps rendererMode', `got ${after.rendererMode}`);

// Test 5: back to classic
store.getState().setRendererMode('classic');
assert(store.getState().rendererMode === 'classic', 'setRendererMode(classic) switches back');

// Test 6: ?renderer= query param parsing (M4.2)
assert(parseRendererParam('nebula') === 'nebula', "parseRendererParam('nebula') -> nebula");
assert(parseRendererParam('classic') === 'classic', "parseRendererParam('classic') -> classic");
assert(parseRendererParam(null) === null, 'parseRendererParam(null) -> null');
assert(parseRendererParam('NEBULA') === null, "parseRendererParam('NEBULA') -> null (case-sensitive)");
assert(parseRendererParam('foo') === null, "parseRendererParam('foo') -> null");
assert(parseRendererParam('') === null, "parseRendererParam('') -> null");

console.log('\n================================================================');
console.log('SUMMARY OF M4 VERIFICATION');
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
  console.log('\nALL M4.1 TESTS PASSED');
  process.exit(0);
}
