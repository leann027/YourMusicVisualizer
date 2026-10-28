import type { RawLibraryTrackInput } from '../importers/libraryImporter';
import { artistTagProfile, songTagProfile, type RawTag } from '../music/tagModel';

/**
 * Pure conversion of Spotify saved tracks + Last.fm tags into importer input (A4). No genre is
 * decided here: the importer clusters the whole library from `spotifyGenres`, `artistTags` and
 * `trackTags` (dynamicGenres), so there is no per-track classification and no random fallback.
 */

export interface SpotifyApiSavedTrackItem {
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

export type ValidSavedTrackItem = SpotifyApiSavedTrackItem & {
  track: NonNullable<SpotifyApiSavedTrackItem['track']>;
};

export interface SpotifyApiArtistDetail {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  images?: { url: string; width: number; height: number }[];
  external_urls?: { spotify?: string };
}

/** What /api/enrich-tracks returns per track. */
export interface TrackEnrichment {
  trackTags?: RawTag[];
  artistTags?: RawTag[];
  previewUrl?: string;
}

export const MAX_NODE_TAGS = 6;

export const trackKey = (item: ValidSavedTrackItem, idx: number) => `${item.track.id || idx}`;

/** Request body items for /api/enrich-tracks. */
export function buildEnrichRequest(items: ValidSavedTrackItem[]) {
  return items.map((item, idx) => ({
    key: trackKey(item, idx),
    title: item.track.name,
    artist: item.track.artists[0]?.name || 'Artista',
    existingPreviewUrl: item.track.preview_url || undefined,
  }));
}

/** "post-punk" → "Post-Punk", "r&b" → "R&B". */
function styleLabel(tag: string): string {
  return tag.replace(/(^|[\s\-&])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function spotifyTracksToRawInput(
  items: ValidSavedTrackItem[],
  artistDetails: Map<string, SpotifyApiArtistDetail>,
  enrichment: Map<string, TrackEnrichment>
): RawLibraryTrackInput[] {
  // Count how many liked songs belong to each primary artist to weight affinity & star size
  const artistLikedCount = new Map<string, number>();
  items.forEach((item) => {
    const name = item.track.artists[0]?.name || 'Artista';
    artistLikedCount.set(name, (artistLikedCount.get(name) || 0) + 1);
  });

  return items.map((item, idx) => {
    const track = item.track;
    const primaryArtist = track.artists[0];
    const artistName = primaryArtist?.name || 'Artista';
    const collaborators = track.artists
      .slice(1)
      .map((a) => a.name)
      .filter(Boolean);
    const artistDetail = primaryArtist?.id ? artistDetails.get(primaryArtist.id) : undefined;
    const enriched = enrichment.get(trackKey(item, idx));

    const spotifyGenres = artistDetail?.genres ?? [];
    const trackTags = enriched?.trackTags ?? [];
    const artistTags = enriched?.artistTags ?? [];

    // Display only: the song's strongest tag, else the artist's (the nebula comes from the importer)
    const songProfile = songTagProfile(trackTags);
    const artistProfile = artistTagProfile({ spotifyGenres, artistTags });
    const topTag = songProfile[0]?.tag ?? artistProfile[0]?.tag;
    const subgenre = topTag ? styleLabel(topTag) : undefined;
    const nodeTags = [...new Set([...songProfile, ...artistProfile].map((t) => t.tag))].slice(0, MAX_NODE_TAGS);

    const likedCountForArtist = artistLikedCount.get(artistName) || 1;
    // Recency bonus (idx 0 = most recently liked song) + artist frequency + track popularity
    const recencyScore = 1 - idx / Math.max(1, items.length);
    const freqBonus = Math.min(0.18, (likedCountForArtist - 1) * 0.05);
    const popScore = (track.popularity ?? 75) / 100;
    const computedAffinity = Math.min(
      0.99,
      Math.max(0.66, 0.64 + recencyScore * 0.18 + popScore * 0.12 + freqBonus)
    );

    const releaseYear = track.album.release_date?.slice(0, 4) || '';
    const albumLabel = releaseYear ? `${track.album.name} (${releaseYear})` : track.album.name;

    const addedDate = item.added_at ? item.added_at.slice(0, 10) : 'Spotify';
    const styleText = [subgenre, spotifyGenres.slice(0, 2).join(', ')].filter(Boolean).join(' · ');

    const fallbackStreamUrl = `/api/track-preview?artist=${encodeURIComponent(
      artistName
    )}&title=${encodeURIComponent(track.name)}${
      track.preview_url ? `&fallbackUrl=${encodeURIComponent(track.preview_url)}` : ''
    }`;

    return {
      title: track.name,
      artist: artistName,
      subgenre,
      tags: nodeTags,
      spotifyGenres,
      artistTags,
      trackTags,
      collaborators,
      album: albumLabel,
      durationSec: Math.max(1, Math.round(track.duration_ms / 1000)),
      playCount: likedCountForArtist * 28,
      affinity: Number(computedAffinity.toFixed(2)),
      origin: `Guardado en Spotify · ${addedDate}`,
      bio: `Estrella de tus "Me gusta" en Spotify (${likedCountForArtist} ${
        likedCountForArtist === 1 ? 'pista guardada' : 'pistas guardadas'
      }).${styleText ? ` Estilo: ${styleText}.` : ''}`,
      previewUrl: enriched?.previewUrl || fallbackStreamUrl,
      imageUrl: track.album.images?.[0]?.url,
      artistImageUrl: artistDetail?.images?.[0]?.url || track.album.images?.[0]?.url,
      spotifyUrl: track.external_urls?.spotify,
      artistSpotifyUrl: artistDetail?.external_urls?.spotify || primaryArtist?.external_urls?.spotify,
    };
  });
}
