import { classifyLibrary, SOFT_MAX_GENRES, UNCLASSIFIED_GENRE } from '../../src/lib/music/dynamicGenres';
import { artistTagProfile } from '../../src/lib/music/tagModel';
import { homogeneousLibrary, largeLibrary, unknownArtists, variedLibrary } from './fixtures/syntheticLibraries';
import { runClassification } from './fixtures/runClassification';

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
console.log('SUITE A2: dynamic genre clustering, names and bridges');
console.log('================================================================');

// 1. Varied libraries (8 styles), three seeds
for (const seed of [7, 21, 99]) {
  const lib = variedLibrary(seed);
  const r = runClassification(lib);
  const k = r.result.genres.length;
  assert(k >= 6 && k <= 10, `varied#${seed}: 6–10 nebulae for 8 styles`, `${k}`);
  assert(r.purity >= 0.9, `varied#${seed}: purity ≥ 0.9`, r.purity.toFixed(3));
  const genreOfStyle = (style: string) => new Set(lib.filter((a) => a.style === style).map((a) => r.result.artistGenre.get(a.id)));
  const cumbia = genreOfStyle('cumbia');
  assert([...genreOfStyle('hardrock')].every((g) => !cumbia.has(g)), `varied#${seed}: cumbia never shares a nebula with hard rock`);
  assert(r.bridgesOk >= r.bridgeSongs - 1, `varied#${seed}: bridge songs point to their second style`, `${r.bridgesOk}/${r.bridgeSongs}`);
  assert(r.falseBridges <= 1, `varied#${seed}: (almost) no false bridges`, `${r.falseBridges}`);
  console.log(`    ↳ varied#${seed}: ${k} nebulae · purity ${r.purity.toFixed(2)} · bridges ${r.bridgesOk}/${r.bridgeSongs} · ${r.result.genres.map((g) => g.name).join(' | ')}`);
}

// 2. Names: unique, upper case, two distinct parts at most, no repeated word
const varied = runClassification([...variedLibrary(7), ...unknownArtists()]);
const names = varied.result.genres.map((g) => g.name);
assert(new Set(names).size === names.length, 'names are unique');
assert(names.every((n) => n === n.toUpperCase() && n.length <= 40), 'names are upper case and short');
assert(
  names.every((n) => {
    const parts = n.split(' & ');
    if (parts.length > 2) return false;
    const words = parts.map((p) => new Set(p.split(' ')));
    return parts.length < 2 || ![...words[1]].some((w) => words[0].has(w));
  }),
  'at most two name parts, never repeating a word',
  JSON.stringify(names)
);

// 3. Artists without data → OTRAS ÓRBITAS, never a random genre
const unknownIds = unknownArtists().map((a) => a.id);
assert(unknownIds.every((id) => varied.result.artistGenre.get(id) === UNCLASSIFIED_GENRE), 'artists without data go to OTRAS ÓRBITAS');
assert(varied.result.genres.find((g) => g.name === UNCLASSIFIED_GENRE)?.artistIds.length === unknownIds.length, 'OTRAS ÓRBITAS holds only untagged artists');

// 4. Homogeneous library: few nebulae
const homog = runClassification(homogeneousLibrary());
assert(homog.result.genres.length >= 1 && homog.result.genres.length <= 3, 'homogeneous electronic library → 1–3 nebulae', `${homog.result.genres.length}`);

// 5. Determinism
const a = runClassification(variedLibrary(7));
const b = runClassification(variedLibrary(7));
assert(
  JSON.stringify(a.result.genres) === JSON.stringify(b.result.genres) &&
    JSON.stringify([...a.result.songSecondaryGenre]) === JSON.stringify([...b.result.songSecondaryGenre]),
  'deterministic'
);

// 6. Time budget and quality at scale
const large = largeLibrary();
const songs = large.reduce((s, x) => s + x.songs.length, 0);
const big = runClassification(large);
assert(songs >= 3000, 'large library has ≥ 3000 songs', `${songs}`);
assert(big.ms < 300, 'large library classified in < 300 ms', `${big.ms.toFixed(0)} ms`);
assert(big.purity >= 0.9, 'large library purity ≥ 0.9', big.purity.toFixed(3));
console.log(`    ↳ large: ${large.length} artists · ${songs} songs · ${big.result.genres.length} nebulae · ${big.ms.toFixed(0)} ms`);

// 7. Soft cap: 45 unrelated styles collapse to ≤ SOFT_MAX_GENRES
const many = Array.from({ length: 45 }, (_, i) => ({
  id: `style${i}`,
  songCount: 4,
  profile: artistTagProfile({ artistTags: [{ name: `genre number ${i}`, weight: 100 }, { name: 'shared scene', weight: 30 }] }),
}));
const capped = classifyLibrary({ artists: many, songs: [] });
assert(capped.genres.length <= SOFT_MAX_GENRES, `45 unrelated styles → ≤ ${SOFT_MAX_GENRES} nebulae`, `${capped.genres.length}`);

// 8. Tiny groups join a similar one; isolated ones stay
const tiny = classifyLibrary({
  artists: [
    { id: 'big1', songCount: 6, profile: artistTagProfile({ artistTags: [{ name: 'shoegaze', weight: 100 }, { name: 'dream pop', weight: 60 }] }) },
    { id: 'big2', songCount: 6, profile: artistTagProfile({ artistTags: [{ name: 'shoegaze', weight: 100 }] }) },
    { id: 'small', songCount: 1, profile: artistTagProfile({ artistTags: [{ name: 'noise pop', weight: 100 }, { name: 'shoegaze', weight: 50 }] }) },
    { id: 'alone', songCount: 1, profile: artistTagProfile({ artistTags: [{ name: 'gregorian chant', weight: 100 }] }) },
  ],
  songs: [],
});
assert(tiny.artistGenre.get('small') === tiny.artistGenre.get('big1'), 'a 1-song artist sharing tags joins the similar nebula');
assert(tiny.artistGenre.get('alone') !== tiny.artistGenre.get('big1'), 'an isolated style keeps its own nebula');

// 9. Empty inputs
assert(classifyLibrary({ artists: [], songs: [] }).genres.length === 0, 'empty library → no nebulae');
const allUnknown = classifyLibrary({ artists: unknownArtists().map((x) => ({ id: x.id, songCount: 1, profile: [] })), songs: [] });
assert(allUnknown.genres.length === 1 && allUnknown.genres[0].name === UNCLASSIFIED_GENRE, 'only untagged artists → one OTRAS ÓRBITAS nebula');

console.log('\n================================================================');
console.log('SUMMARY OF A2 VERIFICATION');
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
  console.log('\nALL A2 TESTS PASSED');
  process.exit(0);
}
