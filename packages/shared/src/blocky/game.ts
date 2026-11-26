import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import { act, dismiss, newGame, resign, type Action, type BState } from './rules';
import { AVATARS, BOARDS, MAX_PLAYERS, MIN_PLAYERS, type Board } from './tuning';
import { viewFor } from './view';

export const BLOCKY_GAME_NAME = 'blocky';

/** setupData a match may be created with. Defaults: Duo for 2 players (else Classic), hints on, no bots. */
export interface BlockySetupData { board?: Board; hints?: boolean; bots?: boolean[]; avatars?: number[] }

const boolList = (x: unknown) => Array.isArray(x) && x.length <= MAX_PLAYERS && x.every((b) => typeof b === 'boolean');
export function validateBlockySetupData(d: unknown, numPlayers?: number): string | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== 'object' || Array.isArray(d)) return 'setupData must be an object';
  const { board, hints, bots, avatars } = d as BlockySetupData;
  if (board !== undefined && !BOARDS.includes(board)) return 'bad board';
  if (board === 'duo' && numPlayers !== undefined && numPlayers !== 2) return 'duo needs exactly 2 players';
  if (hints !== undefined && typeof hints !== 'boolean') return 'bad hints';
  if (bots !== undefined && !boolList(bots)) return 'bad bots';
  if (avatars !== undefined && (!Array.isArray(avatars) || avatars.length > MAX_PLAYERS || avatars.some((a) => !Number.isInteger(a) || a < 0 || a >= AVATARS))) return 'bad avatars';
  return undefined;
}

/*
 * No hidden information: every shelf and board is public, so `viewFor` is the state. Every move is `client: false`.
 * Anyone may act at any time as far as boardgame.io is concerned (resign and dismiss work off turn);
 * the engine checks `G.actor`.
 */
const actMove: Move<BState> = { move: ({ G, playerID }, a: Action) => (act(G, playerID, a) ? INVALID_MOVE : undefined), client: false };
const resignMove: Move<BState> = { move: ({ G, playerID }) => (resign(G, playerID) ? INVALID_MOVE : undefined), client: false };
const dismissMove: Move<BState> = { move: ({ G, playerID }, seat: string) => (dismiss(G, playerID, seat) ? INVALID_MOVE : undefined), client: false };

export const BlockyGame: Game<BState> = {
  name: BLOCKY_GAME_NAME,
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  setup: ({ ctx, random }, data?: unknown) => {
    // the player-count check is left to newGame, which forces Classic unless exactly 2 are seated
    const d = validateBlockySetupData(data) === undefined ? (data as BlockySetupData | undefined) : undefined;
    return newGame(ctx.numPlayers, () => random.Number(), d ?? {});
  },
  validateSetupData: (d, numPlayers) => validateBlockySetupData(d, numPlayers),
  playerView: ({ G, playerID }) => viewFor(G, playerID),
  turn: { activePlayers: ActivePlayers.ALL },
  moves: { act: actMove, resign: resignMove, dismiss: dismissMove },
  endIf: ({ G }) => (G.result ? { winners: G.result.winners } : undefined),
};
