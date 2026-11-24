/**
 * "Sand and Lamplight": an original, driving loop for Egyptian War, in the Hijaz mode on D (D Eb F# G A Bb C),
 * 4/4 at 104 BPM. A frame drum plays the maqsum rhythm (doum, tek), a tambourine shimmers on the off-beats,
 * a drone holds D and A, a plucked lute carries the tune and a reed flute answers it.
 * Intro, A (lute), B (flute), bridge (drums), A' (lute and flute together): 32 bars, about 74 s before it loops.
 *
 * The data part is pure and deterministic; `createEgyptianVoices` turns events into Web Audio voices for any
 * BaseAudioContext, so music.ts plays them live and songEgyptian.test.ts renders them offline to level them.
 */
export const BPM_EGYPTIAN = 104;
export const BEATS_PER_BAR_EGYPTIAN = 4;
/** Master level in music.ts, levelled by the offline render in songEgyptian.test.ts. */
export const VOLUME_EGYPTIAN = 0.53;

export type EgyptianEvent =
  | { kind: 'drone'; beat: number; midis: number[]; beats: number }
  | { kind: 'doum'; beat: number; vel: number }
  | { kind: 'tek'; beat: number; vel: number }
  | { kind: 'riq'; beat: number; vel: number }
  | { kind: 'oud'; beat: number; midi: number; vel: number }
  | { kind: 'ney'; beat: number; midi: number; beats: number; vel: number };

export interface EgyptianSong { events: EgyptianEvent[]; bars: number; beats: number }

export const SECTIONS_EGYPTIAN = [
  { name: 'intro', bars: 4 },
  { name: 'A', bars: 8 },
  { name: 'B', bars: 8 },
  { name: 'bridge', bars: 4 },
  { name: 'A2', bars: 8 },
] as const;

/** The lute tune, one bar per entry: [midi, beats] (0 = rest). Hijaz on D: 62 63 66 67 69 70 72 74. */
const TUNE: [number, number][][] = [
  [[62, 1], [63, 0.5], [66, 0.5], [67, 1], [69, 1]],
  [[70, 0.5], [69, 0.5], [67, 0.5], [66, 0.5], [67, 1], [66, 0.5], [63, 0.5]],
  [[62, 1.5], [63, 0.5], [66, 1], [63, 0.5], [62, 0.5]],
  [[60, 1], [62, 1], [63, 0.5], [62, 0.5], [62, 1]],
  [[69, 1], [70, 0.5], [72, 0.5], [74, 1], [72, 0.5], [70, 0.5]],
  [[69, 1], [67, 0.5], [66, 0.5], [67, 1], [69, 1]],
  [[70, 0.5], [69, 0.5], [67, 0.5], [66, 0.5], [63, 1], [66, 1]],
  [[62, 3], [0, 1]],
];
/** The flute answer, long notes. */
const FLUTE: [number, number][][] = [
  [[74, 2], [72, 1], [70, 1]],
  [[69, 4]],
  [[70, 2], [69, 1], [67, 1]],
  [[66, 3], [63, 1]],
  [[62, 2], [63, 1], [66, 1]],
  [[67, 2], [69, 2]],
  [[70, 1], [69, 1], [67, 1], [66, 1]],
  [[62, 4]],
];
/** Lute arpeggio under the flute: chord tones of D Hijaz. */
const ARP = [50, 57, 62, 66, 69, 66, 62, 57];

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSongEgyptian(): EgyptianSong {
  const ev: EgyptianEvent[] = [];
  const rand = rng(52);
  let bar = 0;
  for (const { name, bars } of SECTIONS_EGYPTIAN) {
    for (let i = 0; i < bars; i++, bar++) {
      const b = bar * 4;
      ev.push({ kind: 'drone', beat: b, midis: i % 4 === 3 && name !== 'intro' ? [36, 43, 48] : [38, 45, 50], beats: 4 });
      // maqsum: DOUM tek . tek DOUM . tek .
      ev.push({ kind: 'doum', beat: b, vel: 1 }, { kind: 'doum', beat: b + 2, vel: 0.85 });
      if (name !== 'intro') {
        ev.push({ kind: 'tek', beat: b + 0.5, vel: 0.9 }, { kind: 'tek', beat: b + 1.5, vel: 0.75 }, { kind: 'tek', beat: b + 3, vel: 0.9 });
        if (rand() < 0.45) ev.push({ kind: 'tek', beat: b + 3.5, vel: 0.55 });
      }
      if (name === 'bridge') {
        for (let k = 0; k < 8; k++) if (k % 2) ev.push({ kind: 'tek', beat: b + k / 2 + 0.25, vel: 0.5 + rand() * 0.3 });
        if (i === 3) ev.push({ kind: 'doum', beat: b + 3, vel: 0.9 }, { kind: 'doum', beat: b + 3.5, vel: 1 });
      }
      for (let k = 0; k < 8; k++) if (k % 2 === 1 || name === 'bridge') ev.push({ kind: 'riq', beat: b + k / 2, vel: k % 4 === 3 ? 1 : 0.6 });
      if (name === 'A' || name === 'A2') {
        let at = b;
        for (const [midi, beats] of TUNE[i]) {
          if (midi) ev.push({ kind: 'oud', beat: at, midi, vel: at === b ? 1 : 0.8 });
          // a quick tremolo repeat on long notes, as a lute player would
          if (midi && beats >= 1.5) ev.push({ kind: 'oud', beat: at + 0.5, midi, vel: 0.55 });
          at += beats;
        }
      }
      if (name === 'B') ARP.forEach((m, k) => ev.push({ kind: 'oud', beat: b + k / 2, midi: m + 12, vel: k % 4 === 0 ? 0.8 : 0.55 }));
      if (name === 'B' || name === 'A2') {
        let at = b;
        for (const [midi, beats] of FLUTE[i]) {
          ev.push({ kind: 'ney', beat: at, midi: name === 'A2' ? midi + 12 : midi, beats, vel: name === 'A2' ? 0.6 : 1 });
          at += beats;
        }
      }
    }
  }
  ev.sort((x, y) => x.beat - y.beat);
  return { events: ev, bars: bar, beats: bar * 4 };
}

export interface EgyptianVoiceEnv {
  ctx: BaseAudioContext;
  out: AudioNode;
  /** a send into an echo, or null for none */
  room: AudioNode | null;
  secPerBeat: number;
  noise: AudioBuffer;
}

const MIN = 0.0001;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function createEgyptianVoices({ ctx: a, out, room, secPerBeat, noise }: EgyptianVoiceEnv) {
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
    env(g, t, peak, 0.002, dur);
    src.connect(f).connect(g);
    toOut(g, send);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  function drone(t: number, midis: number[], dur: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.value = 650;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + 0.4);
    g.gain.setValueAtTime(0.018, t + dur - 0.2);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur + 0.4);
    for (const m of midis) { osc('sawtooth', hz(m), f, t, t + dur + 0.5, -5); osc('triangle', hz(m), f, t, t + dur + 0.5, 5); }
    f.connect(g);
    toOut(g, 0.2);
  }
  /** the frame drum's deep centre stroke */
  function doum(t: number, vel: number) {
    const g = a.createGain(), o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.3);
    env(g, t, 0.32 * vel, 0.004, 0.42);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.45);
    noiseHit(t, 'lowpass', 400, 0.8, 0.06 * vel, 0.08);
  }
  /** the rim stroke */
  const tek = (t: number, vel: number) => noiseHit(t, 'bandpass', 3200, 2.5, 0.09 * vel, 0.07, 0.2);
  /** tambourine jingles */
  const riq = (t: number, vel: number) => noiseHit(t, 'highpass', 8200, 0.6, 0.02 * vel, 0.09);
  /** a plucked lute: bright attack through a band-pass, fast decay */
  function oud(t: number, midi: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(hz(midi) * 3, t);
    f.frequency.exponentialRampToValueAtTime(hz(midi) * 1.4, t + 0.25);
    f.Q.value = 1.4;
    env(g, t, 0.09 * vel, 0.003, 0.4);
    osc('sawtooth', hz(midi), f, t, t + 0.42);
    osc('square', hz(midi) * 1.002, f, t, t + 0.42);
    f.connect(g);
    toOut(g, 0.3);
  }
  /** a breathy reed flute with a slow vibrato */
  function ney(t: number, midi: number, dur: number, vel: number) {
    const g = a.createGain(), len = Math.max(0.3, dur - 0.05), o = a.createOscillator(), f = hz(midi);
    o.type = 'sine';
    // a slow vibrato (5 Hz), drawn as frequency ramps, that starts after the note speaks
    o.frequency.setValueAtTime(f, t);
    for (let k = 1, at = t + 0.25; at < t + len; k++, at += 0.1) o.frequency.linearRampToValueAtTime(f * (k % 2 ? 1.008 : 0.992), at);
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.07 * vel, t + 0.12);
    g.gain.setValueAtTime(0.06 * vel, t + len * 0.85);
    g.gain.exponentialRampToValueAtTime(MIN, t + len + 0.15);
    o.connect(g);
    osc('triangle', f * 2, g, t, t + len + 0.2, 3);
    toOut(g, 0.5);
    o.start(t);
    o.stop(t + len + 0.2);
    noiseHit(t, 'bandpass', f * 2, 6, 0.012 * vel, Math.min(len, 0.5));
  }

  return (e: EgyptianEvent, t: number) => {
    switch (e.kind) {
      case 'drone': return drone(t, e.midis, e.beats * secPerBeat);
      case 'doum': return doum(t, e.vel);
      case 'tek': return tek(t, e.vel);
      case 'riq': return riq(t, e.vel);
      case 'oud': return oud(t, e.midi, e.vel);
      case 'ney': return ney(t, e.midi, e.beats * secPerBeat, e.vel);
    }
  };
}
