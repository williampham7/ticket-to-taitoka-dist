import { getVolume } from '../lib/sound';
import { load, save } from '../lib/storage';

/**
 * Toy-block sounds, synthesised with Web Audio on a context of their own (no files): wooden pops, ticks, clacks
 * pitched up per block, a guild layer on landing (Tide splash, Sun chime, Ember crackle, Grove rustle), puffs,
 * chimes and a fanfare. Ambience: wind, distant birds and a waterfall; crickets once the day is far along.
 * Silent while localStorage 'bly.muted' === 'true' (the top-bar key; it fires a window 'bly-sound' event).
 * Sound effect level is saved under 'bly.sfx' (0-1) and multiplies the shared volume slider.
 */
export type BSfx = 'pick' | 'rotate' | 'flip' | 'snap' | 'corner' | 'invalid' | 'stuck' | 'turn' | 'tally' | 'bonus' | 'win';
export type BGuild = 'tide' | 'sun' | 'ember' | 'grove';

const SFX_KEY = 'bly.sfx';
const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
let sfxVol = clamp01(load<number>(SFX_KEY, 1));
export const getSfxVolume = () => sfxVol;
export function setSfxVolume(v: number) {
  sfxVol = clamp01(v);
  save(SFX_KEY, sfxVol);
  retune();
}

export function isMuted(): boolean {
  try { return localStorage.getItem('bly.muted') === 'true'; } catch { return false; }
}

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let unlockSet = false;

function make(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch { return null; }
}
/** Context for playing now; null while muted or before the first gesture has let audio start. */
function ac(): AudioContext | null {
  if (isMuted()) return null;
  const c = make();
  if (!c) return null;
  if (c.state === 'suspended') void c.resume();
  return c.state === 'running' ? c : null;
}
/** Browsers start audio only after a gesture: the first pointer or key press creates and resumes the context. */
function unlock() {
  if (unlockSet || typeof window === 'undefined') return;
  unlockSet = true;
  const kick = () => {
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('keydown', kick);
    const c = make();
    if (c && c.state === 'suspended') void c.resume();
    if (wantAmbience) startAmbience();
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
}
unlock();

const vol = () => 0.6 * sfxVol * getVolume();
function tone(c: AudioContext, t: number, freq: number, dur: number, peak: number, type: OscillatorType = 'sine', to?: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol()), t + Math.min(0.012, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function hiss(c: AudioContext, t: number, dur: number, peak: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol()), t + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.02);
}
/** One wooden clack: a hollow knock plus a click of noise. */
function clack(c: AudioContext, t: number, freq: number, peak: number) {
  tone(c, t, freq, 0.07, peak, 'triangle', freq * 0.7);
  hiss(c, t, 0.025, peak * 0.9, 'bandpass', freq * 4, freq * 3, 3);
}
const bell = (c: AudioContext, t: number, f: number, dur: number, peak: number) => {
  tone(c, t, f, dur, peak, 'sine');
  tone(c, t, f * 2.76, dur * 0.3, peak * 0.3, 'sine');
};

export function sfx(name: BSfx, opts?: { pitch?: number }) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const p = opts?.pitch && opts.pitch > 0 ? opts.pitch : 1;
  switch (name) {
    case 'pick': tone(c, t, 420 * p, 0.09, 0.4, 'sine', 760 * p); hiss(c, t, 0.03, 0.12, 'bandpass', 2400, 2000, 4); break;
    case 'rotate': clack(c, t, 1250 * p, 0.2); clack(c, t + 0.035, 1500 * p, 0.12); break;
    case 'flip': hiss(c, t, 0.26, 0.25, 'bandpass', 500 * p, 2800 * p, 0.9); tone(c, t + 0.14, 300 * p, 0.1, 0.12, 'sine', 180); break;
    case 'snap': clack(c, t, 700 * p, 0.45); tone(c, t, 2200 * p, 0.04, 0.12, 'square'); break;
    case 'corner': bell(c, t, 1319 * p, 0.7, 0.24); bell(c, t + 0.09, 1760 * p, 0.8, 0.2); break;
    case 'invalid': tone(c, t, 150 * p, 0.16, 0.5, 'sine', 90); hiss(c, t, 0.06, 0.1, 'lowpass', 500, 300); break;
    case 'stuck': hiss(c, t, 0.45, 0.28, 'bandpass', 1500, 400, 0.7); tone(c, t, 260 * p, 0.35, 0.1, 'sine', 140); break;
    case 'turn': tone(c, t, 784 * p, 0.35, 0.22, 'sine'); tone(c, t + 0.11, 1175 * p, 0.5, 0.2, 'sine'); break;
    case 'tally': clack(c, t, 1800 * p, 0.2); tone(c, t, 1568 * p, 0.09, 0.1, 'sine'); break;
    case 'bonus': [880, 1109, 1319, 1760].forEach((f, i) => bell(c, t + i * 0.07, f * p, 0.6, 0.2)); hiss(c, t, 0.5, 0.05, 'highpass', 6000, 9000); break;
    case 'win': {
      [523, 659, 784, 1047].forEach((f, i) => { tone(c, t + i * 0.15, f, 0.45, 0.2, 'triangle'); tone(c, t + i * 0.15, f * 2, 0.4, 0.07, 'sine'); });
      [784, 988, 1175, 1568].forEach((f, i) => bell(c, t + 0.7 + i * 0.11, f, 1.1, 0.2));
      for (let k = 0; k < 5; k++) hiss(c, t + 1 + k * 0.28, 0.35, 0.1, 'bandpass', 5000, 1200, 0.6);
      break;
    }
  }
}

/** A piece lands: one clack per block, each a step higher, then the guild layer on top. */
export function land(guild: BGuild, size: number) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const n = Math.max(1, Math.min(8, Math.round(size) || 1));
  const gap = 0.055;
  for (let i = 0; i < n; i++) clack(c, t + i * gap, 520 * 2 ** (i / 12 * 2), 0.32);
  const e = t + (n - 1) * gap;
  switch (guild) {
    case 'tide': hiss(c, e, 0.45, 0.3, 'bandpass', 1200, 3200, 0.7); hiss(c, e + 0.12, 0.3, 0.16, 'highpass', 4500, 7000); tone(c, e + 0.05, 400, 0.18, 0.12, 'sine', 900); break;
    case 'sun': bell(c, e + 0.03, 1568, 0.9, 0.2); bell(c, e + 0.1, 2093, 0.9, 0.14); break;
    case 'ember': for (let k = 0; k < 7; k++) hiss(c, e + 0.02 + k * 0.05 + Math.random() * 0.03, 0.03, 0.2, 'highpass', 3500 + Math.random() * 3000, 3000, 1.2); hiss(c, e, 0.3, 0.08, 'lowpass', 900, 300); break;
    case 'grove': hiss(c, e, 0.4, 0.2, 'bandpass', 3200, 1600, 0.8); hiss(c, e + 0.1, 0.3, 0.12, 'bandpass', 2400, 4200, 0.9); break;
  }
}

// --- ambience ----------------------------------------------------------------------------------
let wantAmbience = false;
let progress = 0;
let bed: { wind: GainNode; fall: GainNode; windF: BiquadFilterNode; master: GainNode; srcs: AudioBufferSourceNode[] } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBird = 0, nextCricket = 0;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

function levels() {
  if (!bed || !ctx) return;
  const night = clamp((progress - 0.75) / 0.25);
  const m = isMuted() ? 0.0001 : Math.max(0.0001, 0.5 * sfxVol * getVolume());
  const now = ctx.currentTime;
  bed.master.gain.setTargetAtTime(m, now, 0.15);
  bed.wind.gain.setTargetAtTime(0.05 + 0.05 * (1 - night), now, 0.5);
  bed.windF.frequency.setTargetAtTime(380 + 500 * (0.5 + 0.5 * Math.sin(now * 0.31)) * (1 - 0.5 * night), now, 0.5);
  bed.fall.gain.setTargetAtTime(0.035 * (1 - 0.4 * night), now, 0.5);
}
function retune() { levels(); }

function loopNoise(c: AudioContext, type: BiquadFilterType, f: number, q: number, to: AudioNode) {
  const s = c.createBufferSource(), fl = c.createBiquadFilter();
  s.buffer = noise; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  s.connect(fl).connect(to); s.start(0, Math.random());
  return { s, fl };
}
function startAmbience() {
  if (bed || !wantAmbience) return;
  const c = make();
  if (!c || c.state !== 'running') { if (c) void c.resume(); return; }
  const master = c.createGain(), wind = c.createGain(), fall = c.createGain();
  master.gain.value = 0.0001; wind.gain.value = 0.0001; fall.gain.value = 0.0001;
  const w = loopNoise(c, 'lowpass', 500, 0.8, wind);
  const f = loopNoise(c, 'bandpass', 1900, 0.5, fall);
  wind.connect(master); fall.connect(master); master.connect(c.destination);
  bed = { wind, fall, windF: w.fl, master, srcs: [w.s, f.s] };
  levels();
  timer = setInterval(tickAmbience, 250);
}
function tickAmbience() {
  if (!bed || !ctx) return;
  levels();
  if (document.hidden || isMuted()) return;
  const c = ctx, now = c.currentTime, night = clamp((progress - 0.75) / 0.25);
  // birds fade out toward evening; crickets arrive past 0.75
  if (now >= nextBird) {
    nextBird = now + 3 + Math.random() * 6;
    if (progress < 0.9 && Math.random() < 1 - night) {
      const b = 2400 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) tone(c, now + 0.02 + k * 0.12, b, 0.09, 0.07, 'sine', b * (Math.random() < 0.5 ? 1.35 : 0.8));
    }
  }
  if (progress > 0.75 && now >= nextCricket) {
    nextCricket = now + 1.2 + Math.random() * 2.5;
    for (let k = 0; k < 5; k++) tone(c, now + 0.02 + k * 0.065, 4300, 0.035, 0.05 * night, 'square');
  }
}
/** Keeps the bed running and follows the time of day (progress 0..1 through the game). Safe to call every turn. */
export function ambience(p: number) {
  progress = clamp(Number.isFinite(p) ? p : 0);
  wantAmbience = true;
  unlock();
  if (!bed) startAmbience(); else levels();
}
export function stopAmbience() {
  wantAmbience = false;
  if (timer) { clearInterval(timer); timer = null; }
  if (bed && ctx) {
    const b = bed; bed = null;
    b.master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
    setTimeout(() => b.srcs.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }), 1200);
  }
}
if (typeof window !== 'undefined') window.addEventListener('bly-sound', () => { levels(); });
