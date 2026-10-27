// Calibration grid for the Nebulosas v3 gas look (M6.4). Needs `npm run dev`.
// Captures preset-300 Galaxy Overview + SYNTHWAVE sector for each ?nebulaTune=<size>,<alpha>
// and writes one contact sheet. Usage: node tests/visual/calibrateGas.mjs [outDir]
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv[2] ?? 'test-results/visual/calibration';
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const SIZES = (process.env.TUNE_SIZES ?? '1,1.8,2.6').split(',').map(Number);
const ALPHAS = (process.env.TUNE_ALPHAS ?? '1,1.6,2.4').split(',').map(Number);
const W = 800;
const H = 450;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader'],
});

const tiles = [];
for (const size of SIZES) {
  for (const alpha of ALPHAS) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(120000);
    await page.goto(`${BASE_URL}/?renderer=nebula&nebulaTune=${size},${alpha}`, { waitUntil: 'load' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: '300p', exact: true }).click();
    await page.waitForTimeout(2500);
    const closeCard = page.locator('button[aria-label*="Cerrar ficha"]');
    if (await closeCard.isVisible().catch(() => false)) await closeCard.click();
    const overview = path.join(OUT, `s${size}_a${alpha}_overview.png`);
    await page.screenshot({ path: overview, timeout: 120000 });
    await page.getByRole('button', { name: /Constelaciones/i }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /SYNTHWAVE/i }).first().click();
    await page.waitForTimeout(2500);
    if (await closeCard.isVisible().catch(() => false)) await closeCard.click();
    const sector = path.join(OUT, `s${size}_a${alpha}_sector.png`);
    await page.screenshot({ path: sector, timeout: 120000 });
    tiles.push({ size, alpha, overview, sector });
    console.log(`  ✓ size ${size} · alpha ${alpha}`);
    await page.close();
  }
}
await browser.close();

// contact sheet: rows = size, columns = alpha, each cell = overview over sector at half scale
const cellW = W / 2;
const cellH = H; // two half-height images stacked
const sheet = new PNG({ width: cellW * ALPHAS.length, height: cellH * SIZES.length });
const blit = (src, dx, dy) => {
  const img = PNG.sync.read(fs.readFileSync(src));
  for (let y = 0; y < H / 2; y++) {
    for (let x = 0; x < cellW; x++) {
      const si = ((y * 2) * img.width + x * 2) * 4;
      const di = ((dy + y) * sheet.width + dx + x) * 4;
      sheet.data[di] = img.data[si];
      sheet.data[di + 1] = img.data[si + 1];
      sheet.data[di + 2] = img.data[si + 2];
      sheet.data[di + 3] = 255;
    }
  }
};
for (const t of tiles) {
  const col = ALPHAS.indexOf(t.alpha);
  const row = SIZES.indexOf(t.size);
  blit(t.overview, col * cellW, row * cellH);
  blit(t.sector, col * cellW, row * cellH + H / 2);
}
const sheetPath = path.join(OUT, 'contact-sheet.png');
fs.writeFileSync(sheetPath, PNG.sync.write(sheet));
console.log(`Contact sheet: ${sheetPath} (rows = size ${SIZES.join('/')}, columns = alpha ${ALPHAS.join('/')})`);
