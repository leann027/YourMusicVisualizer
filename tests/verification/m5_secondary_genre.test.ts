import { buildMusicGalaxyFromPayload, SAMPLE_STREAMING_PAYLOAD } from '../../src/lib/importers/libraryImporter';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../src/types/music';
import { SECONDARY_GENRE_PAYLOAD } from './fixtures/syntheticPayloads';

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
console.log('SUITE M5.2: SongNode.secondaryGenreId');
console.log('================================================================');

const datasets: Record<string, MusicGalaxyData> = {
  preset50: GALAXY_PRESET_50,
  preset150: GALAXY_PRESET_150,
  preset300: GALAXY_PRESET_300,
  sampleStreaming: buildMusicGalaxyFromPayload(SAMPLE_STREAMING_PAYLOAD),
};

// 1. Every secondaryGenreId points to an existing genre different from the primary one
for (const [name, data] of Object.entries(datasets)) {
  const genreIds = new Set(data.genres.map((g) => g.id));
  const withSecondary = data.songs.filter((s) => s.secondaryGenreId);
  const invalid = withSecondary.filter((s) => !genreIds.has(s.secondaryGenreId!) || s.secondaryGenreId === s.genreId);
  assert(invalid.length === 0, `${name}: secondaryGenreId always valid and != genreId`, invalid.map((s) => s.id).join(', '));

  // Coverage report for M5.3 (how many cross-genre songs and genre pairs the data offers)
  const pairs = new Map<string, number>();
  for (const s of withSecondary) {
    const key = [s.genreId, s.secondaryGenreId].sort().join(' × ');
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }
  const pairsWith2 = [...pairs.values()].filter((n) => n >= 2).length;
  console.log(
    `    ↳ ${name}: ${withSecondary.length}/${data.songs.length} songs with secondaryGenreId · ${pairs.size} genre pairs · ${pairsWith2} pairs with ≥2 songs`
  );
}

// 2. Synthetic cases
const synthetic = buildMusicGalaxyFromPayload(SECONDARY_GENRE_PAYLOAD);
const byTitle = (title: string) => synthetic.songs.find((s) => s.title === title);
const jazz = synthetic.genres.find((g) => g.name === 'JAZZ FUSION');
assert(Boolean(jazz), 'synthetic: JAZZ FUSION genre exists');
assert(byTitle('Bridge Song')?.secondaryGenreId === jazz?.id, 'synthetic: cross-genre secondary resolves to genre id', `got ${byTitle('Bridge Song')?.secondaryGenreId}`);
assert(byTitle('Home Song')?.secondaryGenreId === undefined, 'synthetic: song tagged only with its own style is no bridge');
assert(byTitle('Lost Song')?.secondaryGenreId === undefined, 'synthetic: song tagged with a style no nebula has is no bridge');
assert(
  byTitle('Plain Song') !== undefined && byTitle('Plain Song')!.secondaryGenreId !== byTitle('Plain Song')!.genreId,
  'synthetic: song without explicit secondary never points to its own genre'
);

console.log('\n================================================================');
console.log('SUMMARY OF M5.2 VERIFICATION');
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
  console.log('\nALL M5.2 TESTS PASSED');
  process.exit(0);
}
