import { layoutForMode, useGalaxyStore } from '../../src/store/useGalaxyStore';
import { applyNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { buildMusicGalaxyFromPayload } from '../../src/lib/importers/libraryImporter';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../src/types/music';
import { SPLIT_ARTIST_PAYLOAD } from './fixtures/syntheticPayloads';

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

const positions = (d: MusicGalaxyData) =>
  JSON.stringify([d.genres.map((g) => g.position), d.artists.map((a) => a.position), d.songs.map((s) => s.position)]);
const store = useGalaxyStore;

console.log('================================================================');
console.log('SUITE M5.5: store applies the layout per rendererMode');
console.log('================================================================');

// 1. layoutForMode
assert(layoutForMode(GALAXY_PRESET_50, 'classic') === GALAXY_PRESET_50, 'layoutForMode: classic returns the dataset itself');
const nebula50 = layoutForMode(GALAXY_PRESET_50, 'nebula');
assert(layoutForMode(GALAXY_PRESET_50, 'nebula') === nebula50, 'layoutForMode: nebula result is cached (same reference)');
assert(positions(nebula50) === positions(applyNebulaLayout(GALAXY_PRESET_50)), 'layoutForMode: nebula positions match applyNebulaLayout');
assert(nebula50.links === GALAXY_PRESET_50.links, 'layoutForMode: links shared with the source dataset');

// 2. Classic mode is untouched (nebula is the default since M8.4: switch first, during the warp-in)
assert(store.getState().rendererMode === 'nebula', 'store: starts in nebula (M8.4 default)');
assert(store.getState().data === layoutForMode(GALAXY_PRESET_50, 'nebula'), 'store: initial data is the nebula layout');
store.getState().setRendererMode('classic');
let s = store.getState();
assert(s.rendererMode === 'classic', 'store: classic selected');
assert(s.data === GALAXY_PRESET_50 && s.baseData === GALAXY_PRESET_50, 'store: classic data is the preset object itself');

// 3. Switching to nebula: new positions, selection remapped by id, one camera reframe (after the warp-in)
store.getState().finishWarp();
store.getState().selectNode(GALAXY_PRESET_50.songs[7]);
const selectedId = store.getState().selectedNode!.id;
const flightBefore = store.getState().flightVersion;
store.getState().setRendererMode('nebula');
s = store.getState();
assert(s.data === nebula50, 'store: nebula data is the cached nebula layout');
assert(s.baseData === GALAXY_PRESET_50, 'store: baseData keeps the imported dataset');
assert(s.selectedNode?.id === selectedId, 'store: selectedNode keeps its id');
assert(
  JSON.stringify(s.selectedNode?.position) === JSON.stringify(nebula50.songs.find((n) => n.id === selectedId)!.position),
  'store: selectedNode carries its nebula position'
);
assert(s.data.songs.includes(s.selectedNode as never), 'store: selectedNode is the node object from data');
assert(s.flightVersion === flightBefore + 1, 'store: mode switch reframes the camera once');
assert(s.cameraMode === 'song', 'store: camera mode kept on switch');

// 4. Preset changes keep the mode and use the nebula layout
store.getState().setPresetScale(300);
s = store.getState();
assert(s.rendererMode === 'nebula' && s.baseData === GALAXY_PRESET_300, 'store: setPresetScale keeps nebula mode');
assert(s.data === layoutForMode(GALAXY_PRESET_300, 'nebula'), 'store: preset 300 rendered with nebula layout');
assert(s.data.artists.includes(s.selectedNode as never), 'store: default selection comes from the laid-out data');

// 5. Custom data (Spotify / JSON) also gets the layout and the selection remaps by id
const custom = buildMusicGalaxyFromPayload(SPLIT_ARTIST_PAYLOAD);
store.getState().loadCustomGalaxyData(custom, 'Split fixture');
s = store.getState();
assert(s.baseData === custom && s.data !== custom, 'store: custom data laid out in nebula mode');
const nova = s.data.artists.find((a) => a.id === 'artist-nova-split')!;
store.getState().selectNode(nova);
store.getState().setRendererMode('classic');
s = store.getState();
assert(
  s.selectedNode?.type === 'artist' && s.selectedNode.id === nova.id && s.selectedNode.genreId === nova.genreId,
  'store: selected artist remaps to the classic dataset'
);
assert(s.data === custom, 'store: back to classic restores the imported dataset');

// 6. Back to classic on a preset restores original positions exactly
store.getState().setPresetScale(150);
s = store.getState();
assert(s.data === GALAXY_PRESET_150 && positions(s.data) === positions(GALAXY_PRESET_150), 'store: classic preset positions restored');

console.log('\n================================================================');
console.log('SUMMARY OF M5.5 VERIFICATION');
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
  console.log('\nALL M5.5 TESTS PASSED');
  process.exit(0);
}
