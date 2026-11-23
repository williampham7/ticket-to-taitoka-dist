import { describe, expect, it } from 'vitest';
import {
  BEATS_PER_BAR_MERLION, BPM_MERLION, buildSongMerlion, createMerlionVoices, PENTATONIC, SECTIONS_MERLION, VOLUME_MERLION,
} from './songMerlion';
import { fakeAudioContext } from './fakeAudio.testutil';
import { OfflineCtx } from './offlineAudio.testutil';

const song = buildSongMerlion();

describe('Singapore evening song (merlion theme)', () => {
  it('is in 4/4 at a relaxed tempo and loops after 90-160 seconds', () => {
    expect(BEATS_PER_BAR_MERLION).toBe(4);
    expect(BPM_MERLION).toBeGreaterThanOrEqual(80);
    expect(BPM_MERLION).toBeLessThanOrEqual(100);
    const seconds = (song.beats * 60) / BPM_MERLION;
    expect(seconds).toBeGreaterThanOrEqual(90);
    expect(seconds).toBeLessThanOrEqual(160);
    expect(VOLUME_MERLION).toBeGreaterThan(0);
  });

  it('every lead bar adds up to exactly one bar, and every lead is as long as its chords', () => {
    for (const s of SECTIONS_MERLION) {
      if (!s.lead) continue;
      expect(s.lead.length, s.name).toBe(s.chords.length);
      s.lead.forEach((b, i) => expect(b.reduce((n, [, beats]) => n + beats, 0), `${s.name} bar ${i}`).toBeCloseTo(4, 6));
    }
  });

  it('is deterministic, in time order, finite and inside one loop', () => {
    expect(buildSongMerlion()).toEqual(song);
    let prev = 0;
    for (const e of song.events) {
      expect(Number.isFinite(e.beat)).toBe(true);
      expect(e.beat).toBeGreaterThanOrEqual(prev);
      expect(e.beat).toBeLessThan(song.beats);
      prev = e.beat;
    }
  });

  it('keeps the lead pentatonic (C major pentatonic, plus the F of the bridge and the B of phrase 4) and in a singable range', () => {
    const allowed = [...PENTATONIC, 5, 11];
    for (const e of song.events) {
      if (e.kind !== 'bell') continue;
      expect(allowed).toContain(e.midi % 12);
      expect(e.midi).toBeGreaterThanOrEqual(70);
      expect(e.midi).toBeLessThanOrEqual(100);
    }
    for (const e of song.events) if (e.kind === 'gamelan') expect(PENTATONIC).toContain(e.midi % 12);
  });

  it('does not repeat itself: the three A sections differ, and every bar has a pad and bass', () => {
    const lead = (name: string) => JSON.stringify(SECTIONS_MERLION.find((s) => s.name === name)!.lead);
    expect(new Set([lead('A'), lead('A2'), lead('A3')]).size).toBe(3);
    for (let b = 0; b < song.bars; b++) {
      const at = b * 4;
      expect(song.events.some((e) => e.kind === 'pad' && e.beat === at), `pad ${b}`).toBe(true);
      expect(song.events.some((e) => e.kind === 'bass' && e.beat === at), `bass ${b}`).toBe(true);
    }
  });

  it('has the band: bells, gamelan, kompang, shaker, bass and pad, and ends on the dominant', () => {
    expect(new Set(song.events.map((e) => e.kind))).toEqual(new Set(['bell', 'gamelan', 'bass', 'pad', 'kompang', 'shaker']));
    expect(SECTIONS_MERLION.at(-1)!.chords.at(-1)).toBe('G');
  });

  it('every voice schedules only finite values and positive exponential ramps', () => {
    const f = fakeAudioContext();
    const noise = f.ctx.createBuffer(1, 100, 48000);
    const play = createMerlionVoices({ ctx: f.ctx, out: f.ctx.destination, room: f.ctx.destination, secPerBeat: 60 / BPM_MERLION, noise });
    song.events.forEach((e) => play(e, e.beat * (60 / BPM_MERLION)));
    expect(f.problems).toEqual([]);
    expect(f.voices()).toBeGreaterThan(song.events.length);
  });

  it('renders offline at the same loudness as the other tunes, evenly, with no clipping', () => {
    const SR = 8000, spb = 60 / BPM_MERLION;
    const c = new OfflineCtx(SR);
    const noise = c.createBuffer(1, Math.ceil(SR * 0.15));
    for (let i = 0; i < noise.data.length; i++) noise.data[i] = Math.random() * 2 - 1;
    const play = createMerlionVoices({ ctx: c as unknown as BaseAudioContext, out: c.destination as unknown as AudioNode, room: null as unknown as AudioNode, secPerBeat: spb, noise: noise as unknown as AudioBuffer });
    for (const e of song.events) play(e, e.beat * spb);
    const pcm = c.render(song.beats * spb);
    const rms = (from: number, to: number) => {
      let s = 0;
      for (let i = from; i < to; i++) s += pcm[i] * pcm[i];
      return Math.sqrt(s / Math.max(1, to - from));
    };
    let peak = 0;
    for (const v of pcm) { expect(Number.isFinite(v)).toBe(true); peak = Math.max(peak, Math.abs(v)); }
    const total = rms(0, pcm.length) * VOLUME_MERLION;
    // vintage renders at about 0.03, HSR, rail and bay were levelled to about 0.027 (see music.ts)
    expect(total).toBeGreaterThan(0.022);
    expect(total).toBeLessThan(0.033);
    expect(peak * VOLUME_MERLION).toBeLessThan(0.5);
    // no silent or blaring bar: every bar within a factor of 3 of the median
    const barLen = Math.round(BEATS_PER_BAR_MERLION * spb * SR);
    const bars = Array.from({ length: song.bars }, (_, b) => rms(b * barLen, Math.min(pcm.length, (b + 1) * barLen)));
    const median = [...bars].sort((x, y) => x - y)[bars.length >> 1];
    bars.forEach((r, b) => {
      expect(r, `bar ${b + 1}`).toBeGreaterThan(median / 3);
      expect(r, `bar ${b + 1}`).toBeLessThan(median * 3);
    });
  }, 60_000);
});
