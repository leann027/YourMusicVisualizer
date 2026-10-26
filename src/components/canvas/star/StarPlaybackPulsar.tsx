'use client';

import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { StarVisualMetrics } from '../../../types/music';
import { UNIT_RIPPLE_GEOMETRY, UNIT_SATELLITE_GEOMETRY } from './starGeometries';
import { softRingOnBeforeCompile, softRingCustomProgramCacheKey } from './shaders/starShaders';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';

export interface StarPlaybackPulsarProps {
  metrics: StarVisualMetrics;
  stellarBrightness: number;
  prefersReducedMotion?: boolean;
}

/**
 * Resonant Multi-Wave Acoustic Soundwave Pulsar & Revolving Harmonic Equalizer Sparks.
 *
 * Performance-critical: Mounted strictly and conditionally when `isPlayingNode === true`.
 * Isolates Web Audio API FFT sampling and per-frame trigonometry to only the currently playing star,
 * eliminating audio analysis and matrix calculation overhead across 100+ idle stars.
 */
export const StarPlaybackPulsar: React.FC<StarPlaybackPulsarProps> = ({
  metrics,
  stellarBrightness,
  prefersReducedMotion = false,
}) => {
  const rippleRef = useRef<THREE.Mesh>(null);
  const ripple2Ref = useRef<THREE.Mesh>(null);
  const ripple3Ref = useRef<THREE.Mesh>(null);
  const audioSparksGroupRef = useRef<THREE.Group>(null);
  const spark1Ref = useRef<THREE.Mesh>(null);
  const spark2Ref = useRef<THREE.Mesh>(null);
  const spark3Ref = useRef<THREE.Mesh>(null);
  const spark4Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    const p1 = (t * 0.55) % 1.0;
    const p2 = (t * 0.55 + 0.33) % 1.0;
    const p3 = (t * 0.55 + 0.66) % 1.0;
    const baseWaveScale = metrics.coreRadius * (1.05 + (fft.isPlaying ? fft.subBass * 0.35 : 0));

    if (rippleRef.current) {
      const s1 = baseWaveScale * (1.0 + p1 * (1.5 + (fft.isPlaying ? fft.subBass * 0.7 : 0)));
      rippleRef.current.scale.setScalar(s1);
      const mat1 = rippleRef.current.material as THREE.MeshBasicMaterial;
      if (mat1) {
        mat1.opacity =
          Math.sin(p1 * Math.PI) *
          (0.65 + (fft.isPlaying ? fft.energy * 0.25 : 0)) *
          stellarBrightness;
      }
    }

    if (ripple2Ref.current) {
      const s2 = baseWaveScale * (1.0 + p2 * (1.5 + (fft.isPlaying ? fft.subBass * 0.7 : 0)));
      ripple2Ref.current.scale.setScalar(s2);
      const mat2 = ripple2Ref.current.material as THREE.MeshBasicMaterial;
      if (mat2) {
        mat2.opacity =
          Math.sin(p2 * Math.PI) *
          (0.58 + (fft.isPlaying ? fft.midHarmonic * 0.25 : 0)) *
          stellarBrightness;
      }
    }

    if (ripple3Ref.current) {
      const s3 = baseWaveScale * (1.0 + p3 * (1.5 + (fft.isPlaying ? fft.subBass * 0.7 : 0)));
      ripple3Ref.current.scale.setScalar(s3);
      const mat3 = ripple3Ref.current.material as THREE.MeshBasicMaterial;
      if (mat3) {
        mat3.opacity =
          Math.sin(p3 * Math.PI) *
          (0.50 + (fft.isPlaying ? fft.highShimmer * 0.25 : 0)) *
          stellarBrightness;
      }
    }

    if (audioSparksGroupRef.current && !prefersReducedMotion) {
      audioSparksGroupRef.current.rotation.y +=
        delta * (1.5 + (fft.isPlaying ? fft.energy * 2.2 : 0));
      audioSparksGroupRef.current.rotation.x = Math.sin(t * 1.8) * 0.25;
      audioSparksGroupRef.current.rotation.z = Math.cos(t * 1.4) * 0.20;

      if (spark1Ref.current) {
        spark1Ref.current.scale.setScalar(1.0 + (fft.isPlaying ? fft.subBass * 1.8 : 0));
      }
      if (spark2Ref.current) {
        spark2Ref.current.scale.setScalar(1.0 + (fft.isPlaying ? fft.midHarmonic * 1.8 : 0));
      }
      if (spark3Ref.current) {
        spark3Ref.current.scale.setScalar(1.0 + (fft.isPlaying ? fft.highShimmer * 1.8 : 0));
      }
      if (spark4Ref.current) {
        spark4Ref.current.scale.setScalar(1.0 + (fft.isPlaying ? fft.energy * 1.8 : 0));
      }
    }
  });

  return (
    <group>
      {/* Ring 1: Primary Cyan Resonant Wavefront */}
      <mesh
        ref={rippleRef}
        geometry={UNIT_RIPPLE_GEOMETRY}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshBasicMaterial
          color="#00F5D4"
          side={THREE.DoubleSide}
          transparent
          opacity={0.65 * stellarBrightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          onBeforeCompile={softRingOnBeforeCompile}
          customProgramCacheKey={softRingCustomProgramCacheKey}
        />
      </mesh>

      {/* Ring 2: Secondary Neon-Lime Harmonic Wavefront */}
      <mesh
        ref={ripple2Ref}
        geometry={UNIT_RIPPLE_GEOMETRY}
        rotation={[Math.PI / 2.15, 0.22, 0]}
      >
        <meshBasicMaterial
          color="#CCFF00"
          side={THREE.DoubleSide}
          transparent
          opacity={0.55 * stellarBrightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          onBeforeCompile={softRingOnBeforeCompile}
          customProgramCacheKey={softRingCustomProgramCacheKey}
        />
      </mesh>

      {/* Ring 3: Tertiary Cosmic Magenta Sub-Bass Wavefront */}
      <mesh
        ref={ripple3Ref}
        geometry={UNIT_RIPPLE_GEOMETRY}
        rotation={[Math.PI / 1.85, -0.22, 0]}
      >
        <meshBasicMaterial
          color="#FF2A85"
          side={THREE.DoubleSide}
          transparent
          opacity={0.45 * stellarBrightness}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          onBeforeCompile={softRingOnBeforeCompile}
          customProgramCacheKey={softRingCustomProgramCacheKey}
        />
      </mesh>

      {/* 4 Orbiting Harmonic Audio Equalizer Micro-Sparks */}
      <group ref={audioSparksGroupRef}>
        <mesh
          ref={spark1Ref}
          geometry={UNIT_SATELLITE_GEOMETRY}
          position={[metrics.coreRadius * 2.2, 0, 0]}
        >
          <meshBasicMaterial color="#00F5D4" />
        </mesh>
        <mesh
          ref={spark2Ref}
          geometry={UNIT_SATELLITE_GEOMETRY}
          position={[0, metrics.coreRadius * 0.45, metrics.coreRadius * 2.2]}
        >
          <meshBasicMaterial color="#CCFF00" />
        </mesh>
        <mesh
          ref={spark3Ref}
          geometry={UNIT_SATELLITE_GEOMETRY}
          position={[-metrics.coreRadius * 2.2, -metrics.coreRadius * 0.35, 0]}
        >
          <meshBasicMaterial color="#FF2A85" />
        </mesh>
        <mesh
          ref={spark4Ref}
          geometry={UNIT_SATELLITE_GEOMETRY}
          position={[0, -metrics.coreRadius * 0.45, -metrics.coreRadius * 2.2]}
        >
          <meshBasicMaterial color="#9D4EDD" />
        </mesh>
      </group>
    </group>
  );
};
