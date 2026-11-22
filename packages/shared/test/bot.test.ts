import { describe, expect, it } from 'vitest';
import { ROUTES, TICKETS, ROUTE_BY_ID } from '../src/map';
import { botStep, chooseBotMove, legalize, type BotCtx } from '../src/bot';
import { easy } from '../src/bot/levels/easy';
import { hopPath } from '../src/bot/view';
import { legalActions } from '../src/game';
import { paymentOptions } from '../src/engine/claim';
import { seededRandom } from '../src/engine/rng';
import { emptyHand, makeState, player } from './helpers';

const rng = () => seededRandom('bot-test');
const mainCtx = (over: Partial<BotCtx> = {}): BotCtx => ({ phase: 'main', currentPlayer: '0', activePlayers: null, ...over });

describe('botStep', () => {
  it('detects each step', () => {
    const G = makeState({}, 2);
    G.players['0'].pending = ['a', 'b', 'c'];
    expect(botStep(G, { phase: 'chooseTickets', currentPlayer: '0', activePlayers: { '0': 'x', '1': 'x' } }, '0')).toBe('initialTickets');
    expect(botStep(G, { phase: 'chooseTickets', currentPlayer: '0', activePlayers: null }, '1')).toBeNull();
    expect(botStep(G, mainCtx(), '0')).toBe('turn');
    expect(botStep(G, mainCtx(), '1')).toBeNull();
    expect(botStep(G, mainCtx({ activePlayers: { '0': 'chooseTickets' } }), '0')).toBe('tickets');
    expect(botStep(G, mainCtx({ activePlayers: { '0': 'secondDraw' } }), '0')).toBe('secondDraw');
    expect(botStep(G, mainCtx({ gameover: {} }), '0')).toBeNull();
  });
});

describe('legalize', () => {
  const G = makeState({ market: ['red', 'locomotive', null, 'blue', 'blue'], deck: ['red'], ticketDeck: ['x'] }, 2);
  G.players['0'].pending = ['p1', 'p2', 'p3'];
  const view = { ...G, deckCount: 1, discardCount: 0, ticketDeckCount: 1 };
  it('repairs keeps', () => {
    expect(legalize({ move: 'keepInitialTickets', args: [['p1']] }, view, 'initialTickets', '0', rng())).toEqual({ move: 'keepInitialTickets', args: [['p1', 'p2']] });
    expect(legalize({ move: 'keepInitialTickets', args: [['p1', 'p1']] }, view, 'initialTickets', '0', rng()).args[0]).toEqual(['p1', 'p2']);
    expect(legalize({ move: 'keepTickets', args: [['zzz']] }, view, 'tickets', '0', rng())).toEqual({ move: 'keepTickets', args: [['p1']] });
    expect(legalize({ move: 'keepTickets', args: [['p3', 'p2']] }, view, 'tickets', '0', rng()).args[0]).toEqual(['p3', 'p2']);
  });
  it('repairs second draws', () => {
    expect(legalize({ move: 'drawFaceUp', args: [1] }, view, 'secondDraw', '0', rng()).move).toBe('drawBlind');
    expect(legalize({ move: 'drawFaceUp', args: [2] }, view, 'secondDraw', '0', rng()).move).toBe('drawBlind');
    expect(legalize({ move: 'drawFaceUp', args: [0] }, view, 'secondDraw', '0', rng())).toEqual({ move: 'drawFaceUp', args: [0] });
    const empty = { ...view, deckCount: 0 };
    expect(legalize({ move: 'drawBlind', args: [] }, empty, 'secondDraw', '0', rng())).toEqual({ move: 'drawFaceUp', args: [0] });
  });
  it('repairs turns', () => {
    expect(legalize({ move: 'pass', args: [] }, view, 'turn', '0', rng()).move).toBe('drawBlind');
    expect(legalize({ move: 'claimRoute', args: [ROUTES[0].id, 'red'] }, view, 'turn', '0', rng()).move).toBe('drawBlind');
    expect(legalize({ move: 'drawFaceUp', args: [2] }, view, 'turn', '0', rng()).move).toBe('drawBlind');
    expect(legalize({ move: 'drawTickets', args: [] }, { ...view, ticketDeckCount: 0 }, 'turn', '0', rng()).move).toBe('drawBlind');
  });
  it('falls back to a legal claim when the colour is wrong', () => {
    const r = ROUTES.find((x) => x.color !== 'gray')!;
    const p = player({ hand: emptyHand({ [r.color as 'red']: r.length }), trains: 45 });
    const v = makeState({ players: { '0': p, '1': player() }, deck: ['red'] });
    const m = legalize({ move: 'claimRoute', args: [r.id, r.color === 'red' ? 'blue' : 'red'] }, v, 'turn', '0', rng());
    expect(m.move).toBe('claimRoute');
    expect(legalActions(v, '0').claim).toContain((m.args as unknown as [string])[0]);
  });
});

describe('easy policy', () => {
  it('keeps the cheapest tickets', () => {
    const sorted = [...TICKETS].sort((a, b) => a.points - b.points);
    const pend = [sorted[5], sorted[0], sorted[9]].map((t) => t.id);
    const G = makeState({}, 2);
    G.players['0'].pending = pend;
    const r = () => 0.9;
    expect(easy.keepInitial(G, '0', r).sort()).toEqual([sorted[0].id, sorted[5].id].sort());
    expect(easy.keepTickets(G, '0', r)).toEqual([sorted[0].id]);
    const m = chooseBotMove(G, { phase: 'chooseTickets', currentPlayer: '0', activePlayers: {} }, '0', 'easy', r)!;
    expect(m.move).toBe('keepInitialTickets');
  });

  it('claims an affordable route on its ticket path', () => {
    const t = TICKETS[0];
    const G = makeState({ deck: ['red', 'red'], deckCount: 2, discardCount: 0, ticketDeckCount: 0 }, 2);
    const path = hopPath(G, '0', t.a, t.b)!;
    expect(path.length).toBeGreaterThan(0);
    const route = ROUTE_BY_ID[path[0]];
    const colour = route.color === 'gray' ? 'red' : route.color;
    G.players['0'].tickets = [t.id];
    G.players['0'].hand = emptyHand({ [colour]: route.length });
    const m = chooseBotMove(G, mainCtx(), '0', 'easy', () => 0.99)!; // never the random-claim branch
    expect(m.move).toBe('claimRoute');
    const [id, pay] = m.args as [string, string];
    expect(paymentOptions(G.players['0'].hand, ROUTE_BY_ID[id])).toContain(pay);
    expect(path).toContain(id);
  });

  it('never takes a locomotive as the second draw', () => {
    const G = makeState({ market: ['locomotive', 'locomotive', 'red', null, 'locomotive'], deck: ['blue'], deckCount: 1, discardCount: 0 }, 2);
    for (let i = 0; i < 50; i++) {
      const m = chooseBotMove(G, mainCtx({ activePlayers: { '0': 'secondDraw' } }), '0', 'easy', seededRandom(`s${i}`))!;
      if (m.move === 'drawFaceUp') expect(G.market[m.args[0]]).not.toBe('locomotive');
      expect(['drawBlind', 'drawFaceUp']).toContain(m.move);
    }
  });
});
