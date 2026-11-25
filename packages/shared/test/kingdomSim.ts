/** Deterministic random numbers (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

import { TREASURE_IDS, act, chooseKingdomAction, newGame, viewFor, type GameOpts, type KBotLevel, type KState } from '../src/kingdom';

export interface SimResult { G: KState; steps: number; finished: boolean }
/** Plays a whole game with bots (each from its own view). Throws if a bot ever picks an illegal action. */
export function simulate(levels: KBotLevel[], seed: number, opts: GameOpts = {}, maxSteps = 6000): SimResult {
  const rng = seeded(seed);
  const G = newGame(levels.length, rng, opts);
  let steps = 0;
  while (!G.result && steps < maxSteps) {
    const p = G.current;
    const a = chooseKingdomAction(viewFor(G, p), p, levels[Number(p)], rng);
    const err = act(G, p, a);
    if (err) throw new Error(`seed ${seed} step ${steps}: ${p} ${JSON.stringify(a)} -> ${err}`);
    steps++;
  }
  return { G, steps, finished: !!G.result };
}

/** Every treasure is on exactly one tile (board or spare), and found + remaining stacks are disjoint. */
export function conserved(G: KState): boolean {
  const on = [...G.board, G.spare].map((t) => t.t).filter(Boolean).sort();
  if (JSON.stringify(on) !== JSON.stringify([...TREASURE_IDS].sort())) return false;
  const held = G.players.flatMap((p) => [...G.found[p], ...G.stacks[p]]);
  return new Set(held).size === held.length;
}
