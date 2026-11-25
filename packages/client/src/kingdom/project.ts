/**
 * The tray's tilt, shared by the CSS transform (Board.tsx) and the flat overlay that draws everything upright
 * (heroes, footprints, sparkles, flights). Board units: T = one tile in px; the stage is STAGE x STAGE tiles with
 * the 7x7 grid inset by INSET on every side; (0, 0) of `project` is the centre of the stage.
 */
export const STAGE = 9.2;
export const INSET = (STAGE - 7) / 2;
export const TILT_DEG = 27;
const A = (TILT_DEG * Math.PI) / 180;
export const perspectivePx = (T: number) => T * STAGE * 1.7;
export const trayTransform = (T: number, tilt: boolean) => (tilt ? `perspective(${perspectivePx(T)}px) rotateX(${TILT_DEG}deg)` : 'none');

/** Where a point of the tray (in tiles, from the stage centre) appears on screen, and how much it is scaled. */
export function projectXY(x: number, y: number, T: number, tilt: boolean): { x: number; y: number; s: number } {
  if (!tilt) return { x: x * T, y: y * T, s: 1 };
  const P = perspectivePx(T);
  const yy = y * T;
  const s = P / (P - yy * Math.sin(A));
  return { x: x * T * s, y: yy * Math.cos(A) * s, s };
}
/** The centre of cell (row, col) on screen, relative to the stage centre. */
export const project = (r: number, c: number, T: number, tilt: boolean) => projectXY(c - 3, r - 3, T, tilt);
