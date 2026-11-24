import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import {
  FleetGame, moveFor, randomDeployment, validateFleetSetupData, viewActionError,
  type FleetAction, type FleetState, type FleetView, type PlayerID,
} from '../src/fleet';
import { prng } from './frontlineHelpers';
import { STANDARD } from './fleetHelpers';

type C = ReturnType<typeof Client<FleetState>>;
const view = (c: C) => c.getState()!.G as unknown as FleetView;

function table(setupData: unknown, base: Game<FleetState> = FleetGame) {
  const game = { ...base, setup: (ctx: Parameters<NonNullable<Game<FleetState>['setup']>>[0]) => base.setup!(ctx, setupData) };
  const multiplayer = Local();
  const make = (id: PlayerID | null) => {
    const c = Client<FleetState>({ game, numPlayers: 2, multiplayer, playerID: id ?? undefined });
    c.start();
    return c;
  };
  return { seats: [make('0'), make('1')] as [C, C], make };
}

function play(c: C, a: FleetAction) {
  const m = moveFor(a);
  (c.moves[m.name] as (...args: unknown[]) => void)(...m.args);
}

/** A random legal action for the client to move, chosen from its own view. */
function randomAction(c: C, rnd: () => number): FleetAction {
  const v = view(c);
  const me = c.playerID as PlayerID;
  const open = v.sides[me].shots.map((s, i) => (s === null || s === 'deflect' ? i : -1)).filter((i) => i >= 0);
  const pick = () => open[Math.floor(rnd() * open.length)];
  const tries: FleetAction[] = [];
  if (v.mode === 'super') {
    for (const id of v.sides[me].loadout ?? []) {
      if (id === 'seaMine') tries.push({ type: 'mine', sq: pick() });
      else tries.push({ type: 'weapon', id, sq: pick(), dir: rnd() < 0.5 ? 'h' : 'v' });
    }
  }
  if (v.mode === 'salvo') {
    const n = Math.min(v.sides[me].fleet.filter((s) => !s.sunk).length, open.length);
    const sqs = [...open].sort(() => rnd() - 0.5).slice(0, n);
    tries.push({ type: 'salvo', sqs });
  }
  tries.push({ type: 'shell', sq: pick() });
  return tries.find((a) => viewActionError(v, me, a) === undefined)!;
}

/** Words that name the defender's secret loadout (all passive, so never announced). */
const SECRET = ['shield', 'decoy', 'reinforcement'];

/** Nothing the client holds may reveal the enemy's fleet, decoy, loadout or a mine square. */
function assertNoLeak(c: C) {
  const me = c.playerID as PlayerID | null;
  const state = c.getState()!;
  const v = view(c);
  if (v.revealed) return;
  for (const p of ['0', '1'] as PlayerID[]) {
    if (p === me) {
      expect('mine' in v.sides[p], 'own mine square').toBe(false);
      continue;
    }
    const side = v.sides[p];
    for (const k of ['decoy', 'loadout', 'charge', 'mine', 'mineLive', 'stats', 'spent']) expect(k in side, `${k} of ${p} to ${me}`).toBe(false);
    for (const s of side.fleet) if (!s.sunk) expect(s.squares, `squares of ${p}'s ${s.cls} to ${me}`).toBeUndefined();
  }
  // seat 1 holds the passive loadout: its names never reach anyone else
  if (me !== '1') {
    const text = JSON.stringify({ G: state.G, ctx: state.ctx, plugins: state.plugins, log: (state as { log?: unknown }).log });
    // as a value only: own ships carry a `shield` key and own sides a `decoy` key
    for (const w of SECRET) expect(new RegExp(`"${w}"(?!:)`).test(text), `${w} leaked to ${me}`).toBe(false);
  }
  expect((state.plugins as Record<string, { data?: unknown }>).random?.data, 'random seed reached a client').toBeUndefined();
  for (const e of (state as { log?: { action: { type: string; payload: { type: string; playerID: string; args: unknown } } }[] }).log ?? []) {
    const { type, playerID, args } = e.action.payload;
    if (e.action.type === 'MAKE_MOVE' && (type === 'deploy' || type === 'dropMine') && playerID !== me) expect(args).toBeNull();
  }
}

describe('Fleet game: setup data', () => {
  it('accepts mode and match length, rejects anything else', () => {
    expect(validateFleetSetupData(undefined)).toBeUndefined();
    expect(validateFleetSetupData({ mode: 'salvo', bestOf: 3 })).toBeUndefined();
    expect(validateFleetSetupData({ mode: 'laser' })).toBeDefined();
    expect(validateFleetSetupData({ bestOf: 2 })).toBeDefined();
    expect(validateFleetSetupData([])).toBeDefined();
  });

  it('starts in placement with the requested mode', () => {
    const { seats: [a] } = table({ mode: 'super', bestOf: 5 });
    expect(a.getState()!.ctx.phase).toBe('placement');
    expect(view(a).mode).toBe('super');
    expect(view(a).bestOf).toBe(5);
  });
});

describe('Fleet game: flow', () => {
  it('both place at once; the battle starts when both are deployed; turns alternate', () => {
    const { seats: [a, b] } = table({ mode: 'classic' });
    a.moves.deploy({ ships: STANDARD, loadout: [] });
    expect(a.getState()!.ctx.phase).toBe('placement');
    a.moves.undeploy();
    expect(view(a).sides['0'].deployed).toBe(false);
    a.moves.deploy({ ships: STANDARD, loadout: [] });
    b.moves.deploy({ ships: STANDARD, loadout: [] });
    const s = a.getState()!;
    expect(s.ctx.phase).toBe('battle');
    expect(s.ctx.currentPlayer).toBe(view(a).turn);
    const [first, second] = s.ctx.currentPlayer === '0' ? [a, b] : [b, a];
    second.moves.fire(5); // not their turn
    expect(view(a).log.length).toBe(0);
    first.moves.fire(5);
    expect(view(a).log.length).toBe(1);
    expect(a.getState()!.ctx.currentPlayer).toBe(second.playerID);
  });

  it('a best-of-3 goes to roundEnd, both confirm, and placement starts again', () => {
    const { seats: [a, b] } = table({ mode: 'classic', bestOf: 3 });
    a.moves.deploy({ ships: STANDARD, loadout: [] });
    b.moves.deploy({ ships: STANDARD, loadout: [] });
    const squares = [0, 1, 2, 3, 4, 20, 21, 22, 23, 40, 41, 42, 60, 61, 62, 80, 81];
    const water = Array.from({ length: 100 }, (_, i) => i).filter((i) => Math.floor(i / 10) % 2 === 1);
    let k = 0, w = 0;
    while (a.getState()!.ctx.phase === 'battle') {
      const cur = a.getState()!.ctx.currentPlayer === '0' ? a : b;
      if (cur === a) a.moves.fire(squares[k++]);
      else b.moves.fire(water[w++]);
    }
    expect(a.getState()!.ctx.phase).toBe('roundEnd');
    expect(view(b).revealed).toBe(true);
    a.moves.nextRound();
    b.moves.nextRound();
    expect(a.getState()!.ctx.phase).toBe('placement');
    expect(view(a).round).toBe(2);
    expect(view(a).wins).toEqual({ 0: 1, 1: 0 });
  });

  it('resigning ends the match', () => {
    const { seats: [a, b] } = table({ mode: 'salvo' });
    b.moves.resign();
    expect(a.getState()!.ctx.gameover).toEqual({ winner: '0' });
  });
});

describe('Fleet game: hidden information over the wire', () => {
  for (const mode of ['classic', 'salvo', 'super'] as const) {
    it(`${mode}: random legal play never leaks, also after reconnects and to a spectator`, () => {
      const { seats, make } = table({ mode });
      let [a, b] = seats;
      const rnd = prng(mode.length * 101);
      const loA = mode === 'super' ? (['seaMine', 'cherry', 'frag'] as const) : [];
      const loB = mode === 'super' ? (SECRET as ('shield' | 'decoy' | 'reinforcement')[]) : [];
      a.moves.deploy(randomDeployment(mode, [...loA], rnd));
      assertNoLeak(b);
      b.moves.deploy(randomDeployment(mode, [...loB], rnd));
      let spectator = make(null);
      for (let turn = 0; turn < 400 && !a.getState()!.ctx.gameover; turn++) {
        const cur = a.getState()!.ctx.currentPlayer === '0' ? a : b;
        play(cur, randomAction(cur, rnd));
        if (turn % 7 === 0) {
          for (const c of [a, b, spectator]) assertNoLeak(c);
          b.stop(); b = make('1');
          spectator.stop(); spectator = make(null);
          assertNoLeak(b);
          assertNoLeak(spectator);
        }
      }
      expect(a.getState()!.ctx.gameover).toBeDefined();
      expect(view(spectator).revealed).toBe(true);
    });
  }
});
