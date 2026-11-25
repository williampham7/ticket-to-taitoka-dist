import { applyShift, type KEvent, type KView } from '@boboland/shared/src/kingdom';

/**
 * The display state steps through the public event log one event at a time, so a bot's shift and move that
 * arrive in one update still play in order. Nothing here diffs boards: each event is re-applied with the same
 * pure rules the server used. When the queue drains, the display snaps to the real view.
 */
export function applyEvent(d: KView, e: KEvent): KView {
  switch (e.k) {
    case 'shift': {
      const r = applyShift(d.board, d.spare, d.pos, e.at, e.rot);
      return { ...d, board: r.board, spare: r.spare, pos: r.pos, lastAt: e.at, step: 'move' };
    }
    case 'move': return { ...d, pos: { ...d.pos, [e.p]: e.path[e.path.length - 1] } };
    case 'collect': return { ...d, found: { ...d.found, [e.p]: [...d.found[e.p], e.t] }, left: { ...d.left, [e.p]: Math.max(0, d.left[e.p] - 1) } };
    case 'turn': return { ...d, current: e.p, step: 'shift' };
    case 'resign': { const pos = { ...d.pos }; delete pos[e.p]; return { ...d, out: [...d.out, e.p], pos }; }
    case 'win': return { ...d, result: { winner: e.p, reason: e.reason } };
    default: return d;
  }
}

/** The events in `view` newer than `seen`, or null when some were missed (the client must jump). */
export function newEvents(view: KView, seen: number): KEvent[] | null {
  if (view.logTotal <= seen) return [];
  const fresh = view.log.filter((e) => e.n > seen);
  if (!fresh.length || fresh[0].n !== seen + 1) return null;
  return fresh;
}
