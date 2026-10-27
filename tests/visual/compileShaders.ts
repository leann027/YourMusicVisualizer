// Compiles the Nebulosas v3 shaders (gas field and collisions) on a real WebGL driver
// (Chromium + SwiftShader) and renders one frame of preset 50. Outside CI: node has no WebGL,
// so a GLSL typo would otherwise only show up when the scene mounts.
// Usage: npx tsx tests/visual/compileShaders.ts [--out test-results/visual/compile-shaders.png]
import fs from 'node:fs';
import path from 'node:path';
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
import { CameraSpec, geometryArrays, openShaderPage, ProgramSpec, renderPrograms, RenderResult } from './nebulaHarness';

const outArg = process.argv.indexOf('--out');
const outFile = outArg > 0 ? process.argv[outArg + 1] : 'test-results/visual/compile-shaders.png';

const layout = computeNebulaLayout(GALAXY_PRESET_50);
const uniformValues = (u: Record<string, { value: number }>) =>
  // brighter than default for the preview frame
  ({ ...Object.fromEntries(Object.entries(u).map(([k, v]) => [k, v.value])), uGain: 2.5 });

const programs: ProgramSpec[] = [
  {
    label: 'gas field',
    vertexShader: NEBULA_FIELD_VERTEX_SHADER,
    fragmentShader: NEBULA_FIELD_FRAGMENT_SHADER,
    cacheKey: NEBULA_FIELD_CACHE_KEY,
    attributes: geometryArrays(buildNebulaFieldGeometry(layout, 20000).geometry, Object.keys(NEBULA_FIELD_ATTRIBUTES)),
    itemSizes: NEBULA_FIELD_ATTRIBUTES as Record<string, number>,
    uniforms: uniformValues(createNebulaFieldUniforms()),
  },
  {
    label: 'collisions',
    vertexShader: NEBULA_COLLISION_VERTEX_SHADER,
    fragmentShader: NEBULA_COLLISION_FRAGMENT_SHADER,
    cacheKey: NEBULA_COLLISION_CACHE_KEY,
    attributes: geometryArrays(buildNebulaCollisionGeometry(layout, 20000).geometry, Object.keys(NEBULA_COLLISION_ATTRIBUTES)),
    itemSizes: NEBULA_COLLISION_ATTRIBUTES as Record<string, number>,
    uniforms: { ...uniformValues(createNebulaCollisionUniforms()), uTime: 7.3 }, // tides mid-way
  },
];
const camera: CameraSpec = { position: [0, 18, 52], target: [0, 0, 0] };

// tsx emits CommonJS here (no "type": "module"), so no top-level await
async function main(): Promise<boolean> {
  const { browser, page, errors } = await openShaderPage(900, 600);
  const perProgram: RenderResult[] = [];
  for (const spec of programs) perProgram.push(await renderPrograms(page, programs, camera, [spec.label]));
  const together = await renderPrograms(page, programs, camera);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await page.locator('#c').screenshot({ path: outFile });
  await browser.close();

  const checks: [boolean, string][] = [
    [errors.length === 0, `no shader/console errors${errors.length ? `: ${errors.join(' | ')}` : ''}`],
    [together.programs === programs.length, `${programs.length} programs compiled (got ${together.programs})`],
    ...programs.map((spec, i): [boolean, string] => [
      together.cacheKeys.some((k) => k.includes(spec.cacheKey)) && perProgram[i].litShare > 0.002,
      `${spec.label}: compiled as ${spec.cacheKey} and draws (${(perProgram[i].litShare * 100).toFixed(1)}% lit pixels)`,
    ]),
  ];
  for (const [ok, label] of checks) console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
  console.log(`  WebGL2: ${together.webgl2} · preview: ${outFile}`);
  return checks.every(([ok]) => ok);
}

main().then(
  (ok) => process.exit(ok ? 0 : 1),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
