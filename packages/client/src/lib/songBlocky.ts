/**
 * "Sky Isles Skip": a breezy, bouncy loop for Blocky, C major, 4/4 at 100 BPM. A kalimba plays the tune and
 * arpeggios, a marimba answers and doubles, a soft pad holds the chords, a round bass walks the roots and a shaker,
 * wood block and hand clap keep a light skip. Intro (kalimba), A (tune), B (marimba tune, kalimba arpeggios),
 * A' (both), bridge (pad and arpeggios), A'' (full): 36 bars, 86 s before it loops.
 *
 * The data part is pure and deterministic; `createBlockyVoices` turns events into Web Audio voices for any
 * BaseAudioContext, so blocky/music.ts plays them live and songBlocky.test.ts renders them offline to level them.
 */
export const BPM_BLOCKY = 100;
export const BEATS_PER_BAR_BLOCKY = 4;
/** Master level in blocky/music.ts, levelled by the offline render in songBlocky.test.ts. */
export const VOLUME_BLOCKY = 0.8;

export type BlockyEvent =
  | { kind: 'kalimba'; beat: number; midi: number; vel: number }
  | { kind: 'marimba'; beat: number; midi: number; vel: number }
  | { kind: 'pad'; beat: number; midi: number; beats: number; vel: number }
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  | { kind: 'shaker'; beat: number; vel: number }
  | { kind: 'block'; beat: number; vel: number }
  | { kind: 'clap'; beat: number; vel: number };

export interface BlockySong { events: BlockyEvent[]; bars: number; beats: number }

export const SECTIONS_BLOCKY = [
  { name: 'intro', bars: 4 },
  { name: 'A', bars: 8 },
  { name: 'B', bars: 8 },
  { name: 'A2', bars: 8 },
  { name: 'bridge', bars: 4 },
  { name: 'A3', bars: 4 },
] as const;

/** Chord roots (midi) with a third offset (4 major, 3 minor). */
type Chord = [number, number];
const C: Chord = [60, 4], G: Chord = [55, 4], Am: Chord = [57, 3], F: Chord = [53, 4];
const PROG_A = [C, G, Am, F, C, G, F, C];
const PROG_B = [F, C, G, Am, F, C, G, G];
const PROG_INTRO = [C, G, Am, F];
const PROG_BRIDGE = [Am, F, C, G];
const PROG_A3 = [C, G, F, C];

/** The tune, one bar per entry, eight eighth-note steps; 0 = rest. */
const TUNE_A: number[][] = [
  [76, 0, 79, 0, 76, 74, 72, 0],
  [74, 0, 79, 0, 74, 71, 0, 0],
  [72, 0, 76, 0, 81, 0, 79, 76],
  [77, 0, 76, 0, 74, 72, 0, 0],
  [76, 0, 79, 0, 84, 0, 83, 79],
  [74, 0, 79, 0, 83, 0, 79, 74],
  [77, 0, 81, 0, 79, 77, 76, 74],
  [72, 0, 0, 0, 79, 0, 76, 0],
];
const TUNE_B: number[][] = [
  [81, 0, 84, 0, 81, 79, 77, 0],
  [79, 0, 84, 0, 79, 76, 0, 0],
  [74, 0, 79, 0, 83, 0, 86, 83],
  [76, 0, 81, 0, 84, 0, 81, 76],
  [77, 0, 81, 0, 84, 0, 81, 77],
  [76, 0, 79, 0, 84, 0, 79, 76],
  [74, 0, 79, 0, 83, 0, 79, 74],
  [74, 71, 74, 79, 83, 0, 0, 0],
];
/** Marimba answers in the gaps of tune A (an octave down, off the beat). */
const ANSWER: number[][] = [
  [0, 0, 0, 72, 0, 0, 0, 67], [0, 0, 0, 71, 0, 0, 0, 67], [0, 0, 0, 69, 0, 0, 0, 72], [0, 0, 0, 65, 0, 0, 0, 69],
  [0, 0, 0, 72, 0, 0, 0, 67], [0, 0, 0, 71, 0, 0, 0, 67], [0, 0, 0, 69, 0, 0, 0, 72], [0, 0, 0, 67, 0, 0, 72, 0],
];

const tones = ([r, third]: Chord) => [r, r + third, r + 7];

export function buildSongBlocky(): BlockySong {
  const ev: BlockyEvent[] = [];
  let bar = 0;
  const arp = (b0: number, ch: Chord, vel: number, dense: boolean) => {
    const t = tones(ch).map((m) => m + 12);
    const pat = dense ? [0, 1, 2, 1, 2, 1, 0, 1] : [0, 2, 1, 2];
    pat.forEach((k, i) => ev.push({ kind: 'kalimba', beat: b0 + (dense ? i * 0.5 : i), midi: t[k] + (i % 4 === 3 ? 12 : 0), vel: vel * (i % 2 ? 0.7 : 1) }));
  };
  const tune = (b0: number, steps: number[], kind: 'kalimba' | 'marimba', shift: number, vel: number) =>
    steps.forEach((m, i) => { if (m) ev.push({ kind, beat: b0 + i * 0.5, midi: m + shift, vel }); });
  const pad = (b0: number, ch: Chord, vel: number) => tones(ch).forEach((m) => ev.push({ kind: 'pad', beat: b0, midi: m + 12, beats: 4, vel }));
  const bass = (b0: number, ch: Chord, bounce: boolean) => {
    const m = ch[0] - 12;
    ev.push({ kind: 'bass', beat: b0, midi: m, beats: 1.4 });
    if (bounce) { ev.push({ kind: 'bass', beat: b0 + 2, midi: m + 7, beats: 0.9 }); ev.push({ kind: 'bass', beat: b0 + 3, midi: m + 12, beats: 0.8 }); }
    else ev.push({ kind: 'bass', beat: b0 + 2, midi: m + 7, beats: 1.4 });
  };
  const perc = (b0: number, lv: number, fill: boolean) => {
    for (let i = 0; i < 8; i++) ev.push({ kind: 'shaker', beat: b0 + i * 0.5, vel: lv * (i % 2 ? 0.55 : 1) });
    ev.push({ kind: 'block', beat: b0, vel: lv }, { kind: 'block', beat: b0 + 1.5, vel: lv * 0.6 }, { kind: 'block', beat: b0 + 2, vel: lv * 0.8 });
    ev.push({ kind: 'clap', beat: b0 + 1, vel: lv * 0.7 }, { kind: 'clap', beat: b0 + 3, vel: lv * 0.7 });
    if (fill) ev.push({ kind: 'block', beat: b0 + 3.5, vel: lv * 0.6 }, { kind: 'block', beat: b0 + 3.75, vel: lv * 0.5 });
  };
  for (const sec of SECTIONS_BLOCKY) {
    for (let k = 0; k < sec.bars; k++, bar++) {
      const b0 = bar * BEATS_PER_BAR_BLOCKY, last = k === sec.bars - 1;
      if (sec.name === 'intro') { const ch = PROG_INTRO[k]; arp(b0, ch, 1, true); pad(b0, ch, 0.6); bass(b0, ch, false); if (last) perc(b0, 0.5, true); }
      if (sec.name === 'A') { const ch = PROG_A[k]; tune(b0, TUNE_A[k], 'kalimba', 0, 1); pad(b0, ch, 0.7); bass(b0, ch, false); perc(b0, 0.6, last); }
      if (sec.name === 'B') {
        const ch = PROG_B[k]; tune(b0, TUNE_B[k], 'marimba', -12, 0.95); arp(b0, ch, 0.45, false); pad(b0, ch, 0.6); bass(b0, ch, true); perc(b0, 0.8, last);
      }
      if (sec.name === 'A2') {
        const ch = PROG_A[k]; tune(b0, TUNE_A[k], 'kalimba', 0, 1); tune(b0, TUNE_A[k], 'marimba', -12, 0.5); tune(b0, ANSWER[k], 'marimba', 0, 0.7);
        pad(b0, ch, 0.7); bass(b0, ch, true); perc(b0, 0.85, last);
      }
      if (sec.name === 'bridge') { const ch = PROG_BRIDGE[k]; arp(b0, ch, 0.9, true); pad(b0, ch, 0.9); bass(b0, ch, false); perc(b0, 0.45, last); }
      if (sec.name === 'A3') {
        const ch = PROG_A3[k]; tune(b0, TUNE_A[k], 'kalimba', 12, 0.5); tune(b0, TUNE_A[k], 'marimba', 0, 0.85); arp(b0, ch, 0.35, false);
        pad(b0, ch, 0.7); bass(b0, ch, true); perc(b0, 0.9, last);
      }
    }
  }
  ev.sort((x, y) => x.beat - y.beat);
  return { events: ev, bars: bar, beats: bar * BEATS_PER_BAR_BLOCKY };
}

export interface BlockyVoiceEnv { ctx: BaseAudioContext; out: AudioNode; room: AudioNode | null; secPerBeat: number; noise: AudioBuffer }
const MIN = 0.0001;
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export function createBlockyVoices({ ctx: a, out, room, secPerBeat, noise }: BlockyVoiceEnv) {
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
  /** a kalimba tine: a pure tone with a metallic overtone that dies fast, a long soft tail */
  function kalimba(t: number, midi: number, vel: number) {
    const g = a.createGain(), f = hz(midi);
    env(g, t, 0.07 * vel, 0.002, 1.1);
    osc('sine', f, g, t, t + 1.15);
    const h = a.createGain(); env(h, t, 0.03 * vel, 0.001, 0.18); osc('sine', f * 5.4, h, t, t + 0.2); h.connect(g);
    toOut(g, 0.4);
  }
  /** a marimba bar: a warm fundamental, a 4x overtone, quick wooden decay */
  function marimba(t: number, midi: number, vel: number) {
    const g = a.createGain(), f = hz(midi);
    env(g, t, 0.08 * vel, 0.002, 0.5);
    osc('sine', f, g, t, t + 0.55);
    const h = a.createGain(); env(h, t, 0.035 * vel, 0.001, 0.09); osc('sine', f * 4, h, t, t + 0.12); h.connect(g);
    toOut(g, 0.25);
  }
  /** a soft pad: two detuned triangles through a low-pass with a slow swell */
  function pad(t: number, midi: number, beats: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain(), dur = beats * secPerBeat;
    f.type = 'lowpass'; f.frequency.value = 1100;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.014 * vel, t + 0.5);
    g.gain.setValueAtTime(0.014 * vel, t + dur - 0.4);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur + 0.3);
    osc('triangle', hz(midi), f, t, t + dur + 0.35, -6);
    osc('triangle', hz(midi), f, t, t + dur + 0.35, 6);
    f.connect(g); toOut(g, 0.5);
  }
  /** a round, soft bass */
  function bass(t: number, midi: number, beats: number) {
    const g = a.createGain(), dur = beats * secPerBeat;
    env(g, t, 0.13, 0.01, dur);
    osc('sine', hz(midi), g, t, t + dur + 0.05);
    toOut(g, 0.05);
  }
  const shaker = (t: number, vel: number) => noiseHit(t, 'bandpass', 6200, 1.2, 0.02 * vel, 0.06, 0.1);
  /** a wood block: a short hollow knock */
  function block(t: number, vel: number) {
    const g = a.createGain();
    env(g, t, 0.07 * vel, 0.001, 0.09);
    const o = osc('triangle', 880, g, t, t + 0.1);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.06);
    toOut(g, 0.15);
  }
  /** a soft hand clap: three tiny noise bursts */
  function clap(t: number, vel: number) {
    [0, 0.012, 0.025].forEach((d, i) => noiseHit(t + d, 'bandpass', 1500, 1.5, (i === 2 ? 0.05 : 0.03) * vel, i === 2 ? 0.1 : 0.02, 0.25));
  }

  return (e: BlockyEvent, t: number) => {
    switch (e.kind) {
      case 'kalimba': return kalimba(t, e.midi, e.vel);
      case 'marimba': return marimba(t, e.midi, e.vel);
      case 'pad': return pad(t, e.midi, e.beats, e.vel);
      case 'bass': return bass(t, e.midi, e.beats);
      case 'shaker': return shaker(t, e.vel);
      case 'block': return block(t, e.vel);
      case 'clap': return clap(t, e.vel);
    }
  };
}
