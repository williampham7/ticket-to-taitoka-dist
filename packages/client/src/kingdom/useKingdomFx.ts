import { useEffect, useRef, useState } from 'react';
import type { KEvent, KView } from '@boboland/shared/src/kingdom';
import { applyEvent, newEvents } from './fxQueue';
import { evMs, useFx } from './fx';

/** The event playing now: `before` is the display state it starts from, `d` (returned) the state it ends in. */
export interface Anim { e: KEvent; before: KView; start: number; dur: number; key: number }

/**
 * Keeps a display state and steps it through queued log events one by one. Input stays locked (`busy`) until the
 * queue is empty. On mount or reconnect the backlog is skipped: the display jumps to the current view.
 * `onEvent` fires as each event starts playing (sounds hook in here).
 */
export function useKingdomFx(view: KView, onEvent?: (e: KEvent, d: KView) => void): { d: KView; anim: Anim | null; busy: boolean } {
  useFx(); // re-render when the setting changes
  const [st, setSt] = useState<{ d: KView; anim: Anim | null }>({ d: view, anim: null });
  const shown = useRef(view);
  const seen = useRef(view.logTotal);
  const queue = useRef<KEvent[]>([]);
  const latest = useRef(view);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyN = useRef(0);
  const cb = useRef(onEvent);
  cb.current = onEvent;
  latest.current = view;
  const show = (d: KView, anim: Anim | null) => { shown.current = d; setSt({ d, anim }); };

  const playNext = () => {
    timer.current = null;
    const e = queue.current.shift();
    if (!e) { show(latest.current, null); return; }
    const before = shown.current;
    const after = applyEvent(before, e);
    cb.current?.(e, after);
    const dur = evMs(e);
    if (dur <= 0) { shown.current = after; playNext(); return; }
    show(after, { e, before, start: performance.now(), dur, key: ++keyN.current });
    timer.current = setTimeout(playNext, dur);
  };

  useEffect(() => {
    const fresh = newEvents(view, seen.current);
    seen.current = view.logTotal;
    if (fresh === null) {
      // missed events (reconnect, or more than the log keeps): jump to now
      queue.current = [];
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      show(view, null);
      return;
    }
    if (fresh.length) { queue.current.push(...fresh); if (!timer.current) playNext(); } else if (!timer.current) show(view, null);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { d: st.d, anim: st.anim, busy: !!st.anim || queue.current.length > 0 || view.logTotal > seen.current };
}
