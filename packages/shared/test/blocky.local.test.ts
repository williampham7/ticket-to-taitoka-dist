import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import { BlockyGame, legalMoves, type BState, type BView } from '../src/blocky';
import { seeded } from './blockySim';

type C = ReturnType<typeof Client<BState>>;
const view = (c: C) => c.getState()!.G as unknown as BView;

function table(n: number, setupData: unknown) {
  const base = { ...BlockyGame }; // a fresh game object per match: Local() keeps one master per game object
  const game: Game<BState> = { ...base, setup: (ctx) => base.setup!(ctx, setupData) };
  const multiplayer = Local();
  const make = (id: string | undefined) => { const c = Client<BState>({ game, numPlayers: n, multiplayer, playerID: id }); c.start(); return c; };
  return { seats: Array.from({ length: n }, (_, i) => make(String(i))), make };
}

describe('BlockyGame through Local()', () => {
  it('two clients stay in sync, refuse off-turn acts, survive a reconnect, and a spectator sees everything', () => {
    const { seats, make } = table(2, { board: 'duo' });
    const rng = seeded(5);
    let steps = 0;
    while (!view(seats[0]).result && steps < 300) {
      const v = view(seats[0]);
      const actor = seats[Number(v.actor)], idle = seats[1 - Number(v.actor)];
      if (steps % 7 === 0) { // an off-turn act changes nothing
        const before = JSON.stringify(view(idle).placed);
        const m = legalMoves(v, v.current)[0];
        idle.moves.act({ k: 'place', ...m });
        expect(JSON.stringify(view(idle).placed)).toBe(before);
      }
      const moves = legalMoves(v, v.current);
      actor.moves.act({ k: 'place', ...moves[Math.floor(rng() * moves.length)] });
      expect(JSON.stringify(view(seats[0]))).toBe(JSON.stringify(view(seats[1])));
      if (steps === 6) {
        const before = view(seats[1]);
        seats[1].stop(); seats[1] = make('1');
        expect(view(seats[1]).placed).toEqual(before.placed);
        expect(view(seats[1]).cells).toEqual(before.cells);
        expect(view(seats[1]).actor).toBe(before.actor);
      }
      steps++;
    }
    const end = view(seats[0]);
    expect(end.result).not.toBeNull();
    expect(seats[0].getState()!.ctx.gameover).toBeTruthy();
    const spectator = make(undefined);
    expect(view(spectator).placed).toEqual(end.placed);
    expect(view(spectator).result).toEqual(end.result);
  });

  it('resign and dismiss go through; a 3rd player lobby forces Classic', () => {
    const { seats } = table(3, { board: 'duo', hints: false });
    expect(view(seats[0]).board).toBe('classic');
    expect(view(seats[0]).hints).toBe(false);
    seats[2].moves.dismiss('1'); // not the host
    expect(view(seats[0]).out).toEqual([]);
    seats[0].moves.dismiss('1');
    expect(view(seats[0]).out).toEqual(['1']);
    seats[2].moves.resign();
    expect(view(seats[0]).result!.winners).toEqual(['0']);
  });
});
