import type { GState } from '../types';

export function dealTickets(G: GState, playerID: string, n: number): string[] {
  const dealt = G.ticketDeck.splice(0, n);
  G.players[playerID].pending = dealt;
  return dealt;
}

/** Keep the chosen pending tickets (at least `min`, or all of them if fewer were dealt); return the rest to the bottom. */
export function keepTickets(G: GState, playerID: string, keep: string[], min: number): 'ok' | 'invalid' {
  const p = G.players[playerID];
  const unique = new Set(keep);
  if (unique.size !== keep.length) return 'invalid';
  if (!keep.every((id) => p.pending.includes(id))) return 'invalid';
  if (keep.length < Math.min(min, p.pending.length)) return 'invalid';
  const returned = p.pending.filter((id) => !unique.has(id));
  p.tickets.push(...keep);
  G.ticketDeck.push(...returned);
  p.pending = [];
  return 'ok';
}
