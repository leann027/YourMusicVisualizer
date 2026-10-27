import * as THREE from 'three';
import { NebulaFrame, NebulaLayoutResult } from '../../../lib/layout/nebulaLayout';
import { createRng, gauss, randDir, Rng, seedFromString } from '../../../lib/math/prng';
import { fbm3 } from '../../../lib/math/noise';
import { ArtistNode } from '../../../types/music';

/**
 * Nebulosas v3 gas field geometry (M6.1).
 *
 * One BufferGeometry for every genre (a single draw call). Port of `gen()` from
 * docs/reference/nebulosas-v3.html:
 *   kind 0 · catalogue dust   (42%) Plummer cloud around an artist, orbits it
 *   kind 1 · gas filaments    (52%) kept only where ridged fBm forms filaments
 *   kind 2 · ionization front ( 6%) noisy shell at ~S
 * Sizes and alphas keep the reference values (pixels); the shader calibrates them.
 */

export const NEBULA_FIELD_DENSITY = { full: 35000, reduced: 20000 } as const;

/** Share of the particle budget for the genre field; the rest is reserved for collisions (M7). */
export const FIELD_SHARE = 0.92;

export const NEBULA_KIND = { dust: 0, gas: 1, front: 2 } as const;

const DUST_SHARE = 0.42;
const GAS_SHARE = 0.52; // the remaining 6% is the ionization front
const MIN_PARTICLES_PER_GENRE = 5;
const GAS_TRIES = 14;

export interface NebulaFieldGeometryResult {
  geometry: THREE.BufferGeometry;
  genreIds: string[]; // genreIds[gid]
  countsByGenre: number[];
}

type Vec3 = [number, number, number];

/** Particles per genre, proportional to song count (min 5). */
export function nebulaFieldCounts(songCounts: number[], particleCount: number): number[] {
  const total = songCounts.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  return songCounts.map((s) =>
    Math.max(MIN_PARTICLES_PER_GENRE, Math.round((particleCount * FIELD_SHARE * Math.max(0, s)) / total))
  );
}

const ATTRIBUTES = {
  position: 3,
  color: 3,
  anchor: 3,
  axis: 3,
  size: 1,
  alpha: 1,
  kind: 1,
  gid: 1,
  aid: 1,
  spin: 1,
  seed: 1,
  aAffinity: 1,
} as const;
type AttributeName = keyof typeof ATTRIBUTES;

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Local nebula coordinates (x along u, y along normal, z along v) → world, optionally squashed by the gas ellipsoid. */
function toWorld(origin: Vec3, frame: NebulaFrame, x: number, y: number, z: number, squash: boolean): Vec3 {
  const ax = squash ? frame.axes : ([1, 1, 1] as Vec3);
  const lx = x * ax[0];
  const ly = y * ax[1];
  const lz = z * ax[2];
  return [
    origin[0] + frame.u[0] * lx + frame.normal[0] * ly + frame.v[0] * lz,
    origin[1] + frame.u[1] * lx + frame.normal[1] * ly + frame.v[1] * lz,
    origin[2] + frame.u[2] * lx + frame.normal[2] * ly + frame.v[2] * lz,
  ];
}

interface ArtistAnchor {
  aid: number;
  position: Vec3;
  weight: number;
  rad: number; // Plummer scale radius
  affinity: number;
}

function pickArtist(artists: ArtistAnchor[], totalWeight: number, rng: Rng): ArtistAnchor {
  let pick = rng() * totalWeight;
  for (const a of artists) {
    if (pick < a.weight) return a;
    pick -= a.weight;
  }
  return artists[artists.length - 1];
}

export function buildNebulaFieldGeometry(layout: NebulaLayoutResult, particleCount: number): NebulaFieldGeometryResult {
  const { data, cores } = layout;
  const frameOf = new Map(cores.map((c) => [c.genreId, c]));
  const genres = data.genres.filter((g) => frameOf.has(g.id));
  const countsByGenre = nebulaFieldCounts(genres.map((g) => g.songCount), particleCount);
  const total = countsByGenre.reduce((a, b) => a + b, 0);

  const arrays = Object.fromEntries(
    (Object.keys(ATTRIBUTES) as AttributeName[]).map((name) => [name, new Float32Array(total * ATTRIBUTES[name])])
  ) as Record<AttributeName, Float32Array>;

  const artistsByGenre = new Map<string, ArtistNode[]>();
  for (const artist of data.artists) {
    if (!artistsByGenre.has(artist.genreId)) artistsByGenre.set(artist.genreId, []);
    artistsByGenre.get(artist.genreId)!.push(artist);
  }

  const color = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  let i = 0;

  genres.forEach((genre, gid) => {
    const frame = frameOf.get(genre.id)!;
    const S = frame.radius;
    const rng = createRng(seedFromString(`field:${genre.id}`));
    const spinDir = rng() < 0.5 ? -1 : 1;
    const noiseOffset: Vec3 = [rng() * 50, rng() * 50, rng() * 50];
    new THREE.Color(genre.color).getHSL(hsl);
    const hue = hsl.h;

    const genreArtists = artistsByGenre.get(genre.id) ?? [];
    const maxWeight = Math.max(1, ...genreArtists.map((a) => a.songCount));
    const anchors: ArtistAnchor[] = genreArtists.map((a, aid) => ({
      aid,
      position: a.position,
      weight: Math.max(1, a.songCount),
      rad: S * 0.09 * (0.55 + Math.sqrt(Math.max(1, a.songCount) / maxWeight)),
      affinity: a.affinity,
    }));
    const totalWeight = anchors.reduce((a, b) => a + b.weight, 0);

    for (let j = 0; j < countsByGenre[gid]; j++, i++) {
      const q = rng();
      let p: Vec3;
      let anchor: Vec3;
      let kind: number;
      let aid = -1;
      let spin: number;
      let size: number;
      let alpha: number;
      let affinity = genre.affinity;

      if (q < DUST_SHARE && anchors.length) {
        // catalogue dust: Plummer distribution around an artist, orbiting it
        const A = pickArtist(anchors, totalWeight, rng);
        const u = Math.max(rng(), 1e-3);
        const r = Math.min(A.rad / Math.sqrt(Math.pow(u, -2 / 3) - 1), A.rad * 6);
        const angle = rng() * Math.PI * 2;
        p = toWorld(A.position, frame, Math.cos(angle) * r, gauss(rng) * r * 0.25, Math.sin(angle) * r, false);
        anchor = A.position;
        kind = NEBULA_KIND.dust;
        aid = A.aid;
        spin = (0.15 + 0.6 / (1 + r / A.rad)) * spinDir;
        const bright = rng() < 0.04;
        size = bright ? 5 : 1.6 + rng() * 2;
        alpha = bright ? 0.9 : 0.5;
        affinity = A.affinity;
        color.setHSL(hue + (rng() - 0.5) * 0.04, 0.5, 0.6 + 0.2 * Math.exp(-r / A.rad));
      } else if (q < DUST_SHARE + GAS_SHARE || (q < DUST_SHARE && !anchors.length)) {
        // gas: only where ridged fBm forms filaments, fading towards the edge
        let x = 0;
        let y = 0;
        let z = 0;
        let dist = 0;
        let nz = 0;
        let ok = false;
        for (let tries = 0; tries < GAS_TRIES && !ok; tries++) {
          x = gauss(rng) * S * 0.55;
          y = gauss(rng) * S * 0.55;
          z = gauss(rng) * S * 0.55;
          dist = Math.hypot(x, y, z) / S;
          const f = fbm3((x / S) * 2.2 + noiseOffset[0], (y / S) * 2.2 + noiseOffset[1], (z / S) * 2.2 + noiseOffset[2]);
          const ridge = 1 - Math.abs(2 * f - 1);
          nz = f;
          ok = rng() < Math.max(smoothstep(0.62, 0.92, ridge), smoothstep(0.62, 0.8, f) * 0.6) * (1 - smoothstep(0.7, 1.4, dist));
        }
        p = toWorld(frame.center, frame, x, y, z, true);
        anchor = frame.center;
        kind = NEBULA_KIND.gas;
        spin = 0.03 * spinDir;
        size = 5 + rng() * 7;
        alpha = (0.055 + 0.04 * nz) * (ok ? 1 : 0.3);
        color.setHSL(hue + (nz - 0.5) * 0.14 + dist * 0.05, 0.66, Math.max(0.32, 0.7 - dist * 0.22));
      } else {
        // ionization front: noisy shell around the nebula
        const d = randDir(rng);
        const rr = S * (0.85 + 0.3 * fbm3(d[0] * 2 + noiseOffset[0], d[1] * 2, d[2] * 2));
        p = toWorld(frame.center, frame, d[0] * rr, d[1] * rr, d[2] * rr, true);
        anchor = frame.center;
        kind = NEBULA_KIND.front;
        spin = 0.03 * spinDir;
        size = 1.4 + rng();
        alpha = 0.22;
        color.setHSL(hue + 0.04, 0.55, 0.72);
      }

      arrays.position.set(p, i * 3);
      arrays.anchor.set(anchor, i * 3);
      arrays.axis.set(frame.normal, i * 3);
      arrays.color[i * 3] = color.r;
      arrays.color[i * 3 + 1] = color.g;
      arrays.color[i * 3 + 2] = color.b;
      arrays.size[i] = size;
      arrays.alpha[i] = alpha;
      arrays.kind[i] = kind;
      arrays.gid[i] = gid;
      arrays.aid[i] = aid;
      arrays.spin[i] = spin;
      arrays.seed[i] = rng();
      arrays.aAffinity[i] = Math.min(1, Math.max(0, affinity));
    }
  });

  const geometry = new THREE.BufferGeometry();
  for (const name of Object.keys(ATTRIBUTES) as AttributeName[]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(arrays[name], ATTRIBUTES[name]));
  }
  // anchors orbit inside the rotating cosmos group; a static sphere avoids per-frame bounds work
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

  return { geometry, genreIds: genres.map((g) => g.id), countsByGenre };
}
