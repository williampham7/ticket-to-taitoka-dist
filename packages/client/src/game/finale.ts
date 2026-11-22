import { ROUTE_BY_ID, ROUTE_POINTS, TICKET_BY_ID, buildPlayerGraph, longestTrailRoutes, ticketPath, type FinalResult, type GState } from '@boboland/shared';

/** What the end-of-game count needs besides the result: each player's routes (claim order), ticket paths and longest trail. */
export interface FinaleInput {
  /** players in seat order */
  order: string[];
  result: FinalResult;
  routes: Record<string, string[]>;
  /** pid -> ticket id -> route ids joining its cities ([] if not connected) */
  paths: Record<string, Record<string, string[]>>;
  /** pid -> route ids of one longest trail */
  longest: Record<string, string[]>;
}

export type BeatKind = 'banner' | 'intro' | 'route' | 'ticket' | 'longest';
/** The count runs in rounds: every player's routes, then every player's tickets, then the bonus. */
export type BeatPhase = 'banner' | 'routes' | 'tickets' | 'bonus';

/** One moment of the end-of-game count. */
export interface Beat {
  kind: BeatKind;
  phase: BeatPhase;
  ms: number;
  /** players in focus (their routes stand out on the map) */
  active: string[];
  /** running score per player at this moment */
  totals: Record<string, number>;
  /** routes lit up on the map */
  routes: string[];
  /** cities lit up on the map */
  cities: string[];
  /** points added (or taken away) at this moment */
  delta?: number;
  route?: string;
  ticket?: { id: string; done: boolean };
  /** ticket beats: this player's tickets counted so far, kept on screen until all are counted */
  shown?: { id: string; done: boolean }[];
}

export const BANNER_MS = 2700;
export const INTRO_MS = 2000;
/** A player's turn in the ticket round opens a little faster: everyone already knows the drill. */
export const TICKET_INTRO_MS = 1000;
export const ROUTE_BUDGET_MS = 5000;
export const TICKET_BUDGET_MS = 9000;
/** After a player's last ticket, their tickets stay on screen a moment longer. */
export const TICKET_HOLD_MS = 1200;
export const LONGEST_MS = 4200;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Each route takes a beat; many routes go faster so a player's routes take at most ~5 s. */
export const routeMs = (n: number) => clamp(ROUTE_BUDGET_MS / Math.max(1, n), 160, 450);
/** Each ticket takes a beat; many tickets go faster (~9 s for all of them, never under 0.9 s each). */
export const ticketMs = (n: number) => clamp(TICKET_BUDGET_MS / Math.max(1, n), 900, 1700);

/** Gather the finale's input from the final game state (claims and the log are public). */
export function finaleInput(G: GState, order: string[]): FinaleInput {
  const result = G.result!;
  const routes: Record<string, string[]> = {}, paths: FinaleInput['paths'] = {}, longest: FinaleInput['longest'] = {};
  for (const pid of order) {
    const logged = G.log.flatMap((e) => (e.t === 'claim' && e.p === pid && G.claims[e.route] === pid ? [e.route] : []));
    const rest = Object.keys(G.claims).filter((r) => G.claims[r] === pid && !logged.includes(r));
    routes[pid] = [...new Set([...logged, ...rest])];
    const g = buildPlayerGraph(G, pid);
    paths[pid] = Object.fromEntries(result.players[pid].tickets.map((t) => [t.id, ticketPath(g, TICKET_BY_ID[t.id])]));
    longest[pid] = longestTrailRoutes(g);
  }
  return { order, result, routes, paths, longest };
}

/**
 * The end-of-game count, beat by beat: an "end of the line" banner; then a round of routes (each player in
 * turn, their routes in the spotlight, each route's points); then a round of tickets (each player in turn,
 * each ticket added or taken away); then the longest-path bonus. The last beat's totals are the final scores.
 */
export function finaleScript({ order, result, routes, paths, longest }: FinaleInput): Beat[] {
  const totals: Record<string, number> = Object.fromEntries(order.map((p) => [p, 0]));
  const beats: Beat[] = [{ kind: 'banner', phase: 'banner', ms: BANNER_MS, active: [], totals: { ...totals }, routes: [], cities: [] }];
  for (const pid of order) {
    beats.push({ kind: 'intro', phase: 'routes', ms: INTRO_MS, active: [pid], totals: { ...totals }, routes: [], cities: [] });
    const mine = routes[pid] ?? [];
    for (const route of mine) {
      const r0 = ROUTE_BY_ID[route], delta = ROUTE_POINTS[r0.length];
      totals[pid] += delta;
      beats.push({ kind: 'route', phase: 'routes', ms: routeMs(mine.length), active: [pid], totals: { ...totals }, routes: [route], cities: [r0.a, r0.b], delta, route });
    }
    totals[pid] = result.players[pid].routePoints; // the engine's own count is the truth
  }
  for (const pid of order) {
    const r = result.players[pid];
    beats.push({ kind: 'intro', phase: 'tickets', ms: TICKET_INTRO_MS, active: [pid], totals: { ...totals }, routes: [], cities: [] });
    r.tickets.forEach((t, k) => {
      const ticket = TICKET_BY_ID[t.id];
      const last = k === r.tickets.length - 1;
      const delta = (t.done ? 1 : -1) * ticket.points;
      totals[pid] += delta;
      beats.push({
        kind: 'ticket', phase: 'tickets', ms: ticketMs(r.tickets.length) + (last ? TICKET_HOLD_MS : 0), active: [pid], totals: { ...totals },
        routes: t.done ? paths[pid]?.[t.id] ?? [] : [], cities: [ticket.a, ticket.b], delta, ticket: { id: t.id, done: t.done },
        shown: r.tickets.slice(0, k + 1),
      });
    });
    totals[pid] = r.routePoints + r.ticketPoints;
  }
  const winners = order.filter((p) => result.players[p].bonus > 0);
  for (const p of order) totals[p] = result.players[p].total;
  beats.push({
    kind: 'longest', phase: 'bonus', ms: LONGEST_MS, active: winners, totals: { ...totals },
    routes: [...new Set(winners.flatMap((p) => longest[p] ?? []))], cities: [],
    delta: winners.length ? result.players[winners[0]].bonus : 0,
  });
  return beats;
}

/** Finishing order: winners first (they share first place), then total, completed tickets, longest-path bonus. */
export function podiumOrder(result: FinalResult): string[] {
  const p = result.players;
  return Object.keys(p).sort((a, b) =>
    Number(result.winners.includes(b)) - Number(result.winners.includes(a)) ||
    p[b].total - p[a].total || p[b].completed - p[a].completed || p[b].bonus - p[a].bonus);
}

/** 1-based place for each player: winners share 1st; others with the same total and tickets share a place. */
export function places(result: FinalResult): Record<string, number> {
  const order = podiumOrder(result);
  const out: Record<string, number> = {};
  order.forEach((id, i) => {
    const prev = order[i - 1];
    const p = result.players;
    if (result.winners.includes(id)) out[id] = 1;
    else if (prev && !result.winners.includes(prev) && p[prev].total === p[id].total && p[prev].completed === p[id].completed) out[id] = out[prev];
    else out[id] = i + 1;
  });
  return out;
}
