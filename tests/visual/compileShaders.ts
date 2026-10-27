// Compiles the Nebulosas v3 shaders (gas field and collisions) on a real WebGL driver
// (Chromium + SwiftShader) and renders one frame of preset 50. Outside CI: node has no WebGL, so a GLSL typo would
// otherwise only show up when the scene mounts.
// Usage: npx tsx tests/visual/compileShaders.ts [--out test-results/visual/compile-shaders.png]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type * as THREE from 'three';
import {
  createNebulaFieldUniforms,
  NEBULA_FIELD_CACHE_KEY,
  NEBULA_FIELD_FRAGMENT_SHADER,
  NEBULA_FIELD_VERTEX_SHADER,
} from '../../src/components/canvas/nebulaV3/shaders/nebulaFieldShaders';
import {
  createNebulaCollisionUniforms,
  NEBULA_COLLISION_CACHE_KEY,
  NEBULA_COLLISION_FRAGMENT_SHADER,
  NEBULA_COLLISION_VERTEX_SHADER,
} from '../../src/components/canvas/nebulaV3/shaders/nebulaCollisionShaders';
import { buildNebulaFieldGeometry, NEBULA_FIELD_ATTRIBUTES } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import {
  buildNebulaCollisionGeometry,
  NEBULA_COLLISION_ATTRIBUTES,
} from '../../src/components/canvas/nebulaV3/nebulaCollisionGeometry';
import { computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50 } from '../../src/data/galaxyPresets';

const outArg = process.argv.indexOf('--out');
const outFile = outArg > 0 ? process.argv[outArg + 1] : 'test-results/visual/compile-shaders.png';
const THREE_BUILD = path.resolve('node_modules/three/build');

interface ProgramSpec {
  label: string;
  vertexShader: string;
  fragmentShader: string;
  cacheKey: string;
  attributes: Record<string, number[]>;
  itemSizes: Record<string, number>;
  uniforms: Record<string, number>;
}

const layout = computeNebulaLayout(GALAXY_PRESET_50);
const toArrays = (geometry: THREE.BufferGeometry, names: string[]) =>
  Object.fromEntries(names.map((name) => [name, Array.from(geometry.getAttribute(name).array as Float32Array)]));
const uniformValues = (u: Record<string, { value: number }>) =>
  // brighter than default for the preview frame
  ({ ...Object.fromEntries(Object.entries(u).map(([k, v]) => [k, v.value])), uGain: 2.5 });

const programs: ProgramSpec[] = [
  {
    label: 'gas field',
    vertexShader: NEBULA_FIELD_VERTEX_SHADER,
    fragmentShader: NEBULA_FIELD_FRAGMENT_SHADER,
    cacheKey: NEBULA_FIELD_CACHE_KEY,
    attributes: toArrays(buildNebulaFieldGeometry(layout, 20000).geometry, Object.keys(NEBULA_FIELD_ATTRIBUTES)),
    itemSizes: NEBULA_FIELD_ATTRIBUTES as Record<string, number>,
    uniforms: uniformValues(createNebulaFieldUniforms()),
  },
  {
    label: 'collisions',
    vertexShader: NEBULA_COLLISION_VERTEX_SHADER,
    fragmentShader: NEBULA_COLLISION_FRAGMENT_SHADER,
    cacheKey: NEBULA_COLLISION_CACHE_KEY,
    attributes: toArrays(buildNebulaCollisionGeometry(layout, 20000).geometry, Object.keys(NEBULA_COLLISION_ATTRIBUTES)),
    itemSizes: NEBULA_COLLISION_ATTRIBUTES as Record<string, number>,
    uniforms: { ...uniformValues(createNebulaCollisionUniforms()), uTime: 7.3 }, // tides mid-way
  },
];

// tsx emits CommonJS here (no "type": "module"), so no top-level await
async function main(): Promise<boolean> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || /Shader Error|WebGLProgram/i.test(msg.text())) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  // Serve Three's ES build from node_modules on a fake origin
  await page.route('http://shaders.local/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<script type="importmap">{"imports":{"three":"/three/three.module.js"}}</script><canvas id="c" width="900" height="600"></canvas>',
      });
    }
    const file = path.join(THREE_BUILD, url.pathname.replace(/^\/three\//, ''));
    return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(file) });
  });
  // tsx/esbuild wraps named functions in __name(); page.evaluate code runs in the browser without it
  await page.addInitScript(() => {
    (window as unknown as { __name: (f: unknown) => unknown }).__name = (f) => f;
  });
  await page.goto('http://shaders.local/');

  const result = await page.evaluate(async (specs) => {
    const THREE = await import('three');
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    renderer.debug.checkShaderErrors = true;
    renderer.setClearColor(0x04050a, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, 900 / 600, 0.1, 400);
    camera.position.set(0, 18, 52);
    camera.lookAt(0, 0, 0);
    const gl = renderer.getContext();
    const litShare = () => {
      const pixels = new Uint8Array(900 * 600 * 4);
      gl.readPixels(0, 0, 900, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 40) lit++;
      return lit / (900 * 600);
    };

    const objects = specs.map((spec) => {
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: spec.vertexShader,
        fragmentShader: spec.fragmentShader,
        uniforms: Object.fromEntries(Object.entries(spec.uniforms).map(([k, v]) => [k, { value: v }])),
      });
      material.customProgramCacheKey = () => spec.cacheKey;
      const geometry = new THREE.BufferGeometry();
      for (const [name, values] of Object.entries(spec.attributes)) {
        geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(values), spec.itemSizes[name]));
      }
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      scene.add(points);
      return points;
    });

    // each program alone, then everything together for the preview
    const perProgram = objects.map((obj) => {
      objects.forEach((o) => (o.visible = o === obj));
      renderer.render(scene, camera);
      return litShare();
    });
    objects.forEach((o) => (o.visible = true));
    renderer.render(scene, camera);

    const compiled = renderer.info.programs ?? [];
    return {
      webgl2: renderer.capabilities.isWebGL2,
      programs: compiled.length,
      cacheKeys: compiled.map((p: { cacheKey: string }) => p.cacheKey),
      perProgram,
    };
  }, programs);

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.locator('#c').screenshot({ path: outFile });
  await browser.close();

  const checks: [boolean, string][] = [
    [consoleErrors.length === 0, `no shader/console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ')}` : ''}`],
    [result.programs === programs.length, `${programs.length} programs compiled (got ${result.programs})`],
    ...programs.map((spec, i): [boolean, string] => [
      result.cacheKeys.some((k: string) => k.includes(spec.cacheKey)) && result.perProgram[i] > 0.002,
      `${spec.label}: compiled as ${spec.cacheKey} and draws (${(result.perProgram[i] * 100).toFixed(1)}% lit pixels)`,
    ]),
  ];
  for (const [ok, label] of checks) console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
  console.log(`  WebGL2: ${result.webgl2} · preview: ${outFile}`);
  return checks.every(([ok]) => ok);
}

main().then(
  (ok) => process.exit(ok ? 0 : 1),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
