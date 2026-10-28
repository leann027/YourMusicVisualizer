import * as THREE from 'three';
import { NebulaLayoutResult } from '../../../lib/layout/nebulaLayout';
import { createRng, gauss, seedFromString } from '../../../lib/math/prng';
import { fbm3 } from '../../../lib/math/noise';
import { toWorld } from './nebulaFieldGeometry';

/**
 * Nebulosas v3 depth layers (B2), next to the M6 gas field (left untouched):
 *   fog   · a few huge, faint puffs per nebula: the cloud's body
 *   knot  · warm emission knots at the core and the biggest artists: core → edge gradient
 *   lane  · dark dust ribbons where fBm crosses its midpoint, drawn with multiply blending
 * Fog and knots share one geometry (additive); lanes have their own (multiply). Sizes are
 * sprite radii in world units. Pure and deterministic (testable in node).
 */

export const DEPTH_KIND = { fog: 0, knot: 1, lane: 2 } as const;

export const NEBULA_DEPTH_COUNTS = {
  fog: 24,
  maxArtistKnots: 5, // plus one knot at the core
  lanes: { full: 170, reduced: 90 },
} as const;

/** Gas spin in M6 (rad/s): fog and lanes turn with the gas of their nebula. */
export const GAS_SPIN = 0.03;

const LANE_BAND = 0.045; // |fbm − 0.5| below this → on a dust ribbon
const LANE_FLATTEN = 0.6; // ribbons lie closer to the nebula plane
const LANE_MAX_DIST = 0.95; // ·S
const LANE_TRIES = 60;

export const NEBULA_DEPTH_ATTRIBUTES = {
  position: 3,
  color: 3,
  anchor: 3,
  axis: 3,
  size: 1,
  alpha: 1, // fog/knot: brightness · lane: darkness
  kind: 1,
  gid: 1,
  spin: 1,
  seed: 1,
} as const;
type AttributeName = keyof typeof NEBULA_DEPTH_ATTRIBUTES;

type Vec3 = [number, number, number];

interface DepthParticle {
  p: Vec3;
  anchor: Vec3;
  axis: Vec3;
  color: THREE.Color;
  size: number;
  alpha: number;
  kind: number;
  gid: number;
  spin: number;
  seed: number;
}

export interface NebulaDepthGeometryResult {
  glow: THREE.BufferGeometry; // fog + knots
  lanes: THREE.BufferGeometry;
  genreIds: string[]; // genreIds[gid], same order as the gas field
}

/** Spin direction of a nebula's gas: the first draw of the M6 field generator for that genre. */
export function gasSpinDir(genreId: string): number {
  return createRng(seedFromString(`field:${genreId}`))() < 0.5 ? -1 : 1;
}

function toGeometry(particles: DepthParticle[]): THREE.BufferGeometry {
  const n = particles.length;
  const arrays = Object.fromEntries(
    (Object.keys(NEBULA_DEPTH_ATTRIBUTES) as AttributeName[]).map((name) => [name, new Float32Array(n * NEBULA_DEPTH_ATTRIBUTES[name])])
  ) as Record<AttributeName, Float32Array>;
  particles.forEach((q, i) => {
    arrays.position.set(q.p, i * 3);
    arrays.anchor.set(q.anchor, i * 3);
    arrays.axis.set(q.axis, i * 3);
    arrays.color.set([q.color.r, q.color.g, q.color.b], i * 3);
    arrays.size[i] = q.size;
    arrays.alpha[i] = q.alpha;
    arrays.kind[i] = q.kind;
    arrays.gid[i] = q.gid;
    arrays.spin[i] = q.spin;
    arrays.seed[i] = q.seed;
  });
  const geometry = new THREE.BufferGeometry();
  for (const name of Object.keys(NEBULA_DEPTH_ATTRIBUTES) as AttributeName[]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(arrays[name], NEBULA_DEPTH_ATTRIBUTES[name]));
  }
  // anchors rotate inside the cosmos group; a static sphere avoids per-frame bounds work
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
  return geometry;
}

export function buildNebulaDepthGeometry(layout: NebulaLayoutResult, density: 'full' | 'reduced'): NebulaDepthGeometryResult {
  const { data, cores } = layout;
  const frameOf = new Map(cores.map((c) => [c.genreId, c]));
  const genres = data.genres.filter((g) => frameOf.has(g.id));
  const glow: DepthParticle[] = [];
  const lanes: DepthParticle[] = [];
  const hsl = { h: 0, s: 0, l: 0 };

  genres.forEach((genre, gid) => {
    const frame = frameOf.get(genre.id)!;
    const S = frame.radius;
    const spin = GAS_SPIN * gasSpinDir(genre.id);
    const rng = createRng(seedFromString(`depth:${genre.id}`));
    const offset: Vec3 = [rng() * 50, rng() * 50, rng() * 50];
    new THREE.Color(genre.color).getHSL(hsl);
    const hue = hsl.h;
    const base = { anchor: frame.center, axis: frame.normal, gid, spin };

    // fog: the cloud's body, darker and bluer towards the edge
    for (let k = 0; k < NEBULA_DEPTH_COUNTS.fog; k++) {
      const x = gauss(rng) * S * 0.35;
      const y = gauss(rng) * S * 0.35;
      const z = gauss(rng) * S * 0.35;
      const dist = Math.min(1, Math.hypot(x, y, z) / S);
      glow.push({
        ...base,
        p: toWorld(frame.center, frame, x, y, z, true),
        color: new THREE.Color().setHSL(hue + dist * 0.06, 0.45, 0.34 - dist * 0.12),
        size: S * (0.45 + 0.3 * rng()),
        alpha: 0.035 * (1 - 0.5 * dist),
        kind: DEPTH_KIND.fog,
        seed: rng(),
      });
    }

    // emission knots: warm, bright, at the core and next to the biggest artists (static, like the stars)
    const big = data.artists
      .filter((a) => a.genreId === genre.id)
      .sort((a, b) => b.songCount - a.songCount || a.id.localeCompare(b.id))
      .slice(0, NEBULA_DEPTH_COUNTS.maxArtistKnots);
    const knotSites: { p: Vec3; weight: number }[] = [
      { p: frame.center, weight: 1 },
      ...big.map((a) => ({ p: a.position, weight: Math.sqrt(a.songCount / Math.max(1, big[0].songCount)) * 0.7 })),
    ];
    for (const site of knotSites) {
      glow.push({
        ...base,
        anchor: site.p,
        spin: 0,
        p: site.p,
        color: new THREE.Color().setHSL(hue - 0.02, 0.7, 0.66 + 0.08 * site.weight),
        size: S * (0.1 + 0.08 * site.weight),
        alpha: 0.22 + 0.18 * site.weight,
        kind: DEPTH_KIND.knot,
        seed: rng(),
      });
    }

    // dust lanes: thin ribbons on the fBm mid-level surface, inside the nebula
    const target = NEBULA_DEPTH_COUNTS.lanes[density];
    for (let k = 0, tries = 0; k < target && tries < target * LANE_TRIES; tries++) {
      const x = gauss(rng) * S * 0.45;
      const y = gauss(rng) * S * 0.45 * LANE_FLATTEN;
      const z = gauss(rng) * S * 0.45;
      const dist = Math.hypot(x, y, z) / S;
      if (dist > LANE_MAX_DIST) continue;
      const f = fbm3((x / S) * 2.6 + offset[0], (y / S) * 2.6 + offset[1], (z / S) * 2.6 + offset[2]);
      if (Math.abs(f - 0.5) > LANE_BAND) continue;
      lanes.push({
        ...base,
        p: toWorld(frame.center, frame, x, y, z, true),
        color: new THREE.Color(0.32, 0.26, 0.3),
        size: S * (0.08 + 0.08 * rng()),
        alpha: (0.5 + 0.3 * rng()) * (1 - 0.5 * dist),
        kind: DEPTH_KIND.lane,
        seed: rng(),
      });
      k++;
    }
  });

  return { glow: toGeometry(glow), lanes: toGeometry(lanes), genreIds: genres.map((g) => g.id) };
}
