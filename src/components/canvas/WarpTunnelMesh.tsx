'use client';

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../../store/useGalaxyStore';

function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface WarpTunnelMeshProps {
  progressRef: React.MutableRefObject<number>;
}

const STREAK_COUNT = 680;
// Sturdy, clearly visible light beams (radius 0.26 instead of 0.045 subpixel)
const UNIT_LINE_GEOMETRY = new THREE.CylinderGeometry(0.26, 0.26, 1, 6, 1, true);

/**
 * Ephemeral Hyperspace Light Streaks (`WarpTunnelMesh`).
 *
 * Rendered strictly during the initial warp-in sequence.
 * - 680 streamlined instanced light beams aligned along the camera entry trajectory.
 * - Single GPU draw call with AdditiveBlending and high-chroma cyber-galactic palette.
 * - Dynamically shortens and fades out as the camera decelerates into orbit.
 * - Disables rendering completely (`visible = false`) once in orbit for zero GPU overhead.
 */
export const WarpTunnelMesh: React.FC<WarpTunnelMeshProps> = ({ progressRef }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isWarpActive = useGalaxyStore((s) => s.isWarpActive);
  const hasWarpCompleted = useGalaxyStore((s) => s.hasWarpCompleted);

  const instances = useMemo(() => {
    const prng = createPRNG(98765);
    const data = [];
    const colors = [
      new THREE.Color('#00F5D4'), // Cyan
      new THREE.Color('#38BDF8'), // Azure
      new THREE.Color('#F2F4F8'), // Starlight white
      new THREE.Color('#CCFF00'), // Acid lime accent
      new THREE.Color('#A855F7'), // Violet pulsar
      new THREE.Color('#FF2A85'), // Infrared magenta
    ];

    for (let i = 0; i < STREAK_COUNT; i++) {
      const angle = prng() * Math.PI * 2;
      // Cylindrical distribution around camera approach vector (radius 6.0 to 52.0)
      const radius = 6.0 + Math.pow(prng(), 1.25) * 46.0;
      // Z along approach path from deep space (Z=360 down to Z=15)
      const z = 15 + prng() * 345;
      // Camera trajectory slopes down from Y=46 at Z=295 to Y=18 at Z=52
      const tZ = (z - 52) / (295 - 52);
      const centerY = THREE.MathUtils.lerp(18, 46, tZ);
      const centerX = THREE.MathUtils.lerp(0, 12, tZ);

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.85;

      const baseLength = 32 + prng() * 58;
      const speedFactor = 0.85 + prng() * 0.35;
      const color = colors[Math.floor(prng() * colors.length)];

      data.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        baseLength,
        speedFactor,
        color,
      });
    }
    return data;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!isWarpActive || hasWarpCompleted || !meshRef.current) return;

    const p = progressRef.current; // 0.0 (start warp) -> 1.0 (in orbit)
    // Speed factor drops sharply as camera decelerates
    const speedRatio = Math.max(0, 1.0 - Math.pow(p, 0.65));
    const opacityRatio = Math.max(0, 1.0 - Math.pow(p, 1.4));

    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    if (material) {
      material.opacity = opacityRatio * 0.90;
    }

    if (opacityRatio <= 0.01) {
      meshRef.current.visible = false;
      return;
    }

    meshRef.current.visible = true;

    for (let i = 0; i < STREAK_COUNT; i++) {
      const item = instances[i];
      const length = Math.max(0.4, item.baseLength * speedRatio * item.speedFactor);

      dummy.position.set(item.baseX, item.baseY, item.baseZ);
      // Align cylinder along Z axis (pointing towards the galactic core)
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.scale.set(1.0, length, 1.0);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, item.color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  if (hasWarpCompleted && !isWarpActive) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[UNIT_LINE_GEOMETRY, undefined, STREAK_COUNT]}
      frustumCulled={false}
    >
      <meshBasicMaterial
        transparent
        opacity={0.90}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
