'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { buildNebulaFieldGeometry, NEBULA_FIELD_DENSITY } from './nebulaFieldGeometry';
import { computeNebulaFieldTargets } from './nebulaFieldTargets';
import { createNebulaFieldMaterial } from './shaders/nebulaFieldShaders';
import { readTuneParam } from './nebulaTune';

// Easing per frame towards focus targets (reference: 0.07 genre, 0.09 artist)
const FOCUS_EASE = 0.07;
const ARTIST_EASE = 0.09;

/**
 * Nebulosas v3 gas field (M6.3): one Points draw call for every genre nebula, mounted inside
 * the rotating cosmos group in nebula mode. Uniforms are driven from the store and the FFT
 * every frame without React re-renders.
 */
export const NebulaField: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const baseData = useGalaxyStore((s) => s.baseData);
  const density = useGalaxyStore((s) => s.nebulaFieldDensity);
  const gl = useThree((s) => s.gl);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const layout = useMemo(() => getNebulaLayout(baseData), [baseData]);
  const field = useMemo(() => buildNebulaFieldGeometry(layout, NEBULA_FIELD_DENSITY[density]), [layout, density]);
  const material = useMemo(() => createNebulaFieldMaterial(), []);
  // Look override in development and on Vercel previews (B3): ?nebulaTune=<gasSize>,<gasAlpha>
  const tune = useMemo(() => readTuneParam('nebulaTune'), []);

  useEffect(() => () => field.geometry.dispose(), [field]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    // reach the material through the ref (as the classic layers do): hook values stay immutable
    const mat = pointsRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;
    const u = mat.uniforms;
    const state = useGalaxyStore.getState();
    const targets = computeNebulaFieldTargets({
      data: layout.data,
      genreIds: field.genreIds,
      particleCount: field.geometry.getAttribute('position').count,
      stellarBrightness: state.stellarBrightness,
      minAffinityFilter: state.minAffinityFilter,
      selectedSectorId: state.selectedSectorId,
      selectedNode: state.selectedNode,
      cameraMode: state.cameraMode,
      playingTrackId: state.playingTrackId,
      selectedCollision: state.selectedCollision,
    });

    if (!prefersReducedMotion) u.uTime.value += Math.min(delta, 0.05);
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uGain.value = targets.gain;
    u.uMinAffinity.value = targets.minAffinity;
    // keep the last focused genre/artist while fading out, so the dimming doesn't jump
    if (targets.focusGid >= 0) {
      u.uFocusGid.value = targets.focusGid;
      u.uFocusGid2.value = targets.focusGid2;
    }
    u.uFocusAmt.value += (targets.focusAmt - u.uFocusAmt.value) * FOCUS_EASE;
    if (targets.artistAid >= 0) u.uArtistAid.value = targets.artistAid;
    u.uArtistAmt.value += (targets.artistAmt - u.uArtistAmt.value) * ARTIST_EASE;
    u.uPlayingGid.value = targets.playingGid;
    if (tune) {
      u.uGasSize.value = tune.size;
      u.uGasAlpha.value = tune.alpha;
    }

    const fft = webAudioEngine.sampleFFT();
    u.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
    u.uHighShimmer.value = fft.isPlaying ? fft.highShimmer : 0;
  });

  return (
    <points ref={pointsRef} geometry={field.geometry} material={material} frustumCulled={false} name="nebula-field-v3" />
  );
};
