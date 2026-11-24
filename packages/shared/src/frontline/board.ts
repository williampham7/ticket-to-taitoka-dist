/** Frontline board geometry: a 10x10 grid, squares numbered row * 10 + col (row 0 at the top). */
export const SIZE = 10;
export type Pos = number;
export type PlayerID = '0' | '1';

export const pos = (r: number, c: number): Pos => r * SIZE + c;
export const rowOf = (p: Pos) => Math.floor(p / SIZE);
export const colOf = (p: Pos) => p % SIZE;
export const onBoard = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** Lakes: rows 4-5, columns 2-3 and 6-7. Nothing may enter them. */
export const isLake = (p: Pos) => {
  const r = rowOf(p), c = colOf(p);
  return (r === 4 || r === 5) && (c === 2 || c === 3 || c === 6 || c === 7);
};

export const other = (p: PlayerID): PlayerID => (p === '0' ? '1' : '0');

/** Player 0 sets up on rows 6-9 (bottom), player 1 on rows 0-3 (top). */
export const inZone = (player: PlayerID, p: Pos) => {
  if (!Number.isInteger(p) || p < 0 || p >= SIZE * SIZE) return false;
  const r = rowOf(p);
  return player === '0' ? r >= 6 : r <= 3;
};

export const zoneSquares = (player: PlayerID): Pos[] =>
  Array.from({ length: 40 }, (_, i) => (player === '0' ? 60 + i : i));

export const DIRS: readonly [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
