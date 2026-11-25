import { describe, expect, it } from 'vitest';
import { act, chooseKingdomAction, newGame, suggestShift, viewFor, applyShift, pathTo, cellOf, type KBotLevel } from '../src/kingdom';
import { seeded, simulate } from './kingdomSim';

describe('Runeshift bots', () => {
  it('decide only from their own view (same choice whatever the others hold)', () => {
    for (const level of ['easy', 'medium', 'hard'] as KBotLevel[]) {
      const G = newGame(3, seeded(3), {});
      const me = G.current;
      const a = chooseKingdomAction(viewFor(G, me), me, level, seeded(1));
      for (const p of G.players) if (p !== me) G.stacks[p] = [...G.stacks[p]].reverse();
      expect(chooseKingdomAction(viewFor(G, me), me, level, seeded(1))).toEqual(a);
    }
  });

  it('always play legally and finish games at every level', () => {
    for (const level of ['easy', 'medium', 'hard'] as KBotLevel[]) {
      const { finished } = simulate([level, level, level], 40, { length: 'short' });
      expect(finished).toBe(true);
    }
  });

  it('suggests a push that really makes my target reachable, from my own view', () => {
    let checked = 0;
    for (let s = 0; s < 30; s++) {
      const G = newGame(2, seeded(s), {});
      const me = G.current;
      const v = viewFor(G, me);
      const sh = suggestShift(v, me);
      if (!sh) continue;
      const r = applyShift(v.board, v.spare, v.pos, sh.at, sh.rot);
      expect(pathTo(r.board, r.pos[me], cellOf({ board: r.board }, v.targets[me][0]))).not.toBeNull();
      expect(act(G, me, { k: 'shift', ...sh })).toBeUndefined();
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('Hard beats Medium (>=55%) and Medium beats Easy (>=60%) over 200 two-player games', () => {
    const duel = (a: KBotLevel, b: KBotLevel, base: number) => {
      let wins = 0;
      for (let s = 0; s < 100; s++) {
        const seats: KBotLevel[] = s % 2 ? [a, b] : [b, a];
        const { G } = simulate(seats, base + s, { length: 'medium' });
        if (seats[Number(G.result!.winner)] === a) wins++;
      }
      return wins / 100;
    };
    const hm = duel('hard', 'medium', 7000), me = duel('medium', 'easy', 8000);
    console.log(`hard vs medium ${hm}, medium vs easy ${me}`);
    expect(hm).toBeGreaterThanOrEqual(0.55);
    expect(me).toBeGreaterThanOrEqual(0.6);
  }, 120000);
});
