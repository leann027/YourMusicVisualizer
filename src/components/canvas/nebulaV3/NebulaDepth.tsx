'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGalaxyStore } from '../../../store/useGalaxyStore';
import { getNebulaLayout } from '../../../lib/layout/nebulaLayout';
import { buildNebulaDepthGeometry } from './nebulaDepthGeometry';
import { computeNebulaFieldTargets, DEFAULT_STELLAR_BRIGHTNESS } from './nebulaFieldTargets';
import { createNebulaFogMaterial, createNebulaLanesMaterial } from './shaders/nebulaDepthShaders';
import { parseNebulaTune } from './nebulaTune';

// Same easing as the gas field, so the depth layers dim together with the gas
const FOCUS_EASE = 0.07;

/** Draw after the gas (additive) so the lanes darken it; StarField uses 2 so stars stay bright. */
export const NEBULA_LANES_RENDER_ORDER = 1;

/**
 * Nebulosas v3 depth (B2): fog + emission knots (additive) and dark dust lanes (multiply),
 * two draw calls next to the M6 gas field. Uniforms are driven every frame without re-renders.
 */
export const NebulaDepth: React.FC = () => {
  const fogRef = useRef<THREE.Points>(null);
  const lanesRef = useRef<THREE.Points>(null);
  const baseData = useGalaxyStore((s) => s.baseData);
  const density = useGalaxyStore((s) => s.nebulaFieldDensity);
  const gl = useThree((s) => s.gl);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const layout = useMemo(() => getNebulaLayout(baseData), [baseData]);
  const depth = useMemo(() => buildNebulaDepthGeometry(layout, density), [layout, density]);
  const fogMaterial = useMemo(() => createNebulaFogMaterial(), []);
  const lanesMaterial = useMemo(() => createNebulaLanesMaterial(), []);
  // Development-only look override: ?fogTune=<fog>,<lanes>
  const tune = useMemo(() => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null;
    return parseNebulaTune(new URLSearchParams(window.location.search).get('fogTune'));
  }, []);

  useEffect(
    () => () => {
      depth.glow.dispose();
      depth.lanes.dispose();
    },
    [depth]
  );
  useEffect(
    () => () => {
      fogMaterial.dispose();
      lanesMaterial.dispose();
    },
    [fogMaterial, lanesMaterial]
  );

  useFrame((state, delta) => {
    const store = useGalaxyStore.getState();
    const targets = computeNebulaFieldTargets({
      data: layout.data,
      genreIds: depth.genreIds,
      particleCount: 1,
      stellarBrightness: store.stellarBrightness,
      minAffinityFilter: store.minAffinityFilter,
      selectedSectorId: store.selectedSectorId,
      selectedNode: store.selectedNode,
      cameraMode: store.cameraMode,
      playingTrackId: store.playingTrackId,
      selectedCollision: store.selectedCollision,
    });
    const fov = state.camera instanceof THREE.PerspectiveCamera ? state.camera.fov : 52;
    const viewScale = state.size.height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));

    for (const ref of [fogRef, lanesRef]) {
      // reach the materials through the refs (as the gas field does): hook values stay immutable
      const mat = ref.current?.material as THREE.ShaderMaterial | undefined;
      if (!mat) continue;
      const u = mat.uniforms;
      if (!prefersReducedMotion) u.uTime.value += Math.min(delta, 0.05);
      u.uPixelRatio.value = gl.getPixelRatio();
      u.uViewScale.value = viewScale;
      u.uGain.value = store.stellarBrightness / DEFAULT_STELLAR_BRIGHTNESS;
      if (targets.focusGid >= 0) {
        u.uFocusGid.value = targets.focusGid;
        u.uFocusGid2.value = targets.focusGid2;
      }
      u.uFocusAmt.value += (targets.focusAmt - u.uFocusAmt.value) * FOCUS_EASE;
      if (tune) {
        u.uFogGain.value = tune.size;
        u.uLaneGain.value = tune.alpha;
      }
    }
  });

  return (
    <>
      <points ref={fogRef} geometry={depth.glow} material={fogMaterial} frustumCulled={false} name="nebula-depth-fog" />
      <points
        ref={lanesRef}
        geometry={depth.lanes}
        material={lanesMaterial}
        frustumCulled={false}
        renderOrder={NEBULA_LANES_RENDER_ORDER}
        name="nebula-depth-lanes"
      />
    </>
  );
};
