/**
 * Every Fleet timing lives here (result reveals, cinematics, the computer's pauses), like Frontline's fx.ts.
 * Cinematics: Full / Fast / Off (a setting). prefers-reduced-motion turns Full into Fast (no motion, short beats).
 */
import { useSyncExternalStore } from 'react';
import type { ViewReport } from '@boboland/shared/src/fleet';
import { planScenes, type Delivery, type Impact } from './cine/plan';

export type FxSetting = 'full' | 'fast' | 'off';
export const FX_SETTINGS: FxSetting[] = ['full', 'fast', 'off'];

export const prefersReducedMotion = (): boolean => {
  try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

/** e2e sets `fleet.botMs` so the computer answers at once (like TTB_BOT_DELAY for the server bots). */
const botOverride = (() => {
  try { const v = Number(localStorage.getItem('fleet.botMs')); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
})();
/** The computer's pause before it acts, so a human can follow (placement, a turn, the next round). */
export const BOT_MS = botOverride ? { deploy: botOverride, turn: botOverride, nextRound: botOverride } : { deploy: 600, turn: 700, nextRound: 500 };

/** Reveal beats, ms: before the first square lands (the shot in flight), between squares, after a sinking, after the report. */
export const REVEAL: Record<FxSetting, { lead: number; cell: number; sink: number; after: number; quiet: number }> = {
  full: { lead: 650, cell: 380, sink: 1100, after: 450, quiet: 1100 },
  fast: { lead: 200, cell: 150, sink: 450, after: 200, quiet: 500 },
  off: { lead: 0, cell: 0, sink: 0, after: 0, quiet: 0 },
};

/** Cinematic lengths (Full only), ms: the delivery (shot in flight, weapon on its way), its impact, a sinking. */
export const SCENE_MS: { delivery: Record<Delivery, number>; impact: Record<Impact, number>; sink: number } = {
  delivery: {
    shell: 1100, salvo: 1400, mineBlast: 600, frag: 1300, airStrike: 1500, chainGun: 1400, seaMine: 1600, torpedo: 1500,
    supernova: 1700, thunderhead: 1500, cherry: 1400, maelstrom: 1800, shield: 0, decoy: 0, reinforcement: 0,
  },
  impact: { splash: 700, hit: 900, deflect: 900, none: 0 },
  sink: 2100,
};

/** The Full lead-in of a report: its delivery scene, then its impact. */
export function sceneLead(r: ViewReport): number {
  const p = planScenes(r, null, null);
  return p.delivery ? SCENE_MS.delivery[p.delivery] + SCENE_MS.impact[p.impact] : 0;
}

/** How long to wait before showing step `step + 1` of a report (step = squares revealed so far). */
export function stepDelay(r: ViewReport, step: number, fx: FxSetting): number {
  const t = REVEAL[fx];
  const full = fx === 'full';
  if (r.cells.length === 0) return full ? Math.max(t.quiet, sceneLead(r)) : t.quiet; // a mine dropped: a beat for the banner
  if (step === 0) return full ? Math.max(t.lead, sceneLead(r)) : t.lead;
  if (step < r.cells.length) return t.cell;
  if (!r.sunk.length) return t.after;
  return full ? SCENE_MS.sink * Math.min(2, r.sunk.length) : t.sink;
}

/** The whole reveal of a report, ms. */
export function reportDuration(r: ViewReport, fx: FxSetting): number {
  let ms = 0;
  for (let s = 0; s <= r.cells.length; s++) ms += stepDelay(r, s, fx);
  return r.cells.length === 0 ? stepDelay(r, 0, fx) : ms;
}

/** The computer waits for the human to see the last result before it moves. */
export const botDelay = (last: ViewReport | undefined, fx: FxSetting): number => BOT_MS.turn + (last ? reportDuration(last, fx) : 0);

/* ---------- the cinematics setting (per device) ---------- */

const KEY = 'fleet.fx';
let current: FxSetting = (() => {
  try { const v = localStorage.getItem(KEY); return FX_SETTINGS.includes(v as FxSetting) ? (v as FxSetting) : 'full'; } catch { return 'full'; }
})();
const subs = new Set<() => void>();

export function setFx(v: FxSetting) {
  current = v;
  try { localStorage.setItem(KEY, v); } catch { /* blocked storage: the setting lasts this visit */ }
  subs.forEach((f) => f());
}
export const getFx = (): FxSetting => current;
/** The setting in effect: reduced motion never plays Full. */
export const effectiveFx = (v: FxSetting = current): FxSetting => (v === 'full' && prefersReducedMotion() ? 'fast' : v);
export function useFx(): FxSetting {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => current);
}
