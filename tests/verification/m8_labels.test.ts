import {
  collisionMarkerPosition,
  MARKER_GALAXY_LIFT,
  MAX_GALAXY_GENRE_LABELS,
  nearestGenreLabelIds,
} from '../../src/lib/layout/collisionModel';
import { getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { useGalaxyStore } from '../../src/store/useGalaxyStore';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';

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

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

console.log('================================================================');
console.log('SUITE M8.3: genre label LOD and collision marker placement');
console.log('================================================================');

for (const [name, data] of [['preset50', GALAXY_PRESET_50], ['preset150', GALAXY_PRESET_150], ['preset300', GALAXY_PRESET_300]] as const) {
  const layout = getNebulaLayout(data);
  const cam: [number, number, number] = [0, 22, 66];

  // 1. Genre labels: the 5 nearest cores
  const ids = nearestGenreLabelIds(layout.cores, cam);
  assert(ids.length === Math.min(MAX_GALAXY_GENRE_LABELS, layout.cores.length), `${name}: ${MAX_GALAXY_GENRE_LABELS} genre labels in galaxy view`, `${ids.length}`);
  const d = (id: string) => dist(layout.cores.find((c) => c.genreId === id)!.center, cam);
  const farthestShown = Math.max(...ids.map(d));
  const nearestHidden = Math.min(...layout.cores.filter((c) => !ids.includes(c.genreId)).map((c) => d(c.genreId)));
  assert(farthestShown <= nearestHidden, `${name}: labels are the nearest genres to the camera`);
  assert(JSON.stringify(nearestGenreLabelIds(layout.cores, cam)) === JSON.stringify(ids), `${name}: deterministic`);

  // 2. Markers clear the focused genre's artists by ≥ 2 u, and sit towards the other genre
  let worst = Infinity;
  let towardsOther = true;
  for (const genre of layout.data.genres) {
    const artists = layout.data.artists.filter((a) => a.genreId === genre.id);
    for (const r of layout.relations.filter((x) => x.a === genre.id || x.b === genre.id)) {
      const p = collisionMarkerPosition(r, genre.id);
      for (const a of artists) worst = Math.min(worst, dist(p, a.position));
      const other = layout.cores.find((c) => c.genreId === (r.a === genre.id ? r.b : r.a))!;
      const own = layout.cores.find((c) => c.genreId === genre.id)!;
      if (dist(p, other.center) >= dist(r.contact, other.center) || dist(p, own.center) <= dist(r.contact, own.center)) towardsOther = false;
    }
  }
  assert(worst >= 2, `${name}: markers ≥ 2 u from the focused genre's artists`, worst.toFixed(2));
  assert(towardsOther, `${name}: markers shift away from the focused genre, towards the other one`);
  const r0 = layout.relations[0];
  const galaxy = collisionMarkerPosition(r0, null);
  assert(
    galaxy[0] === r0.contact[0] && galaxy[2] === r0.contact[2] && Math.abs(galaxy[1] - (r0.contact[1] + r0.radius * MARKER_GALAXY_LIFT)) < 1e-9,
    `${name}: without focus the marker floats above the contact point`
  );
  console.log(`    ↳ ${name}: labels ${ids.length} · closest marker–artist ${worst.toFixed(2)} u`);
}

// 3. Store: label list updates only on change
const store = useGalaxyStore;
assert(store.getState().nebulaGenreLabelIds === null, 'store: no genre label limit by default');
store.getState().setNebulaGenreLabelIds(['a', 'b']);
let emitted = 0;
const unsubscribe = store.subscribe(() => emitted++);
store.getState().setNebulaGenreLabelIds(['a', 'b']);
store.getState().setNebulaGenreLabelIds(['a', 'b']);
unsubscribe();
assert(emitted === 0, 'store: same label list emits no update (no re-render storm at 4 Hz)');
store.getState().setNebulaGenreLabelIds(null);
assert(store.getState().nebulaGenreLabelIds === null, 'store: limit cleared with null');

console.log('\n================================================================');
console.log('SUMMARY OF M8.3 VERIFICATION');
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
  console.log('\nALL M8.3 TESTS PASSED');
  process.exit(0);
}
