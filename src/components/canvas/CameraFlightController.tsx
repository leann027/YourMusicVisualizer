'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import gsap from 'gsap';
import { useGalaxyStore } from '../../store/useGalaxyStore';

export const CameraFlightController: React.FC = () => {
  const controlsRef = useRef<CameraControlsImpl>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const flightVersion = useGalaxyStore((s) => s.flightVersion);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const setFlightState = useGalaxyStore((s) => s.setFlightState);
  const setCameraDistance = useGalaxyStore((s) => s.setCameraDistance);
  const updatePerfStats = useGalaxyStore((s) => s.updatePerfStats);

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
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
        setFlightState(false);
      }
    };

    controls.addEventListener('controlstart', handleUserControlStart);
    return () => {
      controls.removeEventListener('controlstart', handleUserControlStart);
    };
  }, [setFlightState]);

  // Story 1: Cinematic Intro Warp-in Sequence upon entering the galaxy (Helical / Orbital Descent)
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      controls.setLookAt(0, 24, 72, 0, 0, 0, false);
      return;
    }

    // Start in deep outer cosmos with high orbital vantage angle
    const startRadius = 245;
    const startAngle = 0.92;
    const startY = 112;
    const initialX = Math.sin(startAngle) * startRadius;
    const initialZ = Math.cos(startAngle) * startRadius;

    controls.setLookAt(initialX, startY, initialZ, 0, 6, 0, false);
    setFlightState(true, 4800);

    const proxy = { t: 0 };
    const introTween = gsap.to(proxy, {
      t: 1,
      duration: 4.8,
      delay: 0.1,
      ease: 'power3.out',
      onUpdate: () => {
        const p = proxy.t;
        // Helical spiral curve easing into the galactic observation plane
        const curY = THREE.MathUtils.lerp(startY, 24, p);
        const curRadius = THREE.MathUtils.lerp(startRadius, 72, p);
        const curAngle = startAngle * (1 - p);
        const curEyeX = Math.sin(curAngle) * curRadius;
        const curEyeZ = Math.cos(curAngle) * curRadius;
        const curTargetY = THREE.MathUtils.lerp(6, 0, p);

        controls.setLookAt(curEyeX, curY, curEyeZ, 0, curTargetY, 0, false);
      },
      onComplete: () => {
        setFlightState(false, 4800);
      },
    });

    return () => {
      introTween.kill();
    };
  }, [setFlightState]);

  // Execute calibrated GSAP camera flight whenever flightVersion increments
  useEffect(() => {
    if (flightVersion === 0) return;
    const controls = controlsRef.current;
    if (!controls) return;

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
      endEye.set(0, 24, 72);
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
          nz + 18.5
        );
      } else if (cameraMode === 'artist') {
        // Offset slightly right of target so the selected star & its songs sit clear of the right HUD card
        endEye.set(nx + 1.8, ny + 1.6, nz + 9.5);
      } else {
        // 'song' micro satellite close-up
        endEye.set(nx + 0.9, ny + 0.7, nz + 4.6);
      }
    }

    const travelDistance = startEye.distanceTo(endEye);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Calibrated duration: 520ms for local hops within a sector up to 920ms across the galaxy
    const durationSec = prefersReducedMotion
      ? 0.16
      : Math.min(0.92, Math.max(0.52, 0.48 + travelDistance * 0.009));

    // Story 5: Parabolic swooping altitude & orbital banking so cross-galaxy flights arc cleanly over constellations
    const arcLift = prefersReducedMotion
      ? 0
      : Math.min(14, Math.max(3.2, travelDistance * 0.2));
    const lateralSway = prefersReducedMotion
      ? 0
      : Math.min(6.5, travelDistance * 0.08);

    const proxy = { t: 0 };
    const durationMs = Math.round(durationSec * 1000);
    setFlightState(true, durationMs);

    tweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: durationSec,
      ease: prefersReducedMotion ? 'power2.out' : 'power3.out',
      onUpdate: () => {
        const p = proxy.t;
        const bellCurve = 4 * p * (1 - p); // 0 at start, 1.0 at midpoint, 0 at end
        const arcY = bellCurve * arcLift;
        const swayX = bellCurve * lateralSway * (startEye.z > endEye.z ? 1 : -1);

        const curEyeX = THREE.MathUtils.lerp(startEye.x, endEye.x, p) + swayX;
        const curEyeY =
          THREE.MathUtils.lerp(startEye.y, endEye.y, p) + arcY;
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
      minDistance={2.8}
      maxDistance={150}
      smoothTime={0.18}
      draggingSmoothTime={0.08}
      azimuthRotateSpeed={0.65}
      polarRotateSpeed={0.65}
      dollySpeed={0.9}
    />
  );
};
