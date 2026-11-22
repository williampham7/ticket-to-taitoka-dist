import { describe, expect, it } from 'vitest';
import { startBotGame, levelsFor, type BotGame } from './botRunner';
import { MAPS, MAP_ID, DEFAULT_MAP_ID } from '../src/map';
import { EDITION_IDS, EDITIONS } from '../src/editions';

const ROUNDS = 30;

/**
 * One process, many maps: each round runs one bot game per edition (USA, China, Europe) side by side, one move
 * at a time in turn, so the active map changes before nearly every move (as on a busy server).
 */
describe('mixed-map bot games in one process', () => {
  it(`plays ${ROUNDS} rounds of every edition interleaved, all to the end, each on its own map`, () => {
    for (let i = 0; i < ROUNDS; i++) {
      const games = EDITION_IDS.map((e, k): [string, BotGame] => {
        const map = EDITIONS[e].map;
        return [map, startBotGame(i * EDITION_IDS.length + k, levelsFor(i * EDITION_IDS.length + k), map)];
      });
      let live = games.slice();
      while (live.length) live = live.filter(([, g]) => g.step());
      for (const [map, g] of games) {
        const G = g.G;
        expect(G.result, `round ${i} ${map}`).not.toBeNull();
        expect(G.mapId).toBe(map);
        const routes = new Set(MAPS[map as keyof typeof MAPS].routes.map((r) => r.id));
        const tickets = new Set(MAPS[map as keyof typeof MAPS].tickets.map((t) => t.id));
        expect(Object.keys(G.claims).length).toBeGreaterThan(0);
        for (const r of Object.keys(G.claims)) expect(routes.has(r), `${map}: route ${r}`).toBe(true);
        for (const p of Object.values(G.players)) for (const t of [...p.tickets, ...p.pending]) expect(tickets.has(t), `${map}: ticket ${t}`).toBe(true);
        for (const t of G.ticketDeck) expect(tickets.has(t)).toBe(true);
        for (const t of Object.values(G.result!.players).flatMap((p) => p.tickets)) expect(tickets.has(t.id)).toBe(true);
      }
      expect(MAP_ID).toBe(DEFAULT_MAP_ID);
    }
  }, 900_000);
});
