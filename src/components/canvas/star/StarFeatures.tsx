'use client';

import React from 'react';
import * as THREE from 'three';
import { Billboard } from '@react-three/drei';
import { NodeType, StarVisualMetrics } from '../../../types/music';
import {
  UNIT_DIFFRACTION_GEOMETRY,
  UNIT_POLAR_JET_GEOMETRY,
  UNIT_SATELLITE_GEOMETRY,
} from './starGeometries';

export interface StarFeaturesProps {
  nodeType: NodeType;
  metrics: StarVisualMetrics;
  starColor: string;
  stellarBrightness: number;
  diffractionRef?: React.RefObject<THREE.Group | null>;
  satelliteRef?: React.RefObject<THREE.Group | null>;
}

/**
 * Astronomical tier features:
 * 1. 4-point optical diffraction spikes for supergiant artists.
 * 2. Relativistic polar energy jets for sector core nodes.
 * 3. Orbiting micro-satellites for prominent artists.
 */
export const StarFeatures: React.FC<StarFeaturesProps> = ({
  nodeType,
  metrics,
  starColor,
  stellarBrightness,
  diffractionRef,
  satelliteRef,
}) => {
  return (
    <>
      {/* 4-Point Optical Diffraction Spikes (Tier 3 Supergiant Artists - fades on close approach) */}
      {nodeType === 'artist' && metrics.artistTier === 'supergiant' && (
        <group ref={diffractionRef}>
          <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <mesh geometry={UNIT_DIFFRACTION_GEOMETRY} scale={metrics.coreRadius * 2.8}>
              <meshBasicMaterial
                color={starColor}
                transparent
                opacity={0.28 * stellarBrightness}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <mesh
              geometry={UNIT_DIFFRACTION_GEOMETRY}
              scale={metrics.coreRadius * 2.8}
              rotation={[0, 0, Math.PI / 2]}
            >
              <meshBasicMaterial
                color={starColor}
                transparent
                opacity={0.28 * stellarBrightness}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </Billboard>
        </group>
      )}

      {/* Relativistic Polar Energy Jets (Tier 3 Dominant Sector Active Galactic Nuclei) */}
      {metrics.hasPolarJets && (
        <group>
          {/* North Polar Jet */}
          <mesh
            geometry={UNIT_POLAR_JET_GEOMETRY}
            position={[0, 2.2 * metrics.coreRadius, 0]}
          >
            <meshBasicMaterial
              color={starColor}
              transparent
              opacity={0.35 * stellarBrightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {/* South Polar Jet */}
          <mesh
            geometry={UNIT_POLAR_JET_GEOMETRY}
            position={[0, -2.2 * metrics.coreRadius, 0]}
            rotation={[Math.PI, 0, 0]}
          >
            <meshBasicMaterial
              color={starColor}
              transparent
              opacity={0.35 * stellarBrightness}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Orbiting Micro-Satellites (Tier 3 Supergiant Artists) */}
      {metrics.hasOrbitalSatellites && (
        <group ref={satelliteRef}>
          <mesh
            geometry={UNIT_SATELLITE_GEOMETRY}
            position={[metrics.coreRadius * 2.2, 0, 0]}
          >
            <meshBasicMaterial color="#CCFF00" />
          </mesh>
          <mesh
            geometry={UNIT_SATELLITE_GEOMETRY}
            position={[-metrics.coreRadius * 1.8, metrics.coreRadius * 0.35, metrics.coreRadius * 1.1]}
          >
            <meshBasicMaterial color="#00F5D4" />
          </mesh>
          <mesh
            geometry={UNIT_SATELLITE_GEOMETRY}
            position={[metrics.coreRadius * 0.9, -metrics.coreRadius * 0.45, -metrics.coreRadius * 1.9]}
          >
            <meshBasicMaterial color="#FF2A85" />
          </mesh>
        </group>
      )}
    </>
  );
};
