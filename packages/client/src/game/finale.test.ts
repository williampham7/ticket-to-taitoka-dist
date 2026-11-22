import { describe, expect, it } from 'vitest';
import { ROUTES, ROUTE_POINTS, type FinalResult, type PlayerResult } from '@boboland/shared';
import { finaleScript, places, podiumOrder, type FinaleInput } from './finale';
import { formatDuration } from './Stopwatch';

const pr = (over: Partial<PlayerResult>): PlayerResult => ({
  routePoints: 0, ticketPoints: 0, completed: 0, failed: 0, longest: 0, bonus: 0, total: 0, tickets: [], ...over,
});

const result: FinalResult = {
  longest: 12,
  winners: ['1'],
  players: {
    '0': pr({ routePoints: 40, ticketPoints: 8 - 25, tickets: [{ id: 'T-LV-AMA', done: true }, { id: 'T-SF-ATL', done: false }], bonus: 0, total: 40 + 8 - 25 }),
    '1': pr({ routePoints: 30, ticketPoints: 9, tickets: [{ id: 'T-BIL-ABQ', done: true }], bonus: 10, total: 30 + 9 + 10 }),
  },
};

/** Real route ids whose points add up to exactly `n` (1-point routes, repeated if need be). */
function routesWorth(n: number): string[] {
  const ones = ROUTES.filter((r) => ROUTE_POINTS[r.length] === 1).map((r) => r.id);
  return Array.from({ length: n }, (_, i) => ones[i % ones.length]);
}

describe('end-of-game finale script', () => {
  const input: FinaleInput = {
    order: ['0', '1'],
    result,
    routes: { '0': routesWorth(40), '1': routesWorth(30) },
    paths: { '0': { 'T-LV-AMA': ['R1'], 'T-SF-ATL': [] }, '1': { 'T-BIL-ABQ': ['R2', 'R3'] } },
    longest: { '0': ['A'], '1': ['B', 'C'] },
  };
  const beats = finaleScript(input);

  it('opens with the banner, then all routes, then all tickets, then the longest path', () => {
    expect(beats[0].kind).toBe('banner');
    const kinds = beats.map((b) => `${b.kind}:${b.active.join()}`);
    const squash = kinds.filter((k, i) => k !== kinds[i - 1]);
    expect(squash).toEqual([
      'banner:', 'intro:0', 'route:0', 'intro:1', 'route:1', 'intro:0', 'ticket:0', 'intro:1', 'ticket:1', 'longest:1',
    ]);
    expect(beats.map((b) => b.phase).filter((p, i, a) => p !== a[i - 1])).toEqual(['banner', 'routes', 'tickets', 'bonus']);
  });

  it('every route is counted before any ticket', () => {
    const lastRoute = beats.map((b) => b.kind).lastIndexOf('route');
    const firstTicket = beats.findIndex((b) => b.kind === 'ticket');
    expect(lastRoute).toBeLessThan(firstTicket);
    // when the tickets start, every player's counter shows their route points
    expect(beats[firstTicket].totals['1']).toBe(30);
  });

  it('counts every route and ticket, ending at each final total', () => {
    expect(beats.at(-1)!.totals).toEqual({ '0': result.players['0'].total, '1': result.players['1'].total });
    const lastRoute0 = beats.filter((b) => b.kind === 'route' && b.active[0] === '0').at(-1)!;
    expect(lastRoute0.totals['0']).toBe(40);
    const t0 = beats.filter((b) => b.kind === 'ticket' && b.active[0] === '0');
    expect(t0.map((b) => [b.ticket!.id, b.delta, b.totals['0']])).toEqual([['T-LV-AMA', 8, 48], ['T-SF-ATL', -25, 23]]);
    expect(t0[0].routes).toEqual(['R1']);
    expect(t0[1].routes).toEqual([]);
    expect(t0[1].cities).toEqual(['SF', 'ATL']);
    // tickets stay out until the player's last one is counted
    expect(t0.map((b) => b.shown!.map((x) => x.id))).toEqual([['T-LV-AMA'], ['T-LV-AMA', 'T-SF-ATL']]);
    expect(t0[1].ms).toBeGreaterThan(t0[0].ms);
    // nobody else's counter moves while one player is being counted
    expect(t0.every((b) => b.totals['1'] === 30)).toBe(true);
    const r0 = beats.filter((b) => b.kind === 'route' && b.active[0] === '0');
    expect(r0.every((b) => b.totals['1'] === 0)).toBe(true);
  });

  it("the longest-path beat lights up the winner's trail and awards the bonus", () => {
    const last = beats.at(-1)!;
    expect(last.active).toEqual(['1']);
    expect(last.routes).toEqual(['B', 'C']);
    expect(last.delta).toBe(10);
  });

  it('keeps each player to roughly 10-20 seconds, even with many routes and tickets', () => {
    const many: FinaleInput = {
      ...input,
      routes: { '0': Array.from({ length: 25 }, () => 'PHX-ELP'), '1': [] },
      result: { ...result, players: { ...result.players, '0': { ...result.players['0'], tickets: Array.from({ length: 12 }, () => ({ id: 'T-LV-AMA', done: true })) } } },
    };
    const b = finaleScript(many);
    const time = (pid: string) => b.filter((x) => x.kind !== 'banner' && x.kind !== 'longest' && x.active[0] === pid).reduce((s, x) => s + x.ms, 0);
    expect(time('0')).toBeLessThanOrEqual(20_000);
    expect(time('0')).toBeGreaterThanOrEqual(10_000);
    expect(time('1')).toBeGreaterThanOrEqual(2000);
  });
});

describe('podium', () => {
  it('winners first, then by total, completed tickets and bonus', () => {
    expect(podiumOrder(result)).toEqual(['1', '0']);
  });

  it('places: winners share first; others follow', () => {
    expect(places(result)).toEqual({ '1': 1, '0': 2 });
    const tie: FinalResult = { ...result, winners: ['0', '1'] };
    expect(places(tie)).toEqual({ '0': 1, '1': 1 });
  });
});

describe('game clock', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });
});
