import { artistTagProfile, canonicalTag, songTagProfile } from '../../src/lib/music/tagModel';

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
console.log('SUITE A1: tag model for dynamic genres');
console.log('================================================================');

// 1. Canonical tags
const pp = ['Post Punk', 'post-punk', 'POST_PUNK', '  post   punk '].map(canonicalTag);
assert(new Set(pp).size === 1 && pp[0] === 'post-punk', 'spelling variants collapse to one tag', JSON.stringify(pp));
assert(canonicalTag('dreampop') === 'dream pop' && canonicalTag('Dream Pop') === 'dream pop', 'dictionary synonyms (dreampop → dream pop)');
assert(canonicalTag('retrowave') === canonicalTag('synthwave'), 'retrowave and synthwave share a canonical tag', `${canonicalTag('retrowave')}`);
assert(canonicalTag('Chamamé') === 'chamamé' && canonicalTag('Vallenato Moderno') === 'vallenato moderno', 'unknown genres are kept, accents included (new nebulae can emerge)', `${canonicalTag('Chamamé')}`);
assert(canonicalTag('Cumbia Villera') === 'cumbia', 'dictionary synonyms collapse on purpose (cumbia villera → cumbia)');
assert(canonicalTag('City Pop') !== null && canonicalTag('math rock') !== null, 'niche genres kept');
assert(canonicalTag('R&B') === 'r&b' || canonicalTag('R&B') !== null, 'r&b survives cleaning', `${canonicalTag('R&B')}`);
for (const noise of ['seen live', 'Favorites', 'female vocalists', 'awesome', '80s', '2010', '1990s', 'spotify', 'x', '']) {
  assert(canonicalTag(noise) === null, `noise dropped: "${noise}"`);
}

// 2. Artist profiles
const profile = artistTagProfile({
  spotifyGenres: ['shoegaze', 'dream pop'],
  artistTags: [
    { name: 'Shoegaze', weight: 100 },
    { name: 'seen live', weight: 90 },
    { name: 'dreampop', weight: 40 },
    { name: 'noise rock', weight: 20 },
  ],
  trackTags: [
    [{ name: 'shoegaze', weight: 100 }],
    [{ name: 'shoegaze', weight: 80 }, { name: 'ethereal', weight: 60 }],
  ],
});
assert(profile[0].tag === 'shoegaze' && profile[0].weight === 1, 'strongest tag first, normalised to 1', JSON.stringify(profile.slice(0, 2)));
assert(!profile.some((t) => t.tag === 'seen live'), 'noise never reaches the profile');
assert(profile.find((t) => t.tag === 'dream pop')!.weight > profile.find((t) => t.tag === 'noise rock')!.weight, 'Spotify genre + tag outweighs a weak tag');
assert(profile.every((t, i) => i === 0 || profile[i - 1].weight >= t.weight), 'sorted by weight');
assert(JSON.stringify(profile) === JSON.stringify(artistTagProfile({
  spotifyGenres: ['shoegaze', 'dream pop'],
  artistTags: [{ name: 'Shoegaze', weight: 100 }, { name: 'seen live', weight: 90 }, { name: 'dreampop', weight: 40 }, { name: 'noise rock', weight: 20 }],
  trackTags: [[{ name: 'shoegaze', weight: 100 }], [{ name: 'shoegaze', weight: 80 }, { name: 'ethereal', weight: 60 }]],
})), 'deterministic');

// song tags are averaged per song: one song with many tags doesn't dominate
const averaged = artistTagProfile({ trackTags: [[{ name: 'jazz', weight: 100 }], [{ name: 'jazz', weight: 100 }], [{ name: 'funk', weight: 100 }]] });
assert(averaged[0].tag === 'jazz' && Math.abs(averaged.find((t) => t.tag === 'funk')!.weight - 0.5) < 1e-9, 'song tags averaged over the artist songs', JSON.stringify(averaged));

// 3. Fallback only when nothing else exists
assert(JSON.stringify(artistTagProfile({ fallbackGenre: 'Cumbia' })) === JSON.stringify([{ tag: 'cumbia', weight: 1 }]), 'fallback genre used when there are no tags');
const withTags = artistTagProfile({ artistTags: [{ name: 'techno', weight: 50 }], fallbackGenre: 'Cumbia' });
assert(!withTags.some((t) => t.tag === 'cumbia'), 'fallback ignored when real tags exist');
assert(artistTagProfile({}).length === 0, 'no data → empty profile (never random)');

// 4. Song profiles
const song = songTagProfile([{ name: 'Trip Hop', weight: 100 }, { name: 'trip-hop', weight: 50 }, { name: 'seen live', weight: 100 }]);
assert(song.length === 1 && song[0].tag === canonicalTag('trip hop') && song[0].weight === 1, 'song profile merges variants and drops noise', JSON.stringify(song));
assert(songTagProfile([]).length === 0, 'song without tags → empty profile');

console.log('\n================================================================');
console.log('SUMMARY OF A1 VERIFICATION');
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
  console.log('\nALL A1 TESTS PASSED');
  process.exit(0);
}
