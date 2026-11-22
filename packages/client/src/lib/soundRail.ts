import type { SfxEnv } from './soundHsr';

/**
 * The European railway sound set ("rail" theme, Ticket to Europa). Same sound-effect API as the vintage set in
 * sound.ts and the HSR set in soundHsr.ts, synthesised with Web Audio (no files). Old-continental station
 * flavour: a vibraphone-like three-note announcement chime, a conductor's pea whistle, a ticket punch,
 * carriage couplings, a little post-horn brass call. Short and soft; every envelope ramps for at least 5 ms.
 *
 * The audio context and volume come in through `SfxEnv`, so a test can render the sounds offline.
 */
const MIN = 0.0001;
/** Shortest attack or release on any voice: below about 5 ms an envelope can be heard as a click. */
const SOFT = 0.006;

export function createRailSfx(env: SfxEnv) {
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
    g.gain.exponentialRampToValueAtTime(level(gain), t0 + Math.max(SOFT, Math.min(0.012, dur / 3)));
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Band-passed noise with a soft attack: card flicks, rail clicks, brake air. */
  function puff(start: number, dur: number, gain: number, cutoff: number, q = 1, attack = SOFT) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const len = Math.max(dur, attack + SOFT);
    const src = a.createBufferSource();
    src.buffer = whiteNoise(a);
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = cutoff;
    f.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(level(gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + len);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t0);
    src.stop(t0 + Math.min(0.5, len + 0.03));
  }

  /** A vibraphone-like bar: a sine with a faint fourth harmonic that dies first, and a slow, gentle shimmer. */
  function vibe(freq: number, start: number, gain = 0.08, decay = 1.2) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const shimmer = a.createGain();
    shimmer.gain.value = 1;
    const lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = 5.5;
    depth.gain.value = 0.12;
    lfo.connect(depth).connect(shimmer.gain);
    shimmer.connect(a.destination);
    for (const [ratio, lvl, life] of [[1, 1, 1], [4, 0.12, 0.25], [2.0, 0.08, 0.5]] as const) {
      const osc = a.createOscillator();
      const g = a.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * ratio;
      g.gain.setValueAtTime(MIN, t0);
      g.gain.exponentialRampToValueAtTime(level(gain * lvl), t0 + SOFT);
      g.gain.exponentialRampToValueAtTime(MIN, t0 + decay * life);
      osc.connect(g).connect(shimmer);
      osc.start(t0);
      osc.stop(t0 + decay * life + 0.02);
    }
    lfo.start(t0);
    lfo.stop(t0 + decay + 0.02);
  }

  /** A soft brass note (post horn / cornet): two saws through a low-pass that opens with the attack, as a lip buzz does. */
  function brass(freq: number, start: number, dur: number, gain = 0.05) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(freq * 1.2, t0);
    f.frequency.exponentialRampToValueAtTime(freq * 5, t0 + 0.04);
    f.frequency.exponentialRampToValueAtTime(freq * 2.6, t0 + Math.max(0.08, dur * 0.6));
    const g = a.createGain();
    const peak = level(gain);
    const release = Math.min(0.08, dur * 0.4);
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.025);
    g.gain.linearRampToValueAtTime(peak * 0.85, t0 + Math.max(0.03, dur - release));
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    f.connect(g).connect(a.destination);
    for (const cents of [-5, 5]) {
      const osc = a.createOscillator();
      osc.type = 'sawtooth';
      osc.detune.value = cents;
      osc.frequency.setValueAtTime(freq * 0.985, t0);
      osc.frequency.exponentialRampToValueAtTime(freq, t0 + 0.03);
      osc.connect(f);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }
  }

  /** The conductor's pea whistle: a high tone warbled fast by the rattling pea, with a breath of air. */
  function peaWhistle(start: number, dur: number, gain = 0.05) {
    const a = env.audio();
    if (!a) return;
    const t0 = a.currentTime + start;
    const osc = a.createOscillator();
    const pea = a.createOscillator();
    const peaDepth = a.createGain();
    const g = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2650, t0);
    osc.frequency.linearRampToValueAtTime(2800, t0 + 0.05);
    pea.frequency.value = 34;
    peaDepth.gain.value = 120;
    pea.connect(peaDepth).connect(osc.frequency);
    const peak = level(gain);
    g.gain.setValueAtTime(MIN, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
    g.gain.setValueAtTime(peak, t0 + dur - 0.06);
    g.gain.exponentialRampToValueAtTime(MIN, t0 + dur);
    osc.connect(g).connect(a.destination);
    osc.start(t0);
    pea.start(t0);
    osc.stop(t0 + dur + 0.02);
    pea.stop(t0 + dur + 0.02);
    puff(start, dur, gain * 0.5, 2800, 1.5, 0.02);
  }

  /** A ticket punch: a dull thud as the jaws close, a crisp click, and a lighter click as they spring open. */
  function punch(start: number, gain = 0.07) {
    tone(170, start, 0.07, 'sine', gain, 90);
    puff(start, 0.03, gain * 1.1, 2600, 3);
    puff(start + 0.075, 0.025, gain * 0.5, 3600, 3);
  }

  /** Two quick wheel clicks over a rail joint, "ta-tak". */
  function railJoint(start: number, gain = 0.05) {
    puff(start, 0.035, gain, 1500, 2);
    puff(start + 0.085, 0.035, gain * 0.8, 1300, 2);
  }

  /** Carriage coupling: buffers meeting (a low thump) and the coupling link's short metallic clank. */
  function coupling(start: number, gain = 0.07) {
    tone(120, start, 0.12, 'sine', gain * 1.3, 70);
    puff(start, 0.06, gain, 900, 4);
    tone(1450, start + 0.01, 0.16, 'triangle', gain * 0.35);
    tone(2310, start + 0.01, 0.1, 'sine', gain * 0.2);
  }

  /** The station announcement chime, "ding-ding-dong": G, up to D, settling on B. */
  function stationChime(start = 0, gain = 0.085) {
    vibe(784, start, gain, 1.0);
    vibe(1175, start + 0.26, gain * 0.9, 1.0);
    vibe(988, start + 0.52, gain, 1.6);
  }

  /** A post-horn call, "ta-ta-taaa": two short notes and a held fifth above, with a soft lower note under it. */
  function postHorn(start: number, gain = 0.045) {
    brass(523, start, 0.09, gain);
    brass(523, start + 0.12, 0.09, gain);
    brass(784, start + 0.24, 0.42, gain);
    brass(392, start + 0.24, 0.42, gain * 0.55);
  }

  return {
    /** a light card flick: a papery swish with a crisp edge */
    card: () => { puff(0, 0.06, 0.07, 3000, 0.8, 0.008); puff(0.012, 0.035, 0.04, 5200, 1.2); },
    /** the conductor punches the ticket */
    ticket: () => punch(0),
    /**
     * The route-claim run (times in seconds from now): a short whistle as the train leaves, "ta-tak" over the rail
     * joints while it travels, a coupling clank as each car drops, then a post-horn call on arrival.
     */
    claim: (dropTimes: number[], arrive: number, start = 0) => {
      peaWhistle(Math.max(0, start - 0.1), 0.2, 0.025);
      for (let t = start; t < arrive; t += 0.32) railJoint(t, 0.045);
      dropTimes.forEach((t) => coupling(t, 0.06));
      postHorn(arrive + 0.02);
    },
    chat: () => tone(988, 0, 0.08, 'sine', 0.06, 1319),
    turn: () => { vibe(784, 0, 0.065, 0.5); vibe(1175, 0.11, 0.055, 0.7); },
    nope: () => tone(247, 0, 0.14, 'triangle', 0.08, 185),
    /** the final-round alert (played twice): one blast on the conductor's whistle */
    whistle: () => peaWhistle(0, 0.38),
    /** a little brass call up the major chord */
    fanfare: () => {
      brass(392, 0, 0.1, 0.045);
      brass(523, 0.12, 0.1, 0.045);
      brass(659, 0.24, 0.1, 0.045);
      brass(784, 0.36, 0.45, 0.045);
      brass(523, 0.36, 0.45, 0.025);
    },
    /** End of the line: rail joints slowing down, the brakes sighing out air, the station chime, a closing post-horn call. */
    endGame: () => {
      [0, 0.3, 0.64, 1.04].forEach((t) => railJoint(t, 0.045));
      tone(2400, 0.9, 0.5, 'sine', 0.012, 2150);
      puff(1.35, 0.6, 0.04, 3600, 0.7, 0.05);
      stationChime(1.9);
      postHorn(3.3);
    },
    /** One route counted: a small bright tick, higher for bigger routes. */
    count: (points: number) => tone(640 + Math.min(15, points) * 32, 0, 0.09, 'triangle', 0.07),
    /** A completed ticket: punched, and a little bell up. */
    ticketWon: () => { punch(0, 0.05); vibe(880, 0.08, 0.06, 0.5); vibe(1319, 0.17, 0.06, 0.7); },
    /** An unfinished ticket: a soft falling brass sigh. */
    ticketLost: () => { brass(349, 0, 0.18, 0.035); brass(262, 0.17, 0.3, 0.035); },
    /** The longest-path bonus: the post-horn call and the chime's top note. */
    bonus: () => { postHorn(0, 0.045); vibe(1568, 0.3, 0.04, 0.9); },
    stationChime: () => stationChime(0),
  };
}
