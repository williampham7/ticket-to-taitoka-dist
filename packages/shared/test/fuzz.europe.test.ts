import { afterAll, describe, expect, it, vi } from 'vitest';

// Choose the Europe map before the game modules load (they pick their map once, at import).
vi.hoisted(() => { process.env.TTB_MAP = 'europe'; });

import { MAP_ID, ROUTES } from '../src/map';
import { playOne } from './fuzzRunner';

const GAMES = 500;

afterAll(() => { delete process.env.TTB_MAP; });

describe('fuzz on the Europe map: random legal play never soft-locks', () => {
  it('runs on the Europe map', () => {
    expect(MAP_ID).toBe('europe');
    expect(ROUTES.length).toBeGreaterThan(80);
  });

  it(`plays ${GAMES} seeded games of 2-5 players to the end`, () => {
    let total = 0;
    for (let i = 0; i < GAMES; i++) total += playOne(i);
    expect(total).toBeGreaterThan(GAMES * 20);
  }, 600_000);
});
