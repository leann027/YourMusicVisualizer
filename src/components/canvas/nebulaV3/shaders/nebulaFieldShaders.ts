import * as THREE from 'three';
import { WORLD_SCALE } from '../../../../lib/layout/nebulaLayout';

/**
 * Nebulosas v3 gas field material (M6.2).
 *
 * Port of the reference VS/FS (docs/reference/nebulosas-v3.html) to Novafy's scale, plus the
 * classic nebula pinprick sparks on gas particles. Every per-frame value (brightness, focus,
 * affinity filter, FFT) is a uniform, so the program compiles once (cache key is constant).
 * Attribute names match nebulaFieldGeometry.ts.
 */

export const NEBULA_FIELD_CACHE_KEY = 'nebula-field-v3';

/** Reference point sizes are `size·260/d` in ~200 u space; Novafy distances are WORLD_SCALE smaller. */
export const NEBULA_FIELD_SIZE_ATTENUATION = 260 * WORLD_SCALE;

export interface NebulaFieldUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uPixelRatio: { value: number };
  uGain: { value: number };
  uMinAffinity: { value: number };
  uFocusGid: { value: number }; // -1 = none
  uFocusAmt: { value: number }; // 0..1
  uArtistAid: { value: number }; // -1 = none
  uArtistAmt: { value: number }; // 0..1
  uPlayingGid: { value: number }; // -1 = nothing playing
  uSubBass: { value: number };
  uHighShimmer: { value: number };
}

export function createNebulaFieldUniforms(): NebulaFieldUniforms {
  return {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uGain: { value: 1 },
    uMinAffinity: { value: 0 },
    uFocusGid: { value: -1 },
    uFocusAmt: { value: 0 },
    uArtistAid: { value: -1 },
    uArtistAmt: { value: 0 },
    uPlayingGid: { value: -1 },
    uSubBass: { value: 0 },
    uHighShimmer: { value: 0 },
  };
}

export const NEBULA_FIELD_VERTEX_SHADER = /* glsl */ `
attribute vec3 color;
attribute vec3 anchor;
attribute vec3 axis;
attribute float size;
attribute float alpha;
attribute float kind;   // 0 dust · 1 gas · 2 ionization front
attribute float gid;
attribute float aid;
attribute float spin;
attribute float seed;
attribute float aAffinity;

uniform float uTime;
uniform float uPixelRatio;
uniform float uGain;
uniform float uMinAffinity;
uniform float uFocusGid;
uniform float uFocusAmt;
uniform float uArtistAid;
uniform float uArtistAmt;
uniform float uPlayingGid;
uniform float uSubBass;
uniform float uHighShimmer;

varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vFlash;

bool sameId(float a, float b) { return abs(a - b) < 0.5; }

// Rodrigues rotation of v around unit axis k
vec3 rotateAround(vec3 v, vec3 k, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
}

// Dims everything outside the focused genre / artist (reference focusMul)
float focusMul() {
  if (uFocusGid < 0.0) return 1.0;
  if (!sameId(gid, uFocusGid)) return mix(1.0, 0.07, uFocusAmt);
  if (uArtistAid >= 0.0) {
    if (aid >= 0.0 && !sameId(aid, uArtistAid)) return mix(1.0, 0.18, uArtistAmt);
    if (aid < 0.0 && sameId(kind, 1.0)) return mix(1.0, 0.45, uArtistAmt);
  }
  return 1.0;
}

void main() {
  // orbit: dust around its artist, gas and front slowly around the nebula core
  vec3 offset = rotateAround(position - anchor, axis, uTime * spin);
  bool isGas = sameId(kind, 1.0);
  if (isGas) {
    // sub-bass breathing, stronger in the genre that is playing
    float breath = uSubBass * 0.06 * (sameId(gid, uPlayingGid) ? 1.6 : 1.0);
    offset *= 1.0 + breath;
  }
  vec3 p = anchor + offset;

  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  float d = max(0.001, -mvPosition.z);
  gl_PointSize = clamp(size * uPixelRatio * (${NEBULA_FIELD_SIZE_ATTENUATION.toFixed(2)} / d), 1.0, 34.0 * uPixelRatio);
  gl_Position = projectionMatrix * mvPosition;

  float a = alpha * uGain;
  a *= 0.85 + 0.15 * sin(uTime * 1.4 + seed * 40.0);
  a *= smoothstep(210.0, 42.0, d) * smoothstep(1.1, 5.6, d);
  a *= smoothstep(uMinAffinity - 0.02, uMinAffinity, aAffinity);
  a *= focusMul();

  // classic nebula pinprick sparks on gas, more frequent with high-frequency shimmer
  float flash = 0.0;
  if (isGas) {
    float clock = uTime * 2.2 + seed * 27.89;
    float cycle = fract(clock);
    float chance = fract(sin(floor(clock) * 78.233 + seed * 137.5) * 43758.5453);
    float threshold = 0.91 - uHighShimmer * 0.06;
    flash = step(threshold, chance) * pow(1.0 - cycle, 4.0) * (1.2 + uHighShimmer * 1.5 + uSubBass * 0.8);
  }

  vColor = color;
  vAlpha = a;
  vKind = kind;
  vFlash = flash * focusMul();
}
`;

export const NEBULA_FIELD_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
varying float vFlash;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r2 = dot(q, q) * 4.0;
  if (r2 > 1.0) discard;

  float profile;
  if (abs(vKind - 1.0) < 0.5) {
    profile = exp(-r2 * 2.8) * (1.0 - r2);                  // gas: wide soft puff
  } else {
    profile = exp(-r2 * 5.0) * 0.8 + exp(-r2 * 28.0) * 0.6; // dust and front: bright core
  }
  vec3 rgb = vColor;
  float a = profile * vAlpha;

  if (vFlash > 0.0) {
    float dist = sqrt(r2) * 0.5;
    float pinprick = exp(-dist * dist * 160.0);
    float crossSpike = max(
      exp(-abs(q.x) * 45.0) * exp(-abs(q.y) * 8.0),
      exp(-abs(q.y) * 45.0) * exp(-abs(q.x) * 8.0)
    );
    float spark = vFlash * (pinprick + crossSpike * 0.35);
    rgb = mix(rgb, vec3(1.0, 0.98, 0.92), clamp(spark, 0.0, 0.85));
    a += spark * 0.65;
  }

  gl_FragColor = vec4(rgb, a);
}
`;

export function createNebulaFieldMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: createNebulaFieldUniforms(),
    vertexShader: NEBULA_FIELD_VERTEX_SHADER,
    fragmentShader: NEBULA_FIELD_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => NEBULA_FIELD_CACHE_KEY;
  return mat;
}
