'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import { generateSpiralStardustGeometry } from './spiralStardustGeometry';
import { createSpiralDustMaterial } from './shaders/spiralDustShaders';

export interface SpiralStardustPointsProps {
  stellarBrightness: number;
  prefersReducedMotion: boolean;
  smoothSubBassRef: React.MutableRefObject<number>;
  smoothMidRef: React.MutableRefObject<number>;
  smoothHighRef: React.MutableRefObject<number>;
  smoothEnergyRef: React.MutableRefObject<number>;
}

/**
 * 4-Arm Grand Logarithmic Spiral Galaxy Particle Mesh.
 * Renders 5,600 GPU stardust particles across the central bulge, 4 spiral arms, and outer halo.
 */
export const SpiralStardustPoints: React.FC<SpiralStardustPointsProps> = ({
  stellarBrightness,
  prefersReducedMotion,
  smoothSubBassRef,
  smoothMidRef,
  smoothHighRef,
  smoothEnergyRef,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const geom = generateSpiralStardustGeometry(5600);
    const mat = createSpiralDustMaterial();
    return { geometry: geom, material: mat };
  }, []);

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    const mat = pointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (mat?.userData?.shader) {
      const shader = mat.userData.shader;
      shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      const baseAlpha = THREE.MathUtils.clamp(0.09 + stellarBrightness * 0.35, 0.05, 0.24);
      shader.uniforms.uBrightness.value = baseAlpha + (fft.isPlaying ? fft.energy * 0.04 : 0);

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
    <points
      ref={pointsRef}
      geometry={geometry}
      material={material}
      name="central-spiral-galaxy-stardust"
    />
  );
};
