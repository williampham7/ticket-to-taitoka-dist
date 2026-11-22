import { useSyncExternalStore } from 'react';
import { HSR, RAIL } from '../theme';
import { createHsrSfx } from './soundHsr';
import { createRailSfx } from './soundRail';
import { load, save } from './storage';

/** Tiny synthesised sound kit (Web Audio, no files). Mute (the speaker icon on the volume slider) silences music too. */
const MUTE_KEY = 'boboland.muted';
const VOLUME_KEY = 'boboland.volume';
let muted = load<boolean>(MUTE_KEY, false);
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;

// --- one volume level (0-1) for music and sound effects alike --------------------------------
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
let volume = clamp01(load<number>(VOLUME_KEY, 1));
const volumeListeners = new Set<() => void>();

export function getVolume(): number {
  return volume;
}

export function setVolume(v: number) {
  volume = clamp01(v);
  save(VOLUME_KEY, volume);
  volumeListeners.forEach((l) => l());
}

export function subscribeVolume(cb: () => void): () => void {
  volumeListeners.add(cb);
  return () => volumeListeners.delete(cb);
}

export function useVolume(): number {
  return useSyncExternalStore(subscribeVolume, getVolume);
}

function audio(): AudioContext | null {
  if (muted || volume === 0) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12, glideTo?: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * volume), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(start: number, dur: number, gain = 0.08, cutoff = 2400) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = cutoff;
  const g = a.createGain();
  g.gain.value = gain * volume;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t0);
}

/** One blast of a steam whistle: a bright three-note chord that bends up, with a breath of steam. */
function whistleBlast(start: number, dur: number) {
  for (const [f, g] of [[587, 0.05], [740, 0.045], [880, 0.04]] as const) {
    tone(f * 0.94, start, dur, 'sawtooth', g, f);
    tone(f, start, dur, 'triangle', g * 1.4);
  }
  noise(start, dur * 0.9, 0.05, 3000);
}

/** The classic two-blast "choo-choo". */
function chooChoo(start: number) {
  whistleBlast(start, 0.28);
  whistleBlast(start + 0.4, 0.42);
}

/** The modern set (also supplies the station chime to the vintage set). */
const hsrSfx = createHsrSfx({ audio, volume: () => volume });

const vintageSfx = {
  card: () => noise(0, 0.07, 0.12, 3200),
  ticket: () => { noise(0, 0.12, 0.08, 1400); noise(0.08, 0.1, 0.06, 1800); },
  /**
   * The route-claim run (times in seconds from now): a two-blast "choo-choo" as the train sets off,
   * a steady rolling chug while it travels, a heavier clunk as each car drops, then a whistle and bell on arrival.
   */
  claim: (dropTimes: number[], arrive: number, start = 0) => {
    chooChoo(Math.max(0, start - 0.1));
    for (let t = start, k = 0; t < arrive; t += 0.16, k++) {
      noise(t, 0.06, k % 2 ? 0.14 : 0.22, k % 2 ? 1100 : 700);
    }
    dropTimes.forEach((t) => { noise(t, 0.08, 0.26, 600); noise(t + 0.09, 0.06, 0.13, 1300); });
    tone(740, arrive, 0.6, 'sawtooth', 0.035); tone(932, arrive, 0.6, 'sawtooth', 0.03);
    tone(880, arrive + 0.15, 0.4, 'triangle', 0.1);
    tone(1320, arrive + 0.22, 0.5, 'triangle', 0.07);
  },
  /** a soft pop when someone else's chat message or emote arrives */
  chat: () => { tone(880, 0, 0.08, 'sine', 0.06, 1180); },
  turn: () => { tone(660, 0, 0.14, 'sine', 0.08); tone(990, 0.1, 0.2, 'sine', 0.07); },
  nope: () => tone(220, 0, 0.12, 'square', 0.04, 160),
  whistle: () => { tone(740, 0, 0.5, 'sawtooth', 0.03); tone(932, 0, 0.5, 'sawtooth', 0.025); },
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.35, 'triangle', 0.09)),
  /** End of the line: a long choo-choo, brakes hissing, and the station bell. */
  endGame: () => {
    chooChoo(0);
    whistleBlast(0.95, 0.7);
    noise(1.7, 0.9, 0.07, 4200);
    [0, 0.32, 0.64].forEach((t) => { tone(1320, 1.9 + t, 0.5, 'triangle', 0.08); tone(1980, 1.9 + t, 0.35, 'sine', 0.03); });
  },
  /** One route counted: a little cash-register tick, higher for bigger routes. */
  count: (points: number) => tone(620 + Math.min(15, points) * 32, 0, 0.09, 'triangle', 0.07),
  /** A completed ticket adds its points. */
  ticketWon: () => { tone(784, 0, 0.14, 'triangle', 0.09); tone(1175, 0.09, 0.22, 'triangle', 0.08); },
  /** An unfinished ticket takes its points away. */
  ticketLost: () => tone(330, 0, 0.32, 'sawtooth', 0.04, 196),
  /** The longest-path bonus. */
  bonus: () => { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.09, 0.28, 'triangle', 0.08)); tone(1319, 0.4, 0.6, 'sine', 0.05); },
  /** The two-tone station "ding-dong" (the turn-announcement board plays it). */
  stationChime: hsrSfx.stationChime,
};

/**
 * Steam-train sounds for the vintage theme, a clean electric high-speed-rail set (soundHsr.ts) for HSR
 * and an old-continental European station set (soundRail.ts) for rail. Same API.
 */
/** The audio context (null when muted / silent) and volume, for sound sets that live outside this file (the curtain cues). */
export const sfxEnv = { audio, volume: () => volume };

export const sfx: typeof vintageSfx = HSR ? hsrSfx
  : RAIL ? createRailSfx({ audio, volume: () => volume })
  : vintageSfx;

export function setMuted(m: boolean) {
  muted = m;
  save(MUTE_KEY, m);
  listeners.forEach((l) => l());
}

export function getMuted(): boolean {
  return muted;
}

export function subscribeMuted(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useMuted(): boolean {
  return useSyncExternalStore(subscribeMuted, getMuted);
}
