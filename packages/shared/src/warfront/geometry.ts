import { LANDS, SEAS, SEA_LINKS, TERRITORY_DEFS } from './mapData';

/** Board geometry: Miller projection, Voronoi territory cells clipped to the coastlines, derived land borders. */
export type Pt = [number, number];
export const MAP_W = 1600;
const K = MAP_W / (2 * Math.PI);
const miller = (lat: number) => 1.25 * Math.log(Math.tan(Math.PI / 4 + (0.4 * lat * Math.PI) / 180));
const TOP = miller(80);
export const MAP_H = Math.round((TOP - miller(-57)) * K);
export const project = (lon: number, lat: number): Pt => [((lon + 168) / 360) * MAP_W, (TOP - miller(lat)) * K];
const pts = (a: number[]): Pt[] => { const o: Pt[] = []; for (let i = 0; i < a.length; i += 2) o.push(project(a[i], a[i + 1])); return o; };

export function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** signed distance of p from the bisector of a,b (negative = a's side) */
const side = (a: Pt, b: Pt) => {
  const nx = b[0] - a[0], ny = b[1] - a[1], len = Math.hypot(nx, ny);
  const c = (nx * (a[0] + b[0]) + ny * (a[1] + b[1])) / 2;
  return (p: Pt) => (nx * p[0] + ny * p[1] - c) / len;
};

function clip(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const fc = f(cur), fp = f(prev);
    const cut = (): Pt => { const t = fp / (fp - fc); return [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]; };
    if (fc <= 0) { if (fp > 0) out.push(cut()); out.push(cur); } else if (fp <= 0) out.push(cut());
  }
  return out;
}

/** Deterministic 0..1 hash of a string (FNV-1a). */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
/** Three octaves of sine noise along a coordinate, phase-shifted by a seed: wobbly, never repeating at a glance. */
const wave = (s: number, h: number) => Math.sin(s / 9.5 + h * 40) * 0.55 + Math.sin(s / 4.1 + h * 97) * 0.3 + Math.sin(s / 1.9 + h * 13) * 0.15;

/** Coastlines: one Chaikin pass rounds the hand-entered corners, then a fine deterministic ripple breaks up the straight runs. */
function coast(poly: Pt[]): Pt[] {
  const soft: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    soft.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
  }
  const out: Pt[] = [];
  for (let i = 0; i < soft.length; i++) {
    const p = soft[i], q = soft[(i + 1) % soft.length];
    out.push(p);
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.round(L / 3);
    if (n < 2) continue;
    const nx = -(q[1] - p[1]) / L, ny = (q[0] - p[0]) / L, amp = Math.min(1.1, L * 0.09), h = hash(`${p[0].toFixed(1)},${p[1].toFixed(1)}`);
    for (let k = 1; k < n; k++) {
      const t = k / n, d = amp * Math.sin(Math.PI * t) * wave(t * L, h);
      out.push([p[0] + t * (q[0] - p[0]) + nx * d, p[1] + t * (q[1] - p[1]) + ny * d]);
    }
  }
  return out;
}

const landPolys = LANDS.map((l) => ({ poly: coast(pts(l.pts)), t: l.t }));
const seaPolys = SEAS.map((s) => coast(pts(s)));
const isLand = (p: Pt) => landPolys.some((l) => inPoly(p, l.poly)) && !seaPolys.some((s) => inPoly(p, s));

/** `polys` are the straight Voronoi cells (rules and lanes use them); `drawn` are the same cells with hand-drawn borders. */
export interface TerritoryGeo { id: string; x: number; y: number; polys: Pt[][]; drawn: Pt[][] }
const seedOf = new Map(TERRITORY_DEFS.map(([id, , , lon, lat]) => [id, project(lon, lat)]));
export const TERRITORY_GEO: Record<string, TerritoryGeo> = {};
for (const [id] of TERRITORY_DEFS) { const [x, y] = seedOf.get(id)!; TERRITORY_GEO[id] = { id, x, y, polys: [], drawn: [] }; }

/**
 * A border between two cells drawn as a meandering line instead of a ruled one. The offset is a function of the
 * position along the shared bisector (sampled on a fixed grid), keyed by the pair, so both neighbours draw the
 * same line; it tapers to zero at the ends so junctions and coasts stay put.
 */
function borderWiggle(a: string, b: string, p: Pt, q: Pt): Pt[] {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  const A = seedOf.get(lo)!, B = seedOf.get(hi)!, d0 = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const nx = (B[0] - A[0]) / d0, ny = (B[1] - A[1]) / d0, dx = -ny, dy = nx;
  const sp = p[0] * dx + p[1] * dy, sq = q[0] * dx + q[1] * dy, s0 = Math.min(sp, sq), s1 = Math.max(sp, sq), L = s1 - s0;
  if (L < 4) return [];
  const STEP = 2.5, amp = Math.min(6.5, L * 0.13), h = hash(lo + hi), out: Pt[] = [];
  for (let s = Math.ceil(s0 / STEP + 1e-6) * STEP; s < s1 - 1e-6; s += STEP) {
    const t = (s - sp) / (sq - sp), d = amp * Math.sin(Math.PI * ((s - s0) / L)) ** 0.7 * wave(s, h);
    out.push([p[0] + t * (q[0] - p[0]) + nx * d, p[1] + t * (q[1] - p[1]) + ny * d]);
  }
  return sq < sp ? out.reverse() : out;
}
function wiggleCell(id: string, cell: Pt[], seeds: string[]): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < cell.length; k++) {
    const p = cell[k], q = cell[(k + 1) % cell.length];
    out.push(p);
    const o = seeds.find((o) => { if (o === id) return false; const f = side(seedOf.get(id)!, seedOf.get(o)!); return Math.abs(f(p)) < 0.01 && Math.abs(f(q)) < 0.01; });
    if (o) out.push(...borderWiggle(id, o, p, q));
  }
  return out;
}

const landPairs = new Map<string, number>();
for (const land of landPolys) {
  if (land.t) { TERRITORY_GEO[land.t].polys.push(land.poly); TERRITORY_GEO[land.t].drawn.push(land.poly); continue; }
  const seeds = TERRITORY_DEFS.map(([id]) => id).filter((id) => inPoly(seedOf.get(id)!, land.poly));
  const cells = seeds.map((id) => seeds.reduce((poly, o) => (o === id ? poly : clip(poly, side(seedOf.get(id)!, seedOf.get(o)!))), land.poly));
  seeds.forEach((id, i) => {
    TERRITORY_GEO[id].polys.push(cells[i]);
    TERRITORY_GEO[id].drawn.push(wiggleCell(id, cells[i], seeds));
    for (let j = i + 1; j < seeds.length; j++) {
      const f = side(seedOf.get(id)!, seedOf.get(seeds[j])!);
      let len = 0;
      const cell = cells[i];
      for (let k = 0; k < cell.length; k++) {
        const p = cell[k], q = cell[(k + 1) % cell.length];
        if (Math.abs(f(p)) > 0.01 || Math.abs(f(q)) > 0.01) continue;
        const seg = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(2, Math.ceil(seg / 2));
        let onLand = 0;
        for (let s = 0; s < n; s++) { const t = (s + 0.5) / n; if (isLand([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])])) onLand++; }
        len += (seg * onLand) / n;
      }
      if (len >= 5) landPairs.set([id, seeds[j]].sort().join('|'), len);
    }
  });
}
/** Shared land borders, derived from the cells. */
export const LAND_BORDERS: [string, string][] = [...landPairs.keys()].map((k) => k.split('|') as [string, string]);

const pathOf = (poly: Pt[]) => `M${poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`;
export const LAND_PATHS = landPolys.map((l) => pathOf(l.poly));
export const SEA_PATHS = seaPolys.map(pathOf);
export const TERRITORY_PATHS: Record<string, string> = Object.fromEntries(Object.values(TERRITORY_GEO).map((g) => [g.id, g.drawn.map(pathOf).join('')]));

/** A drawn lane for each sea/strait link: the shortest gap between the two territories' outlines. */
export interface LaneGeo { a: string; b: string; kind: 'sea' | 'wrap' | 'land'; segs: [Pt, Pt][] }
const closest = (a: Pt[][], b: Pt[][]): [Pt, Pt] => {
  let best: [Pt, Pt] = [a[0][0], b[0][0]], d = Infinity;
  for (const pa of a) for (const p of pa) for (const pb of b) for (const q of pb) {
    const e = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    if (e < d) { d = e; best = [p, q]; }
  }
  return best;
};
const extreme = (g: TerritoryGeo, dir: 1 | -1): Pt => g.polys.flat().reduce((m, p) => (p[0] * dir > m[0] * dir ? p : m));
export const LANES: LaneGeo[] = SEA_LINKS.map(([a, b, kind]) => {
  const ga = TERRITORY_GEO[a], gb = TERRITORY_GEO[b];
  if (kind === 'wrap') {
    const pa = extreme(ga, -1), pb = extreme(gb, 1);
    return { a, b, kind, segs: [[pa, [0, pa[1]]], [pb, [MAP_W, pb[1]]]] };
  }
  return { a, b, kind: kind ?? 'sea', segs: [closest(ga.polys, gb.polys)] };
});
