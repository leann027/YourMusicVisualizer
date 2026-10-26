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

/**
 * Cosmic Interstellar Ambient Fog & Continuous Fluid Stardust Flow (`GalacticDustDisc`).
 *
 * Replaces the rigid mathematical spiral with a broadly dispersed, organic cosmic mist
 * that covers the galactic plane and flows continuously via GPU-accelerated differential
 * Keplerian rotation and harmonic 3D volumetric wave billows.
 *
 * - Dispersed across radii 1.5 to 34.0 units (no rigid spiral arm lines).
 * - Continuous fluid movement: inner particles flow faster than outer particles.
 * - Dynamic undulating vertical waves and radial billowing.
 * - 1 single GPU draw call at 60 FPS, photosensitive-safe.
 */
export const GalacticDustDisc: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const smoothSubBassRef = useRef<number>(0);
  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const { geometry, material } = useMemo(() => {
    const prng = createPRNG(424242);
    const count = 4200;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const radii = new Float32Array(count);
    const angles = new Float32Array(count);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const scales = new Float32Array(count);

    // Multi-spectral celestial palette: warm galactic nucleus, electric cyan, cosmic magenta, deep twilight indigo
    const nucleusGold = new THREE.Color('#F59E0B');
    const nucleusViolet = new THREE.Color('#A855F7');
    const midCyan = new THREE.Color('#00F5D4');
    const midMagenta = new THREE.Color('#FF2A85');
    const outerCobalt = new THREE.Color('#38BDF8');
    const darkVeil = new THREE.Color('#312E81');

    for (let i = 0; i < count; i++) {
      // Dispersed across the entire galactic disk (radii 1.5 to 34.0) with organic density falloff
      const u = prng();
      const r = 1.5 + Math.pow(u, 1.25) * 32.5;
      const angle = prng() * Math.PI * 2;

      // Soft vertical envelope near midplane
      const discThickness = 2.8 * Math.exp(-r * 0.045);
      const y = (prng() - 0.5) * discThickness * (prng() - 0.5) * 1.6;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r * 0.90;

      radii[i] = r;
      angles[i] = angle;
      // Differential galactic rotation: inner dust flows faster than outer dust
      speeds[i] = (0.022 / (1.0 + r * 0.05)) * (0.85 + prng() * 0.3);
      phases[i] = prng() * Math.PI * 2;

      // Multi-spectral chromatic gradient based on radial distance
      const normalizedR = Math.min(1.0, r / 32.0);
      const particleColor = new THREE.Color();

      if (normalizedR < 0.20) {
        particleColor.copy(nucleusGold).lerp(nucleusViolet, normalizedR / 0.20);
      } else if (normalizedR < 0.50) {
        const t = (normalizedR - 0.20) / 0.30;
        particleColor.copy(nucleusViolet).lerp(midCyan, t);
      } else if (normalizedR < 0.80) {
        const t = (normalizedR - 0.50) / 0.30;
        particleColor.copy(midCyan).lerp(midMagenta, t);
      } else {
        const t = (normalizedR - 0.80) / 0.20;
        particleColor.copy(midMagenta).lerp(outerCobalt, t).lerp(darkVeil, t * 0.7);
      }

      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;

      scales[i] = 0.8 + (1.0 - normalizedR * 0.3) * 1.1 + prng() * 0.6;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    geom.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    geom.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));

    const mat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => 'cosmic-interstellar-ambient-fog-v4';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uBrightness = { value: 0.12 };
      shader.uniforms.uSubBass = { value: 0 };

      shader.vertexShader = `
        attribute float aRadius;
        attribute float aAngle;
        attribute float aSpeed;
        attribute float aPhase;
        attribute float pointScale;
        varying vec3 vDustColor;
        varying float vPhase;
        uniform float uTime;
        uniform float uSubBass;
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
        float curAngle = aAngle + uTime * aSpeed;
        // Concentric acoustic tidal wave radiating outward from galactic core modulated by subBass
        float tidalWave = sin(aRadius * 0.42 - uTime * 3.2 + aPhase) * (uSubBass * 1.1) * exp(-aRadius * 0.04);
        float baseWaveY = sin(uTime * 0.40 + aRadius * 0.28 + aPhase) * 1.15 * exp(-aRadius * 0.04);
        float waveY = baseWaveY + tidalWave;
        float waveR = aRadius + cos(uTime * 0.25 + aAngle * 2.0 + aPhase) * 0.85;
        vec3 transformed = vec3(
          cos(curAngle) * waveR,
          position.y + waveY,
          sin(curAngle) * waveR * 0.90
        );
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        `
        float pSize = size * pointScale * (70.0 / max(8.0, -mvPosition.z));
        gl_PointSize = clamp(pSize, 1.0, 16.0);
        `
      );

      shader.fragmentShader = `
        uniform float uTime;
        uniform float uBrightness;
        varying vec3 vDustColor;
        varying float vPhase;
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
        float coreGlow = exp(-dist * dist * 5.5);
        float falloff = edgeFade * coreGlow;
        float shimmer = 0.88 + 0.12 * sin(uTime * 0.75 + vPhase);
        diffuseColor.rgb = vDustColor * (0.70 + 0.30 * coreGlow);
        diffuseColor.a *= falloff * uBrightness * shimmer;
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
    };
  }, [geometry, material]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    if (material.userData.shader) {
      // Advance GPU fluid flow time
      material.userData.shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      // Calm, steady brightness that never washes out stars or overexposes when approaching
      const baseAlpha = THREE.MathUtils.clamp(stellarBrightness * 0.28, 0.04, 0.15);
      const audioSubBass = fft.isPlaying ? fft.subBass * 0.02 : 0;
      material.userData.shader.uniforms.uBrightness.value = baseAlpha + audioSubBass;

      // Acoustic tidal wave amplitude smoothly damped with lerp
      const targetSubBass = fft.isPlaying && !prefersReducedMotion ? fft.subBass : 0.0;
      smoothSubBassRef.current = THREE.MathUtils.lerp(
        smoothSubBassRef.current,
        targetSubBass,
        Math.min(1.0, delta * 6.0)
      );
      material.userData.shader.uniforms.uSubBass.value = smoothSubBassRef.current;
    }

    if (!prefersReducedMotion && pointsRef.current) {
      // Extremely subtle, stately macroscopic roll (1 full pitch in ~400s)
      pointsRef.current.rotation.x = Math.sin(t * 0.05) * 0.02;
      pointsRef.current.rotation.z = Math.cos(t * 0.04) * 0.02;
    }
  });

  return (
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      name="cosmic-interstellar-ambient-fog"
      position={[0, -0.2, 0]}
    />
  );
};
