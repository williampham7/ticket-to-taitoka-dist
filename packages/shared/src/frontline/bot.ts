/**
 * A simple Frontline bot. It decides only from its own player view (enemy ranks it has not seen are unknown),
 * so it plays fair. Greedy one-move scoring with a little randomness.
 */
import { DIRS, colOf, inZone, isLake, onBoard, pos, rowOf, type PlayerID, type Pos } from './board';
import type { Rank } from './pieces';
import { legalMoves, randomPlacement, resolveCombat, type MoveArgs, type Placement } from './rules';
import type { FrontlineView, ViewPiece } from './view';

const VALUE = (r: Rank): number => (r === 'F' ? 1000 : r === 'B' ? 5 : r === 1 ? 6 : r === 2 ? 2 : r === 3 ? 4 : r);

const neighbours = (p: Pos): Pos[] =>
  DIRS.map(([dr, dc]) => [rowOf(p) + dr, colOf(p) + dc]).filter(([r, c]) => onBoard(r, c)).map(([r, c]) => pos(r, c)).filter((q) => !isLake(q));

/** A random army with the command post on the back row and mines on the squares around it. */
export function botPlacement(me: PlayerID, rnd: () => number): Placement {
  const pl = randomPlacement(me, rnd);
  const swap = (a: Pos, b: Pos) => {
    const x = pl.find((p) => p.pos === a)!, y = pl.find((p) => p.pos === b)!;
    [x.rank, y.rank] = [y.rank, x.rank];
  };
  const backRow = me === '0' ? 9 : 0;
  const flagTo = pos(backRow, Math.floor(rnd() * 10));
  swap(pl.find((p) => p.rank === 'F')!.pos, flagTo);
  const guard = neighbours(flagTo).filter((q) => inZone(me, q));
  for (const q of guard) {
    if (pl.find((p) => p.pos === q)!.rank === 'B') continue;
    const spare = pl.find((p) => p.rank === 'B' && !guard.includes(p.pos));
    if (spare) swap(spare.pos, q);
  }
  return pl;
}

/** Choose a move for `me` from `me`'s own view. Always one of `legalMoves(view, me)`. */
export function chooseBotMove(view: FrontlineView, me: PlayerID, rnd: () => number): MoveArgs {
  const moves = legalMoves(view, me);
  const at = new Map<Pos, ViewPiece>(view.pieces.map((p) => [p.pos, p]));
  const forward = (from: Pos, to: Pos) => (me === '0' ? rowOf(from) - rowOf(to) : rowOf(to) - rowOf(from));
  // a known enemy next to `sq` that would beat `rank` by attacking it
  const threatened = (sq: Pos, rank: Rank) => neighbours(sq).some((q) => {
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
  return best;
}
