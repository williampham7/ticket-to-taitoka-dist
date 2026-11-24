import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import {
  FrontlineGame, applyMove, botPlacement, chooseBotMove, emptyState, legalMoves, other, outcome, placeArmy,
  pos, randomPlacement, validatePlacement, validateFrontlineSetupData, viewFor,
  type FrontlineState, type FrontlineView, type PlayerID,
} from '../src/frontline';
import { begin, board, prng } from './frontlineHelpers';

describe('fallen pieces', () => {
  it('every piece removed in combat is listed with its owner and rank (public: combat reveals both)', () => {
    const S = board([['0', 7, 5, 0], ['1', 7, 4, 0], ['0', 9, 5, 1], ['1', 'B', 4, 1], ['1', 'F', 0, 9], ['0', 'F', 9, 9]]);
    applyMove(S, '0', { from: pos(5, 0), to: pos(4, 0) });
    applyMove(S, '0', { from: pos(5, 1), to: pos(4, 1) });
    expect(S.fallen).toEqual([{ owner: '0', rank: 7 }, { owner: '1', rank: 7 }, { owner: '0', rank: 9 }]);
  });
});

describe('more-squares (chase) rule, simplified', () => {
  // C (player 0) chases R (player 1) around two squares; extra pieces give both sides other moves
  const chase = () => {
    const S = board([['0', 5, 3, 1], ['1', 4, 0, 1], ['0', 6, 9, 0], ['0', 'F', 9, 9], ['1', 6, 0, 5], ['1', 'F', 0, 9]]);
    applyMove(S, '1', { from: pos(0, 1), to: pos(1, 1) });
    applyMove(S, '0', { from: pos(3, 1), to: pos(2, 1) }); // chase starts: C next to R
    applyMove(S, '1', { from: pos(1, 1), to: pos(1, 2) }); // R flees
    applyMove(S, '0', { from: pos(2, 1), to: pos(2, 2) }); // C follows
    applyMove(S, '1', { from: pos(1, 2), to: pos(1, 1) }); // R flees back
    return S;
  };
  const allows = (S: FrontlineState, p: PlayerID, from: number, to: number) => legalMoves(S, p).some((m) => m.from === from && m.to === to);

  it('the chaser may not repeat a position already seen in the chase', () => {
    const S = chase();
    expect(S.chase?.chaser).toBe('0');
    expect(allows(S, '0', pos(2, 2), pos(2, 1))).toBe(false);
    expect(allows(S, '0', pos(2, 2), pos(3, 2))).toBe(true);
    expect(() => applyMove(S, '0', { from: pos(2, 2), to: pos(2, 1) })).toThrow();
  });
  it('ends when the chaser moves something else', () => {
    const S = chase();
    applyMove(S, '0', { from: pos(9, 0), to: pos(8, 0) });
    expect(S.chase).toBeNull();
  });
  it('ends when the chased player does not flee with the chased piece', () => {
    const S = board([['0', 5, 3, 1], ['1', 4, 0, 1], ['0', 6, 9, 0], ['0', 'F', 9, 9], ['1', 6, 0, 5], ['1', 'F', 0, 9]]);
    applyMove(S, '1', { from: pos(0, 1), to: pos(1, 1) });
    applyMove(S, '0', { from: pos(3, 1), to: pos(2, 1) });
    applyMove(S, '1', { from: pos(0, 5), to: pos(0, 4) });
    expect(S.chase).toBeNull();
  });
});

describe('turn timer', () => {
  afterEach(() => vi.restoreAllMocks());
  const start = () => {
    const game = { ...FrontlineGame, seed: 't' };
    const multiplayer = Local();
    const mk = (id: string) => { const c = Client<FrontlineState>({ game, numPlayers: 2, multiplayer, playerID: id }); c.start(); return begin(c); };
    return { mk };
  };

  it('validates setup data', () => {
    expect(validateFrontlineSetupData(undefined)).toBeUndefined();
    expect(validateFrontlineSetupData({ turnSeconds: 60 })).toBeUndefined();
    expect(validateFrontlineSetupData({ turnSeconds: 0 })).toBeUndefined();
    expect(validateFrontlineSetupData({ turnSeconds: 5 })).toBeTruthy();
    expect(validateFrontlineSetupData({ turnSeconds: 'x' })).toBeTruthy();
    expect(validateFrontlineSetupData([])).toBeTruthy();
  });

  it('the waiting player wins by claiming a timeout only after the limit has passed', () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const game = { ...FrontlineGame, seed: 't', setup: (ctx: Parameters<NonNullable<typeof FrontlineGame.setup>>[0]) => FrontlineGame.setup!(ctx, { turnSeconds: 30 }) };
    const multiplayer = Local();
    const mk = (id: string) => { const c = Client<FrontlineState>({ game, numPlayers: 2, multiplayer, playerID: id }); c.start(); return begin(c); };
    const a = mk('0'), b = mk('1');
    a.moves.submitSetup(randomPlacement('0', prng(1)));
    b.moves.submitSetup(randomPlacement('1', prng(2)));
    const G = a.getState()!.G as unknown as FrontlineView;
    expect(G.turnSeconds).toBe(30);
    expect(G.turnStartedAt).toBe(now);
    const waiting = a.getState()!.ctx.currentPlayer === '0' ? b : a;
    now += 29_000;
    waiting.moves.claimTimeout();
    expect(a.getState()!.ctx.gameover).toBeUndefined();
    now += 2_000;
    waiting.moves.claimTimeout();
    expect(a.getState()!.ctx.gameover).toEqual({ winner: waiting.playerID });
    expect((a.getState()!.G as unknown as FrontlineView).result?.reason).toBe('timeout');
  });

  it('without a limit a timeout can never be claimed', () => {
    const { mk } = start();
    const a = mk('0'), b = mk('1');
    a.moves.submitSetup(randomPlacement('0', prng(1)));
    b.moves.submitSetup(randomPlacement('1', prng(2)));
    const waiting = a.getState()!.ctx.currentPlayer === '0' ? b : a;
    vi.spyOn(Date, 'now').mockImplementation(() => 9e15);
    waiting.moves.claimTimeout();
    expect(a.getState()!.ctx.gameover).toBeUndefined();
  });
});

describe('bot', () => {
  it('sets up a legal army with the command post on the back row', () => {
    for (let s = 1; s <= 20; s++) for (const p of ['0', '1'] as PlayerID[]) {
      const pl = botPlacement(p, prng(s));
      expect(validatePlacement(p, pl)).toBeUndefined();
      const flag = pl.find((x) => x.rank === 'F')!.pos;
      expect(p === '0' ? flag >= 90 : flag < 10).toBe(true);
    }
  });

  it('takes a known weaker piece and avoids attacking a known stronger one', () => {
    const S = board([['0', 6, 5, 0], ['1', 4, 4, 0], ['0', 6, 5, 4], ['1', 9, 4, 4], ['0', 'F', 9, 9], ['1', 'F', 0, 9]]);
    S.pieces.forEach((p) => { if (p.owner === '1') p.revealed = true; });
    const v = viewFor(S, 'play', '0');
    for (let s = 1; s <= 10; s++) expect(chooseBotMove(v, '0', prng(s))).toEqual({ from: pos(5, 0), to: pos(4, 0) });
    const W = board([['0', 6, 5, 4], ['1', 9, 4, 4], ['0', 'F', 9, 9], ['1', 'F', 0, 9]]);
    W.pieces.forEach((p) => { if (p.owner === '1') p.revealed = true; });
    for (let s = 1; s <= 10; s++) expect(chooseBotMove(viewFor(W, 'play', '0'), '0', prng(s))).not.toEqual({ from: pos(5, 4), to: pos(4, 4) });
  });

  it('only ever reads its own view and always returns a legal move; beats a random mover most of the time', () => {
    let botWins = 0;
    const GAMES = 60;
    for (let g = 1; g <= GAMES; g++) {
      const rnd = prng(g * 31);
      const bot: PlayerID = g % 2 ? '0' : '1';
      const S = emptyState();
      S.first = rnd() < 0.5 ? '0' : '1';
      placeArmy(S, bot, botPlacement(bot, rnd));
      placeArmy(S, other(bot), randomPlacement(other(bot), rnd));
      S.result = outcome(S, other(S.first));
      let turn = S.first;
      while (!S.result && S.moves < 20_000) {
        const ms = legalMoves(S, turn);
        const m = turn === bot ? chooseBotMove(viewFor(S, 'play', bot), bot, rnd) : ms[Math.floor(rnd() * ms.length)];
        expect(ms).toContainEqual(m);
        applyMove(S, turn, m);
        S.result = outcome(S, turn);
        turn = other(turn);
      }
      if (S.result?.winner === bot) botWins++;
    }
    expect(botWins).toBeGreaterThanOrEqual(GAMES * 0.75);
  });
});
