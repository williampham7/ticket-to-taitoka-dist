import { describe, expect, it } from 'vitest';
import { KINGDOM_BOT_LEVELS, LENGTHS, type KBotLevel } from '../src/kingdom';
import { conserved, simulate } from './kingdomSim';

/** 500 whole games in total across 2-4 players, lengths, Young Adventurer seats and difficulty mixes: no illegal choice, no stall. */
describe('Shifting Kingdom fuzz', () => {
  it('500 bot games always finish with one winner and every treasure conserved', () => {
    const t0 = Date.now();
    for (let s = 0; s < 500; s++) {
      const n = 2 + (s % 3);
      const levels: KBotLevel[] = Array.from({ length: n }, (_, i) => KINGDOM_BOT_LEVELS[(i * 7 + s) % 3]);
      const length = s % 10 === 0 ? LENGTHS[0] : LENGTHS[1 + (s % 2)];
      const young = Array.from({ length: n }, (_, i) => (s + i) % 5 === 0);
      const { G, finished } = simulate(levels, 20000 + s, { length, young });
      expect(finished, `seed ${20000 + s}`).toBe(true);
      expect(conserved(G), `seed ${20000 + s}`).toBe(true);
      const w = G.result!.winner;
      expect(G.stacks[w]).toEqual([]);
      expect(G.pos[w]).toBe(G.home[w]);
    }
    expect(Date.now() - t0).toBeLessThan(120000);
  }, 120000);
});
