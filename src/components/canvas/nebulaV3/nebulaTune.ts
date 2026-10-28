/** Parses the `?nebulaTune=` / `?clashTune=` / `?starTune=` / `?fogTune=` `<a>,<b>` look overrides (M6.4, M7.1b, B1, B2). */
export function parseNebulaTune(value: string | null): { size: number; alpha: number } | null {
  if (!value) return null;
  const [size, alpha] = value.split(',').map(Number);
  if (!Number.isFinite(size) || !Number.isFinite(alpha) || size <= 0 || alpha <= 0 || size > 6 || alpha > 6) return null;
  return { size, alpha };
}

/** Production domain: look overrides never apply there, whatever the environment variables say. */
export const PRODUCTION_HOST = 'your-music-visualizer.vercel.app';

/**
 * Look overrides and the FPS meter work in development and on Vercel previews, never in
 * production (B3), so the look can be calibrated on real GPUs and phones. NEXT_PUBLIC_VERCEL_ENV
 * is set when Vercel exposes system variables; the hostname is the fallback when it is not.
 */
export function tuningEnabled(nodeEnv: string | undefined, vercelEnv: string | undefined, hostname: string): boolean {
  if (nodeEnv !== 'production') return true;
  if (vercelEnv === 'production' || hostname === PRODUCTION_HOST) return false;
  return vercelEnv === 'preview' || hostname.endsWith('.vercel.app');
}

function tuningAllowedHere(): boolean {
  if (typeof window === 'undefined') return false;
  return tuningEnabled(process.env.NODE_ENV, process.env.NEXT_PUBLIC_VERCEL_ENV, window.location.hostname);
}

/** `?<name>=<a>,<b>` override when tuning is allowed here, else null. */
export function readTuneParam(name: string): { size: number; alpha: number } | null {
  if (!tuningAllowedHere()) return null;
  return parseNebulaTune(new URLSearchParams(window.location.search).get(name));
}

/** `?fps` shows the frame-rate meter when tuning is allowed here. */
export function fpsMeterRequested(): boolean {
  return tuningAllowedHere() && new URLSearchParams(window.location.search).has('fps');
}
