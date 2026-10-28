'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { webAudioEngine } from '../../../lib/audio/WebAudioEngine';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { buildStarFieldGeometry } from './starFieldGeometry';
import { computeNebulaFieldTargets, DEFAULT_STELLAR_BRIGHTNESS } from './nebulaFieldTargets';
import { createStarFieldMaterial } from './shaders/starFieldShaders';
import { parseNebulaTune } from './nebulaTune';

/** After the dust lanes (renderOrder 1, B2): lanes darken the gas, never the stars. */
export const STAR_FIELD_RENDER_ORDER = 2;

// Same easing as the gas field, so stars and gas dim together
const FOCUS_EASE = 0.07;
const ARTIST_EASE = 0.09;

/**
 * Nebulosas v3 luminous stars (B1): one Points draw call for every genre, artist and song.
 * StarNodeMesh keeps the invisible hit spheres, labels, playback pulsar and bridge rings.
 * Uniforms are driven from the store and the FFT every frame without React re-renders.
 */
export const StarField: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const baseData = useGalaxyStore((s) => s.baseData);
  const gl = useThree((s) => s.gl);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const layout = useMemo(() => getNebulaLayout(baseData), [baseData]);
  const stars = useMemo(
    () => buildStarFieldGeometry(layout.data, layout.data.genres.map((g) => g.id)),
    [layout]
  );
  const indexOf = useMemo(() => new Map(stars.nodeIds.map((id, i) => [id, i])), [stars]);
  const material = useMemo(() => createStarFieldMaterial(), []);
  // Development-only look override: ?starTune=<size>,<brightness>
  const tune = useMemo(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
    return parseNebulaTune(new URLSearchParams(window.location.search).get('starTune'));
  }, []);

  useEffect(() => () => stars.geometry.dispose(), [stars]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const mat = pointsRef.current?.material as THREE.ShaderMaterial | undefined;
    if (!mat) return;
    const u = mat.uniforms;
    const store = useGalaxyStore.getState();
    const targets = computeNebulaFieldTargets({
      data: layout.data,
      genreIds: stars.genreIds,
      particleCount: 1,
      stellarBrightness: store.stellarBrightness,
      minAffinityFilter: store.minAffinityFilter,
      selectedSectorId: store.selectedSectorId,
      selectedNode: store.selectedNode,
      cameraMode: store.cameraMode,
      playingTrackId: store.playingTrackId,
      selectedCollision: store.selectedCollision,
    });

    if (!prefersReducedMotion) u.uTime.value += Math.min(delta, 0.05);
    u.uTwinkle.value = prefersReducedMotion ? 0 : 1;
    u.uPixelRatio.value = gl.getPixelRatio();
    const camera = state.camera;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 52;
    u.uViewScale.value = state.size.height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    u.uBrightness.value = store.stellarBrightness / DEFAULT_STELLAR_BRIGHTNESS;
    u.uMinAffinity.value = targets.minAffinity;
    // keep the last focused genre/artist while fading out, so the dimming doesn't jump
    if (targets.focusGid >= 0) {
      u.uFocusGid.value = targets.focusGid;
      u.uFocusGid2.value = targets.focusGid2;
    }
    u.uFocusAmt.value += (targets.focusAmt - u.uFocusAmt.value) * FOCUS_EASE;
    if (targets.artistAid >= 0) u.uArtistAid.value = targets.artistAid;
    u.uArtistAmt.value += (targets.artistAmt - u.uArtistAmt.value) * ARTIST_EASE;

    u.uSelectedIndex.value = indexOf.get(store.selectedNode?.id ?? '') ?? -1;
    u.uHoverIndex.value = indexOf.get(store.hoveredNode?.id ?? '') ?? -1;
    u.uPlayingIndex.value = store.isAudioPlaying ? indexOf.get(store.playingTrackId ?? '') ?? -1 : -1;
    if (tune) {
      u.uStarSize.value = tune.size;
      u.uStarGain.value = tune.alpha;
    }

    const fft = webAudioEngine.sampleFFT();
    u.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
  });

  return (
    <points
      ref={pointsRef}
      geometry={stars.geometry}
      material={material}
      frustumCulled={false}
      renderOrder={STAR_FIELD_RENDER_ORDER}
      name="nebula-star-field"
    />
  );
};
