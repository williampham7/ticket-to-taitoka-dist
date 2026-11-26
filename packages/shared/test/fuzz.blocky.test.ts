import { describe, expect, it } from 'vitest';
import { PIECE_IDS, squaresOf } from '../src/blocky/pieces';
import { GUILDS, LOG_KEEP, type Guild } from '../src/blocky/tuning';
import { act, alive, applyPlace, canPlace, cellsOf, dismiss, hostSeat, newGame, playerScores, resign, score, seatOf, type BState } from '../src/blocky/rules';
import { chooseBlockyAction, type BBotLevel } from '../src/blocky/bot';
import { eventMs } from '../src/blocky/timing';
import { viewFor } from '../src/blocky/view';
import { seeded } from './blockySim';

const LEVELS: BBotLevel[] = ['easy', 'medium'];

/** `cells` is exactly the union of the placed pieces, and no two pieces overlap. */
function boardMatchesPlaced(s: BState): boolean {
  const want = new Array(s.size * s.size).fill(-1);
  for (const q of s.placed) for (const i of cellsOf(s.size, q)) { if (want[i] !== -1) return false; want[i] = q.n; }
  return want.every((v, i) => v === s.cells[i]) && s.placed.every((q, i) => q.n === i);
}
/** Replays the placements on an empty board: each one was legal when it was made. */
function replayLegal(s: BState): boolean {
  const c: BState = { ...s, cells: new Array(s.cells.length).fill(-1), placed: [], grounded: [], shelf: Object.fromEntries(GUILDS.map((g) => [g, s.guilds.includes(g) ? [...PIECE_IDS] : []])) as Record<Guild, never[]> } as BState;
  for (const q of s.placed) {
    if (canPlace(c, q.guild, q) !== null) return false;
    applyPlace(c, q.guild, q);
  }
  return true;
}
function recountOk(s: BState): boolean {
  const sc = score(s);
  const own: Record<string, number> = Object.fromEntries(s.order.map((p) => [p, 0]));
  for (const g of s.guilds) {
    const placed = s.placed.filter((q) => q.guild === g);
    const left = 89 - placed.reduce((n, q) => n + squaresOf(q.piece), 0);
    const bonus = left === 0 ? (placed.at(-1)!.piece === 'I1' ? 20 : 15) : 0;
    if (sc[g] !== -left + bonus) return false;
    if (s.seats[g] !== 'shared') own[s.seats[g]] += sc[g];
  }
  return JSON.stringify(own) === JSON.stringify(playerScores(s)) && JSON.stringify(own) === JSON.stringify(s.result!.scores);
}

describe('Blocky fuzz', () => {
  it('500 games over Duo and 2/3/4-player Classic, with random done / resign / dismiss', () => {
    const t0 = Date.now();
    const stats = { ended: 0, resigned: 0, dismissed: 0, done: 0, byLast: 0, allPieces: 0, maxEvents: 0 };
    for (let i = 0; i < 500; i++) {
      const rng = seeded(1000 + i);
      const [players, board] = ([[2, 'duo'], [2, 'classic'], [3, 'classic'], [4, 'classic']] as const)[i % 4];
      const s = newGame(players, rng, { board, bots: [false, true, false, false] });
      let steps = 0;
      while (!s.result && steps < 800) {
        const p = s.actor;
        expect(seatOf(s, s.current)).toBe(p);
        expect(s.grounded).not.toContain(s.current);
        expect(s.out).not.toContain(p);
        const roll = rng();
        if (roll < 0.02 && i % 5 !== 0) { // 2% of actions, except in every fifth game, which plays out naturally
          const live = alive(s);
          const pick = live[Math.floor(rng() * live.length)];
          const how = Math.floor(rng() * 3);
          if (how === 0) { if (act(s, p, { k: 'done' }) === undefined) stats.done++; }
          else if (how === 1) { if (resign(s, pick) === undefined) stats.resigned++; }
          else { const host = hostSeat(s); const target = live[Math.floor(rng() * live.length)]; if (host && dismiss(s, host, target) === undefined) stats.dismissed++; }
        } else {
          const a = chooseBlockyAction(viewFor(s, p), p, LEVELS[Math.floor(rng() * 2)], rng);
          expect(a.k).toBe('place');
          if (a.k === 'place') expect(canPlace(s, s.current, a)).toBeNull();
          expect(act(s, p, a)).toBeUndefined();
        }
        expect(boardMatchesPlaced(s)).toBe(true);
        steps++;
      }
      expect(s.result, `game ${i} did not end`).not.toBeNull();
      expect(replayLegal(s)).toBe(true);
      expect(recountOk(s)).toBe(true);
      expect(s.log.length).toBeLessThanOrEqual(LOG_KEEP);
      expect(s.log.every((e) => eventMs(e) >= 0 && eventMs(e) <= 1800)).toBe(true);
      expect([...s.result!.ranking].sort()).toEqual([...s.order].sort());
      expect(s.result!.winners.length).toBeGreaterThan(0);
      const r = s.result!;
      const gone = r.ranking.filter((p) => s.out.includes(p));
      expect(r.ranking.slice(r.ranking.length - gone.length)).toEqual(gone); // resigned rank last
      if (alive(s).length <= 1) stats.byLast++;
      if (s.shelf.tide.length === 0 || s.shelf.ember.length === 0) stats.allPieces++;
      stats.ended++;
      stats.maxEvents = Math.max(stats.maxEvents, s.logTotal);
    }
    console.log(`fuzz: 500 games in ${((Date.now() - t0) / 1000).toFixed(1)} s`, JSON.stringify(stats));
    expect(stats.ended).toBe(500);
    expect(stats.resigned + stats.dismissed + stats.done).toBeGreaterThan(20);
  }, 180_000);
});
