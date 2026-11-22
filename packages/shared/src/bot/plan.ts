/**
 * Planning core shared by the Medium and Hard bots: a cost graph over the (fixed) map, Dijkstra,
 * a greedy Steiner-style ticket network and a "how bad if I lose this route" measure.
 * Everything works on route/city indexes into typed arrays built once per map (swapped when the map switches).
 */
import { CARD_COLORS, type CardColor, type GState, type Hand } from '../types';
import { CITIES, MAP_ID, ROUTES, TICKET_BY_ID, onMapChange, type MapId } from '../map';

// Index tables over the current map. They are rebuilt (once per map, then cached) whenever the map switches,
// so read them at call time.
export let N_CITIES: number;
export let N_ROUTES: number;
export let CITY_INDEX: Map<string, number>;
export let ROUTE_INDEX: Map<string, number>;
export let RA: Int32Array;
export let RB: Int32Array;
export let LEN: Int32Array;
export let TWIN: Int32Array;
/** Route indexes touching each city. */
export let ADJ: Int32Array[];
// Scratch buffers for dijkstra (single-threaded; never held across calls).
let DIST: Float64Array;
let PREV: Int32Array;
let DONE: Uint8Array;

function buildTables() {
  const cityIndex = new Map(CITIES.map((c, i) => [c.id, i]));
  const routeIndex = new Map(ROUTES.map((r, i) => [r.id, i]));
  const ra = Int32Array.from(ROUTES, (r) => cityIndex.get(r.a) ?? -1);
  const rb = Int32Array.from(ROUTES, (r) => cityIndex.get(r.b) ?? -1);
  const lists: number[][] = CITIES.map(() => []);
  ROUTES.forEach((_, i) => {
    if (ra[i] >= 0) lists[ra[i]].push(i);
    if (rb[i] >= 0) lists[rb[i]].push(i);
  });
  return {
    nCities: CITIES.length,
    nRoutes: ROUTES.length,
    cityIndex,
    routeIndex,
    ra,
    rb,
    len: Int32Array.from(ROUTES, (r) => r.length),
    twin: Int32Array.from(ROUTES, (r) => (r.twin ? routeIndex.get(r.twin) ?? -1 : -1)),
    adj: lists.map((l) => Int32Array.from(l)),
    dist: new Float64Array(CITIES.length),
    prev: new Int32Array(CITIES.length),
    done: new Uint8Array(CITIES.length),
  };
}
const tables = new Map<MapId, ReturnType<typeof buildTables>>();
function applyTables(id: MapId): void {
  let t = tables.get(id);
  if (!t) tables.set(id, (t = buildTables()));
  N_CITIES = t.nCities;
  N_ROUTES = t.nRoutes;
  CITY_INDEX = t.cityIndex;
  ROUTE_INDEX = t.routeIndex;
  RA = t.ra;
  RB = t.rb;
  LEN = t.len;
  TWIN = t.twin;
  ADJ = t.adj;
  DIST = t.dist;
  PREV = t.prev;
  DONE = t.done;
}
applyTables(MAP_ID);
onMapChange(applyTables);

export const other = (route: number, city: number) => (RA[route] === city ? RB[route] : RA[route]);

/** Turn overhead per route still to claim: favours fewer, longer routes. */
export const CLAIM_OVERHEAD = 0.6;
const INF = Infinity;
const POINTS = [0, 1, 2, 4, 7, 10, 15];

export interface CostGraph {
  /** per route index: 0 = mine, Infinity = unusable by me, else the price to claim it */
  cost: Float64Array;
  /** 1 where the route is mine */
  owned: Uint8Array;
  costOf(routeId: string): number;
}

function makeGraph(cost: Float64Array, owned: Uint8Array): CostGraph {
  return { cost, owned, costOf: (id) => cost[ROUTE_INDEX.get(id) ?? -1] ?? INF };
}

/** Colours opponents took face up in the recent log (a hint they are collecting it). */
export function recentOpponentColours(view: GState, me: string, window = 24): Partial<Record<CardColor, number>> {
  const out: Partial<Record<CardColor, number>> = {};
  const log = view.log;
  for (let i = Math.max(0, log.length - window); i < log.length; i++) {
    const e = log[i];
    if (e.t === 'drawFaceUp' && e.p !== me && e.card !== 'locomotive') out[e.card] = (out[e.card] ?? 0) + 1;
  }
  return out;
}

/**
 * Prices for `who` building on the public board. `hand` (if known) makes coloured routes in held colours cheaper;
 * colours opponents are hoarding make routes of that colour a little dearer.
 */
export function costGraph(
  view: GState,
  who: string,
  opts: { hand?: Hand | null; hoard?: Partial<Record<CardColor, number>>; longBias?: number; overhead?: number; handDiscount?: number } = {},
): CostGraph {
  const bias = opts.longBias ?? 0;
  const overhead = opts.overhead ?? CLAIM_OVERHEAD;
  const hand = opts.hand === undefined ? view.players[who]?.hand : opts.hand;
  const hoard = opts.hoard ?? {};
  const cost = new Float64Array(N_ROUTES);
  const owned = new Uint8Array(N_ROUTES);
  const claims = view.claims;
  for (let i = 0; i < N_ROUTES; i++) {
    const r = ROUTES[i];
    const o = claims[r.id];
    if (o === who) {
      owned[i] = 1;
      continue;
    }
    if (o !== undefined || (TWIN[i] >= 0 && claims[ROUTES[TWIN[i]].id] === who)) {
      cost[i] = INF;
      continue;
    }
    let f = 1;
    if (r.color !== 'gray') {
      const held = hand ? Math.min(1, hand[r.color] / r.length) : 0;
      f = 1.1 - (opts.handDiscount ?? 0.2) * held + 0.04 * Math.min(3, hoard[r.color] ?? 0);
    }
    // long routes pay more points per train: with a bias, they look cheaper
    cost[i] = r.length * f + overhead - bias * (POINTS[r.length] - r.length);
  }
  return makeGraph(cost, owned);
}

/** Dijkstra from `src` (O(V²), V ≈ 40). Leaves results in DIST/PREV; stops early at `target`. */
function dijkstra(cost: Float64Array, src: number, target = -1): void {
  DIST.fill(INF);
  PREV.fill(-1);
  DONE.fill(0);
  DIST[src] = 0;
  for (;;) {
    let u = -1;
    let best = INF;
    for (let k = 0; k < N_CITIES; k++) if (!DONE[k] && DIST[k] < best) { best = DIST[k]; u = k; }
    if (u < 0) return;
    DONE[u] = 1;
    if (u === target) return;
    const adj = ADJ[u];
    for (let j = 0; j < adj.length; j++) {
      const e = adj[j];
      const c = cost[e];
      if (c === INF) continue;
      const v = other(e, u);
      const nd = best + c;
      if (nd < DIST[v] - 1e-9) { DIST[v] = nd; PREV[v] = e; }
    }
  }
}

/** All distances from `src` (a fresh copy). */
export function distancesFrom(cost: Float64Array, src: number): Float64Array {
  dijkstra(cost, src);
  return DIST.slice();
}

/** Cheapest path as route indexes (all of them, including free ones), or null. */
export function pathIdx(cost: Float64Array, a: number, b: number): { cost: number; path: number[] } | null {
  if (a < 0 || b < 0) return null;
  if (a === b) return { cost: 0, path: [] };
  dijkstra(cost, a, b);
  if (DIST[b] === INF) return null;
  const path: number[] = [];
  for (let n = b; n !== a; ) {
    const e = PREV[n];
    path.push(e);
    n = other(e, n);
  }
  return { cost: DIST[b], path: path.reverse() };
}

export function shortestPath(g: CostGraph, a: string, b: string): { cost: number; routes: string[] } | null {
  const p = pathIdx(g.cost, CITY_INDEX.get(a) ?? -1, CITY_INDEX.get(b) ?? -1);
  if (!p) return null;
  return { cost: p.cost, routes: p.path.filter((i) => !g.owned[i]).map((i) => ROUTES[i].id) };
}

export interface TicketPlan {
  cost: number;
  /** routes on the path that I don't own yet */
  routes: string[];
  idx: number[];
}

export interface Plan {
  /** route ids still to claim */
  routes: Set<string>;
  idx: Set<number>;
  trainsNeeded: number;
  /** tickets with no path at all */
  unreachable: string[];
  /** reachable tickets left out because they don't fit the train budget */
  dropped: string[];
  perTicket: Map<string, TicketPlan>;
  /** the graph the plan was made on (base prices) */
  graph: CostGraph;
  /** final prices: planned routes 0, their twins closed */
  cost: Float64Array;
}

/**
 * Greedy Steiner approximation: tickets by points, each joined by its cheapest path given the routes already
 * chosen (which then cost 0). With `budget`, a ticket whose extra trains don't fit is dropped.
 */
export function planNetwork(view: GState, me: string, tickets: string[], opts: { graph?: CostGraph; budget?: number } = {}): Plan {
  return buildPlan(opts.graph ?? costGraph(view, me), tickets, opts.budget);
}

function buildPlan(g: CostGraph, tickets: string[], budget: number | undefined): Plan {
  const cost = g.cost.slice();
  const todo = tickets.map((id) => TICKET_BY_ID[id]).filter(Boolean).sort((x, y) => y.points - x.points);
  const idx = new Set<number>();
  const perTicket = new Map<string, TicketPlan>();
  const unreachable: string[] = [];
  const dropped: string[] = [];
  let trains = 0;
  for (const t of todo) {
    const p = pathIdx(cost, CITY_INDEX.get(t.a) ?? -1, CITY_INDEX.get(t.b) ?? -1);
    if (!p) { unreachable.push(t.id); continue; }
    let add = 0;
    for (const i of p.path) if (!g.owned[i] && !idx.has(i)) add += LEN[i];
    if (budget !== undefined && trains + add > budget) { dropped.push(t.id); continue; }
    for (const i of p.path) {
      if (g.owned[i] || idx.has(i)) continue;
      idx.add(i);
      cost[i] = 0;
      if (TWIN[i] >= 0) cost[TWIN[i]] = INF;
    }
    trains += add;
    const mine = p.path.filter((i) => !g.owned[i]);
    perTicket.set(t.id, { cost: p.cost, routes: mine.map((i) => ROUTES[i].id), idx: mine });
  }
  return { routes: new Set([...idx].map((i) => ROUTES[i].id)), idx, trainsNeeded: trains, unreachable, dropped, perTicket, graph: g, cost };
}

/** Extra cost (≈ trains + turns) of a ticket's best path when `routeIdx` is lost; null if it would be unreachable. */
function detour(plan: Plan, routeIdx: number, ticketId: string): number | null {
  const t = TICKET_BY_ID[ticketId];
  const base = plan.graph.cost;
  const c = plan.cost.slice();
  c[routeIdx] = base[routeIdx];
  const tw = TWIN[routeIdx];
  if (tw >= 0) c[tw] = base[tw];
  const a = CITY_INDEX.get(t.a)!, b = CITY_INDEX.get(t.b)!;
  const withIt = pathIdx(c, a, b);
  c[routeIdx] = INF;
  const without = pathIdx(c, a, b);
  if (!without) return null;
  return Math.max(0, without.cost - (withIt?.cost ?? 0));
}

/** What losing this planned route to someone else would cost me (detours summed; cut off = ticket points + 20). */
export function routeUrgency(view: GState, me: string, routeId: string, plan: Plan): number {
  void view, me;
  const i = ROUTE_INDEX.get(routeId);
  if (i === undefined || !plan.idx.has(i)) return 0;
  let total = 0;
  for (const [tid, tp] of plan.perTicket) {
    if (!tp.idx.includes(i)) continue;
    const d = detour(plan, i, tid);
    total += d === null ? TICKET_BY_ID[tid].points + 20 : d;
  }
  return total;
}

/** Union-find over my claimed routes (plus `extra`): city index -> component root. */
export function components(view: GState, me: string, extra: number[] = []): Int32Array {
  const parent = new Int32Array(N_CITIES);
  for (let i = 0; i < N_CITIES; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const join = (r: number) => {
    const x = find(RA[r]), y = find(RB[r]);
    if (x !== y) parent[x] = y;
  };
  for (const [id, o] of Object.entries(view.claims)) if (o === me) { const r = ROUTE_INDEX.get(id); if (r !== undefined) join(r); }
  for (const r of extra) join(r);
  for (let i = 0; i < N_CITIES; i++) parent[i] = find(i);
  return parent;
}

export function ticketConnected(comp: Int32Array, ticketId: string): boolean {
  const t = TICKET_BY_ID[ticketId];
  const a = CITY_INDEX.get(t.a), b = CITY_INDEX.get(t.b);
  return a !== undefined && b !== undefined && comp[a] === comp[b];
}

/** Cities touched by a player's routes. */
export function citiesOf(view: GState, who: string): Uint8Array {
  const out = new Uint8Array(N_CITIES);
  for (const [id, o] of Object.entries(view.claims)) {
    if (o !== who) continue;
    const r = ROUTE_INDEX.get(id);
    if (r !== undefined) { out[RA[r]] = 1; out[RB[r]] = 1; }
  }
  return out;
}

/** Longest edge-disjoint trail (in trains) over my routes, optionally with one more route. */
export function longestTrailOf(view: GState, me: string, extraRouteId?: string): number {
  const edges: number[] = [];
  for (const [id, o] of Object.entries(view.claims)) if (o === me) edges.push(ROUTE_INDEX.get(id)!);
  if (extraRouteId !== undefined) {
    const x = ROUTE_INDEX.get(extraRouteId);
    if (x !== undefined && !edges.includes(x)) edges.push(x);
  }
  if (!edges.length) return 0;
  const inc = new Map<number, number[]>();
  for (const e of edges) for (const c of [RA[e], RB[e]]) { if (!inc.has(c)) inc.set(c, []); inc.get(c)!.push(e); }
  const used = new Set<number>();
  let best = 0;
  let steps = 0;
  const dfs = (node: number, total: number) => {
    if (total > best) best = total;
    if (++steps > 20000) return; // pathological graphs: good enough
    for (const e of inc.get(node)!) {
      if (used.has(e)) continue;
      used.add(e);
      dfs(other(e, node), total + LEN[e]);
      used.delete(e);
    }
  };
  for (const c of inc.keys()) dfs(c, 0);
  return best;
}

/** How many cards of each colour the routes need (gray tracked separately as a list of lengths). */
export function colourNeeds(routeIdx: Iterable<number>): { need: Record<CardColor, number>; gray: number[] } {
  const need = Object.fromEntries(CARD_COLORS.map((c) => [c, 0])) as Record<CardColor, number>;
  const gray: number[] = [];
  for (const i of routeIdx) {
    const c = ROUTES[i].color;
    if (c === 'gray') gray.push(LEN[i]);
    else need[c] += LEN[i];
  }
  gray.sort((x, y) => y - x);
  return { need, gray };
}
