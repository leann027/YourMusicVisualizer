/**
 * Tag model for dynamic genre classification (A1).
 *
 * Turns Spotify genres and Last.fm tags into canonical, weighted tag profiles per artist and
 * per song. Only spelling variants ("post punk" / "post-punk" / "postpunk") and true synonyms
 * ("retrowave" = "synthwave") collapse — distinct genres stay distinct so the classifier can
 * tell them apart (the fixed-taxonomy dictionary lumps e.g. future bass with dubstep). Unknown
 * tags are kept, so new genres can emerge; Last.fm noise tags that are not genres are dropped.
 */

export interface WeightedTag {
  tag: string; // canonical, lowercase
  weight: number; // 0..1, the strongest tag of a profile is 1
}

export interface RawTag {
  name: string;
  weight: number; // Last.fm count (0..100)
}

/** Last.fm tags that describe the listener, the voice or the mood, not a genre. */
const NOISE_TAGS = new Set([
  'seen live', 'favorites', 'favourites', 'favorite', 'favourite', 'my favorite', 'love', 'loved',
  'awesome', 'amazing', 'beautiful', 'cool', 'good', 'great', 'best', 'epic', 'fun', 'sexy',
  'female vocalists', 'female vocalist', 'male vocalists', 'male vocalist', 'female vocals', 'male vocals',
  'singer songwriter', 'spotify', 'albums i own', 'under 2000 listeners', 'check out', 'to listen',
  'music', 'song', 'songs', 'track', 'tracks', 'unknown', 'other', 'misc', 'various', 'all',
  'catchy', 'chill', 'mellow', 'sad', 'happy', 'party', 'summer', 'night', 'relax', 'relaxing',
]);

const DECADE_OR_YEAR = /^(\d{2}s|\d{4}s?|(19|20)\d{2})$/;

/** Preferred spelling for genres usually written with hyphens or joined (keyed without spaces/hyphens). */
const PREFERRED_SPELLING: Record<string, string> = {
  postpunk: 'post-punk', postrock: 'post-rock', posthardcore: 'post-hardcore', postmetal: 'post-metal',
  triphop: 'trip-hop', neosoul: 'neo-soul', neopsychedelia: 'neo-psychedelia', jpop: 'j-pop', jrock: 'j-rock',
  kpop: 'k-pop', krock: 'k-rock', lofi: 'lo-fi', hiphop: 'hip hop', dreampop: 'dream pop', synthpop: 'synthpop',
  electropop: 'electropop', nujazz: 'nu jazz', newwave: 'new wave', citypop: 'city pop', drumandbass: 'drum and bass',
  dnb: 'drum and bass', rnb: 'r&b', randb: 'r&b', idm: 'idm', edm: 'edm', ebm: 'ebm',
};

/** True synonyms: different words, same genre. */
const SYNONYMS: Record<string, string> = {
  retrowave: 'synthwave',
  outrun: 'synthwave',
  'rock argentino': 'rock nacional',
  'argentine rock': 'rock nacional',
  'rock nacional argentino': 'rock nacional',
  'rock en espanol': 'rock en español',
  'rhythm and blues': 'r&b',
  electronica: 'electronic',
  'hip-hop': 'hip hop',
  'dance music': 'dance',
};

/** Canonical form of a raw genre/tag, or null when it is noise. */
export function canonicalTag(raw: string): string | null {
  if (!raw) return null;
  const clean = raw
    .toLowerCase()
    .replace(/[_]+/g, ' ')
    .replace(/[^\p{L}\p{N}&'\s-]/gu, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length < 2 || clean.length > 40) return null;
  const spaced = clean.replace(/-/g, ' ');
  if (NOISE_TAGS.has(spaced) || DECADE_OR_YEAR.test(spaced.replace(/\s/g, ''))) return null;
  const preferred = PREFERRED_SPELLING[clean.replace(/[\s-]/g, '')];
  if (preferred) return preferred;
  return SYNONYMS[spaced] ?? SYNONYMS[clean] ?? spaced;
}

/** Sums weights by canonical tag, normalises the strongest to 1, sorts by weight then name. */
function finalise(acc: Map<string, number>): WeightedTag[] {
  const max = Math.max(0, ...acc.values());
  if (max <= 0) return [];
  return [...acc.entries()]
    .map(([tag, w]) => ({ tag, weight: w / max }))
    .sort((a, b) => b.weight - a.weight || a.tag.localeCompare(b.tag));
}

function addRaw(acc: Map<string, number>, name: string, weight: number) {
  const tag = canonicalTag(name);
  if (!tag || !(weight > 0)) return;
  acc.set(tag, (acc.get(tag) ?? 0) + weight);
}

const SPOTIFY_GENRE_WEIGHT = 1;
const TRACK_TAG_FACTOR = 0.8;
const FALLBACK_WEIGHT = 0.3;

export interface ArtistTagInput {
  spotifyGenres?: string[];
  artistTags?: RawTag[]; // Last.fm artist.getTopTags
  trackTags?: RawTag[][]; // Last.fm track.getTopTags, one list per song of the artist
  fallbackGenre?: string; // keyword classifier guess, used only when nothing else exists
}

/** Weighted tag profile of an artist from every available source. */
export function artistTagProfile(input: ArtistTagInput): WeightedTag[] {
  const acc = new Map<string, number>();
  for (const genre of input.spotifyGenres ?? []) addRaw(acc, genre, SPOTIFY_GENRE_WEIGHT);
  for (const t of input.artistTags ?? []) addRaw(acc, t.name, Math.min(100, t.weight) / 100);

  // song tags: averaged over the artist's songs, so prolific artists don't dominate
  const songs = input.trackTags ?? [];
  if (songs.length) {
    const songAcc = new Map<string, number>();
    for (const list of songs) {
      const seen = new Map<string, number>();
      for (const t of list) {
        const tag = canonicalTag(t.name);
        if (tag) seen.set(tag, Math.max(seen.get(tag) ?? 0, Math.min(100, t.weight) / 100));
      }
      for (const [tag, w] of seen) songAcc.set(tag, (songAcc.get(tag) ?? 0) + w);
    }
    for (const [tag, w] of songAcc) acc.set(tag, (acc.get(tag) ?? 0) + (w / songs.length) * TRACK_TAG_FACTOR);
  }

  if (acc.size === 0 && input.fallbackGenre) addRaw(acc, input.fallbackGenre, FALLBACK_WEIGHT);
  return finalise(acc);
}

/** Weighted tag profile of a single song (bridge detection). */
export function songTagProfile(trackTags: RawTag[]): WeightedTag[] {
  const acc = new Map<string, number>();
  for (const t of trackTags) addRaw(acc, t.name, Math.min(100, t.weight) / 100);
  return finalise(acc);
}
