'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GenreNode, getSectorEvolutionTier } from '../../../types/music';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import {
  hashStr,
  generateSectorNebulaGeometry,
} from './nebulaGeometry';
import { createNebulaMaterial } from './shaders/nebulaShaders';

export interface SectorNebulaClusterProps {
  genre: GenreNode;
}

export const SectorNebulaCluster: React.FC<SectorNebulaClusterProps> = ({ genre }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerPointsRef = useRef<THREE.Points>(null);
  const outerPointsRef = useRef<THREE.Points>(null);

  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);
  const data = useGalaxyStore((s) => s.data);

  const isFilteredOut = genre.affinity < minAffinityFilter;

  const isPlayingThisGenre = useMemo(() => {
    if (!playingTrackId) return false;
    const playingSong = data.songs.find((s) => s.id === playingTrackId);
    return playingSong ? playingSong.genreId === genre.id : false;
  }, [playingTrackId, data.songs, genre.id]);

  const songCount = genre.songCount || 1;
  const densityFactor = Math.min(1.0, Math.max(0.12, (songCount - 1) / 20.0));

  const sectorTier = useMemo(
    () => getSectorEvolutionTier(genre.songCount, genre.affinity),
    [genre.songCount, genre.affinity]
  );
  const isSupercluster = sectorTier === 'supercluster';

  const seed = useMemo(() => hashStr(genre.id), [genre.id]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // 1. Procedural inner & outer nebular geometries
  const { innerGeometry, outerGeometry } = useMemo(() => {
    return generateSectorNebulaGeometry({
      seed,
      densityFactor,
      color: genre.color,
      position: genre.position,
    });
  }, [seed, densityFactor, genre.color, genre.position]);

  // 2. Custom GLSL materials with pinprick spark falloff & calibrated volumetric brightness
  const innerMaterial = useMemo(() => {
    return createNebulaMaterial({
      isInner: true,
      genreId: genre.id,
      baseColor: genre.color,
    });
  }, [genre.id, genre.color]);

  const outerMaterial = useMemo(() => {
    return createNebulaMaterial({
      isInner: false,
      genreId: genre.id,
      baseColor: genre.color,
    });
  }, [genre.id, genre.color]);

  // Clean up GPU resources when component unmounts or sector changes
  useEffect(() => {
    return () => {
      innerGeometry.dispose();
      outerGeometry.dispose();
      innerMaterial.dispose();
      outerMaterial.dispose();
    };
  }, [innerGeometry, outerGeometry, innerMaterial, outerMaterial]);

  // 3. Per-frame respiration, audio reactivity, and steady brightness modulation
  useFrame((state, delta) => {
    if (isFilteredOut) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (groupRef.current) groupRef.current.visible = true;

    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    if (groupRef.current) {
      groupRef.current.position.set(genre.position[0], genre.position[1], genre.position[2]);
    }

    // Rich, luminous nebula presence calibrated to 0.12 - 0.24 base opacity
    const activeBoost =
      isPlayingThisGenre && fft.isPlaying
        ? fft.highShimmer * 0.035 + fft.subBass * 0.025
        : 0;

    const targetInnerBrightness = THREE.MathUtils.clamp(
      0.14 + 0.08 * stellarBrightness + activeBoost * 0.4,
      0.10,
      0.24
    );

    const targetOuterBrightness = THREE.MathUtils.clamp(
      0.11 + 0.06 * stellarBrightness + activeBoost * 0.3,
      0.08,
      0.20
    );

    const innerMat = innerPointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (innerMat?.userData?.shader) {
      innerMat.userData.shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      innerMat.userData.shader.uniforms.uHighShimmer.value = fft.isPlaying ? fft.highShimmer : 0;
      innerMat.userData.shader.uniforms.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
      innerMat.userData.shader.uniforms.uBrightness.value = THREE.MathUtils.lerp(
        innerMat.userData.shader.uniforms.uBrightness.value,
        targetInnerBrightness,
        Math.min(1, delta * 3.0)
      );
    }

    const outerMat = outerPointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (outerMat?.userData?.shader) {
      outerMat.userData.shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      outerMat.userData.shader.uniforms.uHighShimmer.value = fft.isPlaying ? fft.highShimmer : 0;
      outerMat.userData.shader.uniforms.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
      outerMat.userData.shader.uniforms.uBrightness.value = THREE.MathUtils.lerp(
        outerMat.userData.shader.uniforms.uBrightness.value,
        targetOuterBrightness,
        Math.min(1, delta * 3.0)
      );
    }

    // Harmonic cluster expansion breathing with sub-bass
    if (groupRef.current) {
      const breathing = !prefersReducedMotion ? Math.sin(t * 0.4 + seed) * 0.008 : 0;
      const tierBaseScale = isSupercluster ? 1.15 : 1.0;
      const targetScale =
        tierBaseScale * (1.0 + (fft.isPlaying ? fft.subBass * 0.03 : breathing));
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, Math.min(1, delta * 4))
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={genre.position}
      name={`nebula-cluster-${genre.id}`}
    >
      {/* Inner Dense Ionized Gas Nebular Core */}
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
