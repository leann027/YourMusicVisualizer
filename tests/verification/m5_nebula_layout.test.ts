import { applyNebulaLayout, computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
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

type Vec3 = [number, number, number];
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const ids = (d: MusicGalaxyData) =>
  JSON.stringify([d.genres.map((g) => g.id), d.artists.map((a) => `${a.genreId}/${a.id}`), d.songs.map((s) => s.id)]);

// Minimum distance over node pairs matching `kind` (O(n²), fine for ≤ 400 nodes)
interface Placed {
  kind: 'genre' | 'artist' | 'song';
  id: string;
  genreId: string;
  p: Vec3;
}
function minDistance(nodes: Placed[], match: (a: Placed, b: Placed) => boolean): [number, string] {
  let best: [number, string] = [Infinity, ''];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (!match(nodes[i], nodes[j])) continue;
      const d = dist(nodes[i].p, nodes[j].p);
      if (d < best[0]) best = [d, `${nodes[i].id} ~ ${nodes[j].id}`];
    }
  }
  return best;
}

console.log('================================================================');
console.log('SUITE M5.4b: nebula layout nodes, bridge songs and relations');
console.log('================================================================');

const datasets: [string, MusicGalaxyData][] = [
  ['preset50', GALAXY_PRESET_50],
  ['preset150', GALAXY_PRESET_150],
  ['preset300', GALAXY_PRESET_300],
  ['splitArtist', buildMusicGalaxyFromPayload(SPLIT_ARTIST_PAYLOAD)],
];

for (const [name, input] of datasets) {
  const before = JSON.stringify(input);
  const { data, cores, relations } = computeNebulaLayout(input);
  const again = computeNebulaLayout(input);

  // 1. Purity, determinism and structure
  assert(JSON.stringify(input) === before, `${name}: input not mutated`);
  assert(JSON.stringify(again) === JSON.stringify({ data, cores, relations }), `${name}: deterministic`);
  assert(ids(data) === ids(input), `${name}: ids and array order preserved`);
  assert(data.links === input.links, `${name}: links passed through`);
  assert(JSON.stringify(applyNebulaLayout(input)) === JSON.stringify(data), `${name}: applyNebulaLayout matches computeNebulaLayout`);
  const nodes: Placed[] = [
    ...data.genres.map((g) => ({ kind: 'genre' as const, id: g.id, genreId: g.id, p: g.position })),
    ...data.artists.map((a) => ({ kind: 'artist' as const, id: a.id, genreId: a.genreId, p: a.position })),
    ...data.songs.map((s) => ({ kind: 'song' as const, id: s.id, genreId: s.genreId, p: s.position })),
  ];
  assert(nodes.every((n) => n.p.every(Number.isFinite)), `${name}: all positions finite`);

  // 2. Genres at their core, artists between the genre corona and ~S
  const coreOf = new Map(cores.map((c) => [c.genreId, c]));
  assert(
    data.genres.every((g) => dist(g.position, coreOf.get(g.id)!.center) < 0.01),
    `${name}: genre node at its nebula core`
  );
  const artistRadii = data.artists.map((a) => dist(a.position, coreOf.get(a.genreId)!.center) / coreOf.get(a.genreId)!.radius);
  const artistAbs = data.artists.map((a) => dist(a.position, coreOf.get(a.genreId)!.center));
  assert(Math.min(...artistAbs) >= 2.39, `${name}: artists ≥ 2.4 u from their core (outside genre corona)`, `min ${Math.min(...artistAbs).toFixed(2)}`);
  assert(Math.max(...artistRadii) <= 1.1, `${name}: artists inside ~1.1·S`, `max ${Math.max(...artistRadii).toFixed(2)}`);
  assert(
    cores.every((c) => [c.normal, c.u, c.v].every((v) => Math.abs(Math.hypot(...v) - 1) < 1e-9)),
    `${name}: nebula frames are unit vectors`
  );

  // 3. Global minimum distances (no overlapping coronas)
  const ss = minDistance(nodes, (a, b) => a.kind === 'song' && b.kind === 'song');
  const art = minDistance(nodes, (a, b) => a.kind === 'artist' || b.kind === 'artist');
  const foreign = minDistance(
    nodes,
    (a, b) => (a.kind === 'genre' && b.genreId !== a.id) || (b.kind === 'genre' && a.genreId !== b.id)
  );
  assert(ss[0] >= 0.3, `${name}: song–song ≥ 0.3 u`, `${ss[0].toFixed(2)} ${ss[1]}`);
  assert(art[0] >= 0.8, `${name}: artist–any node ≥ 0.8 u`, `${art[0].toFixed(2)} ${art[1]}`);
  assert(foreign[0] >= 1.5, `${name}: genre core–foreign node ≥ 1.5 u`, `${foreign[0].toFixed(2)} ${foreign[1]}`);

  // 4. Bridge songs in the contact disc; the rest orbit their artist
  const bridgeIds = new Set(relations.flatMap((r) => r.bridgeSongIds));
  const songById = new Map(data.songs.map((s) => [s.id, s]));
  const outside = relations.flatMap((r) =>
    r.bridgeSongIds.filter((id) => dist(songById.get(id)!.position, r.contact) > r.radius).map((id) => `${id}`)
  );
  assert(outside.length === 0, `${name}: bridge songs within radius of their contact point`, outside.join(', '));
  const artistPos = new Map(data.artists.map((a) => [`${a.genreId}::${a.id}`, a.position]));
  const farOrbit = data.songs.filter(
    (s) => !bridgeIds.has(s.id) && dist(s.position, artistPos.get(`${s.genreId}::${s.artistId}`)!) > 2.1
  );
  assert(farOrbit.length === 0, `${name}: non-bridge songs within 2.1 u of their artist`, farOrbit.map((s) => s.id).slice(0, 3).join(', '));

  // 5. Relation geometry consistent with the cores
  const geometryOk = relations.every((r) => {
    const A = coreOf.get(r.a)!;
    const B = coreOf.get(r.b)!;
    const d = dist(A.center, B.center);
    const expected = A.center.map((c, k) => c + r.dir[k] * (d * A.radius) / (A.radius + B.radius));
    return (
      Math.abs(Math.hypot(...r.dir) - 1) < 1e-9 &&
      dist(expected, r.contact) < 1e-9 &&
      Math.abs(r.radius - Math.min(A.radius, B.radius) * 0.75) < 1e-9
    );
  });
  assert(geometryOk, `${name}: relations carry contact, unit dir and radius from the cores`);

  console.log(
    `    ↳ ${name}: ${relations.length} relations · ${bridgeIds.size} bridge songs · min song–song ${ss[0].toFixed(2)} · artist–any ${art[0].toFixed(2)} · core–foreign ${foreign[0].toFixed(2)}`
  );
}

// 6. A nebula keeps its orientation when another genre disappears (per-genre seeds)
const full = computeNebulaLayout(GALAXY_PRESET_150);
const lastGenre = GALAXY_PRESET_150.genres[GALAXY_PRESET_150.genres.length - 1].id;
const reduced = computeNebulaLayout({
  ...GALAXY_PRESET_150,
  genres: GALAXY_PRESET_150.genres.filter((g) => g.id !== lastGenre),
  artists: GALAXY_PRESET_150.artists.filter((a) => a.genreId !== lastGenre),
  songs: GALAXY_PRESET_150.songs.filter((s) => s.genreId !== lastGenre),
});
const firstId = GALAXY_PRESET_150.genres[0].id;
assert(
  JSON.stringify(full.cores.find((c) => c.genreId === firstId)!.normal) ===
    JSON.stringify(reduced.cores.find((c) => c.genreId === firstId)!.normal),
  'stability: nebula orientation independent of other genres'
);

console.log('\n================================================================');
console.log('SUMMARY OF M5.4b VERIFICATION');
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
  console.log('\nALL M5.4b TESTS PASSED');
  process.exit(0);
}
