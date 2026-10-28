import { parseNebulaTune, PRODUCTION_HOST, readTuneParam, tuningEnabled } from '../../src/components/canvas/nebulaV3/nebulaTune';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details = '') {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`  [PASS] ${name}`);
  } else {
    results.push({ name, passed: false, details });
    console.error(`  [FAIL] ${name}: ${details}`);
  }
}

console.log('================================================================');
console.log('SUITE B3: look overrides on Vercel previews, never in production');
console.log('================================================================');

const preview = 'your-music-visualizer-git-feat-dynamic-genres-visual-leann027.vercel.app';
assert(tuningEnabled('development', undefined, 'localhost'), 'development: enabled');
assert(tuningEnabled('production', 'preview', preview), 'Vercel preview (system variables exposed): enabled');
assert(tuningEnabled('production', undefined, preview), 'Vercel preview without system variables: enabled by hostname');
assert(!tuningEnabled('production', 'production', PRODUCTION_HOST), 'production domain: disabled');
assert(!tuningEnabled('production', undefined, PRODUCTION_HOST), 'production domain without system variables: disabled');
assert(!tuningEnabled('production', 'preview', PRODUCTION_HOST), 'production domain wins over a stray preview variable');
assert(!tuningEnabled('production', 'production', 'your-music-visualizer-abc123-leann027.vercel.app'), 'production deployment URL: disabled');
assert(!tuningEnabled('production', undefined, 'localhost'), 'local production build (npm start): disabled');
assert(!tuningEnabled('production', undefined, 'example.com'), 'any other host in production: disabled');
assert(readTuneParam('starTune') === null, 'server side (no window): no override');

assert(JSON.stringify(parseNebulaTune('1.2,0.8')) === JSON.stringify({ size: 1.2, alpha: 0.8 }), 'parse: two positive numbers');
assert([null, '', 'abc', '1', '0,1', '1,-1', '7,1', '1,7', 'NaN,1'].every((v) => parseNebulaTune(v) === null), 'parse: malformed or out-of-range values ignored');

console.log('\n================================================================');
console.log('SUMMARY OF B3 VERIFICATION');
console.log('================================================================');
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`Total assertions: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.error('\nFAILED ASSERTIONS:');
  results.filter((r) => !r.passed).forEach((r) => console.error(`  - ${r.name}: ${r.details}`));
  process.exit(1);
} else {
  console.log('\nALL B3 TESTS PASSED');
  process.exit(0);
}
