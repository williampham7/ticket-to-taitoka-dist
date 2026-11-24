import { describe, expect, it } from 'vitest';
import {
  ADJ, CONTINENTS, CONT_TERRS, DECK, NEUTRAL, TERRITORY_IDS, TERRITORY_PATHS, act, connected, isSet, newGame, reinforcementsFor,
  resign, setsIn, territoriesOf, tradeValue, viewFor, type Card, type WarState,
} from '../src/warfront';
import { dice, seeded } from './warfrontSim';

const own = (G: WarState, p: string, ts: string[], n = 1) => ts.forEach((t) => { G.owner[t] = p; G.armies[t] = n; });
/** A 3-player game in the attack stage of player 0, with every territory owned by player 2 (1 army) unless set. */
function battleGame(): WarState {
  const G = newGame(3, 'domination', seeded(1), { autoDeploy: true });
  own(G, '2', TERRITORY_IDS);
  own(G, '1', ['PAM']);
  G.stage = 'attack';
  G.current = '0';
  G.order = ['0', '1', '2'];
  G.setupLeft = { 0: 0, 1: 0, 2: 0 };
  return G;
}

describe('map', () => {
  it('has 42 territories in 6 continents with the classic bonuses', () => {
    expect(TERRITORY_IDS).toHaveLength(42);
    expect(CONTINENTS.map((c) => c.bonus).sort((a, b) => a - b)).toEqual([2, 2, 3, 5, 5, 7]);
    expect(Object.values(CONT_TERRS).flat()).toHaveLength(42);
  });
  it('adjacency is symmetric, never self, and the whole board is connected', () => {
    for (const t of TERRITORY_IDS) for (const n of ADJ[t]) { expect(ADJ[n]).toContain(t); expect(n).not.toBe(t); }
    const seen = new Set(['AK']), q = ['AK'];
    while (q.length) for (const n of ADJ[q.pop()!]) if (!seen.has(n)) { seen.add(n); q.push(n); }
    expect(seen.size).toBe(42);
  });
  it('every territory has a shape and continents are entered through few gates', () => {
    for (const t of TERRITORY_IDS) expect(TERRITORY_PATHS[t].length).toBeGreaterThan(20);
    const gates = (c: string) => CONT_TERRS[c as 'sa'].filter((t) => ADJ[t].some((n) => !CONT_TERRS[c as 'sa'].includes(n))).length;
    expect(gates('sa')).toBe(2);
    expect(gates('oc')).toBe(1);
    expect(gates('na')).toBe(3);
  });
  it('keeps the reviewed border list (changing the map is deliberate)', () => {
    expect(TERRITORY_IDS.reduce((s, t) => s + ADJ[t].length, 0) / 2).toBe(77);
  });
});

describe('cards', () => {
  it('trade values escalate 4 6 8 10 12 15 20 25', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(tradeValue)).toEqual([4, 6, 8, 10, 12, 15, 20, 25]);
  });
  it('sets: three alike, one of each, or two plus a wild', () => {
    const c = (kind: Card['kind']): Card => ({ id: Math.random().toString(), t: null, kind });
    expect(isSet([c('inf'), c('inf'), c('inf')])).toBe(true);
    expect(isSet([c('inf'), c('arm'), c('art')])).toBe(true);
    expect(isSet([c('inf'), c('inf'), c('wild')])).toBe(true);
    expect(isSet([c('inf'), c('inf'), c('arm')])).toBe(false);
    expect(DECK).toHaveLength(44);
    expect(DECK.filter((d) => d.kind === 'inf')).toHaveLength(14);
  });
  it('any five cards hold a set', () => {
    const rng = seeded(9);
    for (let i = 0; i < 300; i++) {
      const hand = [...DECK].sort(() => rng() - 0.5).slice(0, 5);
      expect(setsIn(hand).length).toBeGreaterThan(0);
    }
  });
});

describe('setup', () => {
  it('deals armies by player count and keeps the neutral army in two-player games', () => {
    for (const [n, start] of [[3, 35], [4, 30], [5, 25], [6, 20]]) {
      const G = newGame(n, 'domination', seeded(n), { autoDeploy: true });
      expect(G.stage).toBe('place');
      for (const p of G.players) expect(territoriesOf(G, p).length + G.setupLeft[p]).toBe(start);
    }
    const G = newGame(2, 'mission', seeded(2));
    expect(G.mode).toBe('domination');
    expect(territoriesOf(G, NEUTRAL)).toHaveLength(14);
    expect(G.setupLeft[NEUTRAL]).toBe(26);
  });
  it('claims one territory at a time in turn order, then places one army at a time', () => {
    const G = newGame(3, 'domination', seeded(3), { autoDeploy: false });
    expect(G.stage).toBe('claim');
    const first = G.current;
    expect(act(G, first, { type: 'claim', t: 'AK' }, seeded(1))).toBeNull();
    expect(G.current).toBe(G.order[1]);
    expect(act(G, G.current, { type: 'claim', t: 'AK' }, seeded(1))).toBe('taken');
    let i = 1;
    for (const t of TERRITORY_IDS.filter((t) => t !== 'AK')) { expect(act(G, G.current, { type: 'claim', t }, seeded(1))).toBeNull(); i++; }
    expect(G.stage).toBe('place');
    expect(G.current).toBe(G.order[42 % 3]);
    const p = G.current, t = territoriesOf(G, p)[0];
    expect(act(G, p, { type: 'place', t }, seeded(1))).toBeNull();
    expect(G.armies[t]).toBe(2);
    expect(G.current).not.toBe(p);
  });
  it('two players place two of their own and one neutral army per turn', () => {
    const G = newGame(2, 'domination', seeded(4));
    const p = G.current, t = territoriesOf(G, p)[0];
    act(G, p, { type: 'place', t }, seeded(1));
    expect(act(G, p, { type: 'placeNeutral', t: territoriesOf(G, NEUTRAL)[0] }, seeded(1))).toBe('no neutral to place');
    act(G, p, { type: 'place', t }, seeded(1));
    expect(act(G, p, { type: 'place', t }, seeded(1))).toBe('not placing');
    expect(act(G, p, { type: 'placeNeutral', t: territoriesOf(G, NEUTRAL)[0] }, seeded(1))).toBeNull();
    expect(G.current).not.toBe(p);
  });
  it('starts the first turn once every army is placed', () => {
    const G = newGame(4, 'domination', seeded(5), { autoDeploy: true });
    for (let k = 0; k < 4; k++) act(G, G.current, { type: 'autoPlace' }, seeded(k));
    expect(G.stage).toBe('reinforce');
    expect(G.current).toBe(G.order[0]);
    expect(G.round).toBe(1);
  });
});

describe('turns', () => {
  it('reinforcements: territories / 3 (at least 3) plus continent bonuses', () => {
    const G = battleGame();
    own(G, '0', ['AK']);
    expect(reinforcementsFor(G, '0')).toBe(3);
    own(G, '0', CONT_TERRS.sa);
    own(G, '0', CONT_TERRS.oc);
    own(G, '0', ['GL', 'ICL', 'UK', 'SCA']);
    expect(territoriesOf(G, '0')).toHaveLength(13);
    expect(reinforcementsFor(G, '0')).toBe(4 + 2 + 2);
  });
  it('must trade at five cards, and a traded territory you own gets two armies', () => {
    const G = battleGame();
    own(G, '0', ['AK', 'CAS'], 3);
    G.stage = 'reinforce';
    G.reinforcements = 3;
    G.hands['0'] = DECK.filter((c) => ['AK', 'NWT', 'GL', 'CAS', 'PLN'].includes(c.id));
    expect(act(G, '0', { type: 'deploy', alloc: { AK: 3 } }, seeded(1))).toBe('trade cards first');
    expect(act(G, '0', { type: 'trade', cards: ['AK', 'NWT', 'GL'] }, seeded(1))).toBeNull();
    expect(G.reinforcements).toBe(7);
    expect(G.armies.AK).toBe(5);
    expect(act(G, '0', { type: 'deploy', alloc: { AK: 3, CAS: 3 } }, seeded(1))).toBe('place every army');
    expect(act(G, '0', { type: 'deploy', alloc: { AK: 4, CAS: 3 } }, seeded(1))).toBeNull();
    expect(G.stage).toBe('attack');
  });
  it('dice: highest pairs compared, ties to the defender', () => {
    const G = battleGame();
    own(G, '0', ['AK'], 10);
    own(G, '2', ['OKH'], 5);
    // attacker 6 5 1 vs defender 5 5 -> defender loses one (6>5), attacker loses one (5=5)
    expect(act(G, '0', { type: 'attack', from: 'AK', to: 'OKH', dice: 3 }, dice(6, 5, 1, 5, 5))).toBeNull();
    expect(G.armies.AK).toBe(9);
    expect(G.armies.OKH).toBe(4);
    expect(G.battle!.rolls[0]).toEqual({ att: [6, 5, 1], def: [5, 5] });
    expect(act(G, '0', { type: 'attack', from: 'AK', to: 'OKH', dice: 4 }, seeded(1))).toBe('bad dice');
    expect(act(G, '0', { type: 'attack', from: 'AK', to: 'GL', dice: 1 }, seeded(1))).toBe('bad attack');
  });
  it('conquest moves at least the dice rolled; a card is drawn at the end of a turn with a conquest', () => {
    const G = battleGame();
    own(G, '0', ['AK'], 6);
    own(G, '2', ['OKH'], 1);
    act(G, '0', { type: 'attack', from: 'AK', to: 'OKH', dice: 2 }, dice(6, 6, 1));
    expect(G.stage).toBe('occupy');
    expect(act(G, '0', { type: 'occupy', n: 1 }, seeded(1))).toBe('bad count');
    expect(act(G, '0', { type: 'occupy', n: 3 }, seeded(1))).toBeNull();
    expect([G.armies.AK, G.armies.OKH, G.owner.OKH]).toEqual([3, 3, '0']);
    expect(act(G, '0', { type: 'endTurn' }, seeded(1))).toBeNull();
    expect(G.hands['0']).toHaveLength(1);
    expect(G.current).toBe('1');
    expect(G.stage).toBe('reinforce');
  });
  it('blitz rolls until the territory falls or one army is left', () => {
    const G = battleGame();
    own(G, '0', ['AK'], 3);
    own(G, '2', ['OKH'], 4);
    act(G, '0', { type: 'blitz', from: 'AK', to: 'OKH' }, dice(1, 1, 6, 6));
    expect(G.armies.AK).toBe(1);
    expect(G.battle!.blitz).toBe(true);
    expect(G.stage).toBe('attack');
  });
  it('eliminating a player takes their cards; six or more forces a trade down to four mid-turn', () => {
    const G = battleGame();
    own(G, '0', ['CAR'], 10);
    own(G, '1', ['PAM'], 1);
    own(G, '0', ['AND'], 1);
    G.hands['0'] = DECK.slice(0, 3);
    G.hands['1'] = DECK.slice(3, 6);
    act(G, '0', { type: 'attack', from: 'AND', to: 'PAM', dice: 1 }, dice(6, 1));
    // AND had only 1 army: the attack was refused
    expect(G.owner.PAM).toBe('1');
    own(G, '0', ['AND'], 5);
    act(G, '0', { type: 'attack', from: 'AND', to: 'PAM', dice: 3 }, dice(6, 6, 6, 1));
    expect(G.out).toEqual(['1']);
    expect(G.hands['0']).toHaveLength(6);
    act(G, '0', { type: 'occupy', n: 3 }, seeded(1));
    expect(G.stage).toBe('reinforce');
    expect(G.forced).toBe(true);
    expect(act(G, '0', { type: 'deploy', alloc: {} }, seeded(1))).toBe('trade cards first');
    const set = setsIn(G.hands['0'])[0];
    expect(act(G, '0', { type: 'trade', cards: set }, seeded(1))).toBeNull();
    expect(act(G, '0', { type: 'trade', cards: setsIn(G.hands['0'])[0] ?? [] }, seeded(1))).toBe('no trade needed');
    expect(act(G, '0', { type: 'deploy', alloc: { CAR: G.reinforcements } }, seeded(1))).toBeNull();
    expect(G.stage).toBe('attack');
  });
  it('fortify moves once along your own connected territories and ends the turn', () => {
    const G = battleGame();
    own(G, '0', ['AK', 'CAS', 'PLN'], 4);
    own(G, '0', ['GL'], 1);
    expect([...connected(G, 'AK')].sort()).toEqual(['AK', 'CAS', 'PLN']);
    expect(act(G, '0', { type: 'fortify', from: 'AK', to: 'GL', n: 1 }, seeded(1))).toBe('not connected');
    expect(act(G, '0', { type: 'fortify', from: 'AK', to: 'PLN', n: 4 }, seeded(1))).toBe('bad count');
    expect(act(G, '0', { type: 'fortify', from: 'AK', to: 'PLN', n: 3 }, seeded(1))).toBeNull();
    expect([G.armies.AK, G.armies.PLN, G.current]).toEqual([1, 7, '1']);
  });
  it('wins by world domination when the last opponent falls', () => {
    const G = newGame(2, 'domination', seeded(7));
    for (const t of TERRITORY_IDS) { G.owner[t] = t === 'OKH' ? '1' : t === 'AK' ? '0' : NEUTRAL; G.armies[t] = 1; }
    G.armies.AK = 5; G.stage = 'attack'; G.current = '0';
    act(G, '0', { type: 'attack', from: 'AK', to: 'OKH', dice: 3 }, dice(6, 6, 6, 1));
    expect(G.result).toEqual({ winner: '0', reason: 'domination' });
    expect(G.stage).toBe('over');
  });
  it('wins a secret mission on your own turn', () => {
    const G = battleGame();
    G.mode = 'mission';
    G.missions = { 0: { kind: 'conts', conts: ['sa', 'oc'], plus: false }, 1: { kind: 'count', n: 24 }, 2: { kind: 'count', n: 24 } };
    own(G, '0', [...CONT_TERRS.sa.filter((t) => t !== 'PAM'), ...CONT_TERRS.oc], 3);
    own(G, '1', ['PAM'], 1);
    own(G, '1', ['GL'], 1);
    act(G, '0', { type: 'attack', from: 'AND', to: 'PAM', dice: 2 }, dice(6, 6, 1));
    expect(G.result).toEqual({ winner: '0', reason: 'mission' });
  });
  it('a destroy mission whose target falls to someone else becomes 24 territories', () => {
    const G = battleGame();
    G.mode = 'mission';
    G.missions = { 0: { kind: 'destroy', target: '1' }, 1: { kind: 'count', n: 30 }, 2: { kind: 'count', n: 30 } };
    resign(G, '1');
    own(G, "0", TERRITORY_IDS.slice(1, 24), 2);
    own(G, '0', ['OKH'], 1);
    own(G, '2', ['AK'], 1);
    act(G, '0', { type: 'endTurn' }, seeded(1));
    act(G, '2', { type: 'deploy', alloc: { AK: G.reinforcements } }, seeded(1));
    act(G, '2', { type: 'endTurn' }, seeded(1));
    expect(G.current).toBe('0');
    act(G, '0', { type: 'deploy', alloc: { OKH: G.reinforcements } }, seeded(1));
    expect(G.result?.reason).toBe('mission');
  });
  it('resigning hands territory to the neutral army; the last one standing wins', () => {
    const G = newGame(3, 'domination', seeded(8), { autoDeploy: true });
    const p = G.current;
    resign(G, p);
    expect(territoriesOf(G, p)).toHaveLength(0);
    expect(G.current).not.toBe(p);
    resign(G, G.current);
    expect(G.result?.reason).toBe('resign');
  });
});

describe('view', () => {
  it('shows only my cards and mission; others are counts', () => {
    const G = newGame(3, 'mission', seeded(10), { autoDeploy: true });
    G.hands['1'] = DECK.slice(0, 2);
    const v = viewFor(G, '0');
    expect(v.hands['1']).toEqual([]);
    expect(v.handCount['1']).toBe(2);
    expect(Object.keys(v.missions!)).toEqual(['0']);
    expect(JSON.stringify(v)).not.toContain('"deck"');
    const spectator = viewFor(G, null);
    expect(Object.keys(spectator.missions!)).toEqual([]);
  });
});
