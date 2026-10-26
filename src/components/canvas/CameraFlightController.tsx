'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import {
  useWarpSequence,
  useArcFlight,
  useOrbitalTracking,
  usePerformanceMonitor,
} from './hooks';

export interface CameraFlightControllerProps {
  warpProgressRef?: React.MutableRefObject<number>;
  galaxyContainerRef?: React.RefObject<THREE.Group | null>;
}

/**
 * CameraFlightController coordinates cinematic camera controls across the 3D galaxy:
 * - `useWarpSequence`: Hyperspace warp-in intro sequence & keyboard skip handlers.
 * - `useArcFlight`: Calibrated parabolic arc flights on node selection.
 * - `useOrbitalTracking`: Continuous world-space tracking following selected stars.
 * - `usePerformanceMonitor`: Telemetry and FPS sampling.
 */
export const CameraFlightController: React.FC<CameraFlightControllerProps> = ({
  warpProgressRef,
  galaxyContainerRef,
}) => {
  const controlsRef = useRef<CameraControlsImpl>(null);

  const { startWarpSequence, cancelWarp, introTweenRef, warpInitiatedRef } =
    useWarpSequence({
      controlsRef,
      warpProgressRef,
    });

  const { tweenRef } = useArcFlight({
    controlsRef,
    galaxyContainerRef,
    onFlightStart: cancelWarp,
  });

  useOrbitalTracking({
    controlsRef,
    galaxyContainerRef,
    isFlightActive: () => Boolean(tweenRef.current || introTweenRef.current),
  });

  usePerformanceMonitor({
    controlsRef,
  });

  // Initiate warp sequence the moment CameraControls is ready on the first render frame
  useFrame(() => {
    if (!warpInitiatedRef.current && controlsRef.current) {
      const ok = startWarpSequence();
      if (ok) {
        warpInitiatedRef.current = true;
      }
    }
  });

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={4.8}
      maxDistance={140}
      smoothTime={0.35}
      draggingSmoothTime={0.16}
      azimuthRotateSpeed={0.50}
      polarRotateSpeed={0.50}
      dollySpeed={0.75}
    />
  );
};

export * from './hooks';
