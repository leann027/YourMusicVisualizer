import fs from 'node:fs';
import path from 'node:path';
import { buildMusicGalaxyFromPayload, SAMPLE_STREAMING_PAYLOAD } from '../../src/lib/importers/libraryImporter';
import { applyClassicLayout } from '../../src/lib/layout/classicLayout';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../src/types/music';
import { PositionSnapshot, snapshotPositions } from './fixtures/generateClassicPositions';
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

// Returns the first differing entry (or null) between two position snapshots
function firstDifference(expected: PositionSnapshot, actual: PositionSnapshot): string | null {
  for (const kind of ['genres', 'artists', 'songs'] as const) {
    const exp = expected[kind];
    const act = actual[kind];
    if (exp.length !== act.length) return `${kind}: length ${act.length} != ${exp.length}`;
    for (let i = 0; i < exp.length; i++) {
      if (JSON.stringify(exp[i]) !== JSON.stringify(act[i])) {
        return `${kind}[${i}]: ${JSON.stringify(act[i])} != ${JSON.stringify(exp[i])}`;
      }
    }
  }
  return null;
}

const allFinite = (data: MusicGalaxyData) =>
  [...data.genres, ...data.artists, ...data.songs].every((n) => n.position.every(Number.isFinite));

const fixture: Record<string, PositionSnapshot> = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'classic_positions.json'), 'utf8')
);

const datasets: Record<string, MusicGalaxyData> = {
  preset50: GALAXY_PRESET_50,
  preset150: GALAXY_PRESET_150,
  preset300: GALAXY_PRESET_300,
  sampleStreaming: buildMusicGalaxyFromPayload(SAMPLE_STREAMING_PAYLOAD),
  splitArtist: buildMusicGalaxyFromPayload(SPLIT_ARTIST_PAYLOAD),
};

console.log('================================================================');
console.log('SUITE M5.1: classic layout extracted to src/lib/layout/classicLayout.ts');
console.log('================================================================');

for (const [name, data] of Object.entries(datasets)) {
  // 1. Importer output matches the pre-refactor snapshot exactly
  const diff = firstDifference(fixture[name], snapshotPositions(data));
  assert(diff === null, `${name}: positions identical to pre-refactor fixture`, diff ?? '');

  // 2. No NaN / Infinity
  assert(allFinite(data), `${name}: all positions finite`);

  // 3. applyClassicLayout is idempotent and does not mutate its input
  const before = JSON.stringify(data);
  const relaid = applyClassicLayout(data);
  assert(JSON.stringify(data) === before, `${name}: applyClassicLayout does not mutate input`);
  assert(relaid !== data && relaid.songs !== data.songs, `${name}: applyClassicLayout returns new arrays`);
  assert(
    firstDifference(snapshotPositions(data), snapshotPositions(relaid)) === null,
    `${name}: applyClassicLayout is idempotent`
  );
  assert(relaid.links === data.links, `${name}: links are passed through untouched`);
}

// 4. Layout recomputes positions from scratch (does not just copy them)
const zeroed: MusicGalaxyData = {
  ...GALAXY_PRESET_150,
  genres: GALAXY_PRESET_150.genres.map((g) => ({ ...g, position: [0, 0, 0] })),
  artists: GALAXY_PRESET_150.artists.map((a) => ({ ...a, position: [0, 0, 0] })),
  songs: GALAXY_PRESET_150.songs.map((s) => ({ ...s, position: [0, 0, 0] })),
};
assert(
  firstDifference(fixture.preset150, snapshotPositions(applyClassicLayout(zeroed))) === null,
  'preset150: layout from zeroed positions reproduces fixture'
);

// 5. Split-artist edge case: same artist id in two genres keeps two distinct placements
const split = datasets.splitArtist;
const novaNodes = split.artists.filter((a) => a.id === 'artist-nova-split');
assert(novaNodes.length === 2, 'splitArtist: artist appears in two genres', `got ${novaNodes.length}`);
assert(
  novaNodes.length === 2 && JSON.stringify(novaNodes[0].position) !== JSON.stringify(novaNodes[1].position),
  'splitArtist: each genre copy has its own position'
);

console.log('\n================================================================');
console.log('SUMMARY OF M5.1 VERIFICATION');
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
  console.log('\nALL M5.1 TESTS PASSED');
  process.exit(0);
}
