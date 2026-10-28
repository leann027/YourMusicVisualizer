import * as THREE from 'three';

export interface NebulaMaterialOptions {
  isInner: boolean;
  genreId: string;
  baseColor?: string;
}

/**
 * Creates custom PointsMaterial for sector nebulae with GLSL onBeforeCompile injection.
 * Features:
 * - Sharp exponential pinprick core `exp(-dist * dist * 160.0)` with localized cross spike
 * - Zero vertex size inflation during flashes (eliminating flat disc stamps)
 * - Proximity fade smoothly calibrated to `smoothstep(3.5, 12.0, vCamDist)`
 * - Rich volumetric base brightness in the calibrated 0.12 - 0.24 range
 */
export function createNebulaMaterial(
  optionsOrIsInner: NebulaMaterialOptions | boolean,
  genreIdParam?: string,
  baseColorParam?: string
): THREE.PointsMaterial {
  const options: NebulaMaterialOptions =
    typeof optionsOrIsInner === 'boolean'
      ? { isInner: optionsOrIsInner, genreId: genreIdParam || 'default', baseColor: baseColorParam }
      : optionsOrIsInner;

  const { isInner, genreId } = options;

  const mat = new THREE.PointsMaterial({
    size: isInner ? 2.2 : 3.2,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  mat.customProgramCacheKey = () => `nebula-cluster-${isInner ? 'inner' : 'outer'}-v8-${genreId}`;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBrightness = { value: isInner ? 0.16 : 0.12 };
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uHighShimmer = { value: 0 };
    shader.uniforms.uSubBass = { value: 0 };

    shader.vertexShader = `
      attribute float pointScale;
      attribute float aPhase;
      varying vec3 vNebulaColor;
      varying float vCamDist;
      varying float vFlash;
      uniform float uTime;
      uniform float uHighShimmer;
      uniform float uSubBass;
      ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <color_vertex>',
      `
      #include <color_vertex>
      vNebulaColor = color;
      `
    );

    // Stochastic Protostellar Micro-Flashes with un-inflated point size for microscopic pinpricks
    shader.vertexShader = shader.vertexShader.replace(
      'gl_PointSize = size;',
      `
      vCamDist = -mvPosition.z;
      float flashClock = uTime * 2.2 + aPhase * 27.89;
      float flashCycle = fract(flashClock);
      float flashId = floor(flashClock);
      float flashChance = fract(sin(flashId * 78.233 + aPhase * 137.5) * 43758.5453);
      float isFlash = step(0.91, flashChance);
      float flashIntensity = isFlash * pow(1.0 - flashCycle, 4.0) * (1.2 + uHighShimmer * 1.5 + uSubBass * 0.8);
      vFlash = flashIntensity;

      // Delicate pinprick sparks: DO NOT inflate point size during flashes (eliminates circular stamp discs)
      float pSize = size * pointScale * (65.0 / max(9.0, -mvPosition.z));
      gl_PointSize = clamp(pSize, 1.0, ${isInner ? '18.0' : '22.0'});
      `
    );

    shader.fragmentShader = `
      uniform float uBrightness;
      varying vec3 vNebulaColor;
      varying float vCamDist;
      varying float vFlash;
      ${shader.fragmentShader}
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_particle_fragment>',
      `
      #include <map_particle_fragment>
      vec2 ptCoord = gl_PointCoord - vec2(0.5);
      float dist = length(ptCoord);
      if (dist > 0.5) discard;

      // 2D fractal smoke turbulence: breaks round stamps into organic cosmic tendrils & filaments
      ${
        isInner
          ? 'float noiseVal = sin(ptCoord.x * 14.0 + vNebulaColor.r * 6.28) * cos(ptCoord.y * 14.0 + vNebulaColor.g * 6.28);'
          : 'float noiseVal = sin(ptCoord.x * 12.0 + vNebulaColor.b * 6.28) * cos(ptCoord.y * 12.0 + vNebulaColor.r * 6.28);'
      }
      float organicDist = dist + noiseVal * ${isInner ? '0.07' : '0.08'};
      float edgeFade = smoothstep(0.48, ${isInner ? '0.05' : '0.06'}, organicDist);
      float coreGlow = exp(-organicDist * organicDist * ${isInner ? '6.5' : '5.8'});
      float falloff = edgeFade * coreGlow;

      // Proximity anti-glare: smoothly fade out particles as camera approaches within 12 units down to 3.5 units
      float proximityFade = smoothstep(3.5, 12.0, vCamDist);

      // Delicate pinprick protostellar spark: sharp exponential core and localized cross spike
      // Confines the optical flash to microscopic center (dist < 0.08) without flat circular disc
      float sparkPinprick = exp(-dist * dist * 160.0);
      float crossSpike = max(
        exp(-abs(ptCoord.x) * 45.0) * exp(-abs(ptCoord.y) * 8.0),
        exp(-abs(ptCoord.y) * 45.0) * exp(-abs(ptCoord.x) * 8.0)
      );
      float sparkProfile = sparkPinprick + crossSpike * 0.35;
      float sparkAlpha = vFlash * sparkProfile * proximityFade;

      vec3 sparkColor = mix(vNebulaColor, vec3(1.0, 0.98, 0.92), 0.85);

      // Combine volumetric gas color and spark emission
      vec3 gasRgb = vNebulaColor * (${isInner ? '0.65 + 0.35 * coreGlow' : '0.60 + 0.30 * coreGlow'});
      vec3 sparkRgb = sparkColor * (vFlash * sparkProfile * 1.6);
      diffuseColor.rgb = gasRgb + sparkRgb;

      // Volumetric alpha modulated by falloff, base brightness, and proximity fade; spark adds localized alpha without flat stamp disc
      diffuseColor.a = (diffuseColor.a * falloff * uBrightness * proximityFade) + (sparkAlpha * 0.65);
      `
    );

    mat.userData.shader = shader;
  };

  return mat;
}
