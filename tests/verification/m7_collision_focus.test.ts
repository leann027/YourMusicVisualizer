import * as THREE from 'three';
import {
  collisionCameraPose,
  COLLISION_VIEW_FACTOR,
  findCollision,
  trackedLocalPosition,
} from '../../src/components/canvas/nebulaV3/collisionCamera';
import { computeNebulaFieldTargets } from '../../src/components/canvas/nebulaV3/nebulaFieldTargets';
import { getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { useGalaxyStore } from '../../src/store/useGalaxyStore';
import { GALAXY_PRESET_50, GALAXY_PRESET_150 } from '../../src/data/galaxyPresets';

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
console.log('SUITE M7.3: collision selection, camera and focus');
console.log('================================================================');

// ---------- 1. collisionCameraPose ----------
const contact = new THREE.Vector3(4, -2, 7);
const dir = new THREE.Vector3(1, 0.3, -0.2).normalize();
const current = new THREE.Vector3(10, 20, 40);
const pose = collisionCameraPose(contact, dir, 7.5, 8.5, current);
const offset = pose.eye.clone().sub(contact);
assert(pose.target.equals(contact), 'pose looks at the contact point');
assert(Math.abs(offset.dot(dir)) < 1e-9, 'eye perpendicular to the collision axis', offset.dot(dir).toExponential(2));
assert(Math.abs(offset.length() - 16 * COLLISION_VIEW_FACTOR) < 1e-9, 'eye at (Sa+Sb)·1.55', offset.length().toFixed(3));
const currentSide = current.clone().sub(contact);
assert(offset.dot(currentSide) > 0, 'eye on the side of the current camera (short flight)');
const mirrored = collisionCameraPose(contact, dir, 7.5, 8.5, contact.clone().sub(currentSide));
assert(mirrored.eye.clone().sub(contact).dot(offset) < 0, 'camera on the other side → pose on the other side');
const aligned = collisionCameraPose(contact, dir, 7.5, 8.5, contact.clone().add(dir.clone().multiplyScalar(30)));
const alignedOffset = aligned.eye.clone().sub(contact);
assert(Math.abs(alignedOffset.dot(dir)) < 1e-9 && Number.isFinite(alignedOffset.length()) && alignedOffset.length() > 1, 'camera on the axis → finite perpendicular fallback');
const vertical = collisionCameraPose(contact, new THREE.Vector3(0, 1, 0), 5, 5, contact.clone().add(new THREE.Vector3(0, 30, 0)));
assert(Math.abs(vertical.eye.clone().sub(contact).y) < 1e-9 && vertical.eye.distanceTo(contact) > 1, 'vertical axis + aligned camera → horizontal fallback');

// ---------- 2. tracking position ----------
const layout = getNebulaLayout(GALAXY_PRESET_150);
const relation = layout.relations[0];
const song = layout.data.songs[3];
assert(trackedLocalPosition('galaxy', song, relation) === null, 'galaxy view tracks nothing');
assert(trackedLocalPosition('song', song, null) === song.position, 'node modes track the selected node');
assert(trackedLocalPosition('collision', song, relation) === relation.contact, 'collision mode tracks the contact point');
assert(trackedLocalPosition('collision', song, null) === null, 'collision mode without a collision tracks nothing');
assert(findCollision(layout, { a: relation.a, b: relation.b }) === relation, 'findCollision finds the relation');
assert(findCollision(layout, { a: 'nope', b: relation.b }) === null && findCollision(layout, null) === null, 'findCollision: unknown or null → null');

// ---------- 3. focus targets ----------
const genreIds = layout.data.genres.map((g) => g.id);
const baseInput = {
  data: layout.data,
  genreIds,
  particleCount: 29750,
  stellarBrightness: 0.25,
  minAffinityFilter: 0,
  selectedNode: null,
  playingTrackId: null,
};
const collisionTargets = computeNebulaFieldTargets({
  ...baseInput,
  selectedSectorId: relation.a,
  cameraMode: 'collision',
  selectedCollision: { a: relation.a, b: relation.b },
});
assert(
  collisionTargets.focusGid === genreIds.indexOf(relation.a) && collisionTargets.focusGid2 === genreIds.indexOf(relation.b) && collisionTargets.focusAmt === 1,
  'collision focus lights both genres of the pair',
  JSON.stringify(collisionTargets)
);
const sectorTargets = computeNebulaFieldTargets({ ...baseInput, selectedSectorId: relation.a, cameraMode: 'sector', selectedCollision: { a: relation.a, b: relation.b } });
assert(sectorTargets.focusGid2 === -1, 'outside collision mode there is no second focus genre');

// ---------- 4. store transitions ----------
const store = useGalaxyStore;
store.getState().selectCollision({ a: relation.a, b: relation.b });
assert(store.getState().selectedCollision === null, 'classic mode: selectCollision is ignored');
store.getState().setRendererMode('nebula');
store.getState().setPresetScale(150);
const flight0 = store.getState().flightVersion;
store.getState().selectCollision({ a: relation.b, b: relation.a }); // reversed on purpose
let s = store.getState();
assert(s.selectedCollision?.a === relation.a && s.selectedCollision?.b === relation.b, 'selection normalised to a < b');
assert(s.cameraMode === 'collision' && s.selectedSectorId === relation.a, 'collision mode with sector = genre a');
assert(s.flightVersion === flight0 + 1, 'selecting a collision starts one camera flight');
store.getState().selectCollision({ a: relation.a, b: 'genre-unknown' });
assert(store.getState().selectedCollision?.b === relation.b, 'unknown collisions are ignored');

store.getState().selectNode(store.getState().data.artists[0]);
assert(store.getState().selectedCollision === null && store.getState().cameraMode === 'artist', 'selectNode clears the collision');
store.getState().selectCollision({ a: relation.a, b: relation.b });
store.getState().selectSector(relation.b);
assert(store.getState().selectedCollision === null && store.getState().cameraMode === 'sector', 'selectSector clears the collision');
store.getState().selectCollision({ a: relation.a, b: relation.b });
store.getState().resetToGalaxyView();
assert(store.getState().selectedCollision === null && store.getState().cameraMode === 'galaxy', 'resetToGalaxyView clears the collision');
store.getState().selectCollision({ a: relation.a, b: relation.b });
store.getState().flyToNeighborSector(1);
assert(store.getState().selectedCollision === null, 'flyToNeighborSector clears the collision');
store.getState().selectCollision({ a: relation.a, b: relation.b });
const before = store.getState().flightVersion;
store.getState().selectCollision(null);
s = store.getState();
assert(s.selectedCollision === null && s.cameraMode === 'galaxy' && s.flightVersion === before + 1, 'selectCollision(null) returns to the galaxy view');

store.getState().selectCollision({ a: relation.a, b: relation.b });
store.getState().setRendererMode('classic');
s = store.getState();
assert(s.selectedCollision === null && s.cameraMode === 'galaxy', 'switching to classic leaves collision mode');
store.getState().setRendererMode('nebula');
store.getState().selectCollision({ a: relation.a, b: relation.b });
store.getState().setPresetScale(50);
assert(store.getState().selectedCollision === null, 'changing preset clears the collision');
const rel50 = getNebulaLayout(GALAXY_PRESET_50).relations[0];
store.getState().selectCollision({ a: rel50.a, b: rel50.b });
store.getState().loadCustomGalaxyData(GALAXY_PRESET_150, 'custom');
assert(store.getState().selectedCollision === null, 'loading custom data clears the collision');

console.log('\n================================================================');
console.log('SUMMARY OF M7.3 VERIFICATION');
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
  console.log('\nALL M7.3 TESTS PASSED');
  process.exit(0);
}
