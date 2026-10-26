'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

/**
 * Memory-safe, deferred `UnrealBloomPass` post-processing pipeline (`PostProcessingPipeline`).
 *
 * - Deferred instantiation via `requestIdleCallback` so initial LCP and main-thread shader compilation are never blocked.
 * - Dynamically modulates Bloom `strength` and `radius` at 60 FPS using the real-time Web Audio FFT sub-bass & energy envelope.
 * - Explicitly disposes `RenderPass`, `UnrealBloomPass`, `OutputPass`, and `EffectComposer` render targets on unmount.
 */
export const PostProcessingPipeline: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const bloomEnabled = useGalaxyStore((s) => s.bloomEnabled);
  const cameraDistance = useGalaxyStore((s) => s.cameraDistance);

  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  useEffect(() => {
    if (!bloomEnabled) {
      return;
    }

    let isCancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const initComposer = () => {
      if (isCancelled) return;

      const composer = new EffectComposer(gl);
      const renderPass = new RenderPass(scene, camera);
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        0.08, // Calibrated base strength: crisp stars, zero screen blowout
        0.16, // Tight, focused bloom radius
        0.92  // High threshold so only bright stellar highlights bloom
      );
      const outputPass = new OutputPass();

      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);

      composerRef.current = composer;
      bloomPassRef.current = bloomPass;
    };

    // Defer shader compilation off the initial critical rendering path (LCP optimization)
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(initComposer, { timeout: 300 });
    } else {
      timeoutHandle = setTimeout(initComposer, 80);
    }

    return () => {
      isCancelled = true;
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }

      if (bloomPassRef.current) {
        bloomPassRef.current.dispose();
        bloomPassRef.current = null;
      }
      if (composerRef.current) {
        composerRef.current.dispose();
        composerRef.current = null;
      }
    };
  }, [gl, scene, camera, bloomEnabled, size.width, size.height]);

  useEffect(() => {
    if (composerRef.current) {
      composerRef.current.setSize(size.width, size.height);
    }
    if (bloomPassRef.current) {
      bloomPassRef.current.resolution.set(size.width, size.height);
    }
  }, [size.width, size.height]);

  // Priority 1 takes over rendering when composer is active & ready
  useFrame((_, delta) => {
    const composer = composerRef.current;
    const bloomPass = bloomPassRef.current;

    if (!bloomEnabled || !composer || !bloomPass) {
      gl.render(scene, camera);
      return;
    }

    const fft = webAudioEngine.sampleFFT();

    // Adaptive Proximity Anti-Glare:
    // When zoomed into an inspected star, its projected screen area expands dramatically.
    // Progressively dampening bloom strength and lifting the threshold prevents blinding glare and washed out screens.
    const proximityBloomFactor = THREE.MathUtils.clamp(
      (cameraDistance - 5.0) / 22.0,
      0.02,
      1.0
    );

    const baseStrength = fft.isPlaying
      ? 0.08 + fft.subBass * 0.02
      : 0.07;

    const targetStrength = baseStrength * proximityBloomFactor;
    const targetRadius = 0.16;
    const targetThreshold = THREE.MathUtils.lerp(0.97, 0.92, proximityBloomFactor);

    bloomPass.strength = THREE.MathUtils.lerp(
      bloomPass.strength,
      targetStrength,
      Math.min(1, delta * 4.0)
    );
    bloomPass.radius = THREE.MathUtils.lerp(
      bloomPass.radius,
      targetRadius,
      Math.min(1, delta * 4.0)
    );
    bloomPass.threshold = THREE.MathUtils.lerp(
      bloomPass.threshold,
      targetThreshold,
      Math.min(1, delta * 4.0)
    );

    composer.render(delta);
  }, 1);

  return null;
};
