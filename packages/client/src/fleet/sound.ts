/**
 * Fleet sound effects: a small WebAudio synth, no files. Guns, shell whistles, splashes, hits, sinkings, the alarm,
 * a Shield's ring and one sound per weapon. `createFleetSfx` takes the audio context and volume as an environment,
 * so a test can check every scheduled value; `fleetSound` is the live set (follows the shared volume and mute).
 */
import type { WeaponId } from '@boboland/shared/src/fleet';
import { getMuted, getVolume, sfxEnv } from '../lib/sound';

export interface SfxEnv { audio: () => BaseAudioContext | null; volume: () => number }

const MIN = 0.0001;

export function createFleetSfx({ audio, volume }: SfxEnv) {
  const peak = (v: number) => Math.max(MIN, v * volume());

  function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.12, to?: number) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(peak(vol), t);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(dur: number, vol = 0.2, start = 0, filter?: { type: BiquadFilterType; from: number; to?: number; q?: number }, attack = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + start;
    const n = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf;
    if (attack > 0) {
      g.gain.setValueAtTime(MIN, t);
      g.gain.exponentialRampToValueAtTime(peak(vol), t + attack);
    } else g.gain.setValueAtTime(peak(vol), t);
    g.gain.exponentialRampToValueAtTime(MIN, t + dur);
    let node: AudioNode = src;
    if (filter) {
      const f = a.createBiquadFilter();
      f.type = filter.type;
      f.frequency.setValueAtTime(filter.from, t);
      f.Q.value = filter.q ?? 1;
      if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
      src.connect(f);
      node = f;
    }
    node.connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** a deep boom: a falling sine and a low noise thump */
  const boom = (start = 0, vol = 1, len = 0.9) => {
    noise(len, 0.4 * vol, start, { type: 'lowpass', from: 2200, to: 80 });
    tone(80, start, len * 0.9, 'sine', 0.32 * vol, 30);
  };
  const crack = (start = 0, vol = 1) => noise(0.18, 0.3 * vol, start, { type: 'highpass', from: 2500, to: 900 });

  const WEAPON: Record<WeaponId, () => void> = {
    frag: () => { tone(900, 0, 0.35, 'sawtooth', 0.03, 300); crack(0.35); boom(0.38, 0.6, 0.6); },
    airStrike: () => { noise(1.4, 0.18, 0, { type: 'bandpass', from: 400, to: 2400, q: 0.8 }, 0.5); [0.9, 1.1, 1.3].forEach((t) => boom(t, 0.45, 0.5)); },
    chainGun: () => { for (let i = 0; i < 14; i++) noise(0.05, 0.22, i * 0.07, { type: 'bandpass', from: 1600, q: 2 }); tone(90, 0, 1, 'sawtooth', 0.04, 80); },
    seaMine: () => { noise(0.25, 0.25, 0, { type: 'lowpass', from: 800, to: 200 }); tone(1200, 0.4, 0.08, 'square', 0.04); tone(1200, 0.9, 0.08, 'square', 0.04); },
    torpedo: () => { noise(1.6, 0.2, 0, { type: 'lowpass', from: 300, to: 900, q: 3 }, 0.3); tone(140, 0, 1.6, 'triangle', 0.06, 210); },
    supernova: () => { tone(300, 0, 1.1, 'sawtooth', 0.04, 2400); tone(2400, 1.1, 0.5, 'sine', 0.08, 4000); boom(1.15, 1.1, 1.2); },
    thunderhead: () => { boom(0, 1.2, 1.4); noise(1.2, 0.2, 0.1, { type: 'bandpass', from: 500, to: 120, q: 0.7 }); },
    cherry: () => { for (let i = 0; i < 6; i++) crack(i * 0.09, 0.7); boom(0.5, 0.5, 0.5); },
    maelstrom: () => { tone(1800, 0, 1.2, 'sine', 0.05, 120); noise(1.6, 0.3, 0.6, { type: 'lowpass', from: 1200, to: 60 }, 0.2); boom(1, 1.2, 1.5); },
    shield: () => { tone(1320, 0, 0.5, 'sine', 0.06, 1760); tone(1980, 0.05, 0.6, 'triangle', 0.04, 2640); },
    decoy: () => tone(700, 0, 0.2, 'triangle', 0.06, 500),
    reinforcement: () => [392, 523, 659].forEach((f, i) => tone(f, i * 0.1, 0.25, 'triangle', 0.07)),
  };

  return {
    /** a ship's gun fires */
    fire: () => { boom(0, 0.7, 0.5); crack(0, 0.5); },
    /** a shell in flight, falling */
    whistle: () => tone(2200, 0, 0.6, 'sine', 0.05, 700),
    splash: () => { noise(0.6, 0.25, 0, { type: 'bandpass', from: 900, to: 300, q: 0.9 }); noise(0.4, 0.08, 0.1, { type: 'highpass', from: 3000 }); },
    hit: () => { boom(0, 1, 0.8); crack(0.02, 0.8); },
    /** a ship goes down: a long rumble and groaning steel */
    sink: () => { boom(0, 1.2, 1.8); tone(160, 0.2, 2.2, 'sawtooth', 0.05, 55); noise(2.4, 0.12, 0.5, { type: 'lowpass', from: 600, to: 120 }, 0.3); },
    /** your ship was hit */
    alarm: () => [0, 0.32, 0.64].forEach((t) => { tone(740, t, 0.15, 'square', 0.04); tone(587, t + 0.16, 0.15, 'square', 0.04); }),
    /** a Shield takes the hit */
    deflect: () => WEAPON.shield(),
    weapon: (w: WeaponId) => WEAPON[w](),
    select: () => tone(880, 0, 0.05, 'triangle', 0.06),
    win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.35, 'triangle', 0.11)),
    lose: () => [330, 294, 247, 196, 147].forEach((f, i) => tone(f, i * 0.18, 0.4, 'sawtooth', 0.06)),
  };
}

export type FleetSfx = ReturnType<typeof createFleetSfx>;

/** The live set: silent while muted. */
export const fleetSound: FleetSfx = createFleetSfx({
  audio: () => (getMuted() || getVolume() === 0 ? null : (sfxEnv.audio() as BaseAudioContext | null)),
  volume: () => getVolume(),
});
