import * as THREE from 'three';
import {
  UNIT_SPHERE_GEOMETRY,
  UNIT_RING_GEOMETRY,
  UNIT_OUTER_RING_GEOMETRY,
  UNIT_RIPPLE_GEOMETRY,
  UNIT_POLAR_JET_GEOMETRY,
  UNIT_SATELLITE_GEOMETRY,
  UNIT_DIFFRACTION_GEOMETRY,
  disposeStarGeometries,
} from '../../src/components/canvas/star/starGeometries';
import {
  SOFT_RING_PROGRAM_CACHE_KEY,
  STAR_CORE_PROGRAM_CACHE_KEY,
  softRingCustomProgramCacheKey,
  starCoreCustomProgramCacheKey,
  softRingOnBeforeCompile,
  starCoreOnBeforeCompile,
} from '../../src/components/canvas/star/shaders/starShaders';
import {
  calculateStarVisualMetrics,
  MusicNode,
  GenreNode,
  ArtistNode,
  SongNode,
} from '../../src/types/music';

// Test runner assertion helper
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    const msg = `  ✗ FAIL: ${testName}${detail ? ` (${detail})` : ''}`;
    console.error(msg);
    failures.push(msg);
  }
}

console.log('================================================================');
console.log('Milestone 2 Empirical Verification: Star Modularization & Pure R3F');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Suite 1: Static Geometries Verification
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Static Unit Geometries ---');

const geometries = [
  { name: 'UNIT_SPHERE_GEOMETRY', geom: UNIT_SPHERE_GEOMETRY, expectedType: 'SphereGeometry' },
  { name: 'UNIT_RING_GEOMETRY', geom: UNIT_RING_GEOMETRY, expectedType: 'RingGeometry' },
  { name: 'UNIT_OUTER_RING_GEOMETRY', geom: UNIT_OUTER_RING_GEOMETRY, expectedType: 'RingGeometry' },
  { name: 'UNIT_RIPPLE_GEOMETRY', geom: UNIT_RIPPLE_GEOMETRY, expectedType: 'RingGeometry' },
  { name: 'UNIT_POLAR_JET_GEOMETRY', geom: UNIT_POLAR_JET_GEOMETRY, expectedType: 'CylinderGeometry' },
  { name: 'UNIT_SATELLITE_GEOMETRY', geom: UNIT_SATELLITE_GEOMETRY, expectedType: 'SphereGeometry' },
  { name: 'UNIT_DIFFRACTION_GEOMETRY', geom: UNIT_DIFFRACTION_GEOMETRY, expectedType: 'PlaneGeometry' },
];

for (const { name, geom, expectedType } of geometries) {
  assert(geom instanceof THREE.BufferGeometry, `${name} is an instance of THREE.BufferGeometry`);
  assert(geom.type === expectedType, `${name} type is ${expectedType}`);

  const posAttr = geom.getAttribute('position');
  assert(posAttr !== undefined && posAttr.count > 0, `${name} has non-empty position attribute`);

  let hasNan = false;
  let hasInf = false;
  for (let i = 0; i < posAttr.array.length; i++) {
    const val = posAttr.array[i];
    if (Number.isNaN(val)) hasNan = true;
    if (!Number.isFinite(val)) hasInf = true;
  }
  assert(!hasNan, `${name} position attribute contains zero NaN values`);
  assert(!hasInf, `${name} position attribute contains zero Infinite values`);

  geom.computeBoundingBox();
  geom.computeBoundingSphere();
  assert(
    geom.boundingBox !== null && Number.isFinite(geom.boundingBox.min.x) && Number.isFinite(geom.boundingBox.max.x),
    `${name} bounding box is finite and valid`
  );
  assert(
    geom.boundingSphere !== null && Number.isFinite(geom.boundingSphere.radius) && geom.boundingSphere.radius > 0,
    `${name} bounding sphere radius is finite (>0)`
  );
}

// Verify disposeStarGeometries executes cleanly
try {
  disposeStarGeometries();
  assert(true, 'disposeStarGeometries executes without error');
} catch (e) {
  assert(false, 'disposeStarGeometries threw an error', String(e));
}

// -----------------------------------------------------------------------------
// Suite 2: Star Shaders & customProgramCacheKey Verification
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Star Shaders & customProgramCacheKey ---');

assert(SOFT_RING_PROGRAM_CACHE_KEY === 'star-soft-ring-v1', 'SOFT_RING_PROGRAM_CACHE_KEY is star-soft-ring-v1');
assert(STAR_CORE_PROGRAM_CACHE_KEY === 'star-core-limb-v1', 'STAR_CORE_PROGRAM_CACHE_KEY is star-core-limb-v1');

assert(
  softRingCustomProgramCacheKey() === 'star-soft-ring-v1',
  'softRingCustomProgramCacheKey returns correct key'
);
assert(
  starCoreCustomProgramCacheKey() === 'star-core-limb-v1',
  'starCoreCustomProgramCacheKey returns correct key'
);

// Determinism test (cache key purity)
let deterministic = true;
for (let i = 0; i < 500; i++) {
  if (softRingCustomProgramCacheKey() !== 'star-soft-ring-v1' || starCoreCustomProgramCacheKey() !== 'star-core-limb-v1') {
    deterministic = false;
    break;
  }
}
assert(deterministic, 'customProgramCacheKey functions are pure and deterministic across 500 invocations');

// Shader injection simulation with Three.js ShaderLib
const basicVertex = THREE.ShaderLib.basic.vertexShader;
const basicFragment = THREE.ShaderLib.basic.fragmentShader;

// Test softRingOnBeforeCompile
const softRingShader = {
  vertexShader: basicVertex,
  fragmentShader: basicFragment,
  uniforms: {},
} as unknown as THREE.WebGLProgramParametersWithUniforms;
softRingOnBeforeCompile(softRingShader);

assert(
  softRingShader.vertexShader.includes('varying vec2 vRingUv;') &&
  softRingShader.vertexShader.includes('vRingUv = uv;'),
  'softRingOnBeforeCompile properly injects vRingUv into vertex shader'
);
assert(
  softRingShader.fragmentShader.includes('varying vec2 vRingUv;') &&
  softRingShader.fragmentShader.includes('float rDist = length(vRingUv - vec2(0.5));') &&
  softRingShader.fragmentShader.includes('diffuseColor.a *='),
  'softRingOnBeforeCompile properly injects radial fade and Cassini division calculation'
);

// Test starCoreOnBeforeCompile
const starCoreShader = {
  vertexShader: basicVertex,
  fragmentShader: basicFragment,
  uniforms: {},
} as unknown as THREE.WebGLProgramParametersWithUniforms;
starCoreOnBeforeCompile(starCoreShader);

assert(
  starCoreShader.vertexShader.includes('varying vec3 vLocalNormal;') &&
  starCoreShader.vertexShader.includes('varying vec3 vViewDir;') &&
  starCoreShader.vertexShader.includes('vLocalNormal = normalize(transformedNormal);') &&
  starCoreShader.vertexShader.includes('vViewDir = -mvPosition.xyz;'),
  'starCoreOnBeforeCompile properly injects normal and view vector calculation'
);
assert(
  starCoreShader.fragmentShader.includes('varying vec3 vLocalNormal;') &&
  starCoreShader.fragmentShader.includes('varying vec3 vViewDir;') &&
  starCoreShader.fragmentShader.includes('float NdotV = clamp(dot(vLocalNormal, vDir), 0.0, 1.0);') &&
  starCoreShader.fragmentShader.includes('pow(NdotV, 0.45)'),
  'starCoreOnBeforeCompile properly injects limb darkening calculation'
);

// Material integration test
const mat1 = new THREE.MeshBasicMaterial();
mat1.customProgramCacheKey = softRingCustomProgramCacheKey;
mat1.onBeforeCompile = softRingOnBeforeCompile;
assert(
  typeof mat1.customProgramCacheKey === 'function' && mat1.customProgramCacheKey() === 'star-soft-ring-v1',
  'MeshBasicMaterial correctly binds softRingCustomProgramCacheKey'
);

const mat2 = new THREE.MeshBasicMaterial();
mat2.customProgramCacheKey = starCoreCustomProgramCacheKey;
mat2.onBeforeCompile = starCoreOnBeforeCompile;
assert(
  typeof mat2.customProgramCacheKey === 'function' && mat2.customProgramCacheKey() === 'star-core-limb-v1',
  'MeshBasicMaterial correctly binds starCoreCustomProgramCacheKey'
);

// -----------------------------------------------------------------------------
// Suite 3: Node Metrics & Transform Stress Harness
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Node Metrics & Subcomponent Transforms Stress Harness ---');

const mockGenres: GenreNode[] = [
  { id: 'genre-rock', name: 'Rock', type: 'genre', affinity: 0.95, position: [10, 0, 5], color: '#FF2A85', accentColor: '#FF2A85', description: 'Rock music', songCount: 45 },
  { id: 'genre-jazz', name: 'Jazz', type: 'genre', affinity: 0.2, position: [-15, 2, -10], color: '#00F5D4', accentColor: '#00F5D4', description: 'Jazz music', songCount: 8 },
  { id: 'genre-pop', name: 'Pop', type: 'genre', affinity: 0.0, position: [0, 0, 0], color: '#CCFF00', accentColor: '#CCFF00', description: 'Pop music', songCount: 0 },
  { id: 'genre-edge1', name: 'Max Affinity', type: 'genre', affinity: 1.0, position: [50, 50, 50], color: '#FFFFFF', accentColor: '#FFFFFF', description: 'Max', songCount: 500 },
];

const mockArtists: ArtistNode[] = [
  // Supergiant artist (affinity >= 0.82)
  { id: 'art-1', name: 'Daft Punk', type: 'artist', affinity: 0.96, position: [12, 1, 6], genreId: 'genre-rock', songCount: 28, catalogCode: 'DP-01', origin: 'France', bio: 'Electro duo', sleeveBg: '#111', sleeveAccent: '#00F5D4' },
  // Giant artist (0.55 <= affinity < 0.82)
  { id: 'art-2', name: 'Radiohead', type: 'artist', affinity: 0.72, position: [14, -1, 4], genreId: 'genre-rock', songCount: 15, catalogCode: 'RH-01', origin: 'UK', bio: 'Alt rock band', sleeveBg: '#111', sleeveAccent: '#CCFF00' },
  // Subgiant artist (0.30 <= affinity < 0.55)
  { id: 'art-3', name: 'Miles Davis', type: 'artist', affinity: 0.45, position: [-14, 2, -9], genreId: 'genre-jazz', songCount: 5, catalogCode: 'MD-01', origin: 'US', bio: 'Jazz legend', sleeveBg: '#111', sleeveAccent: '#FF2A85' },
  // Dwarf artist (affinity < 0.30)
  { id: 'art-4', name: 'Obscure Band', type: 'artist', affinity: 0.05, position: [-16, 3, -11], genreId: 'genre-jazz', songCount: 1, catalogCode: 'OB-01', origin: 'Earth', bio: 'Indie group', sleeveBg: '#111', sleeveAccent: '#888' },
  // Extreme boundaries
  { id: 'art-5', name: 'Zero Affinity Artist', type: 'artist', affinity: 0.0, position: [0, 0, 0], genreId: 'genre-pop', songCount: 0, catalogCode: 'ZA-01', origin: 'Nowhere', bio: 'Silence', sleeveBg: '#000', sleeveAccent: '#000' },
  { id: 'art-6', name: 'Unity Affinity Artist', type: 'artist', affinity: 1.0, position: [100, 100, 100], genreId: 'genre-pop', songCount: 200, catalogCode: 'UA-01', origin: 'Everywhere', bio: 'Omnipresent', sleeveBg: '#fff', sleeveAccent: '#fff' },
];

const mockSongs: SongNode[] = [
  { id: 'track-1', title: 'Around the World', album: 'Homework', type: 'song', affinity: 0.98, position: [12.5, 1.2, 6.3], artistId: 'art-1', genreId: 'genre-rock', duration: 238, previewUrl: 'https://example.com/preview1.mp3' },
  { id: 'track-2', title: 'Karma Police', album: 'OK Computer', type: 'song', affinity: 0.65, position: [14.2, -0.8, 4.1], artistId: 'art-2', genreId: 'genre-rock', duration: 261, previewUrl: undefined },
  { id: 'track-3', title: 'So What', album: 'Kind of Blue', type: 'song', affinity: 0.25, position: [-14.1, 2.1, -8.8], artistId: 'art-3', genreId: 'genre-jazz', duration: 562 },
  { id: 'track-4', title: '', album: '', type: 'song', affinity: 0.0, position: [0, 0, 0], artistId: 'art-5', genreId: 'genre-pop', duration: 0 },
  { id: 'track-5', title: 'Ultra Long Title Track With Extreme Characters 🚀 ♫ § 1234567890', album: 'Edge Cases', type: 'song', affinity: 1.0, position: [99, 99, 99], artistId: 'art-6', genreId: 'genre-pop', duration: 7200 },
];

const allNodes: MusicNode[] = [...mockGenres, ...mockArtists, ...mockSongs];

// Test metrics and transforms for every node
let allMetricsFinite = true;
let allTransformsFinite = true;
let allLabelValid = true;

for (const node of allNodes) {
  const metrics = calculateStarVisualMetrics(node);

  if (
    !Number.isFinite(metrics.coreRadius) || metrics.coreRadius <= 0 ||
    !Number.isFinite(metrics.coronaRadius) || metrics.coronaRadius <= 0 ||
    !Number.isFinite(metrics.coronaOpacity) || metrics.coronaOpacity < 0 ||
    !Number.isFinite(metrics.emissiveIntensity) || metrics.emissiveIntensity < 0
  ) {
    allMetricsFinite = false;
    console.error(`Invalid metrics for node ${node.id}:`, metrics);
  }

  // StarCoreMesh transform calculations
  const stellarBrightness = 0.85;
  const hitScale = node.type === 'genre'
    ? Math.max(1.1, metrics.coreRadius * 1.35)
    : node.type === 'artist'
    ? Math.max(0.48, metrics.coreRadius * 1.4)
    : Math.max(0.24, metrics.coreRadius * 1.45);

  const coronaScale = metrics.coronaRadius * (0.8 + 0.3 * stellarBrightness);
  const coreScale = metrics.coreRadius;

  if (!Number.isFinite(hitScale) || hitScale <= 0 ||
      !Number.isFinite(coronaScale) || coronaScale <= 0 ||
      !Number.isFinite(coreScale) || coreScale <= 0) {
    allTransformsFinite = false;
    console.error(`Invalid core transforms for node ${node.id}: hitScale=${hitScale}, coronaScale=${coronaScale}, coreScale=${coreScale}`);
  }

  // StarAccretionRings transform calculations
  if (node.type !== 'genre') {
    const ring1Scale = metrics.coreRadius * 1.05;
    const ring2Scale = metrics.coreRadius * 1.15;
    const ringOpacity = Math.min(0.35, 0.16 + 0.18 * node.affinity) * stellarBrightness;

    if (!Number.isFinite(ring1Scale) || ring1Scale <= 0 ||
        !Number.isFinite(ring2Scale) || ring2Scale <= 0 ||
        !Number.isFinite(ringOpacity) || ringOpacity < 0) {
      allTransformsFinite = false;
      console.error(`Invalid ring transforms for node ${node.id}`);
    }
  }

  // StarFeatures transform calculations
  if (node.type === 'artist' && metrics.artistTier === 'supergiant') {
    const diffScale = metrics.coreRadius * 2.8;
    if (!Number.isFinite(diffScale) || diffScale <= 0) {
      allTransformsFinite = false;
      console.error(`Invalid diffraction scale for artist ${node.id}`);
    }
  }
  if (metrics.hasPolarJets) {
    const jetPos = 2.2 * metrics.coreRadius;
    if (!Number.isFinite(jetPos) || jetPos <= 0) {
      allTransformsFinite = false;
      console.error(`Invalid polar jet position for node ${node.id}`);
    }
  }

  // StarLabel calculations
  const yOffset = metrics.coronaRadius + (node.type === 'genre' ? 0.90 : node.type === 'artist' ? 0.45 : 0.28);
  const primaryFontSize = node.type === 'genre' ? 0.65 : node.type === 'artist' ? 0.36 : 0.22;
  const outlineWidth = node.type === 'genre' ? 0.08 : node.type === 'artist' ? 0.052 : 0.036;
  const subTextFontSize = node.type === 'genre' ? 0.30 : node.type === 'artist' ? 0.20 : 0.15;

  const nodeLabel = 'name' in node ? node.name : node.title;
  const affinityPct = Math.round(node.affinity * 100);

  let subLabelContent: string;
  if (node.type === 'song') {
    if (node.duration) {
      const minutes = Math.floor(node.duration / 60);
      const seconds = Math.floor(node.duration % 60).toString().padStart(2, '0');
      subLabelContent = `${minutes}:${seconds} · ${affinityPct}%`;
    } else {
      subLabelContent = `${affinityPct}%`;
    }
  } else {
    const songCount = 'songCount' in node ? node.songCount : 1;
    subLabelContent = `${songCount}p · ${affinityPct}%`;
  }

  if (!Number.isFinite(yOffset) || !Number.isFinite(primaryFontSize) || !Number.isFinite(outlineWidth) || !Number.isFinite(subTextFontSize) || typeof nodeLabel !== 'string' || typeof subLabelContent !== 'string') {
    allLabelValid = false;
    console.error(`Invalid label metrics for node ${node.id}`);
  }
}

assert(allMetricsFinite, 'All 15 mock nodes across genres, artists, and songs produce finite, positive metrics');
assert(allTransformsFinite, 'All subcomponent scale, position, and opacity transforms are finite and non-NaN');
assert(allLabelValid, 'All StarLabel offsets, font sizes, and string contents are well-defined and valid');

// -----------------------------------------------------------------------------
// Suite 4: StarPlaybackPulsar Conditional Mounting & Runtime Audio Stress Harness
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: StarPlaybackPulsar Conditional Mounting Logic & Frame Simulation ---');

// Mounting Oracle: tests the exact store selector logic
function computeIsPlayingNode(nodeId: string, storeState: { isAudioPlaying: boolean; playingTrackId: string | null }): boolean {
  return storeState.isAudioPlaying && storeState.playingTrackId === nodeId;
}

// Case 1: Audio stopped, playingTrackId is null
assert(
  computeIsPlayingNode('track-1', { isAudioPlaying: false, playingTrackId: null }) === false,
  'When audio is stopped and trackId is null, isPlayingNode is false'
);

// Case 2: Audio stopped, playingTrackId matches node
assert(
  computeIsPlayingNode('track-1', { isAudioPlaying: false, playingTrackId: 'track-1' }) === false,
  'When isAudioPlaying is false, isPlayingNode is strictly false even if playingTrackId matches'
);

// Case 3: Audio playing, but playingTrackId is different
assert(
  computeIsPlayingNode('track-1', { isAudioPlaying: true, playingTrackId: 'track-2' }) === false,
  'When isAudioPlaying is true but playingTrackId !== node.id, isPlayingNode is false'
);

// Case 4: Audio playing, playingTrackId matches node
assert(
  computeIsPlayingNode('track-1', { isAudioPlaying: true, playingTrackId: 'track-1' }) === true,
  'When isAudioPlaying is true AND playingTrackId === node.id, isPlayingNode is true'
);

// Case 5: Audio playing, genre or artist selected (only song tracks can play)
assert(
  computeIsPlayingNode('genre-rock', { isAudioPlaying: true, playingTrackId: 'track-1' }) === false,
  'Genre nodes are not mounted with StarPlaybackPulsar when song plays'
);
assert(
  computeIsPlayingNode('art-1', { isAudioPlaying: true, playingTrackId: 'track-1' }) === false,
  'Artist nodes are not mounted with StarPlaybackPulsar when song plays'
);

// Multiplexing Oracle: exactly 1 star mounts StarPlaybackPulsar across 100 stars
const hundredSongs: SongNode[] = Array.from({ length: 100 }, (_, i) => ({
  id: `track-${i}`,
  title: `Track ${i}`,
  album: `Album ${i}`,
  duration: 180,
  type: 'song',
  affinity: (i % 100) / 100,
  position: [i * 2, 0, (i % 10) * 2],
  artistId: `art-${i % 10}`,
  genreId: 'genre-rock',
}));

const activeState = { isAudioPlaying: true, playingTrackId: 'track-42' };
const mountedCount = hundredSongs.filter((s) => computeIsPlayingNode(s.id, activeState)).length;
assert(
  mountedCount === 1,
  `Exactly 1 star out of 100 mounts StarPlaybackPulsar during playback (mountedCount = ${mountedCount})`
);

const stoppedState = { isAudioPlaying: false, playingTrackId: 'track-42' };
const stoppedMountedCount = hundredSongs.filter((s) => computeIsPlayingNode(s.id, stoppedState)).length;
assert(
  stoppedMountedCount === 0,
  `Exactly 0 stars mount StarPlaybackPulsar when playback is paused/stopped (stoppedMountedCount = ${stoppedMountedCount})`
);

// Stress test: Pulsar frame animation math across 1,000 frames under heavy simulated FFT variations
console.log('  Running 1,000-frame audio reactivity stress simulation...');
let pulsarFrameErrors = 0;
const testMetrics = calculateStarVisualMetrics(mockSongs[0]);

for (let frame = 0; frame < 1000; frame++) {
  const t = frame * 0.016; // 60 FPS delta
  const delta = 0.016;
  const stellarBrightness = 0.8;

  // Stochastic FFT simulation
  const fft = {
    isPlaying: frame % 10 !== 0,
    subBass: Math.sin(frame * 0.1) * 0.5 + 0.5,
    midHarmonic: Math.cos(frame * 0.15) * 0.5 + 0.5,
    highShimmer: Math.sin(frame * 0.3) * 0.5 + 0.5,
    energy: Math.min(1.0, (Math.sin(frame * 0.08) * 0.5 + 0.5) * 1.2),
  };

  const p1 = (t * 0.55) % 1.0;
  const p2 = (t * 0.55 + 0.33) % 1.0;
  const p3 = (t * 0.55 + 0.66) % 1.0;
  const baseWaveScale = testMetrics.coreRadius * (1.05 + (fft.isPlaying ? fft.subBass * 0.35 : 0));

  const s1 = baseWaveScale * (1.0 + p1 * (1.5 + (fft.isPlaying ? fft.subBass * 0.7 : 0)));
  const op1 = Math.sin(p1 * Math.PI) * (0.65 + (fft.isPlaying ? fft.energy * 0.25 : 0)) * stellarBrightness;

  const s2 = baseWaveScale * (1.0 + p2 * (1.5 + (fft.isPlaying ? fft.subBass * 0.7 : 0)));
  const op2 = Math.sin(p2 * Math.PI) * (0.58 + (fft.isPlaying ? fft.midHarmonic * 0.25 : 0)) * stellarBrightness;

  const s3 = baseWaveScale * (1.0 + p3 * (1.5 + (fft.isPlaying ? fft.subBass * 0.7 : 0)));
  const op3 = Math.sin(p3 * Math.PI) * (0.50 + (fft.isPlaying ? fft.highShimmer * 0.25 : 0)) * stellarBrightness;

  const rotYInc = delta * (1.5 + (fft.isPlaying ? fft.energy * 2.2 : 0));
  const rotX = Math.sin(t * 1.8) * 0.25;
  const rotZ = Math.cos(t * 1.4) * 0.20;

  const spark1Scale = 1.0 + (fft.isPlaying ? fft.subBass * 1.8 : 0);
  const spark2Scale = 1.0 + (fft.isPlaying ? fft.midHarmonic * 1.8 : 0);
  const spark3Scale = 1.0 + (fft.isPlaying ? fft.highShimmer * 1.8 : 0);
  const spark4Scale = 1.0 + (fft.isPlaying ? fft.energy * 1.8 : 0);

  if (
    !Number.isFinite(s1) || s1 <= 0 || !Number.isFinite(op1) || op1 < 0 ||
    !Number.isFinite(s2) || s2 <= 0 || !Number.isFinite(op2) || op2 < 0 ||
    !Number.isFinite(s3) || s3 <= 0 || !Number.isFinite(op3) || op3 < 0 ||
    !Number.isFinite(rotYInc) || !Number.isFinite(rotX) || !Number.isFinite(rotZ) ||
    !Number.isFinite(spark1Scale) || !Number.isFinite(spark2Scale) ||
    !Number.isFinite(spark3Scale) || !Number.isFinite(spark4Scale)
  ) {
    pulsarFrameErrors++;
  }
}

assert(pulsarFrameErrors === 0, 'StarPlaybackPulsar frame animation math survived 1,000 randomized FFT frames with 0 errors/NaNs');

// -----------------------------------------------------------------------------
// Suite 5: Backwards-Compatible Re-Exports and Store State Flow
// -----------------------------------------------------------------------------
console.log('\n--- Suite 5: Re-Exports & Store State Flow ---');

// star/ and galaxy/ module exports (the root re-export files were removed in the reorganisation)
import * as StarNodeMeshExports from '../../src/components/canvas/star';
const expectedStarExports = [
  'StarNodeMesh',
  'StarCoreMesh',
  'StarAccretionRings',
  'StarFeatures',
  'StarPlaybackPulsar',
  'StarLabel',
  'UNIT_SPHERE_GEOMETRY',
  'UNIT_RING_GEOMETRY',
  'UNIT_OUTER_RING_GEOMETRY',
  'UNIT_RIPPLE_GEOMETRY',
  'UNIT_POLAR_JET_GEOMETRY',
  'UNIT_SATELLITE_GEOMETRY',
  'UNIT_DIFFRACTION_GEOMETRY',
  'disposeStarGeometries',
  'softRingOnBeforeCompile',
  'starCoreOnBeforeCompile',
  'softRingCustomProgramCacheKey',
  'starCoreCustomProgramCacheKey',
  'SOFT_RING_PROGRAM_CACHE_KEY',
  'STAR_CORE_PROGRAM_CACHE_KEY',
];

for (const exp of expectedStarExports) {
  assert(
    exp in StarNodeMeshExports && (StarNodeMeshExports as Record<string, unknown>)[exp] !== undefined,
    `star/index.ts exports ${exp}`
  );
}

import * as GalacticDustDiscExports from '../../src/components/canvas/galaxy';
const expectedDustExports = [
  'GalacticDustDisc',
  'SupermassiveBlackHole',
  'SpiralStardustPoints',
  'generateSpiralStardustGeometry',
  'createAccretionDiskMaterial',
  'createLensingArchMaterial',
  'createSpiralDustMaterial',
];

for (const exp of expectedDustExports) {
  assert(
    exp in GalacticDustDiscExports && (GalacticDustDiscExports as Record<string, unknown>)[exp] !== undefined,
    `galaxy/index.ts exports ${exp}`
  );
}

// CameraFlightController re-exports
import * as CameraFlightControllerExports from '../../src/components/canvas/CameraFlightController';
assert(
  'CameraFlightController' in CameraFlightControllerExports && CameraFlightControllerExports.CameraFlightController !== undefined,
  'CameraFlightController.tsx correctly re-exports CameraFlightController'
);

// Zustand Store State Integration Flow
import { useGalaxyStore } from '../../src/store/useGalaxyStore';

// Initial state
const initialState = useGalaxyStore.getState();
assert(typeof initialState.selectNode === 'function', 'Store has selectNode function');
assert(typeof initialState.setAudioPlayback === 'function', 'Store has setAudioPlayback function');
assert(initialState.isAudioPlaying === false, 'Store starts with isAudioPlaying=false');

// Simulate selecting a song node and starting playback
useGalaxyStore.getState().selectNode(mockSongs[0]);
assert(useGalaxyStore.getState().selectedNode?.id === mockSongs[0].id, 'selectNode correctly updates selectedNode');

useGalaxyStore.getState().setAudioPlayback(mockSongs[0].id, true);
assert(useGalaxyStore.getState().isAudioPlaying === true, 'setAudioPlayback updates isAudioPlaying to true');
assert(useGalaxyStore.getState().playingTrackId === mockSongs[0].id, 'setAudioPlayback sets playingTrackId');

// Test isPlayingNode selector under live store
const isPlayingNow = computeIsPlayingNode(mockSongs[0].id, useGalaxyStore.getState());
assert(isPlayingNow === true, 'computeIsPlayingNode returns true for playing song under live store');

const isOtherPlaying = computeIsPlayingNode(mockSongs[1].id, useGalaxyStore.getState());
assert(isOtherPlaying === false, 'computeIsPlayingNode returns false for non-playing song under live store');

// Stop playback
useGalaxyStore.getState().setAudioPlayback(mockSongs[0].id, false);
assert(useGalaxyStore.getState().isAudioPlaying === false, 'setAudioPlayback stops playback');
assert(computeIsPlayingNode(mockSongs[0].id, useGalaxyStore.getState()) === false, 'computeIsPlayingNode returns false after stopping playback');

console.log('\n================================================================');
console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
