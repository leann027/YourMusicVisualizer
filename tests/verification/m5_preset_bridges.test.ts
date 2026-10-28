import {
  ARTIST_DATABASE,
  GALAXY_PRESET_50,
  GALAXY_PRESET_150,
  GALAXY_PRESET_300,
  PRESET_50_PAYLOAD,
  PRESET_150_PAYLOAD,
  PRESET_300_PAYLOAD,
} from '../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../src/types/music';
import { RawLibraryPayload } from '../../src/lib/importers/libraryImporter';

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

// Genre pairs (sorted ids) with the number of songs bridging them
function bridgePairs(data: MusicGalaxyData): Map<string, number> {
  const pairs = new Map<string, number>();
  for (const s of data.songs) {
    if (!s.secondaryGenreId) continue;
    const key = [s.genreId, s.secondaryGenreId].sort().join('|');
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  return pairs;
}

console.log('================================================================');
console.log('SUITE M5.2b: curated secondary genres in presets');
console.log('================================================================');

const presets: [string, RawLibraryPayload, MusicGalaxyData, number][] = [
  ['preset50', PRESET_50_PAYLOAD, GALAXY_PRESET_50, 6],
  ['preset150', PRESET_150_PAYLOAD, GALAXY_PRESET_150, 10],
  ['preset300', PRESET_300_PAYLOAD, GALAXY_PRESET_300, 10],
];

for (const [name, payload, data, minPairs] of presets) {
  // 1. Every song whose secondary genre exists as a nebula gets a valid secondaryGenreId
  const genreNames = new Set(data.genres.map((g) => g.name));
  const curatedTitles = new Set(
    payload.tracks.filter((t) => t.secondaryGenre && genreNames.has(t.secondaryGenre.toUpperCase())).map((t) => `${t.artist}::${t.title}`)
  );
  const resolvedTitles = new Set(
    data.songs
      .filter((s) => s.secondaryGenreId)
      .map((s) => `${data.artists.find((a) => a.id === s.artistId)?.name}::${s.title}`)
  );
  const missing = [...curatedTitles].filter((k) => !resolvedTitles.has(k));
  assert(missing.length === 0, `${name}: curated bridge tracks resolve to secondaryGenreId`, missing.join(', '));

  // 2. Enough genre pairs with >= 2 shared songs for M5.3 (minShared = 2)
  const pairs = bridgePairs(data);
  const strong = [...pairs.values()].filter((n) => n >= 2).length;
  assert(strong >= minPairs, `${name}: >= ${minPairs} genre pairs with >= 2 bridge songs`, `got ${strong}`);
  const short = (id: string) => data.genres.find((g) => g.id === id)!.name.split(/[ ,&]/)[0];
  console.log(
    `    ↳ ${name}: ${[...pairs].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k.split('|').map(short).join('×')}:${n}`).join(' ')}`
  );
}

// 3. Every curated value in the seeds names an existing preset nebula (catches typos).
// Read from the seeds: the importer writes classifier secondaries back into payload tracks.
const allGenreNames = new Set(GALAXY_PRESET_300.genres.map((g) => g.name));
const curated = ARTIST_DATABASE.flatMap((a) => a.tracks.filter((t) => t.secondaryGenre).map((t) => ({ ...t, artist: a.name, genre: a.genre })));
const typos = curated.filter((t) => !allGenreNames.has(t.secondaryGenre!.toUpperCase()));
const selfBridges = curated.filter((t) => t.secondaryGenre === t.genre);
assert(curated.length === 27, 'seeds: 27 curated bridge tracks', `got ${curated.length}`);
assert(typos.length === 0, 'seeds: every curated secondaryGenre names an existing nebula', typos.map((t) => t.title).join(', '));
assert(selfBridges.length === 0, 'seeds: no curated bridge points to its own genre', selfBridges.map((t) => t.title).join(', '));

// 4. Preset 300 variations inherit their base track's secondary genre
const variations = PRESET_300_PAYLOAD.tracks.filter((t) => t.title.startsWith('Nightcall ('));
assert(
  variations.length > 0 && variations.every((t) => t.secondaryGenre === 'CYBERPUNK & ELECTRO-POP'),
  'preset300: variations inherit curated secondaryGenre',
  `variations: ${variations.length}`
);

console.log('\n================================================================');
console.log('SUMMARY OF M5.2b VERIFICATION');
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
  console.log('\nALL M5.2b TESTS PASSED');
  process.exit(0);
}
