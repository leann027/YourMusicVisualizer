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
import { buildBridgeThreadGeometry, BRIDGE_THREAD_ATTRIBUTES } from '../../src/components/canvas/nebulaV3/bridges';
import {
  BRIDGE_THREAD_CACHE_KEY,
  BRIDGE_THREAD_FRAGMENT_SHADER,
  BRIDGE_THREAD_VERTEX_SHADER,
  createBridgeThreadUniforms,
} from '../../src/components/canvas/nebulaV3/shaders/bridgeThreadShaders';
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
  {
    label: 'bridge threads',
    vertexShader: BRIDGE_THREAD_VERTEX_SHADER,
    fragmentShader: BRIDGE_THREAD_FRAGMENT_SHADER,
    cacheKey: BRIDGE_THREAD_CACHE_KEY,
    attributes: geometryArrays(buildBridgeThreadGeometry(layout), Object.keys(BRIDGE_THREAD_ATTRIBUTES)),
    itemSizes: BRIDGE_THREAD_ATTRIBUTES as Record<string, number>,
    uniforms: { ...uniformValues(createBridgeThreadUniforms()), uShowAll: 1 },
    primitive: 'lines',
  },
];
// bridge thread visibility, checked on the real shader: hidden without links or focus
const threads = programs[2];
const focusGid = layout.data.genres.findIndex((g) => g.id === layout.relations[0].a);
const threadCases: { label: string; uniforms: Record<string, number>; expectLit: boolean }[] = [
  { label: 'no links, no focus', uniforms: { uShowAll: 0, uFocusGid: -1, uFocusAmt: 0 }, expectLit: false },
  { label: 'focus on a colliding genre', uniforms: { uShowAll: 0, uFocusGid: focusGid, uFocusAmt: 1 }, expectLit: true },
  { label: 'constellation links on', uniforms: { uShowAll: 1, uFocusGid: -1, uFocusAmt: 0 }, expectLit: true },
];
const camera: CameraSpec = { position: [0, 18, 52], target: [0, 0, 0] };

// tsx emits CommonJS here (no "type": "module"), so no top-level await
async function main(): Promise<boolean> {
  const { browser, page, errors } = await openShaderPage(900, 600);
  const perProgram: RenderResult[] = [];
  for (const spec of programs) perProgram.push(await renderPrograms(page, programs, camera, [spec.label]));
  const threadResults: RenderResult[] = [];
  for (const c of threadCases) {
    const spec = { ...threads, uniforms: { ...threads.uniforms, ...c.uniforms } };
    threadResults.push(await renderPrograms(page, [spec], camera));
  }
  // collision focus (M7.3): only the focused pair stays lit, the rest dims
  const pairA = layout.data.genres.findIndex((g) => g.id === layout.relations[0].a);
  const pairB = layout.data.genres.findIndex((g) => g.id === layout.relations[0].b);
  const collisionSpec = programs[1];
  const focusedCollisions = await renderPrograms(
    page,
    [{ ...collisionSpec, uniforms: { ...collisionSpec.uniforms, uFocusGid: pairA, uFocusGid2: pairB, uFocusAmt: 1 } }],
    camera
  );
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
    // focus shows only the threads touching that genre: some, but fewer than with links on
    ...threadCases.map((c, i): [boolean, string] => [
      !c.expectLit
        ? threadResults[i].litShare === 0
        : i === 1
          ? threadResults[1].litShare > 0 && threadResults[1].litShare < threadResults[2].litShare
          : threadResults[i].litShare > 0,
      `bridge threads, ${c.label}: ${c.expectLit ? 'visible' : 'hidden'} (${(threadResults[i].litShare * 100).toFixed(2)}% lit)`,
    ]),
    [
      focusedCollisions.litShare > 0 && focusedCollisions.litShare < perProgram[1].litShare,
      `collisions, focus on one pair: dims the others (${(focusedCollisions.litShare * 100).toFixed(2)}% vs ${(perProgram[1].litShare * 100).toFixed(2)}% lit)`,
    ],
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
