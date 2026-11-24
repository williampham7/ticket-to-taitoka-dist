import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR_EGYPTIAN, BPM_EGYPTIAN, buildSongEgyptian, createEgyptianVoices, SECTIONS_EGYPTIAN, VOLUME_EGYPTIAN } from './songEgyptian';
import { OfflineCtx } from './offlineAudio.testutil';

describe('Egyptian War music', () => {
  const song = buildSongEgyptian();

  it('is deterministic, sorted and fills every bar', () => {
    expect(buildSongEgyptian()).toEqual(song);
    expect(song.bars).toBe(SECTIONS_EGYPTIAN.reduce((s, x) => s + x.bars, 0));
    expect(song.beats).toBe(song.bars * BEATS_PER_BAR_EGYPTIAN);
    song.events.forEach((e, i) => { if (i) expect(e.beat).toBeGreaterThanOrEqual(song.events[i - 1].beat); });
    for (const e of song.events) expect(e.beat).toBeLessThan(song.beats);
    for (let b = 0; b < song.bars; b++) expect(song.events.some((e) => e.kind === 'doum' && Math.floor(e.beat / 4) === b)).toBe(true);
  });

  it('renders offline at the same loudness as the other tunes, evenly, with no clipping', () => {
    const SR = 8000, spb = 60 / BPM_EGYPTIAN;
    const c = new OfflineCtx(SR);
    const noise = c.createBuffer(1, Math.ceil(SR * 0.15));
    for (let i = 0; i < noise.data.length; i++) noise.data[i] = Math.random() * 2 - 1;
    const play = createEgyptianVoices({ ctx: c as unknown as BaseAudioContext, out: c.destination as unknown as AudioNode, room: null, secPerBeat: spb, noise: noise as unknown as AudioBuffer });
    for (const e of song.events) play(e, e.beat * spb);
    const pcm = c.render(song.beats * spb);
    const rms = (from: number, to: number) => {
      let s = 0;
      for (let i = from; i < to; i++) s += pcm[i] * pcm[i];
      return Math.sqrt(s / Math.max(1, to - from));
    };
    let peak = 0;
    for (const v of pcm) { expect(Number.isFinite(v)).toBe(true); peak = Math.max(peak, Math.abs(v)); }
    const total = rms(0, pcm.length) * VOLUME_EGYPTIAN;
    expect(total).toBeGreaterThan(0.022);
    expect(total).toBeLessThan(0.033);
    expect(peak * VOLUME_EGYPTIAN).toBeLessThan(0.5);
    const barLen = Math.round(BEATS_PER_BAR_EGYPTIAN * spb * SR);
    const bars = Array.from({ length: song.bars }, (_, b) => rms(b * barLen, Math.min(pcm.length, (b + 1) * barLen)));
    const median = [...bars].sort((x, y) => x - y)[bars.length >> 1];
    bars.forEach((r, b) => {
      expect(r, `bar ${b + 1}`).toBeGreaterThan(median / 3);
      expect(r, `bar ${b + 1}`).toBeLessThan(median * 3);
    });
  }, 60_000);
});
