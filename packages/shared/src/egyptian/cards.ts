/**
 * Egyptian War cards: a card is a number 0..51. Suit = SUITS[floor(c / 13)], rank = c % 13 + 1
 * (A = 1, J = 11, Q = 12, K = 13). J/Q/K/A start a challenge with 1/2/3/4 tries.
 */
export type Card = number;
export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];
export const DECK_SIZE = 52;

export const rankOf = (c: Card): number => (c % 13) + 1;
export const suitOf = (c: Card): Suit => SUITS[Math.floor(c / 13)];
export const cardOf = (rank: number, suit: Suit): Card => SUITS.indexOf(suit) * 13 + rank - 1;
export const isRed = (c: Card): boolean => suitOf(c) === 'H' || suitOf(c) === 'D';
export const isCourt = (c: Card): boolean => rankOf(c) >= 11;

const TRIES: Record<number, 1 | 2 | 3 | 4> = { 11: 1, 12: 2, 13: 3, 1: 4 };
/** How many tries a challenge card gives (0 for a number card). */
export const challengeTries = (c: Card): 0 | 1 | 2 | 3 | 4 => TRIES[rankOf(c)] ?? 0;

const LABEL: Record<number, string> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const rankLabel = (rank: number): string => LABEL[rank] ?? String(rank);

const RANK_NAME: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };
const SUIT_NAME: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
export const suitName = (s: Suit): string => SUIT_NAME[s];
/** "7 of hearts", "Ace of spades". */
export const cardName = (c: Card): string => `${RANK_NAME[rankOf(c)] ?? rankOf(c)} of ${SUIT_NAME[suitOf(c)]}`;

export const fullDeck = (): Card[] => Array.from({ length: DECK_SIZE }, (_, i) => i);

/** Short name to card, for tests and examples: '7H', '10S', 'AD', 'KC'. */
export function card(short: string): Card {
  const suit = short.slice(-1) as Suit;
  const r = short.slice(0, -1);
  const rank = r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : Number(r);
  if (!SUITS.includes(suit) || !(rank >= 1 && rank <= 13)) throw new Error(`bad card ${short}`);
  return cardOf(rank, suit);
}
