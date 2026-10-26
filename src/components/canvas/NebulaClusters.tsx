'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GenreNode, getSectorEvolutionTier } from '../../types/music';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { webAudioEngine } from '../../lib/audio/WebAudioEngine';

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function createPRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface SectorNebulaClusterProps {
  genre: GenreNode;
}

const SectorNebulaCluster: React.FC<SectorNebulaClusterProps> = ({ genre }) => {
  const groupRef = useRef<THREE.Group>(null);
  const innerPointsRef = useRef<THREE.Points>(null);
  const outerPointsRef = useRef<THREE.Points>(null);

  const stellarBrightness = useGalaxyStore((s) => s.stellarBrightness);
  const minAffinityFilter = useGalaxyStore((s) => s.minAffinityFilter);
  const playingTrackId = useGalaxyStore((s) => s.playingTrackId);
  const data = useGalaxyStore((s) => s.data);

  const isFilteredOut = genre.affinity < minAffinityFilter;

  const isPlayingThisGenre = useMemo(() => {
    if (!playingTrackId) return false;
    const playingSong = data.songs.find((s) => s.id === playingTrackId);
    return playingSong ? playingSong.genreId === genre.id : false;
  }, [playingTrackId, data.songs, genre.id]);

  // Direct songCount-based nebula density scaling:
  // Genres with many songs produce vast, dense, majestic cosmic nebulae!
  const songCount = genre.songCount || 1;
  const densityFactor = Math.min(1.0, Math.max(0.12, (songCount - 1) / 20.0));

  const sectorTier = useMemo(
    () => getSectorEvolutionTier(genre.songCount, genre.affinity),
    [genre.songCount, genre.affinity]
  );
  const isSupercluster = sectorTier === 'supercluster';

  const seed = useMemo(() => hashStr(genre.id), [genre.id]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // 1. Organic multi-spectral ionized gas core (density & particle count scale with songCount)
  const innerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 101);
    // Scales from ~85 particles for small sectors up to 300+ particles for dominant genres
    const count = Math.round(85 + densityFactor * 225);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const scales = new Float32Array(count);

    const baseColor = new THREE.Color(genre.color);
    const coreTint = new THREE.Color(genre.color).lerp(new THREE.Color('#FFFFFF'), 0.20);
    const maxR = 3.6 + densityFactor * 4.6;

    for (let i = 0; i < count; i++) {
      // 3-lobed logarithmic spiral tendrils with Strömgren central cavity (leaves star core crystal clear)
      const arm = (i % 3) * ((Math.PI * 2) / 3);
      const rRatio = Math.pow(prng(), 1.25);
      const r = 3.2 + rRatio * maxR;

      const angle = arm + Math.log(r + 1.2) * 1.4 + (prng() - 0.5) * 0.75;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (prng() - 0.5) * 2.2 * Math.exp(-r * 0.35);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Chromatic ionization gradient: gentle core shimmer lerping to sector hue
      const normR = Math.min(1.0, (r - 3.2) / maxR);
      const c = new THREE.Color().copy(coreTint).lerp(baseColor, normR);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      phases[i] = prng() * 6.28318;
      // Micro & macro volumetric gas billow scales
      scales[i] = 0.8 + (1.0 - normR * 0.3) * 1.2 + prng() * 0.6;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));
    return geom;
  }, [seed, densityFactor, genre.color]);

  // 2. Interstellar dust filament veil & streamers (reaches out broader with more songs)
  const outerGeometry = useMemo(() => {
    const prng = createPRNG(seed + 202);
    // Scales from ~110 particles up to 420+ particles for rich, expansive sectors
    const count = Math.round(110 + densityFactor * 320);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const scales = new Float32Array(count);

    const baseColor = new THREE.Color(genre.color);
    const deepCosmicVeil = new THREE.Color('#1E1B4B').lerp(new THREE.Color('#312E81'), 0.5);

    // Orient outer filaments along the sector's galactic position angle
    const galAngle = Math.atan2(genre.position[2] || 0.01, genre.position[0] || 0.01);
    const maxR = 7.5 + densityFactor * 9.5;

    for (let i = 0; i < count; i++) {
      const rRatio = Math.pow(prng(), 1.25);
      const r = 4.8 + rRatio * maxR;

      // Asymmetric dust streamers flowing with galactic curvature
      const theta = galAngle + (prng() - 0.5) * 1.4 + Math.sin(r * 0.35) * 0.5;
      const x = Math.cos(theta) * r * 1.12;
      const z = Math.sin(theta) * r * 0.88;
      const y = (prng() - 0.5) * 3.4 * Math.max(0.15, 1.0 - r / 16.0);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Deep celestial chromatic shift toward cosmic background
      const normR = Math.min(1.0, (r - 4.8) / maxR);
      const c = new THREE.Color().copy(baseColor).lerp(deepCosmicVeil, normR * 0.7);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      phases[i] = prng() * 6.28318;
      scales[i] = 1.0 + normR * 1.5 + prng() * 0.8;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geom.setAttribute('pointScale', new THREE.BufferAttribute(scales, 1));
    return geom;
  }, [seed, densityFactor, genre.color, genre.position]);

  // 3. Materials with GPU-level smoothstep-gaussian falloff & proximity-safe attenuation
  const innerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-inner-v7-${genre.id}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBrightness = { value: 0.035 };
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

      // Proximity-safe attenuation & Stochastic Protostellar Micro-Flashes
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

        float pSize = size * pointScale * (1.0 + flashIntensity * 0.35) * (65.0 / max(9.0, -mvPosition.z));
        gl_PointSize = clamp(pSize, 1.0, 18.0);
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
        float noiseVal = sin(ptCoord.x * 14.0 + vNebulaColor.r * 6.28) * cos(ptCoord.y * 14.0 + vNebulaColor.g * 6.28);
        float organicDist = dist + noiseVal * 0.07;
        float edgeFade = smoothstep(0.48, 0.05, organicDist);
        float coreGlow = exp(-organicDist * organicDist * 6.5);
        float falloff = edgeFade * coreGlow;
        // Proximity anti-glare: smoothly fade out particles as camera approaches within 28 units (zero glare on star inspection)
        float proximityFade = smoothstep(8.0, 28.0, vCamDist);
        vec3 sparkColor = mix(vNebulaColor, vec3(1.0, 0.98, 0.92), 0.80);
        diffuseColor.rgb = vNebulaColor * (0.65 + 0.35 * coreGlow) + sparkColor * (vFlash * 0.90);
        diffuseColor.a *= falloff * uBrightness * proximityFade;
        diffuseColor.a = max(diffuseColor.a, vFlash * 0.40 * proximityFade);
        `
      );

      mat.userData.shader = shader;
    };

    return mat;
  }, [genre.id]);

  const outerMaterial = useMemo(() => {
    const mat = new THREE.PointsMaterial({
      size: 3.2,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    mat.customProgramCacheKey = () => `nebula-cluster-outer-v7-${genre.id}`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uBrightness = { value: 0.025 };
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

      // Proximity-safe attenuation & Stochastic Protostellar Micro-Flashes
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

        float pSize = size * pointScale * (1.0 + flashIntensity * 0.35) * (65.0 / max(9.0, -mvPosition.z));
        gl_PointSize = clamp(pSize, 1.0, 22.0);
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
        float noiseVal = sin(ptCoord.x * 12.0 + vNebulaColor.b * 6.28) * cos(ptCoord.y * 12.0 + vNebulaColor.r * 6.28);
        float organicDist = dist + noiseVal * 0.08;
        float edgeFade = smoothstep(0.48, 0.06, organicDist);
        float coreGlow = exp(-organicDist * organicDist * 5.8);
        float falloff = edgeFade * coreGlow;
        // Proximity anti-glare: smoothly fade out particles as camera approaches within 32 units (zero glare on star inspection)
        float proximityFade = smoothstep(9.0, 32.0, vCamDist);
        vec3 sparkColor = mix(vNebulaColor, vec3(1.0, 0.98, 0.92), 0.80);
        diffuseColor.rgb = vNebulaColor * (0.60 + 0.30 * coreGlow) + sparkColor * (vFlash * 0.85);
        diffuseColor.a *= falloff * uBrightness * proximityFade;
        diffuseColor.a = max(diffuseColor.a, vFlash * 0.35 * proximityFade);
        `
      );

      mat.userData.shader = shader;
    };

    return mat;
  }, [genre.id]);

  // Clean up WebGL resources when component unmounts
  useEffect(() => {
    return () => {
      innerGeometry.dispose();
      outerGeometry.dispose();
      innerMaterial.dispose();
      outerMaterial.dispose();
    };
  }, [innerGeometry, outerGeometry, innerMaterial, outerMaterial]);

  // 4. Per-frame slow harmonic rotation, audio-reactive respiration, and steady brightness modulation
  useFrame((state, delta) => {
    if (isFilteredOut) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (groupRef.current) groupRef.current.visible = true;

    const t = state.clock.getElapsedTime();
    const fft = webAudioEngine.sampleFFT();

    // The user requested: "mas q movimiento de las nebulazas preferiria pequeños flasheas aleatorios en estas"
    // Keep local cluster transform stable (no erratic wobble or spinning) while allowing global galactic drift.
    if (groupRef.current) {
      groupRef.current.position.set(genre.position[0], genre.position[1], genre.position[2]);
    }

    // Rich, luminous nebula presence with subtle harmonic fluorescence in the active genre
    const activeBoost = isPlayingThisGenre && fft.isPlaying
      ? (fft.highShimmer * 0.035 + fft.subBass * 0.025)
      : 0;

    const targetInnerBrightness = THREE.MathUtils.clamp(
      0.025 + 0.045 * stellarBrightness + activeBoost * 0.4,
      0.015,
      0.070
    );

    const targetOuterBrightness = THREE.MathUtils.clamp(
      0.018 + 0.035 * stellarBrightness + activeBoost * 0.3,
      0.010,
      0.055
    );

    const innerMat = innerPointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (innerMat?.userData?.shader) {
      innerMat.userData.shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      innerMat.userData.shader.uniforms.uHighShimmer.value = fft.isPlaying ? fft.highShimmer : 0;
      innerMat.userData.shader.uniforms.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
      innerMat.userData.shader.uniforms.uBrightness.value = THREE.MathUtils.lerp(
        innerMat.userData.shader.uniforms.uBrightness.value,
        targetInnerBrightness,
        Math.min(1, delta * 3.0)
      );
    }

    const outerMat = outerPointsRef.current?.material as THREE.PointsMaterial | undefined;
    if (outerMat?.userData?.shader) {
      outerMat.userData.shader.uniforms.uTime.value = !prefersReducedMotion ? t : 0;
      outerMat.userData.shader.uniforms.uHighShimmer.value = fft.isPlaying ? fft.highShimmer : 0;
      outerMat.userData.shader.uniforms.uSubBass.value = fft.isPlaying ? fft.subBass : 0;
      outerMat.userData.shader.uniforms.uBrightness.value = THREE.MathUtils.lerp(
        outerMat.userData.shader.uniforms.uBrightness.value,
        targetOuterBrightness,
        Math.min(1, delta * 3.0)
      );
    }

    // Subtle cluster expansion breathing with sub-bass
    if (groupRef.current) {
      const breathing = !prefersReducedMotion ? Math.sin(t * 0.40 + seed) * 0.008 : 0;
      const tierBaseScale = isSupercluster ? 1.15 : 1.0;
      const targetScale =
        tierBaseScale *
        (1.0 + (fft.isPlaying ? fft.subBass * 0.03 : breathing));
      groupRef.current.scale.setScalar(
        THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, Math.min(1, delta * 4))
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={genre.position}
      name={`nebula-cluster-${genre.id}`}
    >
      {/* Inner Dense Ionized Gas Nebular Core (Zero circular rim, 100% volumetric falloff) */}
      <points
        ref={innerPointsRef}
        geometry={innerGeometry}
        material={innerMaterial}
      />

      {/* Outer Interstellar Dust Veil & Streamers */}
      <points
        ref={outerPointsRef}
        geometry={outerGeometry}
        material={outerMaterial}
      />
    </group>
  );
};

/**
 * Milky Way-style cosmic dust and interstellar nebular gas clusters (`NebulaClusters`).
 *
 * Renders radiant, organic gas clouds around genre sector centers (`data.genres`).
 * Density and particle count scale directly with genre song count.
 * Modulates opacity gently with `stellarBrightness` and breathes synchronously
 * with real-time Web Audio sub-bass frequencies. Zero geometric sphere silhouettes.
 */
export const NebulaClusters: React.FC = () => {
  const genres = useGalaxyStore((s) => s.data.genres);

  if (!genres || genres.length === 0) return null;

  return (
    <group name="galactic-nebula-clusters">
      {genres.map((genre) => (
        <SectorNebulaCluster key={genre.id} genre={genre} />
      ))}
    </group>
  );
};
