'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Procedural GLSL shaders for the Gargantua Relativistic Accretion Disk (Zero Plastic Meshes)
const ACCRETION_DISK_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const ACCRETION_DISK_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSubBass;
  uniform float uEnergy;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 coord = vUv - vec2(0.5);
    float r = length(coord) * 2.0; // 0.0 at center, 1.0 at outer edge
    if (r < 0.28 || r > 0.98) discard;

    float theta = atan(coord.y, coord.x);

    // Relativistic Keplerian spiral plasma flow: inner flows faster
    float flowSpeed = uTime * (1.8 + uEnergy * 0.9);
    float spiral = theta + 3.2 / max(0.12, r) - flowSpeed;

    // Multi-octave fractal plasma turbulence
    float n1 = vnoise(vec2(spiral * 2.0, r * 12.0));
    float n2 = vnoise(vec2(spiral * 4.0, r * 24.0 + flowSpeed * 0.4));
    float plasma = n1 * 0.65 + n2 * 0.35;

    // Radial ISCO (Innermost Stable Circular Orbit) sharp cut and smooth outer edge
    float innerCut = smoothstep(0.28, 0.38, r);
    float outerFade = smoothstep(0.98, 0.55, r);
    float radialEnvelope = innerCut * outerFade;

    // Relativistic Doppler Beaming: approaching side (theta > 0) is hotter and significantly brighter
    float doppler = 1.0 + 0.48 * sin(theta + 0.35);

    // Chromatic temperature gradient: ultra-hot incandescent gold near ISCO -> warm solar amber -> cosmic magenta
    vec3 colCore = vec3(1.0, 0.96, 0.82);
    vec3 colMid = vec3(0.96, 0.60, 0.08);
    vec3 colOuter = vec3(1.0, 0.16, 0.52);

    float tGrad = smoothstep(0.30, 0.85, r);
    vec3 color = mix(mix(colCore, colMid, tGrad), colOuter, pow(tGrad, 2.0));

    float alpha = radialEnvelope * (0.35 + 0.65 * plasma) * doppler * (0.65 + uSubBass * 0.35);
    gl_FragColor = vec4(color * (1.05 + uSubBass * 0.25), clamp(alpha, 0.0, 0.85));
  }
`;

const LENSING_ARCH_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSubBass;
  uniform float uEnergy;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 coord = vUv - vec2(0.5);
    // Vertical arch coordinates: light deflected around singularity
    float r = length(coord) * 2.0;
    if (r < 0.32 || r > 0.85) discard;

    float theta = atan(coord.y, coord.x);
    // Curved gravitational deflection arch
    float archFade = pow(abs(sin(theta)), 1.2);

    float flowSpeed = uTime * (1.4 + uEnergy * 0.7);
    float n = vnoise(vec2(theta * 3.0, r * 16.0 - flowSpeed));

    float innerCut = smoothstep(0.32, 0.42, r);
    float outerFade = smoothstep(0.85, 0.50, r);
    float radialEnvelope = innerCut * outerFade;

    vec3 color = mix(vec3(0.96, 0.55, 0.08), vec3(1.0, 0.16, 0.52), r);
    float alpha = radialEnvelope * archFade * (0.30 + 0.70 * n) * (0.45 + uSubBass * 0.3);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.65));
  }
`;

/**
 * Supermassive Galactic Core & 4-Arm Logarithmic Spiral Galaxy (`GalacticDustDisc`).
 *
 * 1. Central Supermassive Singularity (Gargantua Aesthetic):
 *    - Event Horizon black hole sphere with gravitational limb redshift.
 *    - Procedural Relativistic Accretion Disk Shader with Doppler beaming and Keplerian plasma turbulence.
 *    - Gravitational Lensing Arch Shader rendering curved light rays over the singularity.
 * 2. 4 Grand Logarithmic Spiral Arms:
 *    - 5,600 GPU stardust particles with 3D S-shaped galactic warp and Keplerian differential velocity.
 * 3. Multi-Band FFT Acoustic Fluid Dynamics:
 *    - Sub-Bass (0-60Hz): Concentric gravitational tidal shockwaves radiating from singularity.
 *    - Mid-Harmonic (250-2000Hz): Spiral arm density wave compression and transverse disk undulation.
 *    - High-Shimmer (2-16kHz): Starlight ionization scintillation and diamond sparkle.
 * 4. Strict Proximity Anti-Glare: Background galaxy fades completely when inspecting stars (vCamDist < 16).
 */
export const GalacticDustDisc: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const coreGroupRef = useRef<THREE.Group>(null);
  const accretionMeshRef = useRef<THREE.Mesh>(null);
  const lensingMeshRef = useRef<THREE.Mesh>(null);

  // Audio smoothing accumulators (zero React re-renders)
  const smoothSubBassRef = useRef<number>(0);
  const smoothMidRef = useRef<number>(0);
  const smoothHighRef = useRef<number>(0);
  const smoothEnergyRef = useRef<number>(0);

  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const cameraDistance = useGalaxyStore((s) => s.cameraDistance);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // 1. Procedural Accretion Disk & Lensing Arch Materials
  const { accretionMat, lensingMat, singularityGeom, discPlaneGeom } = useMemo(() => {
    const accMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uSubBass: { value: 0 },
        uEnergy: { value: 0 },
      },
      vertexShader: ACCRETION_DISK_VERTEX_SHADER,
      fragmentShader: ACCRETION_DISK_FRAGMENT_SHADER,
    });

    const lensMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uSubBass: { value: 0 },
        uEnergy: { value: 0 },
      },
      vertexShader: ACCRETION_DISK_VERTEX_SHADER,
      fragmentShader: LENSING_ARCH_FRAGMENT_SHADER,
    });

    const singGeom = new THREE.SphereGeometry(0.92, 32, 32);
    const planeGeom = new THREE.PlaneGeometry(6.4, 6.4, 1, 1);

    return {
      accretionMat: accMat,
      lensingMat: lensMat,
      singularityGeom: singGeom,
      discPlaneGeom: planeGeom,
    };
  }, []);

  // 2. 4-Arm Logarithmic Spiral Galaxy Particle Mesh
  const { geometry, material } = useMemo(() => {
    const prng = createPRNG(987654);
    const count = 5600;

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

    const mat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => 'central-cosmic-galaxy-spiral-v6';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uBrightness = { value: 0.12 };
      shader.uniforms.uSubBass = { value: 0 };
      shader.uniforms.uMidHarmonic = { value: 0 };
      shader.uniforms.uHighShimmer = { value: 0 };
      shader.uniforms.uEnergy = { value: 0 };

      shader.vertexShader = `
        attribute float aRadius;
        attribute float aAngle;
        attribute float aSpeed;
        attribute float aPhase;
        attribute float aArm;
        attribute float pointScale;
        varying vec3 vDustColor;
        varying float vPhase;
        varying float vCamDist;
        uniform float uTime;
        uniform float uSubBass;
        uniform float uMidHarmonic;
        uniform float uHighShimmer;
        uniform float uEnergy;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        `
        #include <color_vertex>
        vDustColor = color;
        vPhase = aPhase;
        `
      );

      // Continuous fluid dynamic flow in vertex shader: differential rotation, volumetric billows, and FFT tidal waves
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        // 1. Keplerian differential rotation with energetic torque
        float rotTime = uTime * (1.0 + uEnergy * 0.45);
        float curAngle = aAngle + rotTime * aSpeed;

        // 2. Multi-band FFT acoustic dynamics
        float shock = sin(aRadius * 0.72 - uTime * 4.2 + aPhase) * (uSubBass * 1.45) * exp(-aRadius * 0.04);
        float armBreath = sin(uTime * 0.65 + aRadius * 0.32 + aArm * 1.57) * (uMidHarmonic * 1.15);
        float baseWaveY = sin(uTime * 0.45 + aRadius * 0.28 + aPhase) * 0.95 * exp(-aRadius * 0.035);
        float waveY = baseWaveY + shock * 0.75 + sin(curAngle * 2.0 + uTime * 0.8) * (uMidHarmonic * 0.65);
        float dynamicR = aRadius + armBreath + cos(uTime * 0.35 + aAngle * 2.0 + aPhase) * 0.65;

        vec3 transformed = vec3(
          cos(curAngle) * dynamicR,
          position.y + waveY,
          sin(curAngle) * dynamicR * 0.92
        );
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        `
        vCamDist = -mvPosition.z;
        float twinkle = 1.0 + (uHighShimmer * 0.65) * sin(uTime * 9.0 + aPhase * 4.0);
        float pSize = size * pointScale * twinkle * (72.0 / max(8.0, -mvPosition.z));
        gl_PointSize = clamp(pSize, 1.0, 16.0);
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform float uBrightness;
        uniform float uHighShimmer;
        varying vec3 vDustColor;
        varying float vPhase;
        varying float vCamDist;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #include <map_particle_fragment>
        vec2 coord = gl_PointCoord - vec2(0.5);
        float dist = length(coord);
        if (dist > 0.5) discard;
        // Asymptotic zero-slope Hermite falloff: strictly zero visible boundary
        float edgeFade = smoothstep(0.5, 0.05, dist);
        float coreGlow = exp(-dist * dist * 5.8);
        float falloff = edgeFade * coreGlow;
        float shimmer = 0.86 + 0.14 * sin(uTime * 0.95 + vPhase);
        // Proximity anti-glare: smoothly fade out background galaxy as camera approaches inspected star within 26 units
        float proximityFade = smoothstep(8.0, 26.0, vCamDist);
        diffuseColor.rgb = vDustColor * (0.75 + 0.25 * coreGlow);
        diffuseColor.a *= falloff * uBrightness * shimmer * proximityFade;
        `
      );

      mat.userData.shader = shader;
    };

    return { geometry: geom, material: mat };
  }, []);

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      singularityGeom.dispose();
      discPlaneGeom.dispose();
      accretionMat.dispose();
      lensingMat.dispose();
    };
  }, [geometry, material, singularityGeom, discPlaneGeom, accretionMat, lensingMat]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    // 1. Animate Central Supermassive Singularity & Procedural Accretion Vortex
    const coreGroup = coreGroupRef.current;
    if (coreGroup) {
      if (!prefersReducedMotion) {
        coreGroup.rotation.y += delta * (0.16 + (fft.isPlaying ? fft.energy * 0.22 : 0));
      }

      // Procedural shader uniform progression via mesh refs (React 19 pure)
      const accMat = accretionMeshRef.current?.material as THREE.ShaderMaterial | undefined;
      if (accMat) {
        accMat.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
        accMat.uniforms.uSubBass.value = smoothSubBassRef.current;
        accMat.uniforms.uEnergy.value = smoothEnergyRef.current;
      }

      const lensMat = lensingMeshRef.current?.material as THREE.ShaderMaterial | undefined;
      if (lensMat) {
        lensMat.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
        lensMat.uniforms.uSubBass.value = smoothSubBassRef.current;
        lensMat.uniforms.uEnergy.value = smoothEnergyRef.current;
      }

      if (accretionMeshRef.current) {
        const pulse = 1.0 + (fft.isPlaying ? fft.subBass * 0.18 : Math.sin(t * 1.5) * 0.02);
        accretionMeshRef.current.scale.setScalar(pulse);
      }

      // Fade central black hole features when zoomed in close to an inspected star
      const coreProximity = THREE.MathUtils.clamp((cameraDistance - 5.0) / 16.0, 0.0, 1.0);
      coreGroup.visible = coreProximity > 0.01;
    }

    // 2. Animate 4-Arm Spiral Stardust Shader
    const mat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (mat?.userData?.shader) {
      const shader = mat.userData.shader;
      shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      const baseAlpha = THREE.MathUtils.clamp(0.09 + stellarBrightness * 0.35, 0.05, 0.24);
      shader.uniforms.uBrightness.value = baseAlpha + (fft.isPlaying ? fft.energy * 0.04 : 0);

      // Acoustic smoothing lerp across all musical frequency bands
      smoothSubBassRef.current = THREE.MathUtils.lerp(
        smoothSubBassRef.current,
        fft.isPlaying && !prefersReducedMotion ? fft.subBass : 0.0,
        Math.min(1.0, delta * 6.0)
      );
      smoothMidRef.current = THREE.MathUtils.lerp(
        smoothMidRef.current,
        fft.isPlaying && !prefersReducedMotion ? fft.midHarmonic : 0.0,
        Math.min(1.0, delta * 6.0)
      );
      smoothHighRef.current = THREE.MathUtils.lerp(
        smoothHighRef.current,
        fft.isPlaying && !prefersReducedMotion ? fft.highShimmer : 0.0,
        Math.min(1.0, delta * 6.0)
      );
      smoothEnergyRef.current = THREE.MathUtils.lerp(
        smoothEnergyRef.current,
        fft.isPlaying && !prefersReducedMotion ? fft.energy : 0.0,
        Math.min(1.0, delta * 6.0)
      );

      shader.uniforms.uSubBass.value = smoothSubBassRef.current;
      shader.uniforms.uMidHarmonic.value = smoothMidRef.current;
      shader.uniforms.uHighShimmer.value = smoothHighRef.current;
      shader.uniforms.uEnergy.value = smoothEnergyRef.current;
    }

    if (!prefersReducedMotion && pointsRef.current) {
      // Gentle macroscopic galactic tilt undulation
      pointsRef.current.rotation.x = Math.sin(t * 0.04) * 0.02;
      pointsRef.current.rotation.z = Math.cos(t * 0.03) * 0.02;
    }
  });

  return (
    <group position={[0, -0.2, 0]}>
      {/* 4-Arm Grand Logarithmic Spiral Stardust Disc */}
      <points
        ref={pointsRef}
        geometry={geometry}
        material={material}
        name="central-spiral-galaxy-stardust"
      />

      {/* Central Supermassive Singularity: Black Hole Event Horizon & Accretion Vortex */}
      <group ref={coreGroupRef} position={[0, 0, 0]}>
        {/* 1. Black Hole Event Horizon Sphere (Pure Dark Gravitational Singularity) */}
        <mesh geometry={singularityGeom}>
          <meshBasicMaterial color="#010103" />
        </mesh>

        {/* 2. Procedural Relativistic Accretion Disk (Tilted Kerr Horizon Plasma Flow) */}
        <mesh
          ref={accretionMeshRef}
          geometry={discPlaneGeom}
          material={accretionMat}
          rotation={[Math.PI / 2.3, 0.28, 0]}
        />

        {/* 3. Gravitational Lensing Arch (Gargantua Curved Light Deflection) */}
        <mesh
          ref={lensingMeshRef}
          geometry={discPlaneGeom}
          material={lensingMat}
          rotation={[-0.15, 0, 0]}
        />
      </group>
    </group>
  );
};
