import type { PlayerID } from '@boboland/shared/src/egyptian';

/**
 * Seats around the oval, from the viewer's place: the viewer sits at the bottom and play goes clockwise, so the
 * next player in deal order sits to their left. Spectators see the first player in deal order at the bottom.
 */
export function seatOrder(players: readonly PlayerID[], me: PlayerID | null): PlayerID[] {
  const i = me === null ? 0 : Math.max(0, players.indexOf(me));
  return [...players.slice(i), ...players.slice(0, i)];
}

/** Degrees, screen coordinates (y down): 90 = bottom, 180 = left, 270 = top; clockwise on screen. */
export const seatAngle = (index: number, n: number): number => 90 + (index * 360) / n;

/** Position on the oval in % of the table box. */
export function seatPos(index: number, n: number, rx = 44, ry = 38): { x: number; y: number } {
  const a = (seatAngle(index, n) * Math.PI) / 180;
  return { x: 50 + rx * Math.cos(a), y: 48 + ry * Math.sin(a) };
}

/** Pass and play: Player 1 (seat 0) on the left of the screen, Player 2 (seat 1) on the right, like their keys. */
export const LOCAL_SIDE: Record<'0' | '1', 'left' | 'right'> = { 0: 'left', 1: 'right' };
