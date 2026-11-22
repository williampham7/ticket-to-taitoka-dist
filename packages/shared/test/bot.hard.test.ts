import { describe, expect, it } from 'vitest';
import { ROUTE_BY_ID } from '../src/map';
import { hard } from '../src/bot/levels/hard';
import { medium } from '../src/bot/levels/medium';
import { blockValues, estimateScores, modelOpponents } from '../src/bot/opponents';
import { components, planNetwork, ROUTE_INDEX } from '../src/bot/plan';
import type { Card, GState } from '../src/types';
import { emptyHand, makeState, player } from './helpers';

const rng = () => 0.5;

/**
 * Opponent '1' has built Amarillo → Taitoka → Denver → Salt Lake City → Boise: Spokane–Amarillo is the obvious ticket,
 * and with Seattle–Spokane and Spokane–Billings mine, Spokane–Boise (red 3) is their only way in.
 */
function blockState(over: { hand?: Partial<Record<Card, number>>; tickets?: string[]; claims?: Record<string, string>; trains?: number } = {}): GState {
  return makeState({
    claims: { 'AMA-BOB': '1', 'DEN-BOB': '1', 'SLC-DEN': '1', 'BOI-SLC': '1', 'SEA-SPO': '0', 'SPO-BIL': '0', ...over.claims },
    players: {
      '0': player({ hand: emptyHand(over.hand ?? { red: 3 }), tickets: over.tickets ?? [], trains: over.trains ?? 40, score: 15 }),
      '1': player({ trains: 30, score: 40, handCount: 5, ticketCount: 1 }),
    },
    market: ['orange', 'orange', 'yellow', 'white', 'green'],
    deckCount: 40,
    discardCount: 10,
    ticketDeckCount: 15,
  });
}

describe('opponent model', () => {
  it('guesses the ticket their network points at and prices the block', () => {
    const v = blockState();
    const [m] = modelOpponents(v, '0');
    expect(m.likely[0].id).toBe('T-SPO-AMA');
    const est = estimateScores(v, '0', [m], planNetwork(v, '0', []), components(v, '0'));
    const blocks = blockValues(v, '0', [m], est);
    expect(blocks.get(ROUTE_INDEX.get('SPO-BOI')!)).toBeGreaterThan(10);
  });
});

describe('hard policy', () => {
  it('blocks a cheap route that is a rival\'s only link to an obvious ticket city when its own move is minor', () => {
    const v = blockState();
    expect(hard.turn(v, '0', rng)).toEqual({ move: 'claimRoute', args: ['SPO-BOI', 'red'] });
    // Medium doesn't read the opponent: it draws tickets instead
    expect(medium.turn(v, '0', () => 0.99).move).not.toBe('claimRoute');
  });

  it('does not block when it has an urgent claim of its own', () => {
    // El Paso hangs on ABQ-ELP once the opponent holds PHX-ELP and ELP-SAT
    const v = blockState({ hand: { red: 3 }, tickets: ['T-LA-ELP'], claims: { 'PHX-ELP': '1', 'ELP-SAT': '1' } });
    expect(hard.turn(v, '0', rng)).toEqual({ move: 'claimRoute', args: ['ABQ-ELP', 'red'] });
  });

  it('never spends a whole turn on a face-up locomotive', () => {
    const v = blockState({ hand: {}, tickets: ['T-LA-ELP'], claims: { 'PHX-ELP': '1', 'ELP-SAT': '1' } });
    v.market = ['locomotive', 'orange', 'orange', 'yellow', 'yellow'];
    const m = hard.turn(v, '0', rng);
    expect(m.move === 'drawFaceUp' && v.market[m.args[0]] === 'locomotive').toBe(false);
  });

  it('with its tickets done and trains running low, lays a long route rather than drawing tickets', () => {
    const v = makeState({
      claims: {},
      players: {
        '0': player({ hand: emptyHand({ red: 6 }), tickets: [], trains: 20 }),
        '1': player({ trains: 30, handCount: 5, ticketCount: 3 }),
      },
      market: ['orange', 'orange', 'yellow', 'white', 'green'],
      deckCount: 40,
      discardCount: 10,
      ticketDeckCount: 15,
    });
    const m = hard.turn(v, '0', rng);
    expect(m.move).toBe('claimRoute');
    expect(ROUTE_BY_ID[(m.args as [string, Card])[0]].length).toBeGreaterThanOrEqual(4);
    expect(medium.turn(v, '0', () => 0.99).move).toBe('drawTickets');
  });

  it('plans through routes it already owns', () => {
    // Seattle–Spokane and Seattle–Portland are mine: only Portland–San Francisco is left, no Boise detour
    const v = blockState({ claims: { 'SEA-POR': '0' }, tickets: ['T-SPO-SF'] });
    const plan = planNetwork(v, '0', ['T-SPO-SF']);
    expect(plan.routes.has('SPO-BOI')).toBe(false);
    expect(plan.routes.has('POR-BOI')).toBe(false);
    expect([...plan.routes].some((id) => id.startsWith('POR-SF'))).toBe(true);
  });
});
