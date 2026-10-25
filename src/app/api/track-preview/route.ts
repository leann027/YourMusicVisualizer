import { NextRequest, NextResponse } from 'next/server';

const previewUrlCache = new Map<string, string>();

/**
 * On-demand 30-second audio preview resolver & stream proxy (`GET /api/track-preview`).
 *
 * Resolves a track's real 30s audio preview URL on demand (only when the listener plays that song,
 * avoiding any bulk rate-limiting when loading 500 tracks) using:
 *   1. Spotify's `fallbackUrl` (`track.preview_url`) if present
 *   2. Deezer Search API (`https://api.deezer.com/search`) — high rate limit (50 req/5s), MP3 format
 *   3. Apple iTunes Search API (`https://itunes.apple.com/search`) — M4A format fallback
 * Then streams the raw audio bytes back to `WebAudioEngine` with same-origin headers so
 * `AudioContext.decodeAudioData()` always succeeds with 64-band FFT analysis.
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
  const cached = previewUrlCache.get(cacheKey);
  if (cached) return cached;

  // Clean "(Remastered...)" or "- Live..." suffixes for higher match rate
  const cleanTitle = title
    .replace(/\s*\([^)]*(remaster|live|version|edit|feat|ft)[^)]*\)/gi, '')
    .replace(/\s*-\s*.*(remaster|live|version|mono|stereo).*/gi, '')
    .trim();

  // 1. Try Deezer Search API first (50 requests / 5 seconds limit, returns 30s MP3)
  try {
    const dzQuery = encodeURIComponent(`${artist} ${cleanTitle || title}`);
    const dzRes = await fetch(
      `https://api.deezer.com/search?q=${dzQuery}&limit=4`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
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
        previewUrlCache.set(cacheKey, match.preview);
        return match.preview;
      }
    }
  } catch {
    // Continue to iTunes fallback
  }

  // 2. Try iTunes Search API as fallback
  try {
    const itQuery = encodeURIComponent(`${artist} ${cleanTitle || title}`);
    const itRes = await fetch(
      `https://itunes.apple.com/search?term=${itQuery}&entity=song&limit=3`,
      { headers: { Accept: 'application/json' } }
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
        previewUrlCache.set(cacheKey, match.previewUrl);
        return match.previewUrl;
      }
    }
  } catch {
    // Ignore
  }

  // 3. Final fallback: any popular preview from the same artist on Deezer so the artist's sound still plays
  try {
    const artistOnlyQuery = encodeURIComponent(artist);
    const dzArtistRes = await fetch(
      `https://api.deezer.com/search?q=${artistOnlyQuery}&limit=3`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (dzArtistRes.ok) {
      const dzArtistData = (await dzArtistRes.json()) as {
        data?: { preview?: string }[];
      };
      const firstWithPreview = dzArtistData.data?.find((d) => Boolean(d.preview));
      if (firstWithPreview?.preview) {
        return firstWithPreview.preview;
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get('artist') || '';
  const title = searchParams.get('title') || '';
  const fallbackUrl = searchParams.get('fallbackUrl') || undefined;

  if (!artist && !title && !fallbackUrl) {
    return new NextResponse('Missing artist or title', { status: 400 });
  }

  const audioUrl = await resolveExternalPreviewUrl(artist, title, fallbackUrl);
  if (!audioUrl) {
    return new NextResponse('Preview not found', { status: 404 });
  }

  try {
    const audioRes = await fetch(audioUrl, { cache: 'no-store' });
    if (!audioRes.ok) {
      previewUrlCache.delete(
        `${artist.toLowerCase().trim()}::${title.toLowerCase().trim()}`
      );
      return new NextResponse('Upstream audio unavailable', { status: 502 });
    }

    const arrayBuffer = await audioRes.arrayBuffer();
    const contentType =
      audioRes.headers.get('content-type') || 'audio/mpeg';

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new NextResponse('Failed to stream audio preview', { status: 500 });
  }
}
