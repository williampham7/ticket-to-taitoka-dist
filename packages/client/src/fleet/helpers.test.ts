import { describe, expect, it } from 'vitest';
import { deploy, newMatch, viewFor, act } from '@boboland/shared/src/fleet';
import { seatToShow } from './helpers';

const ships = [
  { cls: 'dreadnought', at: 0, dir: 'h' }, { cls: 'cruiser', at: 20, dir: 'h' }, { cls: 'frigate', at: 40, dir: 'h' },
  { cls: 'submarine', at: 60, dir: 'h' }, { cls: 'corvette', at: 80, dir: 'h' },
] as const;

describe('pass and play: whose screen is shown', () => {
  it('placement: seat 0, then seat 1 once seat 0 has deployed; battle: the player to move', () => {
    const S = newMatch('classic', 1, '1');
    expect(seatToShow(viewFor(S, '0'))).toBe('0');
    deploy(S, '0', { ships: [...ships], loadout: [] });
    expect(seatToShow(viewFor(S, '0'))).toBe('1');
    deploy(S, '1', { ships: [...ships], loadout: [] });
    expect(seatToShow(viewFor(S, '0'))).toBe('1');
    act(S, '1', { type: 'shell', sq: 99 }, () => 0);
    expect(seatToShow(viewFor(S, '0'))).toBe('0');
  });
});
