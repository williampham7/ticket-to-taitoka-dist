/** Battle screen logic, kept pure for tests: aiming, salvo marks, accuracy, and the one-square-at-a-time reveal. */
import {
  AREA_WEAPONS, isOpen, patternSquares, sq, xOf,
  type Dir, type FleetAction, type SeenCell, type ShipClass, type ViewReport, type WeaponId,
} from '@boboland/shared/src/fleet';

/** What the player is firing: the basic shell or one of the loadout's active weapons. */
export type Arm = 'shell' | WeaponId;

/** The squares an aim covers (shown as a ghost before firing). */
export function aimSquares(arm: Arm, anchor: number, dir: Dir, _seen: readonly SeenCell[]): number[] {
  if (arm === 'shell' || arm === 'supernova' || arm === 'seaMine') return [anchor];
  if (arm === 'torpedo') return Array.from({ length: 10 }, (_, i) => sq(xOf(anchor), 9 - i));
  if (AREA_WEAPONS.includes(arm)) return patternSquares(arm, anchor, dir);
  return [];
}

export function actionFor(arm: Arm, anchor: number, dir: Dir): FleetAction {
  if (arm === 'shell') return { type: 'shell', sq: anchor };
  if (arm === 'seaMine') return { type: 'mine', sq: anchor };
  if (arm === 'airStrike') return { type: 'weapon', id: arm, sq: anchor, dir };
  return { type: 'weapon', id: arm, sq: anchor };
}

/** Salvo: mark or unmark an open square, never more than `n`. */
export function toggleMark(marks: number[], s: number, n: number, seen: readonly SeenCell[]): number[] {
  if (marks.includes(s)) return marks.filter((m) => m !== s);
  if (!isOpen(seen[s]) || marks.length >= n) return marks;
  return [...marks, s];
}

export const accuracy = (hits: number, shots: number): number => (shots ? Math.round((hits / shots) * 100) : 0);

/**
 * A grid as it should look while results are still landing. `pending` are the reports not fully shown yet, oldest
 * first; the first one has revealed `step` of its squares. Squares not revealed yet show as unshot, and a ship sunk
 * by a pending report shows as hits (or, for a Supernova, as it was) until that report has finished.
 */
export function displayGrid(cells: readonly SeenCell[], pending: readonly ViewReport[], step: number, sunkSquares: (cls: ShipClass) => number[]): SeenCell[] {
  const out = cells.slice();
  pending.forEach((r, i) => {
    const revealed = i === 0 ? step : 0;
    const finished = i === 0 && step >= r.cells.length;
    if (!finished) {
      const before: SeenCell = r.kind === 'weapon' && r.weapon === 'supernova' ? null : 'hit';
      for (const q of r.sunk.flatMap(sunkSquares)) if (out[q] === 'sunk') out[q] = before;
    }
    r.cells.forEach((c, k) => {
      if (k >= revealed) out[c.sq] = null;
      else if (!finished && out[c.sq] === 'sunk') out[c.sq] = 'hit';
    });
  });
  return out;
}
