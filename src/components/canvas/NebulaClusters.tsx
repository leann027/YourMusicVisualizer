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
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);

  const isSelected = selectedSectorId === genre.id;
  const isFilteredOut = genre.affinity < minAffinityFilter;

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

  // 1. Organic multi-spectral ionized gas core (120 - 180 fine ethereal puffs)
  const innerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 101);
    const count = isSupercluster ? 180 : 120;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const baseColor = new THREE.Color(genre.color);
    const coreTint = new THREE.Color(genre.color).lerp(new THREE.Color('#FFFFFF'), 0.20);

    for (let i = 0; i < count; i++) {
      // 3-lobed logarithmic spiral tendrils for natural celestial wispiness
      const arm = (i % 3) * ((Math.PI * 2) / 3);
      const rRatio = Math.pow(prng(), 1.5);
      const maxR = isSupercluster ? 6.5 : 5.0;
      const r = 0.5 + rRatio * maxR;

      const angle = arm + Math.log(r + 1.2) * 1.4 + (prng() - 0.5) * 0.75;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      // Exponential vertical concentration near midplane
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
  }, [seed, isSupercluster, genre.color]);

  // 2. Interstellar dust filament veil & streamers (160 - 240 particles)
  const outerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 202);
    const count = isSupercluster ? 240 : 160;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const scales = new Float32Array(count);

    const baseColor = new THREE.Color(genre.color);
    const deepCosmicVeil = new THREE.Color('#1E1B4B').lerp(new THREE.Color('#312E81'), 0.5);

    // Orient outer filaments along the sector's galactic position angle
    const galAngle = Math.atan2(genre.position[2] || 0.01, genre.position[0] || 0.01);

    for (let i = 0; i < count; i++) {
      const rRatio = Math.pow(prng(), 1.35);
      const maxR = isSupercluster ? 14.5 : 11.0;
      const r = 2.8 + rRatio * maxR;

      // Asymmetric dust streamers flowing with galactic curvature
      const theta = galAngle + (prng() - 0.5) * 1.4 + Math.sin(r * 0.35) * 0.5;
      const x = Math.cos(theta) * r * 1.12;
      const z = Math.sin(theta) * r * 0.88;
      const y = (prng() - 0.5) * 3.4 * Math.max(0.15, 1.0 - r / 16.0);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Deep celestial chromatic shift toward cosmic background
      const normR = Math.min(1.0, (r - 2.8) / maxR);
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
  }, [seed, isSupercluster, genre.color, genre.position]);

  // 3. Materials with GPU-level smoothstep-gaussian falloff (Strictly zero disc/circle rim)
  const innerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: isSupercluster ? 2.6 : 2.0,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-inner-v4-${isSupercluster ? 'super' : 'std'}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBrightness = { value: 0.055 };

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

      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        `
        float pSize = size * pointScale * (120.0 / -mvPosition.z);
        gl_PointSize = clamp(pSize, 1.0, 24.0);
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
  }, [isSupercluster]);

  const outerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: isSupercluster ? 3.8 : 3.0,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-outer-v4-${isSupercluster ? 'super' : 'std'}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBrightness = { value: 0.035 };

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

      shader.vertexShader = shader.vertexShader.replace(
        'gl_PointSize = size;',
        `
        float pSize = size * pointScale * (120.0 / -mvPosition.z);
        gl_PointSize = clamp(pSize, 1.2, 32.0);
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
  }, [isSupercluster]);

  // Clean up WebGL resources when component unmounts
  useEffect(() => {
    return () => {
      innerGeometry.dispose();
      outerGeometry.dispose();
      innerMaterial.dispose();
      outerMaterial.dispose();
    };
  }, [innerGeometry, outerGeometry, innerMaterial, outerMaterial]);

  // 4. Per-frame slow harmonic rotation, audio-reactive respiration, and stellar brightness modulation
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
          genre.position[1] + Math.sin(t * 0.30 + seed) * 0.25;
        groupRef.current.position.x =
          genre.position[0] + Math.cos(t * 0.20 + seed) * 0.18;
      }
    }

    const selectionBoost = isSelected ? 1.4 : 1.0;

    // Photosensitive-safe, serene opacity with smooth ambient modulation
    // Calibrated to provide a luminous ethereal backdrop without washing out stars or HUD labels
    const targetInnerBrightness = THREE.MathUtils.clamp(
      0.065 * stellarBrightness * selectionBoost,
      0.01,
      0.12
    );

    const targetOuterBrightness = THREE.MathUtils.clamp(
      0.040 * stellarBrightness * selectionBoost,
      0.006,
      0.08
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
      const tierBaseScale = isSupercluster ? 1.2 : 1.0;
      const targetScale =
        tierBaseScale *
        (1.0 + (fft.isPlaying ? fft.subBass * 0.05 : breathing)) *
        (isSelected ? 1.06 : 1.0);
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
