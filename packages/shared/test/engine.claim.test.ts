import { describe, expect, it } from 'vitest';
import { claimRoute, paymentOptions, routeOpen, ROUTE_POINTS } from '../src/engine/claim';
import { dealTickets, keepTickets } from '../src/engine/tickets';
import { ROUTE_BY_ID } from '../src/map';
import { emptyHand, L, makeState } from './helpers';

describe('route scoring table', () => {
  it('scores 1/2/4/7/10/15 for lengths 1-6', () => {
    expect(ROUTE_POINTS.slice(1)).toEqual([1, 2, 4, 7, 10, 15]);
  });
});

describe('payment options', () => {
  const red2 = ROUTE_BY_ID['STL-MEM']; // red, length 2
  const gray2 = ROUTE_BY_ID['AMA-OKC']; // gray, length 2

  it('a coloured route takes its colour, topped up with locomotives', () => {
    expect(paymentOptions(emptyHand({ red: 2 }), red2)).toEqual(['red']);
    expect(paymentOptions(emptyHand({ red: 1, locomotive: 1 }), red2)).toEqual(['red']);
    expect(paymentOptions(emptyHand({ blue: 5 }), red2)).toEqual([]);
  });

  it('all-locomotive payment is offered when there are enough locomotives', () => {
    expect(paymentOptions(emptyHand({ locomotive: 2 }), red2)).toEqual(['locomotive']);
    expect(paymentOptions(emptyHand({ red: 2, locomotive: 2 }), red2)).toEqual(['red', 'locomotive']);
  });

  it('paymentOptions gray lists exactly the colours that can pay', () => {
    expect(paymentOptions(emptyHand({ red: 2, blue: 1, locomotive: 1 }), gray2)).toEqual(['blue', 'red']);
    expect(paymentOptions(emptyHand({ red: 2, blue: 1, locomotive: 2 }), gray2)).toEqual(['blue', 'red', 'locomotive']);
    expect(paymentOptions(emptyHand({ red: 1 }), gray2)).toEqual([]);
  });
});

describe('claiming routes', () => {
  it('spends the cards and trains, scores the route and records the claim', () => {
    const G = makeState();
    G.players['0'].hand = emptyHand({ red: 1, locomotive: 3 });
    expect(claimRoute(G, '0', 'STL-MEM', 'red')).toBe('ok');
    const p = G.players['0'];
    expect(p.hand.red).toBe(0);
    expect(p.hand.locomotive).toBe(2);
    expect(p.trains).toBe(43);
    expect(p.score).toBe(2);
    expect(G.claims['STL-MEM']).toBe('0');
    expect(G.discard.sort()).toEqual(['red', L].sort());
  });

  it('a gray route can be paid in any single colour', () => {
    const G = makeState();
    G.players['0'].hand = emptyHand({ green: 2 });
    expect(claimRoute(G, '0', 'AMA-OKC', 'green')).toBe('ok');
    expect(G.players['0'].hand.green).toBe(0);
  });

  it('a route can be paid entirely with locomotives', () => {
    const G = makeState();
    G.players['0'].hand = emptyHand({ locomotive: 6 });
    expect(claimRoute(G, '0', 'SPO-BIL', 'locomotive')).toBe('ok');
    expect(G.players['0'].score).toBe(15);
    expect(G.players['0'].trains).toBe(39);
  });

  it('rejects too few matching cards', () => {
    const G = makeState();
    G.players['0'].hand = emptyHand({ red: 1, blue: 5 });
    expect(claimRoute(G, '0', 'STL-MEM', 'red')).toBe('invalid');
    expect(claimRoute(G, '0', 'STL-MEM', 'blue')).toBe('invalid');
    expect(G.claims['STL-MEM']).toBeUndefined();
  });

  it('rejects a route longer than the trains left', () => {
    const G = makeState();
    G.players['0'].hand = emptyHand({ yellow: 6 });
    G.players['0'].trains = 5;
    expect(claimRoute(G, '0', 'SPO-BIL', 'yellow')).toBe('invalid');
  });

  it('rejects an already claimed route', () => {
    const G = makeState({ claims: { 'STL-MEM': '1' } });
    G.players['0'].hand = emptyHand({ red: 2 });
    expect(claimRoute(G, '0', 'STL-MEM', 'red')).toBe('invalid');
  });

  it('house rule: at any player count both tracks of a double route are usable, one per player', () => {
    for (const n of [2, 3, 4, 5]) {
      const G = makeState({ claims: { 'SF-RNO': '1' } }, n);
      G.players['0'].hand = emptyHand({ green: 2 });
      expect(routeOpen(G, 'SF-RNO-2', '0')).toBe(true);
      expect(routeOpen(G, 'SF-RNO-2', '1')).toBe(false);
      expect(claimRoute(G, '0', 'SF-RNO-2', 'green')).toBe('ok');
    }
  });
});

describe('destination tickets', () => {
  it('deals up to n tickets from the top', () => {
    const G = makeState({ ticketDeck: ['T-POR-SLC', 'T-LV-ELP'] });
    expect(dealTickets(G, '0', 3)).toEqual(['T-POR-SLC', 'T-LV-ELP']);
    expect(G.players['0'].pending).toEqual(['T-POR-SLC', 'T-LV-ELP']);
    expect(G.ticketDeck).toEqual([]);
  });

  it('must keep at least the minimum and returns the rest to the bottom', () => {
    const G = makeState({ ticketDeck: ['T-POR-SLC', 'T-LV-ELP', 'T-NSH-DC', 'T-SF-ATL'] });
    dealTickets(G, '0', 3);
    expect(keepTickets(G, '0', [], 1)).toBe('invalid');
    expect(keepTickets(G, '0', ['T-NOT-DEALT'], 1)).toBe('invalid');
    expect(keepTickets(G, '0', ['T-LV-ELP'], 1)).toBe('ok');
    expect(G.players['0'].tickets).toEqual(['T-LV-ELP']);
    expect(G.players['0'].pending).toEqual([]);
    expect(G.ticketDeck).toEqual(['T-SF-ATL', 'T-POR-SLC', 'T-NSH-DC']);
  });

  it('initial choice must keep at least two', () => {
    const G = makeState({ ticketDeck: ['T-POR-SLC', 'T-LV-ELP', 'T-NSH-DC'] });
    dealTickets(G, '0', 3);
    expect(keepTickets(G, '0', ['T-POR-SLC'], 2)).toBe('invalid');
    expect(keepTickets(G, '0', ['T-POR-SLC', 'T-LV-ELP', 'T-NSH-DC'], 2)).toBe('ok');
  });

  it('when fewer tickets than the minimum were dealt, keeping all of them is enough', () => {
    const G = makeState({ ticketDeck: ['T-POR-SLC'] });
    dealTickets(G, '0', 3);
    expect(keepTickets(G, '0', ['T-POR-SLC'], 2)).toBe('ok');
  });

  it('rejects duplicate ids', () => {
    const G = makeState({ ticketDeck: ['T-POR-SLC', 'T-LV-ELP', 'T-NSH-DC'] });
    dealTickets(G, '0', 3);
    expect(keepTickets(G, '0', ['T-POR-SLC', 'T-POR-SLC'], 2)).toBe('invalid');
  });
});
