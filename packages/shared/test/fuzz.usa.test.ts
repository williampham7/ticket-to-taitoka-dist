import { afterAll, describe, expect, it, vi } from 'vitest';

// Choose the USA map before the game modules load (they pick their map once, at import).
vi.hoisted(() => { process.env.TTB_MAP = 'usa'; });

import { MAP_ID, ROUTES } from '../src/map';
import { playOne } from './fuzzRunner';

const GAMES = 500;

afterAll(() => { delete process.env.TTB_MAP; });

describe('fuzz on the USA map: random legal play never soft-locks', () => {
  it('runs on the USA map', () => {
    expect(MAP_ID).toBe('usa');
    expect(ROUTES.some((r) => r.id === 'NOL-MIA')).toBe(true);
  });

  it(`plays ${GAMES} seeded games of 2-5 players to the end`, () => {
    let total = 0;
    for (let i = 0; i < GAMES; i++) total += playOne(i);
    expect(total).toBeGreaterThan(GAMES * 20);
  }, 600_000);
});
