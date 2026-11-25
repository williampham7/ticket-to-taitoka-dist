import { describe, expect, it } from 'vitest';
import {
  applyMove, applySpot, botPlacement, chooseBotAction, emptyState, legalMoves, other, outcome, placeArmy, randomPlacement,
  spotGuesses, spotTargets, viewFor, type ArmyId, type FrontlineState, type PlayerID,
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

function playOne(seed: number, army: ArmyId = 'classic', bots = false, cap = MOVE_CAP) {
  const rnd = prng(seed);
  const S: FrontlineState = { ...emptyState(), army };
  S.first = rnd() < 0.5 ? '0' : '1';
  placeArmy(S, '0', bots ? botPlacement('0', rnd, army) : randomPlacement('0', rnd, army));
  assertViewsHide(S, 'setup');
  placeArmy(S, '1', bots ? botPlacement('1', rnd, army) : randomPlacement('1', rnd, army));
  S.ready = { 0: true, 1: true };
  S.result = outcome(S, other(S.first));
  let turn: PlayerID = S.first;
  while (!S.result) {
    if (S.moves >= cap) {
      if (bots) break; // two greedy bots may circle each other forever; only legality is checked for them
      throw new Error(`game ${seed} hit the move cap`);
    }
    const ms = legalMoves(S, turn);
    const spots = spotTargets(S, turn);
    if (ms.length + spots.length === 0) throw new Error(`game ${seed}: ${turn} to move with no legal move and no result`);
    if (bots) {
      const a = chooseBotAction(viewFor(S, 'play', turn), turn, rnd);
      if (a.kind === 'spot') applySpot(S, turn, a); else applyMove(S, turn, a);
    } else {
      const i = Math.floor(rnd() * (ms.length + spots.length));
      if (i < ms.length) applyMove(S, turn, ms[i]);
      else {
        const t = spots[i - ms.length];
        const g = spotGuesses(S, t.at);
        applySpot(S, turn, { ...t, guess: g[Math.floor(rnd() * g.length)] });
      }
    }
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

  it(`${GAMES} random games with the Spotter army all end, never stall, never leak`, () => {
    const reasons: Record<string, number> = {};
    let spots = 0, hits = 0;
    for (let g = 1; g <= GAMES; g++) {
      const S = playOne(g * 6151, 'spotter');
      reasons[S.result!.reason] = (reasons[S.result!.reason] ?? 0) + 1;
      spots += Object.values(S.ruledOut).reduce((n, r) => n + r.length, 0);
      hits += S.fallen.length;
    }
    expect(Object.values(reasons).reduce((a, b) => a + b, 0)).toBe(GAMES);
    expect(reasons.flag).toBeGreaterThan(0);
    expect(spots).toBeGreaterThan(0);
    expect(hits).toBeGreaterThan(0);
  });

  it('computer vs computer with the Spotter army: every action is legal (applying throws otherwise), many games end', () => {
    let ended = 0, spotted = 0;
    for (let g = 1; g <= 60; g++) {
      const S = playOne(g * 104729, 'spotter', true, 3000);
      if (S.result) ended++;
      if (S.fallen.length > 0 && Object.keys(S.ruledOut).length + S.fallen.length > 0) spotted++;
    }
    expect(ended).toBeGreaterThan(20);
    expect(spotted).toBeGreaterThan(0);
  });
});
