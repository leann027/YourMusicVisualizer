import {
  DEFAULT_RENDERER_MODE,
  readStoredRenderer,
  RENDERER_STORAGE_KEY,
  resolveInitialRenderer,
  storeRenderer,
} from '../../src/lib/rendererPreference';

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
console.log('SUITE M8.4: default renderer and stored preference');
console.log('================================================================');

// 1. Resolution order: URL parameter > stored preference > default
assert(DEFAULT_RENDERER_MODE === 'nebula', 'default renderer is nebula');
assert(resolveInitialRenderer(null, null) === 'nebula', 'nothing set → nebula');
assert(resolveInitialRenderer(null, 'classic') === 'classic', 'stored classic → classic');
assert(resolveInitialRenderer('nebula', 'classic') === 'nebula', '?renderer=nebula beats the stored preference');
assert(resolveInitialRenderer('classic', null) === 'classic', '?renderer=classic → classic');

// 2. Working storage
const memory = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  },
};
assert(readStoredRenderer() === null, 'empty storage → no preference');
storeRenderer('classic');
assert(memory.get(RENDERER_STORAGE_KEY) === 'classic' && readStoredRenderer() === 'classic', 'preference stored and read back');
memory.set(RENDERER_STORAGE_KEY, 'hologram');
assert(readStoredRenderer() === null, 'unknown stored value is ignored');

// 3. Blocked storage (private mode, blocked site data): never throws
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  },
};
let threw = false;
try {
  storeRenderer('nebula');
  assert(readStoredRenderer() === null, 'blocked storage → no preference');
} catch {
  threw = true;
}
assert(!threw, 'blocked storage never throws');

console.log('\n================================================================');
console.log('SUMMARY OF M8.4 VERIFICATION');
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
  console.log('\nALL M8.4 TESTS PASSED');
  process.exit(0);
}
