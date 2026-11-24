import { TERRITORY_IDS } from './map';
import type { ContId } from './mapData';

export type CardKind = 'inf' | 'arm' | 'art' | 'wild';
/** A territory card (id = territory id) or a wild (id W1 / W2). */
export interface Card { id: string; t: string | null; kind: CardKind }
const KINDS: CardKind[] = ['inf', 'arm', 'art'];
export const DECK: Card[] = [
  ...TERRITORY_IDS.map((t, i) => ({ id: t, t, kind: KINDS[i % 3] })),
  { id: 'W1', t: null, kind: 'wild' }, { id: 'W2', t: null, kind: 'wild' },
];

/** Armies for the n-th set traded in the whole game (0-based): 4 6 8 10 12 15, then +5 each. */
export const tradeValue = (n: number) => (n < 5 ? 4 + 2 * n : 15 + 5 * (n - 5));
/** +2 armies on one pictured territory you own. */
export const TERRITORY_BONUS = 2;

/** Three of a kind, one of each, or any two plus a wild. */
export function isSet(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  if (cards.some((c) => c.kind === 'wild')) return true;
  const k = new Set(cards.map((c) => c.kind));
  return k.size === 1 || k.size === 3;
}

/** Every set in a hand (as card ids), best first: sets that picture more owned territories and use fewer wilds. */
export function setsIn(hand: Card[], owns: (t: string) => boolean = () => false): string[][] {
  const out: { ids: string[]; score: number }[] = [];
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) for (let k = j + 1; k < hand.length; k++) {
    const s = [hand[i], hand[j], hand[k]];
    if (!isSet(s)) continue;
    out.push({ ids: s.map((c) => c.id), score: s.filter((c) => c.t && owns(c.t)).length - 2 * s.filter((c) => c.kind === 'wild').length });
  }
  return out.sort((a, b) => b.score - a.score).map((s) => s.ids);
}

export type Mission =
  | { kind: 'conts'; conts: ContId[]; plus: boolean }
  | { kind: 'count'; n: number }
  | { kind: 'count2'; n: number }
  | { kind: 'destroy'; target: string };

export const BASE_MISSIONS: Mission[] = [
  { kind: 'conts', conts: ['na', 'af'], plus: false },
  { kind: 'conts', conts: ['na', 'oc'], plus: false },
  { kind: 'conts', conts: ['as', 'sa'], plus: false },
  { kind: 'conts', conts: ['as', 'af'], plus: false },
  { kind: 'conts', conts: ['eu', 'sa'], plus: true },
  { kind: 'conts', conts: ['eu', 'oc'], plus: true },
  { kind: 'count', n: 24 },
  { kind: 'count2', n: 18 },
];
