import type { FinalResult, GState, PlayerResult } from '../types';
import { TICKET_BY_ID } from '../map';
import { buildPlayerGraph, isTicketComplete } from '../graph/playerGraph';
import { longestTrail } from '../graph/longest';

export const LONGEST_PATH_BONUS = 10;

/** Most points; then most completed tickets; then holding the longest-path bonus; otherwise a shared win. */
export function rankWinners(players: Record<string, PlayerResult>): string[] {
  const key = (r: PlayerResult) => [r.total, r.completed, r.bonus > 0 ? 1 : 0];
  const ids = Object.keys(players);
  let best = ids.slice(0, 1);
  for (const id of ids.slice(1)) {
    const a = key(players[id]), b = key(players[best[0]]);
    const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
    if (cmp > 0) best = [id];
    else if (cmp === 0) best.push(id);
  }
  return best;
}

export function finalScore(G: GState): FinalResult {
  const players: Record<string, PlayerResult> = {};
  for (const [pid, p] of Object.entries(G.players)) {
    const graph = buildPlayerGraph(G, pid);
    const tickets = p.tickets.map((id) => ({ id, done: isTicketComplete(graph, TICKET_BY_ID[id]) }));
    const ticketPoints = tickets.reduce((s, t) => s + (t.done ? 1 : -1) * TICKET_BY_ID[t.id].points, 0);
    players[pid] = {
      routePoints: p.score,
      ticketPoints,
      completed: tickets.filter((t) => t.done).length,
      failed: tickets.filter((t) => !t.done).length,
      longest: longestTrail(graph),
      bonus: 0,
      total: 0,
      tickets,
    };
  }
  const longest = Math.max(0, ...Object.values(players).map((r) => r.longest));
  for (const r of Object.values(players)) {
    if (longest > 0 && r.longest === longest) r.bonus = LONGEST_PATH_BONUS;
    r.total = r.routePoints + r.ticketPoints + r.bonus;
  }
  return { players, longest, winners: rankWinners(players) };
}
