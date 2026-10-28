import { NextRequest } from 'next/server';
import { POST } from '../../src/app/api/enrich-tracks/route';
import { cleanTrackTitle, LASTFM_MAX_TAGS, parseLastfmTopTags } from '../../src/lib/music/lastfmTags';
import { classifyUniversalMusic } from '../../src/lib/music/genreClassifier';
import { buildMusicGalaxyFromPayload } from '../../src/lib/importers/libraryImporter';
import { UNCLASSIFIED_GENRE } from '../../src/lib/music/dynamicGenres';
import {
  buildEnrichRequest,
  spotifyTracksToRawInput,
  SpotifyApiArtistDetail,
  TrackEnrichment,
  ValidSavedTrackItem,
} from '../../src/lib/spotify/spotifyPayload';
import type { RawTag } from '../../src/lib/music/tagModel';
import { MusicGalaxyData } from '../../src/types/music';

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

// ---------- simulated Last.fm (no network) ----------
type LastfmBehaviour = RawTag[] | 'timeout' | 'http500';
const lastfmArtists = new Map<string, LastfmBehaviour>();
const lastfmTracks = new Map<string, LastfmBehaviour>(); // "artist::title"
const calls: { method: string; artist: string; track?: string }[] = [];

const tagJson = (tags: RawTag[]) => ({ toptags: { tag: tags.map((t) => ({ name: t.name, count: t.weight })) } });

globalThis.fetch = (async (input: string | URL | Request) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  const method = url.searchParams.get('method') ?? '';
  const artist = url.searchParams.get('artist') ?? '';
  const track = url.searchParams.get('track') ?? undefined;
  calls.push({ method, artist, track });
  const behaviour = method === 'artist.gettoptags' ? lastfmArtists.get(artist) : lastfmTracks.get(`${artist}::${track}`);
  if (behaviour === 'timeout') throw new DOMException('The operation timed out.', 'TimeoutError');
  if (behaviour === 'http500') return new Response('error', { status: 500 });
  // unknown track/artist: Last.fm answers 200 with an error body
  if (!behaviour) return Response.json({ error: 6, message: 'Track not found' });
  return Response.json(tagJson(behaviour));
}) as typeof fetch;

async function enrich(tracks: { key: string; title: string; artist: string; existingPreviewUrl?: string }[]) {
  const req = new Request('http://localhost/api/enrich-tracks', { method: 'POST', body: JSON.stringify({ tracks }) });
  const res = await POST(req as unknown as NextRequest);
  return (await res.json()) as { results: (TrackEnrichment & { key: string })[] };
}

console.log('================================================================');
console.log('SUITE A4: Spotify + Last.fm tags into the dynamic importer');
console.log('================================================================');

// ---------- 1. Last.fm parsing ----------
const parsed = parseLastfmTopTags({
  toptags: {
    tag: [
      { name: 'Dream Pop', count: '62' },
      { name: 'Shoegaze', count: 100 },
      { name: 'seen live', count: 3 },
      { name: 'zero', count: 0 },
      { name: 'nan', count: 'many' },
      { name: 'x', count: 90 },
    ],
  },
});
assert(
  JSON.stringify(parsed) === JSON.stringify([{ name: 'shoegaze', weight: 100 }, { name: 'dream pop', weight: 62 }]),
  'parse: string/number counts, lowercase, strongest first, < 4 / 0 / non-numeric / 1-char dropped',
  JSON.stringify(parsed)
);
assert(JSON.stringify(parseLastfmTopTags({ toptags: { tag: { name: 'Jazz', count: 80 } } })) === JSON.stringify([{ name: 'jazz', weight: 80 }]), 'parse: single-object tag');
assert(
  [null, undefined, {}, { error: 6, message: 'not found' }, { toptags: {} }, { toptags: { tag: [] } }, 'oops'].every((j) => parseLastfmTopTags(j).length === 0),
  'parse: error / empty / malformed responses → no tags'
);
const many = parseLastfmTopTags({ toptags: { tag: Array.from({ length: 40 }, (_, i) => ({ name: `tag ${i}`, count: 100 - i })) } });
assert(many.length === LASTFM_MAX_TAGS && many[0].name === 'tag 0', `parse: at most ${LASTFM_MAX_TAGS} tags`);
assert(cleanTrackTitle('Alison (2005 Remaster)') === 'Alison' && cleanTrackTitle('Hoppípolla - Live') === 'Hoppípolla', 'cleanTrackTitle strips remaster/live suffixes');

// ---------- 2. Keyword classifier never guesses ----------
const unknown = classifyUniversalMusic('Zqxw Vnbt', undefined, 'Untitled 7');
assert(unknown.genre === '', 'classifyUniversalMusic: unknown artist → empty genre (no hash fallback)', unknown.genre);

// ---------- 3. Simulated Spotify library: 3 styles + one bridge song ----------
interface ArtistSpec {
  name: string;
  spotifyGenres: string[];
  lastfm: LastfmBehaviour | undefined;
  songs: string[];
}
const STYLES: Record<string, ArtistSpec[]> = {
  shoegaze: [
    { name: 'Velvet Haze', spotifyGenres: ['shoegaze'], lastfm: [{ name: 'shoegaze', weight: 100 }, { name: 'dream pop', weight: 70 }], songs: ['Blur Tide', 'Feedback Bloom', 'Soft Static'] },
    { name: 'Glass Reverb', spotifyGenres: [], lastfm: [{ name: 'Shoegaze', weight: 100 }, { name: 'noise pop', weight: 40 }], songs: ['Halo Drift', 'Pale Wall', 'Echo Bath'] },
    { name: 'Lull Machine', spotifyGenres: ['dream pop', 'shoegaze'], lastfm: undefined, songs: ['Slow Sun', 'Weightless', 'Paper Moon'] },
  ],
  techno: [
    { name: 'Kraftwerk Unit', spotifyGenres: ['techno'], lastfm: [{ name: 'techno', weight: 100 }, { name: 'minimal techno', weight: 55 }], songs: ['Pulse 909', 'Grid Lock', 'Warehouse'] },
    { name: 'Rotor Club', spotifyGenres: ['minimal techno'], lastfm: [{ name: 'techno', weight: 100 }, { name: 'electronic', weight: 60 }], songs: ['Night Shift', 'Hz', 'Loop Theory'] },
    { name: 'Sub Basement', spotifyGenres: [], lastfm: [{ name: 'techno', weight: 90 }, { name: 'industrial techno', weight: 50 }], songs: ['Concrete', 'Steel Kick', 'Late Train'] },
  ],
  cumbia: [
    { name: 'Los Del Barrio', spotifyGenres: ['cumbia villera'], lastfm: [{ name: 'cumbia', weight: 100 }, { name: 'cumbia villera', weight: 60 }], songs: ['Pibe Chorro', 'La Bailanta', 'Sábado'] },
    { name: 'Grupo Ritmo', spotifyGenres: ['cumbia'], lastfm: [{ name: 'cumbia', weight: 100 }, { name: 'tropical', weight: 45 }], songs: ['Corazón', 'Pasito', 'Fiesta'] },
    { name: 'La Banda Sur', spotifyGenres: [], lastfm: [{ name: 'cumbia', weight: 95 }, { name: 'latin', weight: 30 }], songs: ['Mi Barrio', 'Noche', 'Ramito'] },
  ],
};
const BRIDGE = { artist: 'Velvet Haze', title: 'Feedback Bloom' };

const items: ValidSavedTrackItem[] = [];
const details = new Map<string, SpotifyApiArtistDetail>();
let n = 0;
for (const specs of Object.values(STYLES)) {
  for (const spec of specs) {
    const artistId = `sp-${spec.name.replace(/\s/g, '-').toLowerCase()}`;
    details.set(artistId, { id: artistId, name: spec.name, genres: spec.spotifyGenres });
    if (spec.lastfm) lastfmArtists.set(spec.name, spec.lastfm);
    for (const title of spec.songs) {
      items.push({
        added_at: '2026-10-01T00:00:00Z',
        track: {
          id: `t${n++}`,
          name: n % 4 === 0 ? `${title} (2011 Remaster)` : title,
          duration_ms: 200000,
          popularity: 60,
          preview_url: null,
          album: { name: `${spec.name} LP`, release_date: '2011-01-01' },
          artists: [{ id: artistId, name: spec.name }],
        },
      });
    }
  }
}
lastfmTracks.set(`${BRIDGE.artist}::${BRIDGE.title}`, [{ name: 'techno', weight: 100 }, { name: 'shoegaze', weight: 40 }]);
lastfmTracks.set('Kraftwerk Unit::Pulse 909', [{ name: 'techno', weight: 100 }]);

const request = buildEnrichRequest(items);
assert(request.length === items.length && request.every((r, i) => r.key === `t${i}`), 'enrich request: one item per track, keyed by track id');

async function main() {
  // ---------- 4. Endpoint: song and artist tags apart, one lookup per artist ----------
  calls.length = 0;
  const enriched = await enrich(request);
  const byKey = new Map(enriched.results.map((r) => [r.key, r]));
  assert(enriched.results.length === items.length, 'endpoint: one result per track');
  const bridgeKey = request.find((r) => r.artist === BRIDGE.artist && r.title.startsWith(BRIDGE.title))!.key;
  const bridgeResult = byKey.get(bridgeKey)!;
  assert(bridgeResult.trackTags?.[0]?.name === 'techno' && bridgeResult.artistTags?.[0]?.name === 'shoegaze', 'endpoint: song tags and artist tags returned separately', JSON.stringify(bridgeResult));
  const plain = byKey.get(request.find((r) => r.artist === 'Grupo Ritmo')!.key)!;
  assert(plain.trackTags?.length === 0 && plain.artistTags?.[0]?.name === 'cumbia', 'endpoint: song without own tags → empty trackTags (no artist-tag copy)');
  const artistCalls = calls.filter((c) => c.method === 'artist.gettoptags');
  const artistNames = new Set(items.map((i) => i.track.artists[0].name));
  assert(artistCalls.length === artistNames.size, 'endpoint: one artist.getTopTags per artist', `${artistCalls.length} calls for ${artistNames.size} artists`);
  assert(calls.filter((c) => c.method === 'track.gettoptags').length === items.length, 'endpoint: one track.getTopTags per song');
  assert(calls.filter((c) => c.method === 'track.gettoptags').every((c) => !/remaster/i.test(c.track ?? '')), 'endpoint: titles cleaned before the lookup');
  assert(bridgeResult.previewUrl?.startsWith('/api/track-preview?') ?? false, 'endpoint: preview URL kept');

  calls.length = 0;
  await enrich(request);
  assert(calls.length === 0, 'endpoint: second request served from cache', `${calls.length} calls`);

  // ---------- 5. Failures: timeouts and HTTP errors are "no tags", retried later ----------
  lastfmArtists.set('Slow Artist', 'timeout');
  lastfmTracks.set('Slow Artist::Lag', 'timeout');
  lastfmArtists.set('Broken Artist', 'http500');
  const failing = await enrich([
    { key: 'f1', title: 'Lag', artist: 'Slow Artist' },
    { key: 'f2', title: 'Crash', artist: 'Broken Artist' },
  ]);
  assert(
    failing.results.length === 2 && failing.results.every((r) => r.trackTags?.length === 0 && r.artistTags?.length === 0 && r.previewUrl),
    'endpoint: timeout / HTTP 500 → empty tags, response still complete'
  );
  lastfmArtists.set('Slow Artist', [{ name: 'jazz', weight: 100 }]);
  const retried = await enrich([{ key: 'f1', title: 'Lag', artist: 'Slow Artist' }]);
  assert(retried.results[0].artistTags?.[0]?.name === 'jazz', 'endpoint: failed lookups are not cached (retried next time)');
  const empty = await enrich([]);
  assert(Array.isArray(empty.results) && empty.results.length === 0, 'endpoint: empty request → empty results');

  // ---------- 6. Payload → galaxy ----------
  const enrichmentMap = new Map<string, TrackEnrichment>(enriched.results.map((r) => [r.key, r]));
  const raw = spotifyTracksToRawInput(items, details, enrichmentMap);
  assert(raw.every((t) => t.genre === undefined && t.secondaryGenre === undefined), 'payload: no genre decided client-side');
  const bridgeRaw = raw.find((t) => t.title.startsWith(BRIDGE.title))!;
  assert(
    bridgeRaw.trackTags?.[0]?.name === 'techno' && bridgeRaw.artistTags?.[0]?.name === 'shoegaze' && bridgeRaw.spotifyGenres?.[0] === 'shoegaze',
    'payload: Spotify genres, artist tags and song tags forwarded'
  );
  assert(bridgeRaw.subgenre === 'Techno' && raw.find((t) => t.artist === 'Glass Reverb')!.subgenre === 'Shoegaze', 'payload: display style from the strongest song tag, else the artist', `${bridgeRaw.subgenre}`);

  const galaxy = buildMusicGalaxyFromPayload({ source: 'spotify', tracks: raw });
  const genreOf = (d: MusicGalaxyData, artist: string) => d.artists.find((a) => a.name === artist)?.genreId;
  console.log(`    ↳ nebulae: ${galaxy.genres.map((g) => g.name).join(' | ')}`);
  assert(galaxy.genres.length === 3, 'galaxy: 3 styles → 3 nebulae', `${galaxy.genres.length}`);
  const styleGenre = Object.values(STYLES).map((specs) => new Set(specs.map((s) => genreOf(galaxy, s.name))));
  assert(styleGenre.every((s) => s.size === 1), 'galaxy: artists of the same style share a nebula');
  assert(new Set(styleGenre.map((s) => [...s][0])).size === 3, 'galaxy: different styles stay apart');
  const bridgeSong = galaxy.songs.find((s) => s.title.startsWith(BRIDGE.title))!;
  assert(bridgeSong.secondaryGenreId === genreOf(galaxy, 'Kraftwerk Unit'), 'galaxy: song tagged with another style bridges to that nebula');
  const otherBridges = galaxy.songs.filter((s) => s.secondaryGenreId && s !== bridgeSong);
  assert(otherBridges.length === 0, 'galaxy: no false bridges', otherBridges.map((s) => s.title).join(', '));

  // ---------- 7. Without Last.fm (endpoint down) and without Spotify genres ----------
  const noLastfm = spotifyTracksToRawInput(items, details, new Map());
  const g2 = buildMusicGalaxyFromPayload({ source: 'spotify', tracks: noLastfm });
  assert(
    g2.genres.length >= 2 && genreOf(g2, 'Velvet Haze') !== genreOf(g2, 'Kraftwerk Unit') && genreOf(g2, 'Velvet Haze') === genreOf(g2, 'Lull Machine'),
    'no Last.fm: Spotify genres alone still separate styles'
  );
  const bare = spotifyTracksToRawInput(items, new Map(), new Map());
  const g3 = buildMusicGalaxyFromPayload({ source: 'spotify', tracks: bare });
  const g3b = buildMusicGalaxyFromPayload({ source: 'spotify', tracks: spotifyTracksToRawInput(items, new Map(), new Map()) });
  // only the keyword prior (known artist names) may place an artist; everyone else → OTRAS ÓRBITAS
  const g3Name = (artist: string) => g3.genres.find((g) => g.id === genreOf(g3, artist))?.name;
  const misplaced = [...artistNames].filter((a) => {
    const firstTitle = items.find((i) => i.track.artists[0].name === a)!.track.name;
    return classifyUniversalMusic(a, undefined, firstTitle).genre === '' && g3Name(a) !== UNCLASSIFIED_GENRE;
  });
  assert(
    misplaced.length === 0 && g3.genres.some((g) => g.name === UNCLASSIFIED_GENRE),
    'no tags at all: artists without a keyword prior go to OTRAS ÓRBITAS (never random)',
    `${misplaced.join(', ')} · ${g3.genres.map((g) => g.name).join(' | ')}`
  );
  assert(JSON.stringify(g3.artists.map((a) => [a.name, a.genreId])) === JSON.stringify(g3b.artists.map((a) => [a.name, a.genreId])), 'no tags at all: deterministic');

  // ---------- 8. Budget: 3000 tracks through the payload + importer ----------
  const bigItems: ValidSavedTrackItem[] = [];
  const bigEnrichment = new Map<string, TrackEnrichment>();
  const styles = ['shoegaze', 'techno', 'cumbia', 'jazz', 'j-pop', 'trap', 'post-punk', 'ambient'];
  for (let i = 0; i < 3000; i++) {
    const artist = `Artist ${i % 600}`;
    const style = styles[(i % 600) % styles.length];
    bigItems.push({ ...items[0], track: { ...items[0].track, id: `big${i}`, name: `Song ${i}`, artists: [{ id: `a${i % 600}`, name: artist }] } });
    bigEnrichment.set(`big${i}`, { artistTags: [{ name: style, weight: 100 }], trackTags: i % 50 === 0 ? [{ name: styles[(i + 1) % styles.length], weight: 100 }] : [] });
  }
  const t0 = performance.now();
  const bigGalaxy = buildMusicGalaxyFromPayload({ source: 'spotify', tracks: spotifyTracksToRawInput(bigItems, new Map(), bigEnrichment) });
  const ms = performance.now() - t0;
  console.log(`    ↳ 3000 tracks: ${ms.toFixed(0)} ms · ${bigGalaxy.genres.length} nebulae`);
  assert(bigGalaxy.genres.length === styles.length, '3000 tracks: one nebula per style', `${bigGalaxy.genres.length}`);
  assert(ms < 2000, '3000 tracks: payload + importer < 2 s', `${ms.toFixed(0)} ms`);

  console.log('\n================================================================');
  console.log('SUMMARY OF A4 VERIFICATION');
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
    console.log('\nALL A4 TESTS PASSED');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
