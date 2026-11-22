import { afterAll, describe, expect, it, vi } from 'vitest';

// Choose the map before the game modules load.
vi.hoisted(() => { process.env.TTB_MAP = 'china'; });

import { playBotGame, levelsFor } from './botRunner';

const GAMES = 500;

afterAll(() => { delete process.env.TTB_MAP; });

describe('bot games (china): mixed-level bots never soft-lock', () => {
  it(`plays ${GAMES} seeded games to the end`, () => {
    let total = 0;
    for (let i = 0; i < GAMES; i++) {
      const { moves, G } = playBotGame(i, levelsFor(i));
      expect(G.result).not.toBeNull();
      total += moves;
    }
    expect(total).toBeGreaterThan(GAMES * 20);
  }, 900_000);
});
