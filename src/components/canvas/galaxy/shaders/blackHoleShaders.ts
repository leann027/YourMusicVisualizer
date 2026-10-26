import * as THREE from 'three';

export interface BlackHoleUniforms {
  uTime: { value: number };
  uSubBass: { value: number };
  uEnergy: { value: number };
}

// Procedural GLSL shaders for the Gargantua Relativistic Accretion Disk (Zero Plastic Meshes)
export const ACCRETION_DISK_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPos.xyz;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const ACCRETION_DISK_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSubBass;
  uniform float uEnergy;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 coord = vUv - vec2(0.5);
    float r = length(coord) * 2.0; // 0.0 at center, 1.0 at outer edge
    if (r < 0.28 || r > 0.98) discard;

    float theta = atan(coord.y, coord.x);

    // Relativistic Keplerian spiral plasma flow: inner flows faster
    float flowSpeed = uTime * (1.8 + uEnergy * 0.9);
    float spiral = theta + 3.2 / max(0.12, r) - flowSpeed;

    // Multi-octave fractal plasma turbulence
    float n1 = vnoise(vec2(spiral * 2.0, r * 12.0));
    float n2 = vnoise(vec2(spiral * 4.0, r * 24.0 + flowSpeed * 0.4));
    float plasma = n1 * 0.65 + n2 * 0.35;

    // Radial ISCO (Innermost Stable Circular Orbit) sharp cut and smooth outer edge
    float innerCut = smoothstep(0.28, 0.38, r);
    float outerFade = smoothstep(0.98, 0.55, r);
    float radialEnvelope = innerCut * outerFade;

    // Relativistic Doppler Beaming: approaching side (theta > 0) is hotter and significantly brighter
    float doppler = 1.0 + 0.48 * sin(theta + 0.35);

    // Chromatic temperature gradient: ultra-hot incandescent gold near ISCO -> warm solar amber -> cosmic magenta
    vec3 colCore = vec3(1.0, 0.96, 0.82);
    vec3 colMid = vec3(0.96, 0.60, 0.08);
    vec3 colOuter = vec3(1.0, 0.16, 0.52);

    float tGrad = smoothstep(0.30, 0.85, r);
    vec3 color = mix(mix(colCore, colMid, tGrad), colOuter, pow(tGrad, 2.0));

    float alpha = radialEnvelope * (0.35 + 0.65 * plasma) * doppler * (0.65 + uSubBass * 0.35);
    gl_FragColor = vec4(color * (1.05 + uSubBass * 0.25), clamp(alpha, 0.0, 0.85));
  }
`;

export const LENSING_ARCH_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uSubBass;
  uniform float uEnergy;
  varying vec2 vUv;
  varying vec3 vViewPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 coord = vUv - vec2(0.5);
    // Vertical arch coordinates: light deflected around singularity
    float r = length(coord) * 2.0;
    if (r < 0.32 || r > 0.85) discard;

    float theta = atan(coord.y, coord.x);
    // Curved gravitational deflection arch
    float archFade = pow(abs(sin(theta)), 1.2);

    float flowSpeed = uTime * (1.4 + uEnergy * 0.7);
    float n = vnoise(vec2(theta * 3.0, r * 16.0 - flowSpeed));

    float innerCut = smoothstep(0.32, 0.42, r);
    float outerFade = smoothstep(0.85, 0.50, r);
    float radialEnvelope = innerCut * outerFade;

    vec3 color = mix(vec3(0.96, 0.55, 0.08), vec3(1.0, 0.16, 0.52), r);
    float alpha = radialEnvelope * archFade * (0.30 + 0.70 * n) * (0.45 + uSubBass * 0.3);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.65));
  }
`;

export const ACCRETION_DISK_CACHE_KEY = 'gargantua-accretion-disk-v1';
export const LENSING_ARCH_CACHE_KEY = 'gargantua-lensing-arch-v1';

export function createAccretionDiskMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSubBass: { value: 0 },
      uEnergy: { value: 0 },
    },
    vertexShader: ACCRETION_DISK_VERTEX_SHADER,
    fragmentShader: ACCRETION_DISK_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => ACCRETION_DISK_CACHE_KEY;
  return mat;
}

export function createLensingArchMaterial(): THREE.ShaderMaterial {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSubBass: { value: 0 },
      uEnergy: { value: 0 },
    },
    vertexShader: ACCRETION_DISK_VERTEX_SHADER,
    fragmentShader: LENSING_ARCH_FRAGMENT_SHADER,
  });
  mat.customProgramCacheKey = () => LENSING_ARCH_CACHE_KEY;
  return mat;
}
