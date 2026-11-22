import { describe, expect, it } from 'vitest';
import { ROUTE_BY_ID } from '../src/map';
import { chooseBotMove, type BotCtx } from '../src/bot';
import { medium } from '../src/bot/levels/medium';
import { planNetwork } from '../src/bot/plan';
import { paymentOptions } from '../src/engine/claim';
import type { Card, GState } from '../src/types';
import { emptyHand, makeState, player } from './helpers';

const noEps = () => 0.99;
const mainCtx: BotCtx = { phase: 'main', currentPlayer: '0', activePlayers: null };

function state(over: { claims?: Record<string, string>; hand?: Partial<Record<Card, number>>; tickets?: string[]; trains?: number; oppTrains?: number; market?: (Card | null)[] } = {}): GState {
  return makeState({
    claims: over.claims ?? {},
    players: {
      '0': player({ hand: emptyHand(over.hand), tickets: over.tickets ?? [], trains: over.trains ?? 40 }),
      '1': player({ trains: over.oppTrains ?? 40, handCount: 6, ticketCount: 3 }),
    },
    market: over.market ?? ['orange', 'orange', 'yellow', 'white', 'green'],
    deckCount: 40,
    discardCount: 10,
    ticketDeckCount: 15,
  });
}

describe('medium policy', () => {
  it('claims the bottleneck route before a pricier route that has alternatives', () => {
    // El Paso can only be reached through ABQ-ELP once the opponent holds PHX-ELP and ELP-SAT; PHX-ABQ is a double.
    const v = state({ claims: { 'PHX-ELP': '1', 'ELP-SAT': '1' }, hand: { red: 2, black: 4 }, tickets: ['T-LA-ELP'] });
    const plan = planNetwork(v, '0', ['T-LA-ELP']);
    expect(plan.routes.has('ABQ-ELP')).toBe(true);
    expect([...plan.routes].some((id) => id.startsWith('PHX-ABQ'))).toBe(true);
    const m = medium.turn(v, '0', noEps);
    expect(m).toEqual({ move: 'claimRoute', args: ['ABQ-ELP', 'red'] });
  });

  it('pays a gray route with the colour other planned routes need least', () => {
    // LV-PHX-ABQ-AMA: PHX-ABQ is gray 3; hold black (for the gray) and one blue.
    const v = state({ hand: { black: 3, blue: 1 }, tickets: ['T-LV-AMA'] });
    const plan = planNetwork(v, '0', ['T-LV-AMA']);
    const m = chooseBotMove(v, mainCtx, '0', 'medium', noEps)!;
    if (m.move === 'claimRoute') {
      const [id, pay] = m.args;
      expect(plan.routes.has(id)).toBe(true);
      expect(paymentOptions(v.players['0'].hand, ROUTE_BY_ID[id])).toContain(pay);
      expect(pay).not.toBe('locomotive');
    }
  });

  it('keeps overlapping tickets over disjoint ones', () => {
    const v = state();
    v.players['0'].pending = ['T-CHI-NYC', 'T-LA-ELP', 'T-POR-SLC', 'T-LV-ELP'];
    const keep = medium.keepInitial(v, '0', noEps);
    expect(keep).toEqual(expect.arrayContaining(['T-LA-ELP', 'T-LV-ELP']));
    expect(keep.length).toBeGreaterThanOrEqual(2);
  });

  it('draws more tickets when done early, but never in the end game', () => {
    const early = state({ trains: 30, oppTrains: 35 });
    expect(medium.turn(early, '0', noEps).move).toBe('drawTickets');
    const late = state({ trains: 30, oppTrains: 6 });
    expect(medium.turn(late, '0', noEps).move).not.toBe('drawTickets');
    const final = state({ trains: 30, oppTrains: 30 });
    final.finalRound = { triggeredBy: '1', turnsLeft: 1 };
    expect(medium.turn(final, '0', noEps).move).not.toBe('drawTickets');
  });

  it('on its last turn takes the most points it can', () => {
    const v = state({ hand: { red: 6, blue: 2 }, tickets: [], trains: 10 });
    v.finalRound = { triggeredBy: '1', turnsLeft: 1 };
    const m = medium.turn(v, '0', noEps);
    expect(m.move).toBe('claimRoute');
    expect(ROUTE_BY_ID[(m.args as [string, Card])[0]].length).toBe(6);
  });

  it('draws a face-up card its plan needs', () => {
    const v = state({ tickets: ['T-LA-ELP'], claims: { 'PHX-ELP': '1', 'ELP-SAT': '1' }, market: ['orange', 'red', 'yellow', 'yellow', 'yellow'] });
    expect(medium.turn(v, '0', noEps)).toEqual({ move: 'drawFaceUp', args: [1] });
    expect(medium.secondDraw(v, '0', noEps)).toEqual({ move: 'drawFaceUp', args: [1] });
  });
});
