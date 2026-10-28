import * as THREE from 'three';
import { BRIDGE_THREAD_ATTRIBUTES, bridgeRingColor, buildBridgeThreadGeometry, mixGenreColors } from '../../src/components/canvas/nebulaV3/bridges';
import {
  BRIDGE_THREAD_CACHE_KEY,
  BRIDGE_THREAD_VERTEX_SHADER,
  createBridgeThreadMaterial,
  createBridgeThreadUniforms,
} from '../../src/components/canvas/nebulaV3/shaders/bridgeThreadShaders';
import { computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
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

const hue = (c: THREE.Color) => {
  const h = { h: 0, s: 0, l: 0 };
  c.getHSL(h);
  return h.h;
};

console.log('================================================================');
console.log('SUITE M7.2: bridge links, threads and rings');
console.log('================================================================');

// 1. Colour mixing on the short hue arc
const mixed = mixGenreColors('#ff0000', '#ffff00'); // hue 0 and 1/6
assert(Math.abs(hue(mixed) - 1 / 12) < 0.01, 'mixGenreColors: halfway hue', hue(mixed).toFixed(3));
const wrapped = mixGenreColors('#ff00ff', '#ff0000'); // hue 5/6 and 0 → 11/12 across the wrap
assert(Math.abs(hue(wrapped) - 11 / 12) < 0.01, 'mixGenreColors: short arc across the wrap', hue(wrapped).toFixed(3));

// 2. Material
const mat = createBridgeThreadMaterial();
assert(BRIDGE_THREAD_CACHE_KEY === 'nebula-bridges-v3' && mat.customProgramCacheKey() === BRIDGE_THREAD_CACHE_KEY, 'cache key nebula-bridges-v3');
assert(mat.transparent && !mat.depthWrite && mat.blending === THREE.AdditiveBlending, 'additive, transparent, no depth write');
assert(createBridgeThreadUniforms().uShowAll.value === 0 && createBridgeThreadUniforms().uFocusGid.value === -1, 'hidden by default (no links, no focus)');
const declared = [...BRIDGE_THREAD_VERTEX_SHADER.matchAll(/attribute (float|vec3) (\w+);/g)].map((m) => ({ name: m[2], size: m[1] === 'vec3' ? 3 : 1 }));
assert(
  Object.entries(BRIDGE_THREAD_ATTRIBUTES).filter(([n]) => n !== 'position').every(([n, s]) => declared.some((d) => d.name === n && d.size === s)) &&
    declared.every((d) => d.name in BRIDGE_THREAD_ATTRIBUTES),
  'thread attributes match the shader both ways'
);
mat.dispose();

// 3. Links, threads and rings on presets
const presets: [string, MusicGalaxyData][] = [
  ['preset50', GALAXY_PRESET_50],
  ['preset300', GALAXY_PRESET_300],
];
for (const [name, data] of presets) {
  const layout = computeNebulaLayout(data);
  const placed = layout.relations.flatMap((r) => r.bridgeSongIds.map((id) => ({ id, r })));
  const songById = new Map(layout.data.songs.map((s) => [s.id, s]));

  assert(layout.bridgeLinks.length === placed.length * 2, `${name}: two bridge links per placed bridge song`, `${layout.bridgeLinks.length} for ${placed.length}`);
  assert(layout.bridgeLinks.every((l) => l.type === 'bridge' && l.strength > 0 && l.strength <= 1), `${name}: links typed 'bridge' with strength in (0, 1]`);
  assert(layout.data.links === data.links && !layout.data.links.some((l) => l.type === 'bridge'), `${name}: data.links untouched (no bridge links)`);

  let endpointsOk = true;
  for (const { id, r } of placed) {
    const song = songById.get(id)!;
    const other = song.genreId === r.a ? r.b : r.a;
    const toSong = layout.bridgeLinks.find((l) => l.target === id);
    const fromSong = layout.bridgeLinks.find((l) => l.source === id);
    if (!toSong || toSong.source !== song.artistId || !fromSong || fromSong.target !== other) endpointsOk = false;
  }
  assert(endpointsOk, `${name}: artist → song → other genre's core`);

  const geometry = buildBridgeThreadGeometry(layout);
  const position = geometry.getAttribute('position').array as Float32Array;
  const tAlong = geometry.getAttribute('tAlong').array as Float32Array;
  assert(geometry.getAttribute('position').count === layout.bridgeLinks.length * 2, `${name}: two vertices per bridge link`);
  assert(Array.from(tAlong).every((t, i) => t === i % 2), `${name}: tAlong runs 0 → 1 along each thread`);
  assert(position.every(Number.isFinite), `${name}: thread vertices finite`);
  // first segment: starts at the artist's laid-out position, ends at the bridge song
  const first = layout.bridgeLinks[0];
  const song = songById.get(first.target)!;
  const artist = layout.data.artists.find((a) => a.id === first.source && a.genreId === song.genreId)!;
  assert(
    [0, 1, 2].every((k) => Math.abs(position[k] - artist.position[k]) < 1e-4 && Math.abs(position[3 + k] - song.position[k]) < 1e-4),
    `${name}: thread endpoints match laid-out nodes`
  );
  geometry.dispose();

  // rings: only placed bridge songs, in a colour between both genre hues
  const { id, r } = placed[0];
  const ring = bridgeRingColor(id, layout);
  const colorOf = (gid: string) => new THREE.Color(layout.data.genres.find((g) => g.id === gid)!.color);
  assert(ring !== null && ring === `#${mixGenreColors(`#${colorOf(r.a).getHexString()}`, `#${colorOf(r.b).getHexString()}`).getHexString()}`, `${name}: bridge ring uses the pair's mixed colour`, String(ring));
  const plain = layout.data.songs.find((s) => !placed.some((p) => p.id === s.id))!;
  assert(bridgeRingColor(plain.id, layout) === null, `${name}: no ring for songs that are not placed bridges`);
  console.log(`    ↳ ${name}: ${placed.length} bridge songs · ${layout.bridgeLinks.length} threads`);
}

console.log('\n================================================================');
console.log('SUMMARY OF M7.2 VERIFICATION');
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
  console.log('\nALL M7.2 TESTS PASSED');
  process.exit(0);
}
