/**
 * Frontline army. One table: rename a piece here and the whole game follows.
 * Ranks 1..10 fight by number; 'F' (command post) and 'B' (mine) are special and never move.
 */
export type Rank = 'F' | 'B' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface PieceKind { rank: Rank; code: string; name: string; count: number; movable: boolean }

export const ARMY: readonly PieceKind[] = [
  { rank: 'F', code: 'CMD', name: 'Command Post', count: 1, movable: false },
  { rank: 'B', code: 'MIN', name: 'Mine', count: 6, movable: false },
  { rank: 1, code: 'OPR', name: 'Operative', count: 1, movable: true },
  { rank: 2, code: 'SCT', name: 'Scout', count: 8, movable: true },
  { rank: 3, code: 'ENG', name: 'Engineer', count: 5, movable: true },
  { rank: 4, code: 'SGT', name: 'Sergeant', count: 4, movable: true },
  { rank: 5, code: 'LTN', name: 'Lieutenant', count: 4, movable: true },
  { rank: 6, code: 'CPT', name: 'Captain', count: 4, movable: true },
  { rank: 7, code: 'MAJ', name: 'Major', count: 3, movable: true },
  { rank: 8, code: 'COL', name: 'Colonel', count: 2, movable: true },
  { rank: 9, code: 'GEN', name: 'General', count: 1, movable: true },
  { rank: 10, code: 'MSL', name: 'Marshal', count: 1, movable: true },
];

export const ARMY_SIZE = ARMY.reduce((n, k) => n + k.count, 0);

export const SCOUT: Rank = 2;
export const ENGINEER: Rank = 3;
export const OPERATIVE: Rank = 1;
export const MARSHAL: Rank = 10;

const BY_RANK = new Map<Rank, PieceKind>(ARMY.map((k) => [k.rank, k]));
export const isRank = (r: unknown): r is Rank => BY_RANK.has(r as Rank);
export const kindOf = (r: Rank): PieceKind => BY_RANK.get(r)!;
