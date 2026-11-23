import { describe, expect, it } from 'vitest';
import { SG } from '../src/map/sg';
import type { Route, Ticket } from '../src/types';

/**
 * Gameplay balance of the Singapore map, from bot reviews: tickets should neither be a coin flip on one
 * route nor a free gift, and the central spine (MacRitchie / Bukit Timah / Clementi / Zoo) must not be
 * the only way across.
 */
const { cities, routes, tickets } = SG;
const links = routes.filter((r) => r.lane !== 1); // a double counts once
const touches = (r: Route, id: string) => r.a === id || r.b === id;
const ISLAND = new Set(['SEN', 'UBN', 'JIS']);
const EAST = ['CHG', 'CVL', 'PSR', 'TAM', 'BDK', 'ECP', 'UBN'];
const FAR_WEST = ['TUA', 'NTU', 'JIS', 'LCK', 'SBL'];
const SLACK = 4;

/** Fewest cars from `a` to every place, over `rs` and never through a place in `avoid`. */
function dist(a: string, rs: Route[] = routes, avoid: Set<string> = new Set()): Record<string, number> {
  const d: Record<string, number> = Object.fromEntries(cities.map((c) => [c.id, Infinity]));
  d[a] = 0;
  const todo = new Set(cities.map((c) => c.id).filter((c) => !avoid.has(c)));
  while (todo.size) {
    let u = '';
    for (const v of todo) if (!u || d[v] < d[u]) u = v;
    todo.delete(u);
    if (d[u] === Infinity) break;
    for (const r of rs) if (touches(r, u)) {
      const v = r.a === u ? r.b : r.a;
      if (!avoid.has(v)) d[v] = Math.min(d[v], d[u] + r.length);
    }
  }
  return d;
}

/** Every route that lies on some shortest path of the ticket. */
function onShortest(t: Ticket): Route[] {
  const da = dist(t.a), db = dist(t.b), best = da[t.b];
  return routes.filter((r) => Math.min(da[r.a] + db[r.b], da[r.b] + db[r.a]) + r.length === best);
}

/** One shortest path (route list) of the ticket. */
function bestPath(t: Ticket): Route[] {
  const d = dist(t.a), out: Route[] = [];
  for (let u = t.b; u !== t.a; ) {
    const r = routes.find((x) => touches(x, u) && d[x.a === u ? x.b : x.a] + x.length === d[u])!;
    out.push(r);
    u = r.a === u ? r.b : r.a;
  }
  return out;
}

/** How many tickets have each link on one of their shortest paths. */
function ticketLoad(): Map<string, number> {
  const load = new Map<string, number>();
  for (const t of tickets) for (const r of onShortest(t)) if (r.lane !== 1) load.set(r.id, (load.get(r.id) ?? 0) + 1);
  return load;
}

describe('Singapore map: ticket difficulty', () => {
  it('no ticket hangs on one route: losing any route of a shortest path costs at most 4 more cars (island links aside)', () => {
    for (const t of tickets) for (const r of onShortest(t)) {
      if (ISLAND.has(r.a) || ISLAND.has(r.b)) continue;
      const detour = dist(t.a, routes.filter((x) => x !== r))[t.b];
      expect(detour, `${t.id} without ${r.id}`).toBeLessThanOrEqual(t.points + SLACK);
    }
  });

  it('every ticket worth 16+ has a second, route-disjoint way within 4 cars', () => {
    for (const t of tickets.filter((x) => x.points >= 16)) {
      const used = new Set(bestPath(t));
      const alt = dist(t.a, routes.filter((r) => !used.has(r)))[t.b];
      expect(alt, t.id).toBeLessThanOrEqual(t.points + SLACK);
    }
  });

  it('at most four tickets are worth under 8', () => {
    expect(tickets.filter((t) => t.points < 8).map((t) => t.id).length).toBeLessThanOrEqual(4);
  });

  it('every ticket worth 18+ reaches the east or the far west', () => {
    for (const t of tickets.filter((x) => x.points >= 18)) {
      expect([...EAST, ...FAR_WEST].some((c) => c === t.a || c === t.b), t.id).toBe(true);
    }
  });
});

describe('Singapore map: contest', () => {
  it('the busiest single routes are spread out: no place ends more than two of the top eight', () => {
    const load = ticketLoad();
    const top = links.filter((r) => !r.twin).sort((x, y) => (load.get(y.id) ?? 0) - (load.get(x.id) ?? 0)).slice(0, 8);
    for (const c of cities) {
      const mine = top.filter((r) => touches(r, c.id)).map((r) => r.id);
      expect(mine.length, `${c.id}: ${mine.join(' ')}`).toBeLessThanOrEqual(2);
    }
  });

  it('no single route lies on the shortest way of more than a quarter of the tickets', () => {
    const load = ticketLoad();
    for (const r of links.filter((x) => !x.twin)) expect(load.get(r.id) ?? 0, r.id).toBeLessThanOrEqual(tickets.length / 4);
  });

  it('the west reaches the centre around the Zoo, Bukit Timah or Clementi (each closed in turn) within 4 more cars', () => {
    for (const hub of ['MND', 'BTM', 'CLM']) for (const w of ['CCK', 'JLG', 'NTU']) {
      const open = dist(w), shut = dist(w, routes, new Set([hub]));
      for (const c of ['MCR', 'BTG', 'HLV']) expect(shut[c], `${w}-${c} without ${hub}`).toBeLessThanOrEqual(open[c] + SLACK);
    }
  });
});
