// Runs every tests/verification/*.test.ts suite (each in its own process, like before) and lists
// every failing suite at the end, instead of stopping at the first one as the old `&&` chain did.
// Usage: npm run test            → all suites
//        npm run test -- dg_ m7_ → only suites whose file name contains one of the filters
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(__dirname, 'verification');
const filters = process.argv.slice(2);
const suites = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.test.ts'))
  .filter((f) => filters.length === 0 || filters.some((filter) => f.includes(filter)))
  .sort();

if (suites.length === 0) {
  console.error(`No suites match ${filters.join(', ')}`);
  process.exit(1);
}

const tsx = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const failed: string[] = [];
const started = Date.now();
for (const suite of suites) {
  const result = spawnSync(tsx, [path.join(dir, suite)], { stdio: 'inherit' });
  if (result.status !== 0) failed.push(suite);
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log('\n================================================================');
console.log(`VERIFICATION: ${suites.length - failed.length}/${suites.length} suites passed in ${seconds}s`);
if (failed.length > 0) {
  console.error(`FAILED SUITES:\n${failed.map((s) => `  - ${s}`).join('\n')}`);
  process.exit(1);
}
