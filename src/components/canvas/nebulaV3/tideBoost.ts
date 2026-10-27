import type { NebulaRelation } from '../../../lib/layout/nebulaLayout';

/**
 * Tide boost (Nebulosas v3 · M7.5): while a placed bridge song plays, the tides of its collision
 * speed up with the audio energy and glow a little brighter.
 */

export const TIDE_BOOST_MAX = 2.5; // speed = 1 + 2.5·energy → up to 3.5×
export const TIDE_GLOW_MAX = 0.6;

export interface TideBoostTarget {
  rid: number; // index in collisionRelations(layout), -1 = none
  speed: number; // tide speed multiplier, ≥ 1
  glow: number; // extra alpha, 0..TIDE_GLOW_MAX
}

/** Target boost for the playing track. `relations` must be collisionRelations(layout). */
export function tideBoostTarget(
  playingTrackId: string | null,
  isPlaying: boolean,
  relations: NebulaRelation[],
  energy: number
): TideBoostTarget {
  if (!playingTrackId || !isPlaying) return { rid: -1, speed: 1, glow: 0 };
  const rid = relations.findIndex((r) => r.bridgeSongIds.includes(playingTrackId));
  if (rid < 0) return { rid: -1, speed: 1, glow: 0 };
  const e = Math.min(1, Math.max(0, energy));
  return { rid, speed: 1 + TIDE_BOOST_MAX * e, glow: TIDE_GLOW_MAX * e };
}

/**
 * Advances the per-collision tide offsets for one frame. Only the boosted collision moves
 * (by delta·(speed − 1)), so offsets are continuous and never reset when the song stops.
 */
export function advanceTideOffsets(offsets: Float32Array, rid: number, speed: number, delta: number): void {
  if (rid < 0 || rid >= offsets.length) return;
  offsets[rid] += Math.max(0, delta) * Math.max(0, speed - 1);
}
