import type { SfxEnv } from '../lib/soundHsr';

/** Shared Web Audio building blocks for the enter-the-game cues (introVintage.ts, introHsr.ts). */

const MIN = 0.0001;
const SOFT = 0.008;

type ToneOpts = { bend?: number; lp?: number; lpTo?: number; vib?: number; to?: AudioNode };

/** A master bus (fade in, hold, fade out by `end`) and the voices the curtain cues are built from. */
export function rig(env: SfxEnv, end: number, level: number) {
  const a = env.audio();
  if (!a) return null;
  const vol = env.volume();
  if (vol <= 0) return null;
  const t0 = a.currentTime + 0.03;

  const master = a.createGain();
  master.gain.setValueAtTime(MIN, t0);
  master.gain.exponentialRampToValueAtTime(level * vol, t0 + 0.05);
  master.gain.setValueAtTime(level * vol, t0 + end - 0.6);
  master.gain.exponentialRampToValueAtTime(MIN, t0 + end);
  master.connect(a.destination);

  const noiseBuf = a.createBuffer(1, Math.ceil(a.sampleRate), a.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  /** gain node with an attack / hold / release envelope over [s, e] (seconds after t0), into `to` (default master) */
  const env3 = (s: number, e: number, peak: number, att: number, rel: number, to: AudioNode = master) => {
    const g = a.createGain();
    const at = Math.max(SOFT, att), rl = Math.max(SOFT, rel);
    g.gain.setValueAtTime(MIN, t0 + s);
    g.gain.exponentialRampToValueAtTime(Math.max(MIN, peak), t0 + s + at);
    g.gain.setValueAtTime(Math.max(MIN, peak), t0 + Math.max(s + at, e - rl));
    g.gain.exponentialRampToValueAtTime(MIN, t0 + e);
    g.connect(to);
    return g;
  };

  const tone = (type: OscillatorType, f: number, s: number, e: number, peak: number, att: number, rel: number, opts: ToneOpts = {}) => {
    const g = env3(s, e, peak, att, rel, opts.to);
    const o = a.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0 + s);
    if (opts.bend) o.frequency.exponentialRampToValueAtTime(opts.bend, t0 + e);
    let out: AudioNode = g;
    if (opts.lp) {
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(opts.lp, t0 + s);
      if (opts.lpTo) lp.frequency.exponentialRampToValueAtTime(opts.lpTo, t0 + s + Math.max(SOFT, (e - s) * 0.4));
      lp.connect(g);
      out = lp;
    }
    o.connect(out);
    if (opts.vib) {
      const lfo = a.createOscillator();
      const lg = a.createGain();
      lfo.frequency.value = 5.2;
      lg.gain.value = opts.vib;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t0 + s);
      lfo.stop(t0 + e + 0.02);
    }
    o.start(t0 + s);
    o.stop(t0 + e + 0.02);
  };

  const noise = (s: number, e: number, peak: number, att: number, rel: number, type: BiquadFilterType, f: number, q = 1, fTo?: number, to?: AudioNode) => {
    const g = env3(s, e, peak, att, rel, to);
    const src = a.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bf = a.createBiquadFilter();
    bf.type = type;
    bf.frequency.setValueAtTime(f, t0 + s);
    if (fTo) bf.frequency.exponentialRampToValueAtTime(fTo, t0 + e);
    bf.Q.value = q;
    src.connect(bf).connect(g);
    src.start(t0 + s, Math.random() * 0.5);
    src.stop(t0 + e + 0.02);
  };

  /** a spring-reverb-ish echo send: lowpassed feedback delays into the master; route voices `to` the returned node */
  const echo = (taps: [number, number][], wetLevel: number, lp = 2600) => {
    const fx = a.createGain();
    fx.connect(master);
    const wet = a.createGain();
    wet.gain.value = wetLevel;
    fx.connect(wet);
    for (const [dt, fb] of taps) {
      const d = a.createDelay(1);
      d.delayTime.value = dt;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      const g = a.createGain();
      g.gain.value = fb;
      wet.connect(d);
      d.connect(f);
      f.connect(g);
      g.connect(d);
      f.connect(master);
    }
    return fx;
  };

  return { a, t0, master, env3, tone, noise, echo };
}
