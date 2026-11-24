import { describe, expect, it } from 'vitest';
import { act, deploy, newMatch, resign, viewActionError, viewFor, weaponReady, type FleetState, type PlayerID } from '../src/fleet';
import { STANDARD, battle } from './fleetHelpers';

const ZERO = () => 0;
const WATER = Array.from({ length: 100 }, (_, i) => i).filter((i) => Math.floor(i / 10) % 2 === 1);
function pass(S: FleetState) {
  const p = S.turn;
  act(S, p, { type: 'shell', sq: WATER.find((w) => S.sides[p].shots[w] === null)! }, ZERO);
}
const SW = { 0: ['seaMine', 'frag', 'decoy'], 1: ['shield', 'decoy', 'reinforcement'] } as const;
function superBattle() {
  return battle('super', {
    loadout: { 0: [...SW[0]], 1: [...SW[1]] },
    deploy: { 0: { decoy: 99 }, 1: { decoy: 98, ships: [...STANDARD, { cls: 'cutter', at: 95, dir: 'h' }] } },
  });
}

describe('Fleet view: placement', () => {
  it('shows my own deployment and nothing of the enemy but whether they are ready', () => {
    const S = newMatch('super', 1, '0');
    deploy(S, '1', { ships: STANDARD, loadout: ['shield', 'decoy', 'frag'], decoy: 99 });
    const mine = viewFor(S, '1').sides['1'];
    expect(mine.fleet.length).toBe(5);
    expect(mine.loadout).toEqual(['shield', 'decoy', 'frag']);
    expect(mine.decoy).toBe(99);
    const theirs = viewFor(S, '0').sides['1'];
    expect(theirs.deployed).toBe(true);
    expect(theirs.fleet).toEqual([]);
    expect('loadout' in theirs).toBe(false);
    expect('decoy' in theirs).toBe(false);
    expect('charge' in theirs).toBe(false);
  });
});

describe('Fleet view: battle', () => {
  it('names the enemy classes but never their squares, decoy, loadout, charge or mine', () => {
    const S = superBattle();
    const v = viewFor(S, '0');
    const enemy = v.sides['1'];
    expect(enemy.fleet.map((s) => s.cls)).toEqual(['dreadnought', 'cruiser', 'frigate', 'submarine', 'corvette', 'cutter']);
    expect(enemy.fleet.every((s) => !('squares' in s) && !('hits' in s) && !('shield' in s))).toBe(true);
    for (const k of ['decoy', 'decoyHit', 'loadout', 'charge', 'spent', 'mine', 'mineLive', 'stats']) expect(k in enemy, k).toBe(false);
    expect(v.sides['0'].fleet[0].squares).toEqual([0, 1, 2, 3, 4]);
    expect(v.sides['0'].charge).toEqual({ seaMine: 1, frag: 1 });
  });

  it('shows a sunk enemy ship with its squares', () => {
    const S = battle();
    act(S, '0', { type: 'shell', sq: 80 }, ZERO);
    pass(S);
    act(S, '0', { type: 'shell', sq: 81 }, ZERO);
    const corvette = viewFor(S, '0').sides['1'].fleet.find((s) => s.cls === 'corvette')!;
    expect(corvette).toEqual({ cls: 'corvette', sunk: true, squares: [80, 81] });
  });

  it('hides my own live mine from me and the drop square from the enemy', () => {
    const S = superBattle();
    pass(S); pass(S);
    expect(weaponReady(S, '0', 'seaMine')).toBe(true);
    act(S, '0', { type: 'mine', sq: 55 }, ZERO);
    const me = viewFor(S, '0');
    expect(me.sides['0'].mineLive).toBe(true);
    expect('mine' in me.sides['0']).toBe(false);
    expect(me.log[me.log.length - 1].anchor).toBe(55); // I know where I dropped it
    const them = viewFor(S, '1');
    expect(them.log[them.log.length - 1].anchor).toBeUndefined();
    expect(JSON.stringify(them.sides)).not.toContain('"mine"');
    const spectator = viewFor(S, null);
    expect(spectator.log[spectator.log.length - 1].anchor).toBeUndefined();
    expect(viewActionError(me, '0', { type: 'mine', sq: 10 })).toBeDefined(); // one mine at a time
  });

  it('a spectator sees neither fleet', () => {
    const S = superBattle();
    const v = viewFor(S, null);
    for (const p of ['0', '1'] as PlayerID[]) {
      expect(v.sides[p].fleet.every((s) => !('squares' in s))).toBe(true);
      expect('loadout' in v.sides[p]).toBe(false);
    }
  });
});

describe('Fleet view: after the round', () => {
  it('reveals both fleets, decoys, loadouts and stats to everyone', () => {
    const S = superBattle();
    resign(S, '1');
    for (const viewer of ['0', '1', null] as (PlayerID | null)[]) {
      const v = viewFor(S, viewer);
      expect(v.revealed).toBe(true);
      expect(v.sides['1'].fleet.every((s) => Array.isArray(s.squares))).toBe(true);
      expect(v.sides['1'].decoy).toBe(98);
      expect(v.sides['0'].loadout).toEqual([...SW[0]]);
      expect(v.sides['0'].stats).toBeDefined();
    }
  });
});

describe('Fleet view: legal actions from the view', () => {
  it('agrees with the rules on whose turn and which squares', () => {
    const S = battle();
    act(S, '0', { type: 'shell', sq: 5 }, ZERO);
    const v1 = viewFor(S, '1');
    expect(viewActionError(v1, '1', { type: 'shell', sq: 5 })).toBeUndefined();
    expect(viewActionError(v1, '0', { type: 'shell', sq: 6 })).toBeDefined();
    pass(S);
    expect(viewActionError(viewFor(S, '0'), '0', { type: 'shell', sq: 5 })).toBeDefined();
  });
});
