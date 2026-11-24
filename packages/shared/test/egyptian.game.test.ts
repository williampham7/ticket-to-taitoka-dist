import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import { EgyptianGame, matchSlap, QUICK_TIMING, validateEgyptianSetupData, type EgwState, type EgwView } from '../src/egyptian';
import { prng } from './frontlineHelpers';

type C = ReturnType<typeof Client<EgwState>>;
const view = (c: C) => c.getState()!.G as unknown as EgwView;

function table(n: number, setupData: unknown, seed = 'egw') {
  const base: Game<EgwState> = { ...EgyptianGame, seed };
  const game = { ...base, setup: (ctx: Parameters<NonNullable<Game<EgwState>['setup']>>[0]) => base.setup!(ctx, setupData) };
  const multiplayer = Local();
  const make = (id: string | null) => {
    const c = Client<EgwState>({ game, numPlayers: n, multiplayer, playerID: id ?? undefined });
    c.start();
    return c;
  };
  return { seats: Array.from({ length: n }, (_, i) => make(String(i))), make };
}

let now = 1_000_000;
const advance = (ms: number) => { now += ms; vi.setSystemTime(now); };
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(now); });
afterEach(() => vi.useRealTimers());

function assertNoLeak(c: C) {
  const state = c.getState()!;
  const all = JSON.parse(JSON.stringify({ G: state.G, ctx: state.ctx, plugins: state.plugins, log: (state as { log?: unknown }).log }));
  const walk = (x: unknown, path: string) => {
    if (Array.isArray(x)) { x.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (!x || typeof x !== 'object') return;
    const o = x as Record<string, unknown>;
    for (const k of ['stacks', 'burned']) expect(k in o, `${k} at ${path}`).toBe(false);
    if (o.kind === 'falseSlap') expect('card' in o, 'a burned card in the log').toBe(false);
    for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`);
  };
  walk(all, 'state');
  expect((state.plugins as Record<string, { data?: unknown }>).random?.data, 'random seed reached a client').toBeUndefined();
  const v = view(c);
  if (v.players.length) expect(Object.values(v.counts).reduce((a, b) => a + b, 0) + v.pile.length + v.burnedCount).toBe(52);
}

describe('Egyptian War game: setup data', () => {
  it('validates', () => {
    expect(validateEgyptianSetupData(undefined)).toBeUndefined();
    expect(validateEgyptianSetupData({ rules: ['tens'] })).toBeUndefined();
    expect(validateEgyptianSetupData({ waiting: true })).toBeUndefined();
    expect(validateEgyptianSetupData({ quick: true })).toBeUndefined();
    expect(validateEgyptianSetupData({ rules: [] })).toBeDefined();
    expect(validateEgyptianSetupData({ rules: ['x'] })).toBeDefined();
    expect(validateEgyptianSetupData([])).toBeDefined();
    expect(validateEgyptianSetupData({ quick: 'yes' })).toBeDefined();
  });

  it('every move is server-only and accepts a stale state id', () => {
    for (const [name, m] of Object.entries(EgyptianGame.moves!)) {
      expect(m, name).toMatchObject({ client: false, ignoreStaleStateID: true });
    }
  });

  it('a waiting room deals nothing and accepts no move', () => {
    const { seats: [a] } = table(5, { waiting: true });
    expect(view(a).stage).toBe('waiting');
    a.moves.ready();
    a.moves.flip();
    expect(view(a).stage).toBe('waiting');
    expect(view(a).seq).toBe(0);
  });
});

describe('Egyptian War game: flow and hidden information', () => {
  it('ready, deal, play; only the turn player flips', () => {
    const { seats } = table(3, { quick: true, rules: ['double', 'slapjack'] });
    seats.forEach((s) => s.moves.ready());
    expect(view(seats[0]).stage).toBe('dealing');
    seats[0].moves.tick();
    expect(view(seats[0]).stage).toBe('dealing');
    advance(QUICK_TIMING.dealMs);
    seats[1].moves.tick();
    const v = view(seats[0]);
    expect(v.stage).toBe('play');
    expect(v.rules).toEqual(['double', 'slapjack']);
    const other = seats.find((s) => s.playerID !== v.turn)!;
    other.moves.flip();
    expect(view(seats[0]).pile.length).toBe(0);
    seats[Number(v.turn)].moves.flip();
    expect(view(seats[0]).pile.length).toBe(1);
    expect(view(seats[2]).clock).toBe(now);
  });

  it('never leaks a stack or a burned card, to any seat, a spectator or a reconnecting client', () => {
    const { seats, make } = table(3, { quick: true, rules: ['double', 'sandwich', 'lucky7'] }, 'leak');
    const watcher = make(null);
    const rnd = prng(7);
    seats.forEach((s) => s.moves.ready());
    advance(QUICK_TIMING.dealMs);
    seats[0].moves.tick();
    let rejoined: C | null = null;
    for (let step = 0; step < 400 && !view(seats[0]).result; step++) {
      advance(50 + Math.floor(rnd() * 500));
      const v = view(seats[0]);
      seats[0].moves.tick();
      const r = rnd();
      if (r < 0.6 && v.turn !== null) seats[Number(v.turn)].moves.flip();
      else if (r < 0.8 && matchSlap(v.pile, v.rules).length) seats[Math.floor(rnd() * 3)].moves.slap(v.round);
      else if (r < 0.85) seats[Math.floor(rnd() * 3)].moves.slap(v.round);
      if (step === 150) rejoined = make('1');
      for (const c of [...seats, watcher, ...(rejoined ? [rejoined] : [])]) assertNoLeak(c);
    }
    expect(view(seats[0]).log.some((e) => e.kind === 'falseSlap')).toBe(true);
    expect(view(seats[0]).log.some((e) => e.kind === 'collect')).toBe(true);
  });
});
