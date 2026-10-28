import { MusicGalaxyData, MusicNode } from '../../../types/music';
import type { CollisionSelection } from '../../../store/useGalaxyStore';

/**
 * Store state → NebulaField uniform targets (M6.3). Pure, so it is testable in node;
 * NebulaField eases uFocusAmt / uArtistAmt towards these targets every frame.
 */

/** Brightness slider default: maps to gain 1. */
export const DEFAULT_STELLAR_BRIGHTNESS = 0.25;

/** Field particle count the gas look was calibrated at in M6.4 (35k × 0.92); fewer particles get more gain. */
const REFERENCE_PARTICLES = 32200;

export interface NebulaFieldTargetInput {
  data: MusicGalaxyData;
  genreIds: string[]; // genreIds[gid] from buildNebulaFieldGeometry
  particleCount: number; // particles in the field geometry
  stellarBrightness: number;
  minAffinityFilter: number;
  selectedSectorId: string | null;
  selectedNode: MusicNode | null;
  cameraMode: string;
  playingTrackId: string | null;
  selectedCollision?: CollisionSelection | null;
}

export interface NebulaFieldTargets {
  gain: number;
  minAffinity: number;
  focusGid: number;
  focusGid2: number; // second genre of a focused collision, else -1
  focusAmt: number;
  artistAid: number;
  artistAmt: number;
  playingGid: number;
}

export function computeNebulaFieldTargets(input: NebulaFieldTargetInput): NebulaFieldTargets {
  const { data, genreIds } = input;
  const gidOf = (genreId: string | null | undefined) => (genreId ? genreIds.indexOf(genreId) : -1);

  const focusGid = gidOf(input.selectedSectorId);
  const focusAmt = focusGid >= 0 && input.cameraMode !== 'galaxy' ? 1 : 0;
  const collision = input.cameraMode === 'collision' ? input.selectedCollision : null;
  const focusGid2 = collision ? gidOf(collision.a === input.selectedSectorId ? collision.b : collision.a) : -1;

  // aid follows the order of artists inside their genre, as in the geometry
  let artistAid = -1;
  const node = input.selectedNode;
  if (node?.type === 'artist' && gidOf(node.genreId) === focusGid) {
    artistAid = data.artists
      .filter((a) => a.genreId === node.genreId)
      .findIndex((a) => a.id === node.id);
  }
  const artistAmt = artistAid >= 0 && input.cameraMode === 'artist' ? 1 : 0;

  const playing = input.playingTrackId ? data.songs.find((s) => s.id === input.playingTrackId) : undefined;

  const gain =
    (input.stellarBrightness / DEFAULT_STELLAR_BRIGHTNESS) *
    Math.sqrt(REFERENCE_PARTICLES / Math.max(1, input.particleCount));

  return {
    gain,
    minAffinity: input.minAffinityFilter,
    focusGid,
    focusGid2,
    focusAmt,
    artistAid,
    artistAmt,
    playingGid: gidOf(playing?.genreId),
  };
}
