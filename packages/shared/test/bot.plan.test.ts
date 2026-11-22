import { describe, expect, it } from 'vitest';
import { ROUTES, ROUTE_BY_ID, TICKETS, TICKET_BY_ID } from '../src/map';
import { costGraph, planNetwork, routeUrgency, shortestPath, longestTrailOf } from '../src/bot/plan';
import { bestKeep, evaluateTicketSet } from '../src/bot/tickets';
import { emptyHand, makeState, player } from './helpers';

const view = (claims: Record<string, string> = {}, hand = emptyHand(), trains = 50) =>
  makeState({ claims, players: { '0': player({ hand, trains }), '1': player({ trains: 50 }) }, deckCount: 50, discardCount: 0, ticketDeckCount: 20 });

describe('costGraph', () => {
  it('prices my routes at 0, drops claimed routes and the twin of my own lane', () => {
    const g = costGraph(view({ 'SEA-POR': '0', 'SF-RNO': '1' }), '0');
    expect(g.costOf('SEA-POR')).toBe(0);
    expect(g.costOf('SEA-POR-2')).toBe(Infinity);
    expect(g.costOf('SF-RNO')).toBe(Infinity);
    expect(g.costOf('SF-RNO-2')).toBeGreaterThan(0);
    expect(g.costOf('SF-RNO-2')).toBeLessThan(Infinity);
  });

  it('makes a coloured route cheaper when I hold its colour', () => {
    const plain = costGraph(view(), '0').costOf('BOI-SLC');
    const held = costGraph(view({}, emptyHand({ blue: 4 })), '0').costOf('BOI-SLC');
    expect(held).toBeLessThan(plain);
  });
});

describe('shortestPath', () => {
  it('picks a cheaper path that uses routes I own', () => {
    const free = shortestPath(costGraph(view(), '0'), 'SEA', 'SF')!;
    expect(free.routes.length).toBeGreaterThanOrEqual(1);
    const owned = shortestPath(costGraph(view({ 'SEA-POR': '0' }), '0'), 'SEA', 'SF')!;
    expect(owned.routes).toHaveLength(1);
    expect(ROUTE_BY_ID[owned.routes[0]].a + ROUTE_BY_ID[owned.routes[0]].b).toBe('PORSF');
    expect(owned.cost).toBeLessThan(free.cost);
  });

  it('returns null when the city is cut off', () => {
    const into = ROUTES.filter((r) => r.a === 'BOS' || r.b === 'BOS').map((r) => r.id);
    const claims = Object.fromEntries(into.map((id) => [id, '1']));
    expect(shortestPath(costGraph(view(claims), '0'), 'SF', 'BOS')).toBeNull();
    expect(shortestPath(costGraph(view(), '0'), 'SF', 'SF')).toEqual({ cost: 0, routes: [] });
  });
});

describe('planNetwork', () => {
  it('shares routes between tickets (greedy Steiner)', () => {
    const v = view();
    const a = planNetwork(v, '0', ['T-LA-CHI']);
    const b = planNetwork(v, '0', ['T-LA-OMA']);
    const both = planNetwork(v, '0', ['T-LA-CHI', 'T-LA-OMA']);
    expect(both.trainsNeeded).toBeLessThan(a.trainsNeeded + b.trainsNeeded);
    expect(both.unreachable).toEqual([]);
    expect(both.perTicket.get('T-LA-OMA')).toBeDefined();
    // never both lanes of a double
    for (const id of both.routes) {
      const twin = ROUTE_BY_ID[id].twin;
      if (twin) expect(both.routes.has(twin)).toBe(false);
    }
  });

  it('reports unreachable tickets and drops what does not fit the budget', () => {
    const into = ROUTES.filter((r) => r.a === 'BOS' || r.b === 'BOS').map((r) => r.id);
    const v = view(Object.fromEntries(into.map((id) => [id, '1'])));
    const p = planNetwork(v, '0', ['T-JAX-BOS', 'T-SPO-SF']);
    expect(p.unreachable).toEqual(['T-JAX-BOS']);
    const tight = planNetwork(view(), '0', ['T-SF-ATL', 'T-CLT-NYC'], { budget: 6 });
    expect(tight.dropped).toContain('T-SF-ATL');
    expect(tight.trainsNeeded).toBeLessThanOrEqual(6);
  });
});

describe('routeUrgency', () => {
  it('is high for a bottleneck and zero for a double whose twin is open', () => {
    // LA-ELP: El Paso hangs off PHX-ELP, ABQ-ELP and ELP-SAT (all single); with two taken, ABQ-ELP is its only link
    const v = view({ 'PHX-ELP': '1', 'ELP-SAT': '1' });
    const plan = planNetwork(v, '0', ['T-LA-ELP']);
    expect(plan.routes.has('ABQ-ELP')).toBe(true);
    expect(routeUrgency(v, '0', 'ABQ-ELP', plan)).toBeGreaterThan(15);
    const dbl = [...plan.routes].find((id) => ROUTE_BY_ID[id].twin && v.claims[ROUTE_BY_ID[id].twin!] === undefined);
    if (dbl) expect(routeUrgency(v, '0', dbl, plan)).toBe(0);
    expect(routeUrgency(v, '0', 'NYC-BOS', plan)).toBe(0);
  });
});

describe('longestTrailOf', () => {
  it('measures my longest trail, optionally with an extra route', () => {
    const v = view({ 'SF-LA': '0', 'LA-PHX': '0' });
    expect(longestTrailOf(v, '0')).toBe(8);
    expect(longestTrailOf(v, '0', 'PHX-ELP')).toBe(11);
  });
});

describe('tickets', () => {
  it('values overlapping tickets above disjoint ones', () => {
    const v = view();
    const overlap = evaluateTicketSet(v, '0', [], ['T-LA-CHI', 'T-LA-OMA']);
    const disjoint = evaluateTicketSet(v, '0', [], ['T-SPO-SF', 'T-JAX-BOS']);
    expect(overlap).toBeGreaterThan(disjoint);
    const keep = bestKeep(v, '0', ['T-SPO-SF', 'T-LA-CHI', 'T-JAX-BOS', 'T-LA-OMA'], 2);
    expect(keep).toEqual(expect.arrayContaining(['T-LA-CHI', 'T-LA-OMA']));
    expect(keep.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps at least the minimum and prefers tickets my network already serves', () => {
    const v = view({ 'SEA-POR': '0', 'POR-SF': '0' }, emptyHand(), 14);
    const keep = bestKeep(v, '0', ['T-SF-ATL', 'T-SPO-SF', 'T-JAX-BOS'], 1);
    expect(keep.length).toBeGreaterThanOrEqual(1);
    expect(keep).not.toContain('T-SF-ATL');
    expect(TICKETS.length).toBeGreaterThan(0);
    expect(TICKET_BY_ID['T-SPO-SF']).toBeDefined();
  });
});
