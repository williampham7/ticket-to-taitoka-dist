import { INSERTS, isFixed, lineCells, rc, type Tile } from './tiles';
import { applyShift, distances, legalShifts, type Action, type PlayerID } from './rules';
import { BOT } from './tuning';
import type { KView } from './view';

/**
 * Computer players, from their own view only (KView has no stacks but their own target).
 * Easy: a shift that reaches the target if one exists, else any. Medium: else the shift and square that bring it
 * closest. Hard: else the square that leaves the most next-turn shifts reaching it, preferring fixed tiles.
 */
export type KBotLevel = 'easy' | 'medium' | 'hard';
export const KINGDOM_BOT_LEVELS: KBotLevel[] = ['easy', 'medium', 'hard'];

const INSERT_CELLS = INSERTS.map((_, at) => lineCells(at)[0]);
const manhattan = (a: number, b: number) => { const [r1, c1] = rc(a), [r2, c2] = rc(b); return Math.abs(r1 - r2) + Math.abs(c1 - c2); };

/** The cells I am trying to reach on this board (my target(s), or home), and whether a target is on the spare. */
export function goalsOn(v: KView, me: PlayerID, board: Tile[]): { cells: number[]; onSpare: boolean } {
  if (!v.left[me]) return { cells: [v.home[me]], onSpare: false };
  const want = v.targets[me];
  const cells = board.map((t, i) => (t.t && want.includes(t.t) ? i : -1)).filter((i) => i >= 0);
  return { cells, onSpare: cells.length < want.length };
}

/** How far a square is from the nearest goal, as the crow flies (a target on the spare counts from the nearest insertion end). */
function gap(q: number, g: { cells: number[]; onSpare: boolean }): number {
  let best = Infinity;
  for (const c of g.cells) best = Math.min(best, manhattan(q, c));
  if (g.onSpare) for (const c of INSERT_CELLS) best = Math.min(best, manhattan(q, c) + 1);
  return best;
}

interface Eval { at: number; rot: number; board: Tile[]; spare: Tile; from: number; dist: Map<number, number>; hit: number | null; score: number }

function evaluate(v: KView, me: PlayerID, s: { at: number; rot: number }): Eval {
  const r = applyShift(v.board, v.spare, v.pos, s.at, s.rot);
  const from = r.pos[me];
  const dist = distances(r.board, from);
  const g = goalsOn(v, me, r.board);
  const hit = g.cells.find((c) => dist.has(c)) ?? null;
  let score = Infinity;
  for (const [q, d] of dist) score = Math.min(score, gap(q, g) + BOT.walkTie * d);
  return { ...s, board: r.board, spare: r.spare, from, dist, hit, score };
}

/** Next-turn shifts (after the one that went in at `lastAt`) that would let a hero on `q` reach a goal. */
function futureHits(v: KView, me: PlayerID, board: Tile[], spare: Tile, lastAt: number, q: number): number {
  let n = 0;
  for (const s of legalShifts(spare, lastAt)) {
    const r = applyShift(board, spare, { [me]: q }, s.at, s.rot);
    const g = goalsOn(v, me, r.board);
    const d = distances(r.board, r.pos[me]);
    if (g.cells.some((c) => d.has(c))) n++;
  }
  return n;
}

/** Hard: the best square to wait on, and its value. */
function bestWait(v: KView, me: PlayerID, e: Pick<Eval, 'board' | 'spare' | 'dist' | 'at'>): { q: number; value: number } {
  const g = goalsOn(v, me, e.board);
  const near = [...e.dist.entries()].sort((a, b) => gap(a[0], g) - gap(b[0], g) || a[1] - b[1]).slice(0, BOT.hardSquares);
  let best = { q: near[0][0], value: -Infinity };
  for (const [q] of near) {
    const value = futureHits(v, me, e.board, e.spare, e.at, q) + (isFixed(q) ? BOT.fixedBonus : 0) - gap(q, g) * BOT.walkTie;
    if (value > best.value) best = { q, value };
  }
  return best;
}

const pick = <T>(a: T[], rng: () => number) => a[Math.floor(rng() * a.length)];

export function chooseShift(v: KView, me: PlayerID, level: KBotLevel, rng: () => number): { at: number; rot: number } {
  const all = legalShifts(v.spare, v.lastAt);
  const evals = all.map((s) => evaluate(v, me, s));
  const hits = evals.filter((e) => e.hit !== null);
  if (hits.length) { const e = pick(hits, rng); return { at: e.at, rot: e.rot }; }
  if (level === 'easy') return pick(all, rng);
  const ranked = [...evals].sort((a, b) => a.score - b.score);
  if (level === 'medium') { const top = ranked.filter((e) => e.score === ranked[0].score); const e = pick(top, rng); return { at: e.at, rot: e.rot }; }
  let best = ranked[0], bestValue = -Infinity;
  for (const e of ranked.slice(0, BOT.hardShifts)) {
    const { value } = bestWait(v, me, e);
    if (value > bestValue) { bestValue = value; best = e; }
  }
  return { at: best.at, rot: best.rot };
}

export function chooseMove(v: KView, me: PlayerID, level: KBotLevel, rng: () => number): number {
  const dist = distances(v.board, v.pos[me]);
  const g = goalsOn(v, me, v.board);
  const hit = g.cells.find((c) => dist.has(c));
  if (hit !== undefined) return hit;
  if (level === 'easy') return pick([...dist.keys()], rng);
  if (level === 'medium') {
    let best = v.pos[me], s = Infinity;
    for (const [q, d] of dist) { const x = gap(q, g) + BOT.walkTie * d; if (x < s) { s = x; best = q; } }
    return best;
  }
  return bestWait(v, me, { board: v.board, spare: v.spare, dist, at: v.lastAt ?? 0 }).q;
}

/** One action for the seat whose turn it is. Always legal. */
export function chooseKingdomAction(v: KView, me: PlayerID, level: KBotLevel, rng: () => number): Action {
  if (v.step === 'shift') return { k: 'shift', ...chooseShift(v, me, level, rng) };
  return { k: 'move', to: chooseMove(v, me, level, rng) };
}

/** "Suggest a push" (hints): the first shift, in insertion order, that makes one of my targets reachable, or null. */
export function suggestShift(v: KView, me: PlayerID): { at: number; rot: number } | null {
  for (const s of legalShifts(v.spare, v.lastAt)) if (evaluate(v, me, s).hit !== null) return s;
  return null;
}
