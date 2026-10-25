import { NextRequest, NextResponse } from 'next/server';

interface EnrichTrackRequestItem {
  key: string;
  title: string;
  artist: string;
  existingGenre?: string;
  existingPreviewUrl?: string;
}

interface EnrichTrackResultItem {
  key: string;
  genre: string;
  rawGenre: string;
  previewUrl?: string;
  artistImageUrl?: string;
}

const memoryCache = new Map<string, EnrichTrackResultItem>();

/**
 * Maps raw genre labels from Spotify / Apple Music / iTunes into clean,
 * canonical musical constellation names so the 3D galaxy groups artists
 * into meaningful musical genres instead of a generic "Favoritos" bucket.
 */
function normalizeMacroGenre(rawGenre: string, artistName: string): string {
  const g = rawGenre.trim().toLowerCase();
  const a = artistName.trim().toLowerCase();

  // 1. Urbano / Reggaetón / Trap Latino
  if (
    g.includes('urbano') ||
    g.includes('reggaeton') ||
    g.includes('reggaetón') ||
    g.includes('trap') ||
    g.includes('dembow') ||
    g.includes('rkt')
  ) {
    return 'URBANO & TRAP LATINO';
  }

  // 2. Rock Argentino / Rock en Español / Latin Rock / Latin Alternative
  if (
    g.includes('rock y alternativo') ||
    g.includes('rock latino') ||
    g.includes('argentine rock') ||
    g.includes('latin alternative') ||
    g.includes('ska') ||
    a.includes('soda stereo') ||
    a.includes('cerati') ||
    a.includes('spinetta') ||
    a.includes('charly garc') ||
    a.includes('patricio rey') ||
    a.includes('babasónicos') ||
    a.includes('divididos') ||
    a.includes('la renga') ||
    a.includes('callejeros') ||
    a.includes('ciro') ||
    a.includes('attaque') ||
    a.includes('intoxicados') ||
    a.includes('viejas locas') ||
    a.includes('piojos') ||
    a.includes('vela puerca') ||
    a.includes('no te va gustar') ||
    a.includes('cuarteto de nos') ||
    a.includes('wos') ||
    a.includes('fito paez') ||
    a.includes('andrés calamaro')
  ) {
    return 'ROCK NACIONAL & LATINO';
  }

  // 3. Electrónica / Dance / House / Techno / Synthwave / IDM
  if (
    g.includes('electronic') ||
    g.includes('electrónica') ||
    g.includes('dance') ||
    g.includes('house') ||
    g.includes('techno') ||
    g.includes('trance') ||
    g.includes('edm') ||
    g.includes('dubstep') ||
    g.includes('drum') ||
    g.includes('ambient') ||
    g.includes('synth') ||
    g.includes('idm') ||
    g.includes('breakbeat')
  ) {
    return 'ELECTRÓNICA & DANCE';
  }

  // 4. Hip-Hop / Rap / R&B / Soul / Funk
  if (
    g.includes('hip-hop') ||
    g.includes('hip hop') ||
    g.includes('rap') ||
    g.includes('r&b') ||
    g.includes('soul') ||
    g.includes('funk') ||
    g.includes('neo-soul') ||
    g.includes('disco')
  ) {
    return 'HIP-HOP, R&B & SOUL';
  }

  // 5. Metal / Hard Rock / Punk / Grunge
  if (
    g.includes('metal') ||
    g.includes('hard rock') ||
    g.includes('punk') ||
    g.includes('grunge') ||
    g.includes('hardcore') ||
    g.includes('emo')
  ) {
    return 'METAL, PUNK & HARD ROCK';
  }

  // 6. Indie / Alternative / Dream Pop / Shoegaze
  if (
    g.includes('alternative') ||
    g.includes('alternativo') ||
    g.includes('indie') ||
    g.includes('shoegaze') ||
    g.includes('dream pop') ||
    g.includes('new wave') ||
    g.includes('post-punk') ||
    g.includes('britpop')
  ) {
    return 'INDIE & ALTERNATIVO';
  }

  // 7. Rock Clásico & General
  if (g.includes('rock') || g.includes('psychedelic')) {
    return 'ROCK & PSICODELIA';
  }

  // 8. Latin / Cumbia / Salsa / Bachata / Regional / Folklore
  if (
    g.includes('latin') ||
    g.includes('latino') ||
    g.includes('cumbia') ||
    g.includes('salsa') ||
    g.includes('bachata') ||
    g.includes('tropical') ||
    g.includes('folklore') ||
    g.includes('tango') ||
    g.includes('regional') ||
    g.includes('flamenco') ||
    g.includes('mpb') ||
    g.includes('bossa')
  ) {
    return 'RITMOS LATINOS & FOLKLORE';
  }

  // 9. Jazz / Blues / Clásica / Instrumental / Soundtrack
  if (
    g.includes('jazz') ||
    g.includes('blues') ||
    g.includes('classical') ||
    g.includes('clásica') ||
    g.includes('soundtrack') ||
    g.includes('score') ||
    g.includes('instrumental') ||
    g.includes('anime') ||
    g.includes('lo-fi')
  ) {
    return 'JAZZ, SOUNDTRACK & INSTRUMENTAL';
  }

  // 10. Folk / Country / Singer-Songwriter / Acústico
  if (
    g.includes('folk') ||
    g.includes('country') ||
    g.includes('singer') ||
    g.includes('acoustic') ||
    g.includes('cantautor')
  ) {
    return 'FOLK & CANTAUTOR';
  }

  // 11. Pop & Synth-Pop
  if (g.includes('pop') || g.includes('k-pop') || g.includes('j-pop')) {
    return 'POP & SYNTH-POP';
  }

  if (g.length > 1 && g !== 'music' && g !== 'música') {
    return rawGenre.toUpperCase();
  }

  return 'INDIE & ALTERNATIVO';
}

async function lookupTrackMetadata(
  item: EnrichTrackRequestItem
): Promise<EnrichTrackResultItem> {
  const cacheKey = `${item.artist.toLowerCase()}::${item.title.toLowerCase()}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      key: item.key,
      previewUrl: item.existingPreviewUrl || cached.previewUrl,
    };
  }

  let rawGenre = item.existingGenre || '';
  let previewUrl = item.existingPreviewUrl;

  try {
    const query = encodeURIComponent(`${item.artist} ${item.title}`);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&entity=song&limit=3`,
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 86400 },
      }
    );

    if (res.ok) {
      const data = (await res.json()) as {
        results?: {
          artistName?: string;
          trackName?: string;
          primaryGenreName?: string;
          previewUrl?: string;
        }[];
      };

      const results = data.results || [];
      const artistLower = item.artist.toLowerCase();
      const bestMatch =
        results.find((r) =>
          r.artistName?.toLowerCase().includes(artistLower)
        ) || results[0];

      if (bestMatch) {
        if (!rawGenre && bestMatch.primaryGenreName) {
          rawGenre = bestMatch.primaryGenreName;
        }
        if (!previewUrl && bestMatch.previewUrl) {
          previewUrl = bestMatch.previewUrl;
        }
      }
    }

    // If song search didn't return a genre, try artist-only search
    if (!rawGenre) {
      const artistQuery = encodeURIComponent(item.artist);
      const artistRes = await fetch(
        `https://itunes.apple.com/search?term=${artistQuery}&entity=musicArtist&limit=1`,
        {
          headers: { Accept: 'application/json' },
          next: { revalidate: 86400 },
        }
      );
      if (artistRes.ok) {
        const artistData = (await artistRes.json()) as {
          results?: { primaryGenreName?: string }[];
        };
        if (artistData.results?.[0]?.primaryGenreName) {
          rawGenre = artistData.results[0].primaryGenreName;
        }
      }
    }
  } catch {
    // Graceful fallback if external lookup times out
  }

  const normalizedGenre = normalizeMacroGenre(rawGenre, item.artist);
  const result: EnrichTrackResultItem = {
    key: item.key,
    genre: normalizedGenre,
    rawGenre: rawGenre || normalizedGenre,
    previewUrl,
  };

  memoryCache.set(cacheKey, result);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tracks?: EnrichTrackRequestItem[] };
    const tracks = Array.isArray(body.tracks) ? body.tracks.slice(0, 60) : [];

    if (tracks.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process in concurrent batches of 10 so 50 tracks finish in ~400-700ms
    const batchSize = 10;
    const enrichedResults: EnrichTrackResultItem[] = [];

    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((item) => lookupTrackMetadata(item))
      );
      enrichedResults.push(...batchResults);
    }

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
