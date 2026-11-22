import { describe, expect, it } from 'vitest';
import { CHINA } from '../src/map/china';
import { BORDER, LAND, RIVERS, TAIWAN } from '../src/map/china/geo';
import { createMapModel, carsTouch } from '../src/map/model';
import { CARD_COLORS, type Route } from '../src/types';

const { cities, routes, tickets } = CHINA;
const M = createMapModel(CHINA);
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

describe('China map: data', () => {
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

  it('every city has a Chinese name; no Macau and nothing on Taiwan', () => {
    for (const c of cities) expect(c.zh, c.id).toMatch(/^[一-鿿]+$/);
    expect(cities.some((c) => /maca/i.test(c.name))).toBe(false);
    for (const c of cities) expect(c.lon > 119.9 && c.lon < 122.1 && c.lat > 21.8 && c.lat < 25.4, c.id).toBe(false);
  });

  it('has Beijing as the hub (id BOB) with at least five routes', () => {
    const hub = cities.filter((c) => c.hub);
    expect(hub.map((c) => [c.id, c.name, c.zh])).toEqual([['BOB', 'Beijing', '北京']]);
    expect(new Set(links.filter((r) => touches(r, 'BOB')).map((r) => (r.a === 'BOB' ? r.b : r.a))).size).toBeGreaterThanOrEqual(5);
  });

  it('the hub is not a bottleneck: the rest of the map stays connected without Beijing', () => {
    const start = cities.find((c) => !c.hub)!.id;
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const n = queue.shift()!;
      for (const r of links) if (touches(r, n) && !touches(r, 'BOB')) {
        const m = r.a === n ? r.b : r.a;
        if (!seen.has(m)) { seen.add(m); queue.push(m); }
      }
    }
    expect(seen.size).toBe(cities.length - 1);
  });

  it('is connected and no city has only one route', () => {
    const seen = new Set(['BOB']);
    const queue = ['BOB'];
    while (queue.length) {
      const n = queue.shift()!;
      for (const r of links) if (touches(r, n)) {
        const m = r.a === n ? r.b : r.a;
        if (!seen.has(m)) { seen.add(m); queue.push(m); }
      }
    }
    expect(seen.size).toBe(cities.length);
    for (const c of cities) expect(links.filter((r) => touches(r, c.id)).length, c.id).toBeGreaterThanOrEqual(2);
  });

  it('ships geography: land, Taiwan, the border and both great rivers', () => {
    expect(LAND.length).toBeGreaterThan(5);
    expect(TAIWAN.length).toBeGreaterThanOrEqual(1);
    expect(BORDER.length).toBeGreaterThan(0);
    expect(RIVERS.yangtze.length).toBeGreaterThan(0);
    expect(RIVERS.yellow.length).toBeGreaterThan(0);
  });
});

describe('China map: balance', () => {
  it('route lengths follow the classic mix: mostly 2s and 3s, few 6s', () => {
    const n = (L: number) => routes.filter((r) => r.length === L).length;
    const total = routes.length;
    for (const L of [1, 2, 3, 4, 5, 6]) expect(n(L), `length ${L}`).toBeGreaterThan(0);
    expect(n(6) / total).toBeLessThanOrEqual(0.12);
    expect((n(2) + n(3)) / total).toBeGreaterThanOrEqual(0.5);
    expect(n(2)).toBeGreaterThan(n(4));
    expect(n(4)).toBeGreaterThan(n(6));
    const cars = routes.reduce((s, r) => s + r.length, 0);
    expect(cars).toBeGreaterThanOrEqual(280);
    expect(cars).toBeLessThanOrEqual(310);
  });

  it('every card colour has exactly the same amount of track and at least two long (5-6) routes', () => {
    const cars: Record<string, number> = {}, long: Record<string, number> = {};
    for (const r of routes) {
      cars[r.color] = (cars[r.color] ?? 0) + r.length;
      if (r.length >= 5) long[r.color] = (long[r.color] ?? 0) + 1;
    }
    const mean = CARD_COLORS.reduce((s, c) => s + cars[c], 0) / CARD_COLORS.length;
    for (const c of CARD_COLORS) {
      expect(cars[c], c).toBe(mean);
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

  it('no colour comes into a city twice (stricter than the USA map, which allows three named cities one repeat)', () => {
    for (const c of cities) {
      const count: Record<string, number> = {};
      for (const r of routes) if (touches(r, c.id) && r.color !== 'gray') count[r.color] = (count[r.color] ?? 0) + 1;
      for (const [colour, n] of Object.entries(count)) expect(n, `${c.id} ${colour}`).toBe(1);
    }
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

describe('China map: tickets', () => {
  it('46 tickets worth 4-26, each the fewest cars between its cities, none finished by one route', () => {
    expect(tickets).toHaveLength(46);
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

  it('has the long classics', () => {
    const has = (a: string, b: string) => tickets.some((t) => [t.a, t.b].sort().join() === [a, b].sort().join());
    for (const [a, b] of [['HRB', 'HAK'], ['URC', 'SHA'], ['LXA', 'HKG'], ['NGQ', 'BOB']]) expect(has(a, b), `${a}-${b}`).toBe(true);
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

describe('China map: layout', () => {
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
    const b = CHINA.bounds;
    const inside = (x: number, y: number) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
    for (const c of cities) expect(inside(...M.cityXY(c.id)), c.id).toBe(true);
    for (const r of routes) for (const c of M.routeCars(r)) expect(inside(c.cx, c.cy), r.id).toBe(true);
  });
});
