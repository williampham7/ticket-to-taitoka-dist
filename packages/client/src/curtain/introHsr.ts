import type { SfxEnv } from '../lib/soundHsr';
import { rig } from './cueRig';

const MIN = 0.0001;
const SOFT = 0.006;

/**
 * The China curtain's waiting cue (~3.1 s), played while the platform doors are still closed (HOLD_MS 3.2 s), ending
 * before the opening chime: the hall's air-handling hum and a murmuring crowd, a soft rising PA pre-chime, the train
 * streaking past behind the glass (synced with hsr.css: 0.45-1.65 s and 1.85-2.7 s), and an original guzheng-style
 * phrase in D major pentatonic (plucks that bend into pitch, a closing tremolo) over a low warm pad.
 * All nodes stop by ~3.2 s.
 */
export function playHsrWaiting(env: SfxEnv): void {
  const END = 3.1;
  const r = rig(env, END, 0.5);
  if (!r) return;
  const { a, t0, env3, tone, noise } = r;
  const hall = r.echo([[0.19, 0.35], [0.31, 0.28]], 0.5, 3800);

  // 1) the hall: air handling, a murmuring crowd (short overlapping voice-band blobs), a far-off footstep or two
  noise(0, END, 0.06, 0.5, 0.7, 'lowpass', 260, 0.7);
  noise(0, END, 0.014, 0.6, 0.7, 'bandpass', 3200, 0.6);
  for (let i = 0; i < 26; i++) {
    const s = (i * 0.113 + ((i * 7) % 5) * 0.037) % (END - 0.5);
    const f = 320 + ((i * 131) % 520);
    noise(s, s + 0.28 + (i % 4) * 0.09, 0.016 + (i % 3) * 0.005, 0.06, 0.12, 'bandpass', f, 5, f * (i % 2 ? 1.12 : 0.9));
  }
  [0.35, 0.82, 1.3].forEach((s) => noise(s, s + 0.05, 0.03, 0.003, 0.04, 'bandpass', 1500, 2));

  // 2) a soft rising PA pre-chime, D5 F#5 A5 D6 (bell partials, into the hall echo)
  [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
    const s = 0.08 + i * 0.16;
    tone('sine', f, s, s + 0.9, 0.05, 0.004, 0.85, { to: hall });
    tone('sine', f * 2.01, s, s + 0.45, 0.012, 0.004, 0.4, { to: hall });
  });

  // 3) the train streaking past behind the glass: a rising/falling whoosh, a doppler hum and the rail rumble
  const pass = (s: number, dur: number, peak: number) => {
    const mid = s + dur * 0.45;
    noise(s, mid, peak, dur * 0.4, 0.05, 'bandpass', 380, 0.9, 1900);
    noise(mid, s + dur, peak, 0.05, dur * 0.45, 'bandpass', 1900, 0.9, 420);
    tone('sawtooth', 240, s, s + dur, peak * 0.35, dur * 0.4, dur * 0.4, { bend: 150, lp: 900 });
    noise(s, s + dur, peak * 0.9, dur * 0.35, dur * 0.4, 'lowpass', 140, 0.8);
  };
  pass(0.45, 1.25, 0.1);
  pass(1.85, 0.9, 0.07);

  // 4) a guzheng-style phrase: bright plucks that bend up into pitch, then a tremolo on the tonic
  const zheng = (f: number, s: number, dur: number, peak: number, bendFrom = 0.97) => {
    const g = env3(s, s + dur, peak, 0.004, dur * 0.92, hall);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(5200, t0 + s);
    lp.frequency.exponentialRampToValueAtTime(1300, t0 + s + Math.min(dur, 0.5));
    lp.connect(g);
    const voices: [OscillatorType, number, number][] = [['triangle', 1, 1], ['sine', 2, 0.35], ['sine', 3.01, 0.12]];
    for (const [type, mul, lvl] of voices) {
      const o = a.createOscillator();
      const og = a.createGain();
      og.gain.value = lvl;
      o.type = type;
      o.frequency.setValueAtTime(f * mul * bendFrom, t0 + s);
      o.frequency.exponentialRampToValueAtTime(f * mul, t0 + s + 0.09);
      o.connect(og).connect(lp);
      o.start(t0 + s);
      o.stop(t0 + s + dur + 0.02);
    }
  };
  // A4 D5 E5 F#5, A5 (bent up from G), F#5 E5, then D5 in tremolo
  zheng(440, 0.95, 0.6, 0.05);
  zheng(587.33, 1.12, 0.6, 0.055);
  zheng(659.25, 1.28, 0.55, 0.05);
  zheng(739.99, 1.44, 0.7, 0.055);
  zheng(880, 1.7, 0.8, 0.06, 0.89);
  zheng(739.99, 2.02, 0.5, 0.045);
  zheng(659.25, 2.16, 0.5, 0.045);
  for (let s = 2.36, i = 0; s < 2.92; s += 0.055, i++) zheng(587.33, s, 0.22, 0.03 + 0.012 * Math.sin(i * 0.9), 0.995);
  // a low warm pad under the phrase: D3 A3 D4
  [146.83, 220, 293.66].forEach((f, i) => tone('triangle', f, 0.9, END, 0.026 - i * 0.006, 0.6, 0.6, { lp: 900, vib: 1.2 }));
}

/**
 * The China curtain's opening cue (~5.8 s, Web Audio only), synced to hsr.css's opening beats:
 * 0.0 s station chime (lamps turn green) · 1.15 s pressure pop · 1.2 s pneumatic door hiss as the doors slide ·
 * 1.6 s traction whine rising + 2.0 s whoosh (the push through the doorway) · 2.95 s bell resolve over a
 * shimmering pad as the light dissolves into the board.
 */
export function playHsrIntro(env: SfxEnv): void {
  const a = env.audio();
  if (!a) return;
  const vol = env.volume();
  if (vol <= 0) return;
  const T = a.currentTime + 0.02;
  const END = 5.9;

  const master = a.createGain();
  master.gain.setValueAtTime(MIN, T);
  master.gain.exponentialRampToValueAtTime(0.35 * vol, T + 0.02);
  master.gain.setValueAtTime(0.35 * vol, T + END - 0.4);
  master.gain.exponentialRampToValueAtTime(MIN, T + END);
  master.connect(a.destination);

  const noise = a.createBuffer(1, Math.ceil(a.sampleRate * 2), a.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  /** gain envelope: soft attack to `peak`, hold, exponential release */
  function env3(g: GainNode, t0: number, attack: number, peak: number, holdUntil: number, end: number) {
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(MIN, peak), t0 + Math.max(SOFT, attack));
    if (holdUntil > t0 + attack) g.gain.setValueAtTime(Math.max(MIN, peak), holdUntil);
    g.gain.exponentialRampToValueAtTime(MIN, end);
  }

  function osc(type: OscillatorType, f0: number, start: number, dur: number, peak: number, attack: number, f1?: number, out: AudioNode = master) {
    const t0 = T + start;
    const o = a!.createOscillator();
    const g = a!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    env3(g, t0, attack, peak, t0 + attack, t0 + dur);
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }

  function bell(f: number, start: number, peak: number, decay: number) {
    for (const [r, l, life] of [[1, 1, 1], [2.01, 0.22, 0.55], [2.76, 0.1, 0.3]] as const) osc('sine', f * r, start, decay * life, peak * l, SOFT);
  }

  /** filtered noise band with a frequency sweep */
  function hiss(type: BiquadFilterType, start: number, dur: number, peak: number, attack: number, release: number, f0: number, f1: number, q: number) {
    const t0 = T + start;
    const src = a!.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = a!.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = a!.createGain();
    env3(g, t0, attack, peak, t0 + dur - release, t0 + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  // 1. station chime, ding-dong (lamp turns green)
  bell(988, 0.08, 0.32, 1.2);
  bell(784, 0.44, 0.3, 1.6);

  // 2. pressure pop: a low thump with a short air burst
  osc('sine', 130, 1.15, 0.22, 0.45, 0.008, 55);
  hiss('bandpass', 1.14, 0.14, 0.22, 0.008, 0.1, 1800, 900, 1.2);

  // 3. pneumatic door hiss as the doors slide (bright, then settling)
  hiss('highpass', 1.22, 1.7, 0.2, 0.06, 1.2, 6500, 2600, 0.7);

  // 4. speed rush: traction whine rising, plus a whoosh that swells and passes
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.8;
  lp.frequency.setValueAtTime(500, T + 1.6);
  lp.frequency.exponentialRampToValueAtTime(3600, T + 4.0);
  const wg = a.createGain();
  env3(wg, T + 1.6, 0.9, 1, T + 3.5, T + 4.4);
  lp.connect(wg).connect(master);
  osc('sawtooth', 160, 1.6, 2.8, 0.12, 0.3, 1150, lp);
  osc('sine', 321, 1.6, 2.8, 0.1, 0.3, 2300, lp);
  hiss('bandpass', 2.0, 2.1, 0.42, 1.0, 1.0, 350, 3200, 0.9);

  // 5. resolve: a bright bell arpeggio over a soft shimmering pad
  [1047, 1319, 1568, 2093].forEach((f, i) => bell(f, 2.95 + i * 0.09, 0.14, 1.8));
  for (const [f, det] of [[523.25, 0], [659.25, 4], [783.99, -4], [1046.5, 6]] as const) {
    const o = a.createOscillator();
    const g = a.createGain();
    const t0 = T + 2.95;
    o.type = 'triangle';
    o.frequency.value = f;
    o.detune.value = det;
    env3(g, t0, 0.45, 0.06, T + 4.6, T + END - 0.05);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(T + END);
  }
}
