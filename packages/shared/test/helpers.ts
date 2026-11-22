import { ALL_CARDS, type Card, type GState, type Hand, type PlayerState } from '../src/types';

export function emptyHand(over: Partial<Hand> = {}): Hand {
  const h = Object.fromEntries(ALL_CARDS.map((c) => [c, 0])) as Hand;
  return { ...h, ...over };
}

export function player(over: Partial<PlayerState> = {}): PlayerState {
  return { hand: emptyHand(), tickets: [], pending: [], trains: 45, score: 0, ...over };
}

/** A hand-built state; anything not given is empty. */
export function makeState(over: Partial<GState> = {}, numPlayers = 2): GState {
  const players: Record<string, PlayerState> = {};
  for (let i = 0; i < numPlayers; i++) players[String(i)] = player();
  return {
    players,
    deck: [],
    discard: [],
    market: [null, null, null, null, null],
    ticketDeck: [],
    claims: {},
    draws: 0,
    finalRound: null,
    log: [],
    result: null,
    numPlayers,
    turnOrder: Array.from({ length: numPlayers }, (_, i) => String(i)),
    passStreak: 0,
    startedAt: 0,
    endedAt: null,
    ...over,
  };
}

export const identity = <T>(a: T[]): T[] => [...a];

export function countCards(G: GState): number {
  let n = G.deck.length + G.discard.length + G.market.filter(Boolean).length;
  for (const p of Object.values(G.players)) n += Object.values(p.hand).reduce((s, x) => s + x, 0);
  return n;
}

export const L: Card = 'locomotive';
