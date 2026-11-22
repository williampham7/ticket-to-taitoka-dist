import type { SfxEnv } from '../lib/soundHsr';
import { rig } from './cueRig';

/**
 * The 'rail' (Europe) waiting cue (~3.1 s), played while the carriage doors are still closed (HOLD_MS 3.2 s), ending
 * before the brass catch: a covered platform's murmur under the glass roof, an engine somewhere down the train
 * breathing steam, a far-off two-tone whistle, and an original accordion waltz phrase in A minor (bellows tremolo,
 * oom-pah-pah bass) that drifts in as if from the dining car. All nodes stop by ~3.2 s.
 */
export function playRailWaiting(env: SfxEnv): void {
  const END = 3.1;
  const r = rig(env, END, 0.62);
  if (!r) return;
  const { a, t0, env3, tone, noise } = r;
  const roof = r.echo([[0.17, 0.32], [0.29, 0.26]], 0.45, 3000);

  // 1) the platform: a low hall rumble and murmuring voices under the glass roof
  noise(0, END, 0.05, 0.5, 0.7, 'lowpass', 220, 0.7);
  for (let i = 0; i < 22; i++) {
    const s = (i * 0.131 + ((i * 5) % 7) * 0.029) % (END - 0.5);
    const f = 300 + ((i * 157) % 480);
    noise(s, s + 0.3 + (i % 3) * 0.1, 0.014 + (i % 3) * 0.004, 0.07, 0.14, 'bandpass', f, 5, f * (i % 2 ? 1.1 : 0.92), roof);
  }

  // 2) the engine breathing: slow steam exhalations, each a hiss that swells and sighs away
  [0.1, 1.05, 2.0].forEach((s, i) => {
    noise(s, s + 0.8, 0.05 - i * 0.006, 0.2, 0.5, 'highpass', 1800, 0.7);
    noise(s, s + 0.7, 0.03, 0.15, 0.45, 'bandpass', 700, 0.8, 420);
  });

  // 3) a far-off two-tone whistle, soft and echoing (a fourth, slightly sour, as old whistles are)
  for (const [f, s, e] of [[587.33, 0.45, 0.95], [440, 1.0, 1.55]] as const) {
    tone('sawtooth', f, s, e, 0.008, 0.08, 0.2, { lp: 1600, vib: 3, to: roof });
    tone('sine', f * 2.02, s, e, 0.004, 0.08, 0.2, { to: roof });
  }

  // 4) an accordion waltz phrase: detuned reed pairs through a bellows tremolo, with oom-pah-pah underneath
  const bus = a.createGain();
  const trem = a.createOscillator();
  const depth = a.createGain();
  trem.frequency.value = 6.2;
  depth.gain.value = 0.18;
  trem.connect(depth).connect(bus.gain);
  const warm = a.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 2000;
  bus.connect(warm).connect(roof);
  trem.start(t0 + 0.9);
  trem.stop(t0 + END + 0.05);
  const reed = (f: number, s: number, dur: number, peak: number) => {
    const g = env3(s, s + dur, peak, 0.04, dur * 0.5, bus);
    for (const cents of [-7, 7]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(g);
      o.start(t0 + s);
      o.stop(t0 + s + dur + 0.02);
    }
  };
  const beat = 0.26; // waltz: one bar = 3 beats
  const bar0 = 0.95;
  // melody: E5 . A5 | G5 F5 E5 | D5 . E5 | C5 (held, ringing out)
  const melody: [number, number, number][] = [
    [659.25, 0, 2], [880, 2, 1],
    [783.99, 3, 1], [698.46, 4, 1], [659.25, 5, 1],
    [587.33, 6, 2], [659.25, 8, 1],
    [523.25, 9, 2.4],
  ];
  for (const [f, b, len] of melody) reed(f, bar0 + b * beat, len * beat * 0.95, 0.03);
  // oom-pah-pah: bass on 1, chord on 2 and 3 (Am | Dm | E7 | Am)
  const bars: [number, number[]][] = [[110, [220, 261.63, 329.63]], [146.83, [220, 293.66, 349.23]], [164.81, [207.65, 246.94, 293.66]], [110, [220, 261.63, 329.63]]];
  bars.forEach(([bass, chord], i) => {
    const s = bar0 + i * 3 * beat;
    if (s > END - 0.3) return;
    tone('triangle', bass, s, s + beat * 0.9, 0.07, 0.006, beat * 0.7, { to: roof });
    for (const k of [1, 2]) for (const f of chord) reed(f, s + k * beat, beat * 0.6, 0.009);
  });
}

/**
 * The 'rail' (Europe) curtain cue, synced to the opening in rail.css (seconds from the opening's start):
 * 0.05 brass catch clunk + 0.4 settle click, 0.6 / 1.0 two-note platform bell, 1.4 steam release as the doors
 * swing (with a low door rumble), 2.0 a warm accordion-like café chord swell that resolves to C major by ~3.5
 * and fades out by ~5.8. Web Audio only; every envelope ramps for at least 6 ms; every source is stopped.
 */
const MIN = 0.0001;
const SOFT = 0.006;

export function playRailIntro(env: SfxEnv): void {
  const a = env.audio();
  if (!a) return;
  const vol = env.volume();
  if (vol <= 0) return;
  const now = a.currentTime + 0.02;
  const END = 6;

  const master = a.createGain();
  master.gain.setValueAtTime(MIN, now);
  master.gain.exponentialRampToValueAtTime(0.35 * vol, now + 0.02);
  master.gain.setValueAtTime(0.35 * vol, now + END - 0.4);
  master.gain.exponentialRampToValueAtTime(MIN, now + END);
  master.connect(a.destination);

  /** Envelope: MIN -> peak in `att`, hold until `hold`, exponential release to MIN at `end` (all seconds from t). */
  const env3 = (g: GainNode, t: number, peak: number, att: number, hold: number, end: number) => {
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(Math.max(MIN, peak), t + Math.max(SOFT, att));
    if (hold > att) g.gain.setValueAtTime(Math.max(MIN, peak), t + hold);
    g.gain.exponentialRampToValueAtTime(MIN, t + Math.max(end, hold + SOFT));
  };

  const tone = (freq: number, start: number, dur: number, peak: number, type: OscillatorType = 'sine', glideTo?: number, out: AudioNode = master) => {
    const t = now + start;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    env3(g, t, peak, Math.min(0.01, dur / 3), 0, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.03);
  };

  const noiseBuf = (secs: number) => {
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * secs), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };
  const shortNoise = noiseBuf(0.4);
  const noise = (start: number, dur: number, peak: number, type: BiquadFilterType, freq: number, q = 1) => {
    const t = now + start;
    const s = a.createBufferSource();
    s.buffer = shortNoise;
    s.loop = true;
    const f = a.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = a.createGain();
    env3(g, t, peak, SOFT, 0, dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.03);
  };

  // 1) brass catch: a heavy thunk, a metallic tick, then the settle
  tone(150, 0.05, 0.22, 0.55, 'sine', 55);
  noise(0.05, 0.05, 0.35, 'bandpass', 2600, 3);
  tone(1870, 0.06, 0.18, 0.08, 'triangle');
  noise(0.4, 0.04, 0.18, 'bandpass', 3400, 4);
  tone(2320, 0.4, 0.12, 0.05, 'triangle');

  // 2) two-note platform handbell: inharmonic partials, long ring
  const bell = (f: number, start: number, peak: number) => {
    tone(f, start, 1.8, peak);
    tone(f * 2.76, start, 0.9, peak * 0.35);
    tone(f * 5.4, start, 0.4, peak * 0.15);
    tone(f * 0.5, start, 1.2, peak * 0.2);
  };
  bell(784, 0.6, 0.22);
  bell(659.25, 1.0, 0.2);

  // 3) steam release as the doors swing: a long noise hiss whose filter falls as it eases off, plus a door rumble
  {
    const t = now + 1.35;
    const dur = 3.1;
    const s = a.createBufferSource();
    s.buffer = noiseBuf(2);
    s.loop = true;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(9000, t);
    lp.frequency.exponentialRampToValueAtTime(2200, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(MIN, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.9);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    s.connect(hp).connect(lp).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.03);
  }
  tone(62, 1.4, 1.6, 0.3, 'sine', 48);
  tone(93, 1.45, 1.2, 0.08, 'triangle', 70);

  // 4) café chord swell: detuned saw pairs, low-passed, with a bellows tremolo
  const bus = a.createGain();
  bus.gain.value = 1;
  const trem = a.createOscillator();
  const depth = a.createGain();
  trem.frequency.value = 5.8;
  depth.gain.value = 0.14;
  trem.connect(depth).connect(bus.gain);
  const warm = a.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.setValueAtTime(900, now + 2);
  warm.frequency.exponentialRampToValueAtTime(2400, now + 3.6);
  warm.frequency.exponentialRampToValueAtTime(1200, now + END);
  bus.connect(warm).connect(master);
  trem.start(now + 1.9);
  trem.stop(now + END + 0.05);

  const reed = (f: number, start: number, dur: number, peak: number, att: number) => {
    const t = now + start;
    const g = a.createGain();
    env3(g, t, peak, att, dur * 0.55, dur);
    g.connect(bus);
    for (const cents of [-6, 6]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.03);
    }
  };
  // Fmaj7 -> G7 (passing) -> C major, the top line E5 D5 C5 resolving
  for (const f of [174.61, 220, 261.63, 329.63]) reed(f, 2.0, 1.5, 0.045, 0.35);
  for (const f of [196, 246.94, 293.66, 349.23]) reed(f, 2.8, 0.9, 0.04, 0.12);
  for (const f of [130.81, 196, 261.63, 329.63, 392]) reed(f, 3.45, 2.35, 0.05, 0.2);
  reed(659.25, 2.2, 0.65, 0.05, 0.08);
  reed(587.33, 2.8, 0.7, 0.05, 0.06);
  reed(523.25, 3.45, 2.3, 0.06, 0.08);
  // a soft bass pluck under each chord and a final glint on the high bell
  tone(87.31, 2.0, 1.2, 0.18, 'triangle');
  tone(98, 2.8, 0.8, 0.16, 'triangle');
  tone(65.41, 3.45, 2.2, 0.2, 'triangle');
  tone(1046.5, 3.5, 1.6, 0.05);
}
