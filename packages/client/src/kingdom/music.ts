import { useEffect } from 'react';
import { getMuted, getVolume, subscribeMuted, subscribeVolume } from '../lib/sound';
import { useMusicOn } from '../lib/music';
import { BPM_KINGDOM, VOLUME_KINGDOM, buildSongKingdom, createKingdomVoices, type KingdomEvent } from '../lib/songKingdom';

/**
 * Plays "The Hedge-Maze Waltz" (lib/songKingdom.ts) on its own AudioContext, bus and small hall reverb, exactly
 * like Warfront's score; the main soundtrack rests on /kingdom (lib/music.ts).
 */
const song = buildSongKingdom();
const SPB = 60 / BPM_KINGDOM;
let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let play: ((e: KingdomEvent, t: number) => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let loopStart = 0, idx = 0, loops = 0;
const level = () => (getMuted() ? 0.0001 : Math.max(0.0001, VOLUME_KINGDOM * 0.55 * getVolume()));

function setup(c: AudioContext) {
  const noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  bus = c.createGain();
  const mix = c.createGain(), comp = c.createDynamicsCompressor(), verb = c.createConvolver(), wet = c.createGain();
  const n = Math.floor(c.sampleRate * 2), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3; }
  verb.buffer = ir; wet.gain.value = 0.3;
  mix.connect(bus); verb.connect(wet).connect(bus);
  bus.connect(comp).connect(c.destination);
  play = createKingdomVoices({ ctx: c, out: mix, room: verb, secPerBeat: SPB, noise });
}
function tick() {
  if (!ctx || !play) return;
  const ahead = ctx.currentTime + 0.35;
  for (;;) {
    const e = song.events[idx];
    const t = loopStart + (loops * song.beats + e.beat) * SPB;
    if (t > ahead) break;
    if (t > ctx.currentTime - 0.05) play(e, t);
    idx++;
    if (idx >= song.events.length) { idx = 0; loops++; }
  }
}
function start() {
  if (timer) return;
  try {
    if (!ctx) { ctx = new AudioContext(); setup(ctx); }
    if (ctx.state === 'suspended') void ctx.resume();
    bus!.gain.cancelScheduledValues(ctx.currentTime);
    bus!.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus!.gain.exponentialRampToValueAtTime(level(), ctx.currentTime + 2);
    loopStart = ctx.currentTime + 0.1; idx = 0; loops = 0;
    timer = setInterval(tick, 100);
  } catch { /* no audio */ }
}
function stop() {
  if (!timer || !ctx || !bus) return;
  clearInterval(timer); timer = null;
  bus.gain.cancelScheduledValues(ctx.currentTime);
  bus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2);
}

/** Plays while a Kingdom page is open, the music switch is on and the page has had a gesture. */
export function useKingdomMusic() {
  const on = useMusicOn();
  useEffect(() => {
    if (!on) { stop(); return; }
    const kick = () => start();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    const relevel = () => { if (ctx && bus && timer) bus.gain.setTargetAtTime(level(), ctx.currentTime, 0.2); };
    const u1 = subscribeVolume(relevel), u2 = subscribeMuted(relevel);
    return () => { window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); u1(); u2(); stop(); };
  }, [on]);
}
