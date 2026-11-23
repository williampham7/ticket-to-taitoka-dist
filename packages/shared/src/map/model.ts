import type { City, Route, RouteCurve, Ticket } from '../types';

/** Board geometry, in map units. */
export const NODE_R = 14;
export const HUB_R = 26;
export const CAR_GAP = 3.5;
export const CAR_H = 10;
/** Offset between the two lanes of a double route. */
export const LANE_OFFSET = 7.5;
/** How far the first car may be pushed out from a crowded city (maps with `autoInset`). */
const INSET_MAX = 30;
const HUB_INSET_MAX = 36;

export type MapId = 'usa' | 'china' | 'europe' | 'sg';
type XY = [number, number];
type LL = readonly [number, number];

export interface MapData {
  id: MapId;
  cities: City[];
  routes: Route[];
  tickets: Ticket[];
  project: (ll: LL) => XY;
  /** Area the route network and its labels live in; the client may draw geography beyond it. */
  bounds: { x: number; y: number; width: number; height: number };
  /** Push the first cars out of crowded cities until neighbouring routes' cars stop touching. */
  autoInset?: boolean;
}

/** The centre line of one lane of a route, measured by distance along it. */
export interface Lane {
  pts: XY[];
  length: number;
  at(s: number): { p: XY; t: XY };
}

/** One train-car slot. (cx, cy, angle) place it; `s` is its centre's distance along the lane. */
export interface CarSlot {
  cx: number;
  cy: number;
  w: number;
  h: number;
  angle: number;
  s: number;
  lane: Lane;
  curved: boolean;
}

type Cubic = [XY, XY, XY, XY];

function cubicAt([p0, p1, p2, p3]: Cubic, t: number): XY {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** The centre path between two cities as cubic segments (a straight route is one degenerate segment). */
function centrePath(A: XY, B: XY, curve: RouteCurve | undefined, project: (ll: LL) => XY): Cubic[] {
  if (curve && typeof curve === 'object') {
    const pts = [A, ...curve.via.map((ll) => project(ll)), B];
    return pts.slice(0, -1).map((p1, i) => {
      const p0 = pts[Math.max(0, i - 1)], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      return [p1, [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6], p2];
    });
  }
  const dx = B[0] - A[0], dy = B[1] - A[1], d = Math.hypot(dx, dy);
  const k = curve ?? 0;
  const Q: XY = [(A[0] + B[0]) / 2 + (dy / d) * k * d, (A[1] + B[1]) / 2 - (dx / d) * k * d];
  return [[A, [A[0] + (2 / 3) * (Q[0] - A[0]), A[1] + (2 / 3) * (Q[1] - A[1])], [B[0] + (2 / 3) * (Q[0] - B[0]), B[1] + (2 / 3) * (Q[1] - B[1])], B]];
}

function makeLane(pts: XY[]): Lane {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const length = cum[cum.length - 1];
  return {
    pts,
    length,
    at(s) {
      let i = 1;
      while (i < pts.length - 1 && cum[i] < s) i++;
      const seg = cum[i] - cum[i - 1] || 1;
      const f = (s - cum[i - 1]) / seg;
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const tl = Math.hypot(x1 - x0, y1 - y0) || 1;
      return { p: [x0 + f * (x1 - x0), y0 + f * (y1 - y0)], t: [(x1 - x0) / tl, (y1 - y0) / tl] };
    },
  };
}

function rectCorners(c: CarSlot, pad: number): XY[] {
  const a = (c.angle * Math.PI) / 180, t: XY = [Math.cos(a), Math.sin(a)], n: XY = [-t[1], t[0]];
  const hl = c.w / 2 + pad, hw = c.h / 2 + pad;
  return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([u, v]) => [c.cx + t[0] * hl * u + n[0] * hw * v, c.cy + t[1] * hl * u + n[1] * hw * v]);
}

/** Do two car slots overlap (with `pad` map units of clearance around each)? */
export function carsTouch(a: CarSlot, b: CarSlot, pad = 1.5): boolean {
  if (Math.abs(a.cx - b.cx) > (a.w + b.w) / 2 + 20 || Math.abs(a.cy - b.cy) > (a.w + b.w) / 2 + 20) return false;
  const pa = rectCorners(a, pad), pb = rectCorners(b, pad);
  for (const c of [a, b]) {
    const r = (c.angle * Math.PI) / 180;
    for (const ax of [[Math.cos(r), Math.sin(r)], [-Math.sin(r), Math.cos(r)]]) {
      const pr = (ps: XY[]) => ps.map((p) => p[0] * ax[0] + p[1] * ax[1]);
      const x = pr(pa), y = pr(pb);
      if (Math.max(...x) < Math.min(...y) || Math.max(...y) < Math.min(...x)) return false;
    }
  }
  return true;
}

export function createMapModel(data: MapData) {
  const CITY_BY_ID: Record<string, City> = Object.fromEntries(data.cities.map((c) => [c.id, c]));
  const ROUTE_BY_ID: Record<string, Route> = Object.fromEntries(data.routes.map((r) => [r.id, r]));
  const TICKET_BY_ID: Record<string, Ticket> = Object.fromEntries(data.tickets.map((t) => [t.id, t]));

  function cityXY(id: string): XY {
    const c = CITY_BY_ID[id];
    const [x, y] = data.project([c.lon, c.lat]);
    const [nx, ny] = c.nudge ?? [0, 0];
    return [x + nx, y + ny];
  }

  /** Straight line between the ends of a route lane (double routes are offset to either side). */
  function routeSegment(r: Route): [XY, XY] {
    const [x1, y1] = cityXY(r.a);
    const [x2, y2] = cityXY(r.b);
    const o = (r.lane ?? 0) * LANE_OFFSET;
    const d = Math.hypot(x2 - x1, y2 - y1);
    const px = (-(y2 - y1) / d) * o, py = ((x2 - x1) / d) * o;
    return [[x1 + px, y1 + py], [x2 + px, y2 + py]];
  }

  const lanes = new Map<string, Lane>();
  /** The route lane's centre line (a straight route is just its two ends). */
  function routeLane(r: Route): Lane {
    let lane = lanes.get(r.id);
    if (lane) return lane;
    if (r.curve === undefined) lane = makeLane(routeSegment(r));
    else {
      const segs = centrePath(cityXY(r.a), cityXY(r.b), r.curve, data.project);
      const centre: XY[] = [segs[0][0]];
      for (const s of segs) for (let i = 1; i <= 40; i++) centre.push(cubicAt(s, i / 40));
      const o = (r.lane ?? 0) * LANE_OFFSET;
      const pts = centre.map((p, i): XY => {
        const q0 = centre[Math.max(0, i - 1)], q1 = centre[Math.min(centre.length - 1, i + 1)];
        const tl = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]) || 1;
        return [p[0] - ((q1[1] - q0[1]) / tl) * o, p[1] + ((q1[0] - q0[0]) / tl) * o];
      });
      lane = makeLane(pts);
    }
    lanes.set(r.id, lane);
    return lane;
  }

  function layCars(r: Route, inA: number, inB: number): CarSlot[] {
    const lane = routeLane(r);
    const n = r.length;
    const w = (lane.length - inA - inB - CAR_GAP * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => {
      const s = inA + w / 2 + i * (w + CAR_GAP);
      const { p, t } = lane.at(s);
      return { cx: p[0], cy: p[1], w, h: CAR_H, angle: (Math.atan2(t[1], t[0]) * 180) / Math.PI, s, lane, curved: r.curve !== undefined };
    });
  }

  // How far from each city centre the first car starts: the dot's radius, or further at crowded cities.
  const insets = new Map<string, [number, number]>();
  const baseInset = (id: string) => (CITY_BY_ID[id].hub ? HUB_R : NODE_R);
  for (const r of data.routes) insets.set(r.id, [baseInset(r.a), baseInset(r.b)]);
  if (data.autoInset) {
    // a "link" is one route and its twin lane; both lanes always share their insets
    const links = data.routes.filter((r) => r.lane !== 1);
    const lanesOf = (l: Route) => (l.twin ? [l, ROUTE_BY_ID[l.twin]] : [l]);
    const carsOf = (l: Route) => lanesOf(l).flatMap((r) => layCars(r, ...insets.get(l.id)!));
    const cache = new Map(links.map((l) => [l.id, carsOf(l)]));
    const touch = (x: Route, y: Route) => cache.get(x.id)!.some((a) => cache.get(y.id)!.some((b) => carsTouch(a, b)));
    for (let iter = 0; iter < 40; iter++) {
      let changed = false;
      for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) {
        const x = links[i], y = links[j];
        const shared = [x.a, x.b].find((c) => c === y.a || c === y.b);
        if (!shared || !touch(x, y)) continue;
        const max = CITY_BY_ID[shared].hub ? HUB_INSET_MAX : INSET_MAX;
        for (const l of [x, y]) {
          const ins = insets.get(l.id)!;
          const k = l.a === shared ? 0 : 1;
          if (ins[k] < max) { ins[k] = Math.min(max, ins[k] + 1.5); cache.set(l.id, carsOf(l)); changed = true; }
        }
      }
      if (!changed) break;
    }
    for (const l of links) if (l.twin) insets.set(l.twin, insets.get(l.id)!);
  }

  const cars = new Map<string, CarSlot[]>();
  /** One slot per train car, evenly spaced along the route's lane. */
  function routeCars(r: Route): CarSlot[] {
    let c = cars.get(r.id);
    if (!c) cars.set(r.id, (c = layCars(r, ...insets.get(r.id)!)));
    return c;
  }

  function routeMidpoint(r: Route): XY {
    const lane = routeLane(r);
    return lane.at(lane.length / 2).p;
  }

  return { CITY_BY_ID, ROUTE_BY_ID, TICKET_BY_ID, cityXY, routeSegment, routeLane, routeCars, routeMidpoint };
}

/**
 * A rectangle in a car's own frame (x along the car from its centre, y across it), bent to follow a curved
 * lane, as an SVG path in that same frame. Straight cars return null: draw a plain <rect> instead.
 */
export function bentRect(car: CarSlot, x: number, y: number, w: number, h: number): string | null {
  if (!car.curved) return null;
  const a = (-car.angle * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const local = ([px, py]: XY): XY => {
    const dx = px - car.cx, dy = py - car.cy;
    return [dx * cos - dy * sin, dx * sin + dy * cos];
  };
  const steps = Math.max(4, Math.ceil(w / 6));
  const edge = (v: number) => Array.from({ length: steps + 1 }, (_, i) => {
    const { p, t } = car.lane.at(car.s + x + (i / steps) * w);
    return local([p[0] - t[1] * v, p[1] + t[0] * v]);
  });
  const top = edge(y), bottom = edge(y + h).reverse();
  return [...top, ...bottom].map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`).join('') + 'Z';
}
