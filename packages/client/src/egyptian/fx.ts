/**
 * Every Egyptian War animation timing (ms), like Fleet's fx.ts. The server pauses (shared `timing.ts`) are as
 * long as the Full animations; fx.test.ts checks that each Full sequence fits its pause.
 * Animations: Full / Fast / Off (`egw.fx`). prefers-reduced-motion turns Full into Fast. `egw.e2e` = '1' forces Off.
 */
import { useSyncExternalStore } from 'react';

export type FxSetting = 'full' | 'fast' | 'off';
export const FX_SETTINGS: FxSetting[] = ['full', 'fast', 'off'];

export interface FxTimes {
  /** a card's flight from a stack to the pile (it turns over mid-flight) */
  flipMs: number;
  /** the enlarged landing on the pile */
  landMs: number;
  /** between two dealt cards */
  dealCardMs: number;
  /** the starting player's highlight after the deal */
  dealHighlightMs: number;
  /** the slapping hand slams the pile */
  handMs: number;
  /** matching cards lift out and line up under the rule ribbon */
  revealMs: number;
  /** the challenge-won ribbon */
  ribbonMs: number;
  /** the pile sweeps to the winner */
  sweepMs: number;
  /** a false slap's red crack */
  crackMs: number;
  /** a burned card flies under the pile */
  burnMs: number;
  /** a slap-in's gold flash */
  flashMs: number;
}

export const FX: Record<FxSetting, FxTimes> = {
  full: { flipMs: 420, landMs: 260, dealCardMs: 38, dealHighlightMs: 500, handMs: 260, revealMs: 1500, ribbonMs: 1150, sweepMs: 520, crackMs: 520, burnMs: 460, flashMs: 750 },
  fast: { flipMs: 180, landMs: 120, dealCardMs: 8, dealHighlightMs: 250, handMs: 120, revealMs: 800, ribbonMs: 700, sweepMs: 260, crackMs: 260, burnMs: 220, flashMs: 350 },
  off: { flipMs: 0, landMs: 0, dealCardMs: 0, dealHighlightMs: 0, handMs: 0, revealMs: 0, ribbonMs: 0, sweepMs: 0, crackMs: 0, burnMs: 0, flashMs: 0 },
};

export const slapShowMs = (fx: FxSetting) => FX[fx].handMs + FX[fx].revealMs + FX[fx].sweepMs;
export const challengeShowMs = (fx: FxSetting) => FX[fx].ribbonMs + FX[fx].sweepMs;
export const dealShowMs = (fx: FxSetting, cards = 52) => FX[fx].dealCardMs * cards + FX[fx].dealHighlightMs;

const read = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
/** e2e sets `egw.e2e` = '1': animations off, and new games ask the server for short pauses. */
export const isE2E = (): boolean => read('egw.e2e') === '1';
export const prefersReducedMotion = (): boolean => {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

const KEY = 'egw.fx';
let current: FxSetting = FX_SETTINGS.includes(read(KEY) as FxSetting) ? (read(KEY) as FxSetting) : 'full';
const subs = new Set<() => void>();

export function setFx(v: FxSetting) {
  current = v;
  try { localStorage.setItem(KEY, v); } catch { /* the setting lasts this visit */ }
  subs.forEach((f) => f());
}
export const getFx = (): FxSetting => current;
/** The setting in effect. */
export function effectiveFx(v: FxSetting = current): FxSetting {
  if (isE2E()) return 'off';
  return v === 'full' && prefersReducedMotion() ? 'fast' : v;
}
/** The chosen setting (for the settings panel). */
export const useFxSetting = (): FxSetting => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => current);
/** The setting in effect (for drawing). */
export const useFx = (): FxSetting => effectiveFx(useFxSetting());
