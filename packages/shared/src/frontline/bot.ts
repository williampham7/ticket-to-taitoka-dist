/**
 * A simple Frontline bot. It decides only from its own player view (enemy ranks it has not seen are unknown),
 * so it plays fair. Greedy one-move scoring with a little randomness.
 */
import { DIRS, colOf, inZone, isLake, onBoard, pos, rowOf, type PlayerID, type Pos } from './board';
import { armyKinds, boardRows, zoneRows, type ArmyId, type Rank } from './pieces';
import { legalMoves, randomPlacement, resolveCombat, spotGuesses, spotTargets, type MoveArgs, type Placement, type SpotArgs } from './rules';
import type { FrontlineView, ViewPiece } from './view';

const VALUE = (r: Rank): number => (r === 'F' ? 1000 : r === 'B' ? 5 : r === 1 ? 6 : r === 'P' ? 5 : r === 2 ? 2 : r === 3 ? 4 : r);

const neighbours = (p: Pos, rows = 10): Pos[] =>
  DIRS.map(([dr, dc]) => [rowOf(p) + dr, colOf(p) + dc]).filter(([r, c]) => onBoard(r, c, rows)).map(([r, c]) => pos(r, c)).filter((q) => !isLake(q, rows));

/** A random army with the command post on the back row and mines on the squares around it. */
export function botPlacement(me: PlayerID, rnd: () => number, army: ArmyId = 'classic'): Placement {
  const pl = randomPlacement(me, rnd, army);
  const swap = (a: Pos, b: Pos) => {
    const x = pl.find((p) => p.pos === a)!, y = pl.find((p) => p.pos === b)!;
    [x.rank, y.rank] = [y.rank, x.rank];
  };
  const rows = boardRows(army);
  const backRow = me === '0' ? rows - 1 : 0;
  const flagTo = pos(backRow, Math.floor(rnd() * 10));
  swap(pl.find((p) => p.rank === 'F')!.pos, flagTo);
  const guard = neighbours(flagTo, rows).filter((q) => inZone(me, q, zoneRows(army), rows));
  for (const q of guard) {
    if (pl.find((p) => p.pos === q)!.rank === 'B') continue;
    const spare = pl.find((p) => p.rank === 'B' && !guard.includes(p.pos));
    if (spare) swap(spare.pos, q);
  }
  return pl;
}

/** One turn: a move (or attack), or a Spotter's spot. */
export type BotAction = ({ kind: 'move' } & MoveArgs) | ({ kind: 'spot' } & SpotArgs);

/**
 * What `me` can tell about the enemy piece `t` from its own view: for each rank it might be, how likely.
 * Pool = the enemy army, minus its fallen, minus pieces already seen; a piece that has left its starting
 * square (ids name the starting square) cannot be a mine or the command post; guesses already missed on it are out.
 */
function odds(view: FrontlineView, t: ViewPiece): Map<Rank, number> {
  if (t.rank !== undefined) return new Map([[t.rank, 1]]);
  const pool = new Map<Rank, number>(armyKinds(view.army).map((k) => [k.rank, k.count]));
  for (const f of view.fallen) if (f.owner === t.owner) pool.set(f.rank, (pool.get(f.rank) ?? 0) - 1);
  for (const p of view.pieces) if (p.owner === t.owner && p.rank !== undefined) pool.set(p.rank, (pool.get(p.rank) ?? 0) - 1);
  const moved = t.id !== `${t.owner}-${t.pos}`;
  const allowed = new Set(spotGuesses(view, t.pos));
  let total = 0;
  for (const [r, n] of pool) {
    if (n <= 0 || !allowed.has(r) || (moved && (r === 'F' || r === 'B'))) pool.delete(r);
    else total += n;
  }
  const out = new Map<Rank, number>();
  for (const [r, n] of pool) out.set(r, n / total);
  return out;
}

/** The best spot `me` has, with its score on the same scale as `chooseBotMove`'s move scores. */
function bestSpot(view: FrontlineView, me: PlayerID, rnd: () => number): { a: SpotArgs; score: number } | null {
  let best: { a: SpotArgs; score: number } | null = null;
  for (const { from, at } of spotTargets(view, me)) {
    const t = view.pieces.find((p) => p.pos === at)!;
    const spotter = view.pieces.find((p) => p.pos === from)!;
    for (const [guess, p] of odds(view, t)) {
      const gain = 10 + Math.min(VALUE(guess), 60);
      const cost = spotter.revealed ? 0.5 : 2.5; // a miss shows the spotter to the enemy
      const score = p * gain - (1 - p) * cost + rnd() * 0.5 + (p === 1 ? 2 : 0);
      if (!best || score > best.score) best = { a: { from, at, guess }, score };
    }
  }
  return best;
}

/** Choose a turn for `me` from `me`'s own view: a legal move, or (Spotter army) a legal spot when it scores better. */
export function chooseBotAction(view: FrontlineView, me: PlayerID, rnd: () => number): BotAction {
  const spot = bestSpot(view, me, rnd);
  const moves = legalMoves(view, me);
  if (moves.length === 0) return { kind: 'spot', ...spot!.a };
  const m = scoreMoves(view, me, moves, rnd);
  return spot && spot.score > m.score ? { kind: 'spot', ...spot.a } : { kind: 'move', from: m.move.from, to: m.move.to };
}

/** Choose a move for `me` from `me`'s own view. Always one of `legalMoves(view, me)`. */
export function chooseBotMove(view: FrontlineView, me: PlayerID, rnd: () => number): MoveArgs {
  return scoreMoves(view, me, legalMoves(view, me), rnd).move;
}

function scoreMoves(view: FrontlineView, me: PlayerID, moves: MoveArgs[], rnd: () => number): { move: MoveArgs; score: number } {
  const at = new Map<Pos, ViewPiece>(view.pieces.map((p) => [p.pos, p]));
  const forward = (from: Pos, to: Pos) => (me === '0' ? rowOf(from) - rowOf(to) : rowOf(to) - rowOf(from));
  // a known enemy next to `sq` that would beat `rank` by attacking it
  const threatened = (sq: Pos, rank: Rank) => neighbours(sq, boardRows(view.army)).some((q) => {
    const e = at.get(q);
    return !!e && e.owner !== me && e.rank !== undefined && e.rank !== 'B' && e.rank !== 'F' && resolveCombat(e.rank, rank) === 'attacker';
  });
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const mover = at.get(m.from)!;
    const rank = mover.rank!;
    const target = at.get(m.to);
    let s = rnd() * 0.5;
    if (target && target.rank !== undefined) {
      const w = resolveCombat(rank, target.rank);
      s += w === 'attacker' ? 10 + VALUE(target.rank) : w === 'both' ? VALUE(target.rank) - VALUE(rank) : -10 - VALUE(rank);
    } else if (target) {
      s += 3 - VALUE(rank) * 0.5; // unknown: probe with cheap pieces, keep strong ones back
    } else {
      if (forward(m.from, m.to) > 0) s += 1;
      if (threatened(m.from, rank)) s += VALUE(rank) * 0.5;
    }
    // where it ends up (if it survives), a known stronger enemy could take it
    if ((!target || target.rank === undefined || resolveCombat(rank, target.rank) === 'attacker') && threatened(m.to, rank)) s -= VALUE(rank) + 3;
    if (s > bestScore) { best = m; bestScore = s; }
  }
  return { move: best, score: bestScore };
}
