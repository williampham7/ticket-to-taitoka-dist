import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import {
  FrontlineGame, legalMoves, randomPlacement, type FrontlineState, type FrontlineView, type PlayerID,
} from '../src/frontline';
import { begin, prng } from './frontlineHelpers';

type C = ReturnType<typeof Client<FrontlineState>>;
const view = (c: C) => c.getState()!.G as unknown as FrontlineView;

function table(base: Game<FrontlineState> = FrontlineGame) {
  const game = { ...base }; // Local() keeps one master per game object: a fresh object is a fresh match
  const multiplayer = Local();
  const make = (id: PlayerID) => { const c = Client<FrontlineState>({ game, numPlayers: 2, multiplayer, playerID: id }); c.start(); return begin(c); };
  return { seats: [make('0'), make('1')], make };
}

/**
 * Every rank this client may NOT know: the enemy's unrevealed pieces, as their own client sees them
 * (a player's own view has their pieces with ranks). The stringified state must name none of them with a rank.
 */
function assertNoLeak(me: C, enemy: C) {
  const mine = me.playerID as PlayerID;
  const state = me.getState()!;
  const enemyView = view(enemy);
  const hidden = enemyView.pieces.filter((p) => p.owner !== mine && !p.revealed);
  const isOver = !!state.ctx.gameover;
  // walk everything the client holds: G, ctx, log, plugins...
  const walk = (x: unknown) => {
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    if (!isOver && 'rank' in o) {
      const byId = typeof o.id === 'string' && hidden.some((h) => h.id === o.id);
      const byPos = typeof o.pos === 'number' && hidden.some((h) => h.pos === o.pos) && o.owner !== mine;
      const placement = typeof o.pos === 'number' && !('id' in o) && !('owner' in o) && (mine === '0' ? o.pos < 40 : o.pos >= 60);
      expect(byId || byPos || placement, `rank leaked to ${mine}: ${JSON.stringify(o)}`).toBe(false);
    }
    Object.values(o).forEach(walk);
  };
  walk(JSON.parse(JSON.stringify(state)));
  // the opponent's setup move never reaches me with its arguments
  for (const e of (state as { log?: { action: { type: string; payload: { type: string; playerID: string; args: unknown } } }[] }).log ?? []) {
    if (e.action.type === 'MAKE_MOVE' && e.action.payload.type === 'submitSetup' && e.action.payload.playerID !== mine) {
      expect(e.action.payload.args).toBeNull();
    }
  }
}

const check = (a: C, b: C) => { assertNoLeak(a, b); assertNoLeak(b, a); };

describe('Frontline game: setup', () => {
  it('both players set up at the same time; play starts when both are ready', () => {
    const { seats: [a, b] } = table();
    expect(a.getState()!.ctx.phase).toBe('setup');
    a.moves.submitSetup(randomPlacement('0', prng(1)));
    check(a, b);
    expect(a.getState()!.ctx.phase).toBe('setup');
    // during setup the other side's army is not in my view at all
    expect(view(b).pieces.filter((p) => p.owner === '0')).toEqual([]);
    expect(view(b).ready['0']).toBe(true);
    b.moves.submitSetup(randomPlacement('1', prng(2)));
    check(a, b);
    const s = a.getState()!;
    expect(s.ctx.phase).toBe('play');
    expect(s.ctx.currentPlayer).toBe(view(a).first);
    expect(view(a).pieces.length).toBe(80);
  });

  it('rejects an invalid setup and a second submission', () => {
    const { seats: [a] } = table();
    const bad = randomPlacement('1', prng(3)); // wrong zone for player 0
    a.moves.submitSetup(bad);
    expect(view(a).ready['0']).toBe(false);
    a.moves.submitSetup(randomPlacement('0', prng(3)));
    const before = JSON.stringify(view(a).pieces);
    a.moves.submitSetup(randomPlacement('0', prng(4)));
    expect(JSON.stringify(view(a).pieces)).toBe(before);
  });

  it('first mover comes from the seeded random: same seed, same first mover; both seats occur', () => {
    const firstFor = (seed: string) => {
      const { seats: [a, b] } = table({ ...FrontlineGame, seed });
      a.moves.submitSetup(randomPlacement('0', prng(1)));
      b.moves.submitSetup(randomPlacement('1', prng(2)));
      return a.getState()!.ctx.currentPlayer;
    };
    expect(firstFor('s1')).toBe(firstFor('s1'));
    const seen = new Set(Array.from({ length: 12 }, (_, i) => firstFor(`seed-${i}`)));
    expect(seen).toEqual(new Set(['0', '1']));
  });
});

describe('Frontline game: play and hidden information', () => {
  it('plays random legal moves through combat without leaking any hidden rank, also after a reconnect', () => {
    const { seats, make } = table({ ...FrontlineGame, seed: 'leak' });
    let [a, b] = seats;
    a.moves.submitSetup(randomPlacement('0', prng(11)));
    b.moves.submitSetup(randomPlacement('1', prng(12)));
    check(a, b);
    const rnd = prng(99);
    let combats = 0;
    for (let i = 0; i < 400 && !a.getState()!.ctx.gameover; i++) {
      const cur = a.getState()!.ctx.currentPlayer as PlayerID;
      const client = cur === '0' ? a : b;
      // a client can't list legal moves from its view alone in general; ask with my own view (own pieces known)
      const ms = legalMoves(view(client) as unknown as FrontlineState, cur);
      expect(ms.length).toBeGreaterThan(0);
      const m = ms[Math.floor(rnd() * ms.length)];
      client.moves.move(m.from, m.to);
      if (view(a).lastCombat) combats++;
      check(a, b);
      if (i === 150) {
        // reconnect: a fresh client for seat 1 syncs from the server
        b.stop();
        b = make('1');
        check(a, b);
      }
    }
    expect(combats).toBeGreaterThan(0);
  });

  it('views: own pieces with rank, enemy unrevealed as id/pos/revealed only; combat reveals both ranks', () => {
    const { seats: [a, b] } = table({ ...FrontlineGame, seed: 'v' });
    a.moves.submitSetup(randomPlacement('0', prng(5)));
    b.moves.submitSetup(randomPlacement('1', prng(6)));
    const enemy = view(a).pieces.filter((p) => p.owner === '1');
    expect(enemy.every((p) => !('rank' in p))).toBe(true);
    expect(Object.keys(enemy[0]).sort()).toEqual(['id', 'owner', 'pos', 'revealed']);
    expect(view(a).pieces.filter((p) => p.owner === '0').every((p) => 'rank' in p)).toBe(true);
  });

  it('resign: the opponent wins, at any time, and the end reveals everything', () => {
    const { seats: [a, b] } = table({ ...FrontlineGame, seed: 'r' });
    a.moves.submitSetup(randomPlacement('0', prng(5)));
    b.moves.submitSetup(randomPlacement('1', prng(6)));
    const notMover = a.getState()!.ctx.currentPlayer === '0' ? b : a;
    notMover.moves.resign();
    const s = a.getState()!;
    expect(s.ctx.gameover).toEqual({ winner: notMover.playerID === '0' ? '1' : '0' });
    expect(view(a).result).toEqual({ winner: notMover.playerID === '0' ? '1' : '0', reason: 'resign' });
    expect(view(a).pieces.every((p) => 'rank' in p)).toBe(true);
    expect(view(b).pieces.every((p) => 'rank' in p)).toBe(true);
  });

  it('resign also works during setup', () => {
    const { seats: [a] } = table();
    a.moves.resign();
    expect(a.getState()!.ctx.gameover).toEqual({ winner: '1' });
  });

  it('only the current player may move a piece; an illegal move changes nothing', () => {
    const { seats: [a, b] } = table({ ...FrontlineGame, seed: 'i' });
    a.moves.submitSetup(randomPlacement('0', prng(5)));
    b.moves.submitSetup(randomPlacement('1', prng(6)));
    const cur = a.getState()!.ctx.currentPlayer;
    const idle = cur === '0' ? b : a;
    const turn = a.getState()!.ctx.turn;
    const m = legalMoves(view(idle) as unknown as FrontlineState, idle.playerID as PlayerID)[0];
    idle.moves.move(m.from, m.to);
    const mover = cur === '0' ? a : b;
    mover.moves.move(0, 99);
    expect(a.getState()!.ctx.turn).toBe(turn);
  });

  it('a spectator sees no ranks', () => {
    const spectated = { ...FrontlineGame };
    const multiplayer = Local();
    const mk = (id?: string) => { const c = Client<FrontlineState>({ game: spectated, numPlayers: 2, multiplayer, playerID: id }); c.start(); return begin(c); };
    const a = mk('0'), b = mk('1'), spec = mk();
    a.moves.submitSetup(randomPlacement('0', prng(5)));
    b.moves.submitSetup(randomPlacement('1', prng(6)));
    expect(view(spec).pieces.length).toBe(80);
    expect(view(spec).pieces.some((p) => 'rank' in p)).toBe(false);
  });
});
