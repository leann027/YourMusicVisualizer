'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GenreNode, getSectorEvolutionTier } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

/**
 * Shared unit sphere geometry for volumetric gas core haze across all sectors.
 * Reusing a single geometry eliminates GPU memory duplication.
 */
const UNIT_HAZE_GEOMETRY = new THREE.SphereGeometry(1, 16, 16);

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

  // 1. Build deterministic particle positions for inner gas core (80 - 120 particles)
  const innerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 101);
    const count = isSupercluster ? 120 : 80;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const arm = (i % 3) * ((Math.PI * 2) / 3);
      const rRatio = Math.pow(prng(), 1.5);
      const r = 1.0 + rRatio * (isSupercluster ? 8.2 : 6.5);
      const angle = arm + r * 0.42 + (prng() - 0.5) * 0.70;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (prng() - 0.5) * 3.2 * (1 - r / 9.5);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [seed, isSupercluster]);

  // 2. Build deterministic particle positions for outer interstellar dust veil (110 - 160 particles)
  const outerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 202);
    const count = isSupercluster ? 160 : 110;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = prng() * Math.PI * 2;
      const rRatio = Math.pow(prng(), 1.25);
      const r = 4.5 + rRatio * (isSupercluster ? 14.5 : 11.5);
      // Elliptical galaxy disk shape
      const x = Math.cos(angle) * r * 1.15;
      const z = Math.sin(angle) * r * 0.85;
      const y = (prng() - 0.5) * 5.2 * (1 - r / 18.0);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [seed, isSupercluster]);

  // 3. Materials with AdditiveBlending and GPU-level circular fragment discard (zero square artifacts)
  const innerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: isSupercluster ? 14.0 : 11.0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(genre.color),
      opacity: isSupercluster ? 0.075 : 0.055,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-inner-point-${isSupercluster ? 'super' : 'std'}`;
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #include <map_particle_fragment>
        vec2 ptCoord = gl_PointCoord - vec2(0.5);
        float dist = length(ptCoord);
        if (dist > 0.5) discard;
        // Volumetric gas puff with cosine bell curve falloff
        float smoke = cos(dist * 3.14159265);
        diffuseColor.rgb *= 0.60;
        diffuseColor.a *= (smoke * smoke * 0.85);
        `
      );
    };

    return mat;
  }, [genre.color, isSupercluster]);

  const outerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: isSupercluster ? 24.0 : 18.0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(genre.color),
      opacity: isSupercluster ? 0.045 : 0.032,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-outer-point-${isSupercluster ? 'super' : 'std'}`;
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_particle_fragment>',
        `
        #include <map_particle_fragment>
        vec2 ptCoord = gl_PointCoord - vec2(0.5);
        float dist = length(ptCoord);
        if (dist > 0.5) discard;
        // Volumetric gas puff with cosine bell curve falloff
        float smoke = cos(dist * 3.14159265);
        diffuseColor.rgb *= 0.50;
        diffuseColor.a *= (smoke * smoke * 0.70);
        `
      );
    };

    return mat;
  }, [genre.color, isSupercluster]);

  const hazeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(genre.color),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
      opacity: isSupercluster ? 0.024 : 0.016,
    });
  }, [genre.color, isSupercluster]);

  // Clean up WebGL resources when component unmounts
  useEffect(() => {
    return () => {
      innerGeometry.dispose();
      outerGeometry.dispose();
      innerMaterial.dispose();
      outerMaterial.dispose();
      hazeMaterial.dispose();
    };
  }, [innerGeometry, outerGeometry, innerMaterial, outerMaterial, hazeMaterial]);

  // 4. Per-frame slow rotation, audio-reactive respiration, and stellar brightness modulation
  useFrame((state, delta) => {
    if (isFilteredOut) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (groupRef.current) groupRef.current.visible = true;

    // Multi-axis harmonic undulating motion & celestial billowing
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    if (!prefersReducedMotion) {
      if (innerPointsRef.current) {
        innerPointsRef.current.rotation.y += delta * 0.018 * rotSign;
        innerPointsRef.current.rotation.x = Math.sin(t * 0.35 + seed) * 0.08;
        innerPointsRef.current.rotation.z = Math.cos(t * 0.28 + seed) * 0.07;
      }
      if (outerPointsRef.current) {
        outerPointsRef.current.rotation.y -= delta * 0.013 * rotSign;
        outerPointsRef.current.rotation.x = Math.cos(t * 0.22 + seed) * 0.06;
        outerPointsRef.current.rotation.z = Math.sin(t * 0.19 + seed) * 0.08;
      }
      if (groupRef.current) {
        groupRef.current.position.y =
          genre.position[1] + Math.sin(t * 0.4 + seed) * 0.45;
        groupRef.current.position.x =
          genre.position[0] + Math.cos(t * 0.25 + seed) * 0.25;
      }
    }

    const selectionBoost = isSelected ? 1.2 : 1.0;

    // Photosensitive-safe, serene opacity with smooth ambient lerping (zero strobing or sudden jumps)
    const targetInnerOpacity = THREE.MathUtils.clamp(
      0.085 * stellarBrightness * selectionBoost,
      0.01,
      0.16
    );

    const targetOuterOpacity = THREE.MathUtils.clamp(
      0.052 * stellarBrightness * selectionBoost,
      0.005,
      0.12
    );

    const targetHazeOpacity = THREE.MathUtils.clamp(
      0.032 * stellarBrightness * selectionBoost,
      0.002,
      0.08
    );

    innerMaterial.opacity = THREE.MathUtils.lerp(
      innerMaterial.opacity,
      targetInnerOpacity,
      Math.min(1, delta * 2.5)
    );

    outerMaterial.opacity = THREE.MathUtils.lerp(
      outerMaterial.opacity,
      targetOuterOpacity,
      Math.min(1, delta * 2.5)
    );

    hazeMaterial.opacity = THREE.MathUtils.lerp(
      hazeMaterial.opacity,
      targetHazeOpacity,
      Math.min(1, delta * 2.5)
    );

    // Subtle cluster expansion breathing with sub-bass
    if (groupRef.current) {
      const breathing = !prefersReducedMotion ? Math.sin(t * 0.75 + seed) * 0.018 : 0;
      const tierBaseScale = isSupercluster ? 1.35 : 1.0;
      const targetScale =
        tierBaseScale *
        (1.0 + (fft.isPlaying ? fft.subBass * 0.075 : breathing)) *
        (isSelected ? 1.06 : 1.0);
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, Math.min(1, delta * 8))
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={genre.position}
      name={`nebula-cluster-${genre.id}`}
    >
      {/* Volumetric Gas Core Haze (Atmospheric Glow) */}
      <mesh
        geometry={UNIT_HAZE_GEOMETRY}
        material={hazeMaterial}
        scale={isSupercluster ? [8.5, 5.0, 8.5] : [6.5, 3.8, 6.5]}
      />

      {/* Inner Dense Gas Nebular Core */}
      <points
        ref={innerPointsRef}
        geometry={innerGeometry}
        material={innerMaterial}
      />

      {/* Outer Interstellar Dust Veil (Spiral Tendrils) */}
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
 * Modulates opacity gently with `stellarBrightness` (0.05 - 0.15 range) and breathes
 * synchronously with real-time Web Audio sub-bass frequencies.
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
