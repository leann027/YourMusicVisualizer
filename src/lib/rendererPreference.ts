import type { RendererMode } from '../store/useGalaxyStore';

/**
 * Renderer preference (Nebulosas v3 · M8.4): the HUD selector remembers the viewer's choice in
 * localStorage; `?renderer=` still wins. Storage can be unavailable (private mode, blocked site
 * data), so every access is guarded and the app falls back to the default.
 */

export const DEFAULT_RENDERER_MODE: RendererMode = 'nebula';
export const RENDERER_STORAGE_KEY = 'ymv_renderer_mode';

const isMode = (value: unknown): value is RendererMode => value === 'classic' || value === 'nebula';

export function readStoredRenderer(): RendererMode | null {
  try {
    const value = window.localStorage.getItem(RENDERER_STORAGE_KEY);
    return isMode(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeRenderer(mode: RendererMode): void {
  try {
    window.localStorage.setItem(RENDERER_STORAGE_KEY, mode);
  } catch {
    // storage blocked: the choice simply won't survive a reload
  }
}

/** URL parameter first, then the stored preference, then the default. */
export function resolveInitialRenderer(urlParam: RendererMode | null, stored: RendererMode | null): RendererMode {
  return urlParam ?? stored ?? DEFAULT_RENDERER_MODE;
}
