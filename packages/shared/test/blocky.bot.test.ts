import { describe, expect, it } from 'vitest';
import { chooseBlockyAction, evaluate, suggestMove, viewFor, act, canPlace, legalMoves, newGame, type BBotLevel, type BState } from '../src/blocky';
import { randomGame, seeded, simulate } from './blockySim';

const LEVELS: BBotLevel[] = ['easy', 'medium', 'hard'];
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { Object.values(o as object).forEach(deepFreeze); Object.freeze(o); }
  return o;
}

describe('Blocky bots', () => {
  it('always legal over 50 games, every level, every board', () => {
    let finished = 0;
    for (let i = 0; i < 50; i++) {
      const n = 2 + (i % 3);
      const levels = Array.from({ length: n }, (_, k) => LEVELS[(i + k) % 3]);
      const r = simulate(levels, 500 + i, n === 2 && i % 2 ? { board: 'classic' } : {});
      if (r.finished) finished++;
    }
    expect(finished).toBe(50);
  });

  it('decides only from its own view (frozen view, same seed same choice)', () => {
    for (const level of LEVELS) {
      const s = randomGame(3, 8, { board: 'classic' }, 15);
      const me = s.actor;
      const frozen = deepFreeze(structuredClone(viewFor(s, me)));
      const a = chooseBlockyAction(frozen, me, level, seeded(1));
      expect(chooseBlockyAction(frozen, me, level, seeded(1))).toEqual(a);
      expect(a.k).toBe('place');
      if (a.k === 'place') expect(canPlace(s, s.current, a)).toBeNull();
    }
  });

  it('is not the actor: no placement; suggestMove is null off turn and legal on turn', () => {
    const s = randomGame(4, 3, { board: 'classic' }, 9);
    const other = s.order.find((p) => p !== s.actor)!;
    expect(suggestMove(viewFor(s, other), other)).toBeNull();
    expect(chooseBlockyAction(viewFor(s, other), other, 'hard', seeded(1))).toEqual({ k: 'done' });
    const m = suggestMove(viewFor(s, s.actor), s.actor)!;
    expect(canPlace(s, s.current, m)).toBeNull();
    expect(suggestMove(viewFor(s, s.actor), s.actor)).toEqual(m); // deterministic
    expect(Number.isFinite(evaluate(s, s.current, m))).toBe(true);
  });

  it('hard < 300ms median on a mid-game Classic position (budget 100ms)', () => {
    const s = randomGame(4, 91, { board: 'classic' }, 30);
    const v = viewFor(s, s.actor);
    chooseBlockyAction(v, s.actor, 'hard', seeded(1));
    const times: number[] = [];
    for (let i = 0; i < 30; i++) { const t = performance.now(); chooseBlockyAction(v, s.actor, 'hard', seeded(i)); times.push(performance.now() - t); }
    const m = median(times);
    console.log(`Hard median ${m.toFixed(1)} ms (${legalMoves(s, s.current).length} moves)`);
    expect(m).toBeLessThan(300);
  });

  it('hard keeps I1 for last when possible', () => {
    let monos = 0;
    for (let seed = 0; seed < 6; seed++) {
      const s = newGame(2, seeded(seed), { board: 'duo' });
      const rng = seeded(seed + 50);
      while (!s.result) {
        const p = s.actor, g = s.current;
        const a = chooseBlockyAction(viewFor(s, p), p, 'hard', rng);
        if (a.k === 'place' && a.piece === 'I1') {
          monos++;
          const others = legalMoves(s, g).filter((m) => m.piece !== 'I1');
          expect(others).toEqual([]); // nothing else could be played
        }
        expect(act(s, p, a)).toBeUndefined();
      }
    }
    expect(monos).toBeGreaterThan(0); // it does play it, once nothing else fits
  });
});

export type { BState };
