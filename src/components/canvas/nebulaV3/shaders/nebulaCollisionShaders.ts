import * as THREE from 'three';
import { NEBULA_COMMON_GLSL } from './nebulaCommon.glsl';
import { NEBULA_FIELD_SIZE_ATTENUATION } from './nebulaFieldShaders';

/**
 * Nebulosas v3 collision material (M7.1): shock fronts, tidal streams and mixed gas between
 * related nebulae. Tides travel a Bézier core A → control → core B entirely in the shader.
 * Attribute names match nebulaCollisionGeometry.ts.
 */

export const NEBULA_COLLISION_CACHE_KEY = 'nebula-collisions-v3';

/**
 * Shock front and tide look (M7.1b, chosen from a 3×3 grid on preset 300): fronts read as a band
 * in a collision close-up (8.4% of pixels) without competing with the gas in the overview (4.6%).
 * `?clashTune=size,alpha` overrides it in development.
 */
export const NEBULA_CLASH_LOOK = { size: 2.6, alpha: 1.8 };

export interface NebulaCollisionUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uPixelRatio: { value: number };
  uGain: { value: number };
  uMinAffinity: { value: number };
  uFocusGid: { value: number }; // -1 = none; a collision is lit when either of its genres is focused
  uFocusAmt: { value: number };
  uTideSpeed: { value: number }; // 1 = reference speed; M7.5 accelerates it for a playing bridge song
  uSubBass: { value: number };
  uClashSize: { value: number }; // calibration multipliers for shock fronts and tides
  uClashAlpha: { value: number };
}

export function createNebulaCollisionUniforms(): NebulaCollisionUniforms {
  return {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uGain: { value: 1 },
    uMinAffinity: { value: 0 },
    uFocusGid: { value: -1 },
    uFocusAmt: { value: 0 },
    uTideSpeed: { value: 1 },
    uSubBass: { value: 0 },
    uClashSize: { value: NEBULA_CLASH_LOOK.size },
    uClashAlpha: { value: NEBULA_CLASH_LOOK.alpha },
  };
}

export const NEBULA_COLLISION_VERTEX_SHADER = /* glsl */ `
attribute vec3 color;
attribute vec3 colorB;
attribute vec3 anchor;
attribute vec3 axis;
attribute float size;
attribute float alpha;
attribute float kind;   // 3 shock front · 4 tidal stream · 5 mixed gas
attribute float gid;
attribute float gid2;
attribute float spin;
attribute float seed;
attribute float aAffinity;

uniform float uTime;
uniform float uPixelRatio;
uniform float uGain;
uniform float uMinAffinity;
uniform float uFocusGid;
uniform float uFocusAmt;
uniform float uTideSpeed;
uniform float uSubBass;
uniform float uClashSize;
uniform float uClashAlpha;

varying vec3 vColor;
varying float vAlpha;
varying float vKind;

${NEBULA_COMMON_GLSL.trim()}

void main() {
  vec3 p = position;
  vec3 c = color;
  // fronts and tides carry the collision; mixed gas keeps the reference look
  bool isStructure = kind < 4.5;
  float a = alpha * uGain * (isStructure ? uClashAlpha : 1.0);

  if (sameId(kind, 4.0)) {
    // tidal stream: quadratic Bézier core A (anchor) → control (position) → core B (axis)
    float t = fract(seed + uTime * spin * uTideSpeed);
    float w = 1.0 - t;
    p = w * w * anchor + 2.0 * w * t * position + t * t * axis;
    c = mix(color, colorB, t);
    a *= pow(sin(3.14159 * t), 0.8);
  }

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float d = max(0.001, -mvPosition.z);
  float pointSize = isStructure ? size * uClashSize : size;
  gl_PointSize = clamp(pointSize * uPixelRatio * (${NEBULA_FIELD_SIZE_ATTENUATION.toFixed(2)} / d), 1.0, 34.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;

  a *= 0.85 + 0.15 * sin(uTime * 1.4 + seed * 40.0);
  if (sameId(kind, 3.0)) a *= 1.0 + uSubBass * 0.35; // shock fronts flare with the sub-bass
  a *= smoothstep(210.0, 42.0, d) * smoothstep(1.1, 5.6, d);
  a *= smoothstep(uMinAffinity - 0.02, uMinAffinity, aAffinity);
  // lit when either genre of the pair is focused, dimmed like the field otherwise
  bool lit = uFocusGid < 0.0 || sameId(gid, uFocusGid) || sameId(gid2, uFocusGid);
  a *= lit ? 1.0 : mix(1.0, 0.07, uFocusAmt);

  vColor = c;
  vAlpha = a;
  vKind = kind;
}
`;

export const NEBULA_COLLISION_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vKind;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot(q, q) * 4.0;
  if (r2 > 1.0) discard;
  float profile = abs(vKind - 5.0) < 0.5
    ? exp(-r2 * 2.8) * (1.0 - r2)                  // mixed gas: wide soft puff
    : exp(-r2 * 5.0) * 0.8 + exp(-r2 * 28.0) * 0.6; // front and tides: bright core
  gl_FragColor = vec4(vColor, profile * vAlpha);
}
`;

export function createNebulaCollisionMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: createNebulaCollisionUniforms(),
    vertexShader: NEBULA_COLLISION_VERTEX_SHADER,
    fragmentShader: NEBULA_COLLISION_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => NEBULA_COLLISION_CACHE_KEY;
  return mat;
}
