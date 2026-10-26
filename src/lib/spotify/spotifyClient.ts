'use client';

import {
  buildMusicGalaxyFromPayload,
  RawLibraryTrackInput,
} from '../importers/libraryImporter';
import { MusicGalaxyData, SpotifyUserProfile } from '../../types/music';
import { classifyUniversalMusic } from '../music/genreClassifier';

/**
 * Spotify OAuth 2.0 PKCE & Saved Tracks Analyzer (`spotifyClient.ts`).
 *
 * - Authenticates the listener against Spotify Web API using PKCE (`user-library-read`).
 * - Fetches the user's latest 50 Liked Songs (`GET /v1/me/tracks?limit=50`).
 * - Enriches artists with their official Spotify genres & studio portraits (`GET /v1/artists`).
 * - Converts the 50 Liked Songs into a 3D `MusicGalaxyData` starfield using our existing
 *   affinity & logarithmic star sizing model.
 */

export const DEFAULT_SPOTIFY_CLIENT_ID =
  process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || 'e1b079dc0ff644468c043b3d902f627d';

const STORAGE_KEYS = {
  CODE_VERIFIER: 'ymv_spotify_pkce_verifier',
  ACCESS_TOKEN: 'ymv_spotify_access_token',
  TOKEN_EXPIRY: 'ymv_spotify_token_expiry',
  CLIENT_ID: 'ymv_spotify_client_id',
  TRACK_LIMIT: 'ymv_spotify_track_limit',
};

export const SPOTIFY_TRACK_LIMIT_OPTIONS = [50, 150, 300, 500, 1000, 2000, 3000] as const;

export function getStoredTrackLimit(): number {
  if (typeof window === 'undefined') return 150;
  const raw = Number(localStorage.getItem(STORAGE_KEYS.TRACK_LIMIT) || '150');
  if (raw >= 50 && raw <= 3000) return raw;
  return 150;
}

export function setStoredTrackLimit(limit: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(50, Math.min(3000, Math.round(limit)));
  localStorage.setItem(STORAGE_KEYS.TRACK_LIMIT, String(clamped));
}

function generateRandomVerifier(length = 64): string {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  let result = '';
  for (let i = 0; i < length; i++) {
    result += possible[randomValues[i] % possible.length];
  }
  return result;
}

async function computeCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function getRedirectUri(): string {
  if (typeof window !== 'undefined') {
    // Honor current origin/port while normalizing localhost -> 127.0.0.1 for Spotify's loopback rule
    const url = new URL(window.location.origin);
    if (url.hostname === 'localhost') {
      url.hostname = '127.0.0.1';
    }
    return `${url.origin}/callback`;
  }
  return (
    process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI ||
    'http://127.0.0.1:3000/callback'
  );
}

export function getActiveClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
    if (custom && custom.trim()) return custom.trim();
  }
  return DEFAULT_SPOTIFY_CLIENT_ID;
}

export function setCustomClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  }
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiry = Number(localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY) || '0');
  if (!token || (expiry > 0 && Date.now() > expiry)) {
    return null;
  }
  return token;
}

export function clearSpotifySession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
}

/**
 * Initiates the Spotify OAuth 2.0 PKCE redirect flow (`user-library-read`).
 */
export async function startSpotifyLogin(customClientId?: string): Promise<void> {
  if (customClientId && customClientId.trim()) {
    setCustomClientId(customClientId);
  }
  const clientId = getActiveClientId();
  const redirectUri = getRedirectUri();
  const verifier = generateRandomVerifier(64);
  const challenge = await computeCodeChallenge(verifier);

  localStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'user-library-read user-read-private',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchanges the authorization `code` returned at `/callback` for a Bearer access token.
 */
export async function exchangeSpotifyCodeForToken(code: string): Promise<string> {
  const verifier = localStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  if (!verifier) {
    throw new Error(
      'No se encontró el verificador PKCE en esta sesión. Por favor inicia sesión nuevamente desde el mismo origen (127.0.0.1).'
    );
  }

  const clientId = getActiveClientId();
  const redirectUri = getRedirectUri();

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Error al canjear el código con Spotify: ${errText}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const expiryMs = Date.now() + (json.expires_in - 60) * 1000;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, json.access_token);
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiryMs));
  localStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);

  return json.access_token;
}

interface SpotifyApiSavedTrackItem {
  added_at: string;
  track: {
    id: string;
    name: string;
    duration_ms: number;
    popularity?: number;
    preview_url: string | null;
    external_urls?: { spotify?: string };
    album: {
      name: string;
      release_date?: string;
      images?: { url: string; width: number; height: number }[];
    };
    artists: {
      id: string;
      name: string;
      external_urls?: { spotify?: string };
    }[];
  } | null;
}

interface SpotifyApiArtistDetail {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  images?: { url: string; width: number; height: number }[];
  external_urls?: { spotify?: string };
}

// ============================================================================
// Robust API Resilience Layer: Anti-429 Wrapper, Request Queue & Persistent Cache
// ============================================================================

export interface FetchWithRetryOptions extends RequestInit {
  maxRetries?: number;
}

/**
 * 1. Robust fetch wrapper that gracefully handles HTTP 429 (Too Many Requests).
 * - Reads `Retry-After` header (seconds or HTTP-date) and pauses exactly (Retry-After + 1) seconds.
 * - Falls back to Exponential Backoff with Jitter: 2^attempt * 1000ms + random(0, 500ms).
 * - Caps at 4 retries and logs clear console warnings only when 429 rate limits occur.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: FetchWithRetryOptions
): Promise<Response> {
  const maxRetries = init?.maxRetries ?? 4;
  let attempt = 0;

  while (true) {
    const res = await fetch(input, init);

    if (res.status !== 429) {
      return res;
    }

    attempt++;
    if (attempt > maxRetries) {
      console.warn(
        `[API Rate-Limit 429] Agotados los reintentos (${maxRetries}) para: ${input.toString()}`
      );
      return res;
    }

    const retryAfterHeader = res.headers.get('Retry-After');
    let waitMs: number;

    if (retryAfterHeader) {
      const parsedSeconds = Number(retryAfterHeader);
      if (!isNaN(parsedSeconds) && parsedSeconds >= 0) {
        // Pausa exactamente (Retry-After + 1) segundos
        waitMs = (parsedSeconds + 1) * 1000;
      } else {
        const parsedDate = new Date(retryAfterHeader).getTime();
        waitMs = isNaN(parsedDate)
          ? 2000
          : Math.max(1000, parsedDate - Date.now() + 1000);
      }
      console.warn(
        `[API Rate-Limit 429] Retry-After detectado. Pausando ${(waitMs / 1000).toFixed(1)}s antes de reintentar intento ${attempt}/${maxRetries}... (${input.toString()})`
      );
    } else {
      // Backoff Exponencial con Jitter: 2^intento * 1000ms + random(0, 500ms)
      const exponential = Math.pow(2, attempt) * 1000;
      const jitter = Math.floor(Math.random() * 500);
      waitMs = exponential + jitter;
      console.warn(
        `[API Rate-Limit 429] Reintentando intento ${attempt}/${maxRetries} con backoff exponencial (${waitMs}ms)... (${input.toString()})`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/**
 * 2. Concurrency and Rate Limiting Queue (`RequestQueue`).
 * Enforces a maximum of 2 to 3 concurrent requests and a pacing delay of 250ms to 350ms between dispatches.
 */
export class RequestQueue {
  private concurrency: number;
  private delayBetweenMs: number;
  private running = 0;
  private queue: (() => Promise<void>)[] = [];
  private lastDispatchTime = 0;

  constructor(concurrency = 2, delayBetweenMs = 300) {
    this.concurrency = concurrency;
    this.delayBetweenMs = delayBetweenMs;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private processNext(): void {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLast = now - this.lastDispatchTime;
    if (timeSinceLast < this.delayBetweenMs) {
      const wait = this.delayBetweenMs - timeSinceLast;
      setTimeout(() => this.processNext(), wait);
      return;
    }

    const nextTask = this.queue.shift();
    if (!nextTask) return;

    this.running++;
    this.lastDispatchTime = Date.now();

    (async () => {
      try {
        await nextTask();
      } finally {
        this.running--;
        this.processNext();
      }
    })();

    if (this.running < this.concurrency && this.queue.length > 0) {
      setTimeout(() => this.processNext(), this.delayBetweenMs);
    }
  }
}

export const spotifyRequestQueue = new RequestQueue(2, 300);

/**
 * 4. Persistent Cache Storage for Artists and Songs metadata (`localStorage`).
 * Persists artist details across browser sessions with TTL and quota management.
 */
interface CacheWrapper<T> {
  value: T;
  timestamp: number;
  ttlMs: number;
}

const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const persistentArtistCache = {
  prefix: 'ymv_cache_artist_',

  isAvailable(): boolean {
    return typeof window !== 'undefined' || typeof localStorage !== 'undefined';
  },

  get<T>(id: string): T | null {
    if (!this.isAvailable()) return null;
    try {
      const raw = localStorage.getItem(`${this.prefix}${id}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheWrapper<T>;
      if (Date.now() - parsed.timestamp > parsed.ttlMs) {
        localStorage.removeItem(`${this.prefix}${id}`);
        return null;
      }
      console.warn(`[Cache Hit] Recuperado artista ${id} desde caché persistente.`);
      return parsed.value;
    } catch {
      return null;
    }
  },

  set<T>(id: string, value: T, ttlMs = DEFAULT_CACHE_TTL_MS): void {
    if (!this.isAvailable()) return;
    try {
      const entry: CacheWrapper<T> = {
        value,
        timestamp: Date.now(),
        ttlMs,
      };
      localStorage.setItem(`${this.prefix}${id}`, JSON.stringify(entry));
    } catch {
      this.pruneOldEntries();
    }
  },

  getMany<T>(ids: string[]): { hits: Map<string, T>; missing: string[] } {
    const hits = new Map<string, T>();
    const missing: string[] = [];

    for (const id of ids) {
      const cached = this.get<T>(id);
      if (cached) {
        hits.set(id, cached);
      } else {
        missing.push(id);
      }
    }

    return { hits, missing };
  },

  pruneOldEntries(): void {
    if (!this.isAvailable()) return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.slice(0, Math.ceil(keysToRemove.length * 0.25)).forEach((k) => {
        localStorage.removeItem(k);
      });
    } catch {
      // Non-blocking
    }
  },
};

/**
 * Fetches the authenticated listener's profile and their latest N Liked Songs
 * (`GET /v1/me/tracks?limit=50&offset=...` across multiple pages up to `maxTracks`),
 * enriches artist genres & previews, and constructs a 3D `MusicGalaxyData` starfield.
 */
export async function fetchSpotifyLikedSongsGalaxy(
  accessToken: string,
  requestedLimit?: number
): Promise<{
  galaxy: MusicGalaxyData;
  user: SpotifyUserProfile;
  analyzedCount: number;
  totalAvailable: number;
}> {
  const maxTracks = requestedLimit ?? getStoredTrackLimit();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };

  // 1. Fetch user profile with retry
  const meRes = await spotifyRequestQueue.add(() =>
    fetchWithRetry('https://api.spotify.com/v1/me', { headers })
  );
  if (!meRes.ok) {
    if (meRes.status === 401) clearSpotifySession();
    throw new Error(
      `No se pudo obtener tu perfil de Spotify (HTTP ${meRes.status}).`
    );
  }
  const meJson = (await meRes.json()) as {
    id: string;
    display_name?: string;
    product?: string;
    images?: { url: string }[];
  };

  const user: SpotifyUserProfile = {
    id: meJson.id,
    displayName: meJson.display_name || meJson.id,
    avatarUrl: meJson.images?.[0]?.url,
    product: meJson.product,
  };

  // 2. Fetch the first page (offset=0, limit=50) of Liked Songs (Saved Tracks)
  const firstPageRes = await spotifyRequestQueue.add(() =>
    fetchWithRetry('https://api.spotify.com/v1/me/tracks?limit=50&offset=0', { headers })
  );
  if (!firstPageRes.ok) {
    throw new Error(
      `No se pudieron leer tus canciones en "Me gusta" (HTTP ${firstPageRes.status}).`
    );
  }

  const firstPageJson = (await firstPageRes.json()) as {
    items: SpotifyApiSavedTrackItem[];
    total?: number;
  };

  const totalAvailable = firstPageJson.total ?? (firstPageJson.items?.length || 0);
  const allItems: SpotifyApiSavedTrackItem[] = [...(firstPageJson.items || [])];

  // Fetch additional pages of 50 tracks via the concurrency-limited & throttled queue
  const targetTotal = Math.min(maxTracks, totalAvailable);
  if (targetTotal > 50) {
    const offsets: number[] = [];
    for (let offset = 50; offset < targetTotal; offset += 50) {
      offsets.push(offset);
    }

    const pagePromises = offsets.map((offset) =>
      spotifyRequestQueue.add(async () => {
        const res = await fetchWithRetry(
          `https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`,
          { headers }
        );
        if (!res.ok) return [];
        const data = (await res.json()) as { items?: SpotifyApiSavedTrackItem[] };
        return data.items || [];
      })
    );

    const pageResults = await Promise.allSettled(pagePromises);
    pageResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allItems.push(...result.value);
      }
    });
  }

  const validItems = allItems
    .slice(0, maxTracks)
    .filter(
      (item): item is SpotifyApiSavedTrackItem & {
        track: NonNullable<SpotifyApiSavedTrackItem['track']>;
      } => Boolean(item.track && item.track.name && item.track.artists?.length)
    );

  if (validItems.length === 0) {
    throw new Error(
      'Tu cuenta de Spotify no tiene canciones guardadas en "Me gusta" todavía.'
    );
  }

  // 3. Deduplication (Set), Persistent Cache Check & Batching (chunks of up to 50 IDs)
  const uniqueArtistIds = Array.from(
    new Set(
      validItems
        .map((item) => item.track.artists[0]?.id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const artistDetailsMap = new Map<string, SpotifyApiArtistDetail>();

  // Check persistent cache first: only query missing IDs from the network
  const { hits: cachedArtists, missing: missingArtistIds } =
    persistentArtistCache.getMany<SpotifyApiArtistDetail>(uniqueArtistIds);

  cachedArtists.forEach((detail, id) => {
    artistDetailsMap.set(id, detail);
  });

  if (missingArtistIds.length > 0) {
    const artistBatchSize = 50;
    const artistChunks: string[][] = [];
    for (let i = 0; i < missingArtistIds.length; i += artistBatchSize) {
      artistChunks.push(missingArtistIds.slice(i, i + artistBatchSize));
    }

    const batchPromises = artistChunks.map((chunk) =>
      spotifyRequestQueue.add(async () => {
        try {
          const batchRes = await fetchWithRetry(
            `https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`,
            { headers }
          );
          if (batchRes.ok) {
            const batchJson = (await batchRes.json()) as {
              artists?: (SpotifyApiArtistDetail | null)[];
            };
            batchJson.artists?.forEach((detail) => {
              if (detail && detail.id) {
                artistDetailsMap.set(detail.id, detail);
                persistentArtistCache.set(detail.id, detail);
              }
            });
          }
        } catch {
          // Non-fatal
        }
      })
    );

    await Promise.allSettled(batchPromises);
  }

  // 4. Enrich all tracks with canonical musical genres, secondary genres & on-demand 30s audio previews
  const enrichmentMap = new Map<
    string,
    {
      genre: string;
      subgenre?: string;
      secondaryGenre?: string;
      rawGenre: string;
      tags?: string[];
      previewUrl?: string;
    }
  >();

  try {
    const enrichPayload = validItems.map((item, idx) => {
      const primaryArtist = item.track.artists[0];
      const spDetail = primaryArtist?.id
        ? artistDetailsMap.get(primaryArtist.id)
        : undefined;
      return {
        key: `${item.track.id || idx}`,
        title: item.track.name,
        artist: primaryArtist?.name || 'Artista',
        existingGenre: spDetail?.genres?.[0] || '',
        existingSecondaryGenre: spDetail?.genres?.[1] || '',
        existingPreviewUrl: item.track.preview_url || undefined,
      };
    });

    const enrichRes = await fetchWithRetry('/api/enrich-tracks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: enrichPayload }),
    });

    if (enrichRes.ok) {
      const enrichJson = (await enrichRes.json()) as {
        results?: {
          key: string;
          genre: string;
          subgenre?: string;
          secondaryGenre?: string;
          rawGenre: string;
          tags?: string[];
          previewUrl?: string;
        }[];
      };
      enrichJson.results?.forEach((r) => {
        enrichmentMap.set(r.key, r);
      });
    }
  } catch {
    // Non-fatal fallback if local API is unreachable
  }

  // Count how many liked songs belong to each primary artist to weight affinity & star size
  const artistLikedCount = new Map<string, number>();
  const artistPrimaryGenre = new Map<string, string>();
  const genreFrequency = new Map<string, number>();

  validItems.forEach((item, idx) => {
    const primaryArtist = item.track.artists[0]?.name || 'Artista';
    artistLikedCount.set(
      primaryArtist,
      (artistLikedCount.get(primaryArtist) || 0) + 1
    );

    const key = `${item.track.id || idx}`;
    const enriched = enrichmentMap.get(key);
    const artistId = item.track.artists[0]?.id;
    const details = artistId ? artistDetailsMap.get(artistId) : undefined;
    const allArtistGenres =
      details?.genres?.join(', ') || enriched?.rawGenre || '';

    const fastClass = classifyUniversalMusic(
      primaryArtist,
      allArtistGenres,
      item.track.name
    );

    const candidateGenre = (
      enriched?.genre ||
      fastClass.genre ||
      details?.genres?.[0] ||
      'POP INTERNACIONAL & SYNTH-POP'
    ).toUpperCase();

    if (!artistPrimaryGenre.has(primaryArtist)) {
      artistPrimaryGenre.set(primaryArtist, candidateGenre);
    }
    const assignedArtistGenre =
      artistPrimaryGenre.get(primaryArtist) || candidateGenre;
    genreFrequency.set(
      assignedArtistGenre,
      (genreFrequency.get(assignedArtistGenre) || 0) + 1
    );
  });

  // Dynamic constellations: scale smoothly to accommodate any number of distinct musical genres
  const topGenres = Array.from(genreFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  const rawTracks: RawLibraryTrackInput[] = validItems.map((item, idx) => {
    const track = item.track;
    const primaryArtist = track.artists[0];
    const collaborators = track.artists
      .slice(1)
      .map((a) => a.name)
      .filter(Boolean);
    const artistDetail = primaryArtist?.id
      ? artistDetailsMap.get(primaryArtist.id)
      : undefined;

    const key = `${track.id || idx}`;
    const enriched = enrichmentMap.get(key);

    const artistGenresStr =
      artistDetail?.genres?.join(', ') || enriched?.rawGenre || '';
    const fallbackClass = classifyUniversalMusic(
      primaryArtist.name,
      artistGenresStr,
      track.name
    );

    const artistGenre =
      artistPrimaryGenre.get(primaryArtist.name) ||
      enriched?.genre ||
      fallbackClass.genre;

    const matchedGenre = artistGenre;

    const candidateSubgenre =
      enriched?.subgenre ||
      fallbackClass.genre ||
      'General';

    const candidateTags =
      enriched?.tags && enriched.tags.length > 0
        ? enriched.tags
        : candidateSubgenre
        ? [candidateSubgenre]
        : [matchedGenre];

    const likedCountForArtist =
      artistLikedCount.get(primaryArtist.name) || 1;
    // Recency bonus (idx 0 = most recently liked song) + artist frequency + track popularity
    const recencyScore = 1 - idx / Math.max(1, validItems.length);
    const freqBonus = Math.min(0.18, (likedCountForArtist - 1) * 0.05);
    const popScore = (track.popularity ?? 75) / 100;
    const computedAffinity = Math.min(
      0.99,
      Math.max(0.66, 0.64 + recencyScore * 0.18 + popScore * 0.12 + freqBonus)
    );

    const releaseYear = track.album.release_date?.slice(0, 4) || '';
    const albumLabel = releaseYear
      ? `${track.album.name} (${releaseYear})`
      : track.album.name;

    const addedDate = item.added_at ? item.added_at.slice(0, 10) : 'Spotify';
    const rawStyleLabel =
      enriched?.rawGenre ||
      artistDetail?.genres?.slice(0, 2).join(', ') ||
      matchedGenre;

    const fallbackStreamUrl = `/api/track-preview?artist=${encodeURIComponent(
      primaryArtist.name
    )}&title=${encodeURIComponent(track.name)}${
      track.preview_url
        ? `&fallbackUrl=${encodeURIComponent(track.preview_url)}`
        : ''
    }`;

    return {
      title: track.name,
      artist: primaryArtist.name,
      genre: matchedGenre,
      subgenre: candidateSubgenre,
      tags: candidateTags,
      secondaryGenre: enriched?.secondaryGenre,
      collaborators,
      album: albumLabel,
      durationSec: Math.max(1, Math.round(track.duration_ms / 1000)),
      playCount: likedCountForArtist * 28,
      affinity: Number(computedAffinity.toFixed(2)),
      origin: `Guardado en Spotify · ${addedDate}`,
      bio: `Estrella de tus "Me gusta" en Spotify (${likedCountForArtist} ${
        likedCountForArtist === 1 ? 'pista guardada' : 'pistas guardadas'
      }). Estilo: ${candidateSubgenre} · ${rawStyleLabel}.`,
      previewUrl: enriched?.previewUrl || fallbackStreamUrl,
      imageUrl: track.album.images?.[0]?.url,
      artistImageUrl:
        artistDetail?.images?.[0]?.url || track.album.images?.[0]?.url,
      spotifyUrl: track.external_urls?.spotify,
      artistSpotifyUrl:
        artistDetail?.external_urls?.spotify ||
        primaryArtist.external_urls?.spotify,
    };
  });

  const galaxy = buildMusicGalaxyFromPayload({
    profileName: `Spotify · ${user.displayName} (${validItems.length} Me gusta)`,
    source: 'spotify',
    tracks: rawTracks,
  });

  return {
    galaxy,
    user,
    analyzedCount: validItems.length,
    totalAvailable,
  };
}
