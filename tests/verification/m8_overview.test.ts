import * as THREE from 'three';
import {
  CENTRE_MARGIN,
  CENTRE_MARGIN_Y,
  CLASSIC_OVERVIEW,
  HUD_SAFE_Y,
  MAX_OVERVIEW_DISTANCE,
  nebulaOverviewPose,
  overviewPoseFor,
  VISIBLE_RADIUS_SHARE,
} from '../../src/components/canvas/nebulaV3/overviewCamera';
import { getNebulaLayout, NebulaCore } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50, GALAXY_PRESET_150, GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';

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

/** Worst NDC of the nebula centres (x, y) and of their vertical VISIBLE_RADIUS_SHARE edges (y). */
function measure(cores: NebulaCore[], pose: { eye: number[]; target: number[] }, aspect: number, rotationY: number) {
  const camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 800);
  camera.position.set(pose.eye[0], pose.eye[1], pose.eye[2]);
  camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  camera.updateMatrixWorld();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const rot = new THREE.Matrix4().makeRotationY(rotationY);
  let centreX = 0;
  let centreY = 0;
  let edgeY = 0;
  for (const c of cores) {
    const center = new THREE.Vector3(...c.center).applyMatrix4(rot);
    const ndc = center.clone().project(camera);
    centreX = Math.max(centreX, Math.abs(ndc.x));
    centreY = Math.max(centreY, Math.abs(ndc.y));
    for (const sign of [1, -1]) {
      edgeY = Math.max(edgeY, Math.abs(center.clone().addScaledVector(up, sign * c.radius * VISIBLE_RADIUS_SHARE).project(camera).y));
    }
  }
  return { centreX, centreY, edgeY };
}

console.log('================================================================');
console.log('SUITE M8.2: nebula galaxy overview framing');
console.log('================================================================');

assert(JSON.stringify(overviewPoseFor('classic', null, 1.78)) === JSON.stringify(CLASSIC_OVERVIEW), 'classic keeps the [0, 18, 52] overview');
assert(JSON.stringify(CLASSIC_OVERVIEW.eye) === '[0,18,52]' && JSON.stringify(CLASSIC_OVERVIEW.target) === '[0,0,0]', 'classic overview values unchanged');

const aspects: [string, number][] = [['16:9', 16 / 9], ['4:3', 4 / 3], ['phone portrait 9:19.5', 9 / 19.5]];
for (const [name, data] of [['preset50', GALAXY_PRESET_50], ['preset150', GALAXY_PRESET_150], ['preset300', GALAXY_PRESET_300]] as const) {
  const cores = getNebulaLayout(data).cores;
  for (const [label, aspect] of aspects) {
    const pose = nebulaOverviewPose(cores, aspect);
    // looks at the black hole's vertical axis (x = z = 0); the offset from the target keeps the classic elevation
    const offset = new THREE.Vector3(...pose.eye).sub(new THREE.Vector3(...pose.target));
    const eye = offset;
    const elevationOk = Math.abs(offset.clone().normalize().dot(new THREE.Vector3(0, 18, 52).normalize()) - 1) < 1e-9;
    assert(elevationOk && pose.target[0] === 0 && pose.target[2] === 0, `${name} ${label}: same elevation as classic, looking at the black hole's axis`, JSON.stringify(pose.target));
    assert(eye.length() >= Math.hypot(0, 18, 52) - 1e-9, `${name} ${label}: never closer than the classic overview`, eye.length().toFixed(1));
    const rotations = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 0.4, 2.0, 3.6, 5.2]; // includes angles between the fitted ones
    const worst = rotations.map((rot) => measure(cores, pose, aspect, rot)).reduce(
      (a, m) => ({ centreX: Math.max(a.centreX, m.centreX), centreY: Math.max(a.centreY, m.centreY), edgeY: Math.max(a.edgeY, m.edgeY) }),
      { centreX: 0, centreY: 0, edgeY: 0 }
    );
    const capped = eye.length() >= MAX_OVERVIEW_DISTANCE - 1e-9;
    assert(eye.length() <= MAX_OVERVIEW_DISTANCE + 1e-9, `${name} ${label}: no farther than ${MAX_OVERVIEW_DISTANCE} u (gas stays visible)`, eye.length().toFixed(1));
    if (!capped) {
      // between fitted angles a little slack is allowed
      assert(worst.centreX <= CENTRE_MARGIN + 0.08 && worst.centreY <= CENTRE_MARGIN_Y + 0.08, `${name} ${label}: every nebula centre on screen at any rotation`, `x ${worst.centreX.toFixed(2)} y ${worst.centreY.toFixed(2)}`);
      assert(worst.edgeY <= HUD_SAFE_Y + 0.05, `${name} ${label}: ${VISIBLE_RADIUS_SHARE * 100}% of each nebula clear of the HUD header and dock`, worst.edgeY.toFixed(2));
    } else {
      // capped (narrow portrait): vertical framing still holds, sides may crop outer nebulae
      assert(worst.centreY <= CENTRE_MARGIN_Y + 0.08 && worst.edgeY <= HUD_SAFE_Y + 0.05, `${name} ${label}: capped, vertical framing still holds`, `y ${worst.centreY.toFixed(2)} edge ${worst.edgeY.toFixed(2)}`);
    }
    console.log(`    ↳ ${name} ${label}: distance ${eye.length().toFixed(1)} u${capped ? ' (capped)' : ''} · centres x ${worst.centreX.toFixed(2)} y ${worst.centreY.toFixed(2)} · edges y ${worst.edgeY.toFixed(2)}`);
  }
}
assert(
  nebulaOverviewPose([], 1.78).eye.every((v, i) => Math.abs(v - CLASSIC_OVERVIEW.eye[i]) < 1e-9) &&
    JSON.stringify(nebulaOverviewPose([], 1.78).target) === '[0,0,0]',
  'no cores → classic distance'
);

console.log('\n================================================================');
console.log('SUMMARY OF M8.2 VERIFICATION');
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
  console.log('\nALL M8.2 TESTS PASSED');
  process.exit(0);
}
