// Compiles the Nebulosas v3 shaders on a real WebGL driver (Chromium + SwiftShader) and renders
// one frame of the preset-50 gas field. Outside CI: node has no WebGL, so a GLSL typo would
// otherwise only show up when the scene mounts.
// Usage: npx tsx tests/visual/compileShaders.ts [--out test-results/visual/compile-shaders.png]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  createNebulaFieldUniforms,
  NEBULA_FIELD_CACHE_KEY,
  NEBULA_FIELD_FRAGMENT_SHADER,
  NEBULA_FIELD_VERTEX_SHADER,
} from '../../src/components/canvas/nebulaV3/shaders/nebulaFieldShaders';
import { buildNebulaFieldGeometry, NEBULA_FIELD_ATTRIBUTES } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_50 } from '../../src/data/galaxyPresets';

const outArg = process.argv.indexOf('--out');
const outFile = outArg > 0 ? process.argv[outArg + 1] : 'test-results/visual/compile-shaders.png';
const THREE_BUILD = path.resolve('node_modules/three/build');

const { geometry } = buildNebulaFieldGeometry(computeNebulaLayout(GALAXY_PRESET_50), 20000);
const attributes = Object.fromEntries(
  Object.keys(NEBULA_FIELD_ATTRIBUTES).map((name) => [name, Array.from(geometry.getAttribute(name).array as Float32Array)])
);
const uniforms = Object.fromEntries(Object.entries(createNebulaFieldUniforms()).map(([k, u]) => [k, u.value]));
uniforms.uGain = 2.5; // brighter for the preview frame

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
  await page.goto('http://shaders.local/');

  const result = await page.evaluate(
    async ({ vertexShader, fragmentShader, cacheKey, attributes, itemSizes, uniforms }) => {
      const THREE = await import('three');
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
      renderer.debug.checkShaderErrors = true;
      renderer.setClearColor(0x04050a, 1);
      const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader,
        fragmentShader,
        uniforms: Object.fromEntries(Object.entries(uniforms).map(([k, v]) => [k, { value: v }])),
      });
      material.customProgramCacheKey = () => cacheKey;
      const geometry = new THREE.BufferGeometry();
      for (const [name, values] of Object.entries(attributes)) {
        geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(values as number[]), itemSizes[name]));
      }
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      const scene = new THREE.Scene();
      scene.add(points);
      const camera = new THREE.PerspectiveCamera(52, 900 / 600, 0.1, 400);
      camera.position.set(0, 18, 52);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);

      const gl = renderer.getContext();
      const pixels = new Uint8Array(900 * 600 * 4);
      gl.readPixels(0, 0, 900, 600, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 40) lit++;
      const programs = renderer.info.programs ?? [];
      return {
        webgl2: renderer.capabilities.isWebGL2,
        programs: programs.length,
        cacheKeys: programs.map((p: { cacheKey: string }) => p.cacheKey),
        litShare: lit / (900 * 600),
      };
    },
    {
      vertexShader: NEBULA_FIELD_VERTEX_SHADER,
      fragmentShader: NEBULA_FIELD_FRAGMENT_SHADER,
      cacheKey: NEBULA_FIELD_CACHE_KEY,
      attributes,
      itemSizes: NEBULA_FIELD_ATTRIBUTES as Record<string, number>,
      uniforms,
    }
  );

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.locator('#c').screenshot({ path: outFile });
  await browser.close();

  const checks: [boolean, string][] = [
    [consoleErrors.length === 0, `no shader/console errors${consoleErrors.length ? `: ${consoleErrors.join(' | ')}` : ''}`],
    [result.programs === 1, `one program compiled (got ${result.programs})`],
    [result.cacheKeys.some((k: string) => k.includes(NEBULA_FIELD_CACHE_KEY)), `program cache key contains ${NEBULA_FIELD_CACHE_KEY}`],
    [result.litShare > 0.01, `frame renders gas (${(result.litShare * 100).toFixed(1)}% lit pixels)`],
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
