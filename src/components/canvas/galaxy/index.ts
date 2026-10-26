'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';

import { SupermassiveBlackHole } from './SupermassiveBlackHole';
import { SpiralStardustPoints } from './SpiralStardustPoints';

export interface GalacticDustDiscProps {
  stellarBrightness?: number;
}

/**
 * Supermassive Galactic Core & 4-Arm Logarithmic Spiral Galaxy (`GalacticDustDisc`).
 *
 * Coordinates:
 * 1. SupermassiveBlackHole: Singularity event horizon, relativistic accretion vortex, and lensing arch.
 * 2. SpiralStardustPoints: 5,600 GPU particles flowing along 4 logarithmic spiral arms with Keplerian differential rotation.
 * 3. Multi-Band FFT acoustic smoothing accumulator pipeline.
 */
export const GalacticDustDisc: React.FC<GalacticDustDiscProps> = ({
  stellarBrightness: propStellarBrightness,
}) => {
  const storeStellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const cameraDistance = useGalaxyStore((s) => s.cameraDistance);
  const stellarBrightness = propStellarBrightness ?? storeStellarBrightness;

  // Audio smoothing accumulators (zero React re-renders)
  const smoothSubBassRef = useRef<number>(0);
  const smoothMidRef = useRef<number>(0);
  const smoothHighRef = useRef<number>(0);
  const smoothEnergyRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useFrame((_, delta) => {
    const fft = webAudioEngine.sampleFFT();

    // Acoustic smoothing lerp across all musical frequency bands
    smoothSubBassRef.current = THREE.MathUtils.lerp(
      smoothSubBassRef.current,
      fft.isPlaying && !prefersReducedMotion ? fft.subBass : 0.0,
      Math.min(1.0, delta * 6.0)
    );
    smoothMidRef.current = THREE.MathUtils.lerp(
      smoothMidRef.current,
      fft.isPlaying && !prefersReducedMotion ? fft.midHarmonic : 0.0,
      Math.min(1.0, delta * 6.0)
    );
    smoothHighRef.current = THREE.MathUtils.lerp(
      smoothHighRef.current,
      fft.isPlaying && !prefersReducedMotion ? fft.highShimmer : 0.0,
      Math.min(1.0, delta * 6.0)
    );
    smoothEnergyRef.current = THREE.MathUtils.lerp(
      smoothEnergyRef.current,
      fft.isPlaying && !prefersReducedMotion ? fft.energy : 0.0,
      Math.min(1.0, delta * 6.0)
    );
  });

  return React.createElement(
    'group',
    { position: [0, -0.2, 0], name: 'galactic-dust-disc' },
    React.createElement(SpiralStardustPoints, {
      stellarBrightness,
      prefersReducedMotion,
      smoothSubBassRef,
      smoothMidRef,
      smoothHighRef,
      smoothEnergyRef,
    }),
    React.createElement(SupermassiveBlackHole, {
      cameraDistance,
      prefersReducedMotion,
      smoothSubBassRef,
      smoothEnergyRef,
    })
  );
};

export { SupermassiveBlackHole } from './SupermassiveBlackHole';
export type { SupermassiveBlackHoleProps } from './SupermassiveBlackHole';
export { SpiralStardustPoints } from './SpiralStardustPoints';
export type { SpiralStardustPointsProps } from './SpiralStardustPoints';
export * from './spiralStardustGeometry';
export * from './shaders/blackHoleShaders';
export * from './shaders/spiralDustShaders';
