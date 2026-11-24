import { describe, expect, it } from 'vitest';
import {
  BASE_FLEET, CHARGE_TURNS, LOADOUT_SIZE, SHIPS, WEAPONS, WEAPON_IDS, fleetFor, label, neighbours, patternSquares,
  randomDeployment, shipSquares, sq, validateDeployment, xOf, yOf, type Deployment,
} from '../src/fleet';
import { prng } from './frontlineHelpers';
import { STANDARD } from './fleetHelpers';

describe('Fleet board', () => {
  it('maps squares to columns A-J and rows 1-10', () => {
    expect(sq(0, 0)).toBe(0);
    expect(sq(9, 9)).toBe(99);
    expect([xOf(37), yOf(37)]).toEqual([7, 3]);
    expect(label(0)).toBe('A1');
    expect(label(sq(2, 6))).toBe('C7');
    expect(label(99)).toBe('J10');
  });

  it('lists orthogonal neighbours on the board only', () => {
    expect(neighbours(0).sort((a, b) => a - b)).toEqual([1, 10]);
    expect(neighbours(sq(5, 5)).length).toBe(4);
  });
});

describe('Fleet ships', () => {
  it('has the five base classes with their lengths, and the Cutter only via Reinforcement', () => {
    expect(BASE_FLEET.map((c) => SHIPS[c].length)).toEqual([5, 4, 3, 3, 2]);
    expect(SHIPS.cutter.length).toBe(3);
    expect(fleetFor('classic', [])).toEqual(BASE_FLEET);
    expect(fleetFor('super', ['frag', 'reinforcement', 'shield'])).toEqual([...BASE_FLEET, 'cutter']);
  });

  it('computes squares from the top-left square and direction, null when off the board', () => {
    expect(shipSquares({ cls: 'corvette', at: sq(3, 4), dir: 'h' })).toEqual([sq(3, 4), sq(4, 4)]);
    expect(shipSquares({ cls: 'frigate', at: sq(3, 4), dir: 'v' })).toEqual([sq(3, 4), sq(3, 5), sq(3, 6)]);
    expect(shipSquares({ cls: 'dreadnought', at: sq(6, 0), dir: 'h' })).toBeNull();
    expect(shipSquares({ cls: 'dreadnought', at: sq(0, 6), dir: 'v' })).toBeNull();
  });

  it('accepts a valid deployment; allows adjacent ships', () => {
    expect(validateDeployment('classic', { ships: STANDARD, loadout: [] })).toBeUndefined();
    const adjacent = STANDARD.map((s, i) => ({ ...s, at: sq(0, i) }));
    expect(validateDeployment('classic', { ships: adjacent, loadout: [] })).toBeUndefined();
  });

  it('rejects overlap, off-board ships, a wrong fleet, and malformed input', () => {
    const overlap = STANDARD.map((s) => (s.cls === 'corvette' ? { ...s, at: sq(0, 0) } : s));
    expect(validateDeployment('classic', { ships: overlap, loadout: [] })).toBeDefined();
    const off = STANDARD.map((s) => (s.cls === 'dreadnought' ? { ...s, at: sq(7, 0) } : s));
    expect(validateDeployment('classic', { ships: off, loadout: [] })).toBeDefined();
    expect(validateDeployment('classic', { ships: STANDARD.slice(1), loadout: [] })).toBeDefined();
    expect(validateDeployment('classic', { ships: [...STANDARD, { cls: 'cutter', at: sq(0, 9), dir: 'h' }], loadout: [] })).toBeDefined();
    expect(validateDeployment('classic', null)).toBeDefined();
    expect(validateDeployment('classic', { ships: 'x', loadout: [] })).toBeDefined();
    expect(validateDeployment('classic', { ships: STANDARD.map((s) => ({ ...s, dir: 'd' })), loadout: [] })).toBeDefined();
  });

  it('needs exactly 3 distinct weapons in Super Weapons and none in other modes', () => {
    const ok: Deployment = { ships: STANDARD, loadout: ['frag', 'airStrike', 'chainGun'] };
    expect(validateDeployment('super', ok)).toBeUndefined();
    expect(validateDeployment('classic', ok)).toBeDefined();
    expect(validateDeployment('super', { ships: STANDARD, loadout: ['frag', 'frag', 'chainGun'] })).toBeDefined();
    expect(validateDeployment('super', { ships: STANDARD, loadout: ['frag', 'chainGun'] })).toBeDefined();
    expect(validateDeployment('super', { ships: STANDARD, loadout: ['frag', 'chainGun', 'laser'] })).toBeDefined();
  });

  it('needs a Decoy square off the ships iff the Decoy is in the loadout', () => {
    const lo = ['decoy', 'frag', 'shield'] as const;
    expect(validateDeployment('super', { ships: STANDARD, loadout: [...lo] })).toBeDefined();
    expect(validateDeployment('super', { ships: STANDARD, loadout: [...lo], decoy: sq(9, 9) })).toBeUndefined();
    expect(validateDeployment('super', { ships: STANDARD, loadout: [...lo], decoy: 0 })).toBeDefined(); // on the Dreadnought
    expect(validateDeployment('super', { ships: STANDARD, loadout: ['frag', 'shield', 'chainGun'], decoy: sq(9, 9) })).toBeDefined();
  });

  it('needs the Cutter iff Reinforcement is in the loadout', () => {
    const lo = ['reinforcement', 'frag', 'shield'] as const;
    expect(validateDeployment('super', { ships: STANDARD, loadout: [...lo] })).toBeDefined();
    const withCutter = [...STANDARD, { cls: 'cutter' as const, at: sq(5, 9), dir: 'h' as const }];
    expect(validateDeployment('super', { ships: withCutter, loadout: [...lo] })).toBeUndefined();
  });

  it('makes random deployments that are always valid and deterministic per seed', () => {
    for (let s = 1; s <= 200; s++) {
      const lo = s % 2 ? (['decoy', 'reinforcement', 'shield'] as const) : (['frag', 'airStrike', 'torpedo'] as const);
      const d = randomDeployment('super', [...lo], prng(s));
      expect(validateDeployment('super', d)).toBeUndefined();
    }
    expect(randomDeployment('classic', [], prng(9))).toEqual(randomDeployment('classic', [], prng(9)));
  });
});

describe('Fleet weapons', () => {
  it('keeps one tuning table: 12 weapons, 3 passive, charge from the speed', () => {
    expect(WEAPON_IDS.length).toBe(12);
    expect(WEAPON_IDS.filter((w) => WEAPONS[w].passive).sort()).toEqual(['decoy', 'reinforcement', 'shield']);
    expect(CHARGE_TURNS).toEqual({ quick: 2, normal: 3, slow: 5, verySlow: 7 });
    expect(WEAPONS.airStrike.charge).toBe(2);
    expect(WEAPONS.frag.charge).toBe(3);
    expect(WEAPONS.chainGun.charge).toBe(5);
    expect(WEAPONS.torpedo.charge).toBe(7);
    expect(WEAPONS.shield.charge).toBe(0);
    expect(WEAPONS.maelstrom.oncePerRound).toBe(true);
    expect(LOADOUT_SIZE).toBe(3);
    expect(WEAPON_IDS.filter((w) => WEAPONS[w].unlock.kind === 'start').sort()).toEqual(['airStrike', 'chainGun', 'frag', 'shield']);
    expect(WEAPONS.thunderhead.unlock).toEqual({ kind: 'sinks', n: 135 });
  });

  it('draws each pattern around its anchor, in reading order', () => {
    const c = sq(4, 4);
    expect(patternSquares('frag', c)).toEqual([sq(3, 3), sq(5, 3), c, sq(3, 5), sq(5, 5)]);
    expect(patternSquares('cherry', c)).toEqual([sq(4, 3), sq(3, 4), c, sq(5, 4), sq(4, 5)]);
    expect(patternSquares('airStrike', c, 'h')).toEqual([sq(2, 4), c, sq(6, 4)]);
    expect(patternSquares('airStrike', c, 'v')).toEqual([sq(4, 2), c, sq(4, 6)]);
    expect(patternSquares('chainGun', c)).toEqual([sq(4, 2), sq(4, 3), c, sq(4, 5), sq(4, 6)]);
    expect(patternSquares('thunderhead', c).length).toBe(9);
    expect(patternSquares('maelstrom', c).length).toBe(13);
    expect(patternSquares('supernova', c)).toEqual([c]);
  });

  it('clips patterns at the board edge', () => {
    expect(patternSquares('thunderhead', 0)).toEqual([0, 1, 10, 11]);
    expect(patternSquares('maelstrom', 0)).toEqual([0, 1, 2, 10, 11, 20]);
    expect(patternSquares('chainGun', sq(0, 9))).toEqual([sq(0, 7), sq(0, 8), sq(0, 9)]);
  });
});
