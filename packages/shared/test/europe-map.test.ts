import { describe, expect, it } from 'vitest';
import { EUROPE } from '../src/map/europe';
import { createMapModel, carsTouch } from '../src/map/model';
import { CARD_COLORS, type Route } from '../src/types';

const { cities, routes, tickets } = EUROPE;
const M = createMapModel(EUROPE);
const links = routes.filter((r) => r.lane !== 1); // one entry per connection (a double counts once)
const between = (x: string, y: string) => routes.filter((r) => [r.a, r.b].sort().join() === [x, y].sort().join());
const touches = (r: Route, id: string) => r.a === id || r.b === id;

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

describe('Europe map: data', () => {
  it('has unique ids, known cities, lengths 1-6 and reciprocal double routes', () => {
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
  });

  it('has 33-38 cities and 88-105 routes', () => {
    expect(cities.length).toBeGreaterThanOrEqual(33);
    expect(cities.length).toBeLessThanOrEqual(38);
    expect(routes.length).toBeGreaterThanOrEqual(88);
    expect(routes.length).toBeLessThanOrEqual(105);
  });

  it('has a single hub with id BOB and at least five routes', () => {
    const hub = cities.filter((c) => c.hub);
    expect(hub.map((c) => c.id)).toEqual(['BOB']);
    expect(new Set(links.filter((r) => touches(r, 'BOB')).map((r) => (r.a === 'BOB' ? r.b : r.a))).size).toBeGreaterThanOrEqual(5);
  });

  it('is connected, and the hub is not a bottleneck', () => {
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
  });
});

describe('Europe map: balance', () => {
  const n = (L: number) => routes.filter((r) => r.length === L).length;

  it('route lengths: mostly 2-3, a good number of 4, a few 5-6, 1s rare and mostly double', () => {
    const total = routes.length;
    expect((n(2) + n(3)) / total).toBeGreaterThanOrEqual(0.5);
    expect(n(4) / total).toBeGreaterThanOrEqual(0.08);
    expect(n(2)).toBeGreaterThan(n(4));
    expect(n(5) + n(6)).toBeGreaterThanOrEqual(3);
    expect(n(5) + n(6)).toBeLessThanOrEqual(0.15 * total);
    expect(n(6) / total).toBeLessThanOrEqual(0.12);
    expect(n(1) / total).toBeLessThanOrEqual(0.08);
    const ones = routes.filter((r) => r.length === 1);
    expect(ones.filter((r) => r.twin).length).toBeGreaterThanOrEqual(ones.length / 2);
  });

  it('total cars are within 15% of the other maps (China 300)', () => {
    const cars = routes.reduce((s, r) => s + r.length, 0);
    expect(cars).toBeGreaterThanOrEqual(255);
    expect(cars).toBeLessThanOrEqual(345);
  });

  it('20-25% of routes are doubles, concentrated in the core and sparse at the edges', () => {
    const d = routes.filter((r) => r.twin).length / routes.length;
    expect(d).toBeGreaterThanOrEqual(0.2);
    expect(d).toBeLessThanOrEqual(0.25);
    const core = (id: string) => { const c = M.CITY_BY_ID[id]; return c.lon >= -2 && c.lon <= 15 && c.lat >= 43 && c.lat <= 54; };
    const inCore = links.filter((r) => core(r.a) && core(r.b)), edge = links.filter((r) => !core(r.a) && !core(r.b));
    const share = (rs: Route[]) => rs.filter((r) => r.twin).length / Math.max(1, rs.length);
    expect(inCore.length).toBeGreaterThan(10);
    expect(edge.length).toBeGreaterThan(5);
    expect(share(inCore)).toBeGreaterThanOrEqual(0.3);
    expect(share(edge)).toBeLessThanOrEqual(0.15);
    expect(share(inCore)).toBeGreaterThanOrEqual(2 * share(edge));
  });

  it('every card colour has about the same amount of track and at least two long (5-6) routes; 20-25% grey', () => {
    const cars: Record<string, number> = {}, long: Record<string, number> = {};
    for (const r of routes) {
      cars[r.color] = (cars[r.color] ?? 0) + r.length;
      if (r.length >= 5) long[r.color] = (long[r.color] ?? 0) + 1;
    }
    const mean = CARD_COLORS.reduce((s, c) => s + (cars[c] ?? 0), 0) / CARD_COLORS.length;
    for (const c of CARD_COLORS) {
      expect(Math.abs((cars[c] ?? 0) - mean), c).toBeLessThanOrEqual(mean * 0.1);
      expect(long[c] ?? 0, c).toBeGreaterThanOrEqual(2);
    }
    const gray = routes.filter((r) => r.color === 'gray').length / routes.length;
    expect(gray).toBeGreaterThanOrEqual(0.2);
    expect(gray).toBeLessThanOrEqual(0.25);
  });

  it('the two tracks of a double are different colours, or both gray', () => {
    for (const r of routes.filter((x) => x.lane === -1)) {
      const t = M.ROUTE_BY_ID[r.twin!];
      if (r.color === 'gray' || t.color === 'gray') expect([r.color, t.color], r.id).toEqual(['gray', 'gray']);
      else expect(t.color, r.id).not.toBe(r.color);
    }
  });

  it('no colour comes into a city three times, and at most three cities have one colour twice', () => {
    const repeated: string[] = [];
    for (const c of cities) {
      const count: Record<string, number> = {};
      for (const r of routes) if (touches(r, c.id) && r.color !== 'gray') count[r.color] = (count[r.color] ?? 0) + 1;
      for (const [colour, k] of Object.entries(count)) {
        expect(k, `${c.id} ${colour}`).toBeLessThanOrEqual(2);
        if (k === 2) repeated.push(c.id);
      }
    }
    expect(repeated.length, repeated.join()).toBeLessThanOrEqual(3);
  });

  it('no city is easy to cut off', () => {
    for (const c of cities) {
      const mine = links.filter((r) => touches(r, c.id));
      expect(mine.length, c.id).toBeGreaterThanOrEqual(2);
      // a double can't be fully taken by one player, so a city with one is safe in a 2-player game
      if (mine.some((r) => r.twin)) continue;
      expect(mine.length, c.id).toBeGreaterThanOrEqual(3);
      expect(mine.reduce((s, r) => s + r.length, 0), c.id).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('Europe map: tickets', () => {
  it('38-46 tickets worth 4-26, each the fewest cars between its cities, none finished by one route', () => {
    expect(tickets.length).toBeGreaterThanOrEqual(38);
    expect(tickets.length).toBeLessThanOrEqual(46);
    for (const t of tickets) {
      expect(t.points, t.id).toBe(shortestCars(t.a, t.b));
      expect(t.points).toBeGreaterThanOrEqual(4);
      expect(t.points).toBeLessThanOrEqual(26);
      expect(between(t.a, t.b), t.id).toHaveLength(0);
    }
  });

  it('mixes short (4-8), medium (9-15) and at least three long (18-25) tickets; three long in a draw is rare', () => {
    const k = (lo: number, hi: number) => tickets.filter((t) => t.points >= lo && t.points <= hi).length;
    expect(k(4, 8)).toBeGreaterThanOrEqual(8);
    expect(k(9, 15)).toBeGreaterThanOrEqual(12);
    expect(k(18, 25)).toBeGreaterThanOrEqual(3);
    const long = tickets.filter((t) => t.points >= 13).length, n = tickets.length;
    expect((long * (long - 1) * (long - 2)) / (n * (n - 1) * (n - 2))).toBeLessThan(0.1);
  });

  it('no region is overweighted and every city is on one to four tickets', () => {
    const region = (id: string) => { const c = M.CITY_BY_ID[id]; return (c.lat >= 50 ? 'N' : 'S') + (c.lon < 5 ? 'W' : c.lon < 16 ? 'C' : 'E'); };
    const cnt: Record<string, number> = {}, per: Record<string, number> = {};
    for (const t of tickets) for (const c of [t.a, t.b]) { cnt[region(c)] = (cnt[region(c)] ?? 0) + 1; per[c] = (per[c] ?? 0) + 1; }
    for (const [r, k] of Object.entries(cnt)) expect(k / (tickets.length * 2), r).toBeLessThanOrEqual(0.3);
    for (const c of cities) {
      expect(per[c.id] ?? 0, c.id).toBeGreaterThanOrEqual(1);
      expect(per[c.id] ?? 0, c.id).toBeLessThanOrEqual(4);
    }
  });
});

describe('Europe map: layout', () => {
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

  it('no route runs over a city it does not stop at', () => {
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

  it('every city, car and label lies inside the map bounds', () => {
    const b = EUROPE.bounds;
    const inside = (x: number, y: number) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
    for (const c of cities) expect(inside(...M.cityXY(c.id)), c.id).toBe(true);
    for (const r of routes) for (const c of M.routeCars(r)) expect(inside(c.cx, c.cy), r.id).toBe(true);
  });
});
