import { describe, expect, it } from 'vitest';
import { legalMoves } from '../src/blocky/rules';
import { randomGame } from './blockySim';

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe('Blocky speed', () => {
  it('legalMoves median of 30 < 15ms on mid-game Classic (budget 5ms)', () => {
    const s = randomGame(4, 77, { board: 'classic' }, 32);
    expect(s.placed.length).toBe(32);
    const g = [...s.guilds].sort((a, b) => legalMoves(s, b).length - legalMoves(s, a).length)[0]; // the busiest guild
    legalMoves(s, g); // warm up
    const times: number[] = [];
    for (let i = 0; i < 30; i++) { const t = performance.now(); legalMoves(s, g); times.push(performance.now() - t); }
    const m = median(times);
    console.log(`legalMoves median ${m.toFixed(3)} ms (${legalMoves(s, g).length} moves, ${s.placed.length} placed)`);
    expect(m).toBeLessThan(15);
  });
});
