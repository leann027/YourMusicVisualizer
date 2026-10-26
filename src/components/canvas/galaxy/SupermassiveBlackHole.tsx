'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import {
  createAccretionDiskMaterial,
  createLensingArchMaterial,
} from './shaders/blackHoleShaders';

export interface SupermassiveBlackHoleProps {
  cameraDistance: number;
  prefersReducedMotion: boolean;
  smoothSubBassRef: React.MutableRefObject<number>;
  smoothEnergyRef: React.MutableRefObject<number>;
}

/**
 * Central Supermassive Singularity (Gargantua Aesthetic):
 * 1. Black hole event horizon sphere with deep light-absorbing horizon (`#010103`).
 * 2. Procedural relativistic accretion disk with Doppler beaming & Keplerian plasma turbulence.
 * 3. Gravitational lensing arch rendering curved deflected light over the singularity.
 */
export const SupermassiveBlackHole: React.FC<SupermassiveBlackHoleProps> = ({
  cameraDistance,
  prefersReducedMotion,
  smoothSubBassRef,
  smoothEnergyRef,
}) => {
  const coreGroupRef = useRef<THREE.Group>(null);
  const accretionMeshRef = useRef<THREE.Mesh>(null);
  const lensingMeshRef = useRef<THREE.Mesh>(null);

  const { accretionMat, lensingMat, singularityGeom, discPlaneGeom } = useMemo(() => {
    const accMat = createAccretionDiskMaterial();
    const lensMat = createLensingArchMaterial();
    const singGeom = new THREE.SphereGeometry(0.92, 32, 32);
    const planeGeom = new THREE.PlaneGeometry(6.4, 6.4, 1, 1);

    return {
      accretionMat: accMat,
      lensingMat: lensMat,
      singularityGeom: singGeom,
      discPlaneGeom: planeGeom,
    };
  }, []);

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      singularityGeom.dispose();
      discPlaneGeom.dispose();
      accretionMat.dispose();
      lensingMat.dispose();
    };
  }, [singularityGeom, discPlaneGeom, accretionMat, lensingMat]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

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
  });

  return (
    <group ref={coreGroupRef} position={[0, 0, 0]} name="supermassive-black-hole">
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
  );
};
