import { CELLS, SIZE, isSquare, sq, xOf, yOf } from './board';
import { LOADOUT_SIZE, isWeaponId, type Dir, type WeaponId } from './weapons';

export type Mode = 'classic' | 'salvo' | 'super';
export const MODES: Mode[] = ['classic', 'salvo', 'super'];
export type ShipClass = 'dreadnought' | 'cruiser' | 'frigate' | 'submarine' | 'corvette' | 'cutter';

export const SHIPS: Record<ShipClass, { name: string; length: number }> = {
  dreadnought: { name: 'Dreadnought', length: 5 },
  cruiser: { name: 'Cruiser', length: 4 },
  frigate: { name: 'Frigate', length: 3 },
  submarine: { name: 'Submarine', length: 3 },
  corvette: { name: 'Corvette', length: 2 },
  cutter: { name: 'Cutter', length: 3 },
};
export const SHIP_CLASSES = Object.keys(SHIPS) as ShipClass[];
export const BASE_FLEET: ShipClass[] = ['dreadnought', 'cruiser', 'frigate', 'submarine', 'corvette'];

/** A ship as placed: its top-left square and direction (h = towards J, v = towards row 10). */
export interface ShipPlacement { cls: ShipClass; at: number; dir: Dir }

/** What a player submits in the placement phase. `decoy` is the Decoy's square (only with the Decoy). */
export interface Deployment { ships: ShipPlacement[]; loadout: WeaponId[]; decoy?: number | null }

/** The classes a player must place: the base five, plus the Cutter with Reinforcement. */
export function fleetFor(mode: Mode, loadout: readonly WeaponId[]): ShipClass[] {
  return mode === 'super' && loadout.includes('reinforcement') ? [...BASE_FLEET, 'cutter'] : [...BASE_FLEET];
}

export function shipSquares(p: ShipPlacement): number[] | null {
  const len = SHIPS[p.cls].length;
  const x = xOf(p.at), y = yOf(p.at);
  if ((p.dir === 'h' ? x : y) + len > SIZE) return null;
  return Array.from({ length: len }, (_, i) => (p.dir === 'h' ? sq(x + i, y) : sq(x, y + i)));
}

const isPlacement = (s: unknown): s is ShipPlacement => {
  const o = s as ShipPlacement;
  return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(SHIPS, o.cls) && isSquare(o.at) && (o.dir === 'h' || o.dir === 'v');
};

/** Why a deployment is not acceptable for this mode, or undefined when it is. */
export function validateDeployment(mode: Mode, d: unknown): string | undefined {
  if (!d || typeof d !== 'object') return 'deployment must be an object';
  const { ships, loadout, decoy } = d as Deployment;
  if (!Array.isArray(loadout) || !loadout.every(isWeaponId)) return 'bad loadout';
  if (mode === 'super') {
    if (loadout.length !== LOADOUT_SIZE || new Set(loadout).size !== LOADOUT_SIZE) return `pick ${LOADOUT_SIZE} different weapons`;
  } else if (loadout.length) return 'no weapons in this mode';
  if (!Array.isArray(ships) || !ships.every(isPlacement)) return 'bad ships';
  const want = fleetFor(mode, loadout).slice().sort().join();
  if (ships.map((s) => s.cls).sort().join() !== want) return 'wrong fleet';
  const used = new Set<number>();
  for (const s of ships) {
    const cells = shipSquares(s);
    if (!cells) return `${SHIPS[s.cls].name} is off the board`;
    for (const c of cells) {
      if (used.has(c)) return 'ships overlap';
      used.add(c);
    }
  }
  if (loadout.includes('decoy')) {
    if (!isSquare(decoy)) return 'place the Decoy';
    if (used.has(decoy)) return 'the Decoy cannot sit on a ship';
  } else if (decoy !== undefined && decoy !== null) return 'no Decoy in the loadout';
  return undefined;
}

/** Random non-overlapping placements for these classes (squares in `avoid` stay free). */
export function randomShips(classes: readonly ShipClass[], rnd: () => number, avoid: ReadonlySet<number> = new Set()): ShipPlacement[] {
  for (;;) {
    const used = new Set(avoid);
    const out: ShipPlacement[] = [];
    let ok = true;
    for (const cls of classes) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const p: ShipPlacement = { cls, at: Math.floor(rnd() * CELLS), dir: rnd() < 0.5 ? 'h' : 'v' };
        const cells = shipSquares(p);
        if (!cells || cells.some((c) => used.has(c))) continue;
        cells.forEach((c) => used.add(c));
        out.push(p);
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return out;
  }
}

/** A random valid deployment for this mode and loadout (Decoy on a free square). */
export function randomDeployment(mode: Mode, loadout: WeaponId[], rnd: () => number): Deployment {
  const lo = mode === 'super' ? loadout : [];
  const ships = randomShips(fleetFor(mode, lo), rnd);
  const d: Deployment = { ships, loadout: lo };
  if (lo.includes('decoy')) {
    const used = new Set(ships.flatMap((s) => shipSquares(s)!));
    const free = Array.from({ length: CELLS }, (_, i) => i).filter((c) => !used.has(c));
    d.decoy = free[Math.floor(rnd() * free.length)];
  }
  return d;
}
