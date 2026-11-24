import { useEffect, useRef, useState } from 'react';
import type { EgwEvent, EgwView, PlayerID, Won } from '@boboland/shared/src/egyptian';
import { FX, type FxSetting } from '../fx';
import { newEvents } from '../screenLogic';

/** A short-lived table effect started by an event. */
export interface TableFx { id: string; kind: 'hand' | 'crack' | 'burn' | 'flash'; by: PlayerID; ok: boolean }

/** The server's clock as this client best knows it (the view's `clock` plus the time since it arrived). */
export function useServerNow(view: EgwView): () => number {
  const ref = useRef({ clock: view.clock, at: Date.now() });
  if (ref.current.clock !== view.clock) ref.current = { clock: view.clock, at: Date.now() };
  return () => ref.current.clock + (Date.now() - ref.current.at);
}

/** New log events since the last render: start transient effects and tell `onEvent` (sounds, announcements). */
export function useTableFx(view: EgwView, fx: FxSetting, onEvent?: (e: EgwEvent) => void): TableFx[] {
  const seen = useRef<number | null>(null);
  const [list, setList] = useState<TableFx[]>([]);
  const cb = useRef(onEvent);
  cb.current = onEvent;
  useEffect(() => {
    if (seen.current === null) { seen.current = view.seq; return; }
    const evs = newEvents(seen.current, view.log);
    seen.current = view.seq;
    if (!evs.length) return;
    evs.forEach((e) => cb.current?.(e));
    if (fx === 'off') return;
    const t = FX[fx];
    const add: [TableFx, number][] = [];
    for (const e of evs) {
      const id = `${e.seq}`;
      if (e.kind === 'slap') {
        add.push([{ id: `h${id}`, kind: 'hand', by: e.by, ok: true }, t.handMs + 500]);
        if (e.how === 'slapIn') add.push([{ id: `f${id}`, kind: 'flash', by: e.by, ok: true }, t.flashMs]);
      } else if (e.kind === 'falseSlap') {
        add.push([{ id: `h${id}`, kind: 'hand', by: e.by, ok: false }, t.handMs + 400]);
        add.push([{ id: `c${id}`, kind: 'crack', by: e.by, ok: false }, t.crackMs]);
        if (e.penalty) add.push([{ id: `b${id}`, kind: 'burn', by: e.by, ok: false }, t.handMs + t.burnMs]);
      }
    }
    if (!add.length) return;
    setList((cur) => [...cur, ...add.map(([f]) => f)]);
    for (const [f, ms] of add) setTimeout(() => setList((cur) => cur.filter((x) => x.id !== f.id)), ms);
  }, [view.seq]); // eslint-disable-line react-hooks/exhaustive-deps
  return list;
}

export type WonPhase = 'hand' | 'reveal' | 'ribbon' | 'sweep' | 'gone';

/** Where a won pile's show is: slap = hand, reveal, sweep; challenge = ribbon, sweep. Off: the reveal stays. */
export function useWonPhase(won: Won | null, round: number, fx: FxSetting): WonPhase | null {
  const key = won ? `${round}-${won.by}-${won.how}` : null;
  const [phase, setPhase] = useState<{ key: string | null; p: WonPhase | null }>({ key: null, p: null });
  useEffect(() => {
    if (!won || !key) { setPhase({ key: null, p: null }); return; }
    const t = FX[fx];
    const slapLike = won.how === 'slap' || won.how === 'slapIn';
    if (fx === 'off') { setPhase({ key, p: slapLike ? 'reveal' : 'ribbon' }); return; }
    const steps: [WonPhase, number][] = slapLike
      ? [['hand', 0], ['reveal', t.handMs], ['sweep', t.handMs + t.revealMs], ['gone', t.handMs + t.revealMs + t.sweepMs]]
      : [['ribbon', 0], ['sweep', t.ribbonMs], ['gone', t.ribbonMs + t.sweepMs]];
    const timers = steps.map(([p, at]) => setTimeout(() => setPhase({ key, p }), at));
    return () => timers.forEach(clearTimeout);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return phase.key === key ? phase.p : null;
}
