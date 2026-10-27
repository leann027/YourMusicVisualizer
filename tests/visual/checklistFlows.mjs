// Automatable part of the no-regression checklist (docs/MIGRATION_NEBULOSAS.md), per renderer.
// Usage: node tests/visual/checklistFlows.mjs --renderer classic|nebula   (needs `npm run dev`)
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const renderer = process.argv[process.argv.indexOf('--renderer') + 1] ?? 'classic';
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const SETTLE_MS = 2200;

const checks = [];
const check = (ok, name, details = '') => {
  checks.push({ ok, name, details });
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${name}${details ? ` — ${details}` : ''}`);
};

// mean absolute RGB difference between two PNG buffers (0–255)
function meanDiff(a, b) {
  const A = PNG.sync.read(a);
  const B = PNG.sync.read(b);
  let sum = 0;
  for (let i = 0; i < A.data.length; i += 4) {
    sum += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
  }
  return sum / ((A.data.length / 4) * 3);
}

const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
});
const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.setDefaultTimeout(120000);
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
await page.addInitScript(() => {
  window.__scenes = [];
  const t = new EventTarget();
  t.addEventListener('observe', (e) => e.detail?.isScene && window.__scenes.push(e.detail));
  window.__THREE_DEVTOOLS__ = t;
});

const mode = () =>
  page.evaluate(() => {
    for (const s of window.__scenes) {
      const g = s.getObjectByName('celestial-galaxy-cosmos');
      if (g) return g.userData.rendererMode;
    }
    return null;
  });
const sectorText = () => page.locator('span:text-is("SECTOR:") + strong').innerText();
const starsText = () => page.locator('span:text-is("ESTRELLAS:") + strong').innerText();
const shot = async () => {
  await page.waitForTimeout(SETTLE_MS);
  return page.screenshot({ timeout: 120000 });
};
const card = page.locator('[aria-label="Ficha discográfica de inspección estelar"]');

console.log(`Checklist flows · renderer=${renderer}`);
await page.goto(`${BASE_URL}/?renderer=${renderer}`, { waitUntil: 'load' });
await page.waitForSelector('canvas', { timeout: 60000 });
await page.waitForFunction(() => window.__scenes.some((s) => s.getObjectByName('celestial-galaxy-cosmos')));
await page.waitForTimeout(SETTLE_MS);
check((await mode()) === renderer, 'renderer flag applied', `scene mode ${await mode()}`);

// Galaxy overview
await page.getByRole('button', { name: 'Galaxia' }).click();
const galaxyShot = await shot();
check((await sectorText()).includes('VISTA GAL'), 'Galaxia → galaxy view', await sectorText());

// Constellations drawer → selectSector (camera flies)
await page.getByRole('button', { name: /Constelaciones/i }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: /SYNTHWAVE/i }).first().click();
const sectorShot = await shot();
check((await sectorText()).includes('SYNTHWAVE'), 'Drawer → selectSector', await sectorText());
check(meanDiff(galaxyShot, sectorShot) > 3, 'Drawer → camera flight', `diff ${meanDiff(galaxyShot, sectorShot).toFixed(1)}`);

// Próxima → flyToNeighborSector
const before = await sectorText();
await page.getByRole('button', { name: /Próxima/i }).click();
const nextShot = await shot();
check((await sectorText()) !== before, 'Próxima → neighbour sector', `${before} → ${await sectorText()}`);
check(meanDiff(sectorShot, nextShot) > 3, 'Próxima → camera flight', `diff ${meanDiff(sectorShot, nextShot).toFixed(1)}`);

// Search → selectNode (artist and song)
const search = page.getByPlaceholder('Buscar artista, pista o sector... [/]');
for (const query of ['Kavinsky', 'Nightcall']) {
  await search.fill(query);
  await page.waitForTimeout(400);
  await search.press('Enter');
  await page.waitForTimeout(SETTLE_MS);
  const visible = await card.isVisible().catch(() => false);
  const text = visible ? await card.innerText() : '';
  check(visible && text.includes(query), `Search "${query}" → selectNode + card`, visible ? '' : 'card hidden');
}
check((await sectorText()).includes('SYNTHWAVE'), 'Search selection moves sector', await sectorText());

// Artist card collapse
await page.locator('button[aria-label*="Cerrar ficha"]').click();
await page.waitForTimeout(500);
check(await page.locator('button[aria-label^="Reabrir ficha"]').isVisible(), 'Artist card collapses (reopen button)');

// Filters: affinity slider reduces visible stars
const starsBefore = Number(await starsText());
await page.getByRole('button', { name: /Filtros & Brillo/i }).click();
await page.waitForTimeout(400);
await page.locator('input[name="minAffinityThreshold"]').evaluate((el) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  // preset 50 affinities are all >= 0.93, so only the 95% maximum hides stars
  setter.call(el, el.max);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(600);
const starsAfter = Number(await starsText());
check(starsAfter < starsBefore, 'Affinity filter hides stars', `${starsBefore} → ${starsAfter}`);
await page.getByRole('button', { name: /Filtros & Brillo/i }).click();

// Bloom toggle
await page.getByRole('button', { name: 'Desactivar efecto Bloom' }).click();
await page.waitForTimeout(300);
check(await page.getByRole('button', { name: 'Activar efecto Bloom' }).isVisible(), 'Bloom OFF');
await page.getByRole('button', { name: 'Activar efecto Bloom' }).click();

// Constellation links toggle (M7.4: the store action had no control), in the Filtros & Brillo panel
await page.getByRole('button', { name: /Filtros & Brillo/i }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Mostrar hilos de constelación' }).click();
await page.waitForTimeout(300);
check(await page.getByRole('button', { name: 'Ocultar hilos de constelación' }).isVisible(), 'Hilos ON');
await page.getByRole('button', { name: 'Ocultar hilos de constelación' }).click();
await page.waitForTimeout(300);
check(await page.getByRole('button', { name: 'Mostrar hilos de constelación' }).isVisible(), 'Hilos OFF');
await page.getByRole('button', { name: /Filtros & Brillo/i }).click();

// FFT pulse
await page.getByRole('button', { name: /Pulso FFT/i }).click();
await page.waitForTimeout(1200);
check(await page.getByRole('button', { name: 'FFT ACTIVO', exact: true }).isVisible(), 'Pulso FFT → playback');

// Presets keep the renderer
await page.getByRole('button', { name: '150p', exact: true }).click();
await page.waitForTimeout(SETTLE_MS);
check(Number(await starsText()) > starsBefore, 'Preset 150p loads more stars', await starsText());
check((await mode()) === renderer, 'Preset change keeps renderer');

// Nebulosas v3 journey (M7.4): universe → genre → collision → bridge song → play
if (renderer === 'nebula') {
  const store = (fn) => page.evaluate(fn);
  await page.getByRole('button', { name: 'Galaxia' }).click();
  await page.waitForTimeout(SETTLE_MS);
  await page.getByRole('button', { name: /Constelaciones/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /ART ROCK/i }).first().click();
  await page.waitForTimeout(SETTLE_MS);
  const clashChip = page.getByRole('button', { name: /Ver choque con POST-ROCK/i });
  check(await clashChip.isVisible().catch(() => false), 'Genre card lists "Choca con" collisions');
  await clashChip.click();
  await page.waitForTimeout(SETTLE_MS);
  const collisionCard = page.locator('aside[aria-label^="Ficha del choque"]');
  check(await collisionCard.isVisible().catch(() => false), 'Collision chip → collision card', await collisionCard.getAttribute('aria-label').catch(() => ''));
  check((await store(() => window.__galaxyStore.getState().cameraMode)) === 'collision', 'Collision chip → camera in collision mode');
  const cardText = await collisionCard.innerText();
  check(/∩ \d+/.test(cardText) && /Canciones puente/.test(cardText), 'Collision card shows ∩ n and bridge songs');
  await collisionCard.getByRole('button', { name: /Reckoner/ }).click();
  await page.waitForTimeout(SETTLE_MS);
  const selected = await store(() => window.__galaxyStore.getState().selectedNode);
  check(selected?.title === 'Reckoner' && (await card.isVisible()), 'Bridge song chip → song selected with its card', selected?.title);
  await page.locator('ol[aria-label^="Lista de canciones"] button[aria-current="true"]').click();
  await page.waitForTimeout(1500);
  const playing = await store(() => {
    const s = window.__galaxyStore.getState();
    return { id: s.playingTrackId, on: s.isAudioPlaying };
  });
  check(playing.on && playing.id === selected.id, 'Bridge song plays', JSON.stringify(playing));
  check(await page.getByRole('button', { name: 'FFT ACTIVO', exact: true }).isVisible(), 'FFT dock shows playback');
}

check(pageErrors.length === 0, 'No page errors', pageErrors.join(' | '));
await browser.close();

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${checks.length - failed}/${checks.length} checks passed (${renderer})`);
process.exit(failed ? 1 : 0);
