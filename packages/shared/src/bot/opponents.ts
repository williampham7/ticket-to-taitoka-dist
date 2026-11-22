/**
 * Hard bot's opponent model, built only from public information (claims, ticket counts, scores, log):
 * which tickets each opponent probably holds, how far along they are, and which open routes would hurt them most.
 */
import type { GState } from '../types';
import { CITIES, MAP_ID, ROUTES, TICKETS, TICKET_BY_ID, type MapId } from '../map';
import {
  CITY_INDEX, CLAIM_OVERHEAD, TWIN, citiesOf, costGraph, distancesFrom, longestTrailOf,
  pathIdx, ticketConnected, type Plan,
} from './plan';

export interface LikelyTicket {
  id: string;
  points: number;
  /** rough chance they hold it */
  w: number;
  a: number;
  b: number;
  /** their remaining path cost, and the routes on it they don't own yet */
  remaining: number;
  path: number[];
}

export interface OpponentModel {
  id: string;
  likely: LikelyTicket[];
  /** their prices: own routes 0, routes they can't use Infinity */
  cost: Float64Array;
  score: number;
  trail: number;
}

/** Cheapest path costs on the empty board (all routes), all pairs, per map; computed on first use. */
const STATIC = new Map<MapId, Float64Array[]>();
function staticDist(a: number, b: number): number {
  let d = STATIC.get(MAP_ID);
  if (!d) {
    const cost = Float64Array.from(ROUTES, (r) => r.length + CLAIM_OVERHEAD);
    STATIC.set(MAP_ID, (d = CITIES.map((_, i) => distancesFrom(cost, i))));
  }
  return d[a][b];
}

const cache = new Map<string, OpponentModel>();

function model(view: GState, me: string, opp: string): OpponentModel {
  const p = view.players[opp];
  const g = costGraph(view, opp, { hand: null });
  const cities = citiesOf(view, opp);
  const mineKnown = new Set([...view.players[me].tickets, ...view.players[me].pending]);
  const scored: LikelyTicket[] = [];
  const distCache = new Map<number, Float64Array>();
  const from = (c: number) => {
    let d = distCache.get(c);
    if (!d) { d = distancesFrom(g.cost, c); distCache.set(c, d); }
    return d;
  };
  for (const t of TICKETS) {
    if (mineKnown.has(t.id)) continue;
    const a = CITY_INDEX.get(t.a), b = CITY_INDEX.get(t.b);
    if (a === undefined || b === undefined || (!cities[a] && !cities[b])) continue;
    const src = cities[a] ? a : b;
    const remaining = from(src)[src === a ? b : a];
    if (remaining === Infinity || remaining === 0) continue;
    const total = staticDist(a, b);
    const progress = Math.max(0, 1 - remaining / total);
    const s = Math.min(1, progress * (cities[a] && cities[b] ? 1.15 : 1));
    if (s < 0.3) continue;
    scored.push({ id: t.id, points: t.points, w: s * s, a, b, remaining, path: [] });
  }
  scored.sort((x, y) => y.w * y.points - x.w * x.points);
  // they hold ticketCount tickets (some possibly done); more mid-game draws => more open tickets
  const k = Math.max(1, Math.min(6, p.ticketCount ?? 3));
  const likely = scored.slice(0, k);
  for (const lt of likely) {
    const path = pathIdx(g.cost, lt.a, lt.b);
    lt.path = path ? path.path.filter((i) => !g.owned[i]) : [];
  }
  return { id: opp, likely, cost: g.cost, score: p.score, trail: longestTrailOf(view, opp) };
}

/** One model per opponent, cached on the public board (claims + ticket counts). */
export function modelOpponents(view: GState, me: string): OpponentModel[] {
  const claimsKey = Object.keys(view.claims).length + ':' + Object.entries(view.claims).map(([r, o]) => r + o).join(',');
  const out: OpponentModel[] = [];
  for (const [id, p] of Object.entries(view.players)) {
    if (id === me) continue;
    const key = `${MAP_ID}|${me}|${id}|${p.ticketCount}|${view.players[me].tickets.join(',')}|${claimsKey}`;
    let m = cache.get(key);
    if (!m) {
      m = model(view, me, id);
      if (cache.size > 200) cache.clear();
      cache.set(key, m);
    }
    out.push(m);
  }
  return out;
}

export interface ScoreEstimate {
  mine: number;
  bestOther: number;
  bestOtherTrail: number;
  byId: Record<string, number>;
}

/** Average ticket value on the current map. */
const avgTicket = () => TICKETS.reduce((s, t) => s + t.points, 0) / Math.max(1, TICKETS.length);
/** Share of their tickets' points a typical opponent ends up scoring (completions minus the odd failure). */
const OPP_TICKET_YIELD = 0.8;

/**
 * Rough final scores: public route points, my tickets as I know them, theirs as ticket count x average value x
 * a typical yield (completed tickets are invisible, so the count is the best evidence), and the longest-path
 * bonus to whoever leads it now.
 */
export function estimateScores(view: GState, me: string, models: OpponentModel[], plan: Plan, comp: Int32Array, myTrail = 0): ScoreEstimate {
  let mine = view.players[me].score;
  const lost = new Set([...plan.unreachable, ...plan.dropped]);
  for (const id of view.players[me].tickets) {
    const pts = TICKET_BY_ID[id]?.points ?? 0;
    mine += ticketConnected(comp, id) ? pts : lost.has(id) ? -pts : 0.6 * pts;
  }
  const byId: Record<string, number> = { [me]: mine };
  let bestOther = -Infinity;
  let bestOtherTrail = 0;
  for (const m of models) bestOtherTrail = Math.max(bestOtherTrail, m.trail);
  const avg = avgTicket();
  for (const m of models) {
    const p = view.players[m.id];
    const est = m.score + (p.ticketCount ?? 0) * avg * OPP_TICKET_YIELD + (m.trail > myTrail && m.trail === bestOtherTrail ? 10 : 0);
    byId[m.id] = est;
    bestOther = Math.max(bestOther, est);
  }
  if (myTrail >= bestOtherTrail && myTrail > 0) byId[me] = mine += 10;
  return { mine, bestOther: bestOther === -Infinity ? 0 : bestOther, bestOtherTrail, byId };
}

/**
 * Points of damage per open route if I claimed it: for each opponent's likely ticket whose path uses it (and that
 * they can't simply take the other lane of), their detour, or the ticket swing if it cuts them off.
 * In 3+ player games the leader counts in full, the others at half.
 */
export function blockValues(view: GState, me: string, models: OpponentModel[], est: ScoreEstimate): Map<number, number> {
  const out = new Map<number, number>();
  const leader = models.reduce<OpponentModel | null>((b, m) => (!b || est.byId[m.id] > est.byId[b.id] ? m : b), null);
  for (const m of models) {
    const rival = models.length === 1 || m === leader ? 1 : 0.5;
    for (const lt of m.likely) {
      for (const r of lt.path) {
        if (view.claims[ROUTES[r].id] !== undefined) continue;
        const tw = TWIN[r];
        if (tw >= 0 && m.cost[tw] !== Infinity) continue; // they'd take the other lane
        if (tw >= 0 && view.claims[ROUTES[tw].id] === me) continue; // I can't take both lanes
        const c = m.cost.slice();
        c[r] = Infinity;
        const np = pathIdx(c, lt.a, lt.b);
        const loss = np ? Math.min(2 * lt.points, (np.cost - lt.remaining) * 0.8) : 1.4 * lt.points;
        if (loss <= 0) continue;
        out.set(r, (out.get(r) ?? 0) + rival * lt.w * loss);
      }
    }
  }
  return out;
}

