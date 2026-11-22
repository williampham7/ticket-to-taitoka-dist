import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { BobolandGame, MAPS, type GState } from '@boboland/shared';
import { gameOnMap } from './setupGame';

describe('gameOnMap (pass-and-play: the local Client cannot pass setupData)', () => {
  it('sets the game up on the chosen map', () => {
    for (const map of ['china', 'europe', 'usa'] as const) {
      const client = Client({ game: gameOnMap(BobolandGame, map), numPlayers: 2 });
      client.start();
      const G = client.getState()!.G as GState;
      expect(G.mapId).toBe(map);
      const ids = new Set(MAPS[map].tickets.map((t) => t.id));
      expect(G.ticketDeck.every((t) => ids.has(t))).toBe(true);
      client.stop();
    }
  });
});
