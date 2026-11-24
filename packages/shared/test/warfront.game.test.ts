import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import { WarfrontGame, chooseWarAction, validateWarSetupData, type WarView, type WarfrontState } from '../src/warfront';
import { seeded } from './warfrontSim';

type C = ReturnType<typeof Client<WarfrontState>>;
const view = (c: C) => c.getState()!.G as unknown as WarView & { factions: number[] };

function table(n: number, setupData: unknown) {
  const base = { ...WarfrontGame };
  const game: Game<WarfrontState> = { ...base, setup: (ctx) => base.setup!(ctx, setupData) };
  const multiplayer = Local();
  const make = (id: string | undefined) => { const c = Client<WarfrontState>({ game, numPlayers: n, multiplayer, playerID: id }); c.start(); return c; };
  return { seats: Array.from({ length: n }, (_, i) => make(String(i))), make };
}

/** Nothing a client holds may show another seat's cards, mission or the deck order. */
function assertNoLeak(c: C) {
  const me = c.playerID;
  const v = view(c);
  if (v.result) return;
  for (const p of v.players) if (p !== me) expect(v.hands[p]).toEqual([]);
  expect(Object.keys(v.missions ?? {}).every((p) => p === me)).toBe(true);
  expect('deck' in v).toBe(false);
  const log = JSON.stringify(c.getState()!.log ?? []);
  expect(log).not.toContain('"deck"');
}

describe('WarfrontGame (boardgame.io)', () => {
  it('validates setup data', () => {
    expect(validateWarSetupData({ mode: 'mission', factions: [2, 4] })).toBeUndefined();
    expect(validateWarSetupData({ mode: 'chaos' })).toBe('bad mode');
    expect(validateWarSetupData({ factions: [1, 1] })).toBe('bad factions');
  });

  it('plays a 4-player mission game to the end through Local(), never leaking hidden cards', () => {
    const { seats, make } = table(4, { mode: 'mission', factions: [5, 3, 1, 0] });
    const rng = seeded(4);
    let steps = 0;
    while (!view(seats[0]).result && steps < 6000) {
      const cur = view(seats[0]).current;
      const c = seats[Number(cur)];
      const a = chooseWarAction(view(c), cur, 'hard', rng);
      c.moves.act(a);
      if (steps % 50 === 0) { seats.forEach(assertNoLeak); }
      if (steps === 200) { seats[2].stop(); seats[2] = make('2'); assertNoLeak(seats[2]); } // reconnect
      steps++;
    }
    expect(view(seats[0]).result).not.toBeNull();
    expect(view(seats[0]).factions).toEqual([5, 3, 1, 0]);
    expect(seats[0].getState()!.ctx.gameover).toBeTruthy();
    const spectator = make(undefined);
    expect(Object.keys(view(spectator).missions ?? {}).length).toBe(4);
  });

  it('refuses a move out of turn and lets anyone resign', () => {
    const { seats } = table(3, { autoDeploy: true });
    const cur = view(seats[0]).current;
    const other = seats.find((c) => c.playerID !== cur)!;
    const before = JSON.stringify(view(seats[0]).armies);
    other.moves.act({ type: 'autoPlace' });
    expect(JSON.stringify(view(seats[0]).armies)).toBe(before);
    other.moves.resign();
    expect(view(seats[0]).out).toEqual([other.playerID]);
  });
});
