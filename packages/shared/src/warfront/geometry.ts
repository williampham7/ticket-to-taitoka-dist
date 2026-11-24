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

const landPolys = LANDS.map((l) => ({ poly: pts(l.pts), t: l.t }));
const seaPolys = SEAS.map(pts);
const isLand = (p: Pt) => landPolys.some((l) => inPoly(p, l.poly)) && !seaPolys.some((s) => inPoly(p, s));

export interface TerritoryGeo { id: string; x: number; y: number; polys: Pt[][] }
const seedOf = new Map(TERRITORY_DEFS.map(([id, , , lon, lat]) => [id, project(lon, lat)]));
export const TERRITORY_GEO: Record<string, TerritoryGeo> = {};
for (const [id] of TERRITORY_DEFS) { const [x, y] = seedOf.get(id)!; TERRITORY_GEO[id] = { id, x, y, polys: [] }; }

const landPairs = new Map<string, number>();
for (const land of landPolys) {
  if (land.t) { TERRITORY_GEO[land.t].polys.push(land.poly); continue; }
  const seeds = TERRITORY_DEFS.map(([id]) => id).filter((id) => inPoly(seedOf.get(id)!, land.poly));
  const cells = seeds.map((id) => seeds.reduce((poly, o) => (o === id ? poly : clip(poly, side(seedOf.get(id)!, seedOf.get(o)!))), land.poly));
  seeds.forEach((id, i) => {
    TERRITORY_GEO[id].polys.push(cells[i]);
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
export const TERRITORY_PATHS: Record<string, string> = Object.fromEntries(Object.values(TERRITORY_GEO).map((g) => [g.id, g.polys.map(pathOf).join('')]));

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
