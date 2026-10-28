import * as THREE from 'three';
import type { NebulaLayoutResult, NebulaRelation } from '../../../lib/layout/nebulaLayout';
import type { CameraViewMode, CollisionSelection } from '../../../store/useGalaxyStore';
import type { MusicNode } from '../../../types/music';

/**
 * Collision camera (M7.3): framing a collision like the reference does — looking at the
 * contact point from a side perpendicular to the line between both cores, so the shock
 * front and the tides cross the screen.
 */

/** Reference framing distance: (Sa + Sb) · 1.55 from the contact point. */
export const COLLISION_VIEW_FACTOR = 1.55;

export interface CameraPose {
  eye: THREE.Vector3;
  target: THREE.Vector3;
}

/**
 * Eye perpendicular to `dir`, on the side closest to `currentEye` so the flight stays short.
 * All vectors in the same (world) space.
 */
export function collisionCameraPose(
  contact: THREE.Vector3,
  dir: THREE.Vector3,
  radiusA: number,
  radiusB: number,
  currentEye: THREE.Vector3
): CameraPose {
  const axis = dir.clone().normalize();
  const side = currentEye.clone().sub(contact);
  side.sub(axis.clone().multiplyScalar(side.dot(axis)));
  if (side.lengthSq() < 1e-6) {
    // camera aligned with the collision axis: fall back to the vertical, then to any perpendicular
    side.set(0, 1, 0).sub(axis.clone().multiplyScalar(axis.y));
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0).sub(axis.clone().multiplyScalar(axis.x));
  }
  side.normalize();
  const distance = (radiusA + radiusB) * COLLISION_VIEW_FACTOR;
  return { eye: contact.clone().add(side.multiplyScalar(distance)), target: contact.clone() };
}

/** The relation behind a selected collision, if it exists in this layout. */
export function findCollision(layout: NebulaLayoutResult, selection: CollisionSelection | null): NebulaRelation | null {
  if (!selection) return null;
  return layout.relations.find((r) => r.a === selection.a && r.b === selection.b) ?? null;
}

/**
 * Local (cosmos-group) position the camera follows while the galaxy rotates: the contact
 * point of the selected collision, otherwise the selected node.
 */
export function trackedLocalPosition(
  cameraMode: CameraViewMode,
  selectedNode: MusicNode | null,
  collision: NebulaRelation | null
): [number, number, number] | null {
  if (cameraMode === 'galaxy') return null;
  if (cameraMode === 'collision') return collision ? collision.contact : null;
  return selectedNode ? selectedNode.position : null;
}
