/** Parses the development `?nebulaTune=` / `?clashTune=` `<size>,<alpha>` look overrides (M6.4, M7.1b). */
export function parseNebulaTune(value: string | null): { size: number; alpha: number } | null {
  if (!value) return null;
  const [size, alpha] = value.split(',').map(Number);
  if (!Number.isFinite(size) || !Number.isFinite(alpha) || size <= 0 || alpha <= 0 || size > 6 || alpha > 6) return null;
  return { size, alpha };
}
