import { describe, expect, it } from 'vitest';
import { act, chooseWarAction, newGame, viewFor, type WarBotLevel } from '../src/warfront';
import { seeded, simulate } from './warfrontSim';

describe('Warfront bots', () => {
  it('decide only from their own view (same choice whatever the hidden cards and missions)', () => {
    const G = newGame(4, 'mission', seeded(3), { autoDeploy: true });
    for (let k = 0; k < 4; k++) act(G, G.current, { type: 'autoPlace' }, seeded(k));
    const me = G.current;
    const a = chooseWarAction(viewFor(G, me), me, 'hard', seeded(1));
    const other = G.players.find((p) => p !== me)!;
    G.hands[other] = [{ id: 'W1', t: null, kind: 'wild' }];
    G.missions![other] = { kind: 'count', n: 30 };
    G.deck.reverse();
    expect(chooseWarAction(viewFor(G, me), me, 'hard', seeded(1))).toEqual(a);
  });
  it('Hard beats Medium beats Easy', () => {
    const wins: Record<WarBotLevel, number> = { easy: 0, medium: 0, hard: 0 };
    for (let s = 0; s < 60; s++) {
      const levels: WarBotLevel[] = (['easy', 'medium', 'hard'] as WarBotLevel[]).sort(() => seeded(s)() - 0.5);
      const rot = s % 3;
      const seats = [...levels.slice(rot), ...levels.slice(0, rot)];
      const { G } = simulate(seats, 'domination', 9000 + s);
      wins[seats[Number(G.result!.winner)]]++;
    }
    expect(wins.hard).toBeGreaterThan(wins.medium);
    expect(wins.medium).toBeGreaterThan(wins.easy);
  }, 60000);
});
