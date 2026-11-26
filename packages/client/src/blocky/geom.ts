import { orientations, type PieceId, type Shape } from '@boboland/shared/src/blocky';

/** Orientation maths on the shared orientation lists (indices into `orientations(piece)`). */
const key = (cells: [number, number][]) => {
  const r0 = Math.min(...cells.map((c) => c[0])), c0 = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).join(';');
};
const find = (piece: PieceId, cells: [number, number][]) => {
  const k = key(cells);
  return orientations(piece).findIndex((o) => o.cells.join(';') === k);
};
/** A quarter turn clockwise. */
export const rotateOrient = (piece: PieceId, orient: number) => find(piece, orientations(piece)[orient].cells.map(([r, c]) => [c, -r] as [number, number]));
/** A mirror left-right. */
export const flipOrient = (piece: PieceId, orient: number) => find(piece, orientations(piece)[orient].cells.map(([r, c]) => [r, -c] as [number, number]));
export const shapeOf = (piece: PieceId, orient: number): Shape => orientations(piece)[orient];
/** The shape cell nearest its middle: where a held piece hangs from the pointer. */
export function grabCell(sh: Shape): [number, number] {
  const mr = (sh.h - 1) / 2, mc = (sh.w - 1) / 2;
  return sh.cells.reduce((b, x) => (Math.hypot(x[0] - mr, x[1] - mc) < Math.hypot(b[0] - mr, b[1] - mc) ? x : b));
}
/** `at` for a shape whose cell `grab` sits on board cell (r, c); -1 when the origin leaves the board. */
export function atFor(size: number, sh: Shape, grab: [number, number], r: number, c: number): number {
  const r0 = r - grab[0], c0 = c - grab[1];
  return r0 < 0 || c0 < 0 || r0 >= size || c0 >= size ? -1 : r0 * size + c0;
}
