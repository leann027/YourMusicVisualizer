'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type CameraControlsImpl from 'camera-controls';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { LOW_FPS_SAMPLES, shouldReduceNebulaDensity } from '../nebulaV3/nebulaDensity';

export interface UsePerformanceMonitorOptions {
  controlsRef: React.RefObject<CameraControlsImpl | null>;
}

/**
 * Performance & camera telemetry sampling hook.
 * Batches FPS, draw calls, triangles, and camera distance sampling every 500ms
 * with zero per-frame React re-renders.
 */
export function usePerformanceMonitor({
  controlsRef,
}: UsePerformanceMonitorOptions): void {
  const frameCountRef = useRef(0);
  const lastSampleTimeRef = useRef(0);
  const tempTargetRef = useRef(new THREE.Vector3());
  const fpsSamplesRef = useRef<number[]>([]);

  const setCameraDistance = useGalaxyStore((s) => s.setCameraDistance);
  const updatePerfStats = useGalaxyStore((s) => s.updatePerfStats);

  const { gl, camera } = useThree();

  useFrame(() => {
    frameCountRef.current += 1;
    const now = performance.now();
    if (lastSampleTimeRef.current === 0) {
      lastSampleTimeRef.current = now;
    }
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

      // Nebula mode: drop the gas field to 20k particles once if FPS stay low for 3 s
      const { rendererMode, nebulaFieldDensity, reduceNebulaFieldDensity } = useGalaxyStore.getState();
      if (rendererMode === 'nebula' && nebulaFieldDensity === 'full') {
        fpsSamplesRef.current = [...fpsSamplesRef.current, fps].slice(-LOW_FPS_SAMPLES);
        if (shouldReduceNebulaDensity(fpsSamplesRef.current)) reduceNebulaFieldDensity();
      } else {
        fpsSamplesRef.current = [];
      }

      updatePerfStats({
        fps,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
      });
    }
  });
}
