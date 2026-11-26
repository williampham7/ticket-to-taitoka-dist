import { describe, expect, it } from 'vitest';
import { act, chooseBlockyAction, newGame, type BView } from '@boboland/shared/src/blocky';
import { applyEvent, newEvents } from './fxQueue';
import { placeTimes } from './fx';
import { rng } from './fixtures';

function game(steps: number) {
  const r = rng(5);
  const s = newGame(4, r, { board: 'classic' }) as BView;
  const start = structuredClone(s);
  for (let i = 0; i < steps && !s.result; i++) act(s, s.actor, chooseBlockyAction(s, s.actor, 'medium', r));
  return { start, s };
}
describe('blocky fx queue', () => {
  it('events replay in order', () => {
    const { start, s } = game(30);
    let d = start;
    for (const e of newEvents(s, start.logTotal)!) d = applyEvent(d, e);
    expect(d.cells).toEqual(s.cells);
    expect(d.placed).toEqual(s.placed);
    expect(d.shelf).toEqual(s.shelf);
    expect(d.grounded.sort()).toEqual([...s.grounded].sort());
    expect([d.current, d.actor]).toEqual([s.current, s.actor]);
  });
  it('newEvents returns null on gap', () => {
    const { s } = game(70);
    expect(newEvents(s, s.logTotal)).toEqual([]);
    expect(newEvents(s, 0)).toBeNull(); // the capped log no longer holds event 1
    const some = newEvents(s, s.logTotal - 3)!;
    expect(some.map((e) => e.n)).toEqual([s.logTotal - 2, s.logTotal - 1, s.logTotal]);
  });
  it('residue does not extend busy', () => {
    // the queue waits only for the blocking length; the landing fits inside it at full speed
    for (const k of [1, 2, 3, 4, 5]) {
      const t = placeTimes(k, true, 1);
      expect(t.land).toBeLessThanOrEqual(500 + 120 * k);
      expect(t.total).toBeGreaterThan(500 + 120 * k);
    }
  });
});
