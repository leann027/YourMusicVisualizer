'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type CameraControlsImpl from 'camera-controls';
import { useGalaxyStore } from '../../../store/useGalaxyStore';

export interface UseOrbitalTrackingOptions {
  controlsRef: React.RefObject<CameraControlsImpl | null>;
  galaxyContainerRef?: React.RefObject<THREE.Group | null>;
  isFlightActive: () => boolean;
}

/**
 * World matrix tracking following inspected star under continuous galaxy rotation (0.007 rad/s).
 * Maintains smooth camera focus without snapping during celestial orbit.
 */
export function useOrbitalTracking({
  controlsRef,
  galaxyContainerRef,
  isFlightActive,
}: UseOrbitalTrackingOptions): void {
  const lastTargetWorldPos = useRef(new THREE.Vector3());

  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const isFlying = useGalaxyStore((s) => s.isFlying);

  useFrame(() => {
    if (
      galaxyContainerRef?.current &&
      selectedNode &&
      cameraMode !== 'galaxy' &&
      !isFlightActive() &&
      !isFlying
    ) {
      const controls = controlsRef.current;
      if (controls) {
        const localPos = new THREE.Vector3(...selectedNode.position);
        const curWorldPos = localPos.applyMatrix4(galaxyContainerRef.current.matrixWorld);

        if (lastTargetWorldPos.current.lengthSq() > 0.001) {
          const deltaX = curWorldPos.x - lastTargetWorldPos.current.x;
          const deltaY = curWorldPos.y - lastTargetWorldPos.current.y;
          const deltaZ = curWorldPos.z - lastTargetWorldPos.current.z;

          const deltaSq = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
          // Smooth micro delta tracking (guards against sudden camera flight snaps)
          if (deltaSq > 0.0000001 && deltaSq < 0.25) {
            const curTarget = new THREE.Vector3();
            const curPos = new THREE.Vector3();
            controls.getTarget(curTarget);
            controls.getPosition(curPos);

            controls.setLookAt(
              curPos.x + deltaX,
              curPos.y + deltaY,
              curPos.z + deltaZ,
              curTarget.x + deltaX,
              curTarget.y + deltaY,
              curTarget.z + deltaZ,
              false
            );
          }
        }
        lastTargetWorldPos.current.copy(curWorldPos);
      }
    } else {
      lastTargetWorldPos.current.set(0, 0, 0);
    }
  });
}
