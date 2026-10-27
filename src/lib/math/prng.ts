/**
 * Deterministic random helpers shared by the Nebulosas v3 layout and geometry.
 * (The classic renderer keeps its own `createPRNG` copies until M8.)
 */

export type Rng = () => number;

/** mulberry32: fast seeded PRNG returning floats in [0, 1). */
export function createRng(seed: number): Rng {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string: stable per-id seed for createRng. */
export function seedFromString(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Standard normal sample (Box–Muller). */
export function gauss(rng: Rng): number {
  let u = 0;
  while (!u) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Uniform random unit vector. */
export function randDir(rng: Rng): [number, number, number] {
  const x = gauss(rng);
  const y = gauss(rng);
  const z = gauss(rng);
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

/** Point `i` of `n` evenly spread on the unit sphere (Fibonacci / golden-angle spiral). */
export function goldenFibonacci(i: number, n: number): [number, number, number] {
  const y = 1 - ((i + 0.5) / n) * 2;
  const r = Math.sqrt(1 - y * y);
  const theta = i * 2.39996;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}
