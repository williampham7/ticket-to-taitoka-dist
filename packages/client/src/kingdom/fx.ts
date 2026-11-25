import { useSyncExternalStore } from 'react';
import { KT, eventMs, type KEvent } from '@boboland/shared/src/kingdom';
import { load, save } from '../lib/storage';

/**
 * Animation setting (Full / Fast / Off) and every client timing in one place. Base lengths are the shared `KT`
 * (the server bots pace themselves by the same numbers). Reduced motion means Fast here, never Off.
 */
export type FxLevel = 'full' | 'fast' | 'off';
const KEY = 'kg.fx';
const listeners = new Set<() => void>();
let level: FxLevel = load<FxLevel>(KEY, 'full');
const emit = () => listeners.forEach((f) => f());
export const getFx = () => level;
export function setFx(l: FxLevel) { level = l; save(KEY, l); emit(); }
const sub = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const useFx = () => useSyncExternalStore(sub, () => level);
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const effectiveFx = (l: FxLevel = level): FxLevel => (l === 'full' && reducedMotion() ? 'fast' : l);
export const fxScale = () => ({ full: 1, fast: 0.45, off: 0 })[effectiveFx()];

/** Client-only timings (ms, full speed). */
const LOCAL = { rotate: 260, ripple: KT.ripple, curtain: 650, coach: 300, footprint: 900, intro: 2600, page: 700, aim: 180 };
export const ms = (k: keyof typeof KT | keyof typeof LOCAL) => Math.round(((LOCAL as Record<string, number>)[k] ?? (KT as Record<string, number>)[k]) * fxScale());
export const evMs = (e: KEvent) => Math.round(eventMs(e) * fxScale());

/** Computer players' pace in local games: wait for what just played, plus a short think (e2e sets kg.botMs). */
export function botMs(played: KEvent[], firstOfTurn: boolean): number {
  const fixed = load<string | number | null>('kg.botMs', null);
  if (fixed !== null) return Number(fixed);
  return played.reduce((t, e) => t + evMs(e), 0) + (firstOfTurn ? 650 : 320);
}

/** Flat view (no tilt): default on narrow screens and with reduced motion. */
const FLAT = 'kg.flat';
let flat: boolean = load<boolean | null>(FLAT, null) ?? (typeof window !== 'undefined' && (window.innerWidth < 600 || reducedMotion()));
export const getFlat = () => flat;
export function setFlat(f: boolean) { flat = f; save(FLAT, f); emit(); }
export const useFlat = () => useSyncExternalStore(sub, () => flat);
