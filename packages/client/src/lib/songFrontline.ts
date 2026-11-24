/**
 * "Hold the Line": an original, tense modern-warfare loop for Frontline. D minor, 4/4 at 96 BPM.
 * A driving 16th-note string ostinato, a sub pulse, war drums (taiko-like booms, a tight snare, ticking hats),
 * a dark drone and a brass horn theme. Intro, A, B (theme), bridge (half time), A' (theme an octave up):
 * 32 bars, about 80 s before it loops. Small drum variations come from a fixed-seed random generator.
 *
 * The data part is pure and deterministic. `createFrontlineVoices` turns the events into Web Audio voices
 * for any BaseAudioContext, so music.ts plays them live and a test can render them offline.
 */
export const BPM_FRONTLINE = 96;
export const BEATS_PER_BAR_FRONTLINE = 4;
/** Master level in music.ts, levelled by the offline render in songFrontline.test.ts (rms about 0.027, like the other tunes). */
export const VOLUME_FRONTLINE = 0.48;

export type FrontlineEvent =
  | { kind: 'ost'; beat: number; midi: number; vel: number }
  | { kind: 'sub'; beat: number; midi: number; beats: number }
  | { kind: 'drone'; beat: number; midis: number[]; beats: number }
  | { kind: 'horn'; beat: number; midi: number; beats: number; vel: number }
  | { kind: 'boom'; beat: number; vel: number }
  | { kind: 'snare'; beat: number; vel: number }
  | { kind: 'tick'; beat: number; accent: boolean };

export interface FrontlineSong { events: FrontlineEvent[]; bars: number; beats: number }

type Chord = 'Dm' | 'Bb' | 'Gm' | 'A' | 'C';
const SUB: Record<Chord, number> = { Dm: 38, Bb: 34, Gm: 31, A: 33, C: 36 };
const DRONE: Record<Chord, number[]> = { Dm: [50, 57, 62, 65], Bb: [46, 53, 58, 62], Gm: [43, 50, 55, 58], A: [45, 52, 57, 61], C: [48, 55, 60, 64] };
/** 16th-note ostinato, as offsets from the chord root (octave 3). */
const OST = [0, 0, 12, 0, 7, 0, 12, 0, 0, 0, 12, 0, 7, 12, 7, 12];
const PROG: Chord[] = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'C', 'A'];
/** The horn theme, one bar per entry, over PROG. */
const THEME: [number, number][][] = [
  [[62, 1.5], [65, 0.5], [69, 2]],
  [[70, 1], [69, 1], [65, 2]],
  [[67, 1.5], [65, 0.5], [62, 1], [67, 1]],
  [[69, 4]],
  [[62, 1.5], [65, 0.5], [69, 1], [74, 1]],
  [[74, 1.5], [72, 0.5], [70, 2]],
  [[72, 1], [67, 1], [64, 2]],
  [[69, 2], [61, 2]],
];

export const SECTIONS_FRONTLINE = [
  { name: 'intro', bars: 4 },
  { name: 'A', bars: 8 },
  { name: 'B', bars: 8 },
  { name: 'bridge', bars: 4 },
  { name: 'A2', bars: 8 },
] as const;

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSongFrontline(): FrontlineSong {
  const ev: FrontlineEvent[] = [];
  const rand = rng(1944);
  let bar = 0;
  for (const { name, bars } of SECTIONS_FRONTLINE) {
    for (let i = 0; i < bars; i++, bar++) {
      const b = bar * 4;
      const last = i === bars - 1;
      const chord: Chord = name === 'intro' ? (['Dm', 'Dm', 'Bb', 'A'] as Chord[])[i] : name === 'bridge' ? (['Gm', 'Gm', 'Bb', 'A'] as Chord[])[i] : PROG[i];
      const root = SUB[chord];
      ev.push({ kind: 'drone', beat: b, midis: DRONE[chord], beats: 4 });
      ev.push({ kind: 'sub', beat: b, midi: root, beats: name === 'bridge' ? 4 : 1.5 });
      if (name !== 'bridge') ev.push({ kind: 'sub', beat: b + 2, midi: root, beats: 1.5 });
      const ostVel = name === 'intro' ? 0.55 : name === 'bridge' ? 0.6 : 1;
      OST.forEach((o, k) => ev.push({ kind: 'ost', beat: b + k / 4, midi: root + 12 + o, vel: ostVel * (k % 4 === 0 ? 1 : 0.7) }));
      for (let k = 0; k < 8; k++) ev.push({ kind: 'tick', beat: b + k / 2, accent: k % 2 === 1 });
      if (name === 'intro' || name === 'bridge') {
        ev.push({ kind: 'boom', beat: b, vel: 1 });
        if (name === 'bridge') ev.push({ kind: 'snare', beat: b + 2, vel: 0.8 });
      } else {
        ev.push({ kind: 'boom', beat: b, vel: 1 }, { kind: 'boom', beat: b + 1.5, vel: 0.7 }, { kind: 'boom', beat: b + 2.5, vel: 0.6 });
        if (rand() < 0.4) ev.push({ kind: 'boom', beat: b + 3.5, vel: 0.5 });
        ev.push({ kind: 'snare', beat: b + 1, vel: 0.9 });
        if (!last) ev.push({ kind: 'snare', beat: b + 3, vel: 0.9 });
      }
      // a snare roll into the next section
      if (last) for (let k = 0; k < 8; k++) ev.push({ kind: 'snare', beat: b + 2 + k / 4, vel: 0.35 + k * 0.08 });
      if (name === 'B' || name === 'A2') {
        let at = b;
        for (const [midi, beats] of THEME[i]) {
          ev.push({ kind: 'horn', beat: at, midi: midi + (name === 'A2' ? 12 : 0), beats, vel: name === 'A2' ? 0.8 : 1 });
          at += beats;
        }
      }
    }
  }
  ev.sort((x, y) => x.beat - y.beat);
  return { events: ev, bars: bar, beats: bar * 4 };
}

export interface FrontlineVoiceEnv {
  ctx: BaseAudioContext;
  out: AudioNode;
  /** a send into an echo, or null for none */
  room: AudioNode | null;
  secPerBeat: number;
  noise: AudioBuffer;
}

const MIN = 0.0001;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function createFrontlineVoices({ ctx: a, out, room, secPerBeat, noise }: FrontlineVoiceEnv) {
  const env = (g: GainNode, t: number, peak: number, attack: number, dur: number) => {
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
  };
  const toOut = (g: AudioNode, send: number) => {
    g.connect(out);
    if (room && send > 0) { const s = a.createGain(); s.gain.value = send; g.connect(s).connect(room); }
  };
  const osc = (type: OscillatorType, freq: number, to: AudioNode, t: number, end: number, detune = 0) => {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    o.connect(to);
    o.start(t);
    o.stop(end);
    return o;
  };
  const noiseHit = (t: number, type: BiquadFilterType, freq: number, q: number, peak: number, dur: number, send = 0) => {
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noise;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    env(g, t, peak, 0.003, dur);
    src.connect(f).connect(g);
    toOut(g, send);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  /** short, bowed-string staccato: two detuned saws through a closing low-pass */
  function ost(t: number, midi: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2200, t);
    f.frequency.exponentialRampToValueAtTime(700, t + 0.12);
    env(g, t, 0.032 * vel, 0.006, 0.15);
    for (const d of [-6, 6]) osc('sawtooth', hz(midi), f, t, t + 0.18, d);
    f.connect(g);
    toOut(g, 0.1);
  }
  function sub(t: number, midi: number, dur: number) {
    const g = a.createGain();
    env(g, t, 0.16, 0.01, dur);
    osc('sine', hz(midi), g, t, t + dur + 0.05);
    const h = a.createGain();
    h.gain.value = 0.3;
    osc('triangle', hz(midi) * 2, h, t, t + dur + 0.05);
    h.connect(g);
    g.connect(out);
  }
  function drone(t: number, midis: number[], dur: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.value = 650;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + 0.6);
    g.gain.setValueAtTime(0.018, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur + 0.5);
    for (const m of midis) osc('sawtooth', hz(m), f, t, t + dur + 0.6, m % 2 ? 5 : -5);
    f.connect(g);
    toOut(g, 0.2);
  }
  /** a brass horn: three detuned saws through a swelling low-pass */
  function horn(t: number, midi: number, dur: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain(), len = Math.max(0.2, dur - 0.05);
    f.type = 'lowpass';
    f.Q.value = 1.5;
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(2000, t + 0.12);
    f.frequency.exponentialRampToValueAtTime(1200, t + len);
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.08);
    g.gain.setValueAtTime(0.045 * vel, t + len * 0.8);
    g.gain.exponentialRampToValueAtTime(MIN, t + len + 0.15);
    for (const d of [-8, 0, 8]) osc('sawtooth', hz(midi), f, t, t + len + 0.2, d);
    f.connect(g);
    toOut(g, 0.45);
  }
  /** a war drum: a sine dropping in pitch plus a dull thud of noise */
  function boom(t: number, vel: number) {
    const g = a.createGain(), o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
    env(g, t, 0.32 * vel, 0.005, 0.55);
    o.connect(g);
    toOut(g, 0.15);
    o.start(t);
    o.stop(t + 0.6);
    noiseHit(t, 'lowpass', 300, 0.7, 0.18 * vel, 0.18);
  }
  function snare(t: number, vel: number) {
    noiseHit(t, 'bandpass', 2000, 0.8, 0.12 * vel, 0.14, 0.2);
    const g = a.createGain();
    env(g, t, 0.05 * vel, 0.003, 0.08);
    osc('triangle', 190, g, t, t + 0.1);
    g.connect(out);
  }
  const tick = (t: number, accent: boolean) => noiseHit(t, 'highpass', 8000, 0.7, accent ? 0.03 : 0.016, 0.04);

  return (e: FrontlineEvent, t: number) => {
    switch (e.kind) {
      case 'ost': return ost(t, e.midi, e.vel);
      case 'sub': return sub(t, e.midi, e.beats * secPerBeat);
      case 'drone': return drone(t, e.midis, e.beats * secPerBeat);
      case 'horn': return horn(t, e.midi, e.beats * secPerBeat, e.vel);
      case 'boom': return boom(t, e.vel);
      case 'snare': return snare(t, e.vel);
      case 'tick': return tick(t, e.accent);
    }
  };
}
