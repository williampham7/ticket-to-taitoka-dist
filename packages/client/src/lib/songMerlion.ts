// WIRING (music.ts): import { BPM_MERLION, buildSongMerlion, createMerlionVoices, VOLUME_MERLION, type MerlionEvent } from './songMerlion';
// add MERLION to VOLUME / song / secPerBeat / warmth chains (VOLUME_MERLION, buildSongMerlion(), BPM_MERLION, ~6000 Hz), add MerlionEvent to AnyEvent,
// and mirror the BAY blocks: a room echo + `merlionVoice = createMerlionVoices({ ctx, out: master, room: roomIn, secPerBeat, noise: noiseBuf })`, then `if (merlionVoice) return merlionVoice(e as MerlionEvent, t)` in play().
import type { Note } from './song';

/**
 * "Evening by the Bay" — an original, laid-back tropical loop for the Singapore edition ("merlion" theme).
 * C major pentatonic with a Chinese/Malay folk colour, 4/4 at 88 BPM: a gamelan-like bell lead, an interlocking
 * high metallophone layer, a light kompang (frame drum) groove, a soft shaker, a warm bass and slow pads.
 * Intro, A, B, A (ornamented by a seeded variation), a bridge, A (with the lead an octave up) and an outro
 * that ends on G so the loop leans back into the intro. 48 bars, about 130 s before it loops, and the
 * ornaments and the gamelan layer differ every time through a section, so it does not feel repeated.
 *
 * The data part is pure and deterministic (a fixed-seed random generator). `createMerlionVoices` turns the
 * events into Web Audio voices for any BaseAudioContext, so music.ts plays them live and a test can render them.
 */
export const BPM_MERLION = 88;
export const BEATS_PER_BAR_MERLION = 4;
/** Master level in music.ts, levelled by the offline render in songMerlion.test.ts (rms about 0.027, like the other tunes). */
export const VOLUME_MERLION = 1.15;

export type MerlionEvent =
  /** the bell lead (a gamelan-ish metallophone) */
  | { kind: 'bell'; beat: number; midi: number; beats: number; vel: number }
  /** the high interlocking metallophone layer */
  | { kind: 'gamelan'; beat: number; midi: number; vel: number }
  /** a soft round bass note */
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  /** a slow warm pad chord */
  | { kind: 'pad'; beat: number; midis: number[]; beats: number }
  /** a kompang hit: dum (low thump) or tak (slap) */
  | { kind: 'kompang'; beat: number; hit: 'dum' | 'tak'; vel: number }
  /** a soft shaker */
  | { kind: 'shaker'; beat: number; accent: boolean };

export interface MerlionSong { events: MerlionEvent[]; bars: number; beats: number }

type Chord = 'C' | 'Am' | 'F' | 'G' | 'Dm' | 'Em';

/** Pad voicings (open, with a 6th/9th for warmth). */
export const PAD: Record<Chord, number[]> = {
  C: [48, 55, 64, 67],
  Am: [45, 52, 60, 64],
  F: [53, 57, 60, 64],
  G: [55, 59, 62, 64],
  Dm: [50, 57, 60, 65],
  Em: [52, 55, 59, 62],
};
const ROOT: Record<Chord, [number, number]> = { C: [36, 43], Am: [33, 40], F: [41, 36], G: [43, 38], Dm: [38, 45], Em: [40, 47] };
/** Pitch classes the high metallophone layer picks from, per chord (all in C pentatonic). */
const GAM: Record<Chord, number[]> = { C: [0, 4, 7, 9], Am: [9, 0, 4, 7], F: [9, 0, 2, 7], G: [7, 2, 4, 9], Dm: [2, 9, 0, 7], Em: [4, 7, 9, 2] };

/** C major pentatonic pitch classes. */
export const PENTATONIC = [0, 2, 4, 7, 9];

// Phrase 1 (over C Am F G)
const P1: Note[][] = [
  [[79, 1], [76, 0.5], [79, 0.5], [81, 2]],
  [[81, 1], [79, 1], [76, 1], [72, 1]],
  [[74, 1], [76, 1], [79, 1.5], [76, 0.5]],
  [[79, 1], [76, 1], [74, 2]],
];
// Phrase 2 answers it and rises (C Am F G)
const P2: Note[][] = [
  [[76, 1], [79, 1], [84, 2]],
  [[81, 1.5], [79, 0.5], [76, 2]],
  [[79, 1], [81, 1], [79, 1], [76, 1]],
  [[74, 3], [null, 1]],
];
// Phrase 3, the B section (Am F Dm G)
const P3: Note[][] = [
  [[84, 1], [81, 1], [84, 2]],
  [[81, 1], [79, 1], [76, 1], [79, 1]],
  [[81, 1.5], [79, 0.5], [76, 1], [74, 1]],
  [[76, 1], [74, 1], [72, 2]],
];
// Phrase 4, the B section's answer (Am F Em G)
const P4: Note[][] = [
  [[88, 1], [84, 1], [81, 1], [84, 1]],
  [[84, 1.5], [81, 0.5], [79, 2]],
  [[83, 1], [79, 1], [76, 1.5], [79, 0.5]],
  [[81, 1], [79, 1], [74, 2]],
];
// Bridge: sparser, lower, a Malay-ish turn (Dm Am F G)
const BR: Note[][] = [
  [[74, 2], [77, 1], [74, 1]],
  [[76, 3], [null, 1]],
  [[72, 1], [76, 1], [79, 2]],
  [[79, 1.5], [76, 0.5], [74, 2]],
];
// Outro (C Am F G): stops on the dominant
const OUTRO: Note[][] = [
  [[79, 1], [76, 1], [72, 2]],
  [[76, 2], [81, 2]],
  [[79, 1], [76, 1], [74, 2]],
  [[74, 2], [null, 2]],
];

export const MELODY_MERLION = { P1, P2, P3, P4, BR, OUTRO };
const C_P1 = ['C', 'Am', 'F', 'G'] as Chord[];
const C_B1 = ['Am', 'F', 'Dm', 'G'] as Chord[];
const C_B2 = ['Am', 'F', 'Em', 'G'] as Chord[];
const C_BR = ['Dm', 'Am', 'F', 'G'] as Chord[];

/** A small deterministic random generator (mulberry32), so the ornaments are the same on every build. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The nearest pentatonic pitch above (dir 1) or below (dir -1) a midi note. */
function pentStep(midi: number, dir: 1 | -1): number {
  for (let m = midi + dir; ; m += dir) if (PENTATONIC.includes(((m % 12) + 12) % 12)) return m;
}

/**
 * Dress a phrase up: a quick grace note before some of the longer notes, and now and then a longer note
 * broken into a neighbour. The bar lengths stay exactly 4 beats. `octave` lifts the whole line.
 */
function vary(phrase: Note[][], rand: () => number, chance: number, octave = 0): Note[][] {
  return phrase.map((bar) => {
    const out: Note[] = [];
    for (const [midi, beats] of bar) {
      if (midi === null) { out.push([null, beats]); continue; }
      const m = midi + octave;
      if (beats >= 1 && rand() < chance) {
        out.push([pentStep(m, rand() < 0.5 ? 1 : -1), 0.25], [m, beats - 0.25]);
      } else out.push([m, beats]);
    }
    return out;
  });
}

interface Section {
  name: string;
  chords: Chord[];
  lead?: Note[][];
  vel?: number;
  /** how busy the kompang is: 0 none, 1 dum only, 2 the groove */
  drum: 0 | 1 | 2;
  shaker: boolean;
  /** how many notes per bar the interlocking metallophone plays */
  gamelan: 0 | 2 | 4;
  bassNotes: 1 | 2;
}

const SEED = 1965;

export function sectionsMerlion(): Section[] {
  const r = rng(SEED);
  return [
    { name: 'intro', chords: C_P1, drum: 0, shaker: false, gamelan: 2, bassNotes: 1 },
    { name: 'A', chords: [...C_P1, ...C_P1], lead: [...P1, ...P2], vel: 0.85, drum: 1, shaker: true, gamelan: 2, bassNotes: 2 },
    { name: 'B', chords: [...C_B1, ...C_B2], lead: [...P3, ...P4], vel: 0.85, drum: 2, shaker: true, gamelan: 4, bassNotes: 2 },
    { name: 'A2', chords: [...C_P1, ...C_P1], lead: vary([...P1, ...P2], r, 0.45), vel: 0.9, drum: 2, shaker: true, gamelan: 4, bassNotes: 2 },
    { name: 'bridge', chords: [...C_BR, ...C_BR], lead: [...BR, ...vary(BR, r, 0.6)], vel: 0.75, drum: 1, shaker: false, gamelan: 2, bassNotes: 1 },
    { name: 'B2', chords: [...C_B1, ...C_B2], lead: vary([...P3, ...P4], r, 0.4), vel: 0.9, drum: 2, shaker: true, gamelan: 4, bassNotes: 2 },
    { name: 'A3', chords: [...C_P1, ...C_P1], lead: vary([...P1, ...P2], r, 0.5, 12), vel: 0.8, drum: 2, shaker: true, gamelan: 4, bassNotes: 2 },
    { name: 'outro', chords: C_P1, lead: OUTRO, vel: 0.7, drum: 1, shaker: false, gamelan: 2, bassNotes: 1 },
  ];
}

export const SECTIONS_MERLION = sectionsMerlion();

export function buildSongMerlion(): MerlionSong {
  const events: MerlionEvent[] = [];
  const r = rng(SEED + 1);
  let bar = 0;
  for (const s of SECTIONS_MERLION) {
    s.chords.forEach((chord, i) => {
      const start = (bar + i) * BEATS_PER_BAR_MERLION;
      events.push({ kind: 'pad', beat: start, midis: PAD[chord], beats: 4 });
      events.push({ kind: 'bass', beat: start, midi: ROOT[chord][0], beats: 1.8 });
      if (s.bassNotes === 2) events.push({ kind: 'bass', beat: start + 2.5, midi: ROOT[chord][1], beats: 1.2 });
      if (s.drum >= 1) events.push({ kind: 'kompang', beat: start, hit: 'dum', vel: 0.8 });
      if (s.drum === 2) {
        events.push({ kind: 'kompang', beat: start + 1.5, hit: 'tak', vel: 0.5 });
        events.push({ kind: 'kompang', beat: start + 2, hit: 'dum', vel: 0.6 });
        events.push({ kind: 'kompang', beat: start + 3, hit: 'tak', vel: 0.55 });
        if (i % 2 === 1) events.push({ kind: 'kompang', beat: start + 3.5, hit: 'tak', vel: 0.4 });
      }
      if (s.shaker) for (const b of [0.5, 1.5, 2.5, 3.5]) events.push({ kind: 'shaker', beat: start + b, accent: b === 2.5 });
      if (s.gamelan > 0) {
        const slots = s.gamelan === 4 ? [0.5, 1.5, 2.5, 3.5] : [1.5, 3.5];
        let last = -1;
        for (const at of slots) {
          let k = Math.floor(r() * GAM[chord].length);
          if (k === last) k = (k + 1) % GAM[chord].length;
          last = k;
          events.push({ kind: 'gamelan', beat: start + at, midi: 84 + GAM[chord][k] + (r() < 0.25 ? 12 : 0), vel: at % 2 === 0.5 && at !== 0.5 ? 0.6 : 0.8 });
        }
      }
      if (s.lead) {
        let t = start;
        for (const [midi, beats] of s.lead[i]) {
          if (midi !== null) events.push({ kind: 'bell', beat: t, midi, beats, vel: s.vel ?? 1 });
          t += beats;
        }
      }
    });
    bar += s.chords.length;
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, bars: bar, beats: bar * BEATS_PER_BAR_MERLION };
}

// --- the voices ------------------------------------------------------------------------------

export interface MerlionVoiceEnv {
  ctx: BaseAudioContext;
  /** where every voice ends up (music.ts: the master gain) */
  out: AudioNode;
  /** a send into a soft room echo, or null for none */
  room: AudioNode | null;
  secPerBeat: number;
  /** a short white-noise buffer, for the drum slaps and shaker */
  noise: AudioBuffer;
}

const MIN = 0.0001;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Returns a player: `play(event, audioTime)`. */
export function createMerlionVoices({ ctx: a, out, room, secPerBeat, noise }: MerlionVoiceEnv) {
  function toOut(g: AudioNode, roomLevel: number) {
    g.connect(out);
    if (room && roomLevel > 0) {
      const send = a.createGain();
      send.gain.value = roomLevel;
      g.connect(send).connect(room);
    }
  }

  /** A struck metal bar: the fundamental rings, the inharmonic partials die fast. */
  function bar(t: number, midi: number, peak: number, ring: number, partials: readonly (readonly [number, number, number])[], roomLevel: number) {
    const g = a.createGain();
    g.gain.value = 1;
    for (const [ratio, lvl, life] of partials) {
      const o = a.createOscillator(), og = a.createGain();
      const end = t + ring * life;
      o.type = 'sine';
      o.frequency.value = hz(midi) * ratio;
      og.gain.setValueAtTime(MIN, t);
      og.gain.exponentialRampToValueAtTime(peak * lvl, t + 0.005);
      og.gain.exponentialRampToValueAtTime(MIN, end);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(end + 0.02);
    }
    toOut(g, roomLevel);
  }

  const BELL = [[1, 1, 1], [2.4, 0.25, 0.3], [5.2, 0.08, 0.12]] as const;
  const HIGH = [[1, 1, 1], [2.4, 0.15, 0.2]] as const;

  /** A warm bass: triangle plus a quiet octave, through a low-pass. */
  function bass(t: number, midi: number, dur: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.value = 700;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.04, t + Math.min(0.3, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    for (const [type, mult, lvl] of [['triangle', 1, 1], ['sine', 2, 0.25]] as const) {
      const o = a.createOscillator(), og = a.createGain();
      o.type = type;
      o.frequency.value = hz(midi) * mult;
      og.gain.value = lvl;
      o.connect(og).connect(f);
      o.start(t);
      o.stop(t + dur + 0.03);
    }
    f.connect(g);
    toOut(g, 0.04);
  }

  /** A slow pad: soft triangles, a long swell and fade, through a low-pass. */
  function pad(t: number, midis: number[], dur: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.012, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    midis.forEach((m) => {
      const o = a.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(m);
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.03);
    });
    f.connect(g);
    toOut(g, 0.25);
  }

  function noiseHit(t: number, type: BiquadFilterType, freq: number, q: number, peak: number, attack: number, dur: number, roomLevel: number) {
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noise;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    src.connect(f).connect(g);
    toOut(g, roomLevel);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  /** A kompang: a skin thump that drops in pitch (dum) or a dry slap (tak). */
  function kompang(t: number, hit: 'dum' | 'tak', vel: number) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    const dum = hit === 'dum';
    o.frequency.setValueAtTime(dum ? 170 : 320, t);
    o.frequency.exponentialRampToValueAtTime(dum ? 85 : 230, t + (dum ? 0.14 : 0.06));
    const dur = dum ? 0.22 : 0.09;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime((dum ? 0.075 : 0.03) * vel, t + 0.006);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    o.connect(g);
    toOut(g, dum ? 0.1 : 0.2);
    o.start(t);
    o.stop(t + dur + 0.02);
    noiseHit(t, 'bandpass', dum ? 600 : 2200, 1.2, (dum ? 0.012 : 0.03) * vel, 0.004, dum ? 0.05 : 0.05, 0.1);
  }

  return (e: MerlionEvent, t: number) => {
    switch (e.kind) {
      case 'bell': return bar(t, e.midi, 0.05 * e.vel, Math.min(1.6, 0.8 + e.beats * secPerBeat * 0.5), BELL, 0.35);
      case 'gamelan': return bar(t, e.midi, 0.018 * e.vel, 0.7, HIGH, 0.5);
      case 'bass': return bass(t, e.midi, e.beats * secPerBeat);
      case 'pad': return pad(t, e.midis, e.beats * secPerBeat);
      case 'kompang': return kompang(t, e.hit, e.vel);
      case 'shaker': return noiseHit(t, 'bandpass', e.accent ? 5200 : 6400, 0.8, e.accent ? 0.016 : 0.01, 0.02, e.accent ? 0.1 : 0.07, 0);
    }
  };
}
