'use client';

import {
  buildMusicGalaxyFromPayload,
  RawLibraryTrackInput,
} from '../importers/libraryImporter';
import { MusicGalaxyData, SpotifyUserProfile } from '../../types/music';

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

export const SPOTIFY_TRACK_LIMIT_OPTIONS = [50, 150, 300, 500] as const;

export function getStoredTrackLimit(): number {
  if (typeof window === 'undefined') return 150;
  const raw = Number(localStorage.getItem(STORAGE_KEYS.TRACK_LIMIT) || '150');
  if (raw >= 50 && raw <= 500) return raw;
  return 150;
}

export function setStoredTrackLimit(limit: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(50, Math.min(500, Math.round(limit)));
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

  // 1. Fetch user profile
  const meRes = await fetch('https://api.spotify.com/v1/me', { headers });
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
  const firstPageRes = await fetch(
    'https://api.spotify.com/v1/me/tracks?limit=50&offset=0',
    { headers }
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

  // Fetch additional pages of 50 tracks in parallel if requestedLimit > 50 and user has more tracks
  const targetTotal = Math.min(maxTracks, totalAvailable);
  if (targetTotal > 50) {
    const offsets: number[] = [];
    for (let offset = 50; offset < targetTotal; offset += 50) {
      offsets.push(offset);
    }

    const pageResponses = await Promise.allSettled(
      offsets.map(async (offset) => {
        const res = await fetch(
          `https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`,
          { headers }
        );
        if (!res.ok) return [];
        const data = (await res.json()) as { items?: SpotifyApiSavedTrackItem[] };
        return data.items || [];
      })
    );

    pageResponses.forEach((result) => {
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

  // 3. Collect unique primary artist IDs (up to 16) for individual /v1/artists/{id} portrait/genre lookup
  // Note: Spotify Dev Mode restricts batch /v1/artists?ids=..., so we query individual artist endpoints
  // in parallel AND enrich all 50 tracks via our server-side /api/enrich-tracks catalog endpoint.
  const uniqueArtistIds = Array.from(
    new Set(
      validItems
        .map((item) => item.track.artists[0]?.id)
        .filter((id): id is string => Boolean(id))
    )
  ).slice(0, 16);

  const artistDetailsMap = new Map<string, SpotifyApiArtistDetail>();
  if (uniqueArtistIds.length > 0) {
    await Promise.allSettled(
      uniqueArtistIds.map(async (artistId) => {
        const res = await fetch(
          `https://api.spotify.com/v1/artists/${artistId}`,
          { headers }
        );
        if (res.ok) {
          const detail = (await res.json()) as SpotifyApiArtistDetail;
          if (detail && detail.id) {
            artistDetailsMap.set(detail.id, detail);
          }
        }
      })
    );
  }

  // 4. Enrich all 50 tracks with canonical musical genres & fallback 30s audio previews
  const enrichmentMap = new Map<
    string,
    { genre: string; rawGenre: string; previewUrl?: string }
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
        existingPreviewUrl: item.track.preview_url || undefined,
      };
    });

    const enrichRes = await fetch('/api/enrich-tracks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: enrichPayload }),
    });

    if (enrichRes.ok) {
      const enrichJson = (await enrichRes.json()) as {
        results?: {
          key: string;
          genre: string;
          rawGenre: string;
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

    const candidateGenre = (
      enriched?.genre ||
      details?.genres?.[0] ||
      'INDIE & ALTERNATIVO'
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

  // Keep up to 8 distinct musical genre constellations so the galaxy is rich & well-separated
  const topGenres = Array.from(genreFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([g]) => g);

  const rawTracks: RawLibraryTrackInput[] = validItems.map((item, idx) => {
    const track = item.track;
    const primaryArtist = track.artists[0];
    const artistDetail = primaryArtist?.id
      ? artistDetailsMap.get(primaryArtist.id)
      : undefined;

    const key = `${track.id || idx}`;
    const enriched = enrichmentMap.get(key);

    const artistGenre =
      artistPrimaryGenre.get(primaryArtist.name) ||
      enriched?.genre ||
      'INDIE & ALTERNATIVO';

    const matchedGenre = topGenres.includes(artistGenre)
      ? artistGenre
      : topGenres[idx % Math.max(1, topGenres.length)] || artistGenre;

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

    return {
      title: track.name,
      artist: primaryArtist.name,
      genre: matchedGenre,
      album: albumLabel,
      durationSec: Math.max(1, Math.round(track.duration_ms / 1000)),
      playCount: likedCountForArtist * 28,
      affinity: Number(computedAffinity.toFixed(2)),
      origin: `Guardado en Spotify · ${addedDate}`,
      bio: `Estrella de tus "Me gusta" en Spotify (${likedCountForArtist} ${
        likedCountForArtist === 1 ? 'pista guardada' : 'pistas guardadas'
      }). Estilo: ${rawStyleLabel}.`,
      previewUrl:
        track.preview_url || enriched?.previewUrl || undefined,
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
