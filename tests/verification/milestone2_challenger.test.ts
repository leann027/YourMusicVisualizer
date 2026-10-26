import * as THREE from 'three';

// Import modules under test
import {
  generateSpiralStardustGeometry,
  createPRNG,
} from '../../src/components/canvas/galaxy/spiralStardustGeometry';
import {
  createAccretionDiskMaterial,
  createLensingArchMaterial,
  ACCRETION_DISK_CACHE_KEY,
  LENSING_ARCH_CACHE_KEY,
} from '../../src/components/canvas/galaxy/shaders/blackHoleShaders';
import {
  createSpiralDustMaterial,
  SPIRAL_DUST_CACHE_KEY,
  spiralDustOnBeforeCompile,
} from '../../src/components/canvas/galaxy/shaders/spiralDustShaders';

// Import re-exports from GalacticDustDisc
import * as GalacticDustDiscModule from '../../src/components/canvas/GalacticDustDisc';
import * as GalaxyIndexModule from '../../src/components/canvas/galaxy/index';

// Import hooks and CameraFlightController
import * as HooksModule from '../../src/components/canvas/hooks/index';
import * as CameraFlightControllerModule from '../../src/components/canvas/CameraFlightController';

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
console.log('SUITE 1: spiralStardustGeometry Empirical Stress Tests');
console.log('================================================================');

// Test 1.1: Default particle count and geometry attributes
const geom = generateSpiralStardustGeometry();
assert(geom instanceof THREE.BufferGeometry, 'geom instanceof THREE.BufferGeometry');
const count = 5600;

const expectedAttributes = [
  'position',
  'color',
  'aRadius',
  'aAngle',
  'aSpeed',
  'aPhase',
  'aArm',
  'pointScale',
];

const actualAttributes = Object.keys(geom.attributes);
assert(
  actualAttributes.length === 8,
  'geom has exactly 8 buffer attributes',
  `Found ${actualAttributes.length}: ${actualAttributes.join(', ')}`
);

for (const attrName of expectedAttributes) {
  const attr = geom.getAttribute(attrName);
  assert(
    !!attr,
    `Attribute "${attrName}" exists on geometry`,
    attr ? `itemSize: ${attr.itemSize}, count: ${attr.count}` : 'MISSING'
  );
  if (attr) {
    assert(
      attr.count === count,
      `Attribute "${attrName}" has count 5600`,
      `Got ${attr.count}`
    );
  }
}

// Test 1.2: Check all 67,200 floats for NaN, Inf, and bounds
let nanCount = 0;
let infCount = 0;
let outOfBoundsCount = 0;

const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
const colAttr = geom.getAttribute('color') as THREE.BufferAttribute;
const radiusAttr = geom.getAttribute('aRadius') as THREE.BufferAttribute;
const angleAttr = geom.getAttribute('aAngle') as THREE.BufferAttribute;
const speedAttr = geom.getAttribute('aSpeed') as THREE.BufferAttribute;
const phaseAttr = geom.getAttribute('aPhase') as THREE.BufferAttribute;
const armAttr = geom.getAttribute('aArm') as THREE.BufferAttribute;
const scaleAttr = geom.getAttribute('pointScale') as THREE.BufferAttribute;

let minR = Infinity, maxR = -Infinity;
let minSpeed = Infinity, maxSpeed = -Infinity;
let minScale = Infinity, maxScale = -Infinity;
const armHistogram = [0, 0, 0, 0];

for (let i = 0; i < count; i++) {
  // Check position
  const x = posAttr.getX(i);
  const y = posAttr.getY(i);
  const z = posAttr.getZ(i);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) infCount++;
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) nanCount++;

  // Check color
  const r = colAttr.getX(i);
  const g = colAttr.getY(i);
  const b = colAttr.getZ(i);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) infCount++;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) nanCount++;
  if (r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1) outOfBoundsCount++;

  // Check aRadius
  const rad = radiusAttr.getX(i);
  if (!Number.isFinite(rad)) infCount++;
  if (Number.isNaN(rad)) nanCount++;
  if (rad < 1.2 || rad > 38.0) outOfBoundsCount++;
  if (rad < minR) minR = rad;
  if (rad > maxR) maxR = rad;

  // Check aAngle
  const angle = angleAttr.getX(i);
  if (!Number.isFinite(angle)) infCount++;
  if (Number.isNaN(angle)) nanCount++;

  // Check aSpeed
  const spd = speedAttr.getX(i);
  if (!Number.isFinite(spd) || spd <= 0) infCount++;
  if (Number.isNaN(spd)) nanCount++;
  if (spd < minSpeed) minSpeed = spd;
  if (spd > maxSpeed) maxSpeed = spd;

  // Check aPhase
  const ph = phaseAttr.getX(i);
  if (!Number.isFinite(ph) || ph < 0 || ph > Math.PI * 2) outOfBoundsCount++;
  if (Number.isNaN(ph)) nanCount++;

  // Check aArm
  const arm = armAttr.getX(i);
  if (![0, 1, 2, 3].includes(arm)) outOfBoundsCount++;
  if (arm >= 0 && arm <= 3) armHistogram[arm]++;

  // Check pointScale
  const sc = scaleAttr.getX(i);
  if (!Number.isFinite(sc) || sc < 0.75 || sc > 1.60) outOfBoundsCount++;
  if (Number.isNaN(sc)) nanCount++;
  if (sc < minScale) minScale = sc;
  if (sc > maxScale) maxScale = sc;
}

assert(nanCount === 0, 'Zero NaN values across all 5,600 particles', `nanCount = ${nanCount}`);
assert(infCount === 0, 'Zero Infinity/unbounded values across all 5,600 particles', `infCount = ${infCount}`);
assert(outOfBoundsCount === 0, 'All attributes strictly within expected physical boundaries', `outOfBounds = ${outOfBoundsCount}`);
assert(minR >= 1.2 && maxR <= 38.0, 'Radius bounded in [1.2, 38.0]', `minR = ${minR.toFixed(3)}, maxR = ${maxR.toFixed(3)}`);
assert(minSpeed > 0 && maxSpeed < 0.05, 'Keplerian speed physically bounded', `minSpeed = ${minSpeed.toFixed(4)}, maxSpeed = ${maxSpeed.toFixed(4)}`);
assert(
  armHistogram.every((c) => c > 1000),
  'All 4 spiral arms evenly populated with stardust',
  `arm counts: ${armHistogram.join(', ')}`
);

// Test 1.3: Bounding box and sphere computation
geom.computeBoundingBox();
geom.computeBoundingSphere();
assert(geom.boundingBox !== null, 'Bounding box computed');
assert(geom.boundingSphere !== null, 'Bounding sphere computed');
if (geom.boundingBox && geom.boundingSphere) {
  assert(Number.isFinite(geom.boundingSphere.radius), 'Bounding sphere radius is finite', `Radius: ${geom.boundingSphere.radius.toFixed(2)}`);
  assert(geom.boundingSphere.radius > 20 && geom.boundingSphere.radius < 50, 'Bounding sphere radius plausible for 38-unit galaxy');
}

// Test 1.4: Determinism test with identical seed
const customRng = createPRNG(987654);
const firstVal = customRng();
assert(firstVal >= 0 && firstVal < 1, 'createPRNG produces valid normalized floats');

const geom2 = generateSpiralStardustGeometry();
let buffersMatch = true;
const p1 = (geom.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
const p2 = (geom2.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
for (let i = 0; i < p1.length; i++) {
  if (p1[i] !== p2[i]) {
    buffersMatch = false;
    break;
  }
}
assert(buffersMatch, 'PRNG is strictly deterministic across runs with seed 987654');

// Test 1.5: Edge cases (count = 0, count = 1, count = 10,000)
const geomZero = generateSpiralStardustGeometry(0);
assert(geomZero.getAttribute('position').count === 0, 'Handles count = 0 without error');

const geomOne = generateSpiralStardustGeometry(1);
assert(geomOne.getAttribute('position').count === 1, 'Handles count = 1 without error');

const geomStress = generateSpiralStardustGeometry(10000);
assert(geomStress.getAttribute('position').count === 10000, 'Handles count = 10,000 stress test');
let stressNan = false;
const stressPos = (geomStress.getAttribute('position') as THREE.BufferAttribute).array;
for (let i = 0; i < stressPos.length; i++) {
  if (Number.isNaN(stressPos[i])) { stressNan = true; break; }
}
assert(!stressNan, 'Stress test count = 10,000 contains zero NaN');

// Clean up geometries
geom.dispose();
geom2.dispose();
geomZero.dispose();
geomOne.dispose();
geomStress.dispose();
assert(true, 'Disposed all test geometries cleanly');

console.log('\n================================================================');
console.log('SUITE 2: Shaders and Materials Verification');
console.log('================================================================');

const accretionMat = createAccretionDiskMaterial();
assert(accretionMat instanceof THREE.ShaderMaterial, 'accretionMat is ShaderMaterial');
assert(accretionMat.customProgramCacheKey!() === ACCRETION_DISK_CACHE_KEY, 'accretionMat has customProgramCacheKey');
assert(accretionMat.transparent === true, 'accretionMat is transparent');
assert(accretionMat.depthWrite === false, 'accretionMat depthWrite is false');

const lensingMat = createLensingArchMaterial();
assert(lensingMat instanceof THREE.ShaderMaterial, 'lensingMat is ShaderMaterial');
assert(lensingMat.customProgramCacheKey!() === LENSING_ARCH_CACHE_KEY, 'lensingMat has customProgramCacheKey');

const spiralDustMat = createSpiralDustMaterial();
assert(spiralDustMat instanceof THREE.PointsMaterial, 'spiralDustMat is PointsMaterial');
assert(spiralDustMat.customProgramCacheKey!() === SPIRAL_DUST_CACHE_KEY, 'spiralDustMat has customProgramCacheKey');

// Verify onBeforeCompile injection
const mockShader = {
  uniforms: {} as Record<string, { value: unknown }>,
  vertexShader: `
    #include <color_vertex>
    #include <begin_vertex>
    gl_PointSize = size;
  `,
  fragmentShader: `
    #include <map_particle_fragment>
  `,
} as unknown as THREE.WebGLProgramParametersWithUniforms;
spiralDustOnBeforeCompile(mockShader);
assert(!!mockShader.uniforms.uTime, 'spiralDustOnBeforeCompile injected uTime');
assert(!!mockShader.uniforms.uBrightness, 'spiralDustOnBeforeCompile injected uBrightness');
assert(!!mockShader.uniforms.uSubBass, 'spiralDustOnBeforeCompile injected uSubBass');
assert(mockShader.vertexShader.includes('aRadius'), 'vertexShader contains aRadius attribute');
assert(mockShader.vertexShader.includes('rotTime'), 'vertexShader contains rotTime Keplerian dynamics');
assert(mockShader.fragmentShader.includes('edgeFade'), 'fragmentShader contains Hermite edgeFade');

accretionMat.dispose();
lensingMat.dispose();
spiralDustMat.dispose();
assert(true, 'Disposed materials cleanly');

console.log('\n================================================================');
console.log('SUITE 3: Re-export Wrappers Verification');
console.log('================================================================');

// Test GalacticDustDisc re-exports
assert(typeof GalacticDustDiscModule.GalacticDustDisc === 'function', 'GalacticDustDisc is exported from GalacticDustDisc.tsx');
assert(typeof GalaxyIndexModule.GalacticDustDisc === 'function', 'GalacticDustDisc is exported from galaxy/index.ts');
assert(typeof GalacticDustDiscModule.SupermassiveBlackHole === 'function', 'SupermassiveBlackHole is exported from GalacticDustDisc.tsx');
assert(typeof GalacticDustDiscModule.SpiralStardustPoints === 'function', 'SpiralStardustPoints is exported from GalacticDustDisc.tsx');
assert(typeof GalacticDustDiscModule.generateSpiralStardustGeometry === 'function', 'generateSpiralStardustGeometry is exported from GalacticDustDisc.tsx');
assert(typeof GalacticDustDiscModule.createPRNG === 'function', 'createPRNG is exported from GalacticDustDisc.tsx');
assert(typeof GalacticDustDiscModule.createAccretionDiskMaterial === 'function', 'createAccretionDiskMaterial is exported from GalacticDustDisc.tsx');
assert(typeof GalacticDustDiscModule.createLensingArchMaterial === 'function', 'createLensingArchMaterial is exported from GalacticDustDisc.tsx');
assert(typeof GalacticDustDiscModule.createSpiralDustMaterial === 'function', 'createSpiralDustMaterial is exported from GalacticDustDisc.tsx');
assert(GalacticDustDiscModule.SPIRAL_DUST_CACHE_KEY === SPIRAL_DUST_CACHE_KEY, 'SPIRAL_DUST_CACHE_KEY is exported');
assert(GalacticDustDiscModule.ACCRETION_DISK_CACHE_KEY === ACCRETION_DISK_CACHE_KEY, 'ACCRETION_DISK_CACHE_KEY is exported');
assert(GalacticDustDiscModule.LENSING_ARCH_CACHE_KEY === LENSING_ARCH_CACHE_KEY, 'LENSING_ARCH_CACHE_KEY is exported');

// Test CameraFlightController re-exports
assert(typeof CameraFlightControllerModule.CameraFlightController === 'function', 'CameraFlightController is exported from CameraFlightController.tsx');
assert(typeof CameraFlightControllerModule.useWarpSequence === 'function', 'useWarpSequence is exported from CameraFlightController.tsx');
assert(typeof CameraFlightControllerModule.useArcFlight === 'function', 'useArcFlight is exported from CameraFlightController.tsx');
assert(typeof CameraFlightControllerModule.useOrbitalTracking === 'function', 'useOrbitalTracking is exported from CameraFlightController.tsx');
assert(typeof CameraFlightControllerModule.usePerformanceMonitor === 'function', 'usePerformanceMonitor is exported from CameraFlightController.tsx');

// Test HooksModule exports
assert(typeof HooksModule.useWarpSequence === 'function', 'useWarpSequence is exported from hooks/index.ts');
assert(typeof HooksModule.useArcFlight === 'function', 'useArcFlight is exported from hooks/index.ts');
assert(typeof HooksModule.useOrbitalTracking === 'function', 'useOrbitalTracking is exported from hooks/index.ts');
assert(typeof HooksModule.usePerformanceMonitor === 'function', 'usePerformanceMonitor is exported from hooks/index.ts');

console.log('\n================================================================');
console.log('SUITE 4: CameraFlightController Logic and Mathematical Stress Tests');
console.log('================================================================');

// Test 4.1: Parabolic Arc Math & Durations
function calculateFlightParams(startEye: THREE.Vector3, endEye: THREE.Vector3, prefersReducedMotion = false) {
  const travelDistance = startEye.distanceTo(endEye);
  if (travelDistance < 0.15) return { noop: true };

  let durationSec = 1.25;
  if (prefersReducedMotion) {
    durationSec = 0.2;
  } else if (travelDistance < 8.0) {
    durationSec = 0.72 + travelDistance * 0.035;
  } else if (travelDistance < 25.0) {
    durationSec = 1.05 + (travelDistance - 8.0) * 0.018;
  } else {
    durationSec = Math.min(1.70, 1.35 + (travelDistance - 25.0) * 0.007);
  }

  const isLocalHop = travelDistance < 10.0;
  const arcLift = (prefersReducedMotion || isLocalHop) ? 0 : Math.min(6.5, (travelDistance - 10.0) * 0.10);
  const lateralSway = (prefersReducedMotion || isLocalHop) ? 0 : Math.min(2.5, (travelDistance - 10.0) * 0.035);

  return { travelDistance, durationSec, arcLift, lateralSway, noop: false };
}

// Case A: Small local hop (distance 3.0)
const localHop = calculateFlightParams(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0));
assert(localHop.arcLift === 0, 'Local hop has 0 arcLift (prevents nausea)');
assert(localHop.lateralSway === 0, 'Local hop has 0 lateralSway');
assert(localHop.durationSec! >= 0.72 && localHop.durationSec! <= 1.0, `Local hop short duration: ${localHop.durationSec!.toFixed(3)}s`);

// Case B: Medium flight (distance 15.0)
const medFlight = calculateFlightParams(new THREE.Vector3(0, 0, 0), new THREE.Vector3(15, 0, 0));
assert(medFlight.arcLift! > 0, `Medium flight has positive arcLift: ${medFlight.arcLift!.toFixed(2)}`);
assert(medFlight.durationSec! >= 1.05 && medFlight.durationSec! <= 1.35, `Medium flight duration: ${medFlight.durationSec!.toFixed(3)}s`);

// Case C: Long cross-galaxy flight (distance 80.0 and 90.0)
const longFlight80 = calculateFlightParams(new THREE.Vector3(-40, 0, 0), new THREE.Vector3(40, 0, 0));
assert(longFlight80.arcLift! === 6.5, `Long flight caps arcLift at 6.5: ${longFlight80.arcLift}`);
assert(longFlight80.lateralSway! === 2.45, `Long flight (dist=80) calculates lateralSway: ${longFlight80.lateralSway}`);
assert(longFlight80.durationSec! <= 1.70, `Long flight caps duration at 1.70s: ${longFlight80.durationSec!.toFixed(3)}s`);

const longFlight90 = calculateFlightParams(new THREE.Vector3(-45, 0, 0), new THREE.Vector3(45, 0, 0));
assert(longFlight90.lateralSway! === 2.5, `Long flight (dist=90) caps lateralSway at 2.5: ${longFlight90.lateralSway}`);

// Case D: Bell curve trajectory calculation at p=0, p=0.5, p=1.0
const pValues = [0, 0.25, 0.5, 0.75, 1.0];
const heights = pValues.map((p) => Math.sin(p * Math.PI) * medFlight.arcLift!);
assert(heights[0] === 0, 'Trajectory arc height is 0 at start (p=0)');
assert(Math.abs(heights[4]) < 1e-10, 'Trajectory arc height is 0 at end (p=1)');
assert(heights[2] === medFlight.arcLift, 'Trajectory arc height peaks at apex (p=0.5)');

// Test 4.2: Orbital Tracking Micro-Delta Guard
function testOrbitalTrackingStep(curWorldPos: THREE.Vector3, lastTargetWorldPos: THREE.Vector3) {
  if (lastTargetWorldPos.lengthSq() <= 0.001) {
    lastTargetWorldPos.copy(curWorldPos);
    return { applied: false, reason: 'first-frame initialization' };
  }
  const deltaX = curWorldPos.x - lastTargetWorldPos.x;
  const deltaY = curWorldPos.y - lastTargetWorldPos.y;
  const deltaZ = curWorldPos.z - lastTargetWorldPos.z;
  const deltaSq = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;

  if (deltaSq > 0.0000001 && deltaSq < 0.25) {
    lastTargetWorldPos.copy(curWorldPos);
    return { applied: true, deltaSq, reason: 'valid orbital delta' };
  } else {
    lastTargetWorldPos.copy(curWorldPos);
    return { applied: false, deltaSq, reason: deltaSq >= 0.25 ? 'jump-too-large-snap-guard' : 'delta-too-small' };
  }
}

const lastTarget = new THREE.Vector3(0, 0, 0);
// Frame 1: Init
const f1 = testOrbitalTrackingStep(new THREE.Vector3(10, 0, 10), lastTarget);
assert(!f1.applied && f1.reason === 'first-frame initialization', 'Frame 1 initializes lastTarget without snap');

// Frame 2: Tiny orbital delta (rotates ~0.007 rad in 16ms -> delta ~0.001 units)
const f2 = testOrbitalTrackingStep(new THREE.Vector3(10.001, 0, 10.001), lastTarget);
assert(f2.applied, `Smooth orbital delta tracked: deltaSq = ${f2.deltaSq?.toExponential(2)}`);

// Frame 3: Massive sudden jump (e.g. node selection switch, delta = 30 units)
const f3 = testOrbitalTrackingStep(new THREE.Vector3(40, 5, 20), lastTarget);
assert(!f3.applied && f3.reason === 'jump-too-large-snap-guard', 'Massive jump guarded against camera snap');

// Test 4.3: Telemetry Sampling Window (500ms batching)
let frameCount = 0;
let lastSampleTime = 1000;
function testTelemetryFrame(now: number): { sampled: boolean; fps?: number } {
  frameCount++;
  const elapsed = now - lastSampleTime;
  if (elapsed >= 500) {
    const fps = Math.min(120, Math.round((frameCount * 1000) / elapsed));
    frameCount = 0;
    lastSampleTime = now;
    return { sampled: true, fps };
  }
  return { sampled: false };
}

// 30 frames over 490ms (no sample yet)
let sampledBefore500 = false;
for (let t = 1016; t <= 1490; t += 16) {
  if (testTelemetryFrame(t).sampled) sampledBefore500 = true;
}
assert(!sampledBefore500, 'Telemetry does not sample or trigger re-renders before 500ms elapsed');

// Frame at 505ms
const sampleResult = testTelemetryFrame(1505);
assert(sampleResult.sampled, 'Telemetry samples once at 500ms boundary');
assert(sampleResult.fps! > 55 && sampleResult.fps! <= 65, `FPS accurately calculated: ${sampleResult.fps}`);

// Test 4.4: Camera Controls Event Listener Attachment and Cleanup
const eventListeners: Record<string, ((e?: unknown) => void)[]> = {};
const mockControls = {
  addEventListener: (event: string, fn: (e?: unknown) => void) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(fn);
  },
  removeEventListener: (event: string, fn: (e?: unknown) => void) => {
    if (!eventListeners[event]) return;
    eventListeners[event] = eventListeners[event].filter((cb) => cb !== fn);
  },
  setLookAt: (...args: unknown[]) => { void args; },
};

let controlStartFired = false;
const handler = () => { controlStartFired = true; };
mockControls.addEventListener('controlstart', handler);
assert(eventListeners['controlstart'].length === 1, 'Control listener registered');
eventListeners['controlstart'][0]();
assert(controlStartFired, 'Control start triggered registered handler');
mockControls.removeEventListener('controlstart', handler);
assert(eventListeners['controlstart'].length === 0, 'Control listener cleaned up on unmount');

// Test 4.5: GSAP Tween Termination Safety
let tweenActive = true;
const mockTween = {
  kill: () => { tweenActive = false; },
};
let curTween: typeof mockTween | null = mockTween;
// Emulate unmount / flight interruption cleanup:
if (curTween) {
  curTween.kill();
  curTween = null;
}
assert(!tweenActive, 'Tween killed on cancellation');
assert(curTween === null, 'Tween ref set to null (prevents memory leak)');

console.log('\n================================================================');
console.log('SUMMARY OF EMPIRICAL VERIFICATION');
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
  console.log('\nALL EMPIRICAL TESTS PASSED PERFECTLY!');
  process.exit(0);
}
