import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import {
  ARMIES, FrontlineGame, SPOTTER, applyMove, applySpot, placeArmy, boardRows, isLake, onBoard, zoneSquares, armySize, botPlacement, chooseBotAction, emptyState, hasLegalMove, inZone,
  isLegalSpot, legalMoves, outcome, pos, randomPlacement, resolveCombat, spotGuesses, spotTargets, validatePlacement,
  viewFor, type FrontlineState, type FrontlineView, type PlayerID,
} from '../src/frontline';
import { begin, board, prng } from './frontlineHelpers';

const spotterBoard = (pieces: Parameters<typeof board>[0]): FrontlineState => ({ ...board(pieces), army: 'spotter' });

describe('Spotter army: roster and setup', () => {
  it('has 30 pieces in the published counts; the classic army is unchanged', () => {
    expect(armySize('spotter')).toBe(30);
    expect(armySize('classic')).toBe(40);
    const n = (r: unknown) => ARMIES.spotter.kinds.find((k) => k.rank === r)?.count;
    expect([n(10), n(9), n(8), n(7), n(6), n(5), n(4), n(3), n(2), n(SPOTTER), n(1), n('B'), n('F')])
      .toEqual([1, 1, 2, 2, 3, 3, 3, 4, 4, 2, 1, 3, 1]);
    expect(ARMIES.classic.kinds.some((k) => k.rank === SPOTTER)).toBe(false);
  });

  it('plays on an 8-row board: three setup rows each, right up to the lakes in the middle two rows', () => {
    expect(ARMIES.spotter.rows).toBe(3);
    expect(boardRows('spotter')).toBe(8);
    expect(boardRows('classic')).toBe(10);
    expect(inZone('0', pos(5, 0), 3, 8)).toBe(true);
    expect(inZone('0', pos(7, 9), 3, 8)).toBe(true);
    expect(inZone('0', pos(4, 0), 3, 8)).toBe(false);
    expect(inZone('0', pos(8, 0), 3, 8)).toBe(false); // off the board
    expect(inZone('1', pos(2, 9), 3, 8)).toBe(true);
    expect(inZone('1', pos(3, 9), 3, 8)).toBe(false);
    // lakes: rows 3-4, columns 2-3 and 6-7 (the classic board keeps rows 4-5)
    expect([pos(3, 2), pos(3, 3), pos(4, 6), pos(4, 7)].every((p) => isLake(p, 8))).toBe(true);
    expect([pos(3, 0), pos(4, 4), pos(5, 2), pos(2, 3)].some((p) => isLake(p, 8))).toBe(false);
    expect(isLake(pos(4, 2))).toBe(true);
    expect(isLake(pos(3, 2))).toBe(false);
    expect(onBoard(7, 9, 8)).toBe(true);
    expect(onBoard(8, 0, 8)).toBe(false);
    expect(zoneSquares('0', 3, 8)).toEqual(Array.from({ length: 30 }, (_, i) => 50 + i));
    expect(zoneSquares('1', 3, 8)).toEqual(Array.from({ length: 30 }, (_, i) => i));
  });

  it('scouts stop at the edge of the 8-row board and at its lakes', () => {
    const S = spotterBoard([['0', 2, 7, 0], ['0', 2, 5, 3], ['1', 'F', 0, 9], ['0', 'F', 7, 9]]);
    const runs = (from: number) => legalMoves(S, '0').filter((m) => m.from === from).map((m) => m.to).sort((a, b) => a - b);
    expect(runs(pos(7, 0))).toEqual([pos(0, 0), pos(1, 0), pos(2, 0), pos(3, 0), pos(4, 0), pos(5, 0), pos(6, 0), pos(7, 1), pos(7, 2), pos(7, 3), pos(7, 4), pos(7, 5), pos(7, 6), pos(7, 7), pos(7, 8)]);
    expect(runs(pos(5, 3))).not.toContain(pos(4, 3)); // lake straight ahead
  });

  it('random and bot placements are valid for the army they are made for, and only for it', () => {
    for (const p of ['0', '1'] as PlayerID[]) {
      const pl = randomPlacement(p, prng(5), 'spotter');
      expect(pl).toHaveLength(30);
      expect(validatePlacement(p, pl, 'spotter')).toBeUndefined();
      expect(validatePlacement(p, pl, 'classic')).toBeDefined();
      expect(validatePlacement(p, botPlacement(p, prng(9), 'spotter'), 'spotter')).toBeUndefined();
      expect(validatePlacement(p, randomPlacement(p, prng(5)), 'spotter')).toBeDefined();
    }
  });

  it('rejects a Spotter in a classic setup', () => {
    const pl = randomPlacement('0', prng(3));
    pl[0] = { ...pl[0], rank: SPOTTER };
    expect(validatePlacement('0', pl, 'classic')).toBeDefined();
  });
});

describe('Spotter in combat', () => {
  it('beats the Operative both ways, loses to a Scout, trades with a Spotter', () => {
    expect(resolveCombat(SPOTTER, 1)).toBe('attacker');
    expect(resolveCombat(1, SPOTTER)).toBe('defender');
    expect(resolveCombat(SPOTTER, 2)).toBe('defender');
    expect(resolveCombat(2, SPOTTER)).toBe('attacker');
    expect(resolveCombat(SPOTTER, SPOTTER)).toBe('both');
    expect(resolveCombat(SPOTTER, 'B')).toBe('defender');
    expect(resolveCombat(1, 10)).toBe('attacker');
  });

  it('moves one square', () => {
    const S = spotterBoard([['0', SPOTTER, 6, 0], ['1', 'F', 0, 9], ['0', 'F', 7, 9]]);
    expect(legalMoves(S, '0').filter((m) => m.from === pos(6, 0)).map((m) => m.to).sort()).toEqual([pos(5, 0), pos(6, 1), pos(7, 0)].sort());
  });
});

describe('Spotting', () => {
  const setup = () => spotterBoard([
    ['0', SPOTTER, 6, 0], ['1', 10, 5, 0], ['1', 'B', 6, 1], ['1', 4, 7, 1],
    ['0', 'F', 7, 9], ['1', 'F', 0, 9], ['0', 3, 7, 0],
  ]);

  it('targets only orthogonally adjacent enemy pieces, from a Spotter', () => {
    const S = setup();
    expect(spotTargets(S, '0').map((t) => t.at).sort()).toEqual([pos(5, 0), pos(6, 1)].sort());
    expect(spotTargets(S, '0').every((t) => t.from === pos(6, 0))).toBe(true);
    expect(spotTargets(S, '1')).toEqual([]);
    expect(isLegalSpot(S, '0', { from: pos(6, 0), at: pos(7, 1), guess: 4 })).toBe(false); // diagonal
    expect(isLegalSpot(S, '0', { from: pos(7, 0), at: pos(5, 0), guess: 10 })).toBe(false); // not a spotter
    expect(isLegalSpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 'X' as never })).toBe(false);
  });

  it('a correct guess removes the target; the Spotter stays put and is revealed', () => {
    const S = setup();
    const r = applySpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 10 });
    expect(r.hit).toBe(true);
    expect(S.pieces.some((p) => p.pos === pos(5, 0))).toBe(false);
    const sp = S.pieces.find((p) => p.pos === pos(6, 0))!;
    expect(sp.rank).toBe(SPOTTER);
    expect(sp.revealed).toBe(true);
    expect(S.fallen).toEqual([{ owner: '1', rank: 10 }]);
    expect(S.lastSpot).toMatchObject({ player: '0', from: pos(6, 0), at: pos(5, 0), guess: 10, hit: true });
    expect(S.lastMove).toBeNull();
    expect(S.lastCombat).toBeNull();
    expect(S.moves).toBe(1);
  });

  it('works on a mine', () => {
    const S = setup();
    expect(applySpot(S, '0', { from: pos(6, 0), at: pos(6, 1), guess: 'B' }).hit).toBe(true);
    expect(S.pieces.some((p) => p.pos === pos(6, 1))).toBe(false);
  });

  it('a wrong guess leaves the target hidden, reveals the Spotter and rules that guess out', () => {
    const S = setup();
    const r = applySpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 9 });
    expect(r.hit).toBe(false);
    const t = S.pieces.find((p) => p.pos === pos(5, 0))!;
    expect(t.revealed).toBe(false);
    expect(S.pieces.find((p) => p.pos === pos(6, 0))!.revealed).toBe(true);
    expect(S.fallen).toEqual([]);
    expect(S.ruledOut[t.id]).toEqual([9]);
    expect(spotGuesses(S, pos(5, 0))).not.toContain(9);
    expect(spotGuesses(S, pos(5, 0))).toContain(10);
    expect(isLegalSpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 9 })).toBe(false);
    // the record of a miss never says what the target really is
    expect(JSON.stringify(S.lastSpot)).not.toContain('"rank":10');
  });

  it('spotting the command post wins', () => {
    const S = spotterBoard([['0', SPOTTER, 1, 9], ['1', 'F', 0, 9], ['1', 3, 0, 0], ['0', 'F', 7, 9], ['0', 4, 7, 0]]);
    applySpot(S, '0', { from: pos(1, 9), at: pos(0, 9), guess: 'F' });
    expect(outcome(S, '0')).toEqual({ winner: '0', reason: 'flag' });
  });

  it('only guesses ranks of the army in play', () => {
    const S = setup();
    expect(spotGuesses(S, pos(5, 0)).sort()).toEqual(ARMIES.spotter.kinds.map((k) => k.rank).sort());
  });

  it('breaks the two-square streak and any chase', () => {
    const S = setup();
    S.streak['0'] = { id: 'x', a: 1, b: 2, n: 3 };
    S.chase = { chaser: '0', target: 'y', seen: ['k'] };
    applySpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 9 });
    expect(S.streak['0']).toBeNull();
    expect(S.chase).toBeNull();
  });

  it('a move clears the last spot', () => {
    const S = setup();
    applySpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 9 });
    expect(S.lastSpot).not.toBeNull();
    const m = legalMoves(S, '1')[0];
    applyMove(S, '1', m);
    expect(S.lastSpot).toBeNull();
  });

  it('a Spotter that can only spot still has a move', () => {
    // the spotter is boxed in by the board corner and enemy mines: no step is legal, but it can spot
    const S = spotterBoard([['0', SPOTTER, 7, 0], ['1', 'B', 6, 0], ['1', 'B', 7, 1], ['0', 'F', 7, 9], ['1', 'F', 0, 9], ['0', 'B', 6, 9], ['0', 'B', 7, 8]]);
    expect(legalMoves(S, '0').filter((m) => m.from === pos(7, 0))).toHaveLength(2); // attacks are moves
    const T = spotterBoard([['0', SPOTTER, 7, 0], ['0', 'B', 6, 0], ['1', 'B', 7, 1], ['0', 'F', 7, 9], ['1', 'F', 0, 9], ['0', 'B', 6, 9], ['0', 'B', 7, 8]]);
    T.ruledOut = {};
    expect(hasLegalMove(T, '0')).toBe(true);
    // every guess used up on the only target: nothing left
    T.ruledOut[T.pieces.find((p) => p.pos === pos(7, 1))!.id] = ARMIES.spotter.kinds.map((k) => k.rank);
    expect(spotTargets(T, '0')).toEqual([]);
  });

  it('views carry the ruled-out guesses but never the rank of a missed target', () => {
    const S = setup();
    applySpot(S, '0', { from: pos(6, 0), at: pos(5, 0), guess: 9 });
    const v = viewFor(S, 'play', '0');
    const t = v.pieces.find((p) => p.pos === pos(5, 0))!;
    expect('rank' in t).toBe(false);
    expect(v.ruledOut[t.id]).toEqual([9]);
    expect(viewFor(S, 'play', '1').pieces.find((p) => p.pos === pos(6, 0))!.rank).toBe(SPOTTER);
  });
});

describe('Spotter army through boardgame.io', () => {
  type C = ReturnType<typeof Client<FrontlineState>>;
  const view = (c: C) => c.getState()!.G as unknown as FrontlineView;
  function table(setupData?: unknown) {
    const game = { ...FrontlineGame, setup: (ctx: Parameters<NonNullable<typeof FrontlineGame.setup>>[0]) => FrontlineGame.setup!(ctx, setupData) };
    const multiplayer = Local();
    const make = (id: PlayerID) => { const c = Client<FrontlineState>({ game, numPlayers: 2, multiplayer, playerID: id }); c.start(); return c; };
    return [make('0'), make('1')] as const;
  }

  it('setupData picks the army; a bad army is refused', () => {
    expect(FrontlineGame.validateSetupData!({ army: 'spotter' }, 2)).toBeUndefined();
    expect(FrontlineGame.validateSetupData!({ army: 'duel' }, 2)).toBeDefined();
    const [a] = table({ army: 'spotter' });
    expect(view(a).army).toBe('spotter');
    const [b] = table();
    expect(view(b).army).toBe('classic');
  });

  it('only the host switches the army, and only in the briefing', () => {
    const [h, j] = table();
    j.moves.setArmy('spotter');
    expect(view(h).army).toBe('classic');
    h.moves.setArmy('nope');
    expect(view(h).army).toBe('classic');
    h.moves.setArmy('spotter');
    expect(view(j).army).toBe('spotter');
    begin(h);
    h.moves.setArmy('classic');
    expect(view(h).army).toBe('spotter');
  });

  it('plays a spot through the server: a 40-piece setup is refused, a 30-piece one goes in, a spot reaches both views', () => {
    // bots play until somebody spots; a game can end before that, so a few matches are tried
    let spotted: [C, C] | null = null;
    for (let seed = 1; seed <= 20 && !spotted; seed++) {
      const [h, j] = table({ army: 'spotter' });
      begin(h);
      h.moves.submitSetup(randomPlacement('0', prng(seed)));
      expect(view(h).ready['0']).toBe(false);
      h.moves.submitSetup(randomPlacement('0', prng(seed), 'spotter'));
      j.moves.submitSetup(randomPlacement('1', prng(seed + 100), 'spotter'));
      expect(h.getState()!.ctx.phase).toBe('play');
      expect(view(h).pieces.filter((p) => p.owner === '0')).toHaveLength(30);
      const rnd = prng(seed * 77);
      for (let i = 0; i < 3000 && !view(h).result && !spotted; i++) {
        const cur = h.getState()!.ctx.currentPlayer as PlayerID;
        const c = [h, j][Number(cur)];
        const a = chooseBotAction(view(c), cur, rnd);
        const before = view(c).moves;
        if (a.kind === 'spot') c.moves.spot(a.from, a.at, a.guess); else c.moves.move(a.from, a.to);
        expect(view(c).moves).toBe(before + 1); // the server took it
        if (a.kind === 'spot') spotted = [h, j];
      }
    }
    expect(spotted).not.toBeNull();
    const [h, j] = spotted!;
    expect(view(h).lastSpot).not.toBeNull();
    expect(view(j).lastSpot).toEqual(view(h).lastSpot);
  });

  it('refuses an illegal spot', () => {
    const [h, j] = table({ army: 'spotter' });
    begin(h);
    h.moves.submitSetup(randomPlacement('0', prng(1), 'spotter'));
    j.moves.submitSetup(randomPlacement('1', prng(2), 'spotter'));
    const cur = h.getState()!.ctx.currentPlayer;
    const c = [h, j][Number(cur)];
    const before = view(c).moves;
    c.moves.spot(0, 1, 10);
    expect(view(c).moves).toBe(before);
  });
});

describe('Spotter bot', () => {
  it('takes a sure kill: names a revealed piece next to its Spotter', () => {
    const S = spotterBoard([['0', SPOTTER, 6, 0], ['1', 10, 5, 0], ['0', 'F', 7, 9], ['1', 'F', 0, 9], ['0', 2, 7, 0]]);
    S.pieces.find((p) => p.pos === pos(5, 0))!.revealed = true;
    const a = chooseBotAction(viewFor(S, 'play', '0'), '0', prng(1));
    expect(a).toEqual({ kind: 'spot', from: pos(6, 0), at: pos(5, 0), guess: 10 });
  });

  it('always picks a legal action in random spotter positions', () => {
    for (let g = 0; g < 40; g++) {
      const rnd = prng(100 + g);
      const S: FrontlineState = { ...emptyState(), army: 'spotter' };
      placeArmy(S, '0', randomPlacement('0', rnd, 'spotter'));
      placeArmy(S, '1', randomPlacement('1', rnd, 'spotter'));
      S.ready = { 0: true, 1: true };
      for (const me of ['0', '1'] as PlayerID[]) {
        const a = chooseBotAction(viewFor(S, 'play', me), me, rnd);
        if (a.kind === 'spot') expect(isLegalSpot(S, me, a)).toBe(true);
        else expect(legalMoves(S, me).some((m) => m.from === a.from && m.to === a.to)).toBe(true);
      }
    }
  });
});
