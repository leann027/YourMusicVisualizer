import { NextRequest, NextResponse } from 'next/server';
import {
  classifyUniversalMusic,
  GenreClassification,
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
  secondaryGenre?: string;
  rawGenre: string;
  previewUrl: string;
}

const artistClassificationCache = new Map<string, GenreClassification>();

/**
 * High-Speed Classification & Metadata Enrichment Resolver (`/api/enrich-tracks`).
 *
 * Uses the instant universal classifier (0ms) first. If an artist is untagged,
 * queries Deezer's high-limit API (`50 req / 5s`) with a 2.2s timeout to obtain official
 * album genres, and passes them to `classifyUniversalMusic` for canonical clustering.
 */
async function resolveArtistClassification(
  artistName: string,
  existingGenre?: string,
  _existingSecondary?: string
): Promise<GenreClassification> {
  const artistKey = artistName.trim().toLowerCase();
  const cached = artistClassificationCache.get(artistKey);
  if (cached) return cached;

  // 1. Instant 0ms classification first (matches 400+ artists, Japanese CJK, or keywords)
  const initial = classifyUniversalMusic(artistName, existingGenre, undefined);
  if (
    existingGenre ||
    initial.rawGenre !== initial.genre ||
    initial.genre === 'J-POP, J-ROCK & ANIME'
  ) {
    artistClassificationCache.set(artistKey, initial);
    return initial;
  }

  // 2. Fast timeout lookup to Deezer for un-tagged unknown artists
  let fetchedGenre = '';
  try {
    const dzRes = await fetch(
      `https://api.deezer.com/search?q=artist:"${encodeURIComponent(
        artistName
      )}"&limit=1`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2200),
        next: { revalidate: 86400 },
      }
    );
    if (dzRes.ok) {
      const dzData = (await dzRes.json()) as {
        data?: { album?: { id?: number } }[];
      };
      const albumId = dzData.data?.[0]?.album?.id;
      if (albumId) {
        const albumRes = await fetch(
          `https://api.deezer.com/album/${albumId}`,
          {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(2000),
            next: { revalidate: 86400 },
          }
        );
        if (albumRes.ok) {
          const albumJson = (await albumRes.json()) as {
            genres?: { data?: { name?: string }[] };
          };
          const gList = albumJson.genres?.data || [];
          if (gList[0]?.name) fetchedGenre = gList[0].name;
        }
      }
    }
  } catch {
    // Non-blocking: continue to fallback
  }

  const finalResult = fetchedGenre
    ? classifyUniversalMusic(artistName, fetchedGenre, undefined)
    : initial;

  artistClassificationCache.set(artistKey, finalResult);
  return finalResult;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tracks?: EnrichTrackRequestItem[] };
    const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 3000) : [];

    if (tracks.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 1. Deduplicate by unique artist so 500 tracks only classify ~80-140 unique artists
    const uniqueArtistsMap = new Map<
      string,
      { artist: string; existingGenre?: string; existingSecondaryGenre?: string }
    >();

    for (const t of tracks) {
      const aKey = t.artist.trim().toLowerCase();
      if (!uniqueArtistsMap.has(aKey)) {
        uniqueArtistsMap.set(aKey, {
          artist: t.artist,
          existingGenre: t.existingGenre,
          existingSecondaryGenre: t.existingSecondaryGenre,
        });
      }
    }

    const uniqueArtists = Array.from(uniqueArtistsMap.values());
    const batchSize = 25;

    for (let i = 0; i < uniqueArtists.length; i += batchSize) {
      const batch = uniqueArtists.slice(i, i + batchSize);
      await Promise.all(
        batch.map((item) =>
          resolveArtistClassification(
            item.artist,
            item.existingGenre,
            item.existingSecondaryGenre
          )
        )
      );
    }

    // 2. Map all tracks to their classified genres + on-demand /api/track-preview streaming URL
    const enrichedResults: EnrichTrackResultItem[] = tracks.map((item) => {
      const aKey = item.artist.trim().toLowerCase();
      const classification =
        artistClassificationCache.get(aKey) ||
        classifyUniversalMusic(item.artist, item.existingGenre || '', item.title);

      const previewParams = new URLSearchParams({
        artist: item.artist,
        title: item.title,
      });
      if (item.existingPreviewUrl) {
        previewParams.set('fallbackUrl', item.existingPreviewUrl);
      }

      return {
        key: item.key,
        genre: classification.genre,
        secondaryGenre: classification.secondaryGenre,
        rawGenre: classification.rawGenre,
        previewUrl: `/api/track-preview?${previewParams.toString()}`,
      };
    });

    return NextResponse.json({ results: enrichedResults });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Error enriqueciendo géneros musicales',
        results: [],
      },
      { status: 500 }
    );
  }
}
