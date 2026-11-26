import { useEffect, useSyncExternalStore } from 'react';
import { getVolume, subscribeVolume } from '../lib/sound';
import { load, save } from '../lib/storage';
import { BPM_BLOCKY, VOLUME_BLOCKY, buildSongBlocky, createBlockyVoices, type BlockyEvent } from '../lib/songBlocky';
import { isMuted } from './sound';

/**
 * Plays "Sky Isles Skip" (lib/songBlocky.ts) on its own AudioContext, bus and small reverb, exactly like
 * Kingdom's score; the main soundtrack rests on /blocky (lib/music.ts). On/off is saved under 'bly.music'; the
 * top-bar mute ('bly.muted', event 'bly-sound') and the shared volume slider set the level.
 */
const KEY = 'bly.music';
let enabled = load<boolean>(KEY, true);
const listeners = new Set<() => void>();
export const getBlockyMusicOn = () => enabled;
export function setBlockyMusicOn(on: boolean) {
  enabled = on;
  save(KEY, on);
  listeners.forEach((l) => l());
}
export function useBlockyMusicOn(): boolean {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb); }, () => enabled);
}

const song = buildSongBlocky();
const SPB = 60 / BPM_BLOCKY;
let ctx: AudioContext | null = null;
let bus: GainNode | null = null;
let play: ((e: BlockyEvent, t: number) => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let loopStart = 0, idx = 0, loops = 0;
const level = () => (isMuted() ? 0.0001 : Math.max(0.0001, VOLUME_BLOCKY * 0.55 * getVolume()));

function setup(c: AudioContext) {
  const noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  bus = c.createGain();
  const mix = c.createGain(), comp = c.createDynamicsCompressor(), verb = c.createConvolver(), wet = c.createGain();
  const n = Math.floor(c.sampleRate * 1.6), ir = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3; }
  verb.buffer = ir; wet.gain.value = 0.28;
  mix.connect(bus); verb.connect(wet).connect(bus);
  bus.connect(comp).connect(c.destination);
  play = createBlockyVoices({ ctx: c, out: mix, room: verb, secPerBeat: SPB, noise });
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

/** Plays while a Blocky page is open, the music switch is on and the page has had a gesture. */
export function useBlockyMusic() {
  const on = useBlockyMusicOn();
  useEffect(() => {
    if (!on) { stop(); return; }
    const kick = () => start();
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    const relevel = () => { if (ctx && bus && timer) bus.gain.setTargetAtTime(level(), ctx.currentTime, 0.2); };
    const u1 = subscribeVolume(relevel);
    window.addEventListener('bly-sound', relevel);
    return () => { window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); window.removeEventListener('bly-sound', relevel); u1(); stop(); };
  }, [on]);
}
