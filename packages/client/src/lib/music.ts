import { useSyncExternalStore } from 'react';
import { HSR, MERLION, RAIL } from '../theme';
import { BPM, buildSong, type SongEvent } from './song';
import { BPM_HSR, buildSongHsr } from './songHsr';
import { BPM_RAIL, buildSongRail, type RailEvent } from './songRail';
import { BPM_MERLION, buildSongMerlion, createMerlionVoices, VOLUME_MERLION, type MerlionEvent } from './songMerlion';
import { BPM_FRONTLINE, buildSongFrontline, createFrontlineVoices, VOLUME_FRONTLINE, type FrontlineEvent } from './songFrontline';
import { BPM_FLEET, buildSongFleet, createFleetVoices, VOLUME_FLEET, type FleetEvent } from './songFleet';
import { BPM_EGYPTIAN, buildSongEgyptian, createEgyptianVoices, VOLUME_EGYPTIAN, type EgyptianEvent } from './songEgyptian';
import { onNavigate } from './router';
import { load, save } from './storage';
import { getMuted, getVolume, subscribeMuted, subscribeVolume } from './sound';

/**
 * Background music: plays the generated railway tune with a look-ahead scheduler.
 * Starts on the first click/keypress (browsers block audio before that). Separate from sound effects.
 */
const KEY = 'boboland.music';
// The HSR tune is softer and sparser (rms about 0.02 vs 0.03 at 0.35), so it gets a higher master level for equal loudness.
// The rail waltz is gentler still (rms about 0.014 at 0.35); at 0.66 it renders at rms 0.027, the same as vintage.
// The Singapore evening tune is levelled in songMerlion.ts (VOLUME_MERLION; its test renders it offline at rms about 0.027).
const VOLUME = HSR ? 0.5 : RAIL ? 0.66 : MERLION ? VOLUME_MERLION : 0.35;
const LOOKAHEAD_S = 0.25;
const TICK_MS = 60;

let enabled = load<boolean>(KEY, true);
const listeners = new Set<() => void>();

// The vintage railway tune, the modern HSR tune, or the European musette waltz, fixed by the theme.
/** every track's events except Fleet's (whose shapes overlap theirs) */
type MainEvent = SongEvent | RailEvent | MerlionEvent | FrontlineEvent;
type AnyEvent = MainEvent | FleetEvent | EgyptianEvent;
const song: { events: AnyEvent[]; beats: number } = HSR ? buildSongHsr() : RAIL ? buildSongRail() : MERLION ? buildSongMerlion() : buildSong();
const secPerBeat = 60 / (HSR ? BPM_HSR : RAIL ? BPM_RAIL : MERLION ? BPM_MERLION : BPM);

// Frontline (/frontline/...) has its own track on its own bus, whatever the edition; the router switches between them.
const flSong = buildSongFrontline();
const flSecPerBeat = 60 / BPM_FRONTLINE;
// Fleet (/fleet/...) likewise has its own track and bus.
const fleetSong = buildSongFleet();
const fleetSecPerBeat = 60 / BPM_FLEET;
// Egyptian War (/egyptian/...) likewise.
const egwSong = buildSongEgyptian();
const egwSecPerBeat = 60 / BPM_EGYPTIAN;
type Track = 'main' | 'frontline' | 'fleet' | 'egyptian';
/** The track for this page: Frontline and Fleet each have their own; everything else plays the edition's tune. */
const trackHere = (): Track => {
  const p = typeof window === 'undefined' ? '' : window.location.pathname;
  return p.startsWith('/frontline') ? 'frontline' : p.startsWith('/fleet') ? 'fleet' : p.startsWith('/egyptian') ? 'egyptian' : 'main';
};
/** true while the Frontline track is the one playing (or about to). */
let track: Track = 'main';
let flBus: GainNode | null = null;
let flVoice: ((e: FrontlineEvent, t: number) => void) | null = null;
let fleetBus: GainNode | null = null;
let fleetVoice: ((e: FleetEvent, t: number) => void) | null = null;
let egwBus: GainNode | null = null;
let egwVoice: ((e: EgyptianEvent, t: number) => void) | null = null;
const cur = () => (track === 'frontline' ? { song: flSong, spb: flSecPerBeat, volume: VOLUME_FRONTLINE }
  : track === 'fleet' ? { song: fleetSong, spb: fleetSecPerBeat, volume: VOLUME_FLEET }
  : track === 'egyptian' ? { song: egwSong, spb: egwSecPerBeat, volume: VOLUME_EGYPTIAN }
    : { song, spb: secPerBeat, volume: VOLUME });

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** HSR only: a send into a soft echo, for the plucked lead. */
let echo: GainNode | null = null;
/** Rail only: a send into a short, dark slap-back, the sound of a small café room. */
let room: GainNode | null = null;
/** Merlion only: the Singapore tune's voices (bells, gamelan, kompang...), from songMerlion.ts. */
let merlionVoice: ((e: MerlionEvent, t: number) => void) | null = null;
let noiseBuf: AudioBuffer | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let loopStart = 0; // audio time at which the current loop began
let cursor = 0; // index of the next event to schedule

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function setup(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
  } catch {
    return null;
  }
  const warmth = ctx.createBiquadFilter();
  warmth.type = 'lowpass';
  warmth.frequency.value = HSR ? 7500 : RAIL ? 5200 : MERLION ? 6000 : 3800;
  const comp = ctx.createDynamicsCompressor();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(warmth).connect(comp).connect(ctx.destination);
  flBus = ctx.createGain();
  flBus.gain.value = 0;
  flBus.connect(comp);
  fleetBus = ctx.createGain();
  fleetBus.gain.value = 0;
  fleetBus.connect(comp);
  egwBus = ctx.createGain();
  egwBus.gain.value = 0;
  egwBus.connect(comp);
  if (HSR) {
    // dotted-eighth echo, darker on every repeat
    echo = ctx.createGain();
    const delay = ctx.createDelay(1), tone = ctx.createBiquadFilter(), feedback = ctx.createGain();
    delay.delayTime.value = secPerBeat * 0.75;
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    feedback.gain.value = 0.32;
    echo.connect(delay).connect(tone).connect(master);
    tone.connect(feedback).connect(delay);
  }
  if (RAIL) {
    room = ctx.createGain();
    const delay = ctx.createDelay(1), tone = ctx.createBiquadFilter(), feedback = ctx.createGain();
    delay.delayTime.value = 0.11;
    tone.type = 'lowpass';
    tone.frequency.value = 1800;
    feedback.gain.value = 0.28;
    room.connect(delay).connect(tone).connect(master);
    tone.connect(feedback).connect(delay);
  }
  noiseBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.15), ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  if (MERLION) {
    // an open, airy room: a longer, darker slap-back for the bells and the metallophone
    const roomIn = ctx.createGain(), delay = ctx.createDelay(1), tone = ctx.createBiquadFilter(), feedback = ctx.createGain();
    delay.delayTime.value = 0.21;
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    feedback.gain.value = 0.32;
    roomIn.connect(delay).connect(tone).connect(master);
    tone.connect(feedback).connect(delay);
    merlionVoice = createMerlionVoices({ ctx, out: master, room: roomIn, secPerBeat, noise: noiseBuf });
  }
  {
    // a dark hall echo for the horns and drums
    const hall = ctx.createGain(), delay = ctx.createDelay(1), tone = ctx.createBiquadFilter(), feedback = ctx.createGain();
    delay.delayTime.value = 0.27;
    tone.type = 'lowpass';
    tone.frequency.value = 1600;
    feedback.gain.value = 0.3;
    hall.connect(delay).connect(tone).connect(flBus);
    tone.connect(feedback).connect(delay);
    flVoice = createFrontlineVoices({ ctx, out: flBus, room: hall, secPerBeat: flSecPerBeat, noise: noiseBuf });
  }
  {
    // a long, dark echo for the sonar and the cello (Fleet)
    const room = ctx.createGain(), delay = ctx.createDelay(1), tone = ctx.createBiquadFilter(), feedback = ctx.createGain();
    delay.delayTime.value = 0.51;
    tone.type = 'lowpass';
    tone.frequency.value = 1900;
    feedback.gain.value = 0.42;
    room.connect(delay).connect(tone).connect(fleetBus);
    tone.connect(feedback).connect(delay);
    fleetVoice = createFleetVoices({ ctx, out: fleetBus, room, secPerBeat: fleetSecPerBeat, noise: noiseBuf });
  }
  {
    // a warm, short slap-back echo for the lute and the flute (Egyptian War)
    const room = ctx.createGain(), delay = ctx.createDelay(1), tone = ctx.createBiquadFilter(), feedback = ctx.createGain();
    delay.delayTime.value = egwSecPerBeat * 0.75;
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    feedback.gain.value = 0.3;
    room.connect(delay).connect(tone).connect(egwBus);
    tone.connect(feedback).connect(delay);
    egwVoice = createEgyptianVoices({ ctx, out: egwBus, room, secPerBeat: egwSecPerBeat, noise: noiseBuf });
  }
  return ctx;
}

function env(g: GainNode, t: number, peak: number, attack: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function chug(t: number, accent: boolean) {
  const a = ctx!, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf;
  f.type = 'bandpass';
  f.frequency.value = accent ? 750 : 1200;
  f.Q.value = 0.9;
  env(g, t, accent ? 0.11 : 0.05, 0.004, 0.09);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.12);
}

function bass(t: number, midi: number, dur: number) {
  const a = ctx!, o = a.createOscillator(), g = a.createGain();
  o.type = 'triangle';
  o.frequency.value = hz(midi);
  env(g, t, 0.16, 0.01, dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** honky-tonk piano stab: two slightly detuned sines per note, quick decay */
function chord(t: number, midis: number[]) {
  const a = ctx!;
  for (const m of midis) {
    for (const detune of [-6, 6]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine';
      o.frequency.value = hz(m);
      o.detune.value = detune;
      env(g, t, 0.022, 0.005, 0.32);
      o.connect(g).connect(master!);
      o.start(t);
      o.stop(t + 0.36);
    }
  }
}

/** reedy harmonica-ish lead: filtered square + saw with gentle vibrato */
function melody(t: number, midi: number, dur: number) {
  const a = ctx!, f = a.createBiquadFilter(), g = a.createGain(), vib = a.createOscillator(), vibAmt = a.createGain();
  f.type = 'lowpass';
  f.frequency.value = 1900;
  f.Q.value = 2;
  vib.frequency.value = 5.2;
  vibAmt.gain.value = 9;
  vib.connect(vibAmt);
  const len = Math.max(0.12, dur - 0.04);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.04);
  g.gain.setValueAtTime(0.05, t + len * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  for (const type of ['square', 'sawtooth'] as const) {
    const o = a.createOscillator();
    o.type = type;
    o.frequency.value = hz(midi);
    vibAmt.connect(o.detune);
    o.connect(f);
    o.start(t);
    o.stop(t + len + 0.05);
  }
  f.connect(g).connect(master!);
  vib.start(t);
  vib.stop(t + len + 0.05);
}

/** far-off two-tone steam whistle with a slow swell */
function whistle(t: number) {
  const a = ctx!, f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 1.2;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.035, t + 0.35);
  g.gain.setValueAtTime(0.035, t + 1.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
  for (const m of [74, 78, 81]) {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz(m) * 0.97, t);
    o.frequency.linearRampToValueAtTime(hz(m), t + 0.3);
    o.connect(f);
    o.start(t);
    o.stop(t + 2.2);
  }
  f.connect(g).connect(master!);
}

// --- the HSR tune's voices ----------------------------------------------------------------

/** soft synth pad: detuned saws through a low-pass, slow fade in and out so chords melt into each other */
function pad(t: number, midis: number[], dur: number) {
  const a = ctx!, f = a.createBiquadFilter(), pre = a.createGain(), g = a.createGain();
  f.type = 'lowpass';
  f.frequency.value = 1300;
  pre.gain.value = 0.15;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.9);
  g.gain.setValueAtTime(0.07, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.0);
  for (const m of midis) {
    for (const detune of [-7, 7]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      o.detune.value = detune;
      o.connect(pre);
      o.start(t);
      o.stop(t + dur + 1.1);
    }
  }
  pre.connect(f).connect(g).connect(master!);
}

/** round sub bass: a sine with a little second harmonic so small speakers still hear it */
function sub(t: number, midi: number, dur: number) {
  const a = ctx!, g = a.createGain();
  env(g, t, 0.15, 0.012, dur);
  for (const [mult, level] of [[1, 1], [2, 0.22]] as const) {
    const o = a.createOscillator(), og = a.createGain();
    o.type = 'sine';
    o.frequency.value = hz(midi) * mult;
    og.gain.value = level;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  g.connect(master!);
}

/** guzheng-like pluck: bright saw + triangle through a low-pass that closes fast; the lead bends in from below */
function pluck(t: number, midi: number, beats: number, vel: number, role: 'lead' | 'run' | 'arp') {
  const a = ctx!, f = a.createBiquadFilter(), g = a.createGain();
  const ring = role === 'lead' ? Math.min(1.9, Math.max(0.7, beats * secPerBeat + 0.45)) : role === 'run' ? 0.6 : 0.45;
  f.type = 'lowpass';
  f.Q.value = 1;
  f.frequency.setValueAtTime(role === 'arp' ? 3000 : 5200, t);
  f.frequency.exponentialRampToValueAtTime(1000, t + 0.28);
  env(g, t, 0.085 * vel, 0.006, ring);
  for (const [type, level, cents] of [['sawtooth', 0.5, 4], ['triangle', 0.8, -4]] as const) {
    const o = a.createOscillator(), og = a.createGain();
    o.type = type;
    o.frequency.value = hz(midi);
    if (role !== 'arp') {
      o.detune.setValueAtTime(cents - (role === 'lead' ? 90 : 35), t);
      o.detune.linearRampToValueAtTime(cents, t + 0.07);
    } else o.detune.value = cents;
    og.gain.value = level;
    o.connect(og).connect(f);
    o.start(t);
    o.stop(t + ring + 0.05);
  }
  f.connect(g);
  g.connect(master!);
  if (echo) {
    const send = a.createGain();
    send.gain.value = role === 'arp' ? 0.15 : 0.4;
    g.connect(send).connect(echo);
  }
}

/** soft kick: a sine dropping in pitch */
function kick(t: number) {
  const a = ctx!, o = a.createOscillator(), g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(125, t);
  o.frequency.exponentialRampToValueAtTime(46, t + 0.14);
  env(g, t, 0.2, 0.006, 0.24);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + 0.28);
}

function hat(t: number, accent: boolean) {
  const a = ctx!, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf;
  f.type = 'highpass';
  f.frequency.value = 7500;
  env(g, t, accent ? 0.028 : 0.014, 0.006, accent ? 0.07 : 0.045);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.1);
}

/** a soft wooden rim tick */
function rim(t: number) {
  const a = ctx!, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), o = a.createOscillator(), og = a.createGain();
  src.buffer = noiseBuf;
  f.type = 'bandpass';
  f.frequency.value = 1900;
  f.Q.value = 4;
  env(g, t, 0.06, 0.006, 0.07);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.1);
  o.type = 'sine';
  o.frequency.value = 820;
  env(og, t, 0.035, 0.006, 0.06);
  o.connect(og).connect(master!);
  o.start(t);
  o.stop(t + 0.09);
}

// --- the rail (musette waltz) tune's voices ------------------------------------------------

/** Send a voice into the café room as well as straight to the master. */
function toMaster(g: AudioNode, roomLevel: number) {
  g.connect(master!);
  if (room && roomLevel > 0) {
    const send = ctx!.createGain();
    send.gain.value = roomLevel;
    g.connect(send).connect(room);
  }
}

/**
 * Accordion lead in musette tuning: three reeds, one in tune and two about 13 cents either side, whose beating
 * gives the warm wobbling tremolo. Saws through a nasal mid peak and a low-pass; the bellows swell in and ease off.
 */
function reed(t: number, midi: number, dur: number, vel: number) {
  const a = ctx!, nasal = a.createBiquadFilter(), f = a.createBiquadFilter(), g = a.createGain();
  nasal.type = 'peaking';
  nasal.frequency.value = 1250;
  nasal.Q.value = 1.1;
  nasal.gain.value = 5;
  f.type = 'lowpass';
  f.frequency.value = 2600;
  f.Q.value = 0.6;
  const len = Math.max(0.14, dur - 0.035);
  const peak = 0.03 * vel;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.035);
  g.gain.linearRampToValueAtTime(peak * 0.86, t + Math.max(0.05, len * 0.75));
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  for (const [cents, lvl] of [[0, 1], [-13, 0.7], [13, 0.7]] as const) {
    const o = a.createOscillator(), og = a.createGain();
    o.type = 'sawtooth';
    o.frequency.value = hz(midi);
    o.detune.value = cents;
    og.gain.value = lvl;
    o.connect(og).connect(nasal);
    o.start(t);
    o.stop(t + len + 0.05);
  }
  nasal.connect(f).connect(g);
  toMaster(g, 0.35);
}

/** The "oom": a round, plucked-bass-like note (triangle plus a little octave so small speakers hear it). */
function oom(t: number, midi: number, dur: number) {
  const a = ctx!, g = a.createGain();
  env(g, t, 0.15, 0.012, dur);
  for (const [mult, lvl] of [[1, 1], [2, 0.3]] as const) {
    const o = a.createOscillator(), og = a.createGain();
    o.type = mult === 1 ? 'triangle' : 'sine';
    o.frequency.value = hz(midi) * mult;
    og.gain.value = lvl;
    o.connect(og).connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  toMaster(g, 0.1);
}

/** The "pah": a short, soft left-hand accordion chord, detuned saws through a darker low-pass. */
function pah(t: number, midis: number[]) {
  const a = ctx!, f = a.createBiquadFilter(), g = a.createGain();
  f.type = 'lowpass';
  f.frequency.value = 1500;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.022, t + 0.015);
  g.gain.linearRampToValueAtTime(0.016, t + 0.14);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  for (const m of midis) {
    for (const detune of [-8, 8]) {
      const o = a.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = hz(m);
      o.detune.value = detune;
      o.connect(f);
      o.start(t);
      o.stop(t + 0.28);
    }
  }
  f.connect(g);
  toMaster(g, 0.2);
}

/** A soft brush stroke on the snare: high band of noise with a slow-ish swish attack. */
function brush(t: number, accent: boolean) {
  const a = ctx!, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf;
  f.type = 'bandpass';
  f.frequency.value = accent ? 3800 : 5200;
  f.Q.value = 0.7;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(accent ? 0.035 : 0.022, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (accent ? 0.14 : 0.09));
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 0.15);
}

/** A quiet, high pizzicato note: a triangle with a quick pluck decay. */
function pizz(t: number, midi: number, vel: number) {
  const a = ctx!, f = a.createBiquadFilter(), g = a.createGain(), o = a.createOscillator();
  f.type = 'lowpass';
  f.frequency.value = 3200;
  env(g, t, 0.03 * vel, 0.005, 0.32);
  o.type = 'triangle';
  o.frequency.value = hz(midi);
  o.connect(f).connect(g);
  toMaster(g, 0.4);
  o.start(t);
  o.stop(t + 0.36);
}

function play(e: AnyEvent, t: number) {
  if (track === 'frontline') return flVoice?.(e as FrontlineEvent, t);
  if (track === 'fleet') return fleetVoice?.(e as FleetEvent, t);
  if (track === 'egyptian') return egwVoice?.(e as EgyptianEvent, t);
  if (merlionVoice) return merlionVoice(e as MerlionEvent, t);
  const m = e as MainEvent;
  switch (m.kind) {
    case 'chug': return chug(t, m.accent);
    case 'bass': return bass(t, m.midi, m.beats * secPerBeat);
    case 'chord': return chord(t, m.midis);
    case 'melody': return melody(t, m.midi, m.beats * secPerBeat);
    case 'whistle': return whistle(t);
    case 'pad': return pad(t, m.midis, m.beats * secPerBeat);
    case 'sub': return sub(t, m.midi, m.beats * secPerBeat);
    case 'pluck': return pluck(t, m.midi, m.beats, m.vel, m.role);
    case 'kick': return kick(t);
    case 'hat': return hat(t, m.accent);
    case 'rim': return rim(t);
    case 'reed': return reed(t, m.midi, m.beats * secPerBeat, m.vel);
    case 'oom': return oom(t, m.midi, m.beats * secPerBeat);
    case 'pah': return pah(t, m.midis);
    case 'brush': return brush(t, m.accent);
    case 'pizz': return pizz(t, m.midi, m.vel);
  }
}

function tick() {
  if (!ctx) return;
  const horizon = ctx.currentTime + LOOKAHEAD_S;
  const { song, spb } = cur();
  for (;;) {
    if (cursor >= song.events.length) {
      cursor = 0;
      loopStart += song.beats * spb;
    }
    const e = song.events[cursor];
    const t = loopStart + e.beat * spb;
    if (t > horizon) break;
    if (t >= ctx.currentTime - 0.05) play(e, t);
    cursor++;
  }
}

function start() {
  if (window.location.pathname.startsWith('/warfront')) return; // Warfront: its own score
  if (window.location.pathname.startsWith('/kingdom')) return; // Kingdom: its own score
  if (window.location.pathname.startsWith('/blocky')) return; // Blocky: its own score
  const a = setup();
  if (!a || timer) return;
  if (a.state === 'suspended') void a.resume();
  track = trackHere();
  loopStart = a.currentTime + 0.1;
  cursor = 0;
  bus().gain.cancelScheduledValues(a.currentTime);
  bus().gain.setValueAtTime(0.0001, a.currentTime);
  bus().gain.exponentialRampToValueAtTime(level(), a.currentTime + 2.5);
  timer = setInterval(tick, TICK_MS);
  tick();
}

/** The music's loudness at the current volume and mute setting (never exactly 0: gain ramps need a positive value). */
let ducked = false;
const level = () => (getMuted() || ducked ? 0.0001 : Math.max(0.0001, cur().volume * getVolume()));
/** The gain of the track that is playing. */
const bus = () => (track === 'frontline' ? flBus : track === 'fleet' ? fleetBus : track === 'egyptian' ? egwBus : master)!;

/**
 * Silence the soundtrack for a while (the enter-the-game curtain plays its own cue): fades out quickly,
 * and back in slowly when released. Playback keeps running underneath, so nothing restarts.
 */
export function duckMusic(on: boolean) {
  if (ducked === on) return;
  ducked = on;
  if (!ctx || !timer || !master) return;
  bus().gain.cancelScheduledValues(ctx.currentTime);
  bus().gain.setTargetAtTime(level(), ctx.currentTime, on ? 0.12 : 1.1);
}

// Follow the volume slider and the mute button while playing.
const follow = () => {
  if (!ctx || !timer || !master) return;
  bus().gain.cancelScheduledValues(ctx.currentTime);
  bus().gain.setTargetAtTime(level(), ctx.currentTime, 0.05);
};
subscribeVolume(follow);
subscribeMuted(follow);

function stop() {
  if (!ctx || !timer) return;
  clearInterval(timer);
  timer = null;
  bus().gain.cancelScheduledValues(ctx.currentTime);
  bus().gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
}

// Entering or leaving Frontline or Fleet swaps the track (a quick crossfade between the buses).
// The edition picker (/) chooses a game first, so music waits until a game's screens open.
let armed = false;
// Warfront (/warfront/...) plays its own score (warfront/music.ts), so the soundtrack rests there too.
const onPicker = () => window.location.pathname === '/' || window.location.pathname.startsWith('/warfront') || window.location.pathname.startsWith('/kingdom') || window.location.pathname.startsWith('/blocky'); // Kingdom, Blocky: their own scores too
onNavigate(() => {
  if (!armed || !enabled) return;
  if (onPicker()) stop();
  else if (!timer) start();
  else if (trackHere() !== track) { stop(); start(); }
});

export function setMusicOn(on: boolean) {
  enabled = on;
  save(KEY, on);
  if (on) start();
  else stop();
  listeners.forEach((l) => l());
}

export function useMusicOn(): boolean {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => enabled);
}

/** Begin playback after the first user gesture, if music is switched on. */
export function initMusic() {
  const kick = () => {
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('keydown', kick);
    armed = true;
    if (enabled && !onPicker()) start();
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
}
