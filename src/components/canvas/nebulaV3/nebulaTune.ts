/** Parses the development `?nebulaTune=<gasSize>,<gasAlpha>` override (M6.4 calibration). */
export function parseNebulaTune(value: string | null): { size: number; alpha: number } | null {
  if (!value) return null;
  const [size, alpha] = value.split(',').map(Number);
  if (!Number.isFinite(size) || !Number.isFinite(alpha) || size <= 0 || alpha <= 0 || size > 6 || alpha > 6) return null;
  return { size, alpha };
}
