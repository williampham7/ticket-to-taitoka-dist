import { describe, expect, it } from 'vitest';
import { card, flip, leave, slap, tick, TIMING, type EgwState } from '../src/egyptian';
import { assertInvariant, cs, rigged } from './egyptianHelpers';

const ok = (G: EgwState, err: string | undefined) => { expect(err).toBeUndefined(); assertInvariant(G); };

describe('valid slaps', () => {
  it('a double wins the pile after the reveal pause', () => {
    const G = rigged({ A: ['7S', '2C'], B: ['7H', '3C'], C: ['4C'] }, { filler: 'C' });
    ok(G, flip(G, 'A', 0));
    ok(G, flip(G, 'B', 400));
    ok(G, slap(G, 'C', 1, 700));
    expect(G.won).toMatchObject({ by: 'C', how: 'slap', matches: [{ rule: 'double', cards: [0, 1] }] });
    expect(G.turn).toBeNull();
    expect(G.timer).toEqual({ kind: 'collect', at: 700 + TIMING.slapPauseMs });
    expect(G.stats.C.slapsWon).toBe(1);
    expect(slap(G, 'A', 1, 800)).toBe('paused');
    expect(flip(G, 'C', 900)).toBe('wait');
    ok(G, tick(G, 700 + TIMING.slapPauseMs));
    expect(G.turn).toBe('C');
    expect(G.stacks.C.slice(-2)).toEqual(cs('7S', '7H'));
  });

  it('second slap on a won pile is free', () => {
    const G = rigged({ A: ['7S', '2C'], B: ['7H', '3C'] }, { filler: 'B' });
    flip(G, 'A', 0); flip(G, 'B', 400);
    ok(G, slap(G, 'A', 1, 500));
    ok(G, tick(G, 500 + TIMING.slapPauseMs));
    const n = G.stacks.B.length;
    expect(slap(G, 'B', 1, 3000)).toBe('stale');
    expect(G.stacks.B.length).toBe(n);
  });

  it('a slap in the grace window beats the challenger', () => {
    const G = rigged({ A: ['JS', '9C'], B: ['5D', '3D'], C: ['5H'] }, { pile: ['5C'], filler: 'C' });
    ok(G, flip(G, 'A', 0));
    ok(G, flip(G, 'B', 400));
    expect(G.timer?.kind).toBe('grace');
    // pile: 5C JS 5D = sandwich
    ok(G, slap(G, 'C', 1, 900));
    expect(G.won).toMatchObject({ by: 'C', how: 'slap' });
  });

  it('latency tolerance: a pattern covered by a flip up to 200 ms ago still counts', () => {
    const make = () => rigged({ A: ['7S', '2D'], B: ['7H'] }, { filler: 'A' });
    const G = make();
    flip(G, 'A', 0); flip(G, 'B', 400); flip(G, 'A', 1000);
    ok(G, slap(G, 'B', 1, 1200));
    expect(G.won!.matches[0]).toEqual({ rule: 'double', cards: [0, 1] });
    const H = make();
    flip(H, 'A', 0); flip(H, 'B', 400); flip(H, 'A', 1000);
    ok(H, slap(H, 'B', 1, 1201));
    expect(H.won).toBeNull();
    expect(H.stats.B.falseSlaps).toBe(1);
  });
});

describe('false slaps', () => {
  it('burn one card face down and lock the slapper out for 1 s', () => {
    const G = rigged({ A: ['2S', '3S'], B: ['9H', '8H'] }, { filler: 'A' });
    flip(G, 'A', 0);
    const before = G.burned.length;
    ok(G, slap(G, 'B', 1, 100));
    expect(G.burned.length).toBe(before + 1);
    expect(G.burned.at(-1)).toBe(card('9H'));
    expect(G.lockout.B).toBe(1100);
    expect(G.log.at(-1)).toEqual({ kind: 'falseSlap', by: 'B', penalty: true, seq: G.seq, at: 100 });
    expect(slap(G, 'B', 1, 1099)).toBe('locked');
    expect(G.stacks.B.length).toBe(1);
    ok(G, flip(G, 'B', 500)); // a locked-out player can still flip
    ok(G, slap(G, 'B', 1, 1100)); // judged again
  });

  it('burns never count toward a pattern', () => {
    const G = rigged({ A: ['7S', '2S'], B: ['7H', '3H'] }, { filler: 'A' });
    flip(G, 'A', 0);
    slap(G, 'B', 1, 100); // false: burns 7H under the pile
    ok(G, slap(G, 'A', 1, 200));
    expect(G.won).toBeNull();
  });

  it('a slap on an empty pile is false', () => {
    const G = rigged({ A: ['7S'], B: ['7H', '2H'] }, { filler: 'A' });
    ok(G, slap(G, 'B', 1, 0));
    expect(G.stats.B.falseSlaps).toBe(1);
  });

  it('burn empties the challenged player', () => {
    const G = rigged({ A: ['KS', '9C'], B: ['2D'], C: ['4H', '5H'] }, { filler: 'C' });
    ok(G, flip(G, 'A', 0));
    ok(G, slap(G, 'B', 1, 100));
    expect(G.challenge).toMatchObject({ target: 'C', tries: 3 });
    expect(G.turn).toBe('C');
  });

  it('burn empties the turn player: the turn moves on, or nobody holds cards', () => {
    const G = rigged({ A: ['2D'], B: ['3D'], C: [] }, { filler: 'B' });
    ok(G, slap(G, 'A', 1, 0));
    expect(G.turn).toBe('B');
    const H = rigged({ A: ['2D'], B: [] }, { pile: ['5S'] });
    H.topBy = 'B';
    ok(H, slap(H, 'A', 1, 0));
    expect(H.timer).toMatchObject({ kind: 'grace', winner: 'B', why: 'last' });
    const L = rigged({ A: ['2D'], B: [] });
    ok(L, slap(L, 'A', 1, 0));
    expect(L.timer).toMatchObject({ kind: 'grace', winner: 'A', why: 'last' });
  });
});

describe('slap-ins', () => {
  it('one attempt per round for a player with no cards, reset when the round ends', () => {
    const G = rigged({ A: ['2S', '7S', '9C'], B: ['3S', '7H'], C: [] }, { filler: 'B' });
    flip(G, 'A', 0);
    const burned = G.burned.length;
    ok(G, slap(G, 'C', 1, 100));
    expect(G.burned.length).toBe(burned);
    expect(G.slapInUsed.C).toBe(true);
    expect(G.log.at(-1)).toMatchObject({ kind: 'falseSlap', by: 'C', penalty: false });
    expect(slap(G, 'C', 1, 200)).toBe('spent');
    flip(G, 'B', 400); flip(G, 'A', 800); flip(G, 'B', 1200); // 2S 3S 7S 7H
    ok(G, slap(G, 'A', 1, 1300));
    ok(G, tick(G, 1300 + TIMING.slapPauseMs));
    expect(G.slapInUsed.C).toBe(false);
  });

  it('a valid slap-in brings the player back to lead', () => {
    const G = rigged({ A: ['7S', '9C'], B: ['7H', '3C'], C: [] }, { filler: 'B' });
    flip(G, 'A', 0); flip(G, 'B', 400);
    ok(G, slap(G, 'C', 1, 500));
    expect(G.won).toMatchObject({ by: 'C', how: 'slapIn' });
    ok(G, tick(G, 500 + TIMING.slapPauseMs));
    expect(G.turn).toBe('C');
    expect(G.stacks.C.length).toBeGreaterThan(0);
  });
});

describe('leaving', () => {
  it('cards go under the pile and play moves on', () => {
    const G = rigged({ A: ['2S', '3S'], B: ['4S'], C: ['5S'] }, { filler: 'C' });
    const burned = G.burned.length;
    ok(G, leave(G, 'A', 0));
    expect(G.burned.length).toBe(burned + 2);
    expect(G.turn).toBe('B');
    expect(slap(G, 'A', 1, 10)).toBe('left');
    expect(flip(G, 'A', 1000)).toBe('not your turn');
  });

  it('the last player left wins', () => {
    const G = rigged({ A: ['2S'], B: ['4S'] }, { filler: 'B' });
    ok(G, leave(G, 'B', 0));
    expect(G.result).toEqual({ winner: 'A' });
  });

  it('the pile goes on clockwise if its winner leaves before collecting', () => {
    const G = rigged({ A: ['7S', '2S'], B: ['7H', '3H'], C: ['4C'] }, { filler: 'C' });
    flip(G, 'A', 0); flip(G, 'B', 400);
    slap(G, 'A', 1, 500);
    ok(G, leave(G, 'A', 600));
    ok(G, tick(G, 500 + TIMING.slapPauseMs));
    expect(G.turn).toBe('B');
    expect(G.stacks.B.slice(-2)).toEqual(cs('7S', '7H'));
  });
});
