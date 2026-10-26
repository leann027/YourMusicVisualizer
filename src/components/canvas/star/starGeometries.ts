import * as THREE from 'three';

/**
 * Shared static unit geometries across all celestial stars.
 * Instantiated once to minimize WebGL VBO allocations and state switches.
 */
export const UNIT_SPHERE_GEOMETRY = new THREE.SphereGeometry(1, 16, 16);
export const UNIT_RING_GEOMETRY = new THREE.RingGeometry(1.35, 1.95, 32, 8);
export const UNIT_OUTER_RING_GEOMETRY = new THREE.RingGeometry(2.0, 2.5, 36, 8);
export const UNIT_RIPPLE_GEOMETRY = new THREE.RingGeometry(1.2, 1.8, 36, 4);
export const UNIT_POLAR_JET_GEOMETRY = new THREE.CylinderGeometry(0.04, 0.28, 4.0, 12, 1, true);
export const UNIT_SATELLITE_GEOMETRY = new THREE.SphereGeometry(0.05, 8, 8);
export const UNIT_DIFFRACTION_GEOMETRY = new THREE.PlaneGeometry(3.6, 0.05);

/**
 * Disposes static unit geometries on application tear-down if needed.
 */
export function disposeStarGeometries(): void {
  UNIT_SPHERE_GEOMETRY.dispose();
  UNIT_RING_GEOMETRY.dispose();
  UNIT_OUTER_RING_GEOMETRY.dispose();
  UNIT_RIPPLE_GEOMETRY.dispose();
  UNIT_POLAR_JET_GEOMETRY.dispose();
  UNIT_SATELLITE_GEOMETRY.dispose();
  UNIT_DIFFRACTION_GEOMETRY.dispose();
}
