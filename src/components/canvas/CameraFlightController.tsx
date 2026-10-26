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
  const introTweenRef = useRef<gsap.core.Tween | null>(null);
  const hasIntroPlayedRef = useRef(false);

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
      if (introTweenRef.current) {
        introTweenRef.current.kill();
        introTweenRef.current = null;
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
  }, [setFlightState]);

  // Story 1: Cinematic Intro Warp-in Sequence upon entering the galaxy (Helical / Orbital Descent)
  // Guaranteed to run ONLY ONCE on initial page mount. Never re-runs when selecting stars or sectors.
  useEffect(() => {
    if (hasIntroPlayedRef.current) return;
    hasIntroPlayedRef.current = true;

    const controls = controlsRef.current;
    if (!controls) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      controls.setLookAt(0, 18, 52, 0, 0, 0, false);
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
    introTweenRef.current = gsap.to(proxy, {
      t: 1,
      duration: 4.8,
      delay: 0.1,
      ease: 'power3.out',
      onUpdate: () => {
        const p = proxy.t;
        // Helical spiral curve easing into the galactic observation plane
        const curY = THREE.MathUtils.lerp(startY, 18, p);
        const curRadius = THREE.MathUtils.lerp(startRadius, 52, p);
        const curAngle = startAngle * (1 - p);
        const curEyeX = Math.sin(curAngle) * curRadius;
        const curEyeZ = Math.cos(curAngle) * curRadius;
        const curTargetY = THREE.MathUtils.lerp(6, 0, p);

        controls.setLookAt(curEyeX, curY, curEyeZ, 0, curTargetY, 0, false);
      },
      onComplete: () => {
        introTweenRef.current = null;
        setFlightState(false, 4800);
      },
    });

    return () => {
      if (introTweenRef.current) {
        introTweenRef.current.kill();
        introTweenRef.current = null;
      }
    };
  }, [setFlightState]);

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
        // Offset slightly right of target so the selected star & its songs sit clear of the right HUD card
        endEye.set(nx + 2.0, ny + 1.8, nz + 11.5);
      } else {
        // 'song' micro satellite close-up (spacious framing so the song and parent star stay visible)
        endEye.set(nx + 1.2, ny + 0.9, nz + 6.2);
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
      minDistance={3.2}
      maxDistance={140}
      smoothTime={0.35}
      draggingSmoothTime={0.16}
      azimuthRotateSpeed={0.50}
      polarRotateSpeed={0.50}
      dollySpeed={0.75}
    />
  );
};
