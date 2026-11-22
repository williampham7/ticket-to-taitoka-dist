import { ALL_CARDS, type GState, type Hand, type PlayerState } from '../types';
import { TICKETS } from '../map';
import { buildDeck, drawCard, MARKET_SIZE, refillMarket } from './deck';
import type { Shuffle } from './rng';

export const STARTING_TRAINS = 50;
export const STARTING_HAND = 4;
export const INITIAL_TICKETS = 4;

export function emptyHand(): Hand {
  return Object.fromEntries(ALL_CARDS.map((c) => [c, 0])) as Hand;
}

export function createInitialState(numPlayers: number, shuffle: Shuffle): GState {
  const G: GState = {
    players: {},
    deck: shuffle(buildDeck()),
    discard: [],
    market: Array(MARKET_SIZE).fill(null),
    ticketDeck: shuffle(TICKETS.map((t) => t.id)),
    claims: {},
    draws: 0,
    finalRound: null,
    log: [],
    result: null,
    numPlayers,
    turnOrder: Array.from({ length: numPlayers }, (_, i) => String(i)),
    passStreak: 0,
    startedAt: Date.now(),
    endedAt: null,
  };
  for (let i = 0; i < numPlayers; i++) {
    const p: PlayerState = { hand: emptyHand(), tickets: [], pending: [], trains: STARTING_TRAINS, score: 0 };
    for (let k = 0; k < STARTING_HAND; k++) p.hand[drawCard(G, shuffle)!] += 1;
    p.pending = G.ticketDeck.splice(0, INITIAL_TICKETS);
    G.players[String(i)] = p;
  }
  refillMarket(G, shuffle);
  G.log = [];
  return G;
}
