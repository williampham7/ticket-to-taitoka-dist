import type { BEvent } from './rules';

/**
 * Blocking animation lengths (ms) of each public event at full speed: the display queue waits for these, and the
 * server bots wait for them before acting. Flourishes, sprites, growth pops and "+N" are residue: they overlap
 * whatever comes next and are not counted here. The client's `fx.ts` scales these by the speed setting.
 */
export const BT = {
  /** a piece flies from the shelf (or banner) and drops: base + per square, at most 1100 for a pentomino */
  placeBase: 500, perSquare: 120,
  /** the "No room" cloud and stamp */
  stuck: 600,
  /** the turn banner glow */
  turn: 500,
  /** the guild reveal at the start */
  start: 1800,
  /** a seat is grounded / sent home */
  done: 600, resign: 700, dismiss: 700,
  /** the result page takes over */
  end: 0,
};

/** How long one event blocks the display queue at full speed. */
export function eventMs(e: BEvent): number {
  switch (e.k) {
    case 'place': return BT.placeBase + BT.perSquare * Math.min(5, Math.max(1, e.points));
    case 'stuck': return BT.stuck;
    case 'turn': return BT.turn;
    case 'start': return BT.start;
    case 'done': return BT.done;
    case 'resign': return BT.resign;
    case 'dismiss': return BT.dismiss;
    default: return BT.end;
  }
}
