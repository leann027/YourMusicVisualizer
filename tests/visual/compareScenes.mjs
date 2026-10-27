// Compares two capture folders scene by scene (M4.3).
// Usage: node tests/visual/compareScenes.mjs <baselineDir> <candidateDir>
// Thresholds are the mean absolute RGB difference per pixel on a 0–255 scale.
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const [baselineDir, candidateDir] = process.argv.slice(2);
if (!baselineDir || !candidateDir) {
  console.error('Usage: node tests/visual/compareScenes.mjs <baselineDir> <candidateDir>');
  process.exit(2);
}

// Calibrated with two captures of the same build (M4.3): static scenes stay ≤ 0.06,
// playback varies 1.6–3.3 because FFT bars and the pulsar follow live audio (smoke check only).
const MAX_MEAN_DIFF = { overview: 0.5, sector: 0.5, playback: 6 };
const thresholdFor = (file) => MAX_MEAN_DIFF[file.replace(/^\d+_|\.png$/g, '')] ?? 0.5;

function meanDiff(fileA, fileB) {
  const a = PNG.sync.read(fs.readFileSync(fileA));
  const b = PNG.sync.read(fs.readFileSync(fileB));
  if (a.width !== b.width || a.height !== b.height) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return sum / ((a.data.length / 4) * 3);
}

const files = fs.readdirSync(baselineDir).filter((f) => f.endsWith('.png')).sort();
if (!files.length) {
  console.error(`No baseline PNGs in ${baselineDir}`);
  process.exit(2);
}

let failed = 0;
for (const file of files) {
  const candidate = path.join(candidateDir, file);
  if (!fs.existsSync(candidate)) {
    console.log(`  [MISSING] ${file}`);
    failed += 1;
    continue;
  }
  const diff = meanDiff(path.join(baselineDir, file), candidate);
  const max = thresholdFor(file);
  const ok = diff <= max;
  if (!ok) failed += 1;
  console.log(`  [${ok ? 'OK' : 'FAIL'}] ${file}  mean diff ${diff.toFixed(3)} (max ${max})`);
}

console.log(failed ? `\n${failed} scene(s) differ from baseline` : '\nAll scenes match baseline');
process.exit(failed ? 1 : 0);
