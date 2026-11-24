import { useSyncExternalStore } from 'react';
import { load, save } from '../lib/storage';

/** Animation setting (Full / Fast / Off) and every timing in one place. Reduced motion means Off. */
export type FxLevel = 'full' | 'fast' | 'off';
const KEY = 'warfront.fx';
const listeners = new Set<() => void>();
let level: FxLevel = load<FxLevel>(KEY, 'full');
export const getFx = () => level;
export function setFx(l: FxLevel) { level = l; save(KEY, l); listeners.forEach((f) => f()); }
export const useFx = () => useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => level);
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const effectiveFx = (l: FxLevel = level): FxLevel => (reduced() ? 'off' : l);
const scale = () => ({ full: 1, fast: 0.45, off: 0 })[effectiveFx()];

const BASE = { dice: 1500, banner: 1500, stamp: 1900, wash: 900, curtain: 700 };
export const ms = (k: keyof typeof BASE) => Math.round(BASE[k] * scale());

/** Computer players' pace (e2e sets localStorage warfront.botMs to go fast). */
export function botMs(afterBattle: boolean, firstOfTurn: boolean): number {
  const fixed = load<string | null>('warfront.botMs', null);
  if (fixed) return Number(fixed);
  return 520 + (firstOfTurn ? ms('banner') : 0) + (afterBattle ? ms('dice') : 0);
}
