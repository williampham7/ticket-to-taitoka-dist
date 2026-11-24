/**
 * "Deep Contact": an original, tense, low-key loop for Fleet. A minor, 4/4 at 88 BPM.
 * A sonar ping, a heartbeat kick, a low eighth-note pulse, a dark pad, a cello line and a plucked arpeggio.
 * Intro, A, B (cello theme), bridge (half time), A' (arpeggio up an octave): 32 bars, about 87 s before it loops.
 * Small hat and kick variations come from a fixed-seed random generator.
 *
 * The data part is pure and deterministic. `createFleetVoices` turns the events into Web Audio voices
 * for any BaseAudioContext, so music.ts plays them live and a test can render them offline.
 */
export const BPM_FLEET = 88;
export const BEATS_PER_BAR_FLEET = 4;
/** Master level in music.ts, levelled by the offline render in songFleet.test.ts (rms about 0.027, like the other tunes). */
export const VOLUME_FLEET = 0.6;

export type FleetEvent =
  | { kind: 'pulse'; beat: number; midi: number; vel: number }
  | { kind: 'pad'; beat: number; midis: number[]; beats: number }
  | { kind: 'cello'; beat: number; midi: number; beats: number; vel: number }
  | { kind: 'pluck'; beat: number; midi: number; vel: number }
  | { kind: 'ping'; beat: number }
  | { kind: 'kick'; beat: number; vel: number }
  | { kind: 'rim'; beat: number; vel: number }
  | { kind: 'hat'; beat: number; accent: boolean };

export interface FleetSong { events: FleetEvent[]; bars: number; beats: number }

type Chord = 'Am' | 'F' | 'Dm' | 'E' | 'C' | 'G';
const ROOT: Record<Chord, number> = { Am: 45, F: 41, Dm: 38, E: 40, C: 48, G: 43 };
const PAD: Record<Chord, number[]> = {
  Am: [57, 60, 64], F: [53, 57, 60], Dm: [50, 53, 57], E: [52, 56, 59], C: [55, 60, 64], G: [55, 59, 62],
};
const PROG: Chord[] = ['Am', 'F', 'Dm', 'E', 'Am', 'F', 'G', 'E'];
/** Arpeggio steps (eighths) as offsets into the pad chord plus an octave. */
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
/** The cello theme, one bar per entry, over PROG. */
const THEME: [number, number][][] = [
  [[57, 3], [60, 1]],
  [[64, 2], [62, 1], [60, 1]],
  [[62, 3], [57, 1]],
  [[56, 4]],
  [[57, 2], [60, 1], [64, 1]],
  [[65, 3], [64, 1]],
  [[62, 2], [59, 2]],
  [[56, 2], [59, 2]],
];

export const SECTIONS_FLEET = [
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

export function buildSongFleet(): FleetSong {
  const ev: FleetEvent[] = [];
  const rand = rng(1805);
  let bar = 0;
  for (const { name, bars } of SECTIONS_FLEET) {
    for (let i = 0; i < bars; i++, bar++) {
      const b = bar * 4;
      const chord: Chord = name === 'intro' ? (['Am', 'Am', 'F', 'E'] as Chord[])[i] : name === 'bridge' ? (['Dm', 'C', 'F', 'E'] as Chord[])[i] : PROG[i];
      const root = ROOT[chord];
      ev.push({ kind: 'pad', beat: b, midis: PAD[chord], beats: 4 });
      // the sonar: every bar in the intro and bridge, every other bar elsewhere
      if (name === 'intro' || name === 'bridge' || i % 2 === 0) ev.push({ kind: 'ping', beat: b });
      // the low pulse on eighths (quarters in the half-time bridge)
      const step = name === 'bridge' ? 1 : 0.5;
      for (let k = 0; k < 4 / step; k++) ev.push({ kind: 'pulse', beat: b + k * step, midi: root - 12, vel: k % (2 / step) === 0 ? 1 : 0.65 });
      // heartbeat kick: lub-dub on 1, and on 3 outside the intro and bridge
      ev.push({ kind: 'kick', beat: b, vel: 1 }, { kind: 'kick', beat: b + 0.5, vel: 0.6 });
      if (name !== 'intro' && name !== 'bridge') {
        ev.push({ kind: 'kick', beat: b + 2, vel: 0.85 });
        if (rand() < 0.35) ev.push({ kind: 'kick', beat: b + 2.5, vel: 0.5 });
        ev.push({ kind: 'rim', beat: b + 3, vel: 0.8 });
      }
      for (let k = 0; k < 8; k++) if (name !== 'intro' || k % 2 === 1) ev.push({ kind: 'hat', beat: b + k / 2, accent: k % 2 === 1 && rand() < 0.6 });
      if (name === 'A' || name === 'A2') {
        const lift = name === 'A2' ? 12 : 0;
        ARP.forEach((n, k) => ev.push({ kind: 'pluck', beat: b + k / 2, midi: PAD[chord][n] + 12 + lift, vel: k % 4 === 0 ? 1 : 0.7 }));
      }
      if (name === 'B' || name === 'A2') {
        let at = b;
        for (const [midi, beats] of THEME[i]) {
          ev.push({ kind: 'cello', beat: at, midi: midi - 12, beats, vel: name === 'A2' ? 0.7 : 1 });
          at += beats;
        }
      }
    }
  }
  ev.sort((x, y) => x.beat - y.beat);
  return { events: ev, bars: bar, beats: bar * 4 };
}

export interface FleetVoiceEnv {
  ctx: BaseAudioContext;
  out: AudioNode;
  /** a send into an echo, or null for none */
  room: AudioNode | null;
  secPerBeat: number;
  noise: AudioBuffer;
}

const MIN = 0.0001;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function createFleetVoices({ ctx: a, out, room, secPerBeat, noise }: FleetVoiceEnv) {
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

  /** a filtered saw pulse in the bass */
  function pulse(t: number, midi: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(520, t);
    f.frequency.exponentialRampToValueAtTime(160, t + 0.2);
    env(g, t, 0.11 * vel, 0.006, 0.24);
    osc('sawtooth', hz(midi), f, t, t + 0.26);
    osc('sine', hz(midi), f, t, t + 0.26);
    f.connect(g);
    g.connect(out);
  }
  function pad(t: number, midis: number[], dur: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.8);
    g.gain.setValueAtTime(0.02, t + dur - 0.3);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur + 0.6);
    for (const m of midis) { osc('triangle', hz(m), f, t, t + dur + 0.7, -7); osc('sawtooth', hz(m), f, t, t + dur + 0.7, 7); }
    f.connect(g);
    toOut(g, 0.35);
  }
  /** a bowed cello: slow attack, two detuned saws, a gentle low-pass */
  function cello(t: number, midi: number, dur: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain(), len = Math.max(0.3, dur - 0.05);
    f.type = 'lowpass';
    f.frequency.value = 1100;
    f.Q.value = 1.2;
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.06 * vel, t + 0.18);
    g.gain.setValueAtTime(0.05 * vel, t + len * 0.85);
    g.gain.exponentialRampToValueAtTime(MIN, t + len + 0.2);
    for (const d of [-6, 6]) osc('sawtooth', hz(midi), f, t, t + len + 0.25, d);
    f.connect(g);
    toOut(g, 0.4);
  }
  function pluck(t: number, midi: number, vel: number) {
    const f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.25);
    env(g, t, 0.035 * vel, 0.004, 0.32);
    osc('triangle', hz(midi), f, t, t + 0.35);
    f.connect(g);
    toOut(g, 0.5);
  }
  /** a sonar ping: a pure tone with a long ring, sent deep into the echo */
  function ping(t: number) {
    const g = a.createGain();
    env(g, t, 0.05, 0.005, 1.6);
    osc('sine', 1568, g, t, t + 1.7);
    toOut(g, 0.8);
  }
  function kick(t: number, vel: number) {
    const g = a.createGain(), o = a.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    env(g, t, 0.3 * vel, 0.004, 0.34);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + 0.36);
  }
  const rim = (t: number, vel: number) => noiseHit(t, 'bandpass', 2600, 4, 0.08 * vel, 0.06, 0.3);
  const hat = (t: number, accent: boolean) => noiseHit(t, 'highpass', 7500, 0.7, accent ? 0.028 : 0.014, 0.035);

  return (e: FleetEvent, t: number) => {
    switch (e.kind) {
      case 'pulse': return pulse(t, e.midi, e.vel);
      case 'pad': return pad(t, e.midis, e.beats * secPerBeat);
      case 'cello': return cello(t, e.midi, e.beats * secPerBeat, e.vel);
      case 'pluck': return pluck(t, e.midi, e.vel);
      case 'ping': return ping(t);
      case 'kick': return kick(t, e.vel);
      case 'rim': return rim(t, e.vel);
      case 'hat': return hat(t, e.accent);
    }
  };
}
