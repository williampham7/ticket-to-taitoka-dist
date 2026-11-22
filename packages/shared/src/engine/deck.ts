import { CARD_COLORS, type Card, type GState } from '../types';
import type { Shuffle } from './rng';

export const MARKET_SIZE = 5;
export const CARDS_PER_COLOR = 14;
export const LOCOMOTIVES = 14;
export const DECK_SIZE = CARD_COLORS.length * CARDS_PER_COLOR + LOCOMOTIVES;
const LOCO: Card = 'locomotive';

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const c of CARD_COLORS) for (let i = 0; i < CARDS_PER_COLOR; i++) deck.push(c);
  for (let i = 0; i < LOCOMOTIVES; i++) deck.push(LOCO);
  return deck;
}

/** Top card of the deck, reshuffling the discards into a new deck when it runs out. */
export function drawCard(G: GState, shuffle: Shuffle): Card | null {
  if (G.deck.length === 0 && G.discard.length > 0) {
    G.deck = shuffle(G.discard);
    G.discard = [];
  }
  return G.deck.shift() ?? null;
}

const locoCount = (G: GState) => G.market.filter((c) => c === LOCO).length;

function nonLocosAvailable(G: GState): number {
  const isNon = (c: Card | null) => c !== null && c !== LOCO;
  return G.deck.filter(isNon).length + G.discard.filter(isNon).length + G.market.filter(isNon).length;
}

function fillEmptySlots(G: GState, shuffle: Shuffle) {
  for (let i = 0; i < MARKET_SIZE; i++) if (G.market[i] == null) G.market[i] = drawCard(G, shuffle);
}

/** Fill empty face-up slots; whenever 3+ are locomotives, discard all five and deal again. */
export function refillMarket(G: GState, shuffle: Shuffle): void {
  fillEmptySlots(G, shuffle);
  for (let attempt = 0; attempt < 50 && locoCount(G) >= 3; attempt++) {
    // Guard: a redeal can't fix the market if there aren't enough other cards anywhere.
    if (nonLocosAvailable(G) < 3) break;
    for (let i = 0; i < MARKET_SIZE; i++) {
      const c = G.market[i];
      if (c) G.discard.push(c);
      G.market[i] = null;
    }
    G.log.push({ t: 'redeal' });
    fillEmptySlots(G, shuffle);
  }
}

export function canDrawFirst(G: GState): boolean {
  return G.deck.length + G.discard.length > 0 || G.market.some((c) => c !== null);
}

export function canDrawSecond(G: GState): boolean {
  return G.deck.length + G.discard.length > 0 || G.market.some((c) => c !== null && c !== LOCO);
}

export type DrawResult = 'invalid' | 'continue' | 'endsTurn';

function afterDraw(G: GState, endsNow: boolean): DrawResult {
  if (endsNow || G.draws >= 2 || !canDrawSecond(G)) {
    G.draws = 0;
    return 'endsTurn';
  }
  return 'continue';
}

export function takeFaceUp(G: GState, playerID: string, index: number, shuffle: Shuffle): DrawResult {
  const card = G.market[index];
  if (card == null) return 'invalid';
  const isSecond = G.draws === 1;
  if (isSecond && card === LOCO) return 'invalid';
  G.players[playerID].hand[card] += 1;
  G.market[index] = null;
  G.log.push({ t: 'drawFaceUp', p: playerID, card, slot: index });
  G.draws += 1;
  refillMarket(G, shuffle);
  return afterDraw(G, card === LOCO);
}

export function takeBlind(G: GState, playerID: string, shuffle: Shuffle): DrawResult {
  const card = drawCard(G, shuffle);
  if (card == null) return 'invalid';
  const p = G.players[playerID];
  p.hand[card] += 1;
  p.lastDrawn = { card, seq: (p.lastDrawn?.seq ?? 0) + 1 };
  G.log.push({ t: 'drawBlind', p: playerID });
  G.draws += 1;
  return afterDraw(G, false);
}
