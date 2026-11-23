import { describe, expect, it } from 'vitest';
import { SG } from '../src/map/sg';
import { ISLANDS, JOHOR, MAIN, SENTOSA, UBIN, JURONG_ISLAND } from '../src/map/sg/geo';
import { createMapModel, carsTouch } from '../src/map/model';
import { CARD_COLORS, type Route } from '../src/types';

const { cities, routes, tickets } = SG;
const M = createMapModel(SG);
const links = routes.filter((r) => r.lane !== 1); // one entry per connection (a double counts once)
const between = (x: string, y: string) => routes.filter((r) => [r.a, r.b].sort().join() === [x, y].sort().join());
const touches = (r: Route, id: string) => r.a === id || r.b === id;
type LL = [number, number];

/** Places that sit off the main island, and the island they are on. */
const OFFSHORE: Record<string, LL[]> = { SEN: SENTOSA, UBN: UBIN, JIS: JURONG_ISLAND };

function shortestCars(a: string, b: string): number {
  const dist: Record<string, number> = Object.fromEntries(cities.map((c) => [c.id, Infinity]));
  dist[a] = 0;
  const todo = new Set(cities.map((c) => c.id));
  while (todo.size) {
    let u = '';
    for (const v of todo) if (!u || dist[v] < dist[u]) u = v;
    todo.delete(u);
    for (const r of links) if (touches(r, u)) {
      const v = r.a === u ? r.b : r.a;
      dist[v] = Math.min(dist[v], dist[u] + r.length);
    }
  }
  return dist[b];
}

/** Is a lon/lat point inside a ring (even-odd rule)? */
function inRing([x, y]: LL, ring: LL[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe('Singapore map: data', () => {
  it('has unique ids, known places, lengths 1-6 and reciprocal double routes', () => {
    expect(new Set(cities.map((c) => c.id)).size).toBe(cities.length);
    expect(new Set(routes.map((r) => r.id)).size).toBe(routes.length);
    expect(new Set(tickets.map((t) => t.id)).size).toBe(tickets.length);
    for (const r of routes) {
      expect(M.CITY_BY_ID[r.a], r.id).toBeDefined();
      expect(M.CITY_BY_ID[r.b], r.id).toBeDefined();
      expect([1, 2, 3, 4, 5, 6]).toContain(r.length);
      if (r.twin) {
        const t = M.ROUTE_BY_ID[r.twin];
        expect(t.twin).toBe(r.id);
        expect(t.length).toBe(r.length);
        expect(t.curve).toEqual(r.curve);
      }
    }
    for (const l of links) expect(between(l.a, l.b).length, l.id).toBe(l.twin ? 2 : 1);
  });

  it('has 36-38 places and 85-95 routes', () => {
    expect(cities.length).toBeGreaterThanOrEqual(36);
    expect(cities.length).toBeLessThanOrEqual(38);
    expect(routes.length).toBeGreaterThanOrEqual(85);
    expect(routes.length).toBeLessThanOrEqual(95);
    expect(links.filter((r) => r.twin).length).toBeGreaterThanOrEqual(15);
  });

  it('Marina Bay is the hub (id BOB) with at least five places around it', () => {
    const hub = cities.filter((c) => c.hub);
    expect(hub.map((c) => [c.id, c.name])).toEqual([['BOB', 'Marina Bay']]);
    expect(new Set(links.filter((r) => touches(r, 'BOB')).map((r) => (r.a === 'BOB' ? r.b : r.a))).size).toBeGreaterThanOrEqual(5);
  });

  it('every place stands on its island: Sentosa, Pulau Ubin and Jurong Island offshore, the rest on the main island', () => {
    for (const c of cities) {
      const ll: LL = [c.lon, c.lat];
      const ring = OFFSHORE[c.id] ?? MAIN;
      expect(inRing(ll, ring), c.id).toBe(true);
      expect(inRing(ll, JOHOR), c.id).toBe(false);
      // and it really is in Singapore
      expect(c.lon > 103.6 && c.lon < 104.05 && c.lat > 1.23 && c.lat < 1.47, c.id).toBe(true);
    }
  });

  it('ships geography: the main island, Sentosa, Ubin, Jurong Island and Johor across the strait', () => {
    expect(MAIN.length).toBeGreaterThan(60);
    expect(MAIN.length + ISLANDS.reduce((s, i) => s + i.ring.length, 0)).toBeLessThan(500);
    for (const id of ['main', 'sentosa', 'ubin', 'tekong', 'jurong']) expect(ISLANDS.some((i) => i.id === id), id).toBe(true);
    // Singapore is about twice as wide as it is tall, on the board too
    const xs = MAIN.map((p) => SG.project(p)[0]), ys = MAIN.map((p) => SG.project(p)[1]);
    const ratio = (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    expect(ratio).toBeGreaterThan(1.5);
    expect(ratio).toBeLessThan(2.2);
    // Johor lies north of the whole island
    const johorSouth = Math.min(...JOHOR.map((p) => p[1]));
    expect(johorSouth).toBeGreaterThan(Math.min(...MAIN.map((p) => p[1])));
  });

  it('is connected, every place has two links or more, and the hub is not a bottleneck', () => {
    const reach = (skipHub: boolean) => {
      const start = cities.find((c) => !c.hub)!.id;
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const n = queue.shift()!;
        for (const r of links) if (touches(r, n) && !(skipHub && touches(r, 'BOB'))) {
          const m = r.a === n ? r.b : r.a;
          if (!seen.has(m)) { seen.add(m); queue.push(m); }
        }
      }
      return seen.size;
    };
    expect(reach(false)).toBe(cities.length);
    expect(reach(true)).toBe(cities.length - 1);
    for (const c of cities) expect(links.filter((r) => touches(r, c.id)).length, c.id).toBeGreaterThanOrEqual(2);
  });

  it('route lengths match the board: cars come out about the same size everywhere', () => {
    for (const r of links) {
      const [x1, y1] = M.cityXY(r.a), [x2, y2] = M.cityXY(r.b);
      const perCar = Math.hypot(x2 - x1, y2 - y1) / r.length;
      expect(perCar, r.id).toBeGreaterThan(42);
      expect(perCar, r.id).toBeLessThan(100);
    }
  });
});

describe('Singapore map: balance', () => {
  const n = (L: number) => routes.filter((r) => r.length === L).length;

  it('route lengths follow the classic mix: mostly 2s and 3s, a few long ones', () => {
    for (const L of [1, 2, 3, 4, 5, 6]) expect(n(L), `length ${L}`).toBeGreaterThan(0);
    expect((n(2) + n(3)) / routes.length).toBeGreaterThanOrEqual(0.5);
    expect(n(5) + n(6)).toBeLessThanOrEqual(0.2 * routes.length);
    expect(n(6) / routes.length).toBeLessThanOrEqual(0.08);
    expect(n(2)).toBeGreaterThan(n(4));
    expect(n(4)).toBeGreaterThan(n(6));
  });

  it('total cars are within 15% of the other maps (China 300)', () => {
    const cars = routes.reduce((s, r) => s + r.length, 0);
    expect(cars).toBeGreaterThanOrEqual(255);
    expect(cars).toBeLessThanOrEqual(345);
  });

  it('every card colour has exactly the same amount of track and two long (5-6) routes; about a fifth is gray', () => {
    const cars: Record<string, number> = {}, long: Record<string, number> = {};
    for (const r of routes) {
      cars[r.color] = (cars[r.color] ?? 0) + r.length;
      if (r.length >= 5) long[r.color] = (long[r.color] ?? 0) + 1;
    }
    const mean = CARD_COLORS.reduce((s, c) => s + (cars[c] ?? 0), 0) / CARD_COLORS.length;
    for (const c of CARD_COLORS) {
      expect(cars[c], c).toBe(mean);
      expect(long[c] ?? 0, c).toBeGreaterThanOrEqual(2);
    }
    const gray = routes.filter((r) => r.color === 'gray').length / routes.length;
    expect(gray).toBeGreaterThan(0.15);
    expect(gray).toBeLessThan(0.3);
  });

  it('the two tracks of a double are different colours, or both gray', () => {
    for (const r of routes.filter((x) => x.lane === -1)) {
      const t = M.ROUTE_BY_ID[r.twin!];
      if (r.color === 'gray' || t.color === 'gray') expect([r.color, t.color], r.id).toEqual(['gray', 'gray']);
      else expect(t.color, r.id).not.toBe(r.color);
    }
  });

  it('no colour comes into a place twice', () => {
    for (const c of cities) {
      const count: Record<string, number> = {};
      for (const r of routes) if (touches(r, c.id) && r.color !== 'gray') count[r.color] = (count[r.color] ?? 0) + 1;
      for (const [colour, k] of Object.entries(count)) expect(k, `${c.id} ${colour}`).toBe(1);
    }
  });

  it('no place is easy to cut off', () => {
    for (const c of cities) {
      const mine = links.filter((r) => touches(r, c.id));
      expect(mine.length, c.id).toBeGreaterThanOrEqual(2);
      // a double can't be fully taken by one player
      if (mine.some((r) => r.twin)) continue;
      expect(mine.length, c.id).toBeGreaterThanOrEqual(3);
      expect(mine.reduce((s, r) => s + r.length, 0), c.id).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('Singapore map: tickets', () => {
  it('40-42 tickets worth 5-24, each the fewest cars between its places, none finished by one route', () => {
    expect(tickets.length).toBeGreaterThanOrEqual(40);
    expect(tickets.length).toBeLessThanOrEqual(42);
    for (const t of tickets) {
      expect(t.id).toBe(`T-${t.a}-${t.b}`);
      expect(t.points, t.id).toBe(shortestCars(t.a, t.b));
      expect(t.points, t.id).toBeGreaterThanOrEqual(5);
      expect(t.points, t.id).toBeLessThanOrEqual(24);
      expect(between(t.a, t.b), t.id).toHaveLength(0);
    }
    expect(new Set(tickets.map((t) => [t.a, t.b].sort().join())).size).toBe(tickets.length);
  });

  it('mixes short, medium and long tickets; three long in a draw is rare', () => {
    const k = (lo: number, hi: number) => tickets.filter((t) => t.points >= lo && t.points <= hi).length;
    expect(k(5, 9)).toBeGreaterThanOrEqual(12);
    expect(k(10, 15)).toBeGreaterThanOrEqual(14);
    expect(k(16, 24)).toBeGreaterThanOrEqual(8);
    const long = tickets.filter((t) => t.points >= 13).length, nT = tickets.length;
    expect((long * (long - 1) * (long - 2)) / (nT * (nT - 1) * (nT - 2))).toBeLessThan(0.15);
  });

  it('has the long cross-island classics', () => {
    const has = (a: string, b: string) => tickets.some((t) => [t.a, t.b].sort().join() === [a, b].sort().join());
    for (const [a, b] of [['JIS', 'CHG'], ['SEN', 'UBN'], ['SBL', 'BOB'], ['TUA', 'BOB'], ['SBW', 'SEN']]) expect(has(a, b), `${a}-${b}`).toBe(true);
  });

  it('every place is on two or three tickets', () => {
    const per: Record<string, number> = {};
    for (const t of tickets) for (const c of [t.a, t.b]) per[c] = (per[c] ?? 0) + 1;
    for (const c of cities) {
      expect(per[c.id] ?? 0, c.id).toBeGreaterThanOrEqual(2);
      expect(per[c.id] ?? 0, c.id).toBeLessThanOrEqual(3);
    }
  });
});

describe('Singapore map: layout', () => {
  const cross = (p1: number[], p2: number[], p3: number[], p4: number[]) => {
    const o = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    return o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2);
  };
  const distSeg = ([px, py]: number[], [ax, ay]: number[], [bx, by]: number[]) => {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  it('no two routes cross', () => {
    for (let i = 0; i < links.length; i++) for (let j = i + 1; j < links.length; j++) {
      const r = links[i], s = links[j];
      if ([r.a, r.b].some((x) => touches(s, x))) continue;
      const p = M.routeLane(r).pts, q = M.routeLane(s).pts;
      const hit = p.slice(1).some((_, a) => q.slice(1).some((__, b) => cross(p[a], p[a + 1], q[b], q[b + 1])));
      expect(hit, `${r.id} x ${s.id}`).toBe(false);
    }
  });

  it('no route runs over a place it does not stop at', () => {
    for (const r of links) {
      const p = M.routeLane(r).pts;
      for (const c of cities) {
        if (touches(r, c.id)) continue;
        const d = Math.min(...p.slice(1).map((_, a) => distSeg(M.cityXY(c.id), p[a], p[a + 1])));
        expect(d, `${r.id} passes ${c.id}`).toBeGreaterThanOrEqual(c.hub ? 34 : 22);
      }
    }
  });

  it('the hub’s name banner covers no route and sits close to the hub', () => {
    const hub = cities.find((c) => c.hub)!;
    const [x, y] = M.cityXY(hub.id);
    const [bx, by, scale = 1] = hub.banner ?? [0, 64];
    const box = { cx: x + bx, cy: y + by, w: (156 + 32) * scale, h: 30 * scale, angle: 0, s: 0, lane: M.routeLane(routes[0]), curved: false };
    expect(Math.hypot(bx, by) - box.w / 2).toBeLessThan(42 + 12);
    for (const r of routes) for (const c of M.routeCars(r)) expect(carsTouch(box, c, 0), r.id).toBe(false);
  });

  it('places are well apart', () => {
    for (let i = 0; i < cities.length; i++) for (let j = i + 1; j < cities.length; j++) {
      const [x1, y1] = M.cityXY(cities[i].id), [x2, y2] = M.cityXY(cities[j].id);
      expect(Math.hypot(x2 - x1, y2 - y1), `${cities[i].id} ${cities[j].id}`).toBeGreaterThanOrEqual(85);
    }
  });

  it('cars are a consistent size and never touch another route’s cars', () => {
    const all = routes.map((r) => ({ r, cars: M.routeCars(r) }));
    for (const { r, cars } of all) {
      expect(cars).toHaveLength(r.length);
      for (const c of cars) {
        expect(c.w, r.id).toBeGreaterThanOrEqual(28);
        expect(c.w, r.id).toBeLessThanOrEqual(70);
      }
    }
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const x = all[i], y = all[j];
      if (x.r.twin === y.r.id) continue;
      const hit = x.cars.some((a) => y.cars.some((b) => carsTouch(a, b, 0.5)));
      expect(hit, `${x.r.id} / ${y.r.id}`).toBe(false);
    }
  });

  it('every place (with room for its label), car and route lies inside the map bounds', () => {
    const b = SG.bounds;
    const inside = (x: number, y: number, m = 0) => x >= b.x + m && x <= b.x + b.width - m && y >= b.y + m && y <= b.y + b.height - m;
    for (const c of cities) {
      const [x, y] = M.cityXY(c.id);
      expect(inside(x, y, 40), c.id).toBe(true);
      const w = 9 * c.name.length + 24;
      if (c.label.includes('l')) expect(x - w, `${c.id} label`).toBeGreaterThanOrEqual(b.x);
      if (c.label.includes('r')) expect(x + w, `${c.id} label`).toBeLessThanOrEqual(b.x + b.width);
    }
    for (const r of routes) for (const c of M.routeCars(r)) expect(inside(c.cx, c.cy), r.id).toBe(true);
  });
});
