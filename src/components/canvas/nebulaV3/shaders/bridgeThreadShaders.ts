import * as THREE from 'three';
import { NEBULA_COMMON_GLSL } from './nebulaCommon.glsl';

/**
 * Bridge threads material (M7.2): artist → bridge song → other genre's core, in the pair's mixed
 * colour, with a pulse travelling along each thread (computed per fragment, no buffer updates).
 */

export const BRIDGE_THREAD_CACHE_KEY = 'nebula-bridges-v3';

export interface BridgeThreadUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uGain: { value: number };
  uShowAll: { value: number }; // 1 when constellation links are on (eased)
  uFocusGid: { value: number }; // -1 = none
  uFocusAmt: { value: number }; // threads touching the focused genre fade in with it
}

export function createBridgeThreadUniforms(): BridgeThreadUniforms {
  return {
    uTime: { value: 0 },
    uGain: { value: 1 },
    uShowAll: { value: 0 },
    uFocusGid: { value: -1 },
    uFocusAmt: { value: 0 },
  };
}

export const BRIDGE_THREAD_VERTEX_SHADER = /* glsl */ `
attribute vec3 color;
attribute float gid;
attribute float gid2;
attribute float tAlong; // 0 at the start of the thread, 1 at its end
attribute float seed;

uniform float uGain;
uniform float uShowAll;
uniform float uFocusGid;
uniform float uFocusAmt;

varying vec3 vColor;
varying float vAlpha;
varying float vT;
varying float vSeed;

${NEBULA_COMMON_GLSL.trim()}

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  bool touchesFocus = uFocusGid >= 0.0 && (sameId(gid, uFocusGid) || sameId(gid2, uFocusGid));
  float visibility = max(uShowAll, touchesFocus ? uFocusAmt : 0.0);
  vColor = color;
  vAlpha = 0.55 * uGain * visibility;
  vT = tAlong;
  vSeed = seed;
}
`;

export const BRIDGE_THREAD_FRAGMENT_SHADER = /* glsl */ `
uniform float uTime;

varying vec3 vColor;
varying float vAlpha;
varying float vT;
varying float vSeed;

void main() {
  if (vAlpha < 0.002) discard;
  // a soft pulse travelling from the start of the thread to its end
  float phase = fract(vT - uTime * 0.35 + vSeed);
  float pulse = exp(-pow((phase - 0.5) * 6.0, 2.0));
  gl_FragColor = vec4(vColor, vAlpha * (0.35 + 0.65 * pulse));
}
`;

export function createBridgeThreadMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: createBridgeThreadUniforms(),
    vertexShader: BRIDGE_THREAD_VERTEX_SHADER,
    fragmentShader: BRIDGE_THREAD_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => BRIDGE_THREAD_CACHE_KEY;
  return mat;
}
