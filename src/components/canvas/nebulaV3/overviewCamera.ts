import * as THREE from 'three';
import type { NebulaCore } from '../../../lib/layout/nebulaLayout';

/**
 * Galaxy overview framing (M8.2). The classic overview ([0, 18, 52] looking at the black hole)
 * was tuned for the flat galactic disc; the nebula cosmos is a ~35 u sphere around the black
 * hole, so its overview keeps the same elevation, looks at the black hole's vertical axis (at the
 * cosmos' vertical midpoint, which the rotation around Y never changes) and backs off until every
 * nebula fits the view.
 */

export const CLASSIC_OVERVIEW = { eye: [0, 18, 52] as [number, number, number], target: [0, 0, 0] as [number, number, number] };
const OVERVIEW_DIRECTION = new THREE.Vector3(...CLASSIC_OVERVIEW.eye).normalize();
const MIN_DISTANCE = new THREE.Vector3(...CLASSIC_OVERVIEW.eye).length();
/** Beyond this the gas fades (shader far fade 42–210 u keeps ~64% at 110 u) and particles get tiny. */
export const MAX_OVERVIEW_DISTANCE = 110;
/** Share of a nebula radius that must stay on screen vertically (the soft outer gas may be cut). */
export const VISIBLE_RADIUS_SHARE = 0.6;
/** Nebula centres stay inside this NDC box (x, and y within the HUD-safe band). */
export const CENTRE_MARGIN = 0.85;
/** The glass header and dock cover ~8% of the height each: keep content within this vertical NDC band. */
export const HUD_SAFE_Y = 0.8;
export const CENTRE_MARGIN_Y = 0.72;
const FIT_ROTATIONS = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6]; // the cosmos rotates around the black hole
const DISTANCE_STEP = 0.5;

export interface OverviewPose {
  eye: [number, number, number];
  target: [number, number, number];
}

/** Vertical midpoint of the visible cosmos; rotation around the Y axis leaves it unchanged. */
function verticalMidpoint(cores: NebulaCore[]): number {
  if (!cores.length) return 0;
  const ys = cores.flatMap((c) => [c.center[1] - c.radius * VISIBLE_RADIUS_SHARE, c.center[1] + c.radius * VISIBLE_RADIUS_SHARE]);
  return (Math.min(...ys) + Math.max(...ys)) / 2;
}

function framesAll(cores: NebulaCore[], distance: number, aspect: number, fovDeg: number, targetY: number): boolean {
  const camera = new THREE.PerspectiveCamera(fovDeg, aspect, 0.1, 800);
  camera.position.copy(OVERVIEW_DIRECTION).multiplyScalar(distance).setY(camera.position.y + targetY);
  camera.lookAt(0, targetY, 0);
  camera.updateMatrixWorld();
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const p = new THREE.Vector3();
  const edge = new THREE.Vector3();
  for (const angle of FIT_ROTATIONS) {
    const rotation = new THREE.Matrix4().makeRotationY(angle);
    for (const c of cores) {
      p.set(c.center[0], c.center[1], c.center[2]).applyMatrix4(rotation);
      const ndc = p.clone().project(camera);
      if (Math.abs(ndc.x) > CENTRE_MARGIN || Math.abs(ndc.y) > CENTRE_MARGIN_Y) return false;
      for (const sign of [1, -1]) {
        edge.copy(p).addScaledVector(up, sign * c.radius * VISIBLE_RADIUS_SHARE).project(camera);
        if (Math.abs(edge.y) > HUD_SAFE_Y) return false;
      }
    }
  }
  return true;
}

/**
 * Overview pose for the nebula cosmos. `aspect` = width / height, `fovDeg` = vertical FOV.
 * Closest distance (between the classic 55 u and MAX_OVERVIEW_DISTANCE) where, at any rotation
 * of the cosmos, every nebula centre stays inside CENTRE_MARGIN and VISIBLE_RADIUS_SHARE of its
 * radius stays on screen vertically. Narrow portrait screens hit the cap and may crop the outer
 * gas at the sides (the classic overview crops more).
 */
export function nebulaOverviewPose(cores: NebulaCore[], aspect: number, fovDeg = 52): OverviewPose {
  const targetY = verticalMidpoint(cores);
  let distance = MIN_DISTANCE;
  while (distance < MAX_OVERVIEW_DISTANCE && !framesAll(cores, distance, Math.max(0.1, aspect), fovDeg, targetY)) {
    distance = Math.min(MAX_OVERVIEW_DISTANCE, distance + DISTANCE_STEP);
  }
  const eye = OVERVIEW_DIRECTION.clone().multiplyScalar(distance);
  return { eye: [eye.x, eye.y + targetY, eye.z], target: [0, targetY, 0] };
}

/** Overview pose for the current renderer mode (classic keeps its historical framing). */
export function overviewPoseFor(
  rendererMode: 'classic' | 'nebula',
  cores: NebulaCore[] | null,
  aspect: number
): OverviewPose {
  return rendererMode === 'nebula' && cores ? nebulaOverviewPose(cores, aspect) : CLASSIC_OVERVIEW;
}

/** Aspect ratio of the camera driven by camera-controls (1.6 if it is not a perspective camera). */
export function cameraAspect(camera: THREE.Camera | undefined): number {
  return camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1.6;
}
