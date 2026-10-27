// Shared harness for the Nebulosas v3 shader scripts: opens a Chromium page (WebGL2 via
// SwiftShader) with Three's ES build from node_modules, and renders raw ShaderMaterial programs
// built from the real geometry. Used by compileShaders.ts and calibrateClash.ts.
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import type * as THREE from 'three';

export interface ProgramSpec {
  label: string;
  vertexShader: string;
  fragmentShader: string;
  cacheKey: string;
  attributes: Record<string, number[]>;
  itemSizes: Record<string, number>;
  uniforms: Record<string, number>;
}

export interface CameraSpec {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export interface RenderResult {
  webgl2: boolean;
  programs: number;
  cacheKeys: string[];
  litShare: number; // share of pixels brighter than the background
}

const THREE_BUILD = path.resolve('node_modules/three/build');

export function geometryArrays(geometry: THREE.BufferGeometry, names: string[]): Record<string, number[]> {
  return Object.fromEntries(names.map((name) => [name, Array.from(geometry.getAttribute(name).array as Float32Array)]));
}

export async function openShaderPage(width: number, height: number): Promise<{ browser: Browser; page: Page; errors: string[] }> {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || /Shader Error|WebGLProgram/i.test(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.route('http://shaders.local/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') {
      return route.fulfill({
        contentType: 'text/html',
        body: `<script type="importmap">{"imports":{"three":"/three/three.module.js"}}</script><canvas id="c" width="${width}" height="${height}"></canvas>`,
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
  return { browser, page, errors };
}

/** Renders `specs` (only those listed in `visible`, default all) with a fresh renderer and camera. */
export async function renderPrograms(
  page: Page,
  specs: ProgramSpec[],
  camera: CameraSpec,
  visible: string[] = specs.map((s) => s.label)
): Promise<RenderResult> {
  return page.evaluate(
    async ({ specs, camera, visible }) => {
      const THREE = await import('three');
      const canvas = document.getElementById('c') as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
      renderer.debug.checkShaderErrors = true;
      renderer.setClearColor(0x04050a, 1);
      const scene = new THREE.Scene();
      for (const spec of specs) {
        if (!visible.includes(spec.label)) continue;
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
      }
      const cam = new THREE.PerspectiveCamera(camera.fov ?? 52, canvas.width / canvas.height, 0.1, 400);
      cam.position.set(...camera.position);
      cam.lookAt(...camera.target);
      renderer.render(scene, cam);

      const gl = renderer.getContext();
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 40) lit++;
      const compiled = renderer.info.programs ?? [];
      const result = {
        webgl2: renderer.capabilities.isWebGL2,
        programs: compiled.length,
        cacheKeys: compiled.map((p: { cacheKey: string }) => p.cacheKey),
        litShare: lit / (canvas.width * canvas.height),
      };
      renderer.dispose();
      return result;
    },
    { specs, camera, visible }
  );
}
