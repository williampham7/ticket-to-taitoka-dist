import { useEffect } from 'react';
import type { KEvent } from '@boboland/shared/src/kingdom';
import { getMuted, getVolume } from '../lib/sound';
import { fxScale } from './fx';
import { KT } from '@boboland/shared/src/kingdom';

/**
 * Storybook sounds, synthesised with Web Audio on a small context of their own: page turns, a wooden click for
 * the spare, the stone scrape and thunk of a push with a leaf rustle, footsteps on cobbles, a sparkle chime, the
 * home horn, a turn chime and a win fanfare. Ambience: birdsong by day, crickets at night.
 */
export type KgCue = 'rotate' | 'page' | 'click';
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
function ac(): AudioContext | null {
  if (getMuted()) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}
const vol = () => 0.55 * getVolume();
function tone(c: AudioContext, t: number, freq: number, dur: number, peak: number, type: OscillatorType = 'sine', to?: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol()), t + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function hiss(c: AudioContext, t: number, dur: number, peak: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1) {
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol()), t + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const notes = (c: AudioContext, t: number, fs: number[], step: number, dur: number, peak: number, type: OscillatorType = 'triangle') => fs.forEach((f, i) => tone(c, t + i * step, f, dur, peak, type));

export function kgSound(e: KEvent | KgCue, me?: string | null) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const s = Math.max(0.35, fxScale());
  if (typeof e === 'string') {
    if (e === 'page') hiss(c, t, 0.38, 0.22, 'bandpass', 2600, 700, 0.8);
    else if (e === 'rotate') { hiss(c, t, 0.05, 0.35, 'bandpass', 1900, 1500, 6); tone(c, t, 820, 0.06, 0.12, 'triangle', 500); }
    else hiss(c, t, 0.04, 0.2, 'bandpass', 2400, 2000, 5);
    return;
  }
  switch (e.k) {
    case 'shift': {
      const fly = KT.fly * s / 1000, slide = KT.slide * s / 1000;
      hiss(c, t, 0.22, 0.06, 'highpass', 3200, 5000, 0.7);
      hiss(c, t + fly, slide, 0.28, 'lowpass', 700, 260, 1.2);
      tone(c, t + fly + slide * 0.95, 120, 0.22, 0.4, 'sine', 55);
      hiss(c, t + fly + slide * 0.9, 0.25, 0.12, 'highpass', 2600, 4200, 0.8);
      break;
    }
    case 'move': {
      const n = e.path.length - 1;
      for (let k = 0; k < n; k++) hiss(c, t + (k * KT.hop * s) / 1000 + 0.04, 0.06, 0.2, 'bandpass', k % 2 ? 1300 : 1050, 700, 2.5);
      break;
    }
    case 'collect': notes(c, t + 0.15 * s, [1568, 1976, 2349, 3136], 0.07, 0.6, 0.14, 'sine'); hiss(c, t + 0.15 * s, 0.5, 0.05, 'highpass', 6000, 9000); break;
    case 'home': notes(c, t, [440, 587], 0.28, 0.55, 0.12, 'sawtooth'); tone(c, t + 0.56, 740, 0.7, 0.1, 'sawtooth'); break;
    case 'turn': if (e.p === me) notes(c, t, [784, 1175], 0.12, 0.5, 0.12, 'sine'); else tone(c, t, 660, 0.3, 0.05, 'sine'); break;
    case 'resign': notes(c, t, [587, 494, 392], 0.16, 0.4, 0.08, 'triangle'); break;
    case 'win': {
      const f = [587, 740, 880, 1175];
      notes(c, t, f, 0.16, 0.4, 0.13, 'sawtooth');
      notes(c, t + 0.7, [880, 1175, 1480, 1760], 0.12, 0.9, 0.11, 'triangle');
      for (let k = 0; k < 4; k++) hiss(c, t + 1 + k * 0.45, 0.5, 0.12, 'bandpass', 1800, 300, 0.6);
      break;
    }
  }
}

/** Birdsong by day, crickets at night (quiet, occasional, paused while the tab is hidden). */
export function useAmbience(phase: 'morning' | 'afternoon' | 'sunset' | 'night') {
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        if (!alive) return;
        const c = !document.hidden && ctx ? ac() : null;
        if (c) {
          const t = c.currentTime + 0.02;
          if (phase === 'night' || phase === 'sunset') for (let k = 0; k < 6; k++) tone(c, t + k * 0.07, 4400, 0.035, 0.02, 'square');
          else { const b = 2600 + Math.random() * 1400; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) tone(c, t + k * 0.13, b, 0.09, 0.03, 'sine', b * 1.35); }
        }
        next();
      }, 2500 + Math.random() * 5000);
    };
    next();
    return () => { alive = false; clearTimeout(timer); };
  }, [phase]);
}
