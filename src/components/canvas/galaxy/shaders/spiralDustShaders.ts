import * as THREE from 'three';

export interface SpiralDustUniforms {
  uTime: { value: number };
  uBrightness: { value: number };
  uSubBass: { value: number };
  uMidHarmonic: { value: number };
  uHighShimmer: { value: number };
  uEnergy: { value: number };
}

export const SPIRAL_DUST_CACHE_KEY = 'central-cosmic-galaxy-spiral-v6';

/**
 * Injects custom vertex flow dynamics and fragment Hermite falloff
 * into the 4-arm spiral stardust PointsMaterial.
 */
export function spiralDustOnBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uBrightness = { value: 0.12 };
  shader.uniforms.uSubBass = { value: 0 };
  shader.uniforms.uMidHarmonic = { value: 0 };
  shader.uniforms.uHighShimmer = { value: 0 };
  shader.uniforms.uEnergy = { value: 0 };

  shader.vertexShader = `
    attribute float aRadius;
    attribute float aAngle;
    attribute float aSpeed;
    attribute float aPhase;
    attribute float aArm;
    attribute float pointScale;
    varying vec3 vDustColor;
    varying float vPhase;
    varying float vCamDist;
    uniform float uTime;
    uniform float uSubBass;
    uniform float uMidHarmonic;
    uniform float uHighShimmer;
    uniform float uEnergy;
    ${shader.vertexShader}
  `;

  shader.vertexShader = shader.vertexShader.replace(
    '#include <color_vertex>',
    `
    #include <color_vertex>
    vDustColor = color;
    vPhase = aPhase;
    `
  );

  // Continuous fluid dynamic flow in vertex shader: differential rotation, volumetric billows, and FFT tidal waves
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    // 1. Keplerian differential rotation with energetic torque
    float rotTime = uTime * (1.0 + uEnergy * 0.45);
    float curAngle = aAngle + rotTime * aSpeed;

    // 2. Multi-band FFT acoustic dynamics
    float shock = sin(aRadius * 0.72 - uTime * 4.2 + aPhase) * (uSubBass * 1.45) * exp(-aRadius * 0.04);
    float armBreath = sin(uTime * 0.65 + aRadius * 0.32 + aArm * 1.57) * (uMidHarmonic * 1.15);
    float baseWaveY = sin(uTime * 0.45 + aRadius * 0.28 + aPhase) * 0.95 * exp(-aRadius * 0.035);
    float waveY = baseWaveY + shock * 0.75 + sin(curAngle * 2.0 + uTime * 0.8) * (uMidHarmonic * 0.65);
    float dynamicR = aRadius + armBreath + cos(uTime * 0.35 + aAngle * 2.0 + aPhase) * 0.65;

    vec3 transformed = vec3(
      cos(curAngle) * dynamicR,
      position.y + waveY,
      sin(curAngle) * dynamicR * 0.92
    );
    `
  );

  shader.vertexShader = shader.vertexShader.replace(
    'gl_PointSize = size;',
    `
    vCamDist = -mvPosition.z;
    float twinkle = 1.0 + (uHighShimmer * 0.65) * sin(uTime * 9.0 + aPhase * 4.0);
    float pSize = size * pointScale * twinkle * (72.0 / max(8.0, -mvPosition.z));
    gl_PointSize = clamp(pSize, 1.0, 16.0);
    `
  );

  shader.fragmentShader = `
    uniform float uTime;
    uniform float uBrightness;
    uniform float uHighShimmer;
    varying vec3 vDustColor;
    varying float vPhase;
    varying float vCamDist;
    ${shader.fragmentShader}
  `;

  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <map_particle_fragment>',
    `
    #include <map_particle_fragment>
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    // Asymptotic zero-slope Hermite falloff: strictly zero visible boundary
    float edgeFade = smoothstep(0.5, 0.05, dist);
    float coreGlow = exp(-dist * dist * 5.8);
    float falloff = edgeFade * coreGlow;
    float shimmer = 0.86 + 0.14 * sin(uTime * 0.95 + vPhase);
    // Proximity anti-glare: smoothly fade out background galaxy as camera approaches inspected star within 26 units
    float proximityFade = smoothstep(8.0, 26.0, vCamDist);
    diffuseColor.rgb = vDustColor * (0.75 + 0.25 * coreGlow);
    diffuseColor.a *= falloff * uBrightness * shimmer * proximityFade;
    `
  );
}

export function createSpiralDustMaterial(): THREE.PointsMaterial {
  const mat = new THREE.PointsMaterial({
    size: 1.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  mat.customProgramCacheKey = () => SPIRAL_DUST_CACHE_KEY;
  mat.onBeforeCompile = (shader) => {
    spiralDustOnBeforeCompile(shader);
    mat.userData.shader = shader;
  };

  return mat;
}
