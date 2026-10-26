import * as THREE from 'three';

export function createPRNG(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Procedural geometry generator for 4-Arm Logarithmic Spiral Galaxy.
 * Populates 5,600 GPU stardust particles across:
 * 1. Central Bulge & Bar ($r = 1.2 - 6.5$)
 * 2. 4 Grand Logarithmic Spiral Arms ($r = 5.5 - 33.0$)
 * 3. Outer Halo & Warped Tidal Flaring ($r = 28.0 - 38.0$)
 */
export function generateSpiralStardustGeometry(count = 5600): THREE.BufferGeometry {
  const prng = createPRNG(987654);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const radii = new Float32Array(count);
  const angles = new Float32Array(count);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const armIndices = new Float32Array(count);
  const scales = new Float32Array(count);

  // Multi-spectral celestial chromatic palette
  const colorBulgeGold = new THREE.Color('#F59E0B');
  const colorBulgeWhite = new THREE.Color('#FFFBEB');
  const colorArm0 = new THREE.Color('#FB7185'); // Scutum-Centaurus: Solar Amber / Coral
  const colorArm1 = new THREE.Color('#00F5D4'); // Perseus: Electric Cyan / Aqua
  const colorArm2 = new THREE.Color('#FF2A85'); // Sagittarius-Carina: Cosmic Magenta / Hot Pink
  const colorArm3 = new THREE.Color('#8B5CF6'); // Cygnus: Stellar Violet / Indigo
  const colorOuterHalo = new THREE.Color('#1E1B4B'); // Deep Cosmic Veil

  for (let i = 0; i < count; i++) {
    const pType = prng();
    let r = 0;
    let angle = 0;
    let y = 0;
    let arm = 0;
    const particleColor = new THREE.Color();

    if (pType < 0.22) {
      // 1. Central Bulge & Bar ($r = 1.2 - 6.5$)
      arm = Math.floor(prng() * 4);
      r = 1.2 + Math.pow(prng(), 1.6) * 5.3;
      const barAngle = Math.sin(r * 0.4) * 0.45;
      angle = prng() * Math.PI * 2 + barAngle;
      const bulgeThickness = 2.4 * Math.exp(-r * 0.45);
      y = (prng() - 0.5) * bulgeThickness * 1.8;

      const normBulge = Math.min(1.0, (r - 1.2) / 5.3);
      particleColor.copy(colorBulgeWhite).lerp(colorBulgeGold, normBulge);
    } else if (pType < 0.88) {
      // 2. 4 Grand Logarithmic Spiral Arms ($r = 5.5 - 33.0$)
      arm = i % 4;
      const baseArmAngle = arm * (Math.PI / 2);
      const rProgress = Math.pow(prng(), 1.25);
      r = 5.5 + rProgress * 27.5;

      // Logarithmic spiral twist: theta = base + b * ln(r/a)
      const twist = Math.log(r / 3.0) * 2.35;
      // Natural arm dispersion: tighter at core, broader at rim
      const armDispersion = (prng() - 0.5) * (0.22 + (r / 33.0) * 0.42);
      angle = baseArmAngle + twist + armDispersion;

      // Galactic S-shaped warp: outer disk curves upward on one side, downward on the other
      const diskThickness = 1.4 * Math.exp(-r * 0.035);
      const warpY = Math.sin(2.0 * angle) * Math.pow(r / 33.0, 1.8) * 2.2;
      y = (prng() - 0.5) * diskThickness + warpY;

      // Multi-spectral chromatic mapping per arm
      let armBaseColor = colorArm0;
      if (arm === 1) armBaseColor = colorArm1;
      else if (arm === 2) armBaseColor = colorArm2;
      else if (arm === 3) armBaseColor = colorArm3;

      const normR = Math.min(1.0, (r - 5.5) / 27.5);
      particleColor.copy(armBaseColor).lerp(colorOuterHalo, normR * 0.55);
    } else {
      // 3. Outer Halo & Warped Tidal Flaring ($r = 28.0 - 38.0$)
      arm = Math.floor(prng() * 4);
      r = 28.0 + Math.pow(prng(), 1.1) * 10.0;
      angle = prng() * Math.PI * 2;
      const warpY = Math.sin(2.0 * angle) * 2.5;
      y = (prng() - 0.5) * 3.5 + warpY;
      particleColor.copy(colorOuterHalo).lerp(colorArm3, 0.35);
    }

    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r * 0.92;

    radii[i] = r;
    angles[i] = angle;
    // Keplerian differential rotation: inner dust flows significantly faster than outer rim
    speeds[i] = (0.042 / Math.sqrt(1.0 + r * 0.22)) * (0.85 + prng() * 0.3);
    phases[i] = prng() * Math.PI * 2;
    armIndices[i] = arm;
    scales[i] = 0.75 + prng() * 0.85;

    colors[i * 3] = particleColor.r;
    colors[i * 3 + 1] = particleColor.g;
    colors[i * 3 + 2] = particleColor.b;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
  geom.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  geom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geom.setAttribute('aArm', new THREE.BufferAttribute(armIndices, 1));
  geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));

  return geom;
}
