import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { FrontlineGame, randomPlacement, type FrontlineState, type FrontlineView } from '../src/frontline';
import { prng } from './frontlineHelpers';

const table = (setupData?: unknown) => {
  const game = { ...FrontlineGame, seed: 'b', setup: (ctx: Parameters<NonNullable<typeof FrontlineGame.setup>>[0]) => FrontlineGame.setup!(ctx, setupData) };
  const multiplayer = Local();
  const mk = (id: string) => { const c = Client<FrontlineState>({ game, numPlayers: 2, multiplayer, playerID: id }); c.start(); return c; };
  return [mk('0'), mk('1')] as const;
};
const G = (c: ReturnType<typeof table>[0]) => c.getState()!.G as unknown as FrontlineView;

describe('Frontline briefing (pre-game settings)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a match starts in the briefing with an empty board and no setup moves', () => {
    const [a, b] = table();
    expect(a.getState()!.ctx.phase).toBe('briefing');
    expect(G(a).pieces).toEqual([]);
    a.moves.submitSetup(randomPlacement('0', prng(1)));
    b.moves.submitSetup(randomPlacement('1', prng(2)));
    expect(G(a).pieces).toEqual([]);
    expect(a.getState()!.ctx.phase).toBe('briefing');
  });

  it('only seat 0 changes the turn limit, to a valid value', () => {
    const [a, b] = table({ turnSeconds: 30 });
    expect(G(a).turnSeconds).toBe(30);
    a.moves.setTurnLimit(120);
    expect(G(b).turnSeconds).toBe(120);
    a.moves.setTurnLimit(0);
    expect(G(a).turnSeconds).toBeNull();
    a.moves.setTurnLimit(5);
    a.moves.setTurnLimit('x');
    expect(G(a).turnSeconds).toBeNull();
    b.moves.setTurnLimit(60);
    expect(G(a).turnSeconds).toBeNull();
  });

  it('only seat 0 begins; then the armies are set up and play starts with a game clock', () => {
    const now = 5_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const [a, b] = table();
    b.moves.begin();
    expect(a.getState()!.ctx.phase).toBe('briefing');
    a.moves.begin();
    expect(b.getState()!.ctx.phase).toBe('setup');
    a.moves.setTurnLimit(60);
    expect(G(a).turnSeconds).toBeNull();
    expect(G(a).startedAt).toBeNull();
    a.moves.submitSetup(randomPlacement('0', prng(1)));
    b.moves.submitSetup(randomPlacement('1', prng(2)));
    expect(a.getState()!.ctx.phase).toBe('play');
    expect(G(a).startedAt).toBe(now);
  });
});
