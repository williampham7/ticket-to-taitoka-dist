import { squaresOf, type Place } from './pieces';
import { applyPlace, cellsOf, gridOf, legalMoves, type Action, type BState, type PlayerID } from './rules';
import { BOT, type Guild } from './tuning';
import type { BView } from './view';

/**
 * Computer players, from their own view only (BView is the public state, which is all a player ever sees).
 * Easy: a random legal placement, weighted toward bigger pieces.
 * Medium: greedy on piece size, open corners gained, opponents' corners covered, and a pull to the centre early on.
 * Hard: Medium's evaluation over its top candidates, minus the next opponent's mobility after each (a 1-ply look),
 *   and it keeps the monomino for last.
 */
export type BBotLevel = 'easy' | 'medium' | 'hard';
export const BLOCKY_BOT_LEVELS: BBotLevel[] = ['easy', 'medium', 'hard'];

const EDGE: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

/** Builds the Medium evaluation for one guild: a function of a placement, reusing the board analysis. */
function evaluator(v: BView, guild: Guild): (p: Place) => number {
  const size = v.size, N = size * size;
  const gr = gridOf(v, guild);
  const isAnchor = new Uint8Array(N);
  for (const a of gr.anchors) isAnchor[a] = 1;
  const opp = new Uint8Array(N);
  for (const g of v.guilds) {
    if (g === guild || v.grounded.includes(g) || v.seats[g] === v.seats[guild]) continue;
    for (const a of gridOf(v, g).anchors) opp[a]++;
  }
  let mine = 0;
  for (const q of v.placed) if (q.guild === guild) mine++;
  const early = mine < BOT.centreMoves;
  const mid = (size - 1) / 2;
  const stamp = new Int32Array(N), edge = new Int32Array(N), gain = new Int32Array(N);
  let gen = 0;
  const inb = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size;
  return (p) => {
    gen++;
    const cells = cellsOf(size, p);
    for (const i of cells) stamp[i] = gen;
    for (const i of cells) {
      const r = Math.floor(i / size), c = i % size;
      for (const [dr, dc] of EDGE) if (inb(r + dr, c + dc)) edge[(r + dr) * size + c + dc] = gen;
    }
    let lost = 0;
    for (const a of gr.anchors) if (stamp[a] === gen || edge[a] === gen) lost++;
    let gained = 0, blocks = 0, sr = 0, sc = 0;
    for (const i of cells) {
      blocks += opp[i];
      const r = Math.floor(i / size), c = i % size;
      sr += r; sc += c;
      for (const [dr, dc] of DIAG) {
        const rr = r + dr, cc = c + dc;
        if (!inb(rr, cc)) continue;
        const j = rr * size + cc;
        if (gr.blocked[j] || stamp[j] === gen || edge[j] === gen || isAnchor[j] || gain[j] === gen) continue;
        gain[j] = gen;
        gained++;
      }
    }
    let sc2 = squaresOf(p.piece) * BOT.size + (gained - lost) * BOT.corner + blocks * BOT.block;
    if (early) sc2 -= BOT.centre * (Math.abs(sr / cells.length - mid) + Math.abs(sc / cells.length - mid));
    return sc2;
  };
}

/** Medium's score for putting `p` down for `guild` (higher is better). */
export function evaluate(view: BView, guild: Guild, p: Place): number {
  return evaluator(view, guild)(p);
}

const roulette = <T>(xs: T[], w: (x: T) => number, rng: () => number): T => {
  let total = 0;
  for (const x of xs) total += w(x);
  let r = rng() * total;
  for (const x of xs) { r -= w(x); if (r <= 0) return x; }
  return xs[xs.length - 1];
};

/** The guild that plays after `guild` and is not led by the same seat (the one whose mobility I can squeeze). */
function nextOpponent(v: BState, guild: Guild): Guild | null {
  const gs = v.guilds, i = gs.indexOf(guild);
  for (let t = 1; t < gs.length; t++) {
    const g = gs[(i + t) % gs.length];
    if (!v.grounded.includes(g) && v.seats[g] !== v.seats[guild]) return g;
  }
  return null;
}

/** Candidates without the monomino, unless nothing else can be played (it scores +20 as the last piece). */
function saveMonomino(v: BView, guild: Guild, moves: Place[]): Place[] {
  const rest = moves.filter((m) => m.piece !== 'I1');
  return rest.length ? rest : moves;
}

function pickMedium(v: BView, guild: Guild, moves: Place[], rng: () => number | null, jitter: number): Place {
  const ev = evaluator(v, guild);
  let best = moves[0], bs = -Infinity;
  for (const m of moves) {
    const s = ev(m) + (jitter ? jitter * (rng() ?? 0) : 0);
    if (s > bs) { bs = s; best = m; }
  }
  return best;
}

function pickHard(v: BView, guild: Guild, all: Place[], rng: () => number): Place {
  const moves = saveMonomino(v, guild, all);
  const ev = evaluator(v, guild);
  const scored = moves.map((m) => ({ m, s: ev(m) + BOT.jitter * rng() })).sort((a, b) => b.s - a.s).slice(0, BOT.hardTop);
  const opp = nextOpponent(v, guild);
  if (!opp || scored.length === 1) return scored[0].m;
  let best = scored[0].m, bs = -Infinity;
  for (const { m, s } of scored) {
    const c: BState = { ...v, cells: v.cells.slice(), placed: [...v.placed], shelf: { ...v.shelf } };
    applyPlace(c, guild, m);
    const total = s - BOT.mobility * legalMoves(c, opp).length + (BOT.ownMobility ? BOT.ownMobility * legalMoves(c, guild).length : 0);
    if (total > bs) { bs = total; best = m; }
  }
  return best;
}

/** One legal action for `me`, from their own view. Falls back to `done` only when there is no placement at all. */
export function chooseBlockyAction(view: BView, me: PlayerID, level: BBotLevel, rng: () => number): Action {
  if (view.result || view.actor !== me) return { k: 'done' };
  const guild = view.current;
  const moves = legalMoves(view, guild);
  if (!moves.length) return { k: 'done' };
  let pick: Place;
  if (level === 'easy') pick = roulette(moves, (m) => squaresOf(m.piece) ** BOT.easyPow, rng);
  else if (level === 'medium') pick = pickMedium(view, guild, moves, rng, BOT.jitter);
  else pick = pickHard(view, guild, moves, rng);
  return { k: 'place', piece: pick.piece, orient: pick.orient, at: pick.at };
}

/** A hint for "Suggest a move": Medium's best placement for the seat to act, or null when it is not their turn. */
export function suggestMove(view: BView, me: PlayerID): Place | null {
  if (view.result || view.actor !== me) return null;
  const moves = legalMoves(view, view.current);
  if (!moves.length) return null;
  return pickMedium(view, view.current, moves, () => null, 0);
}
