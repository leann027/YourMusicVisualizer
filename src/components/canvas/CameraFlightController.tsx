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

    // Parabolic mid-flight altitude lift so cross-galaxy flights arc cleanly over stars
    const arcLift = prefersReducedMotion
      ? 0
      : Math.min(3.2, travelDistance * 0.075);

    const proxy = { t: 0 };
    const durationMs = Math.round(durationSec * 1000);
    setFlightState(true, durationMs);

    tweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: durationSec,
      ease: prefersReducedMotion ? 'power2.out' : 'expo.out',
      onUpdate: () => {
        const p = proxy.t;
        const arcOffset = 4 * p * (1 - p) * arcLift;

        const curEyeX = THREE.MathUtils.lerp(startEye.x, endEye.x, p);
        const curEyeY =
          THREE.MathUtils.lerp(startEye.y, endEye.y, p) + arcOffset;
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
