import { describe, expect, it } from 'vitest';
import { finalScore, rankWinners } from '../src/engine/scoring';
import type { PlayerResult } from '../src/types';
import { makeState } from './helpers';

const res = (over: Partial<PlayerResult>): PlayerResult => ({
  routePoints: 0, ticketPoints: 0, completed: 0, failed: 0, longest: 0, bonus: 0, total: 0, tickets: [], ...over,
});

describe('final scoring', () => {
  it('adds completed tickets, subtracts failed ones and awards the longest path', () => {
    const G = makeState({ claims: { 'LA-LV': '0', 'LV-PHX': '0', 'PHX-ELP': '0', 'STL-MEM': '1' } });
    G.players['0'].score = 2 + 2 + 4;
    G.players['0'].tickets = ['T-LA-ELP'];
    G.players['1'].score = 2;
    G.players['1'].tickets = ['T-POR-SLC'];
    const r = finalScore(G);
    expect(r.players['0']).toMatchObject({ routePoints: 8, ticketPoints: 7, completed: 1, failed: 0, longest: 7, bonus: 10, total: 25 });
    expect(r.players['0'].tickets).toEqual([{ id: 'T-LA-ELP', done: true }]);
    expect(r.players['1']).toMatchObject({ routePoints: 2, ticketPoints: -7, completed: 0, failed: 1, longest: 2, bonus: 0, total: -5 });
    expect(r.longest).toBe(7);
    expect(r.winners).toEqual(['0']);
  });

  it('every player tied for the longest path gets the 10-point bonus', () => {
    const G = makeState({ claims: { 'AMA-OKC': '0', 'STL-MEM': '1' } });
    const r = finalScore(G);
    expect(r.players['0'].bonus).toBe(10);
    expect(r.players['1'].bonus).toBe(10);
  });

  it('nobody gets the bonus when nobody claimed anything', () => {
    const r = finalScore(makeState());
    expect(r.players['0'].bonus).toBe(0);
  });
});

describe('winner and tie-breakers', () => {
  it('most points wins', () => {
    expect(rankWinners({ '0': res({ total: 50 }), '1': res({ total: 49 }) })).toEqual(['0']);
  });

  it('tied on points: most completed tickets wins', () => {
    expect(rankWinners({ '0': res({ total: 50, completed: 2 }), '1': res({ total: 50, completed: 3 }) })).toEqual(['1']);
  });

  it('still tied: the longest-path bonus holder wins', () => {
    expect(rankWinners({ '0': res({ total: 50, completed: 2, bonus: 10 }), '1': res({ total: 50, completed: 2 }) })).toEqual(['0']);
  });

  it('still tied after all tie-breakers: shared win', () => {
    expect(rankWinners({ '0': res({ total: 50, completed: 2, bonus: 10 }), '1': res({ total: 50, completed: 2, bonus: 10 }), '2': res({ total: 10 }) })).toEqual(['0', '1']);
  });
});
