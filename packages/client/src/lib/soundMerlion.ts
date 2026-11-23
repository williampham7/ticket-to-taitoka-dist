// WIRING (sound.ts): `import { createMerlionSfx } from './soundMerlion';` and add `: MERLION ? createMerlionSfx({ audio, volume: () => volume })`
// to the `export const sfx` chain (before `: vintageSfx`), with `MERLION` (theme id 'merlion') imported from '../theme'.
import type { SfxEnv } from './soundHsr';

/**
 * The Singapore sound set ("merlion" theme). Same API as the other sets, synthesised with Web Audio (no files):
 * a light gamelan/metallophone tick for cards, an MRT-door-style two-tone chime plus a soft train whoosh for a
 * route claim (an original two-note motif, not the real jingle), an EZ-link card "beep" for tickets, a gentle
 * kompang (frame drum) double tap for your turn, and for the end of the game a pentatonic flourish with kompang
 * and a National Day firework crackle. Every envelope ramps for at least 5 ms, so nothing clicks.
 */
const MIN = 0.0001;
const SOFT = 0.006;

export function createMerlionSfx(env: SfxEnv) {
  const noiseBufs = new WeakMap<BaseAudioContext, AudioBuffer>();
  const whiteNoise = (a: BaseAudioContext) => {
    let buf = noiseBufs.get(a);
    if (!buf) {
      buf = a.createBuffer(1, Math.ceil(a.sampleRate * 0.5), a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBufs.set(a, buf);
    }
    return buf;
  };
  const level = (gain: number) => Math.max(MIN, gain * env.volume());

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
    g.gain.exponentialRampToValueAtTime(level(gain), t0 + Math.max(SOFT, Math.min(0.012, dur / 3)));
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function puff(start: number, dur: number, gain: number, cutoff: number, q = 1, attack = SOFT, sweepTo?: number) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const len = Math.max(dur, attack + SOFT);
    const src = a.createBufferSource();
    src.buffer = whiteNoise(a);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(cutoff, t0);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + len);
    f.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(level(gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + len);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
    src.stop(t0 + Math.min(0.5, len + 0.03));
  }

  function strike(freq: number, start: number, gain: number, decay: number, partials: readonly (readonly [number, number, number])[]) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    for (const [ratio, lvl, life] of partials) {
      const osc = a.createOscillator();
      const g = a.createGain();
      const end = t0 + Math.max(SOFT * 2, decay * life);
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(MIN, t0);
      g.gain.exponentialRampToValueAtTime(level(gain * lvl), t0 + SOFT);
      g.gain.exponentialRampToValueAtTime(MIN, end);
      osc.connect(g).connect(a.destination);
      osc.start(t0);
      osc.stop(end + 0.02);
    }
  }

  /** gamelan metallophone: bright, slightly inharmonic, the high partials die first */
  const GAMELAN = [[1, 1, 1], [2.4, 0.3, 0.3], [5.2, 0.1, 0.12]] as const;
  const gam = (freq: number, start: number, gain = 0.06, decay = 0.8) => strike(freq, start, gain, decay, GAMELAN);

  /** a kompang hit: the skin's low thump (dum) or its slap (tak) */
  function kompang(start: number, gain = 0.09, slap = false) {
    if (slap) {
      tone(330, start, 0.07, 'sine', gain * 0.5, 240);
      puff(start, 0.06, gain * 0.7, 2200, 1.5, 0.004);
    } else {
      tone(190, start, 0.2, 'sine', gain, 95);
      puff(start, 0.05, gain * 0.3, 700, 1, 0.004);
    }
  }

  /** the MRT-style door chime: a falling two-tone (original notes, E6 then B5) */
  function doorChime(start: number, gain = 0.06) {
    strike(1319, start, gain, 0.45, [[1, 1, 1], [2, 0.12, 0.3]]);
    strike(988, start + 0.19, gain, 0.7, [[1, 1, 1], [2, 0.12, 0.3]]);
  }

  /** a soft train whoosh: a band of noise sweeping up and away */
  const whoosh = (start: number, dur: number, gain = 0.045) => puff(start, dur, gain, 500, 0.8, Math.min(0.2, dur / 2), 2400);

  /** EZ-link tap: one short high beep */
  const beep = (start: number, gain = 0.05, freq = 2637) => tone(freq, start, 0.1, 'triangle', gain * 0.9);

  /** National Day crackle: a burst of little pops */
  function crackle(start: number, count: number, gain = 0.035) {
    for (let i = 0; i < count; i++) {
      const t = start + i * 0.055 + (i % 3) * 0.017;
      puff(t, 0.03, gain * (0.5 + ((i * 7) % 5) / 8), 2600 + ((i * 937) % 2200), 2, 0.003);
    }
  }

  // C major pentatonic, a little over two octaves up
  const PENT = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

  return {
    /** a light gamelan tick, a little higher on a second card */
    card: () => { gam(1568, 0, 0.05, 0.25); gam(2349, 0.05, 0.03, 0.2); },
    /** the EZ-link tap: beep-beep */
    ticket: () => { beep(0); beep(0.11, 0.045, 3136); puff(0.22, 0.05, 0.015, 3600, 2); },
    /** a whoosh, a pentatonic tick as each car drops, then the MRT door chime on arrival */
    claim: (dropTimes: number[], arrive: number, start = 0) => {
      whoosh(start, Math.max(0.3, arrive - start), 0.034);
      dropTimes.forEach((t, k) => gam(PENT[(k * 2) % PENT.length], t, 0.04, 0.3));
      doorChime(arrive + 0.02, 0.048);
    },
    chat: () => gam(1760, 0, 0.045, 0.3),
    /** your turn: a gentle kompang double tap */
    turn: () => { kompang(0, 0.08); kompang(0.16, 0.06, true); },
    /** a soft falling "uh-oh" */
    nope: () => { tone(392, 0, 0.12, 'sine', 0.07, 370); tone(294, 0.13, 0.2, 'sine', 0.07, 262); },
    /** the final-round alert (played twice): three kompang taps and the door chime */
    whistle: () => { kompang(0, 0.08); kompang(0.15, 0.06, true); kompang(0.3, 0.08); doorChime(0.5, 0.05); },
    /** a short festive flourish: pentatonic run, kompang, sparkle */
    fanfare: () => {
      kompang(0, 0.08); kompang(0.14, 0.06, true);
      [0, 3, 5, 7, 9].forEach((k, i) => gam(PENT[k], 0.15 + i * 0.1, 0.055, i === 4 ? 1.1 : 0.5));
      crackle(0.6, 4, 0.025);
    },
    /** the end of the game: a kompang roll, a pentatonic flourish and a firework crackle */
    endGame: () => {
      kompang(0, 0.08); kompang(0.18, 0.06, true); kompang(0.36, 0.08);
      [0, 2, 3, 5, 7, 9, 7, 9].forEach((k, i) => gam(PENT[k], 0.5 + i * 0.2, 0.05, i === 7 ? 1.6 : 0.5));
      [0, 3, 5].forEach((k) => gam(PENT[k] / 2, 2.15, 0.03, 1.4));
      crackle(2.2, 10, 0.03);
      tone(100, 2.2, 0.25, 'sine', 0.06, 55);
      crackle(3.0, 6, 0.02);
    },
    /** One route counted: a gamelan plink, higher for bigger routes. */
    count: (points: number) => gam(660 + Math.min(15, points) * 34, 0, 0.05, 0.3),
    /** A completed ticket: the EZ-link beep and a bright gamelan note. */
    ticketWon: () => { beep(0, 0.04); gam(1568, 0.1, 0.055, 0.7); gam(2093, 0.22, 0.05, 1.0); },
    /** An unfinished ticket: a low double beep, falling. */
    ticketLost: () => { beep(0, 0.04, 1568); beep(0.14, 0.04, 1175); tone(262, 0.28, 0.3, 'triangle', 0.04, 233); },
    /** The longest-path bonus: a pentatonic run and the door chime. */
    bonus: () => { [3, 4, 5, 7].forEach((k, i) => gam(PENT[k], i * 0.08, 0.055, 0.4)); doorChime(0.36, 0.05); },
    /** the MRT-style two-tone chime (what the other sets' station chime is for) */
    stationChime: () => doorChime(0, 0.065),
  };
}
