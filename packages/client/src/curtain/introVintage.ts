import type { SfxEnv } from '../lib/soundHsr';
import { rig } from './cueRig';

/**
 * 'vintage' waiting cue (~3.1 s), played while the depot doors are still closed (HOLD_MS 3.2 s) and ending just
 * before the conductor's punch: a desert wind moaning outside, a far-off coyote, a lone reverb-drenched twangy
 * guitar (an original E-minor figure, then a low E with tremolo), and boots with jingling spurs walking up to the
 * doors. All nodes stop by ~3.2 s.
 */
export function playVintageWaiting(env: SfxEnv): void {
  const END = 3.12;
  const r = rig(env, END, 0.34);
  if (!r) return;
  const { a, t0, env3, tone, noise } = r;

  // a spring-reverb-ish echo for the guitar and the coyote
  const fx = r.echo([[0.23, 0.38], [0.37, 0.3]], 0.55);

  // 1) desert wind moaning outside the doors: a whistling band that sweeps up, then down
  noise(0, END, 0.07, 0.8, 0.9, 'lowpass', 380, 0.6, 700);
  noise(0.05, 1.7, 0.05, 0.6, 0.7, 'bandpass', 520, 9, 980);
  noise(1.3, END, 0.045, 0.5, 0.8, 'bandpass', 900, 9, 560);

  // 2) a coyote far off: a rising yip, then a wavering howl, quiet and echoing
  tone('sine', 520, 0.2, 0.55, 0.018, 0.04, 0.1, { bend: 860, to: fx });
  tone('sine', 700, 0.6, 1.5, 0.022, 0.12, 0.45, { bend: 640, vib: 22, to: fx });
  tone('sine', 1400, 0.6, 1.5, 0.004, 0.12, 0.45, { bend: 1280, vib: 40, to: fx });

  // 3) a lone twangy guitar: plucked saw + square octave through a closing resonant lowpass, bent into pitch
  const pluck = (f: number, s: number, dur: number, peak: number, trem = 0) => {
    const g = env3(s, s + dur, peak, 0.005, dur * 0.9, fx);
    let out: AudioNode = g;
    if (trem) {
      const tg = a.createGain();
      tg.gain.value = 1;
      const lfo = a.createOscillator();
      const lg = a.createGain();
      lfo.frequency.value = trem;
      lg.gain.value = 0.45;
      lfo.connect(lg).connect(tg.gain);
      lfo.start(t0 + s);
      lfo.stop(t0 + s + dur + 0.02);
      tg.connect(g);
      out = tg;
    }
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 3;
    lp.frequency.setValueAtTime(3200, t0 + s);
    lp.frequency.exponentialRampToValueAtTime(600, t0 + s + Math.min(dur, 0.6));
    lp.connect(out);
    const voices: [OscillatorType, number, number][] = [['sawtooth', 1, 1], ['square', 2.003, 0.25]];
    for (const [type, mul, lvl] of voices) {
      const o = a.createOscillator();
      const og = a.createGain();
      og.gain.value = lvl;
      o.type = type;
      o.frequency.setValueAtTime(f * mul * 0.985, t0 + s);
      o.frequency.exponentialRampToValueAtTime(f * mul, t0 + s + 0.05);
      o.connect(og).connect(lp);
      o.start(t0 + s);
      o.stop(t0 + s + dur + 0.02);
    }
  };
  // E3 G3 B3, A3 G3, then a low E (with its fifth) under tremolo, left ringing
  pluck(164.81, 0.55, 0.5, 0.07);
  pluck(196.0, 0.8, 0.5, 0.065);
  pluck(246.94, 1.05, 0.7, 0.07);
  pluck(220.0, 1.42, 0.35, 0.06);
  pluck(196.0, 1.6, 0.45, 0.06);
  pluck(82.41, 1.95, 1.15, 0.11, 7);
  pluck(123.47, 1.95, 1.1, 0.04, 7);

  // 4) boots on the boards and jingling spurs, walking up to the doors (louder as they come)
  [1.55, 2.0, 2.42, 2.8].forEach((t, i) => {
    const near = 0.45 + i * 0.18;
    tone('sine', 95, t, t + 0.12, 0.16 * near, 0.003, 0.09, { bend: 60 });
    noise(t, t + 0.07, 0.12 * near, 0.002, 0.05, 'lowpass', 900);
    noise(t + 0.004, t + 0.03, 0.06 * near, 0.002, 0.02, 'highpass', 3000);
    // the rowel: a few bright, slightly detuned rings shaken just after the heel lands
    [0.03, 0.07, 0.12].forEach((dt, k) => {
      const f = 4100 + ((i * 3 + k) % 4) * 610;
      tone('sine', f, t + dt, t + dt + 0.16, 0.014 * near, 0.002, 0.14);
      tone('sine', f * 1.5 + 37, t + dt, t + dt + 0.1, 0.007 * near, 0.002, 0.09);
    });
  });
}

/**
 * 'vintage' intro cue (~5.6 s, Web Audio only), synced to the depot-door opening in vintage.css:
 * 0.02 s conductor's punch (clack + ring), 0.3 s paper tear, 0.45 s latch clunk, 0.8-2.6 s door creak and
 * the light flooding in (wind swell, distant chuffs), 1.5 s far-off two-chime whistle, 2.5 s brassy Americana
 * fanfare as the camera crosses the threshold, 3.4 s warm C-major resolve as the board comes into focus.
 * All nodes stop by ~5.7 s.
 */
export function playVintageIntro(env: SfxEnv): void {
  const END = 5.6;
  const r = rig(env, END, 0.35);
  if (!r) return;
  const { tone, noise } = r;

  // 1) the conductor's punch: a hard clack with a little steel ring, then the card tearing
  noise(0.02, 0.06, 0.5, 0.002, 0.03, 'highpass', 2500);
  noise(0.02, 0.09, 0.25, 0.002, 0.05, 'bandpass', 900, 1.5);
  tone('sine', 2480, 0.025, 0.45, 0.05, 0.003, 0.4);
  tone('sine', 3710, 0.025, 0.3, 0.025, 0.003, 0.25);
  for (let t = 0.3, i = 0; t < 0.62; t += 0.018 + (i % 3) * 0.009, i++) {
    noise(t, t + 0.03, 0.06 + 0.05 * Math.sin(i), 0.003, 0.02, 'bandpass', 2200 + (i % 4) * 500, 1.2);
  }
  noise(0.3, 0.62, 0.05, 0.03, 0.08, 'bandpass', 3200, 0.8);

  // 2) the latch gives, the heavy doors creak open
  tone('sine', 140, 0.45, 0.7, 0.3, 0.004, 0.2, { bend: 70 });
  noise(0.45, 0.55, 0.22, 0.003, 0.08, 'lowpass', 700);
  noise(0.47, 0.5, 0.18, 0.002, 0.02, 'highpass', 3000);
  [[0.8, 1.7, 210, 150], [1.5, 2.6, 175, 120]].forEach(([s, e, f, to]) => {
    tone('sawtooth', f, s, e, 0.035, 0.15, 0.35, { bend: to, lp: 1100, vib: 9 });
  });

  // 3) the world outside: wind and prairie air swelling in, a steam train somewhere far off
  noise(0.7, 4.8, 0.09, 1.4, 1.4, 'lowpass', 500, 0.7, 1800);
  noise(1.0, 4.4, 0.04, 1.2, 1.2, 'bandpass', 2600, 0.6, 4200);
  for (let t = 1.0, i = 0; t < 3.4; t += 0.24, i++) {
    noise(t, t + 0.16, 0.035 + 0.02 * Math.min(1, (t - 1) / 1.2), 0.01, 0.12, 'bandpass', 480 + (i % 2) * 140, 1, 260);
  }
  const whistle = (s: number, e: number, peak: number) => {
    [233.08, 293.66, 349.23].forEach((f) => {
      tone('sawtooth', f * 0.96, s, e, peak, 0.12, 0.3, { bend: f, lp: 900, vib: 2.5 });
    });
    noise(s, e, peak * 0.4, 0.1, 0.3, 'bandpass', 1100, 3);
  };
  whistle(1.5, 2.05, 0.026);
  whistle(2.15, 3.0, 0.032);

  // 4) brassy Americana fanfare as the camera crosses the threshold: G4 C5 E5 -> G5, timpani and cymbal
  const brass = (f: number, s: number, e: number, peak: number) => {
    tone('sawtooth', f, s, e, peak, 0.03, 0.3, { lp: 700, lpTo: 2800, vib: 3 });
    tone('sawtooth', f * 1.004, s, e, peak * 0.7, 0.04, 0.3, { lp: 700, lpTo: 2400 });
  };
  brass(392, 2.5, 2.66, 0.055);
  brass(523.25, 2.66, 2.82, 0.06);
  brass(659.25, 2.82, 2.98, 0.065);
  brass(783.99, 2.98, 4.3, 0.075);
  [130.81, 196, 261.63, 329.63].forEach((f) => brass(f, 2.98, 4.35, 0.034));
  for (let t = 2.5; t < 2.98; t += 0.06) tone('sine', 70, t, t + 0.08, 0.12, 0.004, 0.06, { bend: 60 });
  tone('sine', 65, 2.98, 4.2, 0.32, 0.008, 1.0, { bend: 52 });
  noise(2.98, 4.6, 0.08, 0.01, 1.4, 'highpass', 6000);

  // 5) warm resolve under the bloom, a glint of bells on top
  [65.41, 130.81, 196, 261.63, 329.63, 392].forEach((f, i) => {
    tone('triangle', f, 3.4, END, 0.05 - i * 0.004, 0.5, 1.4, { lp: 1400, vib: i > 2 ? 1.5 : 0 });
    tone('sine', f * 2, 3.5, END, 0.014, 0.6, 1.4);
  });
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone('sine', f, 3.5 + i * 0.09, 4.9 + i * 0.09, 0.02, 0.005, 1.0));
}
