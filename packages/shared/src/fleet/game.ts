import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import type { PlayerID } from './board';
import { MODES, type Deployment, type Mode } from './ships';
import { act, deploy, newMatch, nextRound, resign, undeploy, type BestOf, type FleetAction, type FleetState } from './rules';
import { viewFor } from './view';
import type { Dir, WeaponId } from './weapons';

export const FLEET_GAME_NAME = 'fleet';

/** setupData a match may be created with. Defaults: Classic, a single game. */
export interface FleetSetupData { mode?: Mode; bestOf?: BestOf }
export const BEST_OF: BestOf[] = [1, 3, 5];

export function validateFleetSetupData(d: unknown): string | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== 'object' || Array.isArray(d)) return 'setupData must be an object';
  const { mode, bestOf } = d as FleetSetupData;
  if (mode !== undefined && !MODES.includes(mode)) return 'bad mode';
  if (bestOf !== undefined && !BEST_OF.includes(bestOf)) return 'bad bestOf';
  return undefined;
}

/** The move (name + args) that performs an action. */
export function moveFor(a: FleetAction): { name: 'fire' | 'salvo' | 'weapon' | 'dropMine'; args: unknown[] } {
  switch (a.type) {
    case 'shell': return { name: 'fire', args: [a.sq] };
    case 'salvo': return { name: 'salvo', args: [a.sqs] };
    case 'mine': return { name: 'dropMine', args: [a.sq] };
    case 'weapon': return { name: 'weapon', args: a.dir ? [a.id, a.sq, a.dir] : [a.id, a.sq] };
  }
}

/*
 * Hidden information: G always holds both fleets; clients only ever get `viewFor` (playerView).
 * Every move is `client: false`, so it runs on the server (or the in-browser Local master) with the full G.
 * `deploy` and `dropMine` are `redact: true`: their arguments (a whole fleet, a mine square) reach only the
 * player who sent them; boardgame.io sends the log with args nulled to everyone else. All randomness (mine drift,
 * who opens) is the server's seeded random, whose state never reaches a client.
 */

const deployMove: Move<FleetState> = {
  move: ({ G, playerID }, d: Deployment) => (deploy(G, playerID as PlayerID, d) ? INVALID_MOVE : undefined),
  client: false,
  redact: true,
};

const undeployMove: Move<FleetState> = {
  move: ({ G, playerID }) => (undeploy(G, playerID as PlayerID) ? INVALID_MOVE : undefined),
  client: false,
  redact: true,
};

/** Runs one action; the turn ends unless the round just ended. */
function turnMove(G: FleetState, playerID: string, a: FleetAction, random: { Number: () => number }, endTurn: () => void) {
  if (act(G, playerID as PlayerID, a, () => random.Number())) return INVALID_MOVE;
  if (G.stage === 'battle') endTurn();
  return undefined;
}

const fire: Move<FleetState> = {
  move: ({ G, playerID, random, events }, sq: number) => turnMove(G, playerID, { type: 'shell', sq }, random, events.endTurn),
  client: false,
};
const salvo: Move<FleetState> = {
  move: ({ G, playerID, random, events }, sqs: number[]) => turnMove(G, playerID, { type: 'salvo', sqs }, random, events.endTurn),
  client: false,
};
const weapon: Move<FleetState> = {
  move: ({ G, playerID, random, events }, id: WeaponId, sq: number, dir?: Dir) =>
    turnMove(G, playerID, { type: 'weapon', id, sq, dir }, random, events.endTurn),
  client: false,
};
const dropMine: Move<FleetState> = {
  move: ({ G, playerID, random, events }, sq: number) => turnMove(G, playerID, { type: 'mine', sq }, random, events.endTurn),
  client: false,
  redact: true,
};

const nextRoundMove: Move<FleetState> = {
  move: ({ G, playerID }) => (nextRound(G, playerID as PlayerID) ? INVALID_MOVE : undefined),
  client: false,
};

const resignMove: Move<FleetState> = {
  move: ({ G, playerID }) => (resign(G, playerID as PlayerID) ? INVALID_MOVE : undefined),
  client: false,
};

const setupData = (d: unknown): Required<FleetSetupData> => {
  const ok = validateFleetSetupData(d) === undefined ? (d as FleetSetupData | undefined) : undefined;
  return { mode: ok?.mode ?? 'classic', bestOf: ok?.bestOf ?? 1 };
};

export const FleetGame: Game<FleetState> = {
  name: FLEET_GAME_NAME,
  minPlayers: 2,
  maxPlayers: 2,
  setup: ({ random }, data?: unknown) => {
    const { mode, bestOf } = setupData(data);
    return newMatch(mode, bestOf, random.Die(2) === 1 ? '0' : '1');
  },
  validateSetupData: (d) => validateFleetSetupData(d),
  playerView: ({ G, playerID }) => viewFor(G, playerID) as unknown as FleetState,
  phases: {
    placement: {
      start: true,
      next: 'battle',
      turn: { activePlayers: ActivePlayers.ALL },
      moves: { deploy: deployMove, undeploy: undeployMove, resign: resignMove },
      endIf: ({ G }) => G.stage === 'battle',
    },
    battle: {
      next: 'roundEnd',
      turn: {
        order: { first: ({ G }) => Number(G.turn), next: ({ G }) => Number(G.turn) },
        activePlayers: { currentPlayer: 'act', others: 'idle' },
        stages: {
          act: { moves: { fire, salvo, weapon, dropMine, resign: resignMove } },
          idle: { moves: { resign: resignMove } },
        },
      },
      endIf: ({ G }) => G.stage === 'roundEnd',
    },
    roundEnd: {
      next: 'placement',
      turn: { activePlayers: ActivePlayers.ALL },
      moves: { nextRound: nextRoundMove, resign: resignMove },
      endIf: ({ G }) => G.stage === 'placement',
    },
  },
  endIf: ({ G }) => (G.result ? { winner: G.result.winner } : undefined),
};
