import * as THREE from 'three';
import { NebulaLayoutResult } from '../../../lib/layout/nebulaLayout';
import { hueMix } from './nebulaCollisionGeometry';

/**
 * Bridge songs (M7.2): helpers shared by BridgeThreads and the bridge ring on song stars.
 * A bridge song is one the nebula layout placed in a collision's contact disc.
 */

/** Colour halfway between two genre colours on the short arc of the hue wheel. */
export function mixGenreColors(colorA: string, colorB: string): THREE.Color {
  const a = { h: 0, s: 0, l: 0 };
  const b = { h: 0, s: 0, l: 0 };
  new THREE.Color(colorA).getHSL(a);
  new THREE.Color(colorB).getHSL(b);
  return new THREE.Color().setHSL(hueMix(a.h, b.h, 0.5), (a.s + b.s) / 2, Math.max(0.6, (a.l + b.l) / 2));
}

/** Mixed ring colour (hex) for a placed bridge song, or null for any other song. */
export function bridgeRingColor(songId: string, layout: NebulaLayoutResult): string | null {
  const relation = layout.relations.find((r) => r.bridgeSongIds.includes(songId));
  if (!relation) return null;
  const colorOf = (id: string) => layout.data.genres.find((g) => g.id === id)?.color ?? '#ffffff';
  return `#${mixGenreColors(colorOf(relation.a), colorOf(relation.b)).getHexString()}`;
}

/** Attribute name → item size; bridgeThreadShaders.ts declares the same names. */
export const BRIDGE_THREAD_ATTRIBUTES = { position: 3, color: 3, gid: 1, gid2: 1, tAlong: 1, seed: 1 } as const;
type ThreadAttribute = keyof typeof BRIDGE_THREAD_ATTRIBUTES;

/**
 * LineSegments geometry with two vertices per bridge link. Endpoints come from the laid-out
 * nodes; an artist split across genres resolves to the copy in the bridge song's genre.
 */
export function buildBridgeThreadGeometry(layout: NebulaLayoutResult): THREE.BufferGeometry {
  const { data, relations, bridgeLinks } = layout;
  const songById = new Map(data.songs.map((s) => [s.id, s]));
  const genreById = new Map(data.genres.map((g) => [g.id, g]));
  const gidOf = new Map(data.genres.map((g, i) => [g.id, i]));
  const artistIn = (artistId: string, genreId: string) => data.artists.find((a) => a.id === artistId && a.genreId === genreId);
  const relationOf = (songId: string) => relations.find((r) => r.bridgeSongIds.includes(songId));

  const segments: { from: number[]; to: number[]; color: THREE.Color; gid: number; gid2: number; seed: number }[] = [];
  bridgeLinks.forEach((link, li) => {
    const song = songById.get(link.target) ?? songById.get(link.source);
    const relation = song ? relationOf(song.id) : undefined;
    if (!song || !relation) return;
    const from = songById.has(link.target) ? artistIn(link.source, song.genreId)?.position : song.position;
    const to = songById.has(link.target) ? song.position : genreById.get(link.target)?.position;
    if (!from || !to) return;
    segments.push({
      from,
      to,
      color: mixGenreColors(genreById.get(relation.a)!.color, genreById.get(relation.b)!.color),
      gid: gidOf.get(relation.a) ?? -1,
      gid2: gidOf.get(relation.b) ?? -1,
      seed: ((li * 0.618034) % 1 + 1) % 1,
    });
  });

  const n = segments.length * 2;
  const arrays = Object.fromEntries(
    (Object.keys(BRIDGE_THREAD_ATTRIBUTES) as ThreadAttribute[]).map((name) => [name, new Float32Array(n * BRIDGE_THREAD_ATTRIBUTES[name])])
  ) as Record<ThreadAttribute, Float32Array>;
  segments.forEach((seg, i) => {
    [seg.from, seg.to].forEach((p, end) => {
      const v = i * 2 + end;
      arrays.position.set(p, v * 3);
      arrays.color.set([seg.color.r, seg.color.g, seg.color.b], v * 3);
      arrays.gid[v] = seg.gid;
      arrays.gid2[v] = seg.gid2;
      arrays.tAlong[v] = end;
      arrays.seed[v] = seg.seed;
    });
  });

  const geometry = new THREE.BufferGeometry();
  for (const name of Object.keys(BRIDGE_THREAD_ATTRIBUTES) as ThreadAttribute[]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(arrays[name], BRIDGE_THREAD_ATTRIBUTES[name]));
  }
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
  return geometry;
}
