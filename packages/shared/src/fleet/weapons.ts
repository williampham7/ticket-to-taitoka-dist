/**
 * Super Weapons: the one tuning table (pattern kind, charge speed, unlock rule), and the pattern geometry.
 * Charge and unlocks are tuning knobs: change them here only.
 */
import { onBoard, sq, xOf, yOf } from './board';

export type WeaponId =
  | 'frag' | 'airStrike' | 'chainGun' | 'shield' | 'seaMine' | 'decoy' | 'torpedo'
  | 'supernova' | 'thunderhead' | 'cherry' | 'reinforcement' | 'maelstrom';
export type Dir = 'h' | 'v';
export type Speed = 'ready' | 'quick' | 'normal' | 'slow' | 'verySlow';

/** Turns of charge before an active weapon can fire. */
export const CHARGE_TURNS = { quick: 2, normal: 3, slow: 5, verySlow: 7 } as const;

export type Unlock =
  | { kind: 'start' }
  | { kind: 'sinks'; n: number }
  | { kind: 'flawless' }      // win a round without losing a ship
  | { kind: 'salvoAll5' }     // hit all 5 enemy ships with one salvo (Salvo mode)
  | { kind: 'quickWin'; turns: number }; // win a round within this many of your turns

export interface WeaponDef {
  id: WeaponId;
  name: string;
  passive: boolean;
  speed: Speed;
  /** turns of charge (0 = passive, always ready) */
  charge: number;
  oncePerRound?: boolean;
  unlock: Unlock;
  /** one line for the loadout picker */
  blurb: string;
}

const def = (id: WeaponId, name: string, speed: Speed, unlock: Unlock, blurb: string, extra: Partial<WeaponDef> = {}): WeaponDef => ({
  id, name, passive: speed === 'ready', speed, charge: speed === 'ready' ? 0 : CHARGE_TURNS[speed], unlock, blurb, ...extra,
});

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  frag: def('frag', 'Frag Bomb', 'normal', { kind: 'start' }, '5 squares in an X'),
  airStrike: def('airStrike', 'Air Strike', 'quick', { kind: 'start' }, '3 squares, every other one along a line'),
  chainGun: def('chainGun', 'Chain Gun', 'slow', { kind: 'start' }, '5 squares in a column'),
  shield: def('shield', 'Shield', 'ready', { kind: 'start' }, 'Each ship ignores the first hit it takes'),
  seaMine: def('seaMine', 'Sea Mine', 'quick', { kind: 'sinks', n: 10 }, 'Drifts each turn and explodes under a ship'),
  decoy: def('decoy', 'Decoy', 'ready', { kind: 'sinks', n: 25 }, 'A fake 1-square ship that shows a hit'),
  torpedo: def('torpedo', 'Torpedo', 'verySlow', { kind: 'sinks', n: 45 }, 'Runs up a column to the first ship'),
  supernova: def('supernova', 'Supernova', 'slow', { kind: 'sinks', n: 100 }, 'One square: a hit sinks the whole ship'),
  thunderhead: def('thunderhead', 'Thunderhead', 'slow', { kind: 'sinks', n: 135 }, 'A 3x3 block'),
  cherry: def('cherry', 'Cherry Bomb', 'normal', { kind: 'flawless' }, '5 squares in a + shape'),
  reinforcement: def('reinforcement', 'Reinforcement', 'ready', { kind: 'salvoAll5' }, 'Adds a Cutter (3) to your fleet'),
  maelstrom: def('maelstrom', 'Maelstrom', 'verySlow', { kind: 'quickWin', turns: 10 }, '13-square diamond, once per round', { oncePerRound: true }),
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const LOADOUT_SIZE = 3;
export const isWeaponId = (w: unknown): w is WeaponId => typeof w === 'string' && Object.prototype.hasOwnProperty.call(WEAPONS, w);
export const isPassive = (w: WeaponId): boolean => WEAPONS[w].passive;

/** [dx, dy] offsets of the area weapons around their anchor (the centre). */
const OFFSETS: Partial<Record<WeaponId, (dir: Dir) => [number, number][]>> = {
  frag: () => [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]],
  cherry: () => [[0, 0], [0, -1], [-1, 0], [1, 0], [0, 1]],
  airStrike: (dir) => [-2, 0, 2].map((d) => (dir === 'h' ? [d, 0] : [0, d])),
  chainGun: () => [-2, -1, 0, 1, 2].map((d) => [0, d]),
  thunderhead: () => [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => [dx, dy] as [number, number])),
  maelstrom: () => {
    const out: [number, number][] = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) out.push([dx, dy]);
    return out;
  },
  supernova: () => [[0, 0]],
  seaMine: () => [[0, 0]],
};

/** The squares a weapon covers around `anchor`, clipped at the board edge, in reading order. */
export function patternSquares(id: WeaponId, anchor: number, dir: Dir = 'h'): number[] {
  const offs = OFFSETS[id]?.(dir) ?? [];
  const x = xOf(anchor), y = yOf(anchor);
  return offs.filter(([dx, dy]) => onBoard(x + dx, y + dy)).map(([dx, dy]) => sq(x + dx, y + dy)).sort((a, b) => a - b);
}

/** Weapons that strike an area pattern (resolved square by square). */
export const AREA_WEAPONS: WeaponId[] = ['frag', 'airStrike', 'chainGun', 'thunderhead', 'cherry', 'maelstrom'];
