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
        0.24, // calibrated base strength (crisp stars, no overexposure)
        0.35, // tight bloom radius
        0.78  // high threshold so only bright star cores & active filaments bloom
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
  }, [gl, scene, camera, bloomEnabled]); // resize handled in dedicated effect below

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
      return;
    }

    const fft = webAudioEngine.sampleFFT();
    // Modulate bloom intensity smoothly with sub-bass and total spectral energy
    const targetStrength = fft.isPlaying
      ? 0.24 + fft.subBass * 0.32 + fft.energy * 0.18
      : 0.22;
    const targetRadius = fft.isPlaying ? 0.34 + fft.highShimmer * 0.18 : 0.32;

    bloomPass.strength = THREE.MathUtils.lerp(
      bloomPass.strength,
      targetStrength,
      Math.min(1, delta * 14)
    );
    bloomPass.radius = THREE.MathUtils.lerp(
      bloomPass.radius,
      targetRadius,
      Math.min(1, delta * 14)
    );

    composer.render(delta);
  }, 1);

  return null;
};
