'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { buildBridgeThreadGeometry } from './bridges';
import { computeNebulaFieldTargets } from './nebulaFieldTargets';
import { createBridgeThreadMaterial } from './shaders/bridgeThreadShaders';

const EASE = 0.08;

/**
 * Bridge threads (M7.2): artist → bridge song → other genre's core for every placed bridge song,
 * in one LineSegments draw call. Visible with constellation links on, or around the focused genre.
 */
export const BridgeThreads: React.FC = () => {
  const linesRef = useRef<THREE.LineSegments>(null);
  const baseData = useGalaxyStore((s) => s.baseData);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const layout = useMemo(() => getNebulaLayout(baseData), [baseData]);
  const geometry = useMemo(() => buildBridgeThreadGeometry(layout), [layout]);
  const material = useMemo(() => createBridgeThreadMaterial(), []);
  const genreIds = useMemo(() => layout.data.genres.map((g) => g.id), [layout]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const mat = linesRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;
    const u = mat.uniforms;
    const state = useGalaxyStore.getState();
    // only the focus targets are used here; thread gain follows the brightness slider directly
    const targets = computeNebulaFieldTargets({
      data: layout.data,
      genreIds,
      particleCount: 1,
      stellarBrightness: state.stellarBrightness,
      minAffinityFilter: state.minAffinityFilter,
      selectedSectorId: state.selectedSectorId,
      selectedNode: state.selectedNode,
      cameraMode: state.cameraMode,
      playingTrackId: state.playingTrackId,
    });
    if (!prefersReducedMotion) u.uTime.value += Math.min(delta, 0.05);
    u.uGain.value = state.stellarBrightness / 0.25;
    u.uShowAll.value += ((state.linksVisible ? 1 : 0) - u.uShowAll.value) * EASE;
    if (targets.focusGid >= 0) u.uFocusGid.value = targets.focusGid;
    u.uFocusAmt.value += (targets.focusAmt - u.uFocusAmt.value) * EASE;
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry} material={material} frustumCulled={false} name="nebula-bridges-v3" />
  );
};
