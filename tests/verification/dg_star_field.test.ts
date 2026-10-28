import * as THREE from 'three';
import {
  buildStarFieldGeometry,
  STAR_FIELD_ATTRIBUTES,
  STAR_GLOW_FACTOR,
  STAR_KIND,
  starHeat,
  starSpikes,
} from '../../src/components/canvas/nebulaV3/starFieldGeometry';
import {
  createStarFieldMaterial,
  createStarFieldUniforms,
  STAR_FIELD_CACHE_KEY,
  STAR_FIELD_FRAGMENT_SHADER,
  STAR_FIELD_VERTEX_SHADER,
} from '../../src/components/canvas/nebulaV3/shaders/starFieldShaders';
import { computeNebulaFieldTargets } from '../../src/components/canvas/nebulaV3/nebulaFieldTargets';
import { getNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { calculateStarVisualMetrics } from '../../src/types/music';

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
console.log('SUITE B1: luminous stars (one draw call for every node)');
console.log('================================================================');

// ---------- 1. Geometry ----------
const layout = getNebulaLayout(GALAXY_PRESET_300);
const data = layout.data;
const genreIds = data.genres.map((g) => g.id);
const stars = buildStarFieldGeometry(data, genreIds);
const g = stars.geometry;
const nodeCount = data.genres.length + data.artists.length + data.songs.length;
const attr = (name: keyof typeof STAR_FIELD_ATTRIBUTES) => g.getAttribute(name).array as Float32Array;

assert(g.getAttribute('position').count === nodeCount, 'one point per genre, artist and song', `${g.getAttribute('position').count} vs ${nodeCount}`);
assert(
  Object.entries(STAR_FIELD_ATTRIBUTES).every(([name, size]) => g.getAttribute(name)?.itemSize === size && g.getAttribute(name).count === nodeCount),
  'every attribute present with its item size'
);
assert(new Set(stars.nodeIds).size === nodeCount, 'node ids unique (nodeIndex lookups are unambiguous)');
assert(Array.from(attr('nodeIndex')).every((v, i) => v === i), 'nodeIndex = vertex index');

const indexOf = new Map(stars.nodeIds.map((id, i) => [id, i]));
const pos = attr('position');
const samePosition = [...data.genres, ...data.artists, ...data.songs].every((node) => {
  const i = indexOf.get(node.id)!;
  return pos[i * 3] === Math.fround(node.position[0]) && pos[i * 3 + 1] === Math.fround(node.position[1]) && pos[i * 3 + 2] === Math.fround(node.position[2]);
});
assert(samePosition, 'points sit exactly on node.position (camera and hit spheres follow the same point)');

const kind = attr('kind');
assert(
  data.genres.every((n) => kind[indexOf.get(n.id)!] === STAR_KIND.genre) &&
    data.artists.every((n) => kind[indexOf.get(n.id)!] === STAR_KIND.artist) &&
    data.songs.every((n) => kind[indexOf.get(n.id)!] === STAR_KIND.song),
  'kind per node type'
);
const size = attr('size');
assert(
  [...data.genres, ...data.artists, ...data.songs].every(
    (n) => Math.abs(size[indexOf.get(n.id)!] - calculateStarVisualMetrics(n).coreRadius * STAR_GLOW_FACTOR) < 1e-5
  ),
  `sprite radius = core radius × ${STAR_GLOW_FACTOR}`
);
const bySongs = [...data.artists].sort((a, b) => a.songCount - b.songCount);
const small = bySongs[0];
const big = bySongs[bySongs.length - 1];
assert(
  size[indexOf.get(big.id)!] > size[indexOf.get(small.id)!],
  'artists with more songs shine bigger',
  `${big.name} ${size[indexOf.get(big.id)!].toFixed(2)} vs ${small.name} ${size[indexOf.get(small.id)!].toFixed(2)}`
);
assert(
  Math.min(...data.genres.map((n) => size[indexOf.get(n.id)!])) > Math.max(...data.songs.map((n) => size[indexOf.get(n.id)!])),
  'genre stars are larger than any song star'
);
assert(starHeat(0.95) > starHeat(0.7) && starHeat(0) === 0 && starHeat(1) === 1 && starHeat(2) === 1, 'heat grows with affinity, clamped to 0..1');
const heat = attr('heat');
assert(data.songs.every((n) => Math.abs(heat[indexOf.get(n.id)!] - starHeat(n.affinity)) < 1e-6), 'heat attribute from affinity');
assert(
  data.genres.every((n) => starSpikes(n) === 1) && data.songs.every((n) => starSpikes(n) === 0),
  'diffraction cross: always on genres, never on songs'
);

// colour: the genre's colour for every member
const color = attr('color');
const genreColor = new Map(data.genres.map((x) => [x.id, new THREE.Color(x.color)]));
const colorOk = data.songs.every((n) => {
  const i = indexOf.get(n.id)!;
  const c = genreColor.get(n.genreId)!;
  return Math.abs(color[i * 3] - c.r) < 1e-6 && Math.abs(color[i * 3 + 1] - c.g) < 1e-6 && Math.abs(color[i * 3 + 2] - c.b) < 1e-6;
});
assert(colorOk, 'songs take their genre colour');

// focus indices follow the gas field convention: the targets' artistAid matches the star's aid
const gid = attr('gid');
const aid = attr('aid');
assert(data.genres.every((n, i) => gid[indexOf.get(n.id)!] === i) && data.genres.every((n) => aid[indexOf.get(n.id)!] === -1), 'genres: gid = genre index, aid = -1');
const artist = data.artists[Math.floor(data.artists.length / 2)];
const targets = computeNebulaFieldTargets({
  data,
  genreIds,
  particleCount: 1,
  stellarBrightness: 0.25,
  minAffinityFilter: 0,
  selectedSectorId: artist.genreId,
  selectedNode: artist,
  cameraMode: 'artist',
  playingTrackId: null,
});
assert(
  targets.focusGid === gid[indexOf.get(artist.id)!] && targets.artistAid === aid[indexOf.get(artist.id)!],
  'artist focus: computeNebulaFieldTargets indices match the star attributes',
  `${targets.focusGid}/${targets.artistAid} vs ${gid[indexOf.get(artist.id)!]}/${aid[indexOf.get(artist.id)!]}`
);
const artistSongs = data.songs.filter((s) => s.artistId === artist.id && s.genreId === artist.genreId);
assert(artistSongs.length > 0 && artistSongs.every((s) => aid[indexOf.get(s.id)!] === targets.artistAid), "songs carry their artist's aid (stay lit in artist focus)");

// determinism
const again = buildStarFieldGeometry(data, genreIds);
assert(
  Object.keys(STAR_FIELD_ATTRIBUTES).every((name) =>
    (again.geometry.getAttribute(name).array as Float32Array).every((v, i) => v === (g.getAttribute(name).array as Float32Array)[i])
  ),
  'deterministic: same data → same buffers'
);
const small50 = buildStarFieldGeometry(getNebulaLayout(GALAXY_PRESET_50).data, GALAXY_PRESET_50.genres.map((x) => x.id));
assert(small50.geometry.getAttribute('position').count === GALAXY_PRESET_50.genres.length + GALAXY_PRESET_50.artists.length + GALAXY_PRESET_50.songs.length, 'preset 50: one point per node');

// ---------- 2. Material ----------
const m1 = createStarFieldMaterial();
const m2 = createStarFieldMaterial();
assert(STAR_FIELD_CACHE_KEY === 'ymv-starfield-v1' && m1.customProgramCacheKey() === STAR_FIELD_CACHE_KEY, 'cache key is ymv-starfield-v1');
m1.uniforms.uFocusGid.value = 3;
m1.uniforms.uSelectedIndex.value = 12;
m1.uniforms.uBrightness.value = 2;
assert(m1.customProgramCacheKey() === m2.customProgramCacheKey() && m1.vertexShader === m2.vertexShader, 'cache key and source independent of state');
assert(m1.transparent && m1.depthWrite === false && m1.blending === THREE.AdditiveBlending, 'additive, transparent, no depth write');
const uniformNames = Object.keys(createStarFieldUniforms());
assert(uniformNames.every((u) => STAR_FIELD_VERTEX_SHADER.includes(`uniform float ${u};`)), 'every uniform declared in the vertex shader', uniformNames.join(','));
assert(Object.keys(STAR_FIELD_ATTRIBUTES).filter((a) => a !== 'position').every((a) => STAR_FIELD_VERTEX_SHADER.includes(` ${a};`)), 'every attribute declared in the vertex shader');
assert(!/position\s*\+|vec3 p\s*=/.test(STAR_FIELD_VERTEX_SHADER), 'positions are not animated in the shader (twinkle is brightness only)');
assert(STAR_FIELD_FRAGMENT_SHADER.includes('discard'), 'fragment discards outside the sprite disc');

console.log('\n================================================================');
console.log('SUMMARY OF B1 VERIFICATION');
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
  console.log('\nALL B1 TESTS PASSED');
  process.exit(0);
}
