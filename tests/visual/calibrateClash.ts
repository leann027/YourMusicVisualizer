// Calibration grid for the Nebulosas v3 collision look (M7.1b), rendered offline at full density.
// For each uClashSize × uClashAlpha it renders preset 300's strongest collision close-up (camera
// perpendicular to the collision axis) and the galaxy overview, and measures how many pixels the
// collisions change compared with the gas field alone.
// Usage: npx tsx tests/visual/calibrateClash.ts [outDir]   (env CLASH_SIZES / CLASH_ALPHAS)
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
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
import { buildNebulaFieldGeometry, NEBULA_FIELD_ATTRIBUTES, NEBULA_FIELD_DENSITY } from '../../src/components/canvas/nebulaV3/nebulaFieldGeometry';
import { buildNebulaCollisionGeometry, NEBULA_COLLISION_ATTRIBUTES } from '../../src/components/canvas/nebulaV3/nebulaCollisionGeometry';
import { computeNebulaLayout } from '../../src/lib/layout/nebulaLayout';
import { GALAXY_PRESET_300 } from '../../src/data/galaxyPresets';
import { CameraSpec, geometryArrays, openShaderPage, ProgramSpec, renderPrograms } from './nebulaHarness';

const OUT = process.argv[2] ?? 'test-results/visual/clash-calibration';
const SIZES = (process.env.CLASH_SIZES ?? '1.8,2.6,3.4').split(',').map(Number);
const ALPHAS = (process.env.CLASH_ALPHAS ?? '1,1.8,2.6').split(',').map(Number);
const W = 1000;
const H = 600;

const layout = computeNebulaLayout(GALAXY_PRESET_300);
const relation = layout.relations[0]; // strongest collision
const coreA = layout.cores.find((c) => c.genreId === relation.a)!;
const coreB = layout.cores.find((c) => c.genreId === relation.b)!;
const nameOf = (id: string) => layout.data.genres.find((g) => g.id === id)!.name;

// close-up camera: perpendicular to the collision axis, as the collision flight will be (M7.3)
const up = [0, 1, 0];
const along = up[0] * relation.dir[0] + up[1] * relation.dir[1] + up[2] * relation.dir[2];
const ortho = up.map((u, k) => u - along * relation.dir[k]);
const orthoLen = Math.hypot(ortho[0], ortho[1], ortho[2]);
const side = [
  relation.dir[1] * ortho[2] - relation.dir[2] * ortho[1],
  relation.dir[2] * ortho[0] - relation.dir[0] * ortho[2],
  relation.dir[0] * ortho[1] - relation.dir[1] * ortho[0],
].map((v) => v / orthoLen);
const distance = (coreA.radius + coreB.radius) * 1.55;
const closeUp: CameraSpec = {
  position: relation.contact.map((m, k) => m + side[k] * distance) as [number, number, number],
  target: relation.contact,
  fov: 55,
};
const overview: CameraSpec = { position: [0, 18, 52], target: [0, 0, 0] };

const values = (u: Record<string, { value: number }>) => Object.fromEntries(Object.entries(u).map(([k, v]) => [k, v.value]));
const field: ProgramSpec = {
  label: 'field',
  vertexShader: NEBULA_FIELD_VERTEX_SHADER,
  fragmentShader: NEBULA_FIELD_FRAGMENT_SHADER,
  cacheKey: NEBULA_FIELD_CACHE_KEY,
  attributes: geometryArrays(buildNebulaFieldGeometry(layout, NEBULA_FIELD_DENSITY.full).geometry, Object.keys(NEBULA_FIELD_ATTRIBUTES)),
  itemSizes: NEBULA_FIELD_ATTRIBUTES as Record<string, number>,
  uniforms: { ...values(createNebulaFieldUniforms()), uTime: 4 },
};
const collisionAttributes = geometryArrays(
  buildNebulaCollisionGeometry(layout, NEBULA_FIELD_DENSITY.full).geometry,
  Object.keys(NEBULA_COLLISION_ATTRIBUTES)
);
const collisions = (size: number, alpha: number): ProgramSpec => ({
  label: 'collisions',
  vertexShader: NEBULA_COLLISION_VERTEX_SHADER,
  fragmentShader: NEBULA_COLLISION_FRAGMENT_SHADER,
  cacheKey: NEBULA_COLLISION_CACHE_KEY,
  attributes: collisionAttributes,
  itemSizes: NEBULA_COLLISION_ATTRIBUTES as Record<string, number>,
  uniforms: { ...values(createNebulaCollisionUniforms()), uTime: 4, uClashSize: size, uClashAlpha: alpha },
});

/** Share of pixels whose mean RGB differs by more than 10 between two PNG buffers. */
function changedShare(a: Buffer, b: Buffer): number {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  let changed = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])) / 3;
    if (d > 10) changed++;
  }
  return changed / (A.width * A.height);
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, errors } = await openShaderPage(W, H);
  const canvas = page.locator('#c');
  const shot = async (file: string) => {
    const buffer = await canvas.screenshot({ path: path.join(OUT, file) });
    return buffer;
  };

  await renderPrograms(page, [field], closeUp);
  const closeUpField = await shot('closeup_field.png');
  await renderPrograms(page, [field], overview);
  const overviewField = await shot('overview_field.png');

  const metrics: Record<string, { closeUp: number; overview: number }> = {};
  for (const size of SIZES) {
    for (const alpha of ALPHAS) {
      const programs = [field, collisions(size, alpha)];
      await renderPrograms(page, programs, closeUp);
      const c = await shot(`closeup_s${size}_a${alpha}.png`);
      await renderPrograms(page, programs, overview);
      const o = await shot(`overview_s${size}_a${alpha}.png`);
      metrics[`${size},${alpha}`] = { closeUp: changedShare(closeUpField, c), overview: changedShare(overviewField, o) };
      console.log(
        `  size ${size} · alpha ${alpha}: close-up ${(metrics[`${size},${alpha}`].closeUp * 100).toFixed(2)}% · overview ${(metrics[`${size},${alpha}`].overview * 100).toFixed(2)}% pixels changed`
      );
    }
  }
  await browser.close();
  fs.writeFileSync(
    path.join(OUT, 'metrics.json'),
    JSON.stringify({ collision: `${nameOf(relation.a)} × ${nameOf(relation.b)}`, strength: relation.strength, sizes: SIZES, alphas: ALPHAS, metrics }, null, 2)
  );
  if (errors.length) console.error(`Shader/console errors: ${errors.join(' | ')}`);
  console.log(`Collision: ${nameOf(relation.a)} × ${nameOf(relation.b)} · outputs in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
