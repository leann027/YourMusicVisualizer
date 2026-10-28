import * as THREE from 'three';

export function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function createPRNG(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export interface SectorNebulaGeometryOptions {
  seed: number;
  densityFactor: number;
  color: string;
  position: [number, number, number];
}

/**
 * Procedurally generates the inner ionized gas nebular core geometry.
 */
export function generateInnerNebulaGeometry(
  seed: number,
  densityFactor: number,
  genreColor: string
): THREE.BufferGeometry {
  const prng = createPRNG(seed + 101);
  const count = Math.round(85 + densityFactor * 225);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const scales = new Float32Array(count);

  const baseColor = new THREE.Color(genreColor);
  const coreTint = new THREE.Color(genreColor).lerp(new THREE.Color('#FFFFFF'), 0.2);
  const maxR = 3.6 + densityFactor * 4.6;

  for (let i = 0; i < count; i++) {
    // 3-lobed logarithmic spiral tendrils with Strömgren central cavity
    const arm = (i % 3) * ((Math.PI * 2) / 3);
    const rRatio = Math.pow(prng(), 1.25);
    const r = 3.2 + rRatio * maxR;

    const angle = arm + Math.log(r + 1.2) * 1.4 + (prng() - 0.5) * 0.75;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const y = (prng() - 0.5) * 2.2 * Math.exp(-r * 0.35);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Chromatic ionization gradient: gentle core shimmer lerping to sector hue
    const normR = Math.min(1.0, (r - 3.2) / maxR);
    const c = new THREE.Color().copy(coreTint).lerp(baseColor, normR);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    phases[i] = prng() * 6.28318;
    scales[i] = 0.8 + (1.0 - normR * 0.3) * 1.2 + prng() * 0.6;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));
  return geom;
}

/**
 * Procedurally generates the outer interstellar dust filament veil geometry.
 */
export function generateOuterNebulaGeometry(
  seed: number,
  densityFactor: number,
  genreColor: string,
  genrePosition: [number, number, number]
): THREE.BufferGeometry {
  const prng = createPRNG(seed + 202);
  const count = Math.round(110 + densityFactor * 320);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const scales = new Float32Array(count);

  const baseColor = new THREE.Color(genreColor);
  const deepCosmicVeil = new THREE.Color('#1E1B4B').lerp(new THREE.Color('#312E81'), 0.5);

  const galAngle = Math.atan2(genrePosition[2] || 0.01, genrePosition[0] || 0.01);
  const maxR = 7.5 + densityFactor * 9.5;

  for (let i = 0; i < count; i++) {
    const rRatio = Math.pow(prng(), 1.25);
    const r = 4.8 + rRatio * maxR;

    const theta = galAngle + (prng() - 0.5) * 1.4 + Math.sin(r * 0.35) * 0.5;
    const x = Math.cos(theta) * r * 1.12;
    const z = Math.sin(theta) * r * 0.88;
    const y = (prng() - 0.5) * 3.4 * Math.max(0.15, 1.0 - r / 16.0);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    const normR = Math.min(1.0, (r - 4.8) / maxR);
    const c = new THREE.Color().copy(baseColor).lerp(deepCosmicVeil, normR * 0.7);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    phases[i] = prng() * 6.28318;
    scales[i] = 1.0 + normR * 1.5 + prng() * 0.8;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));
  return geom;
}

/**
 * Generates both inner and outer buffer geometries for a sector nebula cluster.
 */
export function generateSectorNebulaGeometry(options: SectorNebulaGeometryOptions): {
  innerGeometry: THREE.BufferGeometry;
  outerGeometry: THREE.BufferGeometry;
} {
  return {
    innerGeometry: generateInnerNebulaGeometry(options.seed, options.densityFactor, options.color),
    outerGeometry: generateOuterNebulaGeometry(options.seed, options.densityFactor, options.color, options.position),
  };
}
