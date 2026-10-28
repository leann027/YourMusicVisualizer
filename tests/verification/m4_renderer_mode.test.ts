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

// Test 1b: during the warp-in a mode switch does not start a camera flight (M8.2)
assert(store.getState().isWarpActive, 'store starts with the warp-in active');
const warpFlight = store.getState().flightVersion;
store.getState().setRendererMode('nebula');
assert(store.getState().flightVersion === warpFlight, 'mode switch during the warp-in starts no flight');
store.getState().setRendererMode('classic');
store.getState().finishWarp();

// Test 2: switching modes keeps the selection and camera mode.
// Since M5.5 the mode swaps `data` for the nebula layout and reframes the camera (see m5_store_layout).
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
assert(after.data !== snapshot.data, 'switching to nebula swaps data for the nebula layout (M5.5)');
assert(after.selectedNode?.id === snapshot.selectedNode?.id, 'switching mode keeps the selected node (by id)');
assert(after.selectedSectorId === snapshot.selectedSectorId, 'switching mode keeps selectedSectorId');
assert(after.cameraMode === snapshot.cameraMode, 'switching mode keeps cameraMode');
assert(after.flightVersion === snapshot.flightVersion + 1, 'switching mode reframes the camera once (M5.5)');

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
