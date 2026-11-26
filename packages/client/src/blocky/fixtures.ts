import { act, chooseBlockyAction, hasMove, newGame, type BView, type GameOpts } from '@boboland/shared/src/blocky';

/** Deterministic game states for the mock, the scenes gallery and the clarity gate (built with the shared rules). */
export type FixtureName = 'mid' | 'duo' | 'grounded' | 'last' | 'end' | 'three' | 'classic2' | 'start';
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// mixed levels give a varied board (Easy seats play small pieces early too)
const LEVELS = ['medium', 'easy', 'medium', 'easy'] as const;
const step = (s: BView, r: () => number) => { act(s, s.actor, chooseBlockyAction(s, s.actor, LEVELS[Number(s.actor) % 4], r)); };

export function fixture(name: FixtureName, back = 0): BView {
  const r = rng(name === 'duo' ? 7 : 42);
  const opts: GameOpts = name === 'duo' ? { board: 'duo', avatars: [0, 3], bots: [false, true] }
    : name === 'three' ? { board: 'classic', avatars: [0, 1, 4], bots: [false, true, true] }
      : name === 'classic2' ? { board: 'classic', avatars: [0, 3], bots: [false, true] }
      : { board: 'classic', avatars: [0, 2, 3, 5], bots: [false, true, true, true] };
  const n = name === 'duo' || name === 'classic2' ? 2 : name === 'three' ? 3 : 4;
  const s = newGame(n, r, opts) as BView;
  const until: Record<FixtureName, (v: BView) => boolean> = {
    mid: (v) => v.placed.length >= 37,
    duo: (v) => v.placed.length >= 16,
    three: (v) => v.placed.length >= 30,
    classic2: (v) => v.placed.length >= 24,
    start: () => true,
    grounded: (v) => v.grounded.length >= 1 && !v.result,
    last: (v) => v.guilds.filter((g) => !v.grounded.includes(g) && hasMove(v, g)).length <= 1 && v.grounded.length >= v.guilds.length - 1,
    end: (v) => !!v.result,
  };
  const hist: BView[] = [];
  for (let i = 0; i < 400 && !s.result && !until[name](s); i++) { if (back) hist.push(structuredClone(s)); step(s, r); }
  return back ? hist[Math.max(0, hist.length - back)] : s;
}
