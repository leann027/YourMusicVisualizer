'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import type CameraControlsImpl from 'camera-controls';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { cameraAspect, overviewPoseFor } from '../nebulaV3/overviewCamera';

// Overview framing for the current renderer mode, read at call time (the mode can change mid-warp)
function currentOverview(controls: CameraControlsImpl) {
  const { rendererMode, baseData } = useGalaxyStore.getState();
  const cores = rendererMode === 'nebula' ? getNebulaLayout(baseData).cores : null;
  return overviewPoseFor(rendererMode, cores, cameraAspect(controls.camera));
}

export interface UseWarpSequenceOptions {
  controlsRef: React.RefObject<CameraControlsImpl | null>;
  warpProgressRef?: React.MutableRefObject<number>;
}

export interface UseWarpSequenceReturn {
  startWarpSequence: () => boolean;
  cancelWarp: () => void;
  introTweenRef: React.MutableRefObject<gsap.core.Tween | null>;
  warpInitiatedRef: React.MutableRefObject<boolean>;
}

/**
 * Cinematic Intro Warp-in Sequence upon entering the galaxy (Hyperspace Warp Drive).
 * Initiated as soon as the CameraControls instance is mounted.
 * Handles keyboard shortcuts (Escape, Space, Enter) and manual grab interruptions.
 */
export function useWarpSequence({
  controlsRef,
  warpProgressRef,
}: UseWarpSequenceOptions): UseWarpSequenceReturn {
  const introTweenRef = useRef<gsap.core.Tween | null>(null);
  const warpInitiatedRef = useRef(false);

  const isWarpActive = useGalaxyStore((s) => s.isWarpActive);
  const finishWarp = useGalaxyStore((s) => s.finishWarp);
  const skipWarp = useGalaxyStore((s) => s.skipWarp);
  const setFlightState = useGalaxyStore((s) => s.setFlightState);

  const cancelWarp = useCallback(() => {
    if (introTweenRef.current) {
      introTweenRef.current.kill();
      introTweenRef.current = null;
    }
    if (warpProgressRef) {
      warpProgressRef.current = 1.0;
    }
  }, [warpProgressRef]);

  // Stop active intro sequence immediately if user manually grabs the camera
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleUserControlStart = () => {
      if (introTweenRef.current || isWarpActive) {
        cancelWarp();
        if (isWarpActive) {
          skipWarp();
        }
        setFlightState(false);
      }
    };

    controls.addEventListener('controlstart', handleUserControlStart);
    return () => {
      controls.removeEventListener('controlstart', handleUserControlStart);
    };
  }, [controlsRef, cancelWarp, isWarpActive, skipWarp, setFlightState]);

  // Keyboard shortcut to skip warp (Escape, Space, Enter)
  useEffect(() => {
    if (!isWarpActive) return;

    const handleSkipKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        cancelWarp();
        const controls = controlsRef.current;
        if (controls) {
          const { eye, target } = currentOverview(controls);
          controls.setLookAt(eye[0], eye[1], eye[2], target[0], target[1], target[2], false);
        }
        setFlightState(false);
        skipWarp();
      }
    };

    window.addEventListener('keydown', handleSkipKey);
    return () => {
      window.removeEventListener('keydown', handleSkipKey);
    };
  }, [isWarpActive, cancelWarp, controlsRef, setFlightState, skipWarp]);

  const startWarpSequence = useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return false;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (warpProgressRef) warpProgressRef.current = 1.0;
      const { eye, target } = currentOverview(controls);
      controls.setLookAt(eye[0], eye[1], eye[2], target[0], target[1], target[2], false);
      finishWarp();
      return true;
    }

    // High-speed approach vantage point from deep space along straight/sweeping trajectory
    const startX = 12;
    const startY = 46;
    const startZ = 295;


    controls.setLookAt(startX, startY, startZ, 0, 3, 0, false);
    setFlightState(true, 3400);

    const proxy = { t: 0 };
    introTweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: 3.4,
      ease: 'power4.out',
      onUpdate: () => {
        const p = proxy.t;
        if (warpProgressRef) {
          warpProgressRef.current = p;
        }

        // destination re-read every frame: classic [0, 18, 52] or the nebula overview (M8.2)
        const [endX, endY, endZ] = currentOverview(controls).eye;
        const curEyeX = THREE.MathUtils.lerp(startX, endX, p);
        const curEyeY = THREE.MathUtils.lerp(startY, endY, p);
        const curEyeZ = THREE.MathUtils.lerp(startZ, endZ, p);
        const curTargetY = THREE.MathUtils.lerp(3, 0, p);

        controls.setLookAt(curEyeX, curEyeY, curEyeZ, 0, curTargetY, 0, false);
      },
      onComplete: () => {
        if (warpProgressRef) {
          warpProgressRef.current = 1.0;
        }
        introTweenRef.current = null;
        setFlightState(false, 3400);
        finishWarp();
      },
    });

    return true;
  }, [controlsRef, finishWarp, setFlightState, warpProgressRef]);

  // Clean up GSAP intro tween on component unmount
  useEffect(() => {
    return () => {
      if (introTweenRef.current) {
        introTweenRef.current.kill();
        introTweenRef.current = null;
      }
    };
  }, []);

  return {
    startWarpSequence,
    cancelWarp,
    introTweenRef,
    warpInitiatedRef,
  };
}
