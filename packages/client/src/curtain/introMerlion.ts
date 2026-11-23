import type { SfxEnv } from '../lib/soundHsr';
import { rig } from './cueRig';

type Rig = NonNullable<ReturnType<typeof rig>>;

/** A gamelan-style bell (bonang/saron): a bright sine with an inharmonic overtone and a slightly detuned twin, which gives the slow "shimmer". */
const bell = (r: Rig, f: number, s: number, peak: number, to?: AudioNode, ring = 0.9) => {
  r.tone('sine', f, s, s + ring, peak, 0.004, ring * 0.9, { to });
  r.tone('sine', f * 1.007, s, s + ring * 0.8, peak * 0.6, 0.004, ring * 0.7, { to });
  r.tone('sine', f * 2.4, s, s + ring * 0.35, peak * 0.22, 0.003, ring * 0.3, { to });
};
/** A gong: low, long, with an inharmonic wobble. */
const gong = (r: Rig, f: number, s: number, e: number, peak: number, to?: AudioNode) => {
  r.tone('sine', f, s, e, peak, 0.02, (e - s) * 0.85, { to });
  r.tone('sine', f * 1.51, s, s + (e - s) * 0.6, peak * 0.35, 0.02, (e - s) * 0.5, { to });
  r.tone('triangle', f * 2.02, s, s + (e - s) * 0.4, peak * 0.2, 0.02, (e - s) * 0.35, { lp: 900, to });
};
/** One MRT-style door tone: a soft, round two-partial "ding" (an original motif, not a copy of the real jingle). */
const ding = (r: Rig, f: number, s: number, e: number, peak: number, to?: AudioNode) => {
  r.tone('sine', f, s, e, peak, 0.01, (e - s) * 0.8, { to });
  r.tone('sine', f * 2, s, s + (e - s) * 0.5, peak * 0.25, 0.01, (e - s) * 0.4, { to });
};
/** Cicadas and night insects: bandpassed noise chopped into fast pulses, in a few overlapping bands. */
const cicadas = (r: Rig, from: number, to: number, peak: number) => {
  for (let t = from; t < to - 0.12; t += 0.11) {
    const f = 4300 + ((Math.round(t * 100) * 37) % 9) * 160;
    r.noise(t, t + 0.085, peak * (0.7 + ((Math.round(t * 100) * 13) % 5) * 0.1), 0.012, 0.05, 'bandpass', f, 9);
  }
};

/** Slendro-ish pentatonic (C D F G A) in two octaves, for the shimmer. */
const PENTA = [523.25, 587.33, 698.46, 783.99, 880, 1046.5, 1174.7, 1396.9, 1568, 1760];

/**
 * The 'merlion' (Singapore) waiting cue (~3.1 s), played while the closed curtain builds (HOLD_MS 3.2 s): a warm night
 * with insects and soft water, an MRT gliding in (a rising then falling whoosh with a low hum), the three-note door
 * chime as it stops (~1.9 s) and a gamelan shimmer as the title appears (~1.6 s). All nodes stop by ~3.2 s.
 */
export function playMerlionWaiting(env: SfxEnv): void {
  const END = 3.1;
  const r = rig(env, END, 0.6);
  if (!r) return;
  const air = r.echo([[0.17, 0.3], [0.29, 0.2]], 0.45, 2800);

  // 1) night ambience: cicadas, and the bay lapping very softly
  cicadas(r, 0.05, END - 0.3, 0.007);
  r.noise(0, END, 0.02, 0.5, 0.6, 'lowpass', 300, 0.7);
  for (let i = 0; i < 4; i++) r.noise(0.1 + i * 0.75, 0.7 + i * 0.75, 0.035, 0.25, 0.3, 'bandpass', 600, 0.9, 300);

  // 2) the train glides in along the viaduct: hum + rushing air that peaks and settles as it brakes (~0.4-2.2 s)
  r.tone('sawtooth', 62, 0.3, 2.3, 0.035, 0.7, 0.9, { lp: 260, bend: 48 });
  r.tone('sine', 124, 0.3, 2.3, 0.02, 0.7, 0.9, { bend: 90 });
  r.noise(0.3, 2.3, 0.05, 0.9, 0.8, 'bandpass', 900, 0.9, 380);

  // 3) the title appears: a gamelan shimmer climbing the pentatonic scale
  [0, 2, 3, 5, 6, 8].forEach((k, i) => bell(r, PENTA[k], 1.6 + i * 0.11, 0.03 - i * 0.002, air, 0.9));

  // 4) the doors' chime, three soft notes (high, mid, low-high), and a held low gong under the title
  ding(r, 987.77, 1.95, 2.45, 0.05, air);
  ding(r, 783.99, 2.2, 2.7, 0.05, air);
  ding(r, 1174.7, 2.45, 3.05, 0.05, air);
  gong(r, 98, 1.5, 3.05, 0.1, air);
}

/**
 * The 'merlion' curtain cue, synced to the opening in merlion.css (seconds from the opening's start): 0.0-0.9 a rising
 * shimmer as the card slides to the reader, 0.9 the card "beep" (the EZ-link style double blip) with a tiny confirm
 * tick, 1.0-1.7 the gates' servo whirr and a door chime, 1.25-3.0 a gamelan run rising over a whoosh as the camera
 * pushes through, a Spectra-style burst of soft crackle from 0.9 s, and at 2.8 a warm gong with a resolving
 * pentatonic bell phrase; insects fade out by 2.6 s; faded out by ~5.4 s.
 */
export function playMerlionIntro(env: SfxEnv): void {
  const END = 5.4;
  const r = rig(env, END, 0.5);
  if (!r) return;
  const air = r.echo([[0.19, 0.3], [0.33, 0.22]], 0.45, 2800);

  // 1) a last few insects, and a rising shimmer under the card's approach
  cicadas(r, 0, 2.6, 0.005);
  [0, 3, 5, 6, 8].forEach((k, i) => bell(r, PENTA[k] * 2, 0.05 + i * 0.16, 0.012, air, 0.6));

  // 2) the tap: a short bright double blip, then a faint tick
  r.tone('square', 2217, 0.9, 0.98, 0.022, 0.004, 0.02, { lp: 5200 });
  r.tone('sine', 2217, 0.9, 1.0, 0.045, 0.004, 0.04);
  r.tone('square', 2960, 1.02, 1.12, 0.022, 0.004, 0.03, { lp: 5200 });
  r.tone('sine', 2960, 1.02, 1.14, 0.045, 0.004, 0.05);

  // 3) the gates swing open: a servo whirr, then the door chime
  r.tone('sawtooth', 180, 1.0, 1.7, 0.02, 0.05, 0.3, { lp: 700, bend: 340 });
  r.noise(1.0, 1.7, 0.03, 0.1, 0.4, 'bandpass', 1500, 1.4, 700);
  ding(r, 987.77, 1.1, 1.6, 0.05, air);
  ding(r, 783.99, 1.35, 1.85, 0.05, air);

  // 4) the push: a gamelan run up the scale over a rising whoosh
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((k, i) => bell(r, PENTA[k], 1.25 + i * 0.12, 0.026 + i * 0.002, air, 0.8));
  r.noise(1.2, 3.0, 0.07, 1.1, 0.7, 'bandpass', 500, 1.1, 4200);
  r.tone('sine', 110, 1.25, 2.9, 0.06, 0.8, 0.7, { bend: 220 });

  // 5) the light show: a spray of soft crackle, like the Spectra finale
  for (let i = 0; i < 14; i++) {
    const s = 0.9 + ((i * 53) % 17) * 0.07;
    r.noise(s, s + 0.05, 0.02, 0.003, 0.04, 'highpass', 3600 + (i % 4) * 600, 1.2, undefined, air);
  }

  // 6) home: a warm gong and a resolving bell phrase on the pentatonic scale
  gong(r, 98, 2.8, 5.2, 0.14, air);
  r.tone('sine', 196, 2.8, 5.0, 0.06, 0.02, 1.8);
  for (const [k, s] of [[5, 2.85], [3, 3.15], [4, 3.45], [2, 3.8], [0, 4.3]] as const) bell(r, PENTA[k], s, 0.04, air, 1.0);
  bell(r, PENTA[0] * 2, 4.3, 0.02, air, 1.0);
}
