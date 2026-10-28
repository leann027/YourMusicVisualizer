import { buildMusicGalaxyFromPayload, getDynamicSectorPlacement, RawLibraryPayload } from '../../src/lib/importers/libraryImporter';
import { computeGenreRelations } from '../../src/lib/layout/genreRelations';
import { UNCLASSIFIED_GENRE } from '../../src/lib/music/dynamicGenres';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300, PRESET_300_PAYLOAD } from '../../src/data/galaxyPresets';
import { MusicGalaxyData } from '../../src/types/music';

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

const genreOf = (d: MusicGalaxyData, artist: string) => {
  const a = d.artists.find((x) => x.name === artist);
  return d.genres.find((g) => g.id === a?.genreId)?.name;
};

console.log('================================================================');
console.log('SUITE A3: dynamic classification in the importer and presets');
console.log('================================================================');

// 1. Presets: recognisable nebulae and enough collisions
const families: string[][] = [
  ['Daft Punk', 'Justice'],
  ['Kavinsky', 'The Midnight'],
  ['Cocteau Twins', 'Slowdive', 'My Bloody Valentine'],
  ['Massive Attack', 'Portishead', 'Tricky'],
  ['YOASOBI', 'RADWIMPS', 'King Gnu', 'Kenshi Yonezu'],
  ['Aphex Twin', 'Boards of Canada'],
  ['Explosions in the Sky', 'Sigur Rós', 'Max Richter'],
  ['Flume', 'ODESZA', 'Porter Robinson'],
  ['Soda Stereo', 'Gustavo Cerati', 'Babasónicos'],
];
for (const [name, data, minNebulae, maxNebulae, minRelations] of [
  ['preset50', GALAXY_PRESET_50, 10, 14, 6],
  ['preset150', GALAXY_PRESET_150, 10, 16, 10],
  ['preset300', GALAXY_PRESET_300, 10, 16, 10],
] as const) {
  assert(data.genres.length >= minNebulae && data.genres.length <= maxNebulae, `${name}: ${minNebulae}–${maxNebulae} nebulae`, `${data.genres.length}`);
  const split = families.filter((f) => new Set(f.map((a) => genreOf(data, a))).size !== 1);
  assert(split.length === 0, `${name}: artists of the same style share a nebula`, split.map((f) => f.join('/')).join(' · '));
  assert(genreOf(data, 'Soda Stereo') !== genreOf(data, 'Daft Punk') && genreOf(data, 'YOASOBI') !== genreOf(data, 'Massive Attack'), `${name}: different styles stay apart`);
  const strong = computeGenreRelations(data).filter((r) => r.sharedSongs >= 2).length;
  assert(strong >= minRelations, `${name}: ≥ ${minRelations} collisions with ≥ 2 shared songs`, `${strong}`);
  assert(new Set(data.artists.map((a) => a.id)).size === data.artists.length, `${name}: one node per artist (no duplicated ids)`);
  assert(data.genres.every((g) => g.name !== UNCLASSIFIED_GENRE), `${name}: every curated artist classified`);
  console.log(`    ↳ ${name}: ${data.genres.length} nebulae · ${strong} collisions · ${data.genres.map((g) => g.name).join(' | ')}`);
}

// 2. The importer no longer writes into the payload it receives
const before = JSON.stringify(PRESET_300_PAYLOAD.tracks.slice(0, 20));
buildMusicGalaxyFromPayload(PRESET_300_PAYLOAD);
assert(JSON.stringify(PRESET_300_PAYLOAD.tracks.slice(0, 20)) === before, 'payload tracks are not mutated');

// 3. JSON without tags: keyword classifier as a weak prior, unknowns to OTRAS ÓRBITAS (never random)
const untagged: RawLibraryPayload = {
  source: 'custom-json',
  tracks: [
    { title: 'De Música Ligera', artist: 'Soda Stereo' },
    { title: 'Persiana Americana', artist: 'Soda Stereo' },
    { title: 'Prófugos', artist: 'Soda Stereo' },
    { title: 'Song A', artist: 'Zzyzx Unknown Band' },
    { title: 'Song B', artist: 'Qwerty Nobody' },
  ],
};
const u = buildMusicGalaxyFromPayload(untagged);
const unknownGenre = genreOf(u, 'Zzyzx Unknown Band');
assert(unknownGenre === UNCLASSIFIED_GENRE && genreOf(u, 'Qwerty Nobody') === UNCLASSIFIED_GENRE, 'artists with no data and no keyword match → OTRAS ÓRBITAS', `${unknownGenre}`);
assert(genreOf(u, 'Soda Stereo') !== UNCLASSIFIED_GENRE, 'known artist without tags classified by keywords', `${genreOf(u, 'Soda Stereo')}`);
const again = buildMusicGalaxyFromPayload(untagged);
assert(JSON.stringify(again.genres.map((g) => g.name)) === JSON.stringify(u.genres.map((g) => g.name)), 'classification deterministic');

// 4. An artist with songs in two styles lands in one nebula
const twoStyles: RawLibraryPayload = {
  source: 'spotify',
  tracks: [
    ...['a', 'b', 'c'].map((t) => ({ title: `Techno ${t}`, artist: 'Shapeshifter', trackTags: [{ name: 'techno', weight: 100 }] })),
    { title: 'Jazz detour', artist: 'Shapeshifter', trackTags: [{ name: 'jazz', weight: 100 }] },
    ...['a', 'b', 'c'].map((t) => ({ title: `Jazz ${t}`, artist: 'Trio Azul', trackTags: [{ name: 'jazz', weight: 100 }] })),
  ],
};
const t = buildMusicGalaxyFromPayload(twoStyles);
assert(t.artists.filter((a) => a.name === 'Shapeshifter').length === 1, 'artist with two styles has a single node');
const detour = t.songs.find((s) => s.title === 'Jazz detour')!;
assert(Boolean(detour.secondaryGenreId) && detour.secondaryGenreId === t.genres.find((g) => g.name === genreOf(t, 'Trio Azul'))?.id, 'its off-style song bridges to the other nebula');

// 5. More nebulae than the palette: distinct colours
const colours = Array.from({ length: 40 }, (_, i) => getDynamicSectorPlacement(i, 40, '').color);
assert(new Set(colours).size === 40, 'palette extends beyond 21 nebulae with distinct colours');
assert(colours.slice(21).every((c) => /^#[0-9A-F]{6}$/.test(c)), 'extra colours are valid hex');

console.log('\n================================================================');
console.log('SUMMARY OF A3 VERIFICATION');
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
  console.log('\nALL A3 TESTS PASSED');
  process.exit(0);
}
