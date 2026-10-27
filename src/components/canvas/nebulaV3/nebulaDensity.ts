/**
 * Adaptive gas density (Nebulosas v3 · M6.4): when FPS stay below 40 for 3 s (six 500 ms
 * samples from usePerformanceMonitor), the field drops from 35k to 20k particles.
 */

export const LOW_FPS_THRESHOLD = 40;
export const LOW_FPS_SAMPLES = 6; // × 500 ms = 3 s

/** True when the last LOW_FPS_SAMPLES samples are all below LOW_FPS_THRESHOLD. */
export function shouldReduceNebulaDensity(fpsSamples: readonly number[]): boolean {
  if (fpsSamples.length < LOW_FPS_SAMPLES) return false;
  return fpsSamples.slice(-LOW_FPS_SAMPLES).every((fps) => fps < LOW_FPS_THRESHOLD);
}
