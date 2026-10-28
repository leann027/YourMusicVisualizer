/**
 * 3D value noise and fBm (port of the reference nebula generator, docs/reference/nebulosas-v3.html).
 * Deterministic and allocation-free; used on the CPU to carve gas filaments (Nebulosas v3 · M6.1).
 */

function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Trilinear value noise in [0, 1) with smoothstep interpolation. */
export function vnoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  return lerp(
    lerp(lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    lerp(
      lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u),
      lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u),
      v
    ),
    w
  );
}

/** 4-octave fractal Brownian motion of vnoise3, normalised to [0, 1). */
export function fbm3(x: number, y: number, z: number): number {
  let sum = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < 4; octave++) {
    sum += amplitude * vnoise3(x * frequency, y * frequency, z * frequency);
    frequency *= 2.03;
    amplitude *= 0.5;
  }
  return sum / 0.9375;
}
