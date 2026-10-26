import * as THREE from 'three';

export const SOFT_RING_PROGRAM_CACHE_KEY = 'star-soft-ring-v1';
export const STAR_CORE_PROGRAM_CACHE_KEY = 'star-core-limb-v1';

export const softRingCustomProgramCacheKey = (): string => SOFT_RING_PROGRAM_CACHE_KEY;
export const starCoreCustomProgramCacheKey = (): string => STAR_CORE_PROGRAM_CACHE_KEY;

/**
 * Injects silky radial falloff & Cassini divisions into planetary ring materials
 * so dust rings look like authentic celestial disks rather than solid plastic washers.
 */
export function softRingOnBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = `
    varying vec2 vRingUv;
    ${shader.vertexShader}
  `.replace(
    '#include <uv_vertex>',
    `
    #include <uv_vertex>
    vRingUv = uv;
    `
  );
  shader.fragmentShader = `
    varying vec2 vRingUv;
    ${shader.fragmentShader}
  `.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    // Exact radial distance in planar UV space (center at 0.5, 0.5)
    float rDist = length(vRingUv - vec2(0.5));
    float rNorm = clamp((rDist - 0.35) / (0.495 - 0.35), 0.0, 1.0);
    // Smooth bell curve: mathematically 0 at inner AND outer edges (zero sharp plastic cliffs)
    float radialFade = sin(rNorm * 3.14159265);
    // Translucent Cassini division micro-grooves
    float divisions = 0.72 + 0.28 * sin(rNorm * 37.7);
    diffuseColor.a *= (radialFade * radialFade * divisions);
    `
  );
}

/**
 * Injects atmospheric limb darkening (Fresnel thermal gradient) into star cores
 * giving them genuine astronomical depth instead of flat plastic discs.
 */
export function starCoreOnBeforeCompile(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = `
    varying vec3 vLocalNormal;
    varying vec3 vViewDir;
    ${shader.vertexShader}
  `.replace(
    '#include <defaultnormal_vertex>',
    `
    #include <defaultnormal_vertex>
    vLocalNormal = normalize(transformedNormal);
    vViewDir = -mvPosition.xyz;
    `
  );
  shader.fragmentShader = `
    varying vec3 vLocalNormal;
    varying vec3 vViewDir;
    ${shader.fragmentShader}
  `.replace(
    '#include <color_fragment>',
    `
    #include <color_fragment>
    vec3 vDir = normalize(vViewDir);
    float NdotV = clamp(dot(vLocalNormal, vDir), 0.0, 1.0);
    // Stellar limb darkening: incandescent hot core, soft atmospheric edge falloff
    float limb = pow(NdotV, 0.45);
    diffuseColor.rgb = mix(diffuseColor.rgb * 0.70, diffuseColor.rgb * 1.25, limb);
    `
  );
}
