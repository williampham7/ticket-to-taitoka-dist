import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import { MAX_PLAYERS, MIN_PLAYERS, act, newGame, resign, type Action, type Mode, type WarState } from './rules';
import { viewFor } from './view';

export const WARFRONT_GAME_NAME = 'warfront';
export const WAR_MODES: Mode[] = ['domination', 'mission'];

/** setupData a match may be created with. Defaults: World Domination, territories dealt at random. */
export interface WarSetupData { mode?: Mode; autoDeploy?: boolean; factions?: number[] }
export const FACTION_COUNT = 6;

export function validateWarSetupData(d: unknown): string | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== 'object' || Array.isArray(d)) return 'setupData must be an object';
  const { mode, autoDeploy, factions } = d as WarSetupData;
  if (mode !== undefined && !WAR_MODES.includes(mode)) return 'bad mode';
  if (autoDeploy !== undefined && typeof autoDeploy !== 'boolean') return 'bad autoDeploy';
  if (factions !== undefined && (!Array.isArray(factions) || factions.some((f) => !Number.isInteger(f) || f < 0 || f >= FACTION_COUNT) || new Set(factions).size !== factions.length)) return 'bad factions';
  return undefined;
}

/** The faction (colour) of each seat; stored in G so every screen agrees. */
export interface WarfrontState extends WarState { factions: number[] }

/*
 * Hidden information: G holds every hand, the deck order and every mission; clients only get `viewFor`.
 * Every move is `client: false` (dice and deck use the server's seeded random).
 * Any player may act at any time as far as boardgame.io is concerned; the engine checks whose turn it is.
 */
const actMove: Move<WarfrontState> = {
  move: ({ G, playerID, random }, a: Action) => (act(G, playerID, a, () => random.Number()) ? INVALID_MOVE : undefined),
  client: false,
};
const resignMove: Move<WarfrontState> = {
  move: ({ G, playerID }) => (resign(G, playerID) ? INVALID_MOVE : undefined),
  client: false,
};

export const WarfrontGame: Game<WarfrontState> = {
  name: WARFRONT_GAME_NAME,
  minPlayers: MIN_PLAYERS,
  maxPlayers: MAX_PLAYERS,
  setup: ({ ctx, random }, data?: unknown) => {
    const d = validateWarSetupData(data) === undefined ? (data as WarSetupData | undefined) : undefined;
    const G = newGame(ctx.numPlayers, d?.mode ?? 'domination', () => random.Number(), { autoDeploy: d?.autoDeploy ?? true });
    const factions = d?.factions?.length === ctx.numPlayers ? d.factions : Array.from({ length: ctx.numPlayers }, (_, i) => i);
    return { ...G, factions };
  },
  validateSetupData: (d) => validateWarSetupData(d),
  playerView: ({ G, playerID }) => ({ ...viewFor(G, playerID), factions: G.factions }) as unknown as WarfrontState,
  turn: { activePlayers: ActivePlayers.ALL },
  moves: { act: actMove, resign: resignMove },
  endIf: ({ G }) => (G.result ? { winner: G.result.winner } : undefined),
};
