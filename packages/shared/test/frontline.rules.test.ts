import { describe, expect, it } from 'vitest';
import {
  ARMY, ARMY_SIZE, SIZE, applyMove, isLake, legalMoves, outcome, pos, randomPlacement, resolveCombat,
  validatePlacement, type FrontlineState, type PlayerID, type Rank,
} from '../src/frontline';
import { board } from './frontlineHelpers';

const at = (S: FrontlineState, r: number, c: number) => S.pieces.find((p) => p.pos === pos(r, c));
const dests = (S: FrontlineState, player: PlayerID, r: number, c: number) =>
  legalMoves(S, player).filter((m) => m.from === pos(r, c)).map((m) => m.to).sort((a, b) => a - b);

describe('army', () => {
  it('has 40 pieces with the classic counts', () => {
    const counts = Object.fromEntries(ARMY.map((k) => [k.rank, k.count]));
    expect(counts).toEqual({ F: 1, B: 6, 1: 1, 2: 8, 3: 5, 4: 4, 5: 4, 6: 4, 7: 3, 8: 2, 9: 1, 10: 1 });
    expect(ARMY.reduce((n, k) => n + k.count, 0)).toBe(ARMY_SIZE);
    expect(ARMY_SIZE).toBe(40);
  });
  it('only the command post and mines are immobile, and every kind has a 3-letter code', () => {
    expect(ARMY.filter((k) => !k.movable).map((k) => k.rank).sort()).toEqual(['B', 'F']);
    for (const k of ARMY) expect(k.code).toMatch(/^[A-Z]{3}$/);
  });
});

describe('board', () => {
  it('has lakes at rows 4-5, columns 2-3 and 6-7', () => {
    const lakes: number[] = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (isLake(pos(r, c))) lakes.push(pos(r, c));
    expect(lakes).toEqual([42, 43, 46, 47, 52, 53, 56, 57]);
  });
});

describe('combat', () => {
  const cases: [Rank, Rank, 'attacker' | 'defender' | 'both'][] = [
    [5, 4, 'attacker'], [4, 5, 'defender'], [10, 9, 'attacker'], [2, 9, 'defender'],
    [7, 7, 'both'], [1, 1, 'both'], [10, 10, 'both'],
    [1, 10, 'attacker'],   // Operative attacking the Marshal wins
    [10, 1, 'attacker'],   // Marshal attacking the Operative wins by rank
    [1, 2, 'defender'], [2, 1, 'attacker'], [1, 9, 'defender'],
    [3, 'B', 'attacker'],  // Engineer clears a mine
    [10, 'B', 'defender'], [2, 'B', 'defender'], [1, 'B', 'defender'],
    [1, 'F', 'attacker'], [2, 'F', 'attacker'], [10, 'F', 'attacker'],
  ];
  it.each(cases)('%s attacking %s: %s wins', (a, d, w) => {
    expect(resolveCombat(a, d)).toBe(w);
  });
  it('covers every movable-vs-any pair consistently with rank order', () => {
    const movable: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (const a of movable) for (const d of movable) {
      const want = a === 1 && d === 10 ? 'attacker' : a === d ? 'both' : (a as number) > (d as number) ? 'attacker' : 'defender';
      expect(resolveCombat(a, d)).toBe(want);
    }
  });
});

describe('legal moves', () => {
  it('a piece steps one square orthogonally, not onto its own piece, a lake or off the board', () => {
    const S = board([['0', 5, 9, 0], ['0', 4, 8, 0], ['1', 'F', 0, 9]]);
    expect(dests(S, '0', 9, 0)).toEqual([pos(9, 1)]);
    const L = board([['0', 5, 5, 4], ['1', 'F', 0, 9]]);
    expect(dests(L, '0', 5, 4)).toEqual([pos(4, 4), pos(5, 5), pos(6, 4)]); // west is a lake
  });
  it('the command post and mines never move', () => {
    const S = board([['0', 'F', 7, 0], ['0', 'B', 7, 5], ['1', 'F', 0, 9]]);
    expect(legalMoves(S, '0')).toEqual([]);
  });
  it('a scout runs any distance over empty squares and may attack at the end of the line', () => {
    const S = board([['0', 2, 9, 0], ['1', 5, 3, 0], ['0', 4, 9, 3], ['1', 'F', 0, 9]]);
    // north: rows 8..4 empty, enemy at row 3 is attackable, nothing past it
    expect(dests(S, '0', 9, 0).filter((p) => p % SIZE === 0)).toEqual([pos(3, 0), pos(4, 0), pos(5, 0), pos(6, 0), pos(7, 0), pos(8, 0)]);
    // east: blocked by its own piece at column 3
    expect(dests(S, '0', 9, 0).filter((p) => Math.floor(p / SIZE) === 9)).toEqual([pos(9, 1), pos(9, 2)]);
  });
  it('a scout cannot cross a lake', () => {
    const S = board([['0', 2, 6, 2], ['1', 'F', 0, 9]]);
    expect(dests(S, '0', 6, 2)).toEqual([pos(6, 0), pos(6, 1), pos(6, 3), pos(6, 4), pos(6, 5), pos(6, 6), pos(6, 7), pos(6, 8), pos(6, 9), pos(7, 2), pos(8, 2), pos(9, 2)]);
  });
});

describe('moving and combat', () => {
  it('a scout moving more than one square is revealed; a one-square move is not', () => {
    const S = board([['0', 2, 9, 0], ['0', 2, 9, 9], ['1', 'F', 0, 5]]);
    applyMove(S, '0', { from: pos(9, 0), to: pos(6, 0) });
    expect(at(S, 6, 0)!.revealed).toBe(true);
    applyMove(S, '0', { from: pos(9, 9), to: pos(8, 9) });
    expect(at(S, 8, 9)!.revealed).toBe(false);
  });
  it('the winner moves in and stays revealed; the loser is removed; both ranks are reported', () => {
    const S = board([['0', 6, 5, 0], ['1', 4, 4, 0], ['1', 'F', 0, 9]]);
    const res = applyMove(S, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(res.combat).toMatchObject({ winner: 'attacker', attacker: { rank: 6, owner: '0' }, defender: { rank: 4, owner: '1' } });
    expect(at(S, 4, 0)).toMatchObject({ owner: '0', rank: 6, revealed: true });
    expect(S.pieces.filter((p) => p.owner === '1').length).toBe(1);
  });
  it('a defender that wins stays put and is revealed', () => {
    const S = board([['0', 3, 5, 0], ['1', 8, 4, 0], ['1', 'F', 0, 9]]);
    applyMove(S, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(at(S, 5, 0)).toBeUndefined();
    expect(at(S, 4, 0)).toMatchObject({ owner: '1', rank: 8, revealed: true });
  });
  it('equal ranks remove both pieces', () => {
    const S = board([['0', 7, 5, 0], ['1', 7, 4, 0], ['1', 'F', 0, 9], ['0', 'F', 9, 9]]);
    applyMove(S, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(at(S, 5, 0)).toBeUndefined();
    expect(at(S, 4, 0)).toBeUndefined();
  });
  it('the operative attacking the marshal wins; the marshal attacking the operative wins', () => {
    const A = board([['0', 1, 5, 0], ['1', 10, 4, 0], ['1', 'F', 0, 9]]);
    applyMove(A, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(at(A, 4, 0)).toMatchObject({ owner: '0', rank: 1 });
    const B = board([['0', 10, 5, 0], ['1', 1, 4, 0], ['1', 'F', 0, 9]]);
    applyMove(B, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(at(B, 4, 0)).toMatchObject({ owner: '0', rank: 10 });
  });
  it('a mine destroys an attacker and stays, revealed; an engineer clears it and moves in', () => {
    const S = board([['0', 9, 5, 0], ['1', 'B', 4, 0], ['1', 'F', 0, 9]]);
    applyMove(S, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(at(S, 5, 0)).toBeUndefined();
    expect(at(S, 4, 0)).toMatchObject({ owner: '1', rank: 'B', revealed: true });
    const E = board([['0', 3, 5, 0], ['1', 'B', 4, 0], ['1', 'F', 0, 9]]);
    applyMove(E, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(at(E, 4, 0)).toMatchObject({ owner: '0', rank: 3, revealed: true });
  });
  it('rejects an illegal move', () => {
    const S = board([['0', 5, 9, 0], ['1', 'F', 0, 9]]);
    expect(() => applyMove(S, '0', { from: pos(9, 0), to: pos(7, 0) })).toThrow();
  });
});

describe('end of game', () => {
  it('capturing the command post wins for the mover', () => {
    const S = board([['0', 2, 5, 0], ['1', 'F', 4, 0], ['1', 5, 0, 9], ['0', 'F', 9, 9]]);
    applyMove(S, '0', { from: pos(5, 0), to: pos(4, 0) });
    expect(outcome(S, '0')).toEqual({ winner: '0', reason: 'flag' });
  });
  it('the mover wins when the next player has no legal move', () => {
    const S = board([['0', 5, 5, 0], ['0', 'F', 9, 9], ['1', 'F', 0, 9], ['1', 'B', 0, 0]]);
    expect(outcome(S, '0')).toEqual({ winner: '0', reason: 'noMoves' });
  });
  it('a draw when neither player can move', () => {
    const S = board([['0', 'F', 9, 9], ['0', 'B', 9, 0], ['1', 'F', 0, 9], ['1', 'B', 0, 0]]);
    expect(outcome(S, '0')).toEqual({ winner: null, reason: 'draw' });
  });
  it('no result while both can move and both command posts stand', () => {
    const S = board([['0', 5, 9, 0], ['0', 'F', 9, 9], ['1', 'F', 0, 9], ['1', 5, 0, 0]]);
    expect(outcome(S, '0')).toBeNull();
  });
});

describe('two-square rule', () => {
  const shuttle = () => board([['0', 5, 9, 0], ['0', 6, 9, 5], ['0', 'F', 9, 9], ['1', 'F', 0, 9], ['1', 5, 0, 0]]);
  const A = pos(9, 0), B = pos(8, 0);
  it('allows three moves between the same two squares, not a fourth', () => {
    const S = shuttle();
    applyMove(S, '0', { from: A, to: B });
    applyMove(S, '0', { from: B, to: A });
    applyMove(S, '0', { from: A, to: B });
    expect(legalMoves(S, '0').some((m) => m.from === B && m.to === A)).toBe(false);
    expect(legalMoves(S, '0').some((m) => m.from === B && m.to === pos(7, 0))).toBe(true);
  });
  it('resets when the player moves another piece', () => {
    const S = shuttle();
    applyMove(S, '0', { from: A, to: B });
    applyMove(S, '0', { from: B, to: A });
    applyMove(S, '0', { from: A, to: B });
    applyMove(S, '0', { from: pos(9, 5), to: pos(8, 5) });
    expect(legalMoves(S, '0').some((m) => m.from === B && m.to === A)).toBe(true);
  });
  it('applies to a scout\'s exact squares', () => {
    const S = board([['0', 2, 9, 0], ['0', 'F', 9, 9], ['1', 'F', 0, 9], ['1', 5, 0, 5]]);
    const far = pos(6, 0);
    applyMove(S, '0', { from: A, to: far });
    applyMove(S, '0', { from: far, to: A });
    applyMove(S, '0', { from: A, to: far });
    const ms = legalMoves(S, '0');
    expect(ms.some((m) => m.from === far && m.to === A)).toBe(false);
    expect(ms.some((m) => m.from === far && m.to === pos(7, 0))).toBe(true);
  });
  it('yields when it would leave the player without a legal move', () => {
    // the only movable piece is boxed in a 1x2 corridor: it can only shuttle
    const S = board([['0', 5, 9, 0], ['0', 'B', 7, 0], ['0', 'B', 8, 1], ['0', 'B', 9, 1], ['0', 'F', 9, 9], ['1', 'F', 0, 9], ['1', 5, 0, 0]]);
    applyMove(S, '0', { from: A, to: B });
    applyMove(S, '0', { from: B, to: A });
    applyMove(S, '0', { from: A, to: B });
    expect(legalMoves(S, '0')).toEqual([{ from: B, to: A }]);
    expect(() => applyMove(S, '0', { from: B, to: A })).not.toThrow();
  });
  it('a blocked 4th move is rejected by applyMove when other moves exist', () => {
    const S = shuttle();
    applyMove(S, '0', { from: A, to: B });
    applyMove(S, '0', { from: B, to: A });
    applyMove(S, '0', { from: A, to: B });
    expect(() => applyMove(S, '0', { from: B, to: A })).toThrow();
  });
});

describe('setup validation', () => {
  const rnd = () => 0.5;
  it('a random placement is valid for each side', () => {
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const p of ['0', '1'] as PlayerID[]) expect(validatePlacement(p, randomPlacement(p, r))).toBeUndefined();
    expect(validatePlacement('0', randomPlacement('0', rnd))).toBeUndefined();
  });
  it('player 0 sets up on rows 6-9, player 1 on rows 0-3', () => {
    const p0 = randomPlacement('0', rnd), p1 = randomPlacement('1', rnd);
    expect(p0.every((x) => x.pos >= 60)).toBe(true);
    expect(p1.every((x) => x.pos < 40)).toBe(true);
  });
  it('rejects wrong counts', () => {
    const p = randomPlacement('0', rnd);
    const swapped = p.map((x, i) => (i === 0 ? { ...x, rank: x.rank === 10 ? 9 : 10 } as typeof x : x));
    expect(validatePlacement('0', swapped)).toMatch(/count/);
    expect(validatePlacement('0', p.slice(1))).toMatch(/40/);
  });
  it('rejects squares outside the zone', () => {
    const p = randomPlacement('0', rnd);
    expect(validatePlacement('0', p.map((x, i) => (i === 0 ? { ...x, pos: pos(5, 0) } : x)))).toMatch(/zone/);
    expect(validatePlacement('1', p)).toMatch(/zone/);
  });
  it('rejects overlapping pieces and malformed input', () => {
    const p = randomPlacement('0', rnd);
    expect(validatePlacement('0', p.map((x, i) => (i === 1 ? { ...x, pos: p[0].pos } : x)))).toMatch(/overlap|twice/);
    expect(validatePlacement('0', 'nope' as never)).toBeTruthy();
    expect(validatePlacement('0', p.map((x, i) => (i === 0 ? { ...x, rank: 'X' as never } : x)))).toBeTruthy();
  });
});
