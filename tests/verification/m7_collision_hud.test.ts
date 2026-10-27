import {
  collisionBadge,
  collisionCardModel,
  collisionSummary,
  genreCollisions,
  MAX_GALAXY_MARKERS,
  visibleCollisionMarkers,
} from '../../src/lib/layout/collisionModel';
import { getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';

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
console.log('SUITE M7.4: collision HUD models and markers');
console.log('================================================================');

// 1. Badges
assert(collisionBadge(8) === '∩ 8' && collisionBadge(1) === '∩ 1', 'badge "∩ n" when songs are shared');
assert(collisionBadge(0) === '≈', 'badge "≈" for affinity-only collisions');
assert(collisionSummary(1) === 'canción en común' && collisionSummary(4) === 'canciones en común', 'summary singular/plural');
assert(collisionSummary(0) === 'afinidad por colaboraciones y estilo', 'summary for affinity-only collisions');

for (const [name, data] of [['preset50', GALAXY_PRESET_50], ['preset300', GALAXY_PRESET_300]] as const) {
  const layout = getNebulaLayout(data);
  const art = layout.data.genres.find((g) => g.name.startsWith('ART ROCK'))!;

  // 2. genreCollisions
  const rows = genreCollisions(layout, art.id);
  const expected = layout.relations.filter((r) => r.a === art.id || r.b === art.id);
  assert(rows.length === expected.length && rows.length > 0, `${name}: one row per collision of the genre`, `${rows.length}`);
  assert(rows.every((r, i) => i === 0 || rows[i - 1].strength >= r.strength), `${name}: rows sorted by strength`);
  assert(rows.every((r) => r.otherGenreId !== art.id && (r.a === art.id || r.b === art.id)), `${name}: rows name the other genre`);
  assert(genreCollisions(layout, 'genre-missing').length === 0, `${name}: unknown genre → no rows`);

  // 3. collisionCardModel
  const top = rows[0];
  const card = collisionCardModel(layout, { a: top.a, b: top.b })!;
  const relation = layout.relations.find((r) => r.a === top.a && r.b === top.b)!;
  assert(card !== null && card.genres.map((g) => g.id).join() === [top.a, top.b].join(), `${name}: card lists both genres`);
  assert(/^[^×]+ × [^×]+$/.test(card.title) && !card.title.includes('&'), `${name}: short "A × B" title`, card.title);
  assert(card.sharedSongs === relation.sharedSongs, `${name}: card shows shared songs`);
  assert(
    card.bridgeSongs.map((s) => s.songId).join() === relation.bridgeSongIds.join() && card.bridgeSongs.every((s) => s.title && s.artistName),
    `${name}: bridge songs with title and artist`,
    JSON.stringify(card.bridgeSongs.map((s) => `${s.title}/${s.artistName}`))
  );
  assert(collisionCardModel(layout, null) === null && collisionCardModel(layout, { a: 'x', b: 'y' }) === null, `${name}: no card for null/unknown`);

  // 4. Marker visibility
  const cam: [number, number, number] = [0, 18, 52];
  const galaxy = visibleCollisionMarkers(layout.relations, cam, 'galaxy', art.id, null);
  assert(galaxy.length === Math.min(MAX_GALAXY_MARKERS, layout.relations.length), `${name}: galaxy view shows at most ${MAX_GALAXY_MARKERS} markers`);
  const dist = (p: number[]) => Math.hypot(p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]);
  const farthestShown = Math.max(...galaxy.map((r) => dist(r.contact)));
  const nearestHidden = Math.min(...layout.relations.filter((r) => !galaxy.includes(r)).map((r) => dist(r.contact)));
  assert(farthestShown <= nearestHidden, `${name}: galaxy markers are the nearest to the camera`);
  const sector = visibleCollisionMarkers(layout.relations, cam, 'sector', art.id, null);
  assert(sector.length === expected.length && sector.every((r) => r.a === art.id || r.b === art.id), `${name}: sector view shows the genre's collisions`);
  const collision = visibleCollisionMarkers(layout.relations, cam, 'collision', art.id, { a: top.a, b: top.b });
  assert(collision.length === 1 && collision[0] === relation, `${name}: collision view shows only the selected collision`);
  console.log(`    ↳ ${name}: ${card.title} · ${collisionBadge(card.sharedSongs)} · bridges: ${card.bridgeSongs.map((s) => s.title).join(', ')}`);
}

console.log('\n================================================================');
console.log('SUMMARY OF M7.4 VERIFICATION');
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
  console.log('\nALL M7.4 TESTS PASSED');
  process.exit(0);
}
