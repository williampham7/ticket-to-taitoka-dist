import { describe, expect, it } from 'vitest';
import { playBotGame } from './botRunner';
import type { BotLevel } from '../src/bot';

/**
 * Duplicate format: every seed is played twice with the seats swapped, so both levels get the same deals
 * (cards, tickets, first player) once each and the luck of the deal cancels out. A shared win counts half.
 */
function duel(a: BotLevel, b: BotLevel, games: number, offset: number): number {
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const levels: BotLevel[] = i % 2 ? [a, b] : [b, a];
    const seatA = String(levels.indexOf(a));
    const { G } = playBotGame(offset + Math.floor(i / 2), levels);
    const w = G.result!.winners;
    if (w.includes(seatA)) wins += 1 / w.length;
  }
  return wins / games;
}

describe('bot strength (USA map)', () => {
  it('Hard beats Easy at least 75% of 2-player games', () => {
    const rate = duel('hard', 'easy', 100, 10_000);
    console.log(`hard vs easy: ${(rate * 100).toFixed(1)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.75);
  }, 300_000);

  it('Medium beats Easy at least 65% of 2-player games', () => {
    const rate = duel('medium', 'easy', 100, 20_000);
    console.log(`medium vs easy: ${(rate * 100).toFixed(1)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.65);
  }, 300_000);

  it('Hard beats Medium at least 55% of 2-player games', () => {
    const rate = duel('hard', 'medium', 100, 30_000);
    console.log(`hard vs medium: ${(rate * 100).toFixed(1)}%`);
    expect(rate).toBeGreaterThanOrEqual(0.55);
  }, 300_000);

  it('in 3-player games the mean scores order Hard > Medium > Easy', () => {
    const lineup: BotLevel[] = ['hard', 'medium', 'easy'];
    const total: Record<BotLevel, number> = { easy: 0, medium: 0, hard: 0 };
    const GAMES = 60;
    for (let i = 0; i < GAMES; i++) {
      // each seed three times, the lineup rotated through the seats
      const levels = lineup.map((_, k) => lineup[(i + k) % 3]);
      const { G } = playBotGame(40_000 + Math.floor(i / 3), levels);
      levels.forEach((lv, seat) => { total[lv] += G.result!.players[String(seat)].total / GAMES; });
    }
    console.log(`3p mean scores: hard ${total.hard.toFixed(1)}, medium ${total.medium.toFixed(1)}, easy ${total.easy.toFixed(1)}`);
    expect(total.hard).toBeGreaterThan(total.medium);
    expect(total.medium).toBeGreaterThan(total.easy);
  }, 300_000);
});
