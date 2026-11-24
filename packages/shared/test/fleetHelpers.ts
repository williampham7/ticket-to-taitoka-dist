import { deploy, newMatch, sq, type Deployment, type FleetState, type Mode, type ShipPlacement, type WeaponId } from '../src/fleet';

/**
 * The test fleet: every ship horizontal from column A, one ship on every second row.
 * Dreadnought A1-E1, Cruiser A3-D3, Frigate A5-C5, Submarine A7-C7, Corvette A9-B9.
 */
export const STANDARD: ShipPlacement[] = [
  { cls: 'dreadnought', at: sq(0, 0), dir: 'h' },
  { cls: 'cruiser', at: sq(0, 2), dir: 'h' },
  { cls: 'frigate', at: sq(0, 4), dir: 'h' },
  { cls: 'submarine', at: sq(0, 6), dir: 'h' },
  { cls: 'corvette', at: sq(0, 8), dir: 'h' },
];

/** A match already in battle, both sides on the STANDARD fleet unless given; seat 0 opens. */
export function battle(
  mode: Mode = 'classic',
  opts: { bestOf?: 1 | 3 | 5; loadout?: Partial<Record<'0' | '1', WeaponId[]>>; deploy?: Partial<Record<'0' | '1', Partial<Deployment>>> } = {},
): FleetState {
  const S = newMatch(mode, opts.bestOf ?? 1, '0');
  for (const p of ['0', '1'] as const) {
    const d: Deployment = { ships: STANDARD, loadout: opts.loadout?.[p] ?? [], ...opts.deploy?.[p] };
    const err = deploy(S, p, d);
    if (err) throw new Error(`test deployment for ${p}: ${err}`);
  }
  return S;
}

/** Every square of the STANDARD fleet. */
export const STANDARD_SQUARES = [0, 1, 2, 3, 4, 20, 21, 22, 23, 40, 41, 42, 60, 61, 62, 80, 81];
