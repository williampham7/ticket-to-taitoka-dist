import { describe, expect, it } from 'vitest';
import { act, chooseBlockyAction, eventMs, newGame, type BView } from '@boboland/shared/src/blocky';
import { rng } from './fixtures';

describe('blocky pacing', () => {
  it('a 4-bot Classic game at full speed takes under 4 minutes', () => {
    // what the queue blocks for (shared timing.ts) plus the bots' turn lead (blockyBots.ts: 700 first, 350 later)
    for (const seed of [1, 2, 3]) {
      const r = rng(seed);
      const s = newGame(4, r, { board: 'classic', bots: [true, true, true, true] }) as BView;
      let ms = 0, seen = 0, turns = 0;
      while (!s.result && turns < 400) {
        act(s, s.actor, chooseBlockyAction(s, s.actor, 'medium', r));
        turns++;
        for (const e of s.log) if (e.n > seen) ms += eventMs(e);
        seen = s.logTotal;
        ms += 700;
      }
      expect(s.result).not.toBeNull();
      expect(ms / 1000).toBeLessThan(240);
    }
  });
});
