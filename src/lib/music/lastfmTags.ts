import type { RawTag } from './tagModel';

/**
 * Pure helpers for Last.fm top tags (A4): raw weighted tags, no taxonomy. Canonicalisation and
 * clustering happen later in the importer (tagModel + dynamicGenres).
 */

export const LASTFM_MIN_TAG_WEIGHT = 4;
export const LASTFM_MAX_TAGS = 20;

/** Strips remaster / live / edition suffixes so track.getTopTags finds the original song. */
export function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*(remaster|live|version|edit|feat|ft|deluxe|edition|anniversary|mono|stereo|soundtrack|ost)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(remaster|live|version|edit|feat|ft|deluxe|edition|anniversary|mono|stereo|soundtrack|ost)[^\]]*\]/gi, '')
    .replace(/\s*-\s*.*(remaster|live|version|mono|stereo|deluxe).*/gi, '')
    .replace(/["'“”]/g, '')
    .trim();
}

/**
 * Weighted tags from a track.getTopTags / artist.getTopTags JSON response. Error responses,
 * missing fields and a single-object `tag` are handled; counts below LASTFM_MIN_TAG_WEIGHT
 * (including 0 and non-numeric) are dropped; at most LASTFM_MAX_TAGS, strongest first.
 */
export function parseLastfmTopTags(json: unknown): RawTag[] {
  const raw = (json as { toptags?: { tag?: unknown } } | null)?.toptags?.tag;
  const list = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  const tags: RawTag[] = [];
  for (const t of list as { name?: unknown; count?: unknown }[]) {
    const name = String(t?.name ?? '').toLowerCase().trim();
    const weight = Number(t?.count);
    if (name.length > 1 && Number.isFinite(weight) && weight >= LASTFM_MIN_TAG_WEIGHT) {
      tags.push({ name, weight: Math.min(100, weight) });
    }
  }
  return tags.sort((a, b) => b.weight - a.weight).slice(0, LASTFM_MAX_TAGS);
}
