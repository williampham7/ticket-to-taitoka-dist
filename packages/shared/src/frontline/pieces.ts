/**
 * Frontline armies. One table per army: rename a piece here and the whole game follows.
 * Ranks 1..10 fight by number; 'F' (command post) and 'B' (mine) are special and never move.
 * 'P' is the Spotter (Spotter army only): it fights between the Operative and the Scout, and may name an
 * adjacent enemy piece instead of moving (see `applySpot` in rules.ts).
 */
export type Rank = 'F' | 'B' | 'P' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PieceKind { rank: Rank; code: string; name: string; count: number; movable: boolean }

/** The two armies a match can be played with: the classic 40, or the 30-piece army with Spotters. */
export type ArmyId = 'classic' | 'spotter';
export const ARMY_IDS: readonly ArmyId[] = ['classic', 'spotter'];
export const isArmyId = (x: unknown): x is ArmyId => ARMY_IDS.includes(x as ArmyId);

export interface Army {
  id: ArmyId;
  name: string;
  blurb: string;
  /** Setup rows per side (each row is 10 squares, so rows * 10 = pieces). */
  rows: number;
  kinds: readonly PieceKind[];
}

const KIND = {
  F: { rank: 'F', code: 'CMD', name: 'Command Post', movable: false },
  B: { rank: 'B', code: 'MIN', name: 'Mine', movable: false },
  1: { rank: 1, code: 'OPR', name: 'Operative', movable: true },
  P: { rank: 'P', code: 'SPT', name: 'Spotter', movable: true },
  2: { rank: 2, code: 'SCT', name: 'Scout', movable: true },
  3: { rank: 3, code: 'ENG', name: 'Engineer', movable: true },
  4: { rank: 4, code: 'SGT', name: 'Sergeant', movable: true },
  5: { rank: 5, code: 'LTN', name: 'Lieutenant', movable: true },
  6: { rank: 6, code: 'CPT', name: 'Captain', movable: true },
  7: { rank: 7, code: 'MAJ', name: 'Major', movable: true },
  8: { rank: 8, code: 'COL', name: 'Colonel', movable: true },
  9: { rank: 9, code: 'GEN', name: 'General', movable: true },
  10: { rank: 10, code: 'MSL', name: 'Marshal', movable: true },
} as const satisfies Record<string, Omit<PieceKind, 'count'>>;

const roster = (counts: [keyof typeof KIND, number][]): PieceKind[] => counts.map(([r, count]) => ({ ...KIND[r], count }));

export const ARMIES: Record<ArmyId, Army> = {
  classic: {
    id: 'classic', name: 'Classic', blurb: '40 pieces on four rows: the full army.', rows: 4,
    kinds: roster([['F', 1], ['B', 6], [1, 1], [2, 8], [3, 5], [4, 4], [5, 4], [6, 4], [7, 3], [8, 2], [9, 1], [10, 1]]),
  },
  spotter: {
    id: 'spotter', name: 'Spotter', blurb: '30 pieces on three rows, with two Spotters that remove a piece by naming it.', rows: 3,
    kinds: roster([['F', 1], ['B', 3], [1, 1], ['P', 2], [2, 4], [3, 4], [4, 3], [5, 3], [6, 3], [7, 2], [8, 2], [9, 1], [10, 1]]),
  },
};

/** The classic army (the default). */
export const ARMY: readonly PieceKind[] = ARMIES.classic.kinds;
export const ARMY_SIZE = 40;

export const armyKinds = (id: ArmyId = 'classic'): readonly PieceKind[] => ARMIES[id].kinds;
export const armySize = (id: ArmyId = 'classic'): number => ARMIES[id].kinds.reduce((n, k) => n + k.count, 0);
export const zoneRows = (id: ArmyId = 'classic'): number => ARMIES[id].rows;
export const countOf = (id: ArmyId, r: Rank): number => ARMIES[id].kinds.find((k) => k.rank === r)?.count ?? 0;

export const SCOUT: Rank = 2;
export const ENGINEER: Rank = 3;
export const OPERATIVE: Rank = 1;
export const MARSHAL: Rank = 10;
export const SPOTTER: Rank = 'P';

const BY_RANK = new Map<Rank, PieceKind>(Object.values(KIND).map((k) => [k.rank as Rank, { ...k, count: 0 }]));
export const isRank = (r: unknown): r is Rank => BY_RANK.has(r as Rank);
/** Name, code and whether it moves (the same in every army; counts come from the army). */
export const kindOf = (r: Rank): PieceKind => BY_RANK.get(r)!;

/**
 * The short mark printed on a tile. Numbers are the rank; in the Spotter army the Spotter is "1" and the
 * Operative "S", as that army's own numbering has it. Command posts and mines carry no mark.
 */
export function badgeOf(r: Rank, army: ArmyId = 'classic'): string {
  if (r === 'F' || r === 'B') return '';
  if (r === SPOTTER) return '1';
  if (r === OPERATIVE && army === 'spotter') return 'S';
  return String(r);
}

/** Combat strength of a moving piece: the Spotter sits between the Operative (1) and the Scout (2). */
export const strengthOf = (r: Rank): number => (r === SPOTTER ? 1.5 : typeof r === 'number' ? r : 0);
