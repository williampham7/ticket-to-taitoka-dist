import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import { DEFAULT_RULES, validateRules, type SlapRuleId } from './slapRules';
import { flip, leave, newGame, ready, slap, tick, waitingRoom, type EgwState } from './rules';
import { QUICK_TIMING, TIMING } from './timing';
import { viewFor } from './view';

export const EGYPTIAN_GAME_NAME = 'egyptian';

/** `waiting`: the 5-seat waiting room (no cards, no moves). `quick`: short pauses (e2e). */
export interface EgyptianSetupData { rules?: SlapRuleId[]; waiting?: boolean; quick?: boolean }

export function validateEgyptianSetupData(d: unknown): string | undefined {
  if (d === undefined || d === null) return undefined;
  if (typeof d !== 'object' || Array.isArray(d)) return 'setupData must be an object';
  const { rules, waiting, quick } = d as EgyptianSetupData;
  if (rules !== undefined && validateRules(rules)) return validateRules(rules);
  if (waiting !== undefined && typeof waiting !== 'boolean') return 'bad waiting';
  if (quick !== undefined && typeof quick !== 'boolean') return 'bad quick';
  return undefined;
}

/*
 * Real time: every seat may act at any moment (ActivePlayers.ALL), and the game keeps its own turn (G.turn).
 * Every move runs only on the server (`client: false`) with the server's clock, and accepts a stale stateID
 * (`ignoreStaleStateID`): a slap must not be refused because another update landed first; each rule
 * re-checks its own preconditions against the current state. Hidden information: `viewFor` (playerView).
 */
const move = (fn: (G: EgwState, p: string, now: number, ...args: unknown[]) => string | undefined): Move<EgwState> => ({
  move: ({ G, playerID }, ...args: unknown[]) => (fn(G, playerID, Date.now(), ...args) ? INVALID_MOVE : undefined),
  client: false,
  ignoreStaleStateID: true,
});

export const EgyptianGame: Game<EgwState> = {
  name: EGYPTIAN_GAME_NAME,
  minPlayers: 2,
  maxPlayers: 5,
  setup: ({ ctx, random }, data?: unknown) => {
    const d = (validateEgyptianSetupData(data) === undefined ? data : undefined) as EgyptianSetupData | undefined;
    const rules = d?.rules ?? DEFAULT_RULES;
    if (d?.waiting) return waitingRoom(rules);
    return newGame(ctx.numPlayers, rules, { shuffle: (a) => random.Shuffle(a), die: (n) => random.Die(n) }, d?.quick ? QUICK_TIMING : TIMING);
  },
  validateSetupData: (d) => validateEgyptianSetupData(d),
  playerView: ({ G }) => viewFor(G) as unknown as EgwState,
  turn: { activePlayers: ActivePlayers.ALL },
  moves: {
    ready: move((G, p, now) => ready(G, p, now)),
    flip: move((G, p, now) => flip(G, p, now)),
    slap: move((G, p, now, round) => (typeof round === 'number' ? slap(G, p, round, now) : 'bad round')),
    tick: move((G, _p, now) => tick(G, now)),
    leave: move((G, p, now) => leave(G, p, now)),
  },
  endIf: ({ G }) => (G.result ? { winner: G.result.winner } : undefined),
};
