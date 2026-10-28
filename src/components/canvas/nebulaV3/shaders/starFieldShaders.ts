import * as THREE from 'three';
import { STAR_GLOW_FACTOR } from '../starFieldGeometry';
import { NEBULA_COMMON_GLSL } from './nebulaCommon.glsl';

/**
 * Nebulosas v3 luminous stars material (B1): each node is light, not a sphere — a near-white core
 * (whiter and tighter with affinity), a soft halo in the genre colour and a faint diffraction cross
 * on genres and big artists. Positions never move in the shader (brightness-only twinkle).
 * Every per-frame value is a uniform, so the program compiles once (cache key is constant).
 * Attribute names match starFieldGeometry.ts.
 */

export const STAR_FIELD_CACHE_KEY = 'ymv-starfield-v1';

/** Calibrated look; `?starTune=size,brightness` overrides it in development. */
export const STAR_LOOK = { size: 1, brightness: 1 };

/** Point size limits in CSS pixels (× pixel ratio): far stars never vanish, close ones never flood the screen. */
export const STAR_MIN_PX = { genre: 4, artist: 3, song: 2 };
export const STAR_MAX_PX = 240;

/** Halo radius in core radii, close to the camera → far (near stars keep a compact glow). */
export const STAR_NEAR_GLOW = 1.6;
export const STAR_NEAR_FADE = [2, 14] as const; // camera distance (u) over which the full halo grows in

export interface StarFieldUniforms {
  [uniform: string]: THREE.IUniform;
  uTime: { value: number };
  uPixelRatio: { value: number };
  uViewScale: { value: number }; // viewport height / (2·tan(fov/2)), CSS px per unit at distance 1
  uBrightness: { value: number };
  uTwinkle: { value: number }; // 0 with prefers-reduced-motion
  uMinAffinity: { value: number };
  uFocusGid: { value: number };
  uFocusGid2: { value: number };
  uFocusAmt: { value: number };
  uArtistAid: { value: number };
  uArtistAmt: { value: number };
  uSelectedIndex: { value: number }; // -1 = none
  uHoverIndex: { value: number };
  uPlayingIndex: { value: number };
  uSubBass: { value: number };
  uStarSize: { value: number };
  uStarGain: { value: number };
}

export function createStarFieldUniforms(): StarFieldUniforms {
  return {
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uViewScale: { value: 900 },
    uBrightness: { value: 1 },
    uTwinkle: { value: 1 },
    uMinAffinity: { value: 0 },
    uFocusGid: { value: -1 },
    uFocusGid2: { value: -1 },
    uFocusAmt: { value: 0 },
    uArtistAid: { value: -1 },
    uArtistAmt: { value: 0 },
    uSelectedIndex: { value: -1 },
    uHoverIndex: { value: -1 },
    uPlayingIndex: { value: -1 },
    uSubBass: { value: 0 },
    uStarSize: { value: STAR_LOOK.size },
    uStarGain: { value: STAR_LOOK.brightness },
  };
}

const glslFloat = (v: number) => (Number.isInteger(v) ? `${v}.0` : `${v}`);

export const STAR_FIELD_VERTEX_SHADER = /* glsl */ `
attribute vec3 color;
attribute float size;
attribute float heat;
attribute float kind;   // 0 genre · 1 artist · 2 song
attribute float gid;
attribute float aid;
attribute float aAffinity;
attribute float spikes;
attribute float seed;
attribute float nodeIndex;

uniform float uTime;
uniform float uPixelRatio;
uniform float uViewScale;
uniform float uBrightness;
uniform float uTwinkle;
uniform float uMinAffinity;
uniform float uFocusGid;
uniform float uFocusGid2;
uniform float uFocusAmt;
uniform float uArtistAid;
uniform float uArtistAmt;
uniform float uSelectedIndex;
uniform float uHoverIndex;
uniform float uPlayingIndex;
uniform float uSubBass;
uniform float uStarSize;
uniform float uStarGain;

varying vec3 vColor;
varying float vHeat;
varying float vBright;
varying float vCoreFrac;
varying float vHalo;
varying float vSpikes;

${NEBULA_COMMON_GLSL.trim()}

// Stars outside the focused genre / artist stay visible as dim points
float focusMul() {
  if (uFocusGid < 0.0) return 1.0;
  bool inFocus = sameId(gid, uFocusGid) || (uFocusGid2 >= 0.0 && sameId(gid, uFocusGid2));
  if (!inFocus) return mix(1.0, 0.12, uFocusAmt);
  if (uArtistAid >= 0.0 && aid >= 0.0 && !sameId(aid, uArtistAid)) return mix(1.0, 0.35, uArtistAmt);
  return 1.0;
}

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float d = max(0.001, -mvPosition.z);

  bool selected = sameId(nodeIndex, uSelectedIndex);
  bool hovered = sameId(nodeIndex, uHoverIndex);
  bool playing = sameId(nodeIndex, uPlayingIndex);

  // halo shrinks towards the core close to the camera (no glare in artist / song views)
  float near = smoothstep(${glslFloat(STAR_NEAR_FADE[0])}, ${glslFloat(STAR_NEAR_FADE[1])}, d);
  float glow = mix(${glslFloat(STAR_NEAR_GLOW)}, ${glslFloat(STAR_GLOW_FACTOR)}, near);
  float radius = size / ${glslFloat(STAR_GLOW_FACTOR)} * glow * uStarSize;
  if (selected) radius *= 1.3;
  if (playing) radius *= 1.0 + uSubBass * 0.25;

  float projected = 2.0 * radius * uViewScale / d;
  float minPx = sameId(kind, 0.0) ? ${glslFloat(STAR_MIN_PX.genre)} : sameId(kind, 1.0) ? ${glslFloat(STAR_MIN_PX.artist)} : ${glslFloat(STAR_MIN_PX.song)};
  float px = clamp(projected, minPx, ${glslFloat(STAR_MAX_PX)});
  gl_PointSize = px * uPixelRatio;
  gl_Position = projectionMatrix * mvPosition;

  // genre stars are the largest sprites: lower gain keeps their core from blowing out under bloom
  float kindGain = sameId(kind, 0.0) ? 0.6 : sameId(kind, 1.0) ? 0.9 : 0.75;
  float twinkleAmp = sameId(kind, 2.0) ? 0.2 : 0.12;
  float twinkle = 1.0 + uTwinkle * twinkleAmp * sin(uTime * (1.1 + seed * 1.7) + seed * 60.0);
  float b = uBrightness * uStarGain * kindGain * (0.55 + 0.45 * heat) * twinkle;
  b *= clamp(projected / px, 0.35, 1.0);                       // stars held at the minimum size get fainter
  b *= smoothstep(uMinAffinity - 0.02, uMinAffinity, aAffinity);
  b *= focusMul();
  if (selected) b *= 1.5;
  else if (hovered) b *= 1.3;
  if (playing) b *= 1.0 + uSubBass * 0.8;

  vColor = color;
  vHeat = heat;
  vBright = b;
  vCoreFrac = 1.0 / glow;
  vHalo = mix(0.35, 1.0, near);
  vSpikes = spikes * near;
}
`;

export const STAR_FIELD_FRAGMENT_SHADER = /* glsl */ `
varying vec3 vColor;
varying float vHeat;
varying float vBright;
varying float vCoreFrac;
varying float vHalo;
varying float vSpikes;

void main() {
  vec2 q = gl_PointCoord - 0.5;
  float r = length(q) * 2.0;           // 0 centre · 1 sprite edge
  if (r > 1.0 || vBright <= 0.001) discard;

  float rc = r / vCoreFrac;            // distance in core radii
  float core = exp(-rc * rc * mix(2.4, 1.4, vHeat));
  float halo = (exp(-r * r * 7.0) * 0.55 + exp(-r * 3.2) * 0.25) * (1.0 - r) * vHalo;
  float spike = vSpikes * (1.0 - r) * (
    exp(-abs(q.x) * 70.0) * exp(-abs(q.y) * 4.0) +
    exp(-abs(q.y) * 70.0) * exp(-abs(q.x) * 4.0)
  ) * 0.5;

  vec3 coreColor = mix(vColor, vec3(1.0, 0.98, 0.95), 0.5 + 0.45 * vHeat);
  vec3 rgb = coreColor * core * 1.2 + vColor * halo + mix(vColor, vec3(1.0), 0.5) * spike;
  gl_FragColor = vec4(rgb * vBright, 1.0);
}
`;

export function createStarFieldMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: createStarFieldUniforms(),
    vertexShader: STAR_FIELD_VERTEX_SHADER,
    fragmentShader: STAR_FIELD_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => STAR_FIELD_CACHE_KEY;
  return mat;
}
