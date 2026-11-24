/** Fleet board geometry: 10x10, columns A-J (x 0-9) left to right, rows 1-10 (y 0-9) top to bottom. Square = y*10+x. */
export type PlayerID = '0' | '1';
export const SIZE = 10;
export const CELLS = SIZE * SIZE;
export const COLS = 'ABCDEFGHIJ';

export const sq = (x: number, y: number): number => y * SIZE + x;
export const xOf = (s: number): number => s % SIZE;
export const yOf = (s: number): number => Math.floor(s / SIZE);
export const onBoard = (x: number, y: number): boolean => x >= 0 && x < SIZE && y >= 0 && y < SIZE;
export const isSquare = (s: unknown): s is number => typeof s === 'number' && Number.isInteger(s) && s >= 0 && s < CELLS;
export const label = (s: number): string => `${COLS[xOf(s)]}${yOf(s) + 1}`;
export const other = (p: PlayerID): PlayerID => (p === '0' ? '1' : '0');

export const ORTHO: readonly [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function neighbours(s: number): number[] {
  const x = xOf(s), y = yOf(s);
  return ORTHO.filter(([dx, dy]) => onBoard(x + dx, y + dy)).map(([dx, dy]) => sq(x + dx, y + dy));
}
