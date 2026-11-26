import { ALL_ORIENTS } from '../src/blocky/pieces';
import { SIZES, type Guild } from '../src/blocky/tuning';
import { act, canPlace, legalMoves, newGame, type BState, type GameOpts } from '../src/blocky/rules';
import type { Place } from '../src/blocky/pieces';
import { chooseBlockyAction, type BBotLevel } from '../src/blocky/bot';
import { viewFor } from '../src/blocky/view';

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

export const placeKey = (p: Place): string => `${p.piece}/${p.orient}/${p.at}`;
export const keysOf = (ps: Place[]): string[] => ps.map(placeKey).sort();

/** The slow oracle: try every piece, orientation and square with `canPlace`. */
export function brute(s: BState, guild: Guild): Place[] {
  const out: Place[] = [];
  for (const piece of s.shelf[guild]) for (const o of ALL_ORIENTS) {
    if (o.piece !== piece) continue;
    for (let at = 0; at < s.size * s.size; at++) if (canPlace(s, guild, { piece, orient: o.orient, at }) === null) out.push({ piece, orient: o.orient, at });
  }
  return out;
}

/** A position reached by `plies` random legal placements (through `act`), so it is always valid. */
export function randomGame(n: number, seed: number, opts: GameOpts = {}, plies = 20): BState {
  const rng = seeded(seed);
  const s = newGame(n, rng, opts);
  for (let i = 0; i < plies && !s.result; i++) {
    const moves = legalMoves(s, s.current);
    const p = moves[Math.floor(rng() * moves.length)];
    const err = act(s, s.actor, { k: 'place', ...p });
    if (err) throw new Error(`seed ${seed} ply ${i}: ${err}`);
  }
  return s;
}

/** The squares of a board index, for assertions. */
export const rcOf = (s: BState, i: number): [number, number] => [Math.floor(i / s.size), i % s.size];
export const idx = (board: 'classic' | 'duo', r: number, c: number): number => r * SIZES[board] + c;

export interface SimResult { s: BState; steps: number; finished: boolean }
/** Plays a whole game with bots (each from its own view; `levels[seat]`). Throws if a bot ever picks an illegal action. */
export function simulate(levels: BBotLevel[], seed: number, opts: GameOpts = {}, maxSteps = 1000): SimResult {
  const rng = seeded(seed);
  const s = newGame(levels.length, rng, opts);
  let steps = 0;
  while (!s.result && steps < maxSteps) {
    const p = s.actor;
    const a = chooseBlockyAction(viewFor(s, p), p, levels[Number(p)], rng);
    const err = act(s, p, a);
    if (err) throw new Error(`seed ${seed} step ${steps}: ${p} ${JSON.stringify(a)} -> ${err}`);
    steps++;
  }
  return { s, steps, finished: !!s.result };
}
