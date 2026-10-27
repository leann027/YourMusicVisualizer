import type { NebulaLayoutResult, NebulaRelation } from './nebulaLayout';

/**
 * View models for the collision HUD and markers (Nebulosas v3 · M7.4). Pure, testable in node.
 */

type Vec3 = [number, number, number];

export interface GenreCollisionEntry {
  a: string;
  b: string;
  otherGenreId: string;
  otherName: string;
  otherColor: string;
  sharedSongs: number;
  strength: number;
}

/** Collisions of one genre, strongest first. */
export function genreCollisions(layout: NebulaLayoutResult, genreId: string): GenreCollisionEntry[] {
  const genreOf = new Map(layout.data.genres.map((g) => [g.id, g]));
  return layout.relations
    .filter((r) => r.a === genreId || r.b === genreId)
    .map((r) => {
      const other = genreOf.get(r.a === genreId ? r.b : r.a)!;
      return {
        a: r.a,
        b: r.b,
        otherGenreId: other.id,
        otherName: other.name,
        otherColor: other.color,
        sharedSongs: r.sharedSongs,
        strength: r.strength,
      };
    })
    .sort((x, y) => y.strength - x.strength || x.otherGenreId.localeCompare(y.otherGenreId));
}

export interface CollisionCardModel {
  title: string;
  genres: { id: string; name: string; color: string }[];
  sharedSongs: number;
  strength: number;
  bridgeSongs: { songId: string; title: string; artistName: string; genreId: string }[];
}

/** Content of the collision card for the selected pair, or null if it is not a collision. */
export function collisionCardModel(
  layout: NebulaLayoutResult,
  selection: { a: string; b: string } | null
): CollisionCardModel | null {
  if (!selection) return null;
  const relation = layout.relations.find((r) => r.a === selection.a && r.b === selection.b);
  if (!relation) return null;
  const genreOf = new Map(layout.data.genres.map((g) => [g.id, g]));
  const songOf = new Map(layout.data.songs.map((s) => [s.id, s]));
  const genres = [relation.a, relation.b].map((id) => {
    const g = genreOf.get(id)!;
    return { id: g.id, name: g.name, color: g.color };
  });
  const shortName = (name: string) => name.split(/\s*[&,]\s*/)[0].trim();
  return {
    title: `${shortName(genres[0].name)} × ${shortName(genres[1].name)}`,
    genres,
    sharedSongs: relation.sharedSongs,
    strength: relation.strength,
    bridgeSongs: relation.bridgeSongIds
      .map((id) => songOf.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({
        songId: s.id,
        title: s.title,
        artistName: layout.data.artists.find((a) => a.id === s.artistId && a.genreId === s.genreId)?.name ?? '',
        genreId: s.genreId,
      })),
  };
}

export const MAX_GALAXY_MARKERS = 4;

/**
 * Which collision markers (∩ n) to show: the 4 closest to the camera in the galaxy view,
 * the focused genre's collisions in sector/artist/song views, the selected one in collision view.
 * `cameraLocal` is the camera position in the cosmos group's local space.
 */
export function visibleCollisionMarkers(
  relations: NebulaRelation[],
  cameraLocal: Vec3,
  cameraMode: string,
  focusGenreId: string | null,
  selection: { a: string; b: string } | null
): NebulaRelation[] {
  if (cameraMode === 'collision') {
    return selection ? relations.filter((r) => r.a === selection.a && r.b === selection.b) : [];
  }
  if (cameraMode !== 'galaxy' && focusGenreId) {
    return relations.filter((r) => r.a === focusGenreId || r.b === focusGenreId);
  }
  const dist = (p: Vec3) => Math.hypot(p[0] - cameraLocal[0], p[1] - cameraLocal[1], p[2] - cameraLocal[2]);
  return [...relations].sort((x, y) => dist(x.contact) - dist(y.contact)).slice(0, MAX_GALAXY_MARKERS);
}

/** Badge for a collision: "∩ n" when the genres share songs, "≈" for affinity-only collisions. */
export function collisionBadge(sharedSongs: number): string {
  return sharedSongs > 0 ? `∩ ${sharedSongs}` : '≈';
}

/** One-line description under the collision title. */
export function collisionSummary(sharedSongs: number): string {
  if (sharedSongs === 0) return 'afinidad por colaboraciones y estilo';
  return sharedSongs === 1 ? 'canción en común' : 'canciones en común';
}
