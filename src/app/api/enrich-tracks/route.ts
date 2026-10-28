import { NextRequest, NextResponse } from 'next/server';
import type { RawTag } from '@/lib/music/tagModel';
import { cleanTrackTitle, parseLastfmTopTags } from '@/lib/music/lastfmTags';

interface EnrichTrackRequestItem {
  key: string;
  title: string;
  artist: string;
  existingPreviewUrl?: string;
}

/**
 * Raw weighted Last.fm tags (A4): song tags and artist tags are kept apart, because the
 * importer uses song tags to detect bridges between nebulae. Classification happens client-side
 * in the importer (dynamicGenres), not here.
 */
export interface EnrichTrackResultItem {
  key: string;
  trackTags: RawTag[];
  artistTags: RawTag[];
  previewUrl: string;
}

const LASTFM_API_KEY =
  process.env.LASTFM_API_KEY || 'b25b959554ed76058ac220b7b2e0a026';
const LASTFM_TIMEOUT_MS = 1800;

// Successful lookups only: a timeout or HTTP error is retried on the next request
const trackTagsCache = new Map<string, RawTag[]>();
// One in-flight lookup per artist, shared by all its songs
const artistTagsCache = new Map<string, Promise<RawTag[] | null>>();

/** Last.fm top tags, or null when the request failed (network, timeout, HTTP error). */
async function fetchLastfmTopTags(params: Record<string, string>): Promise<RawTag[] | null> {
  const query = new URLSearchParams({ ...params, api_key: LASTFM_API_KEY, format: 'json' });
  try {
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${query.toString()}`, {
      signal: AbortSignal.timeout(LASTFM_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return parseLastfmTopTags(await res.json());
  } catch {
    return null;
  }
}

async function getTrackTags(artist: string, title: string): Promise<RawTag[]> {
  const cleanTitle = cleanTrackTitle(title);
  if (!artist || !cleanTitle) return [];
  const key = `${artist.toLowerCase().trim()}::${cleanTitle.toLowerCase()}`;
  const cached = trackTagsCache.get(key);
  if (cached) return cached;
  const tags = await fetchLastfmTopTags({ method: 'track.gettoptags', artist, track: cleanTitle });
  if (tags) trackTagsCache.set(key, tags);
  return tags ?? [];
}

async function getArtistTags(artist: string): Promise<RawTag[]> {
  const key = artist.toLowerCase().trim();
  if (!key) return [];
  let pending = artistTagsCache.get(key);
  if (!pending) {
    pending = fetchLastfmTopTags({ method: 'artist.gettoptags', artist });
    artistTagsCache.set(key, pending);
  }
  const tags = await pending;
  if (!tags) artistTagsCache.delete(key);
  return tags ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tracks?: EnrichTrackRequestItem[] };
    const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 3000) : [];

    if (tracks.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process tracks in concurrent batches of 20 with rate-limit safe timeouts
    const batchSize = 20;
    const enrichedResults: EnrichTrackResultItem[] = [];

    for (let i = 0; i < tracks.length; i += batchSize) {
      const chunk = tracks.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const [trackTags, artistTags] = await Promise.all([
            getTrackTags(item.artist, item.title),
            getArtistTags(item.artist),
          ]);
          const previewParams = new URLSearchParams({
            artist: item.artist,
            title: item.title,
          });
          if (item.existingPreviewUrl) {
            previewParams.set('fallbackUrl', item.existingPreviewUrl);
          }

          return {
            key: item.key,
            trackTags,
            artistTags,
            previewUrl: `/api/track-preview?${previewParams.toString()}`,
          };
        })
      );
      enrichedResults.push(...chunkResults);
    }

    return NextResponse.json({ results: enrichedResults });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Error enriqueciendo canciones con etiquetas de Last.fm',
        results: [],
      },
      { status: 500 }
    );
  }
}
