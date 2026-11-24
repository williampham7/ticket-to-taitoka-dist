import { describe, expect, it } from 'vitest';
import { CONT_TERRS, TERRITORY_IDS, territoriesOf, WAR_BOT_LEVELS, type WarBotLevel } from '../src/warfront';
import { simulate } from './warfrontSim';

/** 500 whole games across every player count, mode, setup style and difficulty mix: no illegal choice, no stall. */
describe('Warfront fuzz', () => {
  it('500 bot games always finish with one winner and a consistent board', () => {
    for (let s = 0; s < 500; s++) {
      const n = 2 + (s % 5);
      const levels: WarBotLevel[] = Array.from({ length: n }, (_, i) => WAR_BOT_LEVELS[(i * 7 + s) % 3]);
      const { G, finished } = simulate(levels, s % 2 ? 'mission' : 'domination', 5000 + s, s % 4 !== 0);
      expect(finished, `seed ${5000 + s}`).toBe(true);
      expect(G.stage).toBe('over');
      for (const t of TERRITORY_IDS) { expect(G.owner[t]).not.toBeNull(); expect(G.armies[t]).toBeGreaterThanOrEqual(1); }
      const w = G.result!.winner;
      if (G.result!.reason === 'domination') expect(G.players.filter((p) => p !== w).every((p) => territoriesOf(G, p).length === 0)).toBe(true);
      expect(Object.values(CONT_TERRS).flat()).toHaveLength(42);
    }
  }, 120000);
});
