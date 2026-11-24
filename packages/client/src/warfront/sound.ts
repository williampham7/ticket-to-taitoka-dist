import { getMuted, getVolume } from '../lib/sound';

/** Warfront's sound effects, synthesised with Web Audio (no files): dice, pins, stamps, paper, artillery. */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
function audio(): AudioContext | null {
  if (typeof window === 'undefined' || getMuted()) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch { return null; }
}
const vol = () => getVolume() * 0.7;

function burst(t: number, freq: number, q: number, dur: number, gain: number, type: BiquadFilterType = 'bandpass') {
  const a = ctx!, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain * vol(), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}
function tone(t: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', to?: number) {
  const a = ctx!, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * vol(), t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}

export const wfSfx = {
  /** brass and steel dice tumbling, then settling */
  dice(n = 5) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    for (let i = 0; i < n * 3; i++) burst(t + i * 0.055 + Math.random() * 0.03, 2200 + Math.random() * 1800, 6, 0.05, 0.5 - i * 0.012);
    burst(t + n * 0.18, 1400, 4, 0.12, 0.6);
  },
  click() { const a = audio(); if (!a) return; burst(a.currentTime, 1800, 3, 0.05, 0.35); tone(a.currentTime, 900, 0.05, 0.08, 'triangle'); },
  place() { const a = audio(); if (!a) return; const t = a.currentTime; burst(t, 900, 2, 0.08, 0.5); tone(t, 220, 0.12, 0.12, 'triangle'); },
  pin() { const a = audio(); if (!a) return; const t = a.currentTime; tone(t, 1600, 0.09, 0.12, 'square', 700); burst(t + 0.02, 600, 1.5, 0.15, 0.5); },
  stamp() { const a = audio(); if (!a) return; const t = a.currentTime; burst(t, 160, 0.8, 0.35, 1, 'lowpass'); tone(t, 90, 0.35, 0.5, 'sine', 45); },
  paper() { const a = audio(); if (!a) return; const t = a.currentTime; for (let i = 0; i < 5; i++) burst(t + i * 0.04, 4000 + i * 300, 1, 0.09, 0.18, 'highpass'); },
  boom() { const a = audio(); if (!a) return; const t = a.currentTime; burst(t, 120, 0.7, 1.1, 0.9, 'lowpass'); tone(t, 70, 0.9, 0.35, 'sine', 30); },
  turn() { const a = audio(); if (!a) return; const t = a.currentTime; [523, 659, 784].forEach((f, i) => tone(t + i * 0.11, f, 0.35, 0.12, 'triangle')); },
  card() { const a = audio(); if (!a) return; burst(a.currentTime, 3000, 1.2, 0.12, 0.3, 'highpass'); },
};
