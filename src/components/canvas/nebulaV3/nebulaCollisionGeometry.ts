import * as THREE from 'three';
import { NebulaLayoutResult, NebulaRelation, WORLD_SCALE } from '../../../lib/layout/nebulaLayout';
import { createRng, gauss, Rng, seedFromString } from '../../../lib/math/prng';
import { fbm3 } from '../../../lib/math/noise';
import { FIELD_SHARE } from './nebulaFieldGeometry';

/**
 * Nebulosas v3 collision geometry (M7.1): port of `genClash()` from the reference.
 * One BufferGeometry for every genre relation (a single draw call):
 *   kind 3 · shock front  (55%) curved disc at the contact point, mixed colour, noise cuts
 *   kind 4 · tidal stream (25%) travels core A → core B (or back) on a Bézier, animated in the shader
 *   kind 5 · mixed gas    (20%) Gaussian cloud around the contact point
 * Uses the particle budget the field leaves free (1 − FIELD_SHARE), split by relation strength.
 */

export const COLLISION_KIND = { front: 3, tide: 4, gas: 5 } as const;
export const COLLISION_SHARE = 1 - FIELD_SHARE;

const FRONT_SHARE = 0.55;
const TIDE_SHARE = 0.25; // the remaining 20% is mixed gas
const MIN_PARTICLES_PER_RELATION = 12;

/** Attribute name → item size; nebulaCollisionShaders.ts declares the same names. */
export const NEBULA_COLLISION_ATTRIBUTES = {
  position: 3, // tides: Bézier control point
  color: 3,
  colorB: 3, // tides: colour at the far end
  anchor: 3, // tides: start core
  axis: 3, // tides: end core
  size: 1,
  alpha: 1,
  kind: 1,
  gid: 1,
  gid2: 1,
  spin: 1, // tides: travel speed
  seed: 1,
  aAffinity: 1,
} as const;
type AttributeName = keyof typeof NEBULA_COLLISION_ATTRIBUTES;

export interface NebulaCollisionGeometryResult {
  geometry: THREE.BufferGeometry;
  countsByRelation: number[];
}

type Vec3 = [number, number, number];

/** Particles per relation, proportional to relation strength (min 12). */
export function nebulaCollisionCounts(strengths: number[], particleCount: number): number[] {
  const total = strengths.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  return strengths.map((s) =>
    Math.max(MIN_PARTICLES_PER_RELATION, Math.round((particleCount * COLLISION_SHARE * Math.max(0, s)) / total))
  );
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Shortest-path hue interpolation on the colour wheel. */
export function hueMix(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 0.5) d -= 1;
  if (d < -0.5) d += 1;
  const h = a + d * t;
  return h - Math.floor(h);
}

function basis(n: Vec3): [Vec3, Vec3] {
  const t: Vec3 = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const c = (x: Vec3, y: Vec3): Vec3 => [x[1] * y[2] - x[2] * y[1], x[2] * y[0] - x[0] * y[2], x[0] * y[1] - x[1] * y[0]];
  const u = c(n, t);
  const len = Math.hypot(u[0], u[1], u[2]) || 1;
  const un: Vec3 = [u[0] / len, u[1] / len, u[2] / len];
  return [un, c(n, un)];
}

const along = (o: Vec3, u: Vec3, v: Vec3, d: Vec3, cu: number, cv: number, cd: number): Vec3 => [
  o[0] + u[0] * cu + v[0] * cv + d[0] * cd,
  o[1] + u[1] * cu + v[1] * cv + d[1] * cd,
  o[2] + u[2] * cu + v[2] * cv + d[2] * cd,
];

export function buildNebulaCollisionGeometry(layout: NebulaLayoutResult, particleCount: number): NebulaCollisionGeometryResult {
  const { data, cores, relations } = layout;
  const gidOf = new Map(data.genres.map((g, i) => [g.id, i]));
  const genreOf = new Map(data.genres.map((g) => [g.id, g]));
  const coreOf = new Map(cores.map((c) => [c.genreId, c]));
  const usable = relations.filter((r) => coreOf.has(r.a) && coreOf.has(r.b));
  const countsByRelation = nebulaCollisionCounts(usable.map((r) => r.strength), particleCount);
  const total = countsByRelation.reduce((a, b) => a + b, 0);

  const arrays = Object.fromEntries(
    (Object.keys(NEBULA_COLLISION_ATTRIBUTES) as AttributeName[]).map((name) => [
      name,
      new Float32Array(total * NEBULA_COLLISION_ATTRIBUTES[name]),
    ])
  ) as Record<AttributeName, Float32Array>;

  const color = new THREE.Color();
  const colorB = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  let i = 0;

  usable.forEach((relation: NebulaRelation, ri) => {
    const A = coreOf.get(relation.a)!;
    const B = coreOf.get(relation.b)!;
    const genreA = genreOf.get(relation.a)!;
    const genreB = genreOf.get(relation.b)!;
    new THREE.Color(genreA.color).getHSL(hsl);
    const hueA = hsl.h;
    new THREE.Color(genreB.color).getHSL(hsl);
    const hueB = hsl.h;
    const affinity = Math.min(1, Math.max(0, Math.min(genreA.affinity, genreB.affinity)));
    const d = Math.hypot(B.center[0] - A.center[0], B.center[1] - A.center[1], B.center[2] - A.center[2]);
    const overlap = Math.max(0, A.radius + B.radius - d);
    const rr = relation.radius;
    const m = relation.contact;
    const dir = relation.dir;
    const [u, v] = basis(dir);
    const bowSign = A.radius > B.radius ? 1 : -1;
    const rng: Rng = createRng(seedFromString(`clash:${relation.a}|${relation.b}`));
    const noiseA = (gidOf.get(relation.a) ?? 0) * 1.0;
    const noiseB = (gidOf.get(relation.b) ?? 0) * 1.0;

    for (let j = 0; j < countsByRelation[ri]; j++, i++) {
      const q = rng();
      let p: Vec3;
      let anchor: Vec3;
      let axis: Vec3 = [0, 1, 0];
      let kind: number;
      let spin = 0;
      let size: number;
      let alpha: number;

      if (q < FRONT_SHARE) {
        // shock front: curved disc perpendicular to the line between cores, cut by noise
        const ang = rng() * Math.PI * 2;
        let rad = rr * Math.sqrt(rng());
        const nz = fbm3(Math.cos(ang) * 1.6 + noiseA, Math.sin(ang) * 1.6 + noiseB, (rad / rr) * 2);
        if (rng() > 0.3 + nz * 0.7) rad *= 0.55;
        const t = gauss(rng) * (2 * WORLD_SCALE + overlap * 0.1);
        const bow = ((rad * rad) / rr) * 0.3 * bowSign;
        p = along(m, u, v, dir, Math.cos(ang) * rad, Math.sin(ang) * rad, t + bow);
        anchor = p;
        kind = COLLISION_KIND.front;
        size = 1.5 + rng() * 2.2;
        alpha = 0.5;
        const side = 8 * WORLD_SCALE;
        color.setHSL(hueMix(hueA, hueB, smoothstep(-side, side, t)), 0.55, 0.74 - (rad / rr) * 0.2);
        colorB.copy(color);
      } else if (q < FRONT_SHARE + TIDE_SHARE) {
        // tidal stream: Bézier from one core to the other through a control point near the contact
        const forward = rng() < 0.5;
        anchor = forward ? A.center : B.center;
        axis = forward ? B.center : A.center;
        p = along(m, u, v, dir, gauss(rng) * rr * 0.35, gauss(rng) * rr * 0.35, 0);
        kind = COLLISION_KIND.tide;
        spin = 0.025 + 0.03 * rng();
        size = 2 + rng() * 1.5;
        alpha = 0.42;
        color.setHSL(forward ? hueA : hueB, 0.6, 0.68);
        colorB.setHSL(forward ? hueB : hueA, 0.6, 0.68);
      } else {
        // mixed gas around the contact point, thicker the more the nebulae overlap
        const t = gauss(rng);
        p = along(m, u, v, dir, gauss(rng) * rr * 0.5, gauss(rng) * rr * 0.5, t * (4 * WORLD_SCALE + overlap * 0.25));
        anchor = p;
        kind = COLLISION_KIND.gas;
        size = 6 + rng() * 7;
        alpha = 0.06;
        color.setHSL(hueMix(hueA, hueB, smoothstep(-1.5, 1.5, t)), 0.62, 0.6);
        colorB.copy(color);
      }

      arrays.position.set(p, i * 3);
      arrays.anchor.set(anchor, i * 3);
      arrays.axis.set(axis, i * 3);
      arrays.color[i * 3] = color.r;
      arrays.color[i * 3 + 1] = color.g;
      arrays.color[i * 3 + 2] = color.b;
      arrays.colorB[i * 3] = colorB.r;
      arrays.colorB[i * 3 + 1] = colorB.g;
      arrays.colorB[i * 3 + 2] = colorB.b;
      arrays.size[i] = size;
      arrays.alpha[i] = alpha;
      arrays.kind[i] = kind;
      arrays.gid[i] = gidOf.get(relation.a) ?? -1;
      arrays.gid2[i] = gidOf.get(relation.b) ?? -1;
      arrays.spin[i] = spin;
      arrays.seed[i] = rng();
      arrays.aAffinity[i] = affinity;
    }
  });

  const geometry = new THREE.BufferGeometry();
  for (const name of Object.keys(NEBULA_COLLISION_ATTRIBUTES) as AttributeName[]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(arrays[name], NEBULA_COLLISION_ATTRIBUTES[name]));
  }
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);
  return { geometry, countsByRelation };
}
