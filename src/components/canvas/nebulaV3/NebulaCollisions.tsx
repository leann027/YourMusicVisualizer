'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { buildNebulaCollisionGeometry } from './nebulaCollisionGeometry';
import { FIELD_SHARE, NEBULA_FIELD_DENSITY } from './nebulaFieldGeometry';
import { computeNebulaFieldTargets } from './nebulaFieldTargets';
import { createNebulaCollisionMaterial } from './shaders/nebulaCollisionShaders';
import { parseNebulaTune } from './nebulaTune';

const FOCUS_EASE = 0.07;

/**
 * Nebulosas v3 collisions (M7.1): shock fronts, tidal streams and mixed gas where related
 * nebulae overlap. One Points draw call next to NebulaField, sharing its density and gain.
 */
export const NebulaCollisions: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const baseData = useGalaxyStore((s) => s.baseData);
  const density = useGalaxyStore((s) => s.nebulaFieldDensity);
  const gl = useThree((s) => s.gl);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const layout = useMemo(() => getNebulaLayout(baseData), [baseData]);
  const collisions = useMemo(
    () => buildNebulaCollisionGeometry(layout, NEBULA_FIELD_DENSITY[density]),
    [layout, density]
  );
  const material = useMemo(() => createNebulaCollisionMaterial(), []);
  // Development-only look override: ?clashTune=<size>,<alpha>
  const tune = useMemo(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
    return parseNebulaTune(new URLSearchParams(window.location.search).get('clashTune'));
  }, []);
  const genreIds = useMemo(() => layout.data.genres.map((g) => g.id), [layout]);

  useEffect(() => () => collisions.geometry.dispose(), [collisions]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const mat = pointsRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;
    const u = mat.uniforms;
    const state = useGalaxyStore.getState();
    // same gain as the field: the collision budget is the field's complement at this density
    const targets = computeNebulaFieldTargets({
      data: layout.data,
      genreIds,
      particleCount: NEBULA_FIELD_DENSITY[density] * FIELD_SHARE,
      stellarBrightness: state.stellarBrightness,
      minAffinityFilter: state.minAffinityFilter,
      selectedSectorId: state.selectedSectorId,
      selectedNode: state.selectedNode,
      cameraMode: state.cameraMode,
      playingTrackId: state.playingTrackId,
    });

    if (!prefersReducedMotion) u.uTime.value += Math.min(delta, 0.05);
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uGain.value = targets.gain;
    u.uMinAffinity.value = targets.minAffinity;
    if (targets.focusGid >= 0) u.uFocusGid.value = targets.focusGid;
    u.uFocusAmt.value += (targets.focusAmt - u.uFocusAmt.value) * FOCUS_EASE;
    if (tune) {
      u.uClashSize.value = tune.size;
      u.uClashAlpha.value = tune.alpha;
    }

    const fft = webAudioEngine.sampleFFT();
    u.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
  });

  return (
    <points
      ref={pointsRef}
      geometry={collisions.geometry}
      material={material}
      frustumCulled={false}
      name="nebula-collisions-v3"
    />
  );
};
