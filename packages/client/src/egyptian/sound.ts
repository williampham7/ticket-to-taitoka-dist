/**
 * Egyptian War sound effects: a small WebAudio synth, no files. Card flicks, slaps, a bright chime for a won pile,
 * a dull thud for a false slap, a frame-drum hit for a challenge, a soft tick per try and per grace second,
 * a shuffle for collecting and a short fanfare for the win. `createEgwSfx` takes the audio context and volume
 * as an environment so a test can check every scheduled value; `egwSound` follows the shared volume and mute.
 */
import type { EgwEvent, PlayerID } from '@boboland/shared/src/egyptian';
import { getMuted, getVolume, sfxEnv } from '../lib/sound';

export interface SfxEnv { audio: () => BaseAudioContext | null; volume: () => number }
const MIN = 0.0001;

export function createEgwSfx({ audio, volume }: SfxEnv) {
  const peak = (v: number) => Math.max(MIN, v * volume());

  function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.1, to?: number) {
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

  function noise(dur: number, vol: number, start = 0, filter?: { type: BiquadFilterType; from: number; to?: number; q?: number }) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + start;
    const n = Math.max(1, Math.floor(a.sampleRate * dur));
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(peak(vol), t);
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

  const slapHit = (vol: number) => { noise(0.12, 0.5 * vol, 0, { type: 'bandpass', from: 1400, to: 500, q: 0.8 }); tone(150, 0, 0.12, 'sine', 0.2 * vol, 70); };
  /** a frame drum: low skin hit plus a jingle */
  const drum = (start = 0, vol = 1) => { tone(110, start, 0.35, 'sine', 0.22 * vol, 60); noise(0.08, 0.12 * vol, start, { type: 'highpass', from: 5000 }); };

  return {
    flip: () => noise(0.09, 0.22, 0, { type: 'bandpass', from: 3200, to: 1800, q: 1.2 }),
    slap: () => slapHit(1),
    validSlap: () => { slapHit(1); [988, 1319, 1760].forEach((f, i) => tone(f, 0.08 + i * 0.07, 0.4, 'triangle', 0.07)); },
    falseSlap: () => { slapHit(0.9); tone(196, 0.06, 0.32, 'sawtooth', 0.06, 98); tone(185, 0.06, 0.32, 'square', 0.03, 92); },
    challenge: () => { drum(0, 1); drum(0.16, 0.7); tone(587, 0.02, 0.5, 'triangle', 0.05, 554); },
    tryUsed: () => tone(1175, 0, 0.12, 'sine', 0.05),
    graceTick: () => tone(1568, 0, 0.06, 'square', 0.025),
    collect: () => { for (let i = 0; i < 7; i++) noise(0.06, 0.16, i * 0.035, { type: 'bandpass', from: 2600 + i * 120, q: 1.4 }); },
    win: () => { drum(0, 1); [440, 554, 659, 880, 1109].forEach((f, i) => tone(f, 0.12 + i * 0.12, 0.45, 'triangle', 0.1)); drum(0.75, 1.1); },
  };
}

export type EgwSfx = ReturnType<typeof createEgwSfx>;

/** The live set: silent while muted. */
export const egwSound: EgwSfx = createEgwSfx({
  audio: () => (getMuted() || getVolume() === 0 ? null : (sfxEnv.audio() as BaseAudioContext | null)),
  volume: () => getVolume(),
});

/** The sound for a game event. */
export function egwSoundFor(e: EgwEvent, _me: PlayerID | null, sfx: EgwSfx = egwSound) {
  switch (e.kind) {
    case 'flip': return sfx.flip();
    case 'challenge': return sfx.challenge();
    case 'pass': return sfx.tryUsed();
    case 'grace': return sfx.graceTick();
    case 'slap': return sfx.validSlap();
    case 'falseSlap': return sfx.falseSlap();
    case 'collect': return sfx.collect();
    case 'win': return sfx.win();
    default: return undefined;
  }
}
