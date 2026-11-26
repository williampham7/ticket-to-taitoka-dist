import { applyPlace, guildsOf, type BEvent, type BView } from '@boboland/shared/src/blocky';

/**
 * The display state steps through the public log one event at a time, re-applying each with the same pure rules
 * the server used (never diffing boards), so a bot's move and an auto-pass that arrive together play in order.
 * When the queue drains, the display snaps to the real view.
 */
export function applyEvent(d: BView, e: BEvent): BView {
  switch (e.k) {
    case 'place': {
      const s: BView = { ...d, placed: [...d.placed], cells: [...d.cells], shelf: { ...d.shelf } };
      applyPlace(s, e.guild, { piece: e.piece, orient: e.orient, at: e.at });
      return s;
    }
    case 'stuck': return d.grounded.includes(e.guild) ? d : { ...d, grounded: [...d.grounded, e.guild] };
    case 'done': return { ...d, grounded: [...new Set([...d.grounded, ...guildsOf(d, e.p)])] };
    case 'resign': case 'dismiss': return { ...d, out: [...new Set([...d.out, e.p])], grounded: [...new Set([...d.grounded, ...guildsOf(d, e.p)])] };
    case 'turn': return { ...d, current: e.guild, actor: e.actor };
    default: return d;
  }
}

/** The events in `view` newer than `seen`, or null when some were missed (the client must jump). */
export function newEvents(view: BView, seen: number): BEvent[] | null {
  if (view.logTotal <= seen) return [];
  const fresh = view.log.filter((e) => e.n > seen);
  if (!fresh.length || fresh[0].n !== seen + 1) return null;
  return fresh;
}
