/** Tiny WebAudio synth: no files. The context is created on the first user gesture. Follows the shared volume and mute. */
import { getMuted, getVolume } from '../lib/sound';

let ctx: AudioContext | null = null;

const Ctor = (): typeof AudioContext | undefined => (typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);

function audio(): AudioContext | null {
  if (!ctx) { const C = Ctor(); if (!C) return null; try { ctx = new C(); } catch { return null; } }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

// create the context on the first gesture, so later sounds (opponent moves) are allowed to play
if (typeof window !== 'undefined' && Ctor()) {
  const arm = () => { audio(); window.removeEventListener('pointerdown', arm); window.removeEventListener('keydown', arm); };
  window.addEventListener('pointerdown', arm);
  window.addEventListener('keydown', arm);
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, to?: number) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(Math.max(0.0001, vol * getVolume()), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, start = 0, filter?: { type: BiquadFilterType; from: number; to?: number; q?: number }) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + start;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = a.createBufferSource(); const g = a.createGain();
  src.buffer = buf; g.gain.value = vol * getVolume();
  let node: AudioNode = src;
  if (filter) {
    const f = a.createBiquadFilter();
    f.type = filter.type; f.frequency.setValueAtTime(filter.from, t); f.Q.value = filter.q ?? 1;
    if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
    src.connect(f); node = f;
  }
  node.connect(g).connect(a.destination); src.start(t);
}

const play = (fn: () => void) => { if (getMuted() || getVolume() === 0) return; try { fn(); } catch { /* audio unavailable */ } };

export const sound = {
  select: () => play(() => tone(660, 0, 0.06, 'triangle', 0.08)),
  move: () => play(() => { tone(220, 0, 0.09, 'square', 0.05, 160); noise(0.12, 0.08, 0, { type: 'lowpass', from: 900, to: 300 }); }),
  combat: () => play(() => { noise(0.28, 0.22); tone(110, 0, 0.2, 'sawtooth', 0.1, 55); }),
  /** the attacker charges */
  charge: () => play(() => { noise(0.38, 0.16, 0, { type: 'bandpass', from: 300, to: 2400, q: 1.4 }); tone(140, 0, 0.3, 'sawtooth', 0.04, 260); }),
  /** a hidden piece is identified */
  reveal: () => play(() => { tone(1320, 0, 0.05, 'square', 0.04); tone(1760, 0.06, 0.07, 'square', 0.04); tone(2640, 0.13, 0.18, 'sine', 0.05); }),
  /** the two pieces meet */
  impact: () => play(() => { noise(0.22, 0.3, 0, { type: 'lowpass', from: 3000, to: 200 }); tone(95, 0, 0.28, 'sine', 0.24, 38); }),
  /** a piece is destroyed */
  eliminate: () => play(() => { noise(0.3, 0.16, 0, { type: 'highpass', from: 1800, to: 500 }); tone(330, 0, 0.32, 'sawtooth', 0.05, 80); }),
  /** a mine goes off */
  explode: () => play(() => {
    noise(1.4, 0.42, 0, { type: 'lowpass', from: 2400, to: 90 });
    tone(70, 0, 0.9, 'sine', 0.34, 26);
    noise(0.5, 0.14, 0.12, { type: 'bandpass', from: 600, to: 120, q: 0.8 });
  }),
  /** an engineer clears a mine */
  defuse: () => play(() => { tone(2000, 0, 0.03, 'square', 0.05); tone(880, 0.1, 0.12, 'triangle', 0.07, 440); tone(440, 0.24, 0.2, 'triangle', 0.06, 330); }),
  /** a short sting after a duel: up for us, down for them */
  good: () => play(() => [392, 523, 659].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.09))),
  bad: () => play(() => [330, 262, 196].forEach((f, i) => tone(f, i * 0.1, 0.26, 'sawtooth', 0.06))),
  capture: () => play(() => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.1))),
  win: () => play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle', 0.12))),
  lose: () => play(() => [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, 'sawtooth', 0.08))),
};
