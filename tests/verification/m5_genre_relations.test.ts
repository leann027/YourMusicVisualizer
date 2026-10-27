import { computeGenreRelations, GenreRelation } from '../../src/lib/layout/genreRelations';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { ArtistNode, GenreNode, MusicGalaxyData, MusicLink, SongNode } from '../../src/types/music';

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

// ---------- synthetic galaxy ----------
const genre = (id: string): GenreNode => ({
  id, type: 'genre', name: id.toUpperCase(), color: '#fff', accentColor: '#000',
  position: [0, 0, 0], songCount: 0, affinity: 0.9, description: '',
});
const artist = (id: string, genreId: string, tags: string[] = []): ArtistNode => ({
  id, type: 'artist', genreId, name: id, songCount: 1, affinity: 0.9, position: [0, 0, 0],
  catalogCode: 'ST-XX-100', origin: '', bio: '', sleeveBg: '#000', sleeveAccent: '#fff', tags,
});
const song = (id: string, artistId: string, genreId: string, affinity: number, secondaryGenreId?: string): SongNode => ({
  id, type: 'song', artistId, genreId, title: id, album: '', duration: 200, affinity,
  position: [0, 0, 0], secondaryGenreId,
});
const influence = (source: string, target: string): MusicLink => ({ source, target, strength: 0.8, type: 'influence' });

// g-a × g-b: 4 bridge songs (relation by songs, bridge list capped at 3)
// g-c × g-d: 4 cross-genre influence links × 0.5, no songs (relation by influence only)
// g-a × g-e: 1 bridge song (below minShared = 2)
// g-b × g-c: only the backbone ring (must not create a relation)
// g-d × g-e: 12 artist pairs sharing a tag → capped at 2 (relation by tags only)
const synthetic: MusicGalaxyData = {
  genres: ['g-a', 'g-b', 'g-c', 'g-d', 'g-e'].map(genre),
  artists: [
    artist('ar-a', 'g-a'), artist('ar-b', 'g-b'), artist('ar-c', 'g-c'), artist('ar-c2', 'g-c'), artist('ar-d', 'g-d'),
    ...Array.from({ length: 3 }, (_, i) => artist(`ar-d-tag${i}`, 'g-d', ['dub'])),
    ...Array.from({ length: 4 }, (_, i) => artist(`ar-e-tag${i}`, 'g-e', ['Dub'])),
  ],
  songs: [
    song('s1', 'ar-a', 'g-a', 0.7, 'g-b'),
    song('s2', 'ar-a', 'g-a', 0.95, 'g-b'),
    song('s3', 'ar-b', 'g-b', 0.8, 'g-a'),
    song('s4', 'ar-b', 'g-b', 0.8, 'g-a'),
    song('s5', 'ar-a', 'g-a', 0.9, 'g-e'),
    song('s6', 'ar-c', 'g-c', 0.9),
  ],
  links: [
    influence('g-b', 'g-c'), // backbone ring
    influence('ar-c', 'g-d'), // artist → secondary genre
    influence('ar-c2', 'ar-d'), // artist ↔ artist (collab / TF-IDF)
    influence('ar-c', 'ar-d'),
    influence('ar-c2', 'g-d'),
    influence('ar-a', 'ar-a'), // self link, ignored
    { source: 'ar-a', target: 's1', strength: 1, type: 'artist-song' },
  ],
};

const find = (rels: GenreRelation[], x: string, y: string) =>
  rels.find((r) => (r.a === x && r.b === y) || (r.a === y && r.b === x));

console.log('================================================================');
console.log('SUITE M5.3: computeGenreRelations');
console.log('================================================================');

const rels = computeGenreRelations(synthetic);
const ab = find(rels, 'g-a', 'g-b');
assert(ab?.sharedSongs === 4 && ab.strength === 4, 'synthetic: relation by songs (sharedSongs 4)', JSON.stringify(ab));
assert(JSON.stringify(ab?.bridgeSongIds) === JSON.stringify(['s2', 's3', 's4']), 'synthetic: bridges capped at 3, by affinity then id', JSON.stringify(ab?.bridgeSongIds));
const cd = find(rels, 'g-c', 'g-d');
assert(cd?.sharedSongs === 0 && cd.strength === 2 && cd.bridgeSongIds.length === 0, 'synthetic: relation by influence links only', JSON.stringify(cd));
assert(!find(rels, 'g-a', 'g-e'), 'synthetic: 1 shared song stays below minShared = 2');
assert(!find(rels, 'g-b', 'g-c'), 'synthetic: backbone ring alone creates no relation');
const de = find(rels, 'g-d', 'g-e');
assert(de?.strength === 2 && de.sharedSongs === 0, 'synthetic: shared tags capped at 2 (case-insensitive)', JSON.stringify(de));
assert(rels.length === 3, 'synthetic: exactly 3 relations', `got ${rels.length}`);
assert(rels.every((r) => r.a < r.b), 'synthetic: pairs ordered a < b');
assert(rels[0] === ab, 'synthetic: sorted by strength desc');

const loose = computeGenreRelations(synthetic, 1);
assert(Boolean(find(loose, 'g-a', 'g-e')), 'synthetic: minShared = 1 includes the weak pair');
assert(computeGenreRelations(synthetic, 5).length === 0, 'synthetic: minShared = 5 filters every pair');

// ---------- presets ----------
const presets: [string, MusicGalaxyData, number][] = [
  ['preset50', GALAXY_PRESET_50, 7],
  ['preset150', GALAXY_PRESET_150, 12],
  ['preset300', GALAXY_PRESET_300, 12],
];

for (const [name, data, minRelations] of presets) {
  const r = computeGenreRelations(data);
  const genreIds = new Set(data.genres.map((g) => g.id));
  const songById = new Map(data.songs.map((s) => [s.id, s]));
  const keys = r.map((x) => `${x.a}|${x.b}`);

  assert(r.length >= minRelations, `${name}: >= ${minRelations} relations`, `got ${r.length}`);
  assert(r.every((x) => x.a !== x.b && genreIds.has(x.a) && genreIds.has(x.b)), `${name}: valid, non-self pairs`);
  assert(new Set(keys).size === keys.length, `${name}: no duplicated pairs`);
  assert(
    r.every((x) =>
      x.bridgeSongIds.length <= 3 &&
      x.bridgeSongIds.every((id) => {
        const s = songById.get(id);
        return Boolean(s) && [s!.genreId, s!.secondaryGenreId].sort().join('|') === [x.a, x.b].sort().join('|');
      })
    ),
    `${name}: bridge songs belong to their pair (max 3)`
  );
  assert(JSON.stringify(computeGenreRelations(data)) === JSON.stringify(r), `${name}: deterministic`);
  assert(r.every((x) => Number.isFinite(x.strength) && x.strength >= 2), `${name}: strength finite and >= minShared`);

  const short = (id: string) => data.genres.find((g) => g.id === id)!.name.split(/[ ,&]/)[0];
  console.log(
    `    ↳ ${name}: ${r.map((x) => `${short(x.a)}×${short(x.b)} s${x.strength}/∩${x.sharedSongs}`).join('  ')}`
  );
}

console.log('\n================================================================');
console.log('SUMMARY OF M5.3 VERIFICATION');
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
  console.log('\nALL M5.3 TESTS PASSED');
  process.exit(0);
}
