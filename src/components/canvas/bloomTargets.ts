import * as THREE from 'three';
import type { RendererMode } from '../../store/useGalaxyStore';

/**
 * Bloom targets per frame (PostProcessingPipeline). Pure so the classic calibration stays
 * pinned by tests while nebula mode gets its own (Nebulosas v3 · M6.4).
 */

export interface BloomTargets {
  strength: number;
  radius: number;
  threshold: number;
}

export interface BloomFFT {
  isPlaying: boolean;
  subBass: number;
}

// Classic calibration: crisp stars, zero screen blowout
const CLASSIC = { idleStrength: 0.07, playingStrength: 0.08, farThreshold: 0.92 };
// Nebula: additive gas everywhere, so a softer and higher-threshold bloom (migration plan)
const NEBULA = { idleStrength: 0.06, playingStrength: 0.06, farThreshold: 0.95 };

export function computeBloomTargets(mode: RendererMode, cameraDistance: number, fft: BloomFFT): BloomTargets {
  const tuning = mode === 'nebula' ? NEBULA : CLASSIC;

  // Adaptive proximity anti-glare: close to an inspected star its projected area expands
  // dramatically, so strength drops and the threshold lifts to avoid washed-out screens.
  const proximityBloomFactor = THREE.MathUtils.clamp((cameraDistance - 5.0) / 22.0, 0.02, 1.0);

  const baseStrength = fft.isPlaying ? tuning.playingStrength + fft.subBass * 0.02 : tuning.idleStrength;

  return {
    strength: baseStrength * proximityBloomFactor,
    radius: 0.16,
    threshold: THREE.MathUtils.lerp(0.97, tuning.farThreshold, proximityBloomFactor),
  };
}
