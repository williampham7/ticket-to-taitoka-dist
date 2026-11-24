import type { Card, Mission } from './cards';
import type { PlayerID, WarState } from './rules';

/**
 * The only hidden-information filter. Opponents' cards are a count, the deck is a count, and secret missions
 * are only your own, until the game is over (then everything shows).
 */
export interface WarView extends Omit<WarState, 'deck' | 'hands' | 'missions'> {
  hands: Record<PlayerID, Card[]>;
  handCount: Record<PlayerID, number>;
  deckCount: number;
  missions: Record<PlayerID, Mission> | null;
  me: PlayerID | null;
}

export function viewFor(G: WarState, playerID: PlayerID | null | undefined): WarView {
  const me = playerID ?? null;
  const over = !!G.result;
  const { deck, hands, missions, ...rest } = G;
  return {
    ...rest,
    hands: Object.fromEntries(G.players.map((p) => [p, over || p === me ? hands[p] : []])),
    handCount: Object.fromEntries(G.players.map((p) => [p, hands[p].length])),
    deckCount: deck.length,
    missions: missions ? Object.fromEntries(Object.entries(missions).filter(([p]) => over || p === me)) : null,
    me,
  };
}
