import { describe, expect, it } from 'vitest';
import {
  WEAPON_IDS, act, actionError, deploy, isWeaponId, newMatch, nextRound, resign, salvoSize, seenShots, sq, undeploy, weaponReady,
  type FleetAction, type FleetState, type PlayerID,
} from '../src/fleet';
import { STANDARD, STANDARD_SQUARES, battle } from './fleetHelpers';

const ZERO = () => 0;
/** Odd rows are open water in the STANDARD fleet. */
const WATER = Array.from({ length: 100 }, (_, i) => i).filter((i) => Math.floor(i / 10) % 2 === 1);

/** The player to move fires a shell at the next open-water square they have not shot. */
function pass(S: FleetState, rng = ZERO) {
  const p = S.turn;
  const s = WATER.find((w) => S.sides[p].shots[w] === null)!;
  expect(act(S, p, { type: 'shell', sq: s }, rng)).toBeUndefined();
}
const shell = (S: FleetState, s: number, rng = ZERO) => act(S, S.turn, { type: 'shell', sq: s }, rng);
const last = (S: FleetState) => S.log[S.log.length - 1];

describe('Fleet placement', () => {
  it('starts the battle when both have deployed, with the opener to move', () => {
    const S = newMatch('classic', 1, '1');
    expect(S.stage).toBe('placement');
    expect(deploy(S, '0', { ships: STANDARD, loadout: [] })).toBeUndefined();
    expect(S.stage).toBe('placement');
    expect(undeploy(S, '0')).toBeUndefined();
    expect(S.sides['0'].deployed).toBe(false);
    deploy(S, '0', { ships: STANDARD, loadout: [] });
    expect(deploy(S, '0', { ships: STANDARD, loadout: [] })).toBeDefined(); // already deployed
    deploy(S, '1', { ships: STANDARD, loadout: [] });
    expect(S.stage).toBe('battle');
    expect(S.turn).toBe('1');
    expect(undeploy(S, '0')).toBeDefined();
  });

  it('gives each ship a Shield charge only with the Shield', () => {
    const S = battle('super', { loadout: { 0: ['shield', 'frag', 'cherry'], 1: ['frag', 'cherry', 'chainGun'] } });
    expect(S.sides['0'].ships.every((s) => s.shield)).toBe(true);
    expect(S.sides['1'].ships.some((s) => s.shield)).toBe(false);
  });
});

describe('Fleet shells', () => {
  it('a shell hits or misses, then the turn passes', () => {
    const S = battle();
    expect(shell(S, 0)).toBeUndefined();
    expect(S.sides['0'].shots[0]).toBe('hit');
    expect(S.turn).toBe('1');
    expect(shell(S, 99)).toBeUndefined();
    expect(S.sides['1'].shots[99]).toBe('miss');
    expect(S.turn).toBe('0');
  });

  it('rejects shooting out of turn, off the board, or at a resolved square', () => {
    const S = battle();
    expect(act(S, '1', { type: 'shell', sq: 5 }, ZERO)).toBeDefined();
    expect(shell(S, 100)).toBeDefined();
    expect(shell(S, -1)).toBeDefined();
    shell(S, 0);
    shell(S, 99);
    expect(shell(S, 0)).toBeDefined();
    expect(act(S, '0', { type: 'salvo', sqs: [5] }, ZERO)).toBeDefined(); // no salvo in Classic
  });

  it('a hit never says which ship; a sinking names the class and marks all its squares sunk', () => {
    const S = battle();
    shell(S, 80);
    expect(last(S)).toMatchObject({ kind: 'shell', by: '0', cells: [{ sq: 80, r: 'hit' }], sunk: [] });
    expect(JSON.stringify(last(S))).not.toContain('corvette');
    pass(S);
    shell(S, 81);
    expect(last(S).sunk).toEqual(['corvette']);
    expect(S.sides['0'].shots[80]).toBe('sunk');
    expect(S.sides['0'].shots[81]).toBe('sunk');
    expect(S.sides['1'].ships.find((s) => s.cls === 'corvette')!.sunk).toBe(true);
  });

  it('sinking every ship wins a single game', () => {
    const S = battle();
    for (const s of STANDARD_SQUARES) {
      expect(S.stage).toBe('battle');
      shell(S, s);
      if (S.stage === 'battle') pass(S);
    }
    expect(S.stage).toBe('over');
    expect(S.result).toEqual({ winner: '0', reason: 'fleet' });
    expect(S.wins['0']).toBe(1);
    expect(shell(S, 99)).toBeDefined();
  });

  it('resigning ends the match for the other side', () => {
    const S = battle('classic', { bestOf: 3 });
    expect(resign(S, '0')).toBeUndefined();
    expect(S.result).toEqual({ winner: '1', reason: 'resign' });
    expect(S.stage).toBe('over');
    expect(resign(S, '1')).toBeDefined();
  });
});

describe('Fleet series', () => {
  function winRound(S: FleetState, winner: PlayerID) {
    while (S.turn !== winner) pass(S);
    for (const s of STANDARD_SQUARES) {
      if (S.stage !== 'battle') break;
      expect(shell(S, s)).toBeUndefined();
      if (S.stage === 'battle') pass(S);
    }
  }

  it('best of 3: the round winner scores, the loser opens the next round, first to 2 wins', () => {
    const S = battle('classic', { bestOf: 3 });
    winRound(S, '0');
    expect(S.stage).toBe('roundEnd');
    expect(S.wins).toEqual({ 0: 1, 1: 0 });
    expect(S.result).toBeNull();
    expect(S.rounds[0]).toMatchObject({ winner: '0' });
    expect(nextRound(S, '0')).toBeUndefined();
    expect(S.stage).toBe('roundEnd');
    nextRound(S, '1');
    expect(S.stage).toBe('placement');
    expect(S.round).toBe(2);
    expect(S.sides['0'].deployed).toBe(false);
    expect(S.sides['0'].shots.every((c) => c === null)).toBe(true);
    deploy(S, '0', { ships: STANDARD, loadout: [] });
    deploy(S, '1', { ships: STANDARD, loadout: [] });
    expect(S.turn).toBe('1'); // the loser opens
    winRound(S, '0');
    expect(S.result).toEqual({ winner: '0', reason: 'fleet' });
    expect(S.stage).toBe('over');
  });

  it('keeps match stats across rounds', () => {
    const S = battle('classic', { bestOf: 3 });
    winRound(S, '0');
    expect(S.sides['0'].stats.hits).toBe(STANDARD_SQUARES.length);
    expect(S.sides['0'].stats.sunk).toBe(5);
    expect(S.sides['1'].stats.lost).toBe(5);
    expect(S.sides['0'].stats.shots).toBeGreaterThanOrEqual(STANDARD_SQUARES.length);
  });
});

describe('Fleet salvo', () => {
  it('fires one shell per ship afloat; all must be distinct, open squares', () => {
    const S = battle('salvo');
    expect(salvoSize(S, '0')).toBe(5);
    expect(act(S, '0', { type: 'shell', sq: 5 }, ZERO)).toBeDefined();
    expect(act(S, '0', { type: 'salvo', sqs: [10, 11, 12, 13] }, ZERO)).toBeDefined();
    expect(act(S, '0', { type: 'salvo', sqs: [10, 11, 12, 13, 13] }, ZERO)).toBeDefined();
    expect(act(S, '0', { type: 'salvo', sqs: [80, 81, 10, 11, 12] }, ZERO)).toBeUndefined();
    expect(last(S).kind).toBe('salvo');
    expect(last(S).cells.map((c) => c.sq)).toEqual([80, 81, 10, 11, 12]);
    expect(last(S).sunk).toEqual(['corvette']);
    expect(S.turn).toBe('1');
    expect(salvoSize(S, '1')).toBe(4); // lost the Corvette
  });

  it('records hitting all five ships with one salvo', () => {
    const S = battle('salvo');
    act(S, '0', { type: 'salvo', sqs: [0, 20, 40, 60, 80] }, ZERO);
    expect(S.sides['0'].stats.salvoAll5).toBe(true);
  });
});

describe('Fleet charge', () => {
  const LO = { 0: ['airStrike', 'frag', 'shield'], 1: ['frag', 'cherry', 'chainGun'] } as const;
  const sw = () => battle('super', { loadout: { 0: [...LO[0]], 1: [...LO[1]] } });

  it('goes up by one at the start of each own turn; ready at the charge speed; resets after firing', () => {
    const S = sw();
    expect(S.sides['0'].charge.airStrike).toBe(1);
    expect(S.sides['1'].charge.frag).toBe(0);
    expect(weaponReady(S, '0', 'airStrike')).toBe(false);
    const strike: FleetAction = { type: 'weapon', id: 'airStrike', sq: sq(4, 5), dir: 'h' };
    expect(act(S, '0', strike, ZERO)).toBeDefined();
    pass(S);
    expect(S.sides['1'].charge.frag).toBe(1);
    pass(S);
    expect(S.sides['0'].charge.airStrike).toBe(2);
    expect(weaponReady(S, '0', 'airStrike')).toBe(true);
    expect(act(S, '0', strike, ZERO)).toBeUndefined();
    expect(S.sides['0'].charge.airStrike).toBe(0);
    expect(S.sides['0'].charge.frag).toBe(2);
    expect(S.turn).toBe('1');
  });

  it('never fires a weapon outside the loadout, a passive one, or in Classic', () => {
    const S = sw();
    for (let i = 0; i < 12; i++) pass(S);
    expect(act(S, '0', { type: 'weapon', id: 'cherry', sq: 55 }, ZERO)).toBeDefined();
    expect(act(S, '0', { type: 'weapon', id: 'shield', sq: 55 }, ZERO)).toBeDefined();
    const C = battle();
    expect(act(C, '0', { type: 'weapon', id: 'frag', sq: 55 }, ZERO)).toBeDefined();
  });
});

/** A Super Weapons battle where seat 0 holds `weapon` fully charged and it is seat 0's turn. */
function charged(weapon: Parameters<typeof weaponReady>[2], extra: Partial<Record<PlayerID, import('../src/fleet').WeaponId[]>> = {}, deployFor1 = {}): FleetState {
  const lo0 = [weapon, ...(['frag', 'cherry', 'airStrike', 'chainGun'] as const).filter((w) => w !== weapon)].slice(0, 3);
  const S = battle('super', { loadout: { 0: extra['0'] ?? lo0, 1: extra['1'] ?? ['frag', 'cherry', 'chainGun'] }, deploy: { 1: deployFor1 } });
  while (!weaponReady(S, '0', weapon) || S.turn !== '0') pass(S);
  return S;
}

describe('Fleet area weapons', () => {
  it('a pattern resolves every open square in it and skips resolved ones', () => {
    const S = charged('frag');
    shell(S, 11); // seat 0 shoots B2 first, so the pattern centred there skips it
    pass(S);
    while (!weaponReady(S, '0', 'frag') || S.turn !== '0') pass(S);
    expect(act(S, '0', { type: 'weapon', id: 'frag', sq: 11 }, ZERO)).toBeUndefined();
    expect(last(S)).toMatchObject({ kind: 'weapon', weapon: 'frag', anchor: 11 });
    expect(last(S).cells.map((c) => c.sq)).toEqual([0, 2, 20, 22]);
    expect(S.sides['0'].shots[0]).toBe('hit');
  });

  it('needs an anchor on the board and at least one open square in the pattern', () => {
    const S = charged('airStrike');
    expect(act(S, '0', { type: 'weapon', id: 'airStrike', sq: 100, dir: 'h' }, ZERO)).toBeDefined();
    expect(act(S, '0', { type: 'weapon', id: 'airStrike', sq: 5, dir: 'x' as never }, ZERO)).toBeDefined();
    expect(act(S, '0', { type: 'weapon', id: 'airStrike', sq: 50, dir: 'v' }, ZERO)).toBeUndefined();
    expect(last(S).cells.map((c) => c.sq)).toEqual([30, 50, 70]);
  });

  it('Maelstrom fires once per round', () => {
    const S = charged('maelstrom');
    expect(act(S, '0', { type: 'weapon', id: 'maelstrom', sq: 55 }, ZERO)).toBeUndefined();
    expect(last(S).cells.length).toBe(13);
    while (S.turn !== '0' || S.sides['0'].charge.maelstrom! < 7) pass(S);
    expect(weaponReady(S, '0', 'maelstrom')).toBe(false);
    expect(act(S, '0', { type: 'weapon', id: 'maelstrom', sq: 15 }, ZERO)).toBeDefined();
  });
});

describe('Fleet Shield', () => {
  const shielded = () => battle('super', {
    loadout: { 0: ['frag', 'cherry', 'chainGun'], 1: ['shield', 'frag', 'cherry'] },
  });

  it('each ship ignores its first hit: "deflected", the square can be shot again, the next hit counts', () => {
    const S = shielded();
    shell(S, 80);
    expect(S.sides['0'].shots[80]).toBe('deflect');
    expect(last(S).cells).toEqual([{ sq: 80, r: 'deflect' }]);
    pass(S);
    expect(shell(S, 80)).toBeUndefined();
    expect(S.sides['0'].shots[80]).toBe('hit');
    pass(S);
    shell(S, 81);
    expect(last(S).sunk).toEqual(['corvette']);
  });

  it('a pattern over two squares of a shielded ship deflects the first and damages the second', () => {
    const S = shielded();
    while (!weaponReady(S, '0', 'cherry') || S.turn !== '0') pass(S);
    act(S, '0', { type: 'weapon', id: 'cherry', sq: 81 }, ZERO); // + over B9: covers A9, B9 (Corvette), C9, B8, B10
    expect(S.sides['0'].shots[80]).toBe('deflect');
    expect(S.sides['0'].shots[81]).toBe('hit');
  });
});

describe('Fleet Supernova', () => {
  it('a hit sinks the whole ship', () => {
    const S = charged('supernova');
    expect(act(S, '0', { type: 'weapon', id: 'supernova', sq: 2 }, ZERO)).toBeUndefined();
    expect(last(S).sunk).toEqual(['dreadnought']);
    expect([0, 1, 2, 3, 4].map((c) => S.sides['0'].shots[c])).toEqual(['sunk', 'sunk', 'sunk', 'sunk', 'sunk']);
  });

  it('a Shield absorbs it', () => {
    const S = charged('supernova', { 1: ['shield', 'frag', 'cherry'] });
    act(S, '0', { type: 'weapon', id: 'supernova', sq: 2 }, ZERO);
    expect(S.sides['0'].shots[2]).toBe('deflect');
    expect(S.sides['1'].ships[0].hits).toEqual([]);
  });

  it('on water it is a miss', () => {
    const S = charged('supernova');
    act(S, '0', { type: 'weapon', id: 'supernova', sq: 99 }, ZERO);
    expect(S.sides['0'].shots[99]).toBe('miss');
  });
});

describe('Fleet Torpedo', () => {
  it('runs up the column from row 10, marks passed squares as misses and explodes on the first unhit ship square', () => {
    const S = charged('torpedo');
    expect(act(S, '0', { type: 'weapon', id: 'torpedo', sq: 30 }, ZERO)).toBeUndefined(); // any square in column A (A4)
    expect(last(S).cells).toEqual([{ sq: 90, r: 'miss' }, { sq: 80, r: 'hit' }]);
    expect(S.sides['0'].shots[70]).toBeNull();
  });

  it('passes over damaged squares', () => {
    const S = charged('torpedo');
    S.sides['0'].shots[80] = 'hit';
    S.sides['1'].ships.find((s) => s.cls === 'corvette')!.hits.push(80);
    act(S, '0', { type: 'weapon', id: 'torpedo', sq: 0 }, ZERO);
    expect(last(S).cells.map((c) => c.sq)).toEqual([90, 70, 60]);
    expect(S.sides['0'].shots[60]).toBe('hit');
  });

  it('a column of water becomes ten misses', () => {
    const S = charged('torpedo');
    act(S, '0', { type: 'weapon', id: 'torpedo', sq: 9 }, ZERO);
    expect(last(S).cells.length).toBe(10);
    expect(last(S).cells.every((c) => c.r === 'miss')).toBe(true);
  });
});

describe('Fleet Decoy', () => {
  it('shows a hit, never sinks and never counts toward the win', () => {
    const S = battle('super', { loadout: { 0: ['frag', 'cherry', 'chainGun'], 1: ['decoy', 'frag', 'cherry'] }, deploy: { 1: { decoy: 99 } } });
    shell(S, 99);
    expect(S.sides['0'].shots[99]).toBe('hit');
    expect(last(S).sunk).toEqual([]);
    expect(S.sides['1'].decoyHit).toBe(true);
    for (const s of STANDARD_SQUARES) {
      if (S.stage !== 'battle') break;
      pass(S);
      shell(S, s);
    }
    expect(S.result?.winner).toBe('0');
  });

  it('stops a Torpedo', () => {
    const S = charged('torpedo', { 1: ['decoy', 'frag', 'cherry'] }, { decoy: 90 });
    act(S, '0', { type: 'weapon', id: 'torpedo', sq: 0 }, ZERO);
    expect(last(S).cells).toEqual([{ sq: 90, r: 'hit' }]);
  });
});

describe('Fleet Sea Mine', () => {
  it('dropped on an unhit ship square it explodes at once', () => {
    const S = charged('seaMine');
    expect(act(S, '0', { type: 'mine', sq: 2 }, ZERO)).toBeUndefined();
    expect(S.sides['0'].shots[2]).toBe('hit');
    expect(S.sides['0'].mine).toBeNull();
  });

  it('drifts one square at the end of each later own turn and explodes on a ship', () => {
    const S = charged('seaMine');
    act(S, '0', { type: 'mine', sq: 5 }, ZERO); // F1, open water next to the Dreadnought's E1
    expect(S.sides['0'].mine).toBe(5);
    expect(S.sides['0'].shots[5]).toBeNull();
    pass(S); // seat 1
    expect(S.sides['0'].mine).toBe(5);
    // seat 0's next turn ends: neighbours of F1 are G1, E1, F2 -> 0.4 picks E1 (the Dreadnought)
    expect(act(S, '0', { type: 'shell', sq: 99 }, () => 0.4)).toBeUndefined();
    expect(S.sides['0'].mine).toBeNull();
    expect(S.sides['0'].shots[4]).toBe('hit');
    expect(last(S)).toMatchObject({ kind: 'mine', by: '0', cells: [{ sq: 4, r: 'hit' }] });
  });

  it('stays on the board and only one mine per player is live', () => {
    const S = charged('seaMine');
    act(S, '0', { type: 'mine', sq: 99 }, ZERO);
    for (let i = 0; i < 8; i++) {
      pass(S);
      expect(act(S, '0', { type: 'mine', sq: 55 }, ZERO)).toBeDefined();
      pass(S, () => 0.99);
      if (S.sides['0'].mine === null) break;
      expect(S.sides['0'].mine).toBeGreaterThanOrEqual(0);
      expect(S.sides['0'].mine).toBeLessThan(100);
    }
  });
});

describe('Fleet without Smoke Screen', () => {
  it('is not a weapon, and a loadout naming it is refused', () => {
    expect(isWeaponId('smoke')).toBe(false);
    expect(WEAPON_IDS).toHaveLength(12);
    const S = newMatch('super', 1, '0');
    expect(deploy(S, '0', { ships: STANDARD, loadout: ['smoke', 'frag', 'cherry'] as never })).toBeDefined();
  });

  it('every result is shown to the shooter at once', () => {
    const S = battle('super', { loadout: { 0: ['frag', 'cherry', 'chainGun'], 1: ['frag', 'cherry', 'chainGun'] } });
    shell(S, 0);
    expect(seenShots(S, '0')[0]).toBe(S.sides['0'].shots[0]);
    expect(last(S)).not.toHaveProperty('smoked');
  });
});
