import * as THREE from 'three';
import { calculateStarVisualMetrics, MusicGalaxyData, MusicNode } from '../../../types/music';
import { seedFromString } from '../../../lib/math/prng';

/**
 * Nebulosas v3 luminous stars (B1): one point per genre, artist and song, drawn in one call.
 * Pure (testable in node). Positions are the laid-out node positions, unanimated: the camera and
 * the invisible hit spheres of StarNodeMesh follow the same `node.position`.
 */

export const STAR_KIND = { genre: 0, artist: 1, song: 2 } as const;

/** Sprite radius = core radius × this: the halo reaches well beyond the bright core. */
export const STAR_GLOW_FACTOR = 4;

export const STAR_FIELD_ATTRIBUTES = {
  position: 3,
  color: 3,
  size: 1, // sprite radius in world units
  heat: 1, // 0..1: whiter, tighter core for higher affinity
  kind: 1,
  gid: 1, // index in genreIds (focus, same convention as the gas field)
  aid: 1, // artist index inside its genre (songs carry their artist's), -1 for genres
  aAffinity: 1,
  spikes: 1, // 0..1 diffraction cross strength (genres and big artists)
  seed: 1,
  nodeIndex: 1, // vertex index, for selected / hovered / playing highlights
} as const;

export interface StarFieldGeometry {
  geometry: THREE.BufferGeometry;
  nodeIds: string[]; // nodeIds[nodeIndex]
  genreIds: string[];
}

/** Diffraction cross strength by node: genres always, artists by evolution tier, songs never. */
export function starSpikes(node: MusicNode): number {
  if (node.type === 'genre') return 1;
  if (node.type === 'song') return 0;
  const tier = calculateStarVisualMetrics(node).artistTier;
  return tier === 'supergiant' ? 0.8 : tier === 'giant' ? 0.45 : 0;
}

/** Affinity → core temperature (curve shared with the classic emissive intensity). */
export function starHeat(affinity: number): number {
  return Math.pow(Math.max(0, Math.min(1, affinity)), 1.6);
}

export function buildStarFieldGeometry(data: MusicGalaxyData, genreIds: string[]): StarFieldGeometry {
  const gidOf = new Map(genreIds.map((id, i) => [id, i]));
  const colorOf = new Map(data.genres.map((g) => [g.id, g.color]));
  const aidOf = new Map<string, number>();
  for (const genreId of genreIds) {
    data.artists.filter((a) => a.genreId === genreId).forEach((a, i) => aidOf.set(`${genreId}/${a.id}`, i));
  }

  const nodes: MusicNode[] = [...data.genres, ...data.artists, ...data.songs];
  const n = nodes.length;
  const arrays = Object.fromEntries(
    Object.entries(STAR_FIELD_ATTRIBUTES).map(([name, size]) => [name, new Float32Array(n * size)])
  ) as Record<keyof typeof STAR_FIELD_ATTRIBUTES, Float32Array>;
  const color = new THREE.Color();

  nodes.forEach((node, i) => {
    const genreId = node.type === 'genre' ? node.id : node.genreId;
    arrays.position.set(node.position, i * 3);
    color.set(node.type === 'genre' ? node.color : colorOf.get(genreId) ?? '#00F5D4');
    arrays.color.set([color.r, color.g, color.b], i * 3);
    arrays.size[i] = calculateStarVisualMetrics(node).coreRadius * STAR_GLOW_FACTOR;
    arrays.heat[i] = starHeat(node.affinity);
    arrays.kind[i] = STAR_KIND[node.type];
    arrays.gid[i] = gidOf.get(genreId) ?? -1;
    arrays.aid[i] =
      node.type === 'artist' ? aidOf.get(`${genreId}/${node.id}`) ?? -1 : node.type === 'song' ? aidOf.get(`${genreId}/${node.artistId}`) ?? -1 : -1;
    arrays.aAffinity[i] = node.affinity;
    arrays.spikes[i] = starSpikes(node);
    arrays.seed[i] = (seedFromString(node.id) % 10007) / 10007;
    arrays.nodeIndex[i] = i;
  });

  const geometry = new THREE.BufferGeometry();
  for (const [name, size] of Object.entries(STAR_FIELD_ATTRIBUTES)) {
    geometry.setAttribute(name, new THREE.BufferAttribute(arrays[name as keyof typeof STAR_FIELD_ATTRIBUTES], size));
  }
  return { geometry, nodeIds: nodes.map((node) => node.id), genreIds };
}
