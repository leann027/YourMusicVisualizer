'use client';

import React from 'react';
import * as THREE from 'three';
import { StarVisualMetrics } from '../../../types/music';
import { UNIT_SPHERE_GEOMETRY } from './starGeometries';
import { starCoreOnBeforeCompile, starCoreCustomProgramCacheKey } from './shaders/starShaders';

export interface StarCoreMeshProps {
  metrics: StarVisualMetrics;
  coreColor: string;
  starColor: string;
  stellarBrightness: number;
  hitScale: number;
  meshRef?: React.RefObject<THREE.Mesh | null>;
  coronaRef?: React.RefObject<THREE.Mesh | null>;
  onSelect: (e?: React.MouseEvent | THREE.Event | { stopPropagation?: () => void; delta?: number }) => void;
  onPointerOver: (e: { stopPropagation: () => void }) => void;
  onPointerOut: () => void;
}

/**
 * Celestial star core consisting of:
 * 1. Invisible Raycast Hit Sphere calibrated to prevent mis-clicks during camera orbits.
 * 2. Outer Bioluminescent Corona with proximity anti-glare protection.
 * 3. Central Core Sphere with atmospheric limb darkening.
 */
export const StarCoreMesh: React.FC<StarCoreMeshProps> = ({
  metrics,
  coreColor,
  starColor,
  stellarBrightness,
  hitScale,
  meshRef,
  coronaRef,
  onSelect,
  onPointerOver,
  onPointerOut,
}) => {
  return (
    <>
      {/* Invisible Raycast Hit Sphere calibrated to prevent mis-clicks during camera orbits */}
      <mesh
        scale={hitScale}
        onClick={onSelect}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Outer Bioluminescent Corona (steady, calm ambient glow - zero glare/flare-up on approach) */}
      <mesh
        ref={coronaRef}
        geometry={UNIT_SPHERE_GEOMETRY}
        scale={metrics.coronaRadius * (0.8 + 0.3 * stellarBrightness)}
        visible={stellarBrightness > 0.12}
      >
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={metrics.coronaOpacity * stellarBrightness * 0.70}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Core Star Sphere: Atmospheric limb darkening prevents flat plastic bead appearance */}
      <mesh
        ref={meshRef}
        geometry={UNIT_SPHERE_GEOMETRY}
        scale={metrics.coreRadius}
        onClick={onSelect}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <meshBasicMaterial
          color={coreColor}
          onBeforeCompile={starCoreOnBeforeCompile}
          customProgramCacheKey={starCoreCustomProgramCacheKey}
        />
      </mesh>
    </>
  );
};
