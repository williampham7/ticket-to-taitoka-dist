import { describe, expect, it } from 'vitest';
import type { Combat } from '@boboland/shared/src/frontline';
import { BOT_PAUSE_MS, botDelay, COMBAT_MS, combatOutcome, fxFor, fxMs } from './fx';

const combat = (a: Combat['attacker']['rank'], d: Combat['defender']['rank'], winner: Combat['winner'], at = 44): Combat => ({
  at, winner, attacker: { id: 'a', owner: '0', rank: a }, defender: { id: 'd', owner: '1', rank: d },
});

describe('combatOutcome', () => {
  it('names what happened from the attacker\'s side', () => {
    expect(combatOutcome(combat(6, 4, 'attacker'))).toBe('win');
    expect(combatOutcome(combat(4, 6, 'defender'))).toBe('repel');
    expect(combatOutcome(combat(5, 5, 'both'))).toBe('trade');
    expect(combatOutcome(combat(7, 'B', 'defender'))).toBe('blast');
    expect(combatOutcome(combat(3, 'B', 'attacker'))).toBe('defuse');
    expect(combatOutcome(combat(2, 'F', 'attacker'))).toBe('capture');
  });
});

describe('fxFor', () => {
  const G = (moves: number, lastMove: { player: '0' | '1'; from: number; to: number } | null, lastCombat: Combat | null = null) => ({ moves, lastMove, lastCombat });

  it('is nothing before the first move, or when the move count did not step by one', () => {
    expect(fxFor(0, G(0, null))).toBeNull();
    expect(fxFor(3, G(3, { player: '0', from: 1, to: 2 }))).toBeNull();
    expect(fxFor(3, G(5, { player: '0', from: 1, to: 2 }))).toBeNull();
  });

  it('slides a plain move, longer for a scout run but never long', () => {
    const one = fxFor(0, G(1, { player: '0', from: 60, to: 50 }))!;
    expect(one).toMatchObject({ kind: 'move', from: 60, to: 50 });
    const run = fxFor(0, G(1, { player: '0', from: 90, to: 10 }))!;
    expect(run.ms).toBeGreaterThan(one.ms);
    expect(run.ms).toBeLessThanOrEqual(600);
  });

  it('plays the combat cinematic for an attack, a bit longer for a blast or a capture', () => {
    const c = fxFor(7, G(8, { player: '0', from: 54, to: 44 }, combat(6, 4, 'attacker')))!;
    expect(c).toMatchObject({ kind: 'combat', from: 54, outcome: 'win' });
    expect(c.ms).toBe(COMBAT_MS);
    const blast = fxFor(7, G(8, { player: '0', from: 54, to: 44 }, combat(6, 'B', 'defender')))!;
    expect(blast.ms).toBeGreaterThan(COMBAT_MS);
    expect(blast.ms).toBeLessThan(3500);
  });

  it('is shorter with reduced motion', () => {
    const c = fxFor(7, G(8, { player: '0', from: 54, to: 44 }, combat(6, 4, 'attacker')), true)!;
    expect(c.ms).toBeLessThan(COMBAT_MS);
  });
});

describe('botDelay', () => {
  it('waits for the last move\'s animation, then a further pause', () => {
    expect(botDelay({ moves: 0, lastMove: null, lastCombat: null })).toBe(BOT_PAUSE_MS);
    const g = { moves: 4, lastMove: { player: '0' as const, from: 54, to: 44 }, lastCombat: combat(6, 4, 'attacker') };
    expect(botDelay(g)).toBe(fxMs(g) + BOT_PAUSE_MS);
    expect(BOT_PAUSE_MS).toBe(1200);
  });
});
