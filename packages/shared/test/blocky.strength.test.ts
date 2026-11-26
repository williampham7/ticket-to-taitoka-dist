import { describe, expect, it } from 'vitest';
import type { BBotLevel } from '../src/blocky';
import { playerScores } from '../src/blocky';
import { simulate } from './blockySim';

/** Share of `games` seeded Duo games that `a` wins against `b` (seats alternate, a tie counts half). */
function duel(a: BBotLevel, b: BBotLevel, base: number, games = 100): number {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const seats: BBotLevel[] = i % 2 ? [a, b] : [b, a];
    const { s } = simulate(seats, base + i, { board: 'duo' });
    const ps = playerScores(s);
    const mine = ps[String(i % 2 ? 0 : 1)], theirs = ps[String(i % 2 ? 1 : 0)];
    wins += mine > theirs ? 1 : mine === theirs ? 0.5 : 0;
  }
  return wins / games;
}

describe('Blocky bot strength (100 Duo games per pairing)', () => {
  it('Hard beats Medium in at least 60%', () => {
    const r = duel('hard', 'medium', 7000);
    console.log(`hard vs medium: ${r}`);
    expect(r).toBeGreaterThanOrEqual(0.6);
  }, 300_000);

  it('Medium beats Easy in at least 70%', () => {
    const r = duel('medium', 'easy', 8000);
    console.log(`medium vs easy: ${r}`);
    expect(r).toBeGreaterThanOrEqual(0.7);
  }, 300_000);

  it('Hard beats Easy in at least 80%', () => {
    const r = duel('hard', 'easy', 9000);
    console.log(`hard vs easy: ${r}`);
    expect(r).toBeGreaterThanOrEqual(0.8);
  }, 300_000);
});
