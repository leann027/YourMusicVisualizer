'use client';

import React from 'react';
import * as THREE from 'three';
import { NodeType, StarVisualMetrics } from '../../../types/music';
import { UNIT_RING_GEOMETRY, UNIT_OUTER_RING_GEOMETRY } from './starGeometries';
import { softRingOnBeforeCompile, softRingCustomProgramCacheKey } from './shaders/starShaders';

export interface StarAccretionRingsProps {
  nodeType: NodeType;
  affinity: number;
  metrics: StarVisualMetrics;
  starColor: string;
  isSelected: boolean;
  stellarBrightness: number;
  ringRef?: React.RefObject<THREE.Mesh | null>;
}

/**
 * Primary and secondary celestial accretion rings.
 * Rendered for high-affinity artists/songs with Cassini divisions and smooth radial falloffs.
 */
export const StarAccretionRings: React.FC<StarAccretionRingsProps> = ({
  nodeType,
  affinity,
  metrics,
  starColor,
  isSelected,
  stellarBrightness,
  ringRef,
}) => {
  if (nodeType === 'genre') return null;

  return (
    <>
      {/* Primary Equatorial Accretion Ring (Tier 2/3 artists or selected artist/song) */}
      {(metrics.hasAccretionRing || isSelected) && (
        <mesh
          ref={ringRef}
          geometry={UNIT_RING_GEOMETRY}
          scale={metrics.coreRadius * 1.05}
          rotation={[Math.PI / 2.3, 0.25, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#CCFF00' : starColor}
            side={THREE.DoubleSide}
            transparent
            opacity={Math.min(0.35, 0.16 + 0.18 * affinity) * stellarBrightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            onBeforeCompile={softRingOnBeforeCompile}
            customProgramCacheKey={softRingCustomProgramCacheKey}
          />
        </mesh>
      )}

      {/* Secondary Counter-Rotating Accretion Ring (Tier 3 Supergiant Artists only) */}
      {metrics.hasDoubleRing && (
        <mesh
          geometry={UNIT_OUTER_RING_GEOMETRY}
          scale={metrics.coreRadius * 1.15}
          rotation={[-Math.PI / 2.6, -0.35, 0]}
        >
          <meshBasicMaterial
            color={isSelected ? '#00F5D4' : '#CCFF00'}
            side={THREE.DoubleSide}
            transparent
            opacity={0.28 * stellarBrightness}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            onBeforeCompile={softRingOnBeforeCompile}
            customProgramCacheKey={softRingCustomProgramCacheKey}
          />
        </mesh>
      )}
    </>
  );
};
