import { describe, expect, it } from 'vitest';
import { USA } from '../src/map/usa';
import { createMapModel, carsTouch } from '../src/map/model';
import { CARD_COLORS, type Route } from '../src/types';

const { cities, routes, tickets } = USA;
const M = createMapModel(USA);
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

describe('USA map: data', () => {
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

  it('is the agreed board: lower 48 plus Toronto, with the cuts and links asked for', () => {
    const ids = new Set(cities.map((c) => c.id));
    for (const gone of ['SD', 'TIJ', 'VAN', 'MTY', 'HOU', 'DET', 'ORL']) expect(ids.has(gone), gone).toBe(false);
    expect(ids.has('TOR')).toBe(true);
    expect(cities.some((c) => c.special)).toBe(false);
    expect(between('CHI', 'TOR').map((r) => r.length)).toEqual([5]);
    expect(between('CHI', 'PIT')).toHaveLength(1);
    expect(between('DAL', 'NOL')).toHaveLength(1);
    for (const [a, b] of [['JAX', 'MIA'], ['PHX', 'ABQ'], ['ABQ', 'AMA'], ['SAT', 'DAL']]) expect(between(a, b), `${a}-${b}`).toHaveLength(2);
    const gulf = between('NOL', 'MIA');
    expect(gulf).toHaveLength(1);
    expect(gulf[0].length).toBe(6);
    // one smooth convex arc (a single bend, not a wiggly line through waypoints)
    expect(typeof gulf[0].curve).toBe('number');
  });

  it('has a hub (Taitoka) in the middle with at least five routes', () => {
    const hub = cities.filter((c) => c.hub);
    expect(hub.map((c) => c.id)).toEqual(['BOB']);
    expect(new Set(links.filter((r) => touches(r, 'BOB')).map((r) => (r.a === 'BOB' ? r.b : r.a))).size).toBeGreaterThanOrEqual(5);
  });

  it('is connected', () => {
    const seen = new Set(['SEA']);
    const queue = ['SEA'];
    while (queue.length) {
      const n = queue.shift()!;
      for (const r of links) if (touches(r, n)) {
        const m = r.a === n ? r.b : r.a;
        if (!seen.has(m)) { seen.add(m); queue.push(m); }
      }
    }
    expect(seen.size).toBe(cities.length);
  });
});

describe('USA map: balance', () => {
  it('route lengths follow the classic mix: mostly 2s and 3s, few 6s', () => {
    const n = (L: number) => routes.filter((r) => r.length === L).length;
    const total = routes.length;
    for (const L of [1, 2, 3, 4, 5, 6]) expect(n(L), `length ${L}`).toBeGreaterThan(0);
    expect(n(6) / total).toBeLessThanOrEqual(0.12);
    expect((n(2) + n(3)) / total).toBeGreaterThanOrEqual(0.5);
    expect(n(2)).toBeGreaterThan(n(4));
    expect(n(4)).toBeGreaterThan(n(6));
  });

  it('every card colour has the same amount of track and at least two long (5-6) routes', () => {
    const cars: Record<string, number> = {}, long: Record<string, number> = {};
    for (const r of routes) {
      cars[r.color] = (cars[r.color] ?? 0) + r.length;
      if (r.length >= 5) long[r.color] = (long[r.color] ?? 0) + 1;
    }
    const mean = CARD_COLORS.reduce((s, c) => s + cars[c], 0) / CARD_COLORS.length;
    for (const c of CARD_COLORS) {
      expect(Math.abs(cars[c] - mean), c).toBeLessThanOrEqual(mean * 0.1);
      expect(long[c] ?? 0, c).toBeGreaterThanOrEqual(2);
    }
    const gray = routes.filter((r) => r.color === 'gray').length / routes.length;
    expect(gray).toBeGreaterThan(0.2);
    expect(gray).toBeLessThan(0.35);
  });

  it('the two tracks of a double are different colours, or both gray', () => {
    for (const r of routes.filter((x) => x.lane === -1)) {
      const t = M.ROUTE_BY_ID[r.twin!];
      if (r.color === 'gray' || t.color === 'gray') expect([r.color, t.color], r.id).toEqual(['gray', 'gray']);
      else expect(t.color, r.id).not.toBe(r.color);
    }
  });

  it('no colour comes into a city three times, and exactly Nashville, Atlanta and Pittsburgh have one colour twice', () => {
    const repeated: string[] = [];
    for (const c of cities) {
      const count: Record<string, number> = {};
      for (const r of routes) if (touches(r, c.id) && r.color !== 'gray') count[r.color] = (count[r.color] ?? 0) + 1;
      for (const [colour, n] of Object.entries(count)) {
        expect(n, `${c.id} ${colour}`).toBeLessThanOrEqual(2);
        if (n === 2) repeated.push(c.id);
      }
    }
    expect(repeated.sort()).toEqual(['ATL', 'NSH', 'PIT']);
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

describe('USA map: tickets', () => {
  it('44 tickets worth 4-26, each the fewest cars between its cities, none finished by one route', () => {
    expect(tickets).toHaveLength(44);
    for (const t of tickets) {
      expect(t.points, t.id).toBe(shortestCars(t.a, t.b));
      expect(t.points).toBeGreaterThanOrEqual(4);
      expect(t.points).toBeLessThanOrEqual(26);
      expect(between(t.a, t.b), t.id).toHaveLength(0);
    }
  });

  it('a fresh draw of three is rarely all long tickets (13+ points)', () => {
    const long = tickets.filter((t) => t.points >= 13).length, n = tickets.length;
    expect((long * (long - 1) * (long - 2)) / (n * (n - 1) * (n - 2))).toBeLessThan(0.1);
    expect(tickets.filter((t) => t.points >= 5 && t.points <= 12).length).toBeGreaterThanOrEqual(24);
  });

  it('every city is on two or three tickets', () => {
    const n: Record<string, number> = {};
    for (const t of tickets) for (const c of [t.a, t.b]) n[c] = (n[c] ?? 0) + 1;
    for (const c of cities) {
      expect(n[c.id] ?? 0, c.id).toBeGreaterThanOrEqual(2);
      expect(n[c.id] ?? 0, c.id).toBeLessThanOrEqual(3);
    }
  });
});

describe('USA map: layout', () => {
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
        const xy = M.cityXY(c.id);
        const d = Math.min(...p.slice(1).map((_, a) => distSeg(xy, p[a], p[a + 1])));
        expect(d, `${r.id} passes ${c.id}`).toBeGreaterThanOrEqual(c.hub ? 34 : 22);
      }
    }
  });

  it('the hub’s name banner covers no route', () => {
    const hub = cities.find((c) => c.hub)!;
    const [x, y] = M.cityXY(hub.id);
    const [bx, by, scale = 1] = hub.banner ?? [0, 64];
    // the banner is 156 wide with 16-unit ribbon tails each side, and 30 tall (see HubCity in MapView)
    const box = { cx: x + bx, cy: y + by, w: (156 + 32) * scale, h: 30 * scale, angle: 0, s: 0, lane: M.routeLane(routes[0]), curved: false };
    // and it sits close to the hub: its near end within a few units of the starburst (radius 42)
    expect(Math.hypot(bx, by) - box.w / 2).toBeLessThan(42 + 12);
    for (const r of routes) for (const c of M.routeCars(r)) expect(carsTouch(box, c, 0), r.id).toBe(false);
  });

  it('a car on a curved route bends along its lane', async () => {
    const { bentRect } = await import('../src/map/model');
    const car = M.routeCars(M.ROUTE_BY_ID['NOL-MIA'])[2];
    expect(car.curved).toBe(true);
    const d = bentRect(car, -car.w / 2, -car.h / 2, car.w, car.h)!;
    const pts = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
    expect(pts.length).toBeGreaterThan(8);
    // in the car's own frame the ends sit at about ±w/2 along it (corners swing a little on the curve),
    // and the shape stays close to its centre line
    expect(Math.abs(Math.min(...pts.map((p) => p[0])) + car.w / 2)).toBeLessThan(1.5);
    expect(Math.abs(Math.max(...pts.map((p) => p[0])) - car.w / 2)).toBeLessThan(1.5);
    for (const [, y] of pts) expect(Math.abs(y)).toBeLessThan(car.h);
    expect(bentRect(M.routeCars(M.ROUTE_BY_ID['SEA-SPO'])[0], 0, 0, 10, 10)).toBeNull();
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
});
