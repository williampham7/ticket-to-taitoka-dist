/**
 * "The Hedge-Maze Waltz": an original, lilting folk-medieval loop for Shifting Kingdom, in D major, 3/4 at 112 BPM.
 * A harp ripples chord tones, a plucked lute and a soft bass walk the roots, a recorder sings the tune and a tabor
 * keeps a gentle dance step. Intro (harp), A (recorder), B (lute, recorder answering), bridge (harp and tabor),
 * A' (recorder and lute together): 32 bars, about 51 s before it loops.
 *
 * The data part is pure and deterministic; `createKingdomVoices` turns events into Web Audio voices for any
 * BaseAudioContext, so kingdom/music.ts plays them live and songKingdom.test.ts renders them offline to level them.
 */
export const BPM_KINGDOM = 112;
export const BEATS_PER_BAR_KINGDOM = 3;
/** Master level in kingdom/music.ts, levelled by the offline render in songKingdom.test.ts. */
export const VOLUME_KINGDOM = 0.7;

export type KingdomEvent =
  | { kind: 'harp'; beat: number; midi: number; vel: number }
  | { kind: 'lute'; beat: number; midi: number; vel: number }
  | { kind: 'recorder'; beat: number; midi: number; beats: number; vel: number }
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  | { kind: 'tabor'; beat: number; vel: number }
  | { kind: 'jingle'; beat: number; vel: number };

export interface KingdomSong { events: KingdomEvent[]; bars: number; beats: number }

export const SECTIONS_KINGDOM = [
  { name: 'intro', bars: 4 },
  { name: 'A', bars: 8 },
  { name: 'B', bars: 8 },
  { name: 'bridge', bars: 4 },
  { name: 'A2', bars: 8 },
] as const;

/** Chords as [root midi, third offset (4 major / 3 minor)]. */
type Chord = [number, number];
const D: Chord = [62, 4], G: Chord = [67, 4], A: Chord = [69, 4], Bm: Chord = [71, 3], C: Chord = [60, 4];
const HARM_A = [D, G, D, A, D, G, A, D];
const HARM_B = [Bm, G, D, A, G, A, D, D];
const HARM_INTRO = [D, G, A, D];
const HARM_BRIDGE = [G, D, C, A];

/** The recorder's tune, one bar per entry: [midi, beats]. */
const TUNE_A: [number, number][][] = [
  [[74, 1.5], [76, 0.5], [78, 1]],
  [[79, 1], [78, 1], [76, 1]],
  [[78, 1.5], [76, 0.5], [74, 1]],
  [[76, 3]],
  [[74, 1.5], [76, 0.5], [78, 1]],
  [[79, 1], [81, 1], [83, 1]],
  [[81, 1], [78, 1], [76, 1]],
  [[74, 3]],
];
/** The lute's tune for B (played an octave down), the recorder answering on long notes. */
const TUNE_B: [number, number][][] = [
  [[71, 1], [74, 1], [78, 1]],
  [[79, 1.5], [78, 0.5], [76, 1]],
  [[74, 1], [78, 1], [81, 1]],
  [[76, 2], [73, 1]],
  [[71, 1], [74, 1], [79, 1]],
  [[76, 1], [78, 1], [73, 1]],
  [[74, 1.5], [76, 0.5], [78, 1]],
  [[74, 3]],
];
const ANSWER: [number, number][][] = [[[83, 3]], [[86, 3]], [[81, 3]], [[85, 3]], [[83, 3]], [[85, 3]], [[86, 2], [85, 1]], [[86, 3]]];

const tones = ([r, third]: Chord) => [r, r + third, r + 7, r + 12];

export function buildSongKingdom(): KingdomSong {
  const ev: KingdomEvent[] = [];
  let bar = 0;
  const harpRipple = (b0: number, ch: Chord, vel: number, dense: boolean) => {
    const t = tones(ch);
    const pat = dense ? [0, 1, 2, 3, 2, 1] : [0, 2, 3];
    pat.forEach((k, i) => ev.push({ kind: 'harp', beat: b0 + (dense ? i * 0.5 : i), midi: t[k] + 12, vel: vel * (i ? 0.8 : 1) }));
  };
  const bassStep = (b0: number, ch: Chord) => { ev.push({ kind: 'bass', beat: b0, midi: ch[0] - 24 + (ch[0] > 66 ? 0 : 12), beats: 2.6 }); };
  const taborStep = (b0: number, lv: number) => {
    ev.push({ kind: 'tabor', beat: b0, vel: lv });
    ev.push({ kind: 'tabor', beat: b0 + 2, vel: lv * 0.55 });
    ev.push({ kind: 'jingle', beat: b0 + 1, vel: lv * 0.6 });
    ev.push({ kind: 'jingle', beat: b0 + 2.5, vel: lv * 0.45 });
  };
  const tune = (b0: number, notes: [number, number][], shift: number, kind: 'recorder' | 'lute', vel: number) => {
    let at = b0;
    for (const [m, len] of notes) {
      if (kind === 'recorder') ev.push({ kind, beat: at, midi: m + shift, beats: len, vel });
      else ev.push({ kind, beat: at, midi: m + shift, vel });
      at += len;
    }
  };
  for (const sec of SECTIONS_KINGDOM) {
    for (let k = 0; k < sec.bars; k++, bar++) {
      const b0 = bar * BEATS_PER_BAR_KINGDOM;
      if (sec.name === 'intro') { const ch = HARM_INTRO[k]; harpRipple(b0, ch, 0.9, true); bassStep(b0, ch); if (k === 3) ev.push({ kind: 'tabor', beat: b0 + 2, vel: 0.6 }); }
      if (sec.name === 'A') { const ch = HARM_A[k]; harpRipple(b0, ch, 0.6, false); bassStep(b0, ch); taborStep(b0, 0.55); tune(b0, TUNE_A[k], 0, 'recorder', 1); }
      if (sec.name === 'B') {
        const ch = HARM_B[k]; harpRipple(b0, ch, 0.5, false); bassStep(b0, ch); taborStep(b0, 0.6);
        tune(b0, TUNE_B[k], -12, 'lute', 1);
        tune(b0, ANSWER[k], -12, 'recorder', 0.55);
      }
      if (sec.name === 'bridge') { const ch = HARM_BRIDGE[k]; harpRipple(b0, ch, 1, true); bassStep(b0, ch); taborStep(b0, 0.8); ev.push({ kind: 'tabor', beat: b0 + 1.5, vel: 0.4 }); }
      if (sec.name === 'A2') {
        const ch = HARM_A[k]; harpRipple(b0, ch, 0.55, true); bassStep(b0, ch); taborStep(b0, 0.7);
        tune(b0, TUNE_A[k], 0, 'recorder', 1);
        tune(b0, TUNE_A[k], -12, 'lute', 0.7);
      }
    }
  }
  ev.sort((x, y) => x.beat - y.beat);
  return { events: ev, bars: bar, beats: bar * BEATS_PER_BAR_KINGDOM };
}

export interface KingdomVoiceEnv { ctx: BaseAudioContext; out: AudioNode; room: AudioNode | null; secPerBeat: number; noise: AudioBuffer }
const MIN = 0.0001;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export function createKingdomVoices({ ctx: a, out, room, secPerBeat, noise }: KingdomVoiceEnv) {
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
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    o.connect(to); o.start(t); o.stop(end);
    return o;
  };
  const noiseHit = (t: number, type: BiquadFilterType, freq: number, q: number, peak: number, dur: number, send = 0) => {
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, peak, 0.002, dur);
    src.connect(f).connect(g); toOut(g, send);
    src.start(t); src.stop(t + dur + 0.02);
  };
  /** a harp string: triangle and a soft octave, long ringing decay */
  function harp(t: number, midi: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = 2600;
    env(g, t, 0.05 * vel, 0.004, 1.4);
    osc('triangle', hz(midi), f, t, t + 1.45);
    osc('sine', hz(midi) * 2, f, t, t + 0.8);
    f.connect(g); toOut(g, 0.45);
  }
  /** a plucked lute: a bright attack mellowing quickly */
  function lute(t: number, midi: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(hz(midi) * 6, t);
    f.frequency.exponentialRampToValueAtTime(hz(midi) * 1.6, t + 0.3);
    env(g, t, 0.075 * vel, 0.003, 0.55);
    osc('sawtooth', hz(midi), f, t, t + 0.6);
    osc('triangle', hz(midi) * 1.003, f, t, t + 0.6);
    f.connect(g); toOut(g, 0.3);
  }
  /** a wooden recorder: a pure tone with a breath at the start and a gentle vibrato */
  function recorder(t: number, midi: number, beats: number, vel: number) {
    const len = Math.max(0.2, beats * secPerBeat - 0.04), g = a.createGain(), o = a.createOscillator(), fr = hz(midi);
    o.type = 'sine';
    o.frequency.setValueAtTime(fr, t);
    for (let k = 0.25, up = true; k < len; k += 0.1, up = !up) o.frequency.linearRampToValueAtTime(fr * (up ? 1.004 : 0.996), t + k);
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.05);
    g.gain.setValueAtTime(0.06 * vel, t + len - 0.06);
    g.gain.exponentialRampToValueAtTime(MIN, t + len + 0.08);
    o.connect(g);
    const h = a.createGain(); h.gain.value = 0.18; osc('triangle', fr * 2, h, t, t + len + 0.1).connect(h); h.connect(g);
    toOut(g, 0.35);
    o.start(t); o.stop(t + len + 0.1);
    noiseHit(t, 'bandpass', fr * 2, 3, 0.012 * vel, 0.08);
  }
  /** a soft plucked bass */
  function bass(t: number, midi: number, beats: number) {
    const f = a.createBiquadFilter(), g = a.createGain(), dur = beats * secPerBeat;
    f.type = 'lowpass'; f.frequency.value = 420;
    env(g, t, 0.11, 0.01, dur);
    osc('triangle', hz(midi), f, t, t + dur + 0.05);
    f.connect(g); toOut(g, 0.1);
  }
  /** the tabor: a small skin drum */
  function tabor(t: number, vel: number) {
    const g = a.createGain(), o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(78, t + 0.16);
    env(g, t, 0.16 * vel, 0.003, 0.24);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.26);
    noiseHit(t, 'bandpass', 900, 1, 0.05 * vel, 0.07, 0.1);
  }
  const jingle = (t: number, vel: number) => noiseHit(t, 'highpass', 7600, 0.7, 0.018 * vel, 0.1, 0.15);

  return (e: KingdomEvent, t: number) => {
    switch (e.kind) {
      case 'harp': return harp(t, e.midi, e.vel);
      case 'lute': return lute(t, e.midi, e.vel);
      case 'recorder': return recorder(t, e.midi, e.beats, e.vel);
      case 'bass': return bass(t, e.midi, e.beats);
      case 'tabor': return tabor(t, e.vel);
      case 'jingle': return jingle(t, e.vel);
    }
  };
}
