/**
 * Blast doors between stations: two hazard-edged steel doors slam shut over the screen, a plate names where you
 * are going, the change happens behind them, and they open on the new station. Mounted once in FleetApp, so it
 * survives route changes. With cinematics Off (or reduced motion) the change happens at once.
 */
import { useSyncExternalStore } from 'react';
import { getFx } from './fx';

export const DOOR_MS = 420;
const HOLD_MS = 520;

interface DoorState { shut: boolean; label: string; sub: string }
let state: DoorState = { shut: false, label: '', sub: '' };
let busy = false;
const subs = new Set<() => void>();
const set = (s: DoorState) => { state = s; subs.forEach((f) => f()); };

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Close the doors, run `change` behind them, then open. */
export function throughDoors(label: string, sub: string, change: () => void) {
  if (busy) return;
  if (getFx() === 'off' || reduced()) { change(); return; }
  busy = true;
  set({ shut: true, label, sub });
  window.setTimeout(() => {
    change();
    window.setTimeout(() => { set({ ...state, shut: false }); busy = false; }, HOLD_MS);
  }, DOOR_MS);
}

export function Doors() {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
  return (
    <div className={`fleet-doors ${s.shut ? 'shut' : ''}`} style={{ '--door-ms': `${DOOR_MS}ms` } as React.CSSProperties} aria-hidden={!s.shut} data-testid="fleet-doors">
      <div className="fleet-door top"><span className="rivets" /></div>
      <div className="fleet-door bottom"><span className="rivets" /></div>
      <div className="fleet-doors-plate" role="status">
        <span className="fleet-doors-label">{s.label}</span>
        <span className="fleet-doors-bar"><i /></span>
        <span className="fleet-doors-sub">{s.sub}</span>
      </div>
    </div>
  );
}
