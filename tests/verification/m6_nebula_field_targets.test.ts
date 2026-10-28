import { computeNebulaFieldTargets, DEFAULT_STELLAR_BRIGHTNESS } from '../../src/components/canvas/nebulaV3/nebulaFieldTargets';
import { buildNebulaFieldGeometry, NEBULA_FIELD_DENSITY, NEBULA_KIND } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { computeNebulaLayout, getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { layoutForMode } from '../../src/store/useGalaxyStore';
import { GALAXY_PRESET_150 } from '../../src/data/galaxyPresets';

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
console.log('SUITE M6.3: NebulaField uniform targets and shared layout cache');
console.log('================================================================');

// 1. Shared layout cache
const layout = getNebulaLayout(GALAXY_PRESET_150);
assert(getNebulaLayout(GALAXY_PRESET_150) === layout, 'getNebulaLayout returns the cached result');
assert(layoutForMode(GALAXY_PRESET_150, 'nebula') === layout.data, 'store nebula data is the cached layout data');
assert(
  JSON.stringify(computeNebulaLayout(GALAXY_PRESET_150)) === JSON.stringify(layout),
  'cached layout equals a fresh computeNebulaLayout'
);

const field = buildNebulaFieldGeometry(layout, NEBULA_FIELD_DENSITY.full);
const particleCount = field.geometry.getAttribute('position').count;
const base = {
  data: layout.data,
  genreIds: field.genreIds,
  particleCount,
  stellarBrightness: DEFAULT_STELLAR_BRIGHTNESS,
  minAffinityFilter: 0,
  selectedSectorId: null,
  selectedNode: null,
  cameraMode: 'galaxy',
  playingTrackId: null,
};

// 2. Neutral state
const idle = computeNebulaFieldTargets(base);
assert(idle.focusGid === -1 && idle.focusAmt === 0, 'no selection: no genre focus');
assert(idle.artistAid === -1 && idle.artistAmt === 0, 'no selection: no artist focus');
assert(idle.playingGid === -1, 'nothing playing: playingGid -1');
// the gas look was calibrated with 32,200 field particles (M6.4); the field now has 85% of 35k
assert(Math.abs(idle.gain - Math.sqrt(32200 / particleCount)) < 1e-9 && idle.gain > 1, 'default brightness: gain compensates the smaller field (√(32200/n))', idle.gain.toFixed(3));

// 3. Genre focus
const genre = layout.data.genres[4];
const sector = computeNebulaFieldTargets({ ...base, selectedSectorId: genre.id, selectedNode: genre, cameraMode: 'sector' });
assert(sector.focusGid === 4 && sector.focusAmt === 1, 'sector selected: focus on its gid', JSON.stringify(sector));
const galaxyView = computeNebulaFieldTargets({ ...base, selectedSectorId: genre.id, cameraMode: 'galaxy' });
assert(galaxyView.focusGid === 4 && galaxyView.focusAmt === 0, 'galaxy view keeps gid but fades focus out');

// 4. Artist focus matches the dust aid of the geometry
const artist = layout.data.artists.filter((a) => a.genreId === genre.id)[2];
const artistT = computeNebulaFieldTargets({ ...base, selectedSectorId: genre.id, selectedNode: artist, cameraMode: 'artist' });
assert(artistT.artistAid === 2 && artistT.artistAmt === 1, 'artist selected: aid = index inside its genre', JSON.stringify(artistT));
const gidArr = field.geometry.getAttribute('gid').array as Float32Array;
const aidArr = field.geometry.getAttribute('aid').array as Float32Array;
const kindArr = field.geometry.getAttribute('kind').array as Float32Array;
const anchorArr = field.geometry.getAttribute('anchor').array as Float32Array;
let matching = 0;
let wrongAnchor = 0;
for (let i = 0; i < gidArr.length; i++) {
  if (kindArr[i] !== NEBULA_KIND.dust || gidArr[i] !== artistT.focusGid || aidArr[i] !== artistT.artistAid) continue;
  matching++;
  if (Math.hypot(anchorArr[i * 3] - artist.position[0], anchorArr[i * 3 + 1] - artist.position[1], anchorArr[i * 3 + 2] - artist.position[2]) > 1e-4) wrongAnchor++;
}
assert(matching > 0 && wrongAnchor === 0, 'dust with that gid/aid is anchored to the selected artist', `${matching} particles, ${wrongAnchor} wrong`);
const song = layout.data.songs.find((s) => s.genreId === genre.id)!;
const songT = computeNebulaFieldTargets({ ...base, selectedSectorId: genre.id, selectedNode: song, cameraMode: 'song' });
assert(songT.artistAmt === 0 && songT.focusAmt === 1, 'song selected: genre focus, no artist dimming');

// 5. Playing genre, brightness and affinity
const played = layout.data.songs.find((s) => s.genreId === layout.data.genres[7].id)!;
assert(computeNebulaFieldTargets({ ...base, playingTrackId: played.id }).playingGid === 7, 'playing song → its genre gid');
assert(computeNebulaFieldTargets({ ...base, playingTrackId: 'missing' }).playingGid === -1, 'unknown playing id → -1');
const bright = computeNebulaFieldTargets({ ...base, stellarBrightness: 0.5 });
assert(Math.abs(bright.gain / idle.gain - 2) < 1e-9, 'gain proportional to stellarBrightness');
const sparse = computeNebulaFieldTargets({ ...base, particleCount: particleCount / 4 });
assert(Math.abs(sparse.gain / idle.gain - 2) < 1e-9, 'gain compensates fewer particles by √(ratio)');
assert(computeNebulaFieldTargets({ ...base, minAffinityFilter: 0.9 }).minAffinity === 0.9, 'minAffinity passed through');

field.geometry.dispose();

console.log('\n================================================================');
console.log('SUMMARY OF M6.3 VERIFICATION');
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
  console.log('\nALL M6.3 TESTS PASSED');
  process.exit(0);
}
