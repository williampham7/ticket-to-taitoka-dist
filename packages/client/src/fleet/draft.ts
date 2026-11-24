/** The placement screen's draft fleet: pure helpers (place, move, rotate, drop, Decoy), unit-tested. */
import {
  CELLS, SHIPS, SIZE, randomShips, shipSquares, sq, xOf, yOf,
  type Deployment, type Dir, type ShipClass, type ShipPlacement, type WeaponId,
} from '@boboland/shared/src/fleet';

export interface Draft { ships: Partial<Record<ShipClass, ShipPlacement>>; decoy: number | null }
export const EMPTY_DRAFT: Draft = { ships: {}, decoy: null };

/** Every square taken by the draft's ships (except `skip`), sorted. */
export function squaresOf(d: Draft, skip?: ShipClass): number[] {
  return (Object.values(d.ships) as ShipPlacement[]).filter((p) => p.cls !== skip).flatMap((p) => shipSquares(p) ?? []).sort((a, b) => a - b);
}

export function fits(d: Draft, p: ShipPlacement): boolean {
  const cells = shipSquares(p);
  if (!cells) return false;
  const taken = new Set(squaresOf(d, p.cls));
  if (d.decoy !== null) taken.add(d.decoy);
  return cells.every((c) => !taken.has(c));
}

export function place(d: Draft, p: ShipPlacement): Draft | null {
  return fits(d, p) ? { ...d, ships: { ...d.ships, [p.cls]: { ...p } } } : null;
}

export function remove(d: Draft, cls: ShipClass): Draft {
  const ships = { ...d.ships };
  delete ships[cls];
  return { ...d, ships };
}

/** Turn a ship about its first square; if it would stick out or hit something, slide it back along its new line. */
export function rotate(d: Draft, cls: ShipClass): Draft | null {
  const p = d.ships[cls];
  if (!p) return null;
  const dir: Dir = p.dir === 'h' ? 'v' : 'h';
  const x = xOf(p.at), y = yOf(p.at);
  for (let back = 0; back < SHIPS[cls].length; back++) {
    const nx = dir === 'h' ? x - back : x, ny = dir === 'v' ? y - back : y;
    if (nx < 0 || ny < 0) break;
    const next = place(d, { cls, at: sq(nx, ny), dir });
    if (next) return next;
  }
  return null;
}

/** The top-left square for a ship dropped with its `grab`-th segment on `square`, kept on the board along its line. */
export function anchorForDrop(cls: ShipClass, dir: Dir, square: number, grab: number): number {
  const len = SHIPS[cls].length;
  const clamp = (v: number) => Math.max(0, Math.min(SIZE - len, v));
  return dir === 'h' ? sq(clamp(xOf(square) - grab), yOf(square)) : sq(xOf(square), clamp(yOf(square) - grab));
}

export function placeDecoy(d: Draft, s: number): Draft | null {
  return s >= 0 && s < CELLS && !squaresOf(d).includes(s) ? { ...d, decoy: s } : null;
}

export function complete(d: Draft, classes: readonly ShipClass[], needDecoy: boolean): boolean {
  return classes.every((c) => d.ships[c]) && Object.keys(d.ships).length === classes.length && (!needDecoy || d.decoy !== null);
}

/** Redeploy: every ship (and the Decoy) at random. */
export function randomDraft(classes: readonly ShipClass[], withDecoy: boolean, rnd: () => number): Draft {
  const ships = randomShips(classes, rnd);
  const d: Draft = { ships: Object.fromEntries(ships.map((p) => [p.cls, p])), decoy: null };
  if (!withDecoy) return d;
  const taken = new Set(squaresOf(d));
  const free = Array.from({ length: CELLS }, (_, i) => i).filter((i) => !taken.has(i));
  return { ...d, decoy: free[Math.floor(rnd() * free.length)] };
}

export function toDeployment(d: Draft, loadout: WeaponId[]): Deployment {
  const dep: Deployment = { ships: Object.values(d.ships) as ShipPlacement[], loadout: [...loadout] };
  if (loadout.includes('decoy')) dep.decoy = d.decoy;
  return dep;
}
