import { useEffect, useRef, useState, type ComponentType } from 'react';
import { THEME_ID, type ThemeId } from '../theme';
import { GAME_TITLE } from '../lib/skin';
import { VintageCurtain } from './VintageCurtain';
import { HsrCurtain } from './HsrCurtain';
import { RailCurtain } from './RailCurtain';
import { MerlionCurtain } from './MerlionCurtain';
import { duckMusic } from '../lib/music';
import { sfxEnv } from '../lib/sound';
import type { SfxEnv } from '../lib/soundHsr';
import { playVintageIntro, playVintageWaiting } from './introVintage';
import { playHsrIntro, playHsrWaiting } from './introHsr';
import { playRailIntro, playRailWaiting } from './introRail';
import { playMerlionIntro, playMerlionWaiting } from './introMerlion';
import './curtain.css';

/**
 * Cinematic "entering the world" transition from the waiting room into the game.
 * The curtain mounts already closed (opaque) and hides the board while it connects. Once the board is `ready`
 * and the title has been shown for HOLD_MS, it plays the themed opening (OPEN_MS), then unmounts.
 * It never takes pointer events, so the game underneath is usable (and e2e clicks pass through).
 */
export type CurtainProps = { /** false: closed with the title card; true: the opening animation is playing. */ opening: boolean; title: string };

/** The closed curtain with its title card builds up for this long (from when it first appeared). */
export const HOLD_MS = 3200;
/** The opening animation and its sound cue. */
export const OPEN_MS = 5200;
/** Each theme's opening cue (Web Audio, no files), started as the opening begins; it lasts about OPEN_MS. */
const CUES: Record<ThemeId, (env: SfxEnv) => void> = { vintage: playVintageIntro, hsr: playHsrIntro, rail: playRailIntro, merlion: playMerlionIntro };
/** Optional cue for the closed curtain, played as it appears; it ends within HOLD_MS, before the opening cue. */
const WAITING_CUES: Partial<Record<ThemeId, (env: SfxEnv) => void>> = { vintage: playVintageWaiting, hsr: playHsrWaiting, rail: playRailWaiting, merlion: playMerlionWaiting };
const CURTAINS: Record<ThemeId, ComponentType<CurtainProps>> = { vintage: VintageCurtain, hsr: HsrCurtain, rail: RailCurtain, merlion: MerlionCurtain };

const KEY = 'ttb.curtain';
/** Called by the waiting room just before it navigates into the game. */
export const queueCurtain = (matchID: string) => { try { sessionStorage.setItem(KEY, matchID); } catch { /* no storage: no curtain */ } };
/** True for the match the waiting room queued. Read-only (StrictMode calls initialisers twice); see clearCurtain. */
export const takeCurtain = (matchID: string) => { try { return sessionStorage.getItem(KEY) === matchID; } catch { return false; } };
/** Once played, a reload of the game does not replay it. */
export const clearCurtain = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Dip to dark between the waiting room and the intro, so the scene does not cut in: `dipToDark` fades a dark veil
 * over the waiting room (resolves once it is opaque, then the caller navigates); the curtain lifts it when it mounts.
 * If no curtain ever mounts, the veil lifts itself shortly after.
 */
const DIP_ID = 'ttb-dip';
const DIP_MS = 450;
function liftDip() {
  const el = document.getElementById(DIP_ID);
  if (!el || el.dataset.lifting) return;
  el.dataset.lifting = '1';
  el.classList.remove('is-down');
  window.setTimeout(() => el.remove(), 700);
}
export function dipToDark(): Promise<void> {
  if (typeof document === 'undefined' || reduced()) return Promise.resolve();
  document.getElementById(DIP_ID)?.remove();
  const el = document.createElement('div');
  el.id = DIP_ID;
  el.className = 'ttb-dip';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  void el.offsetWidth; // commit the transparent state so the fade runs
  el.classList.add('is-down');
  window.setTimeout(liftDip, DIP_MS + 1500);
  return new Promise((resolve) => window.setTimeout(resolve, DIP_MS));
}

/** `since`: when the curtain first appeared (performance.now()), so a remount keeps the timing. */
export function EnterCurtain({ ready, onDone, since }: { ready: boolean; onDone: () => void; since?: number }) {
  const [opening, setOpening] = useState(false);
  const mountedAt = useRef(since ?? performance.now());
  const done = useRef(onDone);
  done.current = onDone;
  // the soundtrack is silent for the whole intro (the curtain has its own cue), and fades back in after
  useEffect(() => { duckMusic(true); return () => duckMusic(false); }, []);
  // the scene is up (opaque): lift the waiting room's dip to dark off it
  useEffect(() => { liftDip(); }, []);
  // the closed curtain's own cue, once (refs survive StrictMode's effect re-run); not when joining late or reduced
  const waited = useRef(false);
  useEffect(() => {
    if (waited.current || reduced() || performance.now() - mountedAt.current > 400) return;
    waited.current = true;
    try { WAITING_CUES[THEME_ID]?.(sfxEnv); } catch { /* no audio: the curtain still plays */ }
  }, []);
  useEffect(() => {
    if (!opening) return;
    try { CUES[THEME_ID](sfxEnv); } catch { /* no audio: the curtain still plays */ }
  }, [opening]);
  useEffect(() => {
    if (!ready) return;
    const quick = reduced();
    const wait = quick ? 300 : Math.max(0, HOLD_MS - (performance.now() - mountedAt.current));
    const t1 = window.setTimeout(() => setOpening(true), wait);
    const t2 = window.setTimeout(() => done.current(), wait + (quick ? 400 : OPEN_MS));
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [ready]);
  const Curtain = CURTAINS[THEME_ID];
  return (
    <div className={`ttb-curtain${opening ? ' is-opening' : ''}${reduced() ? ' is-reduced' : ''}`} data-testid="enter-curtain" aria-hidden>
      <Curtain opening={opening} title={GAME_TITLE} />
    </div>
  );
}
