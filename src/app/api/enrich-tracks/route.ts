import { NextRequest, NextResponse } from 'next/server';
import {
  resolveTrackTaxonomy,
  MACRO_GENRES,
} from '@/lib/music/taxonomy';
import {
  classifyUniversalMusic,
} from '@/lib/music/genreClassifier';

interface EnrichTrackRequestItem {
  key: string;
  title: string;
  artist: string;
  existingGenre?: string;
  existingSecondaryGenre?: string;
  existingPreviewUrl?: string;
}

export interface EnrichTrackResultItem {
  key: string;
  genre: string;
  subgenre: string;
  secondaryGenre?: string;
  rawGenre: string;
  tags: string[];
  previewUrl: string;
}

interface CachedTrackTaxonomy {
  genre: string;
  subgenre: string;
  secondaryGenre?: string;
  rawGenre: string;
  tags: string[];
}

const trackTaxonomyCache = new Map<string, CachedTrackTaxonomy>();
const artistTagsCache = new Map<string, Array<{ name: string; weight: number }>>();

const LASTFM_API_KEY =
  process.env.LASTFM_API_KEY || 'b25b959554ed76058ac220b7b2e0a026';

function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*(remaster|live|version|edit|feat|ft|deluxe|edition|anniversary|mono|stereo|soundtrack|ost)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(remaster|live|version|edit|feat|ft|deluxe|edition|anniversary|mono|stereo|soundtrack|ost)[^\]]*\]/gi, '')
    .replace(/\s*-\s*.*(remaster|live|version|mono|stereo|deluxe).*/gi, '')
    .replace(/["'“”]/g, '')
    .trim();
}

/**
 * Fetches listener-curated tags at the TRACK level (Last.fm track.getTopTags)
 * with a fast 1.8s timeout and fallback to artist-level tags.
 */
async function fetchTrackLevelTags(
  artist: string,
  title: string
): Promise<Array<{ name: string; weight: number }>> {
  const cleanTitle = cleanTrackTitle(title);
  if (!cleanTitle || !artist) return [];

  try {
    const trackUrl = `https://ws.audioscrobbler.com/2.0/?method=track.gettoptags&artist=${encodeURIComponent(
      artist
    )}&track=${encodeURIComponent(cleanTitle)}&api_key=${LASTFM_API_KEY}&format=json`;

    const res = await fetch(trackUrl, {
      signal: AbortSignal.timeout(1800),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const data = (await res.json()) as {
        toptags?: {
          tag?: Array<{ name: string; count: number | string }>;
        };
      };
      const rawTags = data?.toptags?.tag;
      if (Array.isArray(rawTags) && rawTags.length > 0) {
        return rawTags
          .map((t) => ({
            name: String(t.name).toLowerCase().trim(),
            weight: Number(t.count) || 50,
          }))
          .filter((t) => t.weight >= 4 && t.name.length > 1);
      }
    }
  } catch {
    // Non-blocking fallback
  }

  // Fallback to cached or queried artist tags
  const aKey = artist.toLowerCase().trim();
  const cachedArtist = artistTagsCache.get(aKey);
  if (cachedArtist) return cachedArtist;

  try {
    const artistUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&artist=${encodeURIComponent(
      artist
    )}&api_key=${LASTFM_API_KEY}&format=json`;

    const aRes = await fetch(artistUrl, {
      signal: AbortSignal.timeout(1800),
      headers: { Accept: 'application/json' },
    });

    if (aRes.ok) {
      const aData = (await aRes.json()) as {
        toptags?: {
          tag?: Array<{ name: string; count: number | string }>;
        };
      };
      const rawTags = aData?.toptags?.tag;
      if (Array.isArray(rawTags) && rawTags.length > 0) {
        const parsed = rawTags
          .map((t) => ({
            name: String(t.name).toLowerCase().trim(),
            weight: Number(t.count) || 50,
          }))
          .filter((t) => t.weight >= 4 && t.name.length > 1);
        artistTagsCache.set(aKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Non-blocking
  }

  return [];
}

/**
 * Resolves a track's definitive 2-level taxonomy (Macro Constellation + Normalized Subgenre)
 * and extracts tags for TF-IDF edge computation.
 */
async function resolveTrackEnrichment(
  item: EnrichTrackRequestItem
): Promise<CachedTrackTaxonomy> {
  const cacheKey = `${item.artist.toLowerCase().trim()}::${item.title.toLowerCase().trim()}`;
  const cached = trackTaxonomyCache.get(cacheKey);
  if (cached) return cached;

  // 1. Fetch track-level listener tags (Last.fm track.getTopTags)
  const trackTags = await fetchTrackLevelTags(item.artist, item.title);

  // Combine with existing Spotify genres if available
  const combinedTagList: Array<{ name: string; weight: number }> = [...trackTags];
  if (item.existingGenre) {
    combinedTagList.push({ name: item.existingGenre, weight: 85 });
  }
  if (item.existingSecondaryGenre) {
    combinedTagList.push({ name: item.existingSecondaryGenre, weight: 65 });
  }

  let result: CachedTrackTaxonomy;

  if (combinedTagList.length > 0) {
    const resolved = resolveTrackTaxonomy(combinedTagList, item.artist, item.title);
    result = {
      genre: resolved.macroGenre.name,
      subgenre: resolved.subgenre,
      secondaryGenre: MACRO_GENRES[resolved.macroGenre.sister]?.name,
      rawGenre: `${resolved.macroGenre.shortName} · ${resolved.subgenre}`,
      tags: resolved.normalizedTags,
    };
  } else {
    // Fallback to instant universal classifier heuristics
    const fast = classifyUniversalMusic(item.artist, item.existingGenre, item.title);
    result = {
      genre: fast.genre,
      subgenre: fast.rawGenre !== fast.genre ? fast.rawGenre : fast.genre,
      secondaryGenre: fast.secondaryGenre,
      rawGenre: fast.genre,
      tags: [fast.genre],
    };
  }

  trackTaxonomyCache.set(cacheKey, result);
  return result;
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
          const taxonomy = await resolveTrackEnrichment(item);
          const previewParams = new URLSearchParams({
            artist: item.artist,
            title: item.title,
          });
          if (item.existingPreviewUrl) {
            previewParams.set('fallbackUrl', item.existingPreviewUrl);
          }

          return {
            key: item.key,
            genre: taxonomy.genre,
            subgenre: taxonomy.subgenre,
            secondaryGenre: taxonomy.secondaryGenre,
            rawGenre: taxonomy.rawGenre,
            tags: taxonomy.tags,
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
            : 'Error enriqueciendo géneros musicales y etiquetas a nivel de pista',
        results: [],
      },
      { status: 500 }
    );
  }
}
