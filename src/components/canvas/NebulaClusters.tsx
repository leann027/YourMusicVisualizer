'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GenreNode } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

/**
 * Shared unit sphere geometry for volumetric gas core haze across all sectors.
 * Reusing a single geometry eliminates GPU memory duplication.
 */
const UNIT_HAZE_GEOMETRY = new THREE.SphereGeometry(1, 16, 16);

/**
 * Cached programmatic radial gradient texture.
 * Generates an ultra-soft atmospheric luminance profile without requiring external image assets.
 */
let sharedNebulaTexture: THREE.CanvasTexture | null = null;

function getSharedNebulaTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  if (sharedNebulaTexture) return sharedNebulaTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Multi-stop radial gradient for natural interstellar gas falloff
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.78)');
  gradient.addColorStop(0.42, 'rgba(255, 255, 255, 0.32)');
  gradient.addColorStop(0.72, 'rgba(255, 255, 255, 0.08)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  sharedNebulaTexture = texture;
  return sharedNebulaTexture;
}

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
  texture: THREE.Texture | null;
}

const SectorNebulaCluster: React.FC<SectorNebulaClusterProps> = ({
  genre,
  texture,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerPointsRef = useRef<THREE.Points>(null);
  const outerPointsRef = useRef<THREE.Points>(null);

  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const selectedSectorId = useGalaxyStore((s) => s.selectedSectorId);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);

  const isSelected = selectedSectorId === genre.id;
  const isFilteredOut = genre.affinity < minAffinityFilter;

  const seed = useMemo(() => hashStr(genre.id), [genre.id]);
  const rotSign = seed % 2 === 0 ? 1 : -1;

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // 1. Build deterministic particle positions for inner gas core (~70 particles)
  const innerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 101);
    const count = 70;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const arm = (i % 3) * ((Math.PI * 2) / 3);
      const rRatio = Math.pow(prng(), 1.6);
      const r = 1.2 + rRatio * 6.5;
      const angle = arm + r * 0.45 + (prng() - 0.5) * 0.75;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (prng() - 0.5) * 2.8 * (1 - r / 8.5);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [seed]);

  // 2. Build deterministic particle positions for outer interstellar dust veil (~90 particles)
  const outerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 202);
    const count = 90;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const angle = prng() * Math.PI * 2;
      const rRatio = Math.pow(prng(), 1.3);
      const r = 5.0 + rRatio * 11.0;
      // Elliptical galaxy disk shape
      const x = Math.cos(angle) * r * 1.15;
      const z = Math.sin(angle) * r * 0.85;
      const y = (prng() - 0.5) * 4.6 * (1 - r / 17.0);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geom;
  }, [seed]);

  // 3. Materials with AdditiveBlending and soft celestial tinting
  const innerMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 15.0,
      map: texture || undefined,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(genre.color),
      opacity: 0.08,
    });
  }, [genre.color, texture]);

  const outerMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 26.0,
      map: texture || undefined,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(genre.color),
      opacity: 0.05,
    });
  }, [genre.color, texture]);

  const hazeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(genre.color),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
      opacity: 0.035,
    });
  }, [genre.color]);

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

    // Pulse with sub-bass (20-140Hz) and overall spectral energy
    const audioKick = fft.isPlaying
      ? fft.subBass * 0.065 + fft.energy * 0.035
      : 0;

    const selectionBoost = isSelected ? 1.3 : 1.0;

    // Calibrated soft opacity ranges (0.05 to 0.15) modulated by stellarBrightness
    const targetInnerOpacity = THREE.MathUtils.clamp(
      (0.085 * stellarBrightness * selectionBoost) + (audioKick * stellarBrightness * 0.8),
      0.01,
      0.24
    );

    const targetOuterOpacity = THREE.MathUtils.clamp(
      (0.052 * stellarBrightness * selectionBoost) + (audioKick * stellarBrightness * 0.55),
      0.005,
      0.16
    );

    const targetHazeOpacity = THREE.MathUtils.clamp(
      (0.032 * stellarBrightness * selectionBoost) + (audioKick * stellarBrightness * 0.35),
      0.002,
      0.10
    );

    innerMaterial.opacity = THREE.MathUtils.lerp(
      innerMaterial.opacity,
      targetInnerOpacity,
      Math.min(1, delta * 9)
    );

    outerMaterial.opacity = THREE.MathUtils.lerp(
      outerMaterial.opacity,
      targetOuterOpacity,
      Math.min(1, delta * 9)
    );

    hazeMaterial.opacity = THREE.MathUtils.lerp(
      hazeMaterial.opacity,
      targetHazeOpacity,
      Math.min(1, delta * 9)
    );

    // Subtle cluster expansion breathing with sub-bass
    if (groupRef.current) {
      const breathing = !prefersReducedMotion ? Math.sin(t * 0.75 + seed) * 0.018 : 0;
      const targetScale =
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
        scale={[6.5, 3.8, 6.5]}
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
  const texture = useMemo(() => getSharedNebulaTexture(), []);

  if (!genres || genres.length === 0) return null;

  return (
    <group name="galactic-nebula-clusters">
      {genres.map((genre) => (
        <SectorNebulaCluster
          key={genre.id}
          genre={genre}
          texture={texture}
        />
      ))}
    </group>
  );
};
