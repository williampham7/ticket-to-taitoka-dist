import { describe, expect, it } from 'vitest';
import type { GState } from '@boboland/shared';
import { claimableRoutes, handList, paymentOptionsFor, seatToShow, ticketStatus, whyNot, type Turn } from './selectors';

const hand = (over: Record<string, number> = {}) => ({
  blue: 0, orange: 0, white: 0, green: 0, yellow: 0, black: 0, red: 0, locomotive: 0, ...over,
});
function state(over: Partial<GState> = {}, numPlayers = 2): GState {
  const players: GState['players'] = {};
  for (let i = 0; i < numPlayers; i++) players[String(i)] = { hand: hand(), tickets: [], pending: [], trains: 45, score: 0 };
  return { players, deck: [], discard: [], market: [null, null, null, null, null], ticketDeck: [], claims: {}, draws: 0,
    finalRound: null, log: [], result: null, numPlayers, turnOrder: Array.from({ length: numPlayers }, (_, i) => String(i)), passStreak: 0, startedAt: 0, endedAt: null, ...over };
}

describe('selectors', () => {
  it('paymentOptions gray lists only the colours the hand can actually pay with', () => {
    const G = state();
    G.players['0'].hand = hand({ red: 2, blue: 1, locomotive: 1 });
    expect(paymentOptionsFor(G, '0', 'AMA-OKC')).toEqual(['blue', 'red']);
    G.players['0'].hand = hand({ red: 2, blue: 1, locomotive: 2 });
    expect(paymentOptionsFor(G, '0', 'AMA-OKC')).toEqual(['blue', 'red', 'locomotive']);
  });

  it('the other track of a double route stays claimable for the other player, not its owner', () => {
    const G = state({ claims: { 'SF-RNO': '1' } });
    G.players['0'].hand = hand({ locomotive: 2 });
    G.players['1'].hand = hand({ locomotive: 2 });
    expect(claimableRoutes(G, '0').has('SF-RNO-2')).toBe(true);
    expect(claimableRoutes(G, '1').has('SF-RNO-2')).toBe(false);
  });

  it('ticket status says which tickets are already connected', () => {
    const G = state({ claims: { 'LA-LV': '0', 'LV-PHX': '0', 'PHX-ELP': '0' } });
    G.players['0'].tickets = ['T-LA-ELP', 'T-POR-SLC'];
    expect(ticketStatus(G, '0').map((t) => [t.id, t.done])).toEqual([['T-LA-ELP', true], ['T-POR-SLC', false]]);
  });

  it('pass-and-play shows whoever still has tickets to choose, then the current player', () => {
    const G = state();
    G.players['1'].pendingCount = 3;
    expect(seatToShow(G, { phase: 'chooseTickets', currentPlayer: '0' })).toBe('1');
    G.players['0'].pending = ['T-POR-SLC'];
    expect(seatToShow(G, { phase: 'chooseTickets', currentPlayer: '0' })).toBe('0');
    expect(seatToShow(G, { phase: 'main', currentPlayer: '1' })).toBe('1');
  });

  it('hand list keeps colour order and drops empty colours', () => {
    expect(handList(hand({ red: 2, locomotive: 1, blue: 3 }))).toEqual([['blue', 3], ['red', 2], ['locomotive', 1]]);
  });
});

describe('explaining why an action is not allowed', () => {
  const names = { '0': 'Ana', '1': 'Bo' };
  const myTurn: Turn = { phase: 'main', currentPlayer: '0', stage: undefined, over: false };

  it('not your turn', () => {
    const G = state();
    expect(whyNot.claim(G, '0', 'STL-MEM', { ...myTurn, currentPlayer: '1' }, names)).toBe("It's Bo's turn.");
    expect(whyNot.deck(G, '0', { ...myTurn, currentPlayer: '1' }, names)).toBe("It's Bo's turn.");
  });

  it('tickets must be chosen first', () => {
    expect(whyNot.deck(state(), '0', { ...myTurn, phase: 'chooseTickets' }, names)).toBe('Choose your destination tickets first.');
    expect(whyNot.claim(state(), '0', 'STL-MEM', { ...myTurn, stage: 'chooseTickets' }, names)).toBe('Choose which tickets to keep first.');
  });

  it('after one card you must take a second card', () => {
    const G = state({ ticketDeck: ['T-POR-SLC'] });
    const t = { ...myTurn, stage: 'secondDraw' };
    expect(whyNot.claim(G, '0', 'STL-MEM', t, names)).toBe('You already drew a card this turn. Take one more card to finish.');
    expect(whyNot.tickets(G, '0', t, names)).toBe('You already drew a card this turn. Take one more card to finish.');
  });

  it('a face-up locomotive cannot be the second card', () => {
    const G = state({ market: ['locomotive', 'red', null, null, null] });
    expect(whyNot.faceUp(G, '0', 0, { ...myTurn, stage: 'secondDraw' }, names)).toBe("A face-up locomotive can't be your second card. Take another card or draw from the deck.");
    expect(whyNot.faceUp(G, '0', 1, { ...myTurn, stage: 'secondDraw' }, names)).toBeNull();
    expect(whyNot.faceUp(G, '0', 2, myTurn, names)).toBe('That slot is empty.');
  });

  it('route already claimed, or you own its other track', () => {
    const G = state({ claims: { 'STL-MEM': '1', 'SF-RNO': '0' } });
    expect(whyNot.claim(G, '0', 'STL-MEM', myTurn, names)).toBe('Bo already claimed this route.');
    expect(whyNot.claim(G, '0', 'SF-RNO', myTurn, names)).toBe('You already own this route.');
    expect(whyNot.claim(G, '0', 'SF-RNO-2', myTurn, names)).toBe('You already own the other track between these cities.');
  });

  it('out of trains', () => {
    const G = state();
    G.players['0'].trains = 1;
    G.players['0'].hand = hand({ red: 5 });
    expect(whyNot.claim(G, '0', 'STL-MEM', myTurn, names)).toBe('You only have 1 train left. This route needs 2.');
  });

  it('not enough matching cards', () => {
    const G = state();
    G.players['0'].hand = hand({ red: 1, blue: 1 });
    expect(whyNot.claim(G, '0', 'STL-MEM', myTurn, names)).toBe('You need 2 red cards (locomotives count). You have 1.');
    expect(whyNot.claim(G, '0', 'AMA-OKC', myTurn, names)).toBe('You need 2 cards of one colour (locomotives count). Your best set is 1.');
  });

  it('empty decks', () => {
    expect(whyNot.deck(state(), '0', myTurn, names)).toBe('The deck is empty. Take a face-up card or claim a route.');
    expect(whyNot.tickets(state(), '0', myTurn, names)).toBe('No destination tickets are left.');
  });

  it('allowed actions have no explanation', () => {
    const G = state({ deck: ['red'], ticketDeck: ['T-POR-SLC'] });
    G.players['0'].hand = hand({ red: 2 });
    expect(whyNot.claim(G, '0', 'STL-MEM', myTurn, names)).toBeNull();
    expect(whyNot.deck(G, '0', myTurn, names)).toBeNull();
    expect(whyNot.tickets(G, '0', myTurn, names)).toBeNull();
  });
});

describe('final round bookkeeping', () => {
  it('lists who has already taken their last turn, in play order after the trigger', async () => {
    const { finalTurnsDone } = await import('./selectors');
    expect(finalTurnsDone(null, ['0', '1'])).toEqual([]);
    // player 1 triggered with 2 players: everyone still has a turn
    expect(finalTurnsDone({ triggeredBy: '1', turnsLeft: 2 }, ['0', '1'])).toEqual([]);
    // player 0 has played their last turn, the trigger (1) is still to go
    expect(finalTurnsDone({ triggeredBy: '1', turnsLeft: 1 }, ['0', '1'])).toEqual(['0']);
    // 3 players, trigger 0: order of last turns is 1, 2, 0
    expect(finalTurnsDone({ triggeredBy: '0', turnsLeft: 1 }, ['0', '1', '2'])).toEqual(['1', '2']);
    // a shuffled order 2, 0, 1: after trigger 0 the last turns go 1, 2, 0
    expect(finalTurnsDone({ triggeredBy: '0', turnsLeft: 1 }, ['2', '0', '1'])).toEqual(['1', '2']);
    // order 1, 2, 0, trigger 2: last turns go 0, 1, 2
    expect(finalTurnsDone({ triggeredBy: '2', turnsLeft: 2 }, ['1', '2', '0'])).toEqual(['0']);
  });
});
