import { expect } from 'vitest';
import { card, DECK_SIZE, type Card } from '../src/egyptian/cards';
import { DEFAULT_RULES, type SlapRuleId } from '../src/egyptian/slapRules';
import { newGame, totalCards, type EgwState, type Rng } from '../src/egyptian/rules';
import { TIMING } from '../src/egyptian/timing';

export const cs = (...s: string[]): Card[] => s.map(card);

/** A deterministic rng: shuffle keeps order, die returns `die`. */
export const identityRng = (die = 1): Rng => ({ shuffle: (a) => [...a], die: () => die });

/**
 * A play-stage state from short card names: players = keys in order (clockwise), turn = first player.
 * Unlisted cards go under `filler`'s stack, or (no filler) into `burned`, so the deck always holds 52.
 */
export function rigged(stacks: Record<string, string[]>, opts: { pile?: string[]; rules?: SlapRuleId[]; turn?: string; filler?: string } = {}): EgwState {
  const players = Object.keys(stacks);
  const G = newGame(players.length, opts.rules ?? DEFAULT_RULES, identityRng(), TIMING);
  G.players = players;
  G.stacks = {};
  const used = new Set<Card>();
  for (const p of players) { G.stacks[p] = cs(...stacks[p]); G.stacks[p].forEach((c) => used.add(c)); }
  G.pile = cs(...(opts.pile ?? []));
  G.pile.forEach((c) => used.add(c));
  const rest = Array.from({ length: DECK_SIZE }, (_, i) => i).filter((c) => !used.has(c));
  // the leftover cards sit under a filler player's stack (default: nobody; then they are burned cards)
  if (opts.filler) G.stacks[opts.filler].push(...rest);
  else G.burned = rest;
  for (const k of ['lockout', 'slapInUsed', 'left', 'ready', 'stats'] as const) {
    const src = G[k] as Record<string, unknown>;
    const first = src['0'];
    (G as unknown as Record<string, unknown>)[k] = Object.fromEntries(players.map((p) => [p, structuredClone(first)]));
  }
  G.stage = 'play';
  G.turn = opts.turn ?? players[0];
  G.leader = G.turn;
  G.topBy = G.pile.length ? players[players.length - 1] : null;
  return G;
}

export function assertInvariant(G: EgwState) {
  expect(totalCards(G)).toBe(DECK_SIZE);
  if (G.stage === 'play' && !G.result) {
    if (G.timer === null) {
      expect(G.turn, 'someone must be able to act').not.toBeNull();
      expect(G.stacks[G.turn!].length).toBeGreaterThan(0);
      expect(G.left[G.turn!]).toBe(false);
    }
  }
}
