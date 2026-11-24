import { describe, expect, it } from 'vitest';
import { randomPlacement, validatePlacement } from '@boboland/shared/src/frontline';
import { combatSentence, combatSentenceNamed, displayPos, layoutFromPlacement, placementFromLayout, secondsLeft, swapSquares } from './helpers';

describe('displayPos', () => {
  it('keeps squares for player 0 and rotates 180 degrees for player 1', () => {
    expect(displayPos('0', 23)).toBe(23);
    expect(displayPos('1', 0)).toBe(99);
    expect(displayPos('1', 23)).toBe(76);
    expect(displayPos('1', displayPos('1', 41))).toBe(41);
  });
});

describe('swapSquares', () => {
  const p = [{ pos: 60, rank: 'F' as const }, { pos: 61, rank: 5 as const }, { pos: 62, rank: 'B' as const }];
  it('swaps the ranks on two squares and leaves the input alone', () => {
    const q = swapSquares(p, 60, 62);
    expect(q).toEqual([{ pos: 60, rank: 'B' }, { pos: 61, rank: 5 }, { pos: 62, rank: 'F' }]);
    expect(p[0].rank).toBe('F');
  });
  it('ignores squares that are not in the placement', () => {
    expect(swapSquares(p, 60, 11)).toEqual(p);
  });
});

describe('combatSentence', () => {
  const c = (winner: 'attacker' | 'defender' | 'both') => ({
    at: 33,
    attacker: { id: 'a', owner: '0' as const, rank: 6 as const },
    defender: { id: 'b', owner: '1' as const, rank: 4 as const },
    winner,
  });
  it('says who attacked whom from my side', () => {
    expect(combatSentence(c('attacker'), '0')).toBe('Your Captain (6) attacked their Sergeant (4): Captain wins');
    expect(combatSentence(c('attacker'), '1')).toBe('Their Captain (6) attacked your Sergeant (4): Captain wins');
  });
  it('covers defender wins and ties', () => {
    expect(combatSentence(c('defender'), '0')).toBe('Your Captain (6) attacked their Sergeant (4): Sergeant wins');
    expect(combatSentence(c('both'), '0')).toBe('Your Captain (6) attacked their Sergeant (4): both are removed');
  });
  it('names the special pieces by letter', () => {
    const m = { at: 1, attacker: { id: 'a', owner: '0' as const, rank: 3 as const }, defender: { id: 'b', owner: '1' as const, rank: 'B' as const }, winner: 'attacker' as const };
    expect(combatSentence(m, '0')).toBe('Your Engineer (3) attacked their Mine (B): Engineer wins');
  });
});

describe('combatSentenceNamed', () => {
  it('describes a combat with player names, for the pass-and-play curtain both players read', () => {
    const c = { at: 1, attacker: { id: 'a', owner: '1' as const, rank: 1 as const }, defender: { id: 'b', owner: '0' as const, rank: 10 as const }, winner: 'attacker' as const };
    expect(combatSentenceNamed(c, { 0: 'Ana', 1: 'Bo' })).toBe("Bo's Operative (1) attacked Ana's Marshal (10): Operative wins");
  });
});

describe('layouts', () => {
  const rnd = () => 0.37;
  it('stores 40 ranks in display order and maps back for either player', () => {
    for (const me of ['0', '1'] as const) {
      const p = randomPlacement(me, rnd);
      const layout = layoutFromPlacement(me, p);
      expect(layout).toHaveLength(40);
      const back = placementFromLayout(me, layout);
      expect(back).toEqual(expect.arrayContaining(p));
      expect(validatePlacement(me, back)).toBeUndefined();
    }
  });
  it('is side independent: the same layout looks the same to both owners', () => {
    const layout = layoutFromPlacement('0', randomPlacement('0', rnd));
    const q = placementFromLayout('1', layout);
    expect(validatePlacement('1', q)).toBeUndefined();
    expect(layoutFromPlacement('1', q)).toEqual(layout);
    expect(q.find((x) => x.pos === 39)!.rank).toBe(layout[0]);
    expect(placementFromLayout('0', layout).find((x) => x.pos === 60)!.rank).toBe(layout[0]);
  });
});

describe('secondsLeft', () => {
  it('counts down from the turn start and never goes below zero', () => {
    expect(secondsLeft({ turnSeconds: 30, turnStartedAt: 1000 }, 1000 + 12_400)).toBe(18);
    expect(secondsLeft({ turnSeconds: 30, turnStartedAt: 1000 }, 1000 + 99_000)).toBe(0);
  });
  it('is null without a limit', () => {
    expect(secondsLeft({ turnSeconds: null, turnStartedAt: null }, 5)).toBeNull();
    expect(secondsLeft({ turnSeconds: 30, turnStartedAt: null }, 5)).toBeNull();
  });
});
