import { useEffect } from 'react';
import { getMuted, getVolume, subscribeMuted, subscribeVolume } from '../lib/sound';
import { useMusicOn } from '../lib/music';

/**
 * "War Table" theme: a stirring orchestral-percussion loop (snare march, timpani, low brass, a horn call),
 * on its own AudioContext and bus. The main soundtrack is silent on /warfront (lib/music.ts).
 */
const BPM = 92;
const SPB = 60 / BPM;
const BARS = 8;
// horn melody (semitones from D3), one entry per half-beat; null = rest
const HORN: (number | null)[] = [
  0, null, 7, null, 12, null, 10, 7, 5, null, 7, null, null, null, null, null,
  0, null, 7, null, 12, null, 14, 15, 14, null, 10, null, null, null, null, null,
  3, null, 10, null, 15, null, 14, 10, 12, null, 10, null, 7, null, null, null,
  5, null, 3, null, 2, null, 0, null, 2, null, null, null, null, null, null, null,
];
const BASS = [0, 0, -2, -4, 3, 3, -2, -5];
const D3 = 146.83;
const hz = (semi: number) => D3 * 2 ** (semi / 12);

let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let loopStart = 0;
let nextBeat = 0;
let noise: AudioBuffer | null = null;

const level = () => (getMuted() ? 0.0001 : Math.max(0.0001, 0.22 * getVolume()));

function voice(t: number, f: number, dur: number, g: number, type: OscillatorType, cutoff: number) {
  const o = ctx!.createOscillator(), o2 = ctx!.createOscillator(), lp = ctx!.createBiquadFilter(), gain = ctx!.createGain();
  o.type = type; o2.type = type; o.frequency.value = f; o2.frequency.value = f * 1.004;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(cutoff * 0.5, t); lp.frequency.linearRampToValueAtTime(cutoff, t + 0.12);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(g, t + 0.06);
  gain.gain.setValueAtTime(g, t + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); o2.connect(lp); lp.connect(gain).connect(bus!);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
function hit(t: number, freq: number, q: number, dur: number, g: number, type: BiquadFilterType) {
  const s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), gain = ctx!.createGain();
  s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
  gain.gain.setValueAtTime(g, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(gain).connect(bus!);
  s.start(t, Math.random() * 0.5, dur + 0.05);
}
function timpani(t: number, f: number, g: number) {
  const o = ctx!.createOscillator(), gain = ctx!.createGain();
  o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  gain.gain.setValueAtTime(g, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(gain).connect(bus!); o.start(t); o.stop(t + 1);
  hit(t, 200, 1, 0.25, g * 0.6, 'lowpass');
}

function beat(i: number, t: number) {
  const bar = Math.floor(i / 4) % BARS, b = i % 4;
  // snare march: rolls on the last beat of every second bar
  hit(t, 1800, 0.8, 0.12, b === 1 || b === 3 ? 0.35 : 0.12, 'bandpass');
  hit(t + SPB / 2, 1800, 0.8, 0.08, 0.1, 'bandpass');
  if (b === 3 && bar % 2 === 1) for (let k = 1; k < 4; k++) hit(t + (k * SPB) / 4 + SPB / 2, 2000, 0.8, 0.06, 0.12, 'bandpass');
  if (b === 0) timpani(t, hz(BASS[bar] - 12), 0.5);
  if (b === 2 && bar % 2 === 0) timpani(t, hz(BASS[bar] - 5), 0.3);
  if (b === 0) voice(t, hz(BASS[bar] - 12), SPB * 3.8, 0.12, 'sawtooth', 500);
  for (const h of [0, 1]) {
    const n = HORN[(i * 2 + h) % HORN.length];
    if (n !== null) voice(t + (h * SPB) / 2, hz(n), SPB * 0.95, 0.09, 'sawtooth', 1400);
  }
}

function tick() {
  if (!ctx) return;
  while (loopStart + nextBeat * SPB < ctx.currentTime + 0.3) { beat(nextBeat, loopStart + nextBeat * SPB); nextBeat++; }
}

function start() {
  if (timer) return;
  try {
    ctx ??= new AudioContext();
    if (!noise) { noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    if (!bus) { bus = ctx.createGain(); const comp = ctx.createDynamicsCompressor(); bus.connect(comp).connect(ctx.destination); }
    if (ctx.state === 'suspended') void ctx.resume();
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(level(), ctx.currentTime + 2);
    loopStart = ctx.currentTime + 0.1; nextBeat = 0;
    timer = setInterval(tick, 100);
  } catch { /* no audio */ }
}
function stop() {
  if (!timer || !ctx || !bus) return;
  clearInterval(timer); timer = null;
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
}

/** Plays while a Warfront page is open, the music switch is on and the page has had a gesture. */
export function useWarMusic() {
  const on = useMusicOn();
  useEffect(() => {
    if (!on) { stop(); return; }
    const kick = () => start();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    const relevel = () => { if (ctx && bus && timer) bus.gain.setTargetAtTime(level(), ctx.currentTime, 0.2); };
    const u1 = subscribeVolume(relevel), u2 = subscribeMuted(relevel);
    return () => { window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); u1(); u2(); stop(); };
  }, [on]);
}
