import {
  act, botDeployment, chooseBotAction, deploy, newMatch, nextRound, viewFor,
  type BestOf, type BotLevel, type FleetState, type Mode, type PlayerID,
} from '../src/fleet';
import { prng } from './frontlineHelpers';

/** Turns per round no game should need: 100 squares a side, one turn each, plus slack. A round reaching it is a soft-lock. */
export const TURN_CAP = 260;

export interface SimOptions { mode: Mode; bestOf?: BestOf; levels: Record<PlayerID, BotLevel>; seed: number; onTurn?: (S: FleetState) => void }

/** Plays a whole match bot against bot on the pure engine; every decision is made from the bot's own view. */
export function simulate({ mode, bestOf = 1, levels, seed, onTurn }: SimOptions): FleetState {
  const rnd = prng(seed);
  const S = newMatch(mode, bestOf, rnd() < 0.5 ? '0' : '1');
  for (let guard = 0; !S.result; guard++) {
    if (guard > 10) throw new Error(`seed ${seed}: too many rounds`);
    for (const p of ['0', '1'] as PlayerID[]) {
      const err = deploy(S, p, botDeployment(mode, levels[p], rnd));
      if (err) throw new Error(`seed ${seed}: bot deployment rejected: ${err}`);
    }
    let turns = 0;
    while (S.stage === 'battle') {
      if (++turns > TURN_CAP) throw new Error(`seed ${seed}: round ${S.round} hit the turn cap`);
      const p = S.turn;
      const a = chooseBotAction(viewFor(S, p), p, levels[p], rnd);
      const err = act(S, p, a, rnd);
      if (err) throw new Error(`seed ${seed}: bot chose an illegal action ${JSON.stringify(a)}: ${err}`);
      onTurn?.(S);
    }
    if (S.stage === 'roundEnd') {
      nextRound(S, '0');
      nextRound(S, '1');
    }
  }
  return S;
}
