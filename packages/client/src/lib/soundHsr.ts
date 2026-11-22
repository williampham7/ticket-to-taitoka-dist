/**
 * The modern high-speed-rail sound set (China build). Same sound-effect API as the vintage steam set in sound.ts,
 * built from the same Web Audio parts: no files. Clean and digital: electric traction whine, soft rail clacks,
 * glassy bells and the two-tone station chime. Every envelope ramps for at least 5 ms, so nothing clicks.
 *
 * It has no import from sound.ts (which imports this): the audio context and volume come in through `SfxEnv`,
 * which also lets a test render the sounds in an OfflineAudioContext.
 */
export interface SfxEnv {
  /** The context to play in, or null when muted / silent / unavailable. */
  audio: () => BaseAudioContext | null;
  /** 0-1, from the volume slider. */
  volume: () => number;
}

const MIN = 0.0001;
/** Shortest attack or release on any voice: below about 5 ms an envelope can be heard as a click. */
const SOFT = 0.006;

export function createHsrSfx(env: SfxEnv) {
  const noiseBufs = new WeakMap<BaseAudioContext, AudioBuffer>();
  const whiteNoise = (a: BaseAudioContext) => {
    let buf = noiseBufs.get(a);
    if (!buf) {
      buf = a.createBuffer(1, Math.ceil(a.sampleRate * 0.2), a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBufs.set(a, buf);
    }
    return buf;
  };

  /** A plain tone: soft attack, exponential decay (optionally gliding). */
  function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08, glideTo?: number) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(MIN, gain * env.volume()), t0 + Math.min(0.012, dur / 3));
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** A glassy bell: a sine with two faint upper partials that die away faster than the fundamental. */
  function bell(freq: number, start: number, gain = 0.09, decay = 0.9) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const peak = gain * env.volume();
    for (const [ratio, level, life] of [[1, 1, 1], [2.01, 0.22, 0.55], [2.76, 0.1, 0.3]] as const) {
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(MIN, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(MIN, peak * level), t0 + SOFT);
      g.gain.exponentialRampToValueAtTime(MIN, t0 + decay * life);
      osc.connect(g).connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + decay * life + 0.02);
    }
  }

  /** A short band of filtered noise with a soft attack: card swishes and rail clacks. */
  function puff(start: number, dur: number, gain: number, cutoff: number, q = 1) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const src = a.createBufferSource();
    src.buffer = whiteNoise(a);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = cutoff;
    f.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(MIN, gain * env.volume()), t0 + SOFT);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + Math.max(dur, SOFT * 2));
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
    src.stop(t0 + Math.min(0.2, dur + 0.03));
  }

  /** One soft, clean rail clack: a short filtered tick over a small low thump. */
  function clack(start: number, gain = 0.06) {
    puff(start, 0.05, gain, 1700, 1.6);
    tone(210, start, 0.05, 'sine', gain * 0.9, 130);
  }

  /**
   * The electric traction-motor whine of a departing high-speed train: a filtered saw gliding up with a sine
   * a little above it (slight harmonic), fading in and out softly. Pass glideTo below freq for slowing down.
   */
  function whine(start: number, dur: number, freq: number, glideTo: number, gain = 0.05) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const fade = Math.min(0.4, dur * 0.35);
    const g = a.createGain();
    const peak = Math.max(MIN, gain * env.volume());
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + fade);
    g.gain.setValueAtTime(peak, t0 + dur - fade);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(freq * 3, t0);
    lp.frequency.exponentialRampToValueAtTime(glideTo * 3, t0 + dur);
    lp.connect(g).connect(a.destination);
    for (const [type, ratio, level] of [['sawtooth', 1, 1], ['sine', 2.005, 0.7]] as const) {
      const osc = a.createOscillator();
      const og = a.createGain();
      og.gain.value = level;
      osc.type = type;
      osc.frequency.setValueAtTime(freq * ratio, t0);
      osc.frequency.exponentialRampToValueAtTime(glideTo * ratio, t0 + dur);
      osc.connect(og).connect(lp);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
  }

  /** The station chime, "ding-dong": a bright bell and then a bell a major third lower. */
  function stationChime(start = 0, gain = 0.1) {
    bell(988, start, gain, 1.1);
    bell(784, start + 0.34, gain * 0.9, 1.5);
  }

  /** A little rising or falling run of glassy bells. */
  const run = (notes: number[], step: number, gain = 0.07) => notes.forEach((f, i) => bell(f, i * step, gain, 0.6));

  return {
    /** a soft digital swipe */
    card: () => { puff(0, 0.08, 0.08, 3600, 1.1); tone(1500, 0, 0.05, 'sine', 0.025, 2000); },
    ticket: () => { tone(1319, 0, 0.1, 'sine', 0.05); tone(1760, 0.07, 0.14, 'sine', 0.045); },
    /**
     * The route-claim run (times in seconds from now): the electric whine of the train pulling away and speeding up,
     * a soft rail clack as it travels, a clean tock as each car drops, then the station chime on arrival.
     */
    claim: (dropTimes: number[], arrive: number, start = 0) => {
      const t0 = Math.max(0, start - 0.1);
      const dur = Math.max(0.6, arrive - t0 + 0.05);
      whine(t0, dur, 190, 640, 0.05);
      for (let t = start, k = 0; t < arrive; t += 0.2, k++) clack(t, k % 2 ? 0.045 : 0.06);
      dropTimes.forEach((t) => { tone(640, t, 0.09, 'sine', 0.08, 420); clack(t + 0.01, 0.07); });
      stationChime(arrive + 0.02);
    },
    chat: () => { tone(880, 0, 0.08, 'sine', 0.06, 1180); },
    turn: () => { bell(784, 0, 0.07, 0.45); bell(1175, 0.1, 0.06, 0.6); },
    nope: () => tone(300, 0, 0.14, 'sine', 0.06, 190),
    /** the final-round alert (played twice): a clear two-pitch ping */
    whistle: () => { bell(1175, 0, 0.07, 0.6); bell(1760, 0, 0.04, 0.6); },
    fanfare: () => run([523, 659, 784, 1047, 1319], 0.11, 0.08),
    /** End of the line: the train slows (whine gliding down), clacks thin out, and the chime sounds twice. */
    endGame: () => {
      whine(0, 1.7, 640, 180, 0.05);
      [0, 0.2, 0.42, 0.68, 0.98, 1.34].forEach((t) => clack(t, 0.05));
      stationChime(1.8);
      stationChime(2.9, 0.08);
    },
    /** One route counted: a glassy tick, higher for bigger routes. */
    count: (points: number) => tone(700 + Math.min(15, points) * 36, 0, 0.09, 'sine', 0.065),
    ticketWon: () => { bell(880, 0, 0.07, 0.5); bell(1319, 0.09, 0.07, 0.7); },
    ticketLost: () => tone(440, 0, 0.3, 'sine', 0.06, 294),
    bonus: () => { run([659, 784, 988, 1319], 0.09, 0.07); bell(1319, 0.4, 0.05, 0.9); },
    stationChime: () => stationChime(0),
  };
}
