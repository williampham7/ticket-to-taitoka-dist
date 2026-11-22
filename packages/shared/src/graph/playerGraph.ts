import { MultiUndirectedGraph } from 'graphology';
import type { GState, Ticket } from '../types';
import { ROUTE_BY_ID } from '../map';

/** The player's claimed routes as a multigraph: nodes = cities, edges keyed by route id, weighted by length. */
export function buildPlayerGraph(G: Pick<GState, 'claims'>, playerID: string): MultiUndirectedGraph {
  const g = new MultiUndirectedGraph();
  for (const [routeId, owner] of Object.entries(G.claims)) {
    if (owner !== playerID) continue;
    const r = ROUTE_BY_ID[routeId];
    g.mergeNode(r.a);
    g.mergeNode(r.b);
    g.addEdgeWithKey(routeId, r.a, r.b, { length: r.length });
  }
  return g;
}

export function isTicketComplete(g: MultiUndirectedGraph, ticket: Pick<Ticket, 'a' | 'b'>): boolean {
  if (!g.hasNode(ticket.a) || !g.hasNode(ticket.b)) return false;
  const seen = new Set([ticket.a]);
  const stack = [ticket.a];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === ticket.b) return true;
    for (const m of g.neighbors(n)) if (!seen.has(m)) { seen.add(m); stack.push(m); }
  }
  return false;
}

/** Route ids on some path joining the ticket's cities (for highlighting), or [] if not connected. */
export function ticketPath(g: MultiUndirectedGraph, ticket: Pick<Ticket, 'a' | 'b'>): string[] {
  if (!g.hasNode(ticket.a) || !g.hasNode(ticket.b)) return [];
  const via = new Map<string, { from: string; edge: string }>();
  const queue = [ticket.a];
  const seen = new Set([ticket.a]);
  while (queue.length) {
    const n = queue.shift()!;
    if (n === ticket.b) break;
    g.forEachEdge(n, (edge, _attr, s, t) => {
      const m = s === n ? t : s;
      if (!seen.has(m)) { seen.add(m); via.set(m, { from: n, edge }); queue.push(m); }
    });
  }
  if (!seen.has(ticket.b)) return [];
  const path: string[] = [];
  for (let n = ticket.b; n !== ticket.a; n = via.get(n)!.from) path.push(via.get(n)!.edge);
  return path;
}
