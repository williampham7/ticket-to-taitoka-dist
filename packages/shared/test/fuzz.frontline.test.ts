import { describe, expect, it } from 'vitest';
import {
  applyMove, emptyState, legalMoves, other, outcome, placeArmy, randomPlacement, viewFor,
  type FrontlineState, type PlayerID,
} from '../src/frontline';
import { prng } from './frontlineHelpers';

const GAMES = 500;
/** Random movers rarely need more than a few thousand moves; reaching this counts as a soft-lock. */
const MOVE_CAP = 20_000;

/** Neither view may carry the rank of an enemy piece that is not revealed. */
function assertViewsHide(S: FrontlineState, phase: string) {
  for (const viewer of ['0', '1'] as PlayerID[]) {
    for (const p of viewFor(S, phase, viewer).pieces) {
      if (p.owner !== viewer && !S.result && !p.revealed && 'rank' in p) throw new Error(`leak to ${viewer}: ${p.id}`);
    }
  }
}

function playOne(seed: number) {
  const rnd = prng(seed);
  const S = emptyState();
  S.first = rnd() < 0.5 ? '0' : '1';
  placeArmy(S, '0', randomPlacement('0', rnd));
  assertViewsHide(S, 'setup');
  placeArmy(S, '1', randomPlacement('1', rnd));
  S.ready = { 0: true, 1: true };
  S.result = outcome(S, other(S.first));
  let turn: PlayerID = S.first;
  while (!S.result) {
    if (S.moves >= MOVE_CAP) throw new Error(`game ${seed} hit the move cap`);
    const ms = legalMoves(S, turn);
    if (ms.length === 0) throw new Error(`game ${seed}: ${turn} to move with no legal move and no result`);
    applyMove(S, turn, ms[Math.floor(rnd() * ms.length)]);
    S.result = outcome(S, turn);
    if (S.moves % 25 === 0) assertViewsHide(S, 'play');
    turn = other(turn);
  }
  return S;
}

describe('fuzz: Frontline random games', () => {
  it(`${GAMES} random games all end, never stall, never leak`, () => {
    const reasons: Record<string, number> = {};
    let total = 0;
    for (let g = 1; g <= GAMES; g++) {
      const S = playOne(g * 7919);
      reasons[S.result!.reason] = (reasons[S.result!.reason] ?? 0) + 1;
      total += S.moves;
    }
    expect(Object.values(reasons).reduce((a, b) => a + b, 0)).toBe(GAMES);
    expect(reasons.flag).toBeGreaterThan(0);
    expect(total / GAMES).toBeLessThan(MOVE_CAP);
  });
});
