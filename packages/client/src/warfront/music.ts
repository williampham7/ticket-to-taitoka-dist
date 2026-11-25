import { useEffect } from 'react';
import { getMuted, getVolume, subscribeMuted, subscribeVolume } from '../lib/sound';
import { useMusicOn } from '../lib/music';

/**
 * "War Table" score: a 64-bar cinematic loop in D minor (string ostinato, low brass, sub bass, horn theme,
 * trumpet fanfares, snare march, timpani, cymbal swells, anvil) with its own AudioContext, bus and reverb.
 * Sections: Intro, A (theme), B (fanfare), Bridge (suspense), Climax. The main soundtrack is silent on /warfront.
 */
const BPM = 96;
const S16 = 60 / BPM / 4; // one sixteenth note
const BAR = S16 * 16;
const D3 = 146.83;
const hz = (semi: number) => D3 * 2 ** (semi / 12);

type Chord = [pc: number, minor: 0 | 1]; // pitch class from D
type Note = [step: number, semi: number, len: number]; // semitones from D3, length in sixteenths
const Dm: Chord = [0, 1], Bb: Chord = [8, 0], F: Chord = [3, 0], C: Chord = [10, 0], Gm: Chord = [5, 1], A: Chord = [7, 0]; // A major = raised 7th
const tonesOf = ([pc, m]: Chord) => { const r = pc > 3 ? pc - 12 : pc; return [r, r + (m ? 3 : 4), r + 7]; };
const bassOf = ([pc]: Chord) => (pc <= 5 ? pc - 12 : pc - 24);

const HARM_A = [Dm, Bb, F, C, Dm, Gm, A, Dm];
const HARM_INTRO = [Dm, Dm, Bb, Bb, Gm, Gm, A, A];
const HARM_BRIDGE = [Dm, Bb, Gm, A, Dm, Bb, Gm, A];

// 8-bar horn theme and trumpet countermelody (bar -> notes)
const THEME: Note[][] = [
  [[0, 7, 6], [6, 12, 2], [8, 15, 6], [14, 14, 2]],
  [[0, 12, 6], [6, 10, 2], [8, 8, 8]],
  [[0, 10, 6], [6, 12, 2], [8, 15, 4], [12, 17, 4]],
  [[0, 17, 8], [8, 15, 4], [12, 14, 4]],
  [[0, 12, 6], [6, 14, 2], [8, 15, 6], [14, 17, 2]],
  [[0, 17, 6], [6, 15, 2], [8, 14, 4], [12, 12, 4]],
  [[0, 14, 4], [4, 11, 4], [8, 14, 8]],
  [[0, 12, 16]],
];
const TRUMPET: Note[][] = [
  [[0, 19, 3], [3, 19, 1], [4, 19, 4], [10, 17, 2], [12, 15, 4]],
  [[0, 20, 3], [3, 20, 1], [4, 24, 4], [8, 20, 4], [12, 15, 4]],
  [[0, 22, 3], [3, 22, 1], [4, 19, 4], [8, 22, 4], [12, 24, 4]],
  [[0, 22, 3], [3, 22, 1], [4, 26, 4], [8, 24, 4], [12, 22, 4]],
  [[0, 19, 3], [3, 19, 1], [4, 24, 4], [8, 27, 4], [12, 24, 4]],
  [[0, 24, 3], [3, 24, 1], [4, 20, 4], [8, 17, 4], [12, 20, 4]],
  [[0, 26, 3], [3, 26, 1], [4, 23, 4], [8, 19, 4], [12, 23, 4]],
  [[0, 24, 10], [12, 26, 2], [14, 24, 2]],
];
const OST = '0020002001202010'; // chord-tone index per sixteenth

interface Sec {
  bars: number; harm: Chord[]; dyn: [number, number];
  ost: number; ostOct: number; pad: number; bass: number; pulse: boolean; sul: number;
  horn: number; hornOct: number[]; trp: number;
  snare: string; timp: string; kick: string; // 16 chars: level 1-9 or '.'
  anvil: boolean; crash: number; swell: number;
}
const NONE = '................';
const sec = (o: Partial<Sec>): Sec => ({
  bars: 8, harm: HARM_A, dyn: [0.8, 1], ost: 0, ostOct: 0, pad: 0, bass: 0, pulse: false, sul: 0, horn: 0, hornOct: [0], trp: 0,
  snare: NONE, timp: NONE, kick: NONE, anvil: false, crash: 0, swell: 0, ...o,
});
const MARCH = '5.2.7.2.5.2.7.35', FULL = '6.3.8.3.6.3.8.46', FAR = '3.....2.3.....2.';
const SECTIONS: Sec[] = [
  sec({ harm: HARM_INTRO, dyn: [0.45, 0.8], ost: 0.07, pad: 0.03, bass: 0.1, timp: '6..6..6.6..6..6.', crash: 0.05, swell: 0.07 }),
  sec({ bars: 16, dyn: [0.7, 0.95], ost: 0.06, pad: 0.05, bass: 0.12, horn: 0.1, snare: MARCH, timp: '8.......5.......', swell: 0.06 }),
  sec({ bars: 16, dyn: [0.85, 1], ost: 0.07, pad: 0.05, bass: 0.12, pulse: true, horn: 0.08, hornOct: [12], trp: 0.07, snare: FULL, timp: '8.......5.......', kick: '8.......6.......', anvil: true, crash: 0.1, swell: 0.1 }),
  sec({ harm: HARM_BRIDGE, dyn: [0.4, 0.85], sul: 0.05, pad: 0.03, bass: 0.1, snare: FAR, timp: '5...............', crash: 0.04, swell: 0.1 }),
  sec({ bars: 16, dyn: [0.9, 1.1], ost: 0.07, pad: 0.06, bass: 0.13, pulse: true, horn: 0.1, hornOct: [0, 12], trp: 0.07, snare: FULL, timp: '8.....5.8.....5.', kick: '8.....6.8.....6.', anvil: true, crash: 0.12, swell: 0.12 }),
];
const WHERE: [Sec, number][] = SECTIONS.flatMap((s) => Array.from({ length: s.bars }, (_, b): [Sec, number] => [s, b]));
const TOTAL = WHERE.length * 16;

let ctx: AudioContext | null = null;
let bus: GainNode | null = null; // master level
let mix: GainNode | null = null; // dry + reverb send
let timer: ReturnType<typeof setInterval> | null = null;
let loopStart = 0;
let nextStep = 0;
let noise: AudioBuffer | null = null;

const level = () => (getMuted() ? 0.0001 : Math.max(0.0001, 0.22 * getVolume()));
const lv = (p: string, st: number) => (p[st] && p[st] !== '.' ? +p[st] : 0);

function out(n: AudioNode, pan = 0) {
  if (pan) { const p = ctx!.createStereoPanner(); p.pan.value = pan; n.connect(p).connect(mix!); } else n.connect(mix!);
}
function env(t: number, g: number, att: number, dur: number, rel: number) {
  const gain = ctx!.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(g, 0.0002), t + att);
  gain.gain.setValueAtTime(Math.max(g, 0.0002), t + Math.max(dur, att));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, att) + rel);
  return gain;
}
interface ToneOpt { type?: OscillatorType; cut?: number; att?: number; rel?: number; pan?: number; glide?: number }
/** Two detuned oscillators through an opening lowpass. */
function tone(t: number, f: number, dur: number, g: number, o: ToneOpt = {}) {
  const { type = 'sawtooth', cut = 1200, att = 0.05, rel = 0.12, pan = 0, glide = 0 } = o;
  const lp = ctx!.createBiquadFilter(), gain = env(t, g, att, dur, rel), end = t + Math.max(dur, att) + rel + 0.05;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(cut * 0.45, t); lp.frequency.linearRampToValueAtTime(cut, t + att + 0.05);
  for (const d of [1, 1.004]) {
    const os = ctx!.createOscillator();
    os.type = type;
    if (glide) { os.frequency.setValueAtTime(f * d * 0.945, t); os.frequency.exponentialRampToValueAtTime(f * d, t + glide); } else os.frequency.value = f * d;
    os.connect(lp); os.start(t); os.stop(end);
  }
  lp.connect(gain); out(gain, pan);
}
function noiseHit(t: number, type: BiquadFilterType, freq: number, q: number, att: number, dur: number, g: number, pan = 0) {
  const s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), gain = env(t, g, att, 0, dur);
  s.buffer = noise; s.loop = true; f.type = type; f.frequency.value = freq; f.Q.value = q;
  s.connect(f).connect(gain); out(gain, pan);
  s.start(t, Math.random() * 0.5); s.stop(t + att + dur + 0.05);
}
function timpani(t: number, f: number, g: number) {
  const o = ctx!.createOscillator(), gain = env(t, g, 0.004, 0, 0.9);
  o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
  o.connect(gain); out(gain, -0.2); o.start(t); o.stop(t + 1);
  noiseHit(t, 'lowpass', 220, 1, 0.003, 0.2, g * 0.5, -0.2);
}
function kick(t: number, g: number) {
  const o = ctx!.createOscillator(), gain = env(t, g, 0.003, 0, 0.45);
  o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  o.connect(gain); out(gain); o.start(t); o.stop(t + 0.5);
}
function snare(t: number, v: number, pan: number) {
  const g = (v / 9) * 0.34;
  if (v >= 7) noiseHit(t - 0.028, 'bandpass', 1800, 0.8, 0.002, 0.05, g * 0.4, pan); // flam
  noiseHit(t, 'bandpass', 1800, 0.8, 0.002, 0.12, g, pan);
  noiseHit(t, 'highpass', 5000, 0.5, 0.002, 0.05, g * 0.25, pan);
}
function anvil(t: number, g: number) {
  const gain = env(t, g, 0.002, 0, 0.7), hp = ctx!.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 700; hp.connect(gain); out(gain, 0.3);
  for (const m of [1, 2.76, 5.4]) { const o = ctx!.createOscillator(); o.frequency.value = 880 * m; o.connect(hp); o.start(t); o.stop(t + 0.8); }
}
const crash = (t: number, g: number) => { noiseHit(t, 'highpass', 5500, 0.5, 0.005, 2.4, g, -0.15); noiseHit(t, 'bandpass', 8000, 0.7, 0.005, 1.6, g * 0.6, 0.2); };
const swell = (t: number, len: number, g: number) => noiseHit(t, 'highpass', 4500, 0.5, len, 0.3, g);

function playStep(i: number, t: number) {
  const s = i % TOTAL, bar = s >> 4, st = s & 15;
  const [sc, b] = WHERE[bar];
  const chord = sc.harm[b % sc.harm.length], tones = tonesOf(chord), bass = bassOf(chord);
  const last = b === sc.bars - 1, prog = (b + st / 16) / sc.bars;
  const d = sc.dyn[0] + (sc.dyn[1] - sc.dyn[0]) * prog;

  if (st === 0) {
    if (sc.pad) tones.forEach((n, k) => tone(t, hz(n), BAR, sc.pad * d, { cut: 650, att: 0.35, rel: 0.4, pan: (k - 1) * 0.3 }));
    if (sc.bass) {
      tone(t, hz(bass), BAR * 0.98, sc.bass * d, { type: 'sine', att: 0.03, rel: 0.2 });
      tone(t, hz(bass + 12), BAR * 0.98, sc.bass * 0.5 * d, { cut: 260, att: 0.04, rel: 0.2 });
    }
    if (b === 0 && sc.crash) crash(t, sc.crash);
    if (last && sc.swell) swell(t, BAR, sc.swell * d);
    if (sc.anvil && b % 4 === 0) anvil(t, 0.06);
  }
  if (sc.pulse && st % 2 === 0 && st) tone(t, hz(bass), S16 * 1.6, sc.bass * 0.6 * d, { cut: 320, att: 0.01, rel: 0.05 });
  if (sc.ost) tone(t, hz(tones[+OST[st]] + sc.ostOct), S16 * 0.9, sc.ost * (st % 4 ? 0.7 : 1) * d, { cut: 1100, att: 0.008, rel: 0.04, pan: st % 2 ? 0.35 : -0.35 });
  if (sc.sul && st % 2 === 0) tone(t, hz(tones[(st >> 1) % 3] + 24), S16 * 2.2, sc.sul * d, { cut: 3000, att: 0.05, rel: 0.1, pan: st % 4 ? 0.5 : -0.5 });
  for (const [ns, semi, len] of THEME[b % 8]) {
    if (ns === st && sc.horn) for (const o of sc.hornOct) tone(t, hz(semi + o), len * S16 * 0.95, sc.horn * d, { cut: o ? 1800 : 1400, att: 0.07, rel: 0.15, glide: 0.07 });
  }
  if (sc.trp) for (const [ns, semi, len] of TRUMPET[b % 8]) if (ns === st) tone(t, hz(semi), len * S16 * 0.9, sc.trp * d, { cut: 2600, att: 0.02, rel: 0.1, glide: 0.03, pan: 0.25 });

  // percussion; the last bar of a section rolls into the next
  const roll = (p: string, lo: number) => (last && p !== NONE ? lo + st * 0.4 : lv(p, st));
  const sn = roll(sc.snare, 2), tp = roll(sc.timp, 3), kk = lv(sc.kick, st);
  if (sn) snare(t, Math.min(9, sn) * Math.min(1, d + 0.1), st % 2 ? 0.2 : -0.2);
  if (tp) timpani(t, hz(bass + (st & 7 ? 7 : 0)), (Math.min(9, tp) / 9) * 0.5 * d);
  if (kk) kick(t, (kk / 9) * 0.45 * d);
}

function tick() {
  if (!ctx) return;
  while (loopStart + nextStep * S16 < ctx.currentTime + 0.3) { playStep(nextStep, loopStart + nextStep * S16); nextStep++; }
}

function setup(c: AudioContext) {
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  bus = c.createGain(); mix = c.createGain();
  const comp = c.createDynamicsCompressor(), verb = c.createConvolver(), wet = c.createGain();
  const n = Math.floor(c.sampleRate * 2.4), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2.5; }
  verb.buffer = ir; wet.gain.value = 0.28;
  mix.connect(bus); mix.connect(verb).connect(wet).connect(bus);
  bus.connect(comp).connect(c.destination);
}

function start() {
  if (timer) return;
  try {
    if (!ctx) { ctx = new AudioContext(); setup(ctx); }
    if (ctx.state === 'suspended') void ctx.resume();
    bus!.gain.cancelScheduledValues(ctx.currentTime);
    bus!.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus!.gain.exponentialRampToValueAtTime(level(), ctx.currentTime + 2);
    loopStart = ctx.currentTime + 0.1; nextStep = 0;
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
