import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import { act, dismiss, newGame, resign, type Action, type KState } from './rules';
import { LENGTHS, MAX_PLAYERS, MIN_PLAYERS, type Length } from './tuning';
import { HEROES } from './tiles';
import { viewFor } from './view';

export const KINGDOM_GAME_NAME = 'kingdom';

/** setupData a match may be created with. Defaults: Full length, hints on, nobody young, heroes in seat order. */
export interface KingdomSetupData { length?: Length; hints?: boolean; young?: boolean[]; heroes?: number[]; bots?: boolean[] }

const boolList = (x: unknown) => Array.isArray(x) && x.length <= MAX_PLAYERS && x.every((b) => typeof b === 'boolean');
export function validateKingdomSetupData(d: unknown): string | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== 'object' || Array.isArray(d)) return 'setupData must be an object';
  const { length, hints, young, heroes, bots } = d as KingdomSetupData;
  if (length !== undefined && !LENGTHS.includes(length)) return 'bad length';
  if (hints !== undefined && typeof hints !== 'boolean') return 'bad hints';
  if (young !== undefined && !boolList(young)) return 'bad young';
  if (bots !== undefined && !boolList(bots)) return 'bad bots';
  if (heroes !== undefined && (!Array.isArray(heroes) || heroes.some((h) => !Number.isInteger(h) || h < 0 || h >= HEROES.length) || new Set(heroes).size !== heroes.length)) return 'bad heroes';
  return undefined;
}

/*
 * Hidden information: G holds every stack; clients only get `viewFor`. Every move is `client: false`.
 * Anyone may act at any time as far as boardgame.io is concerned (resign and dismiss work off turn);
 * the engine checks whose turn and which step it is.
 */
const actMove: Move<KState> = { move: ({ G, playerID }, a: Action) => (act(G, playerID, a) ? INVALID_MOVE : undefined), client: false };
const resignMove: Move<KState> = { move: ({ G, playerID }) => (resign(G, playerID) ? INVALID_MOVE : undefined), client: false };
const dismissMove: Move<KState> = { move: ({ G, playerID }, seat: string) => (dismiss(G, playerID, seat) ? INVALID_MOVE : undefined), client: false };

export const KingdomGame: Game<KState> = {
  name: KINGDOM_GAME_NAME,
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  setup: ({ ctx, random }, data?: unknown) => {
    const d = validateKingdomSetupData(data) === undefined ? (data as KingdomSetupData | undefined) : undefined;
    return newGame(ctx.numPlayers, () => random.Number(), d ?? {});
  },
  validateSetupData: (d) => validateKingdomSetupData(d),
  playerView: ({ G, playerID }) => viewFor(G, playerID) as unknown as KState,
  turn: { activePlayers: ActivePlayers.ALL },
  moves: { act: actMove, resign: resignMove, dismiss: dismissMove },
  endIf: ({ G }) => (G.result ? { winner: G.result.winner } : undefined),
};
