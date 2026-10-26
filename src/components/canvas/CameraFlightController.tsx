'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';

interface CameraFlightControllerProps {
  warpProgressRef?: React.MutableRefObject<number>;
}

export const CameraFlightController: React.FC<CameraFlightControllerProps> = ({ warpProgressRef }) => {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const introTweenRef = useRef<gsap.core.Tween | null>(null);
  const warpInitiatedRef = useRef(false);

  const flightVersion = useGalaxyStore((s) => s.flightVersion);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const setFlightState = useGalaxyStore((s) => s.setFlightState);
  const setCameraDistance = useGalaxyStore((s) => s.setCameraDistance);
  const updatePerfStats = useGalaxyStore((s) => s.updatePerfStats);
  const isWarpActive = useGalaxyStore((s) => s.isWarpActive);
  const finishWarp = useGalaxyStore((s) => s.finishWarp);
  const skipWarp = useGalaxyStore((s) => s.skipWarp);

  const { gl, camera } = useThree();

  // Performance & camera distance sampling accumulators (no per-frame React state updates)
  const frameCountRef = useRef(0);
  const lastSampleTimeRef = useRef(performance.now());
  const tempTargetRef = useRef(new THREE.Vector3());

  // Stop any active GSAP flight immediately if the user manually grabs the camera
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleUserControlStart = () => {
      if (introTweenRef.current) {
        introTweenRef.current.kill();
        introTweenRef.current = null;
      }
      if (warpProgressRef) {
        warpProgressRef.current = 1.0;
      }
      if (isWarpActive) {
        skipWarp();
      }
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      setFlightState(false);
    };

    controls.addEventListener('controlstart', handleUserControlStart);
    return () => {
      controls.removeEventListener('controlstart', handleUserControlStart);
    };
  }, [setFlightState, isWarpActive, skipWarp, warpProgressRef]);

  // Keyboard shortcut to skip warp (Escape, Space, Enter)
  useEffect(() => {
    if (!isWarpActive) return;

    const handleSkipKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        if (introTweenRef.current) {
          introTweenRef.current.kill();
          introTweenRef.current = null;
        }
        if (warpProgressRef) {
          warpProgressRef.current = 1.0;
        }
        const controls = controlsRef.current;
        if (controls) {
          controls.setLookAt(0, 18, 52, 0, 0, 0, false);
        }
        setFlightState(false);
        skipWarp();
      }
    };

    window.addEventListener('keydown', handleSkipKey);
    return () => {
      window.removeEventListener('keydown', handleSkipKey);
    };
  }, [isWarpActive, skipWarp, setFlightState, warpProgressRef]);

  // Story 1: Cinematic Intro Warp-in Sequence upon entering the galaxy (Hyperspace Warp Drive)
  // Initiated reliably via useFrame as soon as CameraControls instance is mounted.
  const startWarpSequence = React.useCallback(() => {
    const controls = controlsRef.current;
    if (!controls) return false;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      if (warpProgressRef) warpProgressRef.current = 1.0;
      controls.setLookAt(0, 18, 52, 0, 0, 0, false);
      finishWarp();
      return true;
    }

    // High-speed approach vantage point from deep space along straight/sweeping trajectory
    const startX = 12;
    const startY = 46;
    const startZ = 295;

    const endX = 0;
    const endY = 18;
    const endZ = 52;

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
  }, [finishWarp, setFlightState, warpProgressRef]);

  // Clean up GSAP intro tween on component unmount
  useEffect(() => {
    return () => {
      if (introTweenRef.current) {
        introTweenRef.current.kill();
        introTweenRef.current = null;
      }
    };
  }, []);

  // Execute calibrated GSAP camera flight whenever flightVersion increments
  useEffect(() => {
    if (flightVersion === 0) return;
    const controls = controlsRef.current;
    if (!controls) return;

    // Immediately cancel any intro sequence if the user selected a star or sector
    if (introTweenRef.current) {
      introTweenRef.current.kill();
      introTweenRef.current = null;
    }

    // Kill any in-progress flight before starting the new trajectory
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
    }

    const startEye = new THREE.Vector3();
    const startTarget = new THREE.Vector3();
    controls.getPosition(startEye);
    controls.getTarget(startTarget);

    const endTarget = new THREE.Vector3(0, 0, 0);
    const endEye = new THREE.Vector3(0, 24, 72);

    if (cameraMode === 'galaxy' || !selectedNode) {
      endTarget.set(0, 0, 0);
      endEye.set(0, 18, 52);
    } else {
      const [nx, ny, nz] = selectedNode.position;
      endTarget.set(nx, ny, nz);

      if (cameraMode === 'sector') {
        // Approach along outward radial vector with elevated framing over the entire sector cluster
        const radial = new THREE.Vector3(nx, ny * 0.4, nz);
        if (radial.lengthSq() < 0.01) radial.set(0, 0, 1);
        radial.normalize();

        endEye.set(
          nx + radial.x * 6.5 + 2.0,
          ny + 5.5,
          nz + 21.0
        );
      } else if (cameraMode === 'artist') {
        // Offset slightly right of target with comfortable clearance so corona never overwhelms
        endEye.set(nx + 2.4, ny + 2.0, nz + 13.5);
      } else {
        // 'song' micro satellite close-up with comfortable depth margin
        endEye.set(nx + 1.6, ny + 1.2, nz + 8.5);
      }
    }

    const travelDistance = startEye.distanceTo(endEye);
    if (travelDistance < 0.15) {
      setFlightState(false);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Smooth, cinematic flight duration:
    // Short hops (e.g. song within artist cluster, < 8 units): ~0.72s
    // Medium flights (artist to artist within sector, 8 - 25 units): ~1.05s - 1.35s
    // Long cross-galaxy flights (> 25 units, or going back to galaxy overview): ~1.4s - 1.7s
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

    // Parabolic arc lift: only for long/medium cross-constellation flights!
    // Never arc on small local hops (e.g. selecting songs or nearby artists) to prevent nauseating bounces!
    const isLocalHop = travelDistance < 10.0;
    const arcLift = (prefersReducedMotion || isLocalHop)
      ? 0
      : Math.min(6.5, (travelDistance - 10.0) * 0.10);
    const lateralSway = (prefersReducedMotion || isLocalHop)
      ? 0
      : Math.min(2.5, (travelDistance - 10.0) * 0.035);

    const proxy = { t: 0 };
    const durationMs = Math.round(durationSec * 1000);
    setFlightState(true, durationMs);

    tweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: durationSec,
      ease: 'power3.inOut',
      onUpdate: () => {
        const p = proxy.t;
        // Smooth sine bell curve for altitude arc (zero jump at start/end)
        const bellCurve = Math.sin(p * Math.PI);
        const arcY = bellCurve * arcLift;
        const swayX = bellCurve * lateralSway * (startEye.z > endEye.z ? 1 : -1);

        const curEyeX = THREE.MathUtils.lerp(startEye.x, endEye.x, p) + swayX;
        const curEyeY = THREE.MathUtils.lerp(startEye.y, endEye.y, p) + arcY;
        const curEyeZ = THREE.MathUtils.lerp(startEye.z, endEye.z, p);

        const curTargetX = THREE.MathUtils.lerp(startTarget.x, endTarget.x, p);
        const curTargetY = THREE.MathUtils.lerp(startTarget.y, endTarget.y, p);
        const curTargetZ = THREE.MathUtils.lerp(startTarget.z, endTarget.z, p);

        controls.setLookAt(
          curEyeX,
          curEyeY,
          curEyeZ,
          curTargetX,
          curTargetY,
          curTargetZ,
          false
        );
      },
      onComplete: () => {
        tweenRef.current = null;
        setFlightState(false, durationMs);
      },
    });

    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
    };
  }, [flightVersion, cameraMode, selectedNode, setFlightState]);

  // Sample FPS, WebGL draw calls, and camera distance every 500ms
  useFrame(() => {
    // Initiate warp sequence the moment CameraControls is ready on the first render frame
    if (!warpInitiatedRef.current && controlsRef.current) {
      const ok = startWarpSequence();
      if (ok) {
        warpInitiatedRef.current = true;
      }
    }

    frameCountRef.current += 1;
    const now = performance.now();
    const elapsed = now - lastSampleTimeRef.current;

    if (elapsed >= 500) {
      const fps = Math.min(120, Math.round((frameCountRef.current * 1000) / elapsed));
      frameCountRef.current = 0;
      lastSampleTimeRef.current = now;

      const controls = controlsRef.current;
      if (controls) {
        controls.getTarget(tempTargetRef.current);
        const dist = Number(camera.position.distanceTo(tempTargetRef.current).toFixed(1));
        setCameraDistance(dist);
      }

      updatePerfStats({
        fps,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
      });
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
