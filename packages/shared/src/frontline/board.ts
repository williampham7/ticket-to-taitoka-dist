/**
 * Frontline board geometry: 10 columns and `rows` rows (10 for the classic army, 8 for the Spotter army),
 * squares numbered row * 10 + col (row 0 at the top). The lakes always fill the middle two rows.
 */
/** Columns, and the classic board's rows (the default wherever a board height is optional). */
export const SIZE = 10;
export type Pos = number;
export type PlayerID = '0' | '1';

export const pos = (r: number, c: number): Pos => r * SIZE + c;
export const rowOf = (p: Pos) => Math.floor(p / SIZE);
export const colOf = (p: Pos) => p % SIZE;
export const onBoard = (r: number, c: number, rows = SIZE) => r >= 0 && r < rows && c >= 0 && c < SIZE;
export const squareCount = (rows = SIZE) => rows * SIZE;

/** Lakes: the middle two rows (4-5 on 10 rows, 3-4 on 8), columns 2-3 and 6-7. Nothing may enter them. */
export const isLake = (p: Pos, rows = SIZE) => {
  const r = rowOf(p), c = colOf(p);
  return (r === rows / 2 - 1 || r === rows / 2) && (c === 2 || c === 3 || c === 6 || c === 7);
};

export const other = (p: PlayerID): PlayerID => (p === '0' ? '1' : '0');

/** Player 0 sets up on the bottom `zone` rows of a `rows`-row board (6-9 for the classic four), player 1 on the top ones. */
export const inZone = (player: PlayerID, p: Pos, zone = 4, rows = SIZE) => {
  if (!Number.isInteger(p) || p < 0 || p >= squareCount(rows)) return false;
  const r = rowOf(p);
  return player === '0' ? r >= rows - zone : r < zone;
};

export const zoneSquares = (player: PlayerID, zone = 4, rows = SIZE): Pos[] =>
  Array.from({ length: zone * SIZE }, (_, i) => (player === '0' ? (rows - zone) * SIZE + i : i));

export const DIRS: readonly [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
