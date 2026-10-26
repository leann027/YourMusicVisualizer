'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GenreNode, getSectorEvolutionTier } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface SectorNebulaClusterProps {
  genre: GenreNode;
}

const SectorNebulaCluster: React.FC<SectorNebulaClusterProps> = ({ genre }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerPointsRef = useRef<THREE.Points>(null);
  const outerPointsRef = useRef<THREE.Points>(null);

  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);

  const isFilteredOut = genre.affinity < minAffinityFilter;

  // Direct songCount-based nebula density scaling:
  // Genres with many songs produce vast, dense, majestic cosmic nebulae!
  const songCount = genre.songCount || 1;
  const densityFactor = Math.min(1.0, Math.max(0.12, (songCount - 1) / 20.0));

  const sectorTier = useMemo(
    () => getSectorEvolutionTier(genre.songCount, genre.affinity),
    [genre.songCount, genre.affinity]
  );
  const isSupercluster = sectorTier === 'supercluster';

  const seed = useMemo(() => hashStr(genre.id), [genre.id]);
  const rotSign = seed % 2 === 0 ? 1 : -1;

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // 1. Organic multi-spectral ionized gas core (density & particle count scale with songCount)
  const innerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 101);
    // Scales from ~85 particles for small sectors up to 300+ particles for dominant genres
    const count = Math.round(85 + densityFactor * 225);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const baseColor = new THREE.Color(genre.color);
    const coreTint = new THREE.Color(genre.color).lerp(new THREE.Color('#FFFFFF'), 0.20);
    const maxR = 3.6 + densityFactor * 4.6;

    for (let i = 0; i < count; i++) {
      // 3-lobed logarithmic spiral tendrils for natural celestial wispiness
      const arm = (i % 3) * ((Math.PI * 2) / 3);
      const rRatio = Math.pow(prng(), 1.5);
      const r = 0.4 + rRatio * maxR;

      const angle = arm + Math.log(r + 1.2) * 1.4 + (prng() - 0.5) * 0.75;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (prng() - 0.5) * 2.2 * Math.exp(-r * 0.35);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Chromatic ionization gradient: gentle core shimmer lerping to sector hue
      const normR = Math.min(1.0, r / maxR);
      const c = new THREE.Color().copy(coreTint).lerp(baseColor, normR);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Micro & macro volumetric gas billow scales
      scales[i] = 0.8 + (1.0 - normR * 0.3) * 1.2 + prng() * 0.6;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));
    return geom;
  }, [seed, densityFactor, genre.color]);

  // 2. Interstellar dust filament veil & streamers (reaches out broader with more songs)
  const outerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 202);
    // Scales from ~110 particles up to 420+ particles for rich, expansive sectors
    const count = Math.round(110 + densityFactor * 320);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const baseColor = new THREE.Color(genre.color);
    const deepCosmicVeil = new THREE.Color('#1E1B4B').lerp(new THREE.Color('#312E81'), 0.5);

    // Orient outer filaments along the sector's galactic position angle
    const galAngle = Math.atan2(genre.position[2] || 0.01, genre.position[0] || 0.01);
    const maxR = 7.5 + densityFactor * 9.5;

    for (let i = 0; i < count; i++) {
      const rRatio = Math.pow(prng(), 1.35);
      const r = 2.4 + rRatio * maxR;

      // Asymmetric dust streamers flowing with galactic curvature
      const theta = galAngle + (prng() - 0.5) * 1.4 + Math.sin(r * 0.35) * 0.5;
      const x = Math.cos(theta) * r * 1.12;
      const z = Math.sin(theta) * r * 0.88;
      const y = (prng() - 0.5) * 3.4 * Math.max(0.15, 1.0 - r / 16.0);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Deep celestial chromatic shift toward cosmic background
      const normR = Math.min(1.0, (r - 2.4) / maxR);
      const c = new THREE.Color().copy(baseColor).lerp(deepCosmicVeil, normR * 0.7);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      scales[i] = 1.0 + normR * 1.5 + prng() * 0.8;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));
    return geom;
  }, [seed, densityFactor, genre.color, genre.position]);

  // 3. Materials with GPU-level smoothstep-gaussian falloff & proximity-safe attenuation
  const innerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-inner-v5-${genre.id}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBrightness = { value: 0.050 };

      shader.vertexShader = `
        attribute float pointScale;
        varying vec3 vNebulaColor;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        `
        #include <color_vertex>
        vNebulaColor = color;
        `
      );

      // Proximity-safe attenuation: prevents screen-filling glare when approaching the star
      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        `
        float pSize = size * pointScale * (65.0 / max(9.0, -mvPosition.z));
        gl_PointSize = clamp(pSize, 1.0, 16.0);
        `
      );

      shader.fragmentShader = `
        uniform float uBrightness;
        varying vec3 vNebulaColor;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #include <map_particle_fragment>
        vec2 ptCoord = gl_PointCoord - vec2(0.5);
        float dist = length(ptCoord);
        if (dist > 0.5) discard;
        // Asymptotic zero-slope Hermite falloff: mathematically 0 at edge, completely eliminating circular stamp edges
        float edgeFade = smoothstep(0.5, 0.05, dist);
        float coreGlow = exp(-dist * dist * 6.0);
        float falloff = edgeFade * coreGlow;
        diffuseColor.rgb = vNebulaColor * (0.65 + 0.35 * coreGlow);
        diffuseColor.a *= falloff * uBrightness;
        `
      );

      mat.userData.shader = shader;
    };

    return mat;
  }, [genre.id]);

  const outerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 3.2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-outer-v5-${genre.id}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBrightness = { value: 0.030 };

      shader.vertexShader = `
        attribute float pointScale;
        varying vec3 vNebulaColor;
        ${shader.vertexShader}
      `;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_vertex>',
        `
        #include <color_vertex>
        vNebulaColor = color;
        `
      );

      // Proximity-safe attenuation
      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        `
        float pSize = size * pointScale * (65.0 / max(9.0, -mvPosition.z));
        gl_PointSize = clamp(pSize, 1.0, 20.0);
        `
      );

      shader.fragmentShader = `
        uniform float uBrightness;
        varying vec3 vNebulaColor;
        ${shader.fragmentShader}
      `;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #include <map_particle_fragment>
        vec2 ptCoord = gl_PointCoord - vec2(0.5);
        float dist = length(ptCoord);
        if (dist > 0.5) discard;
        // Asymptotic zero-slope Hermite falloff: strictly zero visible boundary
        float edgeFade = smoothstep(0.5, 0.06, dist);
        float coreGlow = exp(-dist * dist * 5.5);
        float falloff = edgeFade * coreGlow;
        diffuseColor.rgb = vNebulaColor * (0.60 + 0.30 * coreGlow);
        diffuseColor.a *= falloff * uBrightness;
        `
      );

      mat.userData.shader = shader;
    };

    return mat;
  }, [genre.id]);

  // Clean up WebGL resources when component unmounts
  useEffect(() => {
    return () => {
      innerGeometry.dispose();
      outerGeometry.dispose();
      innerMaterial.dispose();
      outerMaterial.dispose();
    };
  }, [innerGeometry, outerGeometry, innerMaterial, outerMaterial]);

  // 4. Per-frame slow harmonic rotation, audio-reactive respiration, and steady brightness modulation
  useFrame((state, delta) => {
    if (isFilteredOut) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (groupRef.current) groupRef.current.visible = true;

    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    if (!prefersReducedMotion) {
      if (innerPointsRef.current) {
        innerPointsRef.current.rotation.y += delta * 0.012 * rotSign;
        innerPointsRef.current.rotation.x = Math.sin(t * 0.25 + seed) * 0.05;
        innerPointsRef.current.rotation.z = Math.cos(t * 0.20 + seed) * 0.04;
      }
      if (outerPointsRef.current) {
        outerPointsRef.current.rotation.y -= delta * 0.008 * rotSign;
        outerPointsRef.current.rotation.x = Math.cos(t * 0.16 + seed) * 0.04;
        outerPointsRef.current.rotation.z = Math.sin(t * 0.14 + seed) * 0.05;
      }
      if (groupRef.current) {
        groupRef.current.position.y =
          genre.position[1] + Math.sin(t * 0.30 + seed) * 0.22;
        groupRef.current.position.x =
          genre.position[0] + Math.cos(t * 0.20 + seed) * 0.15;
      }
    }

    // Steady, serene brightness: NO sudden spike or flare-up when approaching or selecting!
    const targetInnerBrightness = THREE.MathUtils.clamp(
      0.055 * stellarBrightness,
      0.01,
      0.10
    );

    const targetOuterBrightness = THREE.MathUtils.clamp(
      0.035 * stellarBrightness,
      0.006,
      0.07
    );

    if (innerMaterial.userData.shader) {
      innerMaterial.userData.shader.uniforms.uBrightness.value = THREE.MathUtils.lerp(
        innerMaterial.userData.shader.uniforms.uBrightness.value,
        targetInnerBrightness,
        Math.min(1, delta * 3.0)
      );
    }

    if (outerMaterial.userData.shader) {
      outerMaterial.userData.shader.uniforms.uBrightness.value = THREE.MathUtils.lerp(
        outerMaterial.userData.shader.uniforms.uBrightness.value,
        targetOuterBrightness,
        Math.min(1, delta * 3.0)
      );
    }

    // Subtle cluster expansion breathing with sub-bass
    if (groupRef.current) {
      const breathing = !prefersReducedMotion ? Math.sin(t * 0.60 + seed) * 0.015 : 0;
      const tierBaseScale = isSupercluster ? 1.15 : 1.0;
      const targetScale =
        tierBaseScale *
        (1.0 + (fft.isPlaying ? fft.subBass * 0.04 : breathing));
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, Math.min(1, delta * 5))
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={genre.position}
      name={`nebula-cluster-${genre.id}`}
    >
      {/* Inner Dense Ionized Gas Nebular Core (Zero circular rim, 100% volumetric falloff) */}
      <points
        ref={innerPointsRef}
        geometry={innerGeometry}
        material={innerMaterial}
      />

      {/* Outer Interstellar Dust Veil & Streamers */}
      <points
        ref={outerPointsRef}
        geometry={outerGeometry}
        material={outerMaterial}
      />
    </group>
  );
};

/**
 * Milky Way-style cosmic dust and interstellar nebular gas clusters (`NebulaClusters`).
 *
 * Renders radiant, organic gas clouds around genre sector centers (`data.genres`).
 * Density and particle count scale directly with genre song count.
 * Modulates opacity gently with `stellarBrightness` and breathes synchronously
 * with real-time Web Audio sub-bass frequencies. Zero geometric sphere silhouettes.
 */
export const NebulaClusters: React.FC = () => {
  const genres = useGalaxyStore((s) => s.data.genres);

  if (!genres || genres.length === 0) return null;

  return (
    <group name="galactic-nebula-clusters">
      {genres.map((genre) => (
        <SectorNebulaCluster key={genre.id} genre={genre} />
      ))}
    </group>
  );
};
