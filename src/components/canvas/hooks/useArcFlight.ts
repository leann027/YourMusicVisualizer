'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import type CameraControlsImpl from 'camera-controls';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { collisionCameraPose, findCollision } from '../nebulaV3/collisionCamera';

export interface UseArcFlightOptions {
  controlsRef: React.RefObject<CameraControlsImpl | null>;
  galaxyContainerRef?: React.RefObject<THREE.Group | null>;
  onFlightStart?: () => void;
}

export interface UseArcFlightReturn {
  tweenRef: React.MutableRefObject<gsap.core.Tween | null>;
}

/**
 * Calibrated parabolic arc flights on selection (`power3.inOut`).
 * Triggers cinematic camera trajectories with altitude lift and lateral sway
 * whenever `flightVersion` increments in the store.
 */
export function useArcFlight({
  controlsRef,
  galaxyContainerRef,
  onFlightStart,
}: UseArcFlightOptions): UseArcFlightReturn {
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const flightVersion = useGalaxyStore((s) => s.flightVersion);
  const selectedNode = useGalaxyStore((s) => s.selectedNode);
  const cameraMode = useGalaxyStore((s) => s.cameraMode);
  const selectedCollision = useGalaxyStore((s) => s.selectedCollision);
  const setFlightState = useGalaxyStore((s) => s.setFlightState);

  // Stop active flight tween if the user manually grabs the camera
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
  }, [controlsRef, setFlightState]);

  // Execute calibrated GSAP camera flight whenever flightVersion increments
  useEffect(() => {
    if (flightVersion === 0) return;
    const controls = controlsRef.current;
    if (!controls) return;

    // Immediately cancel any intro sequence if active
    onFlightStart?.();

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

    const collision =
      cameraMode === 'collision'
        ? findCollision(getNebulaLayout(useGalaxyStore.getState().baseData), selectedCollision)
        : null;

    if (collision) {
      // Collision: look at the contact point from a side perpendicular to the collision axis
      const matrix = galaxyContainerRef?.current?.matrixWorld;
      const contact = new THREE.Vector3(...collision.contact);
      const dir = new THREE.Vector3(...collision.dir);
      if (matrix) {
        contact.applyMatrix4(matrix);
        dir.transformDirection(matrix);
      }
      const layout = getNebulaLayout(useGalaxyStore.getState().baseData);
      const radiusOf = (id: string) => layout.cores.find((c) => c.genreId === id)?.radius ?? 0;
      const pose = collisionCameraPose(contact, dir, radiusOf(collision.a), radiusOf(collision.b), startEye);
      endTarget.copy(pose.target);
      endEye.copy(pose.eye);
    } else if (cameraMode === 'galaxy' || cameraMode === 'collision' || !selectedNode) {
      endTarget.set(0, 0, 0);
      endEye.set(0, 18, 52);
    } else {
      const localPos = new THREE.Vector3(...selectedNode.position);
      const worldPos = galaxyContainerRef?.current
        ? localPos.applyMatrix4(galaxyContainerRef.current.matrixWorld)
        : localPos;

      const nx = worldPos.x;
      const ny = worldPos.y;
      const nz = worldPos.z;
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
    // Never arc on small local hops to prevent nauseating bounces
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
  }, [flightVersion, cameraMode, selectedNode, selectedCollision, setFlightState, galaxyContainerRef, controlsRef, onFlightStart]);

  return { tweenRef };
}
