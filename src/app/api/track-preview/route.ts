import { NextRequest, NextResponse } from 'next/server';

interface CacheEntry {
  url: string | null;
  expiresAt: number;
}

const MAX_URL_CACHE_ENTRIES = 5000;
const previewUrlCache = new Map<string, CacheEntry>();

// In-flight resolution deduplication prevents multiple identical requests from hammering upstream APIs
const inFlightResolutions = new Map<string, Promise<string | null>>();

// In-memory binary cache on the server holds the most recently played 60 audio buffers (30s MP3s)
// allowing 0ms repeat streaming without any external network call.
interface AudioBufferEntry {
  buffer: ArrayBuffer;
  contentType: string;
  cachedAt: number;
}
const MAX_AUDIO_CACHE_ENTRIES = 60;
const inMemoryAudioCache = new Map<string, AudioBufferEntry>();

function cleanQueryText(artist: string, title: string): string {
  const cleanTitle = title
    .replace(/\s*\([^)]*(remaster|live|version|edit|feat|ft|deluxe|edition|anniversary|mono|stereo|soundtrack|ost)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(remaster|live|version|edit|feat|ft|deluxe|edition|anniversary|mono|stereo|soundtrack|ost)[^\]]*\]/gi, '')
    .replace(/\s*-\s*.*(remaster|live|version|mono|stereo|deluxe).*/gi, '')
    .replace(/["'“”]/g, '')
    .trim();

  const cleanArtist = artist.replace(/["'“”]/g, '').trim();
  return `${cleanArtist} ${cleanTitle || title}`.trim();
}

/**
 * On-demand 30-second audio preview resolver & high-performance stream proxy (`GET /api/track-preview`).
 *
 * Resolves a track's real 30s audio preview URL on demand (only when played):
 *   1. Spotify's `fallbackUrl` if valid HTTPS
 *   2. Server memory cache (0ms)
 *   3. Deezer Search API (`https://api.deezer.com/search`) with 2.2s timeout (MP3 format)
 *   4. Apple iTunes Search API (`https://itunes.apple.com/search`) with 2.0s timeout (M4A format)
 *   5. Negative caching (3 mins) to prevent spamming APIs for missing songs
 *   6. Deduplication of concurrent queries to prevent API congestions
 */
async function resolveExternalPreviewUrl(
  artist: string,
  title: string,
  fallbackUrl?: string
): Promise<string | null> {
  if (fallbackUrl && fallbackUrl.startsWith('https://')) {
    return fallbackUrl;
  }

  const cacheKey = `${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`;
  const now = Date.now();

  const cached = previewUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  // Deduplicate in-flight resolutions for this track
  const pending = inFlightResolutions.get(cacheKey);
  if (pending) {
    return pending;
  }

  const resolutionPromise = (async (): Promise<string | null> => {
    const query = cleanQueryText(artist, title);

    // 1. Try Deezer Search API (MP3 format, 2.2s timeout)
    try {
      const dzRes = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=4`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(2200),
          cache: 'no-store',
        }
      );
      if (dzRes.ok) {
        const dzData = (await dzRes.json()) as {
          data?: {
            title?: string;
            preview?: string;
            artist?: { name?: string };
          }[];
        };
        const items = dzData.data || [];
        const artistLower = artist.toLowerCase();
        const match =
          items.find(
            (item) =>
              item.preview &&
              item.artist?.name?.toLowerCase().includes(artistLower)
          ) || items.find((item) => Boolean(item.preview));

        if (match?.preview) {
          storeInUrlCache(cacheKey, match.preview, 86400 * 1000); // 24 hours
          return match.preview;
        }
      }
    } catch {
      // Deezer timeout or error; fallback to iTunes
    }

    // 2. Try iTunes Search API (2.0s timeout)
    try {
      const itRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=3`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(2000),
        }
      );
      if (itRes.ok) {
        const itData = (await itRes.json()) as {
          results?: {
            artistName?: string;
            previewUrl?: string;
          }[];
        };
        const results = itData.results || [];
        const artistLower = artist.toLowerCase();
        const match =
          results.find(
            (r) =>
              r.previewUrl && r.artistName?.toLowerCase().includes(artistLower)
          ) || results.find((r) => Boolean(r.previewUrl));

        if (match?.previewUrl) {
          storeInUrlCache(cacheKey, match.previewUrl, 86400 * 1000); // 24 hours
          return match.previewUrl;
        }
      }
    } catch {
      // iTunes timeout or error
    }

    // 3. Last fallback: any popular track from the artist on Deezer
    try {
      const dzArtistRes = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(artist)}&limit=2`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(1800),
          cache: 'no-store',
        }
      );
      if (dzArtistRes.ok) {
        const dzArtistData = (await dzArtistRes.json()) as {
          data?: { preview?: string }[];
        };
        const firstWithPreview = dzArtistData.data?.find((d) => Boolean(d.preview));
        if (firstWithPreview?.preview) {
          storeInUrlCache(cacheKey, firstWithPreview.preview, 86400 * 1000);
          return firstWithPreview.preview;
        }
      }
    } catch {
      // Ignore
    }

    // Negative cache for 3 minutes to stop useless queries for missing tracks
    storeInUrlCache(cacheKey, null, 180 * 1000);
    return null;
  })();

  inFlightResolutions.set(cacheKey, resolutionPromise);
  try {
    return await resolutionPromise;
  } finally {
    inFlightResolutions.delete(cacheKey);
  }
}

function storeInUrlCache(key: string, url: string | null, ttlMs: number) {
  if (previewUrlCache.size >= MAX_URL_CACHE_ENTRIES) {
    const oldestKey = previewUrlCache.keys().next().value;
    if (oldestKey) previewUrlCache.delete(oldestKey);
  }
  previewUrlCache.set(key, { url, expiresAt: Date.now() + ttlMs });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get('artist') || '';
  const title = searchParams.get('title') || '';
  const fallbackUrl = searchParams.get('fallbackUrl') || undefined;

  if (!artist && !title && !fallbackUrl) {
    return new NextResponse('Missing artist or title', { status: 400 });
  }

  const audioKey = `${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`;

  // 1. Instant check in server-side binary memory cache (0ms!)
  const memoryCachedAudio = inMemoryAudioCache.get(audioKey);
  if (memoryCachedAudio) {
    return new NextResponse(memoryCachedAudio.buffer, {
      status: 200,
      headers: {
        'Content-Type': memoryCachedAudio.contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'X-Preview-Cache': 'RAM-HIT',
      },
    });
  }

  // 2. Resolve external CDN preview URL
  const audioUrl = await resolveExternalPreviewUrl(artist, title, fallbackUrl);
  if (!audioUrl) {
    return new NextResponse('Preview not found', {
      status: 404,
      headers: {
        'Cache-Control': 'public, max-age=180',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // 3. Fetch from CDN with 3.5s timeout and stream with same-origin headers
  try {
    const audioRes = await fetch(audioUrl, {
      signal: AbortSignal.timeout(3500),
      cache: 'force-cache',
    });

    if (!audioRes.ok) {
      previewUrlCache.delete(audioKey);
      return new NextResponse('Upstream audio unavailable', {
        status: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';

    // Store in server RAM cache for instant replay
    if (inMemoryAudioCache.size >= MAX_AUDIO_CACHE_ENTRIES) {
      const oldestAudioKey = inMemoryAudioCache.keys().next().value;
      if (oldestAudioKey) inMemoryAudioCache.delete(oldestAudioKey);
    }
    inMemoryAudioCache.set(audioKey, {
      buffer: arrayBuffer,
      contentType,
      cachedAt: Date.now(),
    });

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'X-Preview-Cache': 'FETCH-OK',
      },
    });
  } catch {
    return new NextResponse('Failed to stream audio preview', {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
