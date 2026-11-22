import { describe, expect, it } from 'vitest';
import { buildDeck, canDrawFirst, canDrawSecond, refillMarket, takeBlind, takeFaceUp } from '../src/engine/deck';
import { createInitialState } from '../src/engine/state';
import { seededShuffle } from '../src/engine/rng';
import { TICKETS } from '../src/map';
import { countCards, identity, L, makeState } from './helpers';

describe('train card deck', () => {
  it('has 112 cards: 14 of each of the 7 colours and 14 locomotives (purple removed)', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(112);
    for (const c of ['blue', 'orange', 'white', 'green', 'yellow', 'black', 'red']) {
      expect(deck.filter((x) => x === c)).toHaveLength(14);
    }
    expect(deck.filter((x) => (x as string) === 'purple')).toHaveLength(0);
    expect(deck.filter((x) => x === L)).toHaveLength(14);
  });

  it('seeded shuffle is deterministic and a permutation', () => {
    const a = seededShuffle('x')([1, 2, 3, 4, 5, 6, 7, 8]);
    const b = seededShuffle('x')([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('initial state', () => {
  it.each([2, 3, 4, 5])('deals 4 cards, 4 pending tickets, 50 trains to each of %i players', (n) => {
    const G = createInitialState(n, seededShuffle('setup'));
    expect(Object.keys(G.players)).toHaveLength(n);
    for (const p of Object.values(G.players)) {
      expect(Object.values(p.hand).reduce((s, x) => s + x, 0)).toBe(4);
      expect(p.pending).toHaveLength(4);
      expect(p.tickets).toHaveLength(0);
      expect(p.trains).toBe(50);
      expect(p.score).toBe(0);
    }
    expect(G.market.filter(Boolean)).toHaveLength(5);
    expect(G.market.filter((c) => c === L).length).toBeLessThan(3);
    expect(G.ticketDeck).toHaveLength(TICKETS.length - 4 * n);
    expect(countCards(G)).toBe(112);
    expect(G.numPlayers).toBe(n);
    expect(typeof G.startedAt).toBe('number');
    expect(G.endedAt).toBeNull();
  });
});

describe('drawing train cards', () => {
  it('a face-up locomotive as the first card ends the draw', () => {
    const G = makeState({ market: [L, 'red', 'blue', 'green', 'white'], deck: ['black', 'black'] });
    expect(takeFaceUp(G, '0', 0, identity)).toBe('endsTurn');
    expect(G.players['0'].hand.locomotive).toBe(1);
    expect(G.market[0]).toBe('black');
    expect(G.draws).toBe(0);
  });

  it('a face-up locomotive cannot be the second card', () => {
    const G = makeState({ market: ['red', L, 'blue', 'green', 'white'], deck: ['black', 'black', 'black'] });
    expect(takeFaceUp(G, '0', 0, identity)).toBe('continue');
    const before = structuredClone(G);
    expect(takeFaceUp(G, '0', 1, identity)).toBe('invalid');
    expect(G).toEqual(before);
  });

  it('a blind draw tells only the drawer which card it was', () => {
    const G = makeState({ deck: ['red', 'blue', 'green'], market: ['red', 'blue', 'green', 'white', 'black'] });
    takeBlind(G, '0', identity);
    expect(G.players['0'].lastDrawn).toEqual({ card: 'red', seq: 1 });
    takeBlind(G, '0', identity);
    expect(G.players['0'].lastDrawn).toEqual({ card: 'blue', seq: 2 });
    expect(G.log.at(-1)).toEqual({ t: 'drawBlind', p: '0' });
  });

  it("a face-up draw logs which slot it came from, for every player's animation", () => {
    const G = makeState({ market: ['red', 'blue', 'green', 'white', 'black'], deck: ['yellow', 'yellow'] });
    takeFaceUp(G, '0', 3, identity);
    expect(G.log.at(-1)).toEqual({ t: 'drawFaceUp', p: '0', card: 'white', slot: 3 });
  });

  it('a blind locomotive counts as a single card', () => {
    const G = makeState({ deck: [L, 'red', 'blue'], market: ['red', 'blue', 'green', 'white', 'black'] });
    expect(takeBlind(G, '0', identity)).toBe('continue');
    expect(G.players['0'].hand.locomotive).toBe(1);
    expect(takeBlind(G, '0', identity)).toBe('endsTurn');
    expect(G.players['0'].hand.red).toBe(1);
    expect(G.draws).toBe(0);
  });

  it('takes a non-locomotive face-up card then a second card', () => {
    const G = makeState({ market: ['red', 'red', 'blue', 'green', 'white'], deck: ['black', 'yellow', 'orange'] });
    expect(takeFaceUp(G, '0', 0, identity)).toBe('continue');
    expect(G.market[0]).toBe('black');
    expect(takeFaceUp(G, '0', 1, identity)).toBe('endsTurn');
    expect(G.players['0'].hand.red).toBe(2);
  });

  it('an empty face-up slot cannot be taken', () => {
    const G = makeState({ market: [null, 'red', null, null, null] });
    expect(takeFaceUp(G, '0', 0, identity)).toBe('invalid');
  });

  it('three face-up locomotives are discarded and the five cards replaced', () => {
    const G = makeState({ market: [L, L, L, 'red', null], deck: ['blue', 'green', 'white', 'black', 'yellow', 'orange', 'red'] });
    refillMarket(G, identity);
    expect(G.market.filter((c) => c === L).length).toBeLessThan(3);
    expect(G.market).toEqual(['green', 'white', 'black', 'yellow', 'orange']);
    expect(G.discard.sort()).toEqual([L, L, L, 'blue', 'red'].sort());
    expect(G.log.some((e) => e.t === 'redeal')).toBe(true);
  });

  it('stops redealing when too few non-locomotives remain (no infinite loop)', () => {
    const G = makeState({ market: [L, L, L, null, null], deck: [L, 'red'] });
    refillMarket(G, identity);
    expect(G.market.filter(Boolean)).toHaveLength(5);
    expect(countCards(G)).toBe(5);
  });

  it('reshuffles the discards when the deck runs out', () => {
    const G = makeState({ deck: [], discard: ['red', 'blue'], market: ['green', 'green', 'green', 'green', 'green'] });
    expect(takeBlind(G, '0', identity)).toBe('continue');
    expect(G.players['0'].hand.red).toBe(1);
    expect(G.discard).toHaveLength(0);
    expect(G.deck).toEqual(['blue']);
  });

  it('cannot draw at all when deck, discards and market are empty', () => {
    const G = makeState();
    expect(canDrawFirst(G)).toBe(false);
    expect(takeBlind(G, '0', identity)).toBe('invalid');
  });

  it('auto-ends turn when no legal second draw', () => {
    const G = makeState({ deck: ['red'], market: [L, L, null, null, null] });
    expect(canDrawFirst(G)).toBe(true);
    expect(takeBlind(G, '0', identity)).toBe('endsTurn');
    expect(canDrawSecond(G)).toBe(false);
    expect(G.draws).toBe(0);
  });

  it('conserves all 112 cards through many draws', () => {
    const shuffle = seededShuffle('conserve');
    const G = createInitialState(3, shuffle);
    for (let i = 0; i < 200; i++) {
      const pid = String(i % 3);
      const r = i % 4 === 0 ? takeFaceUp(G, pid, i % 5, shuffle) : takeBlind(G, pid, shuffle);
      expect(['continue', 'endsTurn', 'invalid']).toContain(r);
      expect(countCards(G)).toBe(112);
      if (i % 7 === 0) {
        // simulate spending cards back to the discards
        const hand = G.players[pid].hand;
        for (const c of Object.keys(hand) as (keyof typeof hand)[]) {
          while (hand[c] > 0) { hand[c]--; G.discard.push(c); }
        }
      }
    }
  });
});
