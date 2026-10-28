// Visual capture harness for the Nebulosas v3 migration (M4.3).
// Captures Galaxy Overview, Sector Focus and Active Playback for one renderer + preset.
// Usage: node tests/visual/captureScenes.mjs --renderer classic --preset 50 --out test-results/visual/run
// Requires `npm run dev` (or `npm start`) on BASE_URL (default http://127.0.0.1:3000).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { renderer: 'classic', preset: '50', out: 'test-results/visual/run' };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    if (key in args) args[key] = argv[i + 1];
  }
  if (!['classic', 'nebula'].includes(args.renderer)) throw new Error(`Invalid --renderer ${args.renderer}`);
  if (!['50', '150', '300'].includes(args.preset)) throw new Error(`Invalid --preset ${args.preset}`);
  return args;
}

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const SETTLE_MS = 2500;

async function capture({ renderer, preset, out }) {
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  // reduced motion: skips the warp-in and stops galaxy rotation, so captures are comparable
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Three.js announces every Scene to __THREE_DEVTOOLS__; keep them to read the cosmos group
  await page.addInitScript(() => {
    window.__scenes = [];
    const target = new EventTarget();
    target.addEventListener('observe', (e) => {
      if (e.detail?.isScene) window.__scenes.push(e.detail);
    });
    window.__THREE_DEVTOOLS__ = target;
  });

  const readRendererMode = () =>
    page.evaluate(() => {
      for (const scene of window.__scenes) {
        const group = scene.getObjectByName('celestial-galaxy-cosmos');
        if (group) return group.userData.rendererMode ?? null;
      }
      return null;
    });

  const closeCard = async () => {
    const closeBtn = page.locator('button[aria-label*="Cerrar ficha"]');
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(600);
    }
  };

  const shots = [];
  const shoot = async (scene) => {
    await page.waitForTimeout(SETTLE_MS);
    const mode = await readRendererMode();
    if (mode !== renderer) throw new Error(`[${scene}] scene rendererMode is ${mode}, expected ${renderer}`);
    const file = path.join(out, `${preset}_${scene}.png`);
    // software WebGL (swiftshader) is slow with preset 300 + playback; allow a long frame
    await page.screenshot({ path: file, timeout: 120000 });
    shots.push(file);
    console.log(`  ✓ ${file}`);
  };

  await page.goto(`${BASE_URL}/?renderer=${renderer}`, { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(SETTLE_MS);

  if (preset !== '50') {
    await page.getByRole('button', { name: `${preset}p`, exact: true }).click();
  }
  await closeCard();

  // 1. Galaxy Overview
  const galaxiaBtn = page.getByRole('button', { name: 'Galaxia' });
  if (await galaxiaBtn.isVisible().catch(() => false)) await galaxiaBtn.click();
  await shoot('overview');

  // 2. Sector Focus (SYNTHWAVE, as in M3)
  await page.getByRole('button', { name: /Constelaciones/i }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /SYNTHWAVE/i }).first().click();
  await page.waitForTimeout(1800);
  await closeCard();
  await shoot('sector');

  // 3. Active Playback
  await page.getByRole('button', { name: /Pulso FFT|FFT ACTIVO/i }).click();
  await shoot('playback');

  await browser.close();
  if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(' | ')}`);
  return shots;
}

const args = parseArgs(process.argv.slice(2));
console.log(`Capturing renderer=${args.renderer} preset=${args.preset} → ${args.out}`);
capture(args).catch((err) => {
  console.error(err);
  process.exit(1);
});
