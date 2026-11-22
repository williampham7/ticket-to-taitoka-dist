import type { GState, Ticket } from '../types';
import { ROUTES, TICKET_BY_ID } from '../map';
import { routeOpen } from '../engine/claim';
import { buildPlayerGraph, isTicketComplete } from '../graph/playerGraph';

export const pileCount = (v: GState) => (v.deckCount ?? v.deck.length) + (v.discardCount ?? v.discard.length);
export const handSize = (v: GState, me: string) => Object.values(v.players[me].hand).reduce((s, n) => s + n, 0);
export const myTickets = (v: GState, me: string): Ticket[] => v.players[me].tickets.map((id) => TICKET_BY_ID[id]).filter(Boolean);
export function ticketDone(v: GState, me: string, ticketId: string): boolean {
  return isTicketComplete(buildPlayerGraph(v, me), TICKET_BY_ID[ticketId]);
}
export function faceUpIndexes(v: GState, opts: { allowLoco: boolean }): number[] {
  const out: number[] = [];
  v.market.forEach((c, i) => {
    if (c && (opts.allowLoco || c !== 'locomotive')) out.push(i);
  });
  return out;
}

/** Fewest-routes path between two cities over routes that are mine or open to me; returns the route ids still to claim (mine are free). */
export function hopPath(v: GState, me: string, a: string, b: string): string[] | null {
  if (a === b) return [];
  const adj = new Map<string, { to: string; id: string }[]>();
  const add = (x: string, y: string, id: string) => {
    if (!adj.has(x)) adj.set(x, []);
    adj.get(x)!.push({ to: y, id });
  };
  for (const r of ROUTES) {
    if (v.claims[r.id] !== me && !routeOpen(v, r.id, me)) continue;
    add(r.a, r.b, r.id);
    add(r.b, r.a, r.id);
  }
  const prev = new Map<string, { from: string; id: string }>();
  const seen = new Set([a]);
  const q = [a];
  for (let h = 0; h < q.length; h++) {
    const n = q[h];
    if (n === b) break;
    for (const e of adj.get(n) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { from: n, id: e.id });
      q.push(e.to);
    }
  }
  if (!seen.has(b)) return null;
  const path: string[] = [];
  for (let n = b; n !== a; ) {
    const p = prev.get(n)!;
    path.push(p.id);
    n = p.from;
  }
  return path.reverse().filter((id) => v.claims[id] !== me);
}
