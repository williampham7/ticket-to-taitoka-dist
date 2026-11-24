import { useEffect } from 'react';
import { nextTimed, type EgwState, type EgwView } from '@boboland/shared/src/egyptian';
import type { BgioClient } from '../lib/useClientState';

/** What the Egyptian War screen can ask of a seat. */
export interface EgwControls {
  ready: () => void;
  flip: () => void;
  slap: (round: number) => void;
  tick: () => void;
  leave: () => void;
}

export const controlsFor = (c: BgioClient): EgwControls => ({
  ready: () => c.moves.ready(),
  flip: () => c.moves.flip(),
  slap: (round) => c.moves.slap(round),
  tick: () => c.moves.tick(),
  leave: () => c.moves.leave(),
});

/** The raw state of an Egyptian War client: G is already the view. */
export interface EgwClientState { G: EgwState; ctx: { gameover?: { winner?: string } }; isConnected?: boolean }
export const viewOf = (s: EgwClientState): EgwView => s.G as unknown as EgwView;

/** When the next timed event is due, in server time (the view has every field nextTimed reads). */
export const dueAt = (v: EgwView): number | null => nextTimed(v as unknown as EgwState);

/**
 * Drive the server's timed events: when the next one is due (measured from when this view arrived, against the
 * server's `clock`), call `tick`, then retry every 150 ms until the state moves on. Seated clients only.
 * `stagger` (ms) delays this seat's first call, so the seats do not all send the same tick at once: the first
 * accepted tick changes the state and the others' timers start over.
 */
export function useTimers(view: EgwView | null, tick: () => void, active: boolean, stagger = 0) {
  const due = view ? dueAt(view) : null;
  const clock = view?.clock ?? 0;
  const seq = view?.seq ?? 0;
  useEffect(() => {
    if (!active || due === null) return;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const go = () => { tick(); retry = setTimeout(go, 150); };
    const first = setTimeout(go, Math.max(0, due - clock) + 25 + stagger);
    return () => { clearTimeout(first); clearTimeout(retry); };
  }, [active, due, clock, seq, tick, stagger]);
}
