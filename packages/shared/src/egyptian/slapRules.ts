/**
 * The slap-rule catalogue: data, one entry per rule. A detector takes the round's played cards
 * (burned cards are never in it; top = last) and returns the indices of the matching cards, or null.
 */
import { card, rankOf, suitOf, type Card } from './cards';

export type SlapRuleId =
  | 'double' | 'sandwich' | 'staircase' | 'marriage' | 'divorce' | 'topBottom' | 'tens'
  | 'tenSandwich' | 'sixNine' | 'thirteen' | 'slapjack' | 'lucky7' | 'suitRun' | 'court';

export interface SlapRule {
  id: SlapRuleId;
  name: string;
  description: string;
  example: Card[];
  detect: (pile: readonly Card[]) => number[] | null;
}

export interface SlapMatch { rule: SlapRuleId; cards: number[] }

const ex = (...s: string[]) => s.map(card);
/** Indices of the top k cards, or null when the pile is shorter. */
const top = (pile: readonly Card[], k: number): number[] | null =>
  pile.length < k ? null : Array.from({ length: k }, (_, i) => pile.length - k + i);
const pair = (pile: readonly Card[], gap: 1 | 2, test: (a: number, b: number) => boolean): number[] | null => {
  const n = pile.length;
  if (n < gap + 1) return null;
  return test(rankOf(pile[n - 1 - gap]), rankOf(pile[n - 1])) ? [n - 1 - gap, n - 1] : null;
};
const kq = (a: number, b: number) => (a === 12 && b === 13) || (a === 13 && b === 12);
const isNum = (r: number) => r <= 10;
const ten = (a: number, b: number) => isNum(a) && isNum(b) && a + b === 10;
const steps = (a: number, b: number, c: number) => (b - a === 1 && c - b === 1) || (b - a === -1 && c - b === -1);

export const SLAP_RULES: readonly SlapRule[] = [
  { id: 'double', name: 'Double', description: 'The top two cards have the same rank.', example: ex('7S', '7H'),
    detect: (p) => pair(p, 1, (a, b) => a === b) },
  { id: 'sandwich', name: 'Sandwich', description: 'The top card matches the rank of the third from the top.', example: ex('7S', '2H', '7D'),
    detect: (p) => pair(p, 2, (a, b) => a === b) },
  { id: 'staircase', name: 'Staircase', description: 'The top three run in order, up or down. Ace is low or high, with no wrapping.', example: ex('5C', '6H', '7S'),
    detect: (p) => {
      const t = top(p, 3);
      if (!t) return null;
      const [a, b, c] = t.map((i) => rankOf(p[i]));
      const hi = (r: number) => (r === 1 ? 14 : r);
      return steps(a, b, c) || steps(hi(a), hi(b), hi(c)) ? t : null;
    } },
  { id: 'marriage', name: 'King & Queen', description: 'The top two are a King and a Queen, in either order.', example: ex('KH', 'QH'),
    detect: (p) => pair(p, 1, kq) },
  { id: 'divorce', name: 'Divorce', description: 'A King and a Queen with one card between them.', example: ex('KS', '4D', 'QS'),
    detect: (p) => pair(p, 2, kq) },
  { id: 'topBottom', name: 'Top & Bottom', description: 'The top card matches the rank of the round’s first card.', example: ex('9D', '3C', '5H', '9S'),
    detect: (p) => (p.length >= 3 && rankOf(p[0]) === rankOf(p[p.length - 1]) ? [0, p.length - 1] : null) },
  { id: 'tens', name: 'Tens', description: 'The top two number cards add up to 10. Ace counts 1; J, Q, K never count.', example: ex('4C', '6D'),
    detect: (p) => pair(p, 1, ten) },
  { id: 'tenSandwich', name: 'Ten Sandwich', description: 'The top card and the third from the top add up to 10.', example: ex('3H', 'KC', '7S'),
    detect: (p) => pair(p, 2, ten) },
  { id: 'sixNine', name: 'Six-Nine', description: 'The top two are a 6 and a 9, in either order.', example: ex('6S', '9H'),
    detect: (p) => pair(p, 1, (a, b) => (a === 6 && b === 9) || (a === 9 && b === 6)) },
  { id: 'thirteen', name: 'Thirteen', description: 'The top two add up to 13 (A = 1, J = 11, Q = 12, K = 13).', example: ex('5D', '8C'),
    detect: (p) => pair(p, 1, (a, b) => a + b === 13) },
  { id: 'slapjack', name: 'Slapjack', description: 'The top card is any Jack.', example: ex('JD'),
    detect: (p) => (p.length && rankOf(p[p.length - 1]) === 11 ? [p.length - 1] : null) },
  { id: 'lucky7', name: 'Lucky Seven', description: 'The top card is any 7.', example: ex('7C'),
    detect: (p) => (p.length && rankOf(p[p.length - 1]) === 7 ? [p.length - 1] : null) },
  { id: 'suitRun', name: 'Three of a Suit', description: 'The top three cards share a suit.', example: ex('2H', '9H', '5H'),
    detect: (p) => {
      const t = top(p, 3);
      return t && t.every((i) => suitOf(p[i]) === suitOf(p[t[0]])) ? t : null;
    } },
  { id: 'court', name: 'Royal Court', description: 'The top three are all Jacks, Queens or Kings.', example: ex('JC', 'KD', 'QS'),
    detect: (p) => {
      const t = top(p, 3);
      return t && t.every((i) => rankOf(p[i]) >= 11) ? t : null;
    } },
];

export const SLAP_RULE_IDS: readonly SlapRuleId[] = SLAP_RULES.map((r) => r.id);
export const DEFAULT_RULES: SlapRuleId[] = ['double', 'sandwich'];
export const RULE_BY_ID = Object.fromEntries(SLAP_RULES.map((r) => [r.id, r])) as Record<SlapRuleId, SlapRule>;

export const isSlapRuleId = (x: unknown): x is SlapRuleId => typeof x === 'string' && (SLAP_RULE_IDS as readonly string[]).includes(x);

/** Every active rule the pile matches, in catalogue order (the first is the headline). */
export function matchSlap(pile: readonly Card[], rules: readonly SlapRuleId[]): SlapMatch[] {
  const out: SlapMatch[] = [];
  for (const r of SLAP_RULES) {
    if (!rules.includes(r.id)) continue;
    const cards = r.detect(pile);
    if (cards) out.push({ rule: r.id, cards });
  }
  return out;
}

export function validateRules(x: unknown): string | undefined {
  if (!Array.isArray(x) || x.length === 0) return 'rules must be a non-empty list';
  if (!x.every(isSlapRuleId)) return 'unknown rule';
  if (new Set(x).size !== x.length) return 'duplicate rule';
  return undefined;
}
