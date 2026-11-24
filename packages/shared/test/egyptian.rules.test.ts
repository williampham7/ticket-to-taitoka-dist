import { describe, expect, it } from 'vitest';
import { card, flip, newGame, nextTimed, ready, tick, totalCards, TIMING, DEFAULT_RULES, type EgwState } from '../src/egyptian';
import { assertInvariant, cs, identityRng, rigged } from './egyptianHelpers';

/** Apply an action and check it was accepted and the invariant holds. */
const ok = (G: EgwState, err: string | undefined) => { expect(err).toBeUndefined(); assertInvariant(G); };

describe('deal', () => {
  it('deals one at a time; the first seats in deal order get the extra cards', () => {
    const sizes = (n: number) => { const G = newGame(n, DEFAULT_RULES, identityRng()); return G.players.map((p) => G.stacks[p].length); };
    expect(sizes(2)).toEqual([26, 26]);
    expect(sizes(3)).toEqual([18, 17, 17]);
    expect(sizes(4)).toEqual([13, 13, 13, 13]);
    expect(sizes(5)).toEqual([11, 11, 10, 10, 10]);
    expect(totalCards(newGame(5, DEFAULT_RULES, identityRng()))).toBe(52);
  });

  it('deal order and starting player come from separate draws', () => {
    const G = newGame(3, DEFAULT_RULES, { shuffle: (a) => [...a].reverse(), die: () => 2 });
    expect(G.players).toEqual(['2', '1', '0']);
    expect(G.turn).toBe('1');
    expect(G.stage).toBe('ready');
  });

  it('starts when every seat is ready, then plays after the deal', () => {
    const G = newGame(3, DEFAULT_RULES, identityRng());
    ok(G, ready(G, '0', 0));
    ok(G, ready(G, '1', 10));
    expect(ready(G, '1', 10)).toBeDefined();
    ok(G, ready(G, '2', 20));
    expect(G.stage).toBe('dealing');
    expect(tick(G, 20 + TIMING.dealMs - 1)).toBeDefined();
    ok(G, tick(G, 20 + TIMING.dealMs));
    expect(G.stage).toBe('play');
  });

  it('ready cap: the deal starts 8 s after the first ready', () => {
    const G = newGame(3, DEFAULT_RULES, identityRng());
    ready(G, '0', 0);
    expect(nextTimed(G)).toBe(8000);
    expect(tick(G, 7999)).toBeDefined();
    ok(G, tick(G, 8000));
    expect(G.stage).toBe('dealing');
  });
});

describe('flipping', () => {
  it('passes clockwise, skipping empty stacks', () => {
    const G = rigged({ A: ['2S', '3S'], B: [], C: ['4S'] }, { filler: 'C' });
    ok(G, flip(G, 'A', 0));
    expect(G.turn).toBe('C');
    expect(flip(G, 'A', 1000)).toBe('not your turn');
  });

  it('enforces the minimum flip gap', () => {
    const G = rigged({ A: ['2S', '5S'], B: ['3S', '6S'] }, { filler: 'A' });
    ok(G, flip(G, 'A', 0));
    expect(flip(G, 'B', 399)).toBe('too fast');
    ok(G, flip(G, 'B', 400));
  });

  it('the only player with cards keeps flipping', () => {
    const G = rigged({ A: ['2S', '3S'], B: [] }, { filler: 'A' });
    ok(G, flip(G, 'A', 0));
    expect(G.turn).toBe('A');
  });
});

describe('challenges', () => {
  it('tries, passing on, grace and collecting', () => {
    const G = rigged({ A: ['KS', '9C'], B: ['2D', '3D', 'JD', '8C'], C: ['4H', '5H'] }, { filler: 'C' });
    ok(G, flip(G, 'A', 0));
    expect(G.challenge).toMatchObject({ by: 'A', target: 'B', tries: 3 });
    expect(G.turn).toBe('B');
    ok(G, flip(G, 'B', 400));
    ok(G, flip(G, 'B', 800));
    expect(G.challenge!.tries).toBe(1);
    ok(G, flip(G, 'B', 1200));
    expect(G.challenge).toMatchObject({ by: 'B', target: 'C', tries: 1 });
    ok(G, flip(G, 'C', 1600));
    expect(G.timer).toEqual({ kind: 'grace', at: 2600, winner: 'B', why: 'challenge' });
    expect(G.turn).toBeNull();
    expect(flip(G, 'C', 2000)).toBe('wait');
    expect(tick(G, 2599)).toBeDefined();
    ok(G, tick(G, 2600));
    expect(G.won).toMatchObject({ by: 'B', how: 'challenge', face: card('JD') });
    expect(G.timer).toEqual({ kind: 'collect', at: 2600 + TIMING.challengePauseMs });
    const before = [...G.stacks.B];
    const pile = [...G.pile];
    ok(G, tick(G, 2600 + TIMING.challengePauseMs));
    expect(G.stacks.B).toEqual([...before, ...pile]);
    expect(G.round).toBe(2);
    expect(G.turn).toBe('B');
    expect(G.leader).toBe('B');
    expect(G.pile).toEqual([]);
    expect(G.stats.B.challengesWon).toBe(1);
  });

  it('a challenged player who runs out passes the remaining tries on', () => {
    const G = rigged({ A: ['KS', '9C'], B: ['2D'], C: ['4H', '5H'] }, { filler: 'C' });
    ok(G, flip(G, 'A', 0));
    ok(G, flip(G, 'B', 400));
    expect(G.challenge).toMatchObject({ by: 'A', target: 'C', tries: 2 });
    expect(G.turn).toBe('C');
  });

  it('with two players, the challenged player running out hands the pile to the challenger', () => {
    const G = rigged({ A: ['KS', '9C'], B: ['2D'] }, { filler: 'A' });
    ok(G, flip(G, 'A', 0));
    ok(G, flip(G, 'B', 400));
    expect(G.timer).toMatchObject({ kind: 'grace', winner: 'A' });
  });

  it('nobody can answer a face card from the only player with cards', () => {
    const G = rigged({ A: ['QS', '9C'], B: [] }, { filler: 'A' });
    ok(G, flip(G, 'A', 0));
    expect(G.timer).toMatchObject({ kind: 'grace', winner: 'A', why: 'challenge' });
  });
});

describe('timed events', () => {
  it('nobody holds cards: the last card’s player takes the pile', () => {
    const G = rigged({ A: ['2S'], B: [] });
    ok(G, flip(G, 'A', 0));
    expect(G.timer).toMatchObject({ kind: 'grace', winner: 'A', why: 'last' });
    ok(G, tick(G, 1000));
    expect(G.won).toMatchObject({ by: 'A', how: 'last' });
  });

  it('idle auto-flip after 15 s', () => {
    const G = rigged({ A: ['2S', '3S'], B: ['4S'] }, { filler: 'B' });
    G.turnSince = 0;
    expect(nextTimed(G)).toBe(15000);
    expect(tick(G, 14999)).toBe('nothing due');
    ok(G, tick(G, 15000));
    expect(G.pile).toEqual(cs('2S'));
    expect(G.log.at(-1)).toMatchObject({ kind: 'flip', by: 'A', auto: true });
  });

  it('a player who collects all 52 cards wins', () => {
    const G = rigged({ A: ['9S', '9H'], B: ['9D'] }, { filler: 'A' });
    ok(G, flip(G, 'A', 0));
    ok(G, flip(G, 'B', 400));
    expect(G.turn).toBe('A');
    // B is out; A's double wins it all
    G.won = { by: 'A', how: 'slap', matches: [], pile: [...G.pile] };
    G.timer = { kind: 'collect', at: 500 };
    G.turn = null;
    ok(G, tick(G, 500));
    expect(G.result).toEqual({ winner: 'A' });
    expect(G.stage).toBe('over');
    expect(G.log.at(-1)).toMatchObject({ kind: 'win', by: 'A' });
  });
});
