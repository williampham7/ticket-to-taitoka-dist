/** Plays whole games with bots; every decision sees only the bot's own playerView. */
import { expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import type { Game } from 'boardgame.io';
import { BobolandGame } from '../src/game';
import { seededRandom } from '../src/engine/rng';
import { chooseBotMove, BOT_LEVELS, type BotLevel } from '../src/bot';
import type { MapId } from '../src/map';
import type { GState } from '../src/types';
import { countCards } from './helpers';

const MAX_MOVES = 3000;

/** Mixed level lineups of 2-5 players, cycling through all three levels. */
export function levelsFor(i: number): BotLevel[] {
  const n = 2 + (i % 4);
  return Array.from({ length: n }, (_, k) => BOT_LEVELS[(i + k * (1 + (i % 2))) % BOT_LEVELS.length]);
}

export interface BotGame {
  /** Plays one bot move; false once the game is over. */
  step(): boolean;
  readonly G: GState;
  readonly moves: number;
}

/** A bot game played one move at a time. With `map`, the game is set up on that map (as setupData would). */
export function startBotGame(i: number, levels: BotLevel[], map?: MapId): BotGame {
  const numPlayers = levels.length;
  const game: Game<GState> = { ...BobolandGame, seed: `bots-${i}` };
  if (map) game.setup = (api, _data) => BobolandGame.setup!(api, { map });
  const client = Client({ game, numPlayers });
  client.start();
  const store = (client as unknown as { store: { getState(): { G: GState; ctx: any } } }).store;
  const rngs = levels.map((_, p) => seededRandom(`bot-moves-${i}-${p}`));
  const view = (G: GState, ctx: any, playerID: string) => BobolandGame.playerView!({ G, ctx, playerID } as never) as GState;

  let moves = 0;
  return {
    get G() { return store.getState().G; },
    get moves() { return moves; },
    step() {
      if (store.getState().ctx.gameover) return false;
      if (++moves > MAX_MOVES) throw new Error(`bot game ${i} (${numPlayers}p) did not finish in ${MAX_MOVES} moves`);
      const { G, ctx } = store.getState();
      const order = ctx.phase === 'chooseTickets' ? Object.keys(G.players) : [ctx.currentPlayer];
      for (const pid of order) {
        const m = chooseBotMove(view(G, ctx, pid), ctx, pid, levels[Number(pid)], rngs[Number(pid)]);
        if (!m) continue;
        client.updatePlayerID(pid);
        const before = JSON.stringify(store.getState().G);
        (client.moves as any)[m.move](...m.args);
        const after = store.getState().G;
        expect(JSON.stringify(after), `bot game ${i}: ${m.move} by ${pid} was rejected`).not.toBe(before);
        expect(countCards(after)).toBe(112);
        for (const p of Object.values(after.players)) expect(p.trains).toBeGreaterThanOrEqual(0);
        return !store.getState().ctx.gameover;
      }
      throw new Error(`bot game ${i}: no bot could act (phase ${ctx.phase})`);
    },
  };
}

export function playBotGame(i: number, levels: BotLevel[], map?: MapId): { moves: number; G: GState } {
  const g = startBotGame(i, levels, map);
  while (g.step());
  expect(g.G.result).not.toBeNull();
  return { moves: g.moves, G: g.G };
}
