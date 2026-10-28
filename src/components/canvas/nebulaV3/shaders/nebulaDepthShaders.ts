import * as THREE from 'three';
import { NEBULA_COMMON_GLSL } from './nebulaCommon.glsl';

/**
 * Nebulosas v3 depth materials (B2): fog + emission knots (additive) and dark dust lanes
 * (multiply). Both share one vertex shader: the particles turn with their nebula's gas
 * (same axis, anchor and spin as the M6 field) and dim with the same focus convention.
 * Every per-frame value is a uniform, so each program compiles once (constant cache keys).
 * Attribute names match nebulaDepthGeometry.ts.
 */

export const NEBULA_FOG_CACHE_KEY = 'ymv-nebula-fog-v1';
export const NEBULA_LANES_CACHE_KEY = 'ymv-nebula-lanes-v1';

/** Calibrated look; `?fogTune=fog,lanes` overrides it in development. */
export const NEBULA_DEPTH_LOOK = { fog: 1, lanes: 1 };

/** Largest sprite in CSS pixels (× pixel ratio): fog close to the camera fades out before this matters. */
export const DEPTH_MAX_PX = 512;

export interface NebulaDepthUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uPixelRatio: { value: number };
  uViewScale: { value: number }; // viewport height / (2·tan(fov/2))
  uGain: { value: number };
  uFogGain: { value: number };
  uLaneGain: { value: number };
  uFocusGid: { value: number };
  uFocusGid2: { value: number };
  uFocusAmt: { value: number };
}

export function createNebulaDepthUniforms(): NebulaDepthUniforms {
  return {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uViewScale: { value: 900 },
    uGain: { value: 1 },
    uFogGain: { value: NEBULA_DEPTH_LOOK.fog },
    uLaneGain: { value: NEBULA_DEPTH_LOOK.lanes },
    uFocusGid: { value: -1 },
    uFocusGid2: { value: -1 },
    uFocusAmt: { value: 0 },
  };
}

export const NEBULA_DEPTH_VERTEX_SHADER = /* glsl */ `
attribute vec3 color;
attribute vec3 anchor;
attribute vec3 axis;
attribute float size;
attribute float alpha;
attribute float kind;   // 0 fog · 1 emission knot · 2 dust lane
attribute float gid;
attribute float spin;
attribute float seed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uViewScale;
uniform float uGain;
uniform float uFogGain;
uniform float uLaneGain;
uniform float uFocusGid;
uniform float uFocusGid2;
uniform float uFocusAmt;

varying vec3 vColor;
varying float vAlpha;
varying float vKind;

${NEBULA_COMMON_GLSL.trim()}

float focusMul() {
  if (uFocusGid < 0.0) return 1.0;
  bool inFocus = sameId(gid, uFocusGid) || (uFocusGid2 >= 0.0 && sameId(gid, uFocusGid2));
  return inFocus ? 1.0 : mix(1.0, 0.07, uFocusAmt);
}

void main() {
  vec3 p = anchor + rotateAround(position - anchor, axis, uTime * spin);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float d = max(0.001, -mvPosition.z);
  gl_PointSize = clamp(2.0 * size * uViewScale / d, 1.0, ${DEPTH_MAX_PX.toFixed(1)}) * uPixelRatio;
  gl_Position = projectionMatrix * mvPosition;

  float a = alpha;
  a *= smoothstep(size * 0.6, size * 1.8, d);   // inside the cloud: no screen-wide veil
  a *= smoothstep(210.0, 42.0, d);               // same far fade as the gas field
  a *= focusMul();
  if (sameId(kind, 2.0)) {
    a *= uLaneGain;
  } else {
    a *= uGain * (sameId(kind, 1.0) ? 0.9 + 0.1 * sin(uTime * 0.6 + seed * 30.0) : uFogGain);
  }

  vColor = color;
  vAlpha = a;
  vKind = kind;
}
`;

export const NEBULA_FOG_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vKind;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot(q, q) * 4.0;
  if (r2 > 1.0 || vAlpha <= 0.0005) discard;
  float profile = abs(vKind - 1.0) < 0.5
    ? exp(-r2 * 5.5) * (1.0 - r2)    // emission knot: compact, bright
    : exp(-r2 * 2.2) * (1.0 - r2);   // fog: wide, soft
  gl_FragColor = vec4(vColor, profile * vAlpha);
}
`;

export const NEBULA_LANES_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot(q, q) * 4.0;
  if (r2 > 1.0 || vAlpha <= 0.0005) discard;
  float dark = clamp(exp(-r2 * 2.5) * (1.0 - r2) * vAlpha, 0.0, 0.9);
  // multiply blending: 1 keeps what is behind, vColor tints and darkens it
  gl_FragColor = vec4(mix(vec3(1.0), vColor, dark), 1.0);
}
`;

export function createNebulaFogMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: createNebulaDepthUniforms(),
    vertexShader: NEBULA_DEPTH_VERTEX_SHADER,
    fragmentShader: NEBULA_FOG_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => NEBULA_FOG_CACHE_KEY;
  return mat;
}

export function createNebulaLanesMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.MultiplyBlending,
    premultipliedAlpha: true, // Three's multiply blending needs it (dst · src.rgb)
    uniforms: createNebulaDepthUniforms(),
    vertexShader: NEBULA_DEPTH_VERTEX_SHADER,
    fragmentShader: NEBULA_LANES_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => NEBULA_LANES_CACHE_KEY;
  return mat;
}
