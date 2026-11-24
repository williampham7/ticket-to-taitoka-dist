import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import { other, type PlayerID } from './board';
import { applyMove, emptyState, isLegal, outcome, placeArmy, validatePlacement, type FrontlineState, type Placement } from './rules';
import { viewFor } from './view';

export const FRONTLINE_GAME_NAME = 'frontline';

/** setupData a match may be created with: `turnSeconds` = per-turn limit (0 or absent: no limit). */
export interface FrontlineSetupData { turnSeconds?: number }
export const MIN_TURN_SECONDS = 10;
export const MAX_TURN_SECONDS = 3600;

export function validateFrontlineSetupData(d: unknown): string | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== 'object' || Array.isArray(d)) return 'setupData must be an object';
  const t = (d as FrontlineSetupData).turnSeconds;
  if (t === undefined || t === 0) return undefined;
  if (typeof t !== 'number' || !Number.isInteger(t) || t < MIN_TURN_SECONDS || t > MAX_TURN_SECONDS) return 'bad turnSeconds';
  return undefined;
}
const turnLimit = (d: unknown): number | null =>
  validateFrontlineSetupData(d) === undefined ? (d as FrontlineSetupData | undefined)?.turnSeconds || null : null;

/*
 * Hidden information: G always holds the full board; clients only ever get `viewFor` (playerView).
 * Every move is `client: false`, so it runs on the server (or the in-browser Local master) with the full G,
 * never optimistically on a filtered view. `submitSetup` is `redact: true`, so its arguments (the whole
 * placement) reach only the player who sent it; boardgame.io sends the log with args nulled to everyone else.
 */

const submitSetup: Move<FrontlineState> = {
  move: ({ G, playerID }, placement: Placement) => {
    const p = playerID as PlayerID;
    if (G.result || G.ready[p] || validatePlacement(p, placement) !== undefined) return INVALID_MOVE;
    placeArmy(G, p, placement);
    G.ready[p] = true;
    // both ready: a player who starts with no legal move loses at once (both stuck: draw)
    if (G.ready['0'] && G.ready['1']) {
      G.result = outcome(G, other(G.first));
      G.turnStartedAt = Date.now();
      G.startedAt = G.turnStartedAt;
    }
  },
  client: false,
  redact: true,
};

const move: Move<FrontlineState> = {
  move: ({ G, playerID, events }, from: number, to: number) => {
    const p = playerID as PlayerID;
    if (G.result || !isLegal(G, p, { from, to })) return INVALID_MOVE;
    applyMove(G, p, { from, to });
    G.result = outcome(G, p);
    G.turnStartedAt = Date.now();
    events.endTurn();
  },
  client: false,
};

const resign: Move<FrontlineState> = {
  move: ({ G, playerID }) => {
    if (G.result) return INVALID_MOVE;
    G.result = { winner: other(playerID as PlayerID), reason: 'resign' };
  },
  client: false,
};

/** The waiting player wins if the player to move has used up the turn limit (checked on the server clock). */
const claimTimeout: Move<FrontlineState> = {
  move: ({ G, ctx, playerID }) => {
    if (G.result || !G.turnSeconds || G.turnStartedAt === null || playerID === ctx.currentPlayer) return INVALID_MOVE;
    if (Date.now() - G.turnStartedAt < G.turnSeconds * 1000) return INVALID_MOVE;
    G.result = { winner: playerID as PlayerID, reason: 'timeout' };
  },
  client: false,
};

/** Briefing (before any piece is placed): the host (seat 0) sets the turn limit, then starts the setup. */
const setTurnLimit: Move<FrontlineState> = {
  move: ({ G, playerID }, seconds: unknown) => {
    if (playerID !== '0' || validateFrontlineSetupData({ turnSeconds: seconds }) !== undefined) return INVALID_MOVE;
    G.turnSeconds = (seconds as number) || null;
  },
  client: false,
};

const begin: Move<FrontlineState> = {
  move: ({ playerID, events }) => {
    if (playerID !== '0') return INVALID_MOVE;
    events.endPhase();
  },
  client: false,
};

export const FrontlineGame: Game<FrontlineState> = {
  name: FRONTLINE_GAME_NAME,
  minPlayers: 2,
  maxPlayers: 2,
  setup: ({ random }, setupData?: unknown) => ({ ...emptyState(), first: random.Die(2) === 1 ? '0' : '1', turnSeconds: turnLimit(setupData) }),
  validateSetupData: (setupData) => validateFrontlineSetupData(setupData),
  playerView: ({ G, ctx, playerID }) => viewFor(G, ctx.phase, playerID) as unknown as FrontlineState,
  phases: {
    briefing: {
      start: true,
      next: 'setup',
      turn: { activePlayers: ActivePlayers.ALL },
      moves: { setTurnLimit, begin },
    },
    setup: {
      next: 'play',
      turn: { activePlayers: ActivePlayers.ALL },
      moves: { submitSetup, resign },
      endIf: ({ G }) => G.ready['0'] && G.ready['1'] && !G.result,
    },
    play: {
      turn: {
        order: {
          first: ({ G }) => Number(G.first),
          next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
        },
        activePlayers: { currentPlayer: 'act', others: 'idle' },
        stages: {
          act: { moves: { move, resign } },
          idle: { moves: { resign, claimTimeout } },
        },
      },
    },
  },
  endIf: ({ G }) => (G.result ? (G.result.winner === null ? { draw: true } : { winner: G.result.winner }) : undefined),
};
