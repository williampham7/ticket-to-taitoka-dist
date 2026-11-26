import { useEffect, useRef, useState } from 'react';
import type { BEvent, BView } from '@boboland/shared/src/blocky';
import { applyEvent, newEvents } from './fxQueue';
import { evMs, fxScale, placeTimes, BEAT } from './fx';
import { useSettings } from './settings';

/** One event playing (or still leaving residue): its display state before and after, and its beat times. */
export interface Anim {
  e: BEvent; key: number; start: number; before: BView; after: BView;
  /** blocking length (the queue waits for it) and total length (residue included), ms at the current speed */
  dur: number; total: number;
  /** place: the moment the blocks land (the board shows the merged piece from then on); travel: an opponent's piece flies in */
  land: number; travel: boolean;
}
export interface BlyFx { d: BView; busy: boolean; jumped: boolean; anims: Anim[]; hide: Set<number> }

/**
 * Keeps a display state and steps it through the public log one event at a time. Input stays locked (`busy`) while
 * an event's blocking length plays; its residue (flourish, sprite, "+N") overlaps whatever comes next. On a
 * reconnect gap the backlog is skipped and the display jumps (`jumped` is true for that render). A fresh game
 * (nothing placed yet) plays its opening `start` event so the guild reveal shows. `onEvent` fires as each starts.
 */
export function useBlockyFx(view: BView, me: string | null, onEvent?: (e: BEvent, d: BView, a: Anim) => void): BlyFx {
  const { fx } = useSettings();
  const fresh0 = view.placed.length === 0 && !view.result && view.log[0]?.n === 1;
  const [st, setSt] = useState<{ d: BView; anims: Anim[]; jumped: boolean }>({ d: view, anims: [], jumped: false });
  const shown = useRef(view);
  const seen = useRef(fresh0 ? 0 : view.logTotal);
  const queue = useRef<BEvent[]>([]);
  const latest = useRef(view);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keyN = useRef(0);
  const anims = useRef<Anim[]>([]);
  const [, tick] = useState(0);
  const cb = useRef(onEvent);
  cb.current = onEvent;
  latest.current = view;
  const show = (d: BView, jumped = false) => { shown.current = d; setSt({ d, anims: anims.current, jumped }); };
  const later = (ms: number, f: () => void) => { timers.current.push(setTimeout(f, ms)); };

  const playNext = () => {
    timer.current = null;
    const e = queue.current.shift();
    if (!e) { show(latest.current); return; }
    const before = shown.current;
    const after = applyEvent(before, e);
    const dur = evMs(e);
    if (dur <= 0) { shown.current = after; cb.current?.(e, after, { e, key: 0, start: 0, before, after, dur: 0, total: 0, land: 0, travel: false }); playNext(); return; }
    const travel = e.k === 'place' && e.p !== me;
    const t = e.k === 'place' ? placeTimes(e.points, travel) : null;
    const k = fxScale();
    const total = t ? t.total : e.k === 'turn' ? Math.round(BEAT.turn.ribbon * k) : e.k === 'start' ? dur : Math.round(1200 * k);
    const a: Anim = { e, key: ++keyN.current, start: performance.now(), before, after, dur, total, land: t ? t.land : 0, travel };
    anims.current = [...anims.current.filter((x) => performance.now() - x.start < x.total), a];
    cb.current?.(e, after, a);
    show(after);
    if (t) later(t.land, () => tick((x) => x + 1));
    later(total, () => { anims.current = anims.current.filter((x) => x !== a); tick((x) => x + 1); });
    timer.current = setTimeout(playNext, dur);
  };

  useEffect(() => {
    const fresh = newEvents(view, seen.current);
    seen.current = view.logTotal;
    if (fresh === null || fx === 'off') {
      // missed events (reconnect, or more than the log keeps), or animations off: jump to now
      queue.current = [];
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      anims.current = [];
      show(view, fresh === null);
      return;
    }
    if (fresh.length) { queue.current.push(...fresh); if (!timer.current) playNext(); } else if (!timer.current) show(view);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); timers.current.forEach(clearTimeout); }, []);
  const now = performance.now();
  const hide = new Set<number>();
  for (const a of anims.current) if (a.e.k === 'place' && now - a.start < a.land) { const i = a.after.placed.length - 1; if (i >= 0) hide.add(a.after.placed[i].n); }
  const busy = !!timer.current || queue.current.length > 0 || view.logTotal > seen.current;
  return { d: st.d, busy, jumped: st.jumped, anims: anims.current, hide };
}
