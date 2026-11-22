import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, buildSong, MELODY } from './song';
import { BPM_HSR, buildSongHsr, GONG_PITCH_CLASSES, MELODY_HSR, SECTIONS_HSR } from './songHsr';

describe('background tune', () => {
  it('every melody bar adds up to exactly one bar', () => {
    for (const [name, bars] of Object.entries(MELODY)) {
      bars.forEach((bar, i) => {
        const beats = bar.reduce((s, [, dur]) => s + dur, 0);
        expect(beats, `${name} bar ${i + 1}`).toBe(BEATS_PER_BAR);
      });
    }
  });

  it('loops through intro, A, B, A and an instrumental break', () => {
    const song = buildSong();
    expect(song.bars).toBe(4 + 8 + 8 + 8 + 8);
    expect(song.beats).toBe(song.bars * BEATS_PER_BAR);
  });

  it('events are in time order and stay inside one loop', () => {
    const { events, beats } = buildSong();
    for (let i = 1; i < events.length; i++) expect(events[i].beat).toBeGreaterThanOrEqual(events[i - 1].beat);
    for (const e of events) {
      expect(e.beat).toBeGreaterThanOrEqual(0);
      expect(e.beat).toBeLessThan(beats);
    }
  });

  it('keeps a steady rail rhythm: two chugs on every beat', () => {
    const { events, beats } = buildSong();
    expect(events.filter((e) => e.kind === 'chug')).toHaveLength(beats * 2);
  });

  it('has a melody only in the A and B sections, and a whistle in the break', () => {
    const { events } = buildSong();
    const melodyBars = new Set(events.filter((e) => e.kind === 'melody').map((e) => Math.floor(e.beat / BEATS_PER_BAR)));
    for (const bar of melodyBars) expect(bar >= 4 && bar < 28).toBe(true);
    const whistles = events.filter((e) => e.kind === 'whistle');
    expect(whistles.length).toBeGreaterThan(0);
    for (const w of whistles) expect(w.beat).toBeGreaterThanOrEqual(28 * BEATS_PER_BAR);
  });
});

describe('modern high-speed-rail tune', () => {
  const song = buildSongHsr();
  const sum = (bar: [number | null, number][]) => bar.reduce((s, [, d]) => s + d, 0);
  const lead = song.events.filter((e) => e.kind === 'pluck' && e.role === 'lead');

  it('runs at a mid tempo', () => {
    expect(BPM_HSR).toBeGreaterThanOrEqual(96);
    expect(BPM_HSR).toBeLessThanOrEqual(108);
  });

  it('every melody bar adds up to exactly one bar', () => {
    for (const [name, bars] of Object.entries(MELODY_HSR)) {
      bars.forEach((bar, i) => expect(sum(bar), `${name} bar ${i + 1}`).toBe(BEATS_PER_BAR));
    }
  });

  it('has at least three distinct sections and 32 bars before it loops', () => {
    expect(song.bars).toBeGreaterThanOrEqual(32);
    expect(song.bars).toBe(SECTIONS_HSR.reduce((n, s) => n + s.chords.length, 0));
    expect(song.beats).toBe(song.bars * BEATS_PER_BAR);
    expect(new Set(SECTIONS_HSR.map((s) => s.lead)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(SECTIONS_HSR.map((s) => s.chords.join())).size).toBeGreaterThanOrEqual(3);
    for (const s of SECTIONS_HSR) if (s.lead) expect(s.lead).toHaveLength(s.chords.length);
  });

  it('events are in time order and stay inside one loop', () => {
    for (let i = 1; i < song.events.length; i++) expect(song.events[i].beat).toBeGreaterThanOrEqual(song.events[i - 1].beat);
    for (const e of song.events) {
      expect(e.beat).toBeGreaterThanOrEqual(0);
      expect(e.beat).toBeLessThan(song.beats);
      if ('beats' in e) expect(e.beat + e.beats, e.kind).toBeLessThanOrEqual(song.beats + 1e-9);
    }
  });

  it('loops seamlessly: ends on the dominant chord and restarts on the home chord, with the rhythm unbroken', () => {
    const pads = song.events.filter((e) => e.kind === 'pad');
    expect(pads[0].beat).toBe(0);
    const last = pads[pads.length - 1];
    expect(last.beat + (last as { beats: number }).beats).toBe(song.beats);
    expect(SECTIONS_HSR[0].chords[0]).toBe('C');
    expect(SECTIONS_HSR[SECTIONS_HSR.length - 1].chords.at(-1)).toBe('G');
    // pads never overlap or leave a gap
    for (let i = 1; i < pads.length; i++) expect(pads[i].beat).toBe(pads[i - 1].beat + (pads[i - 1] as { beats: number }).beats);
    // a bass note and an off-beat hat in every bar
    for (let bar = 0; bar < song.bars; bar++) {
      const inBar = song.events.filter((e) => Math.floor(e.beat / BEATS_PER_BAR) === bar);
      expect(inBar.some((e) => e.kind === 'sub'), `bar ${bar + 1} bass`).toBe(true);
      expect(inBar.some((e) => e.kind === 'hat'), `bar ${bar + 1} hat`).toBe(true);
    }
  });

  it('keeps the lead (and its guzheng runs) in the pentatonic gong mode', () => {
    expect(lead.length).toBeGreaterThan(100);
    const melodic = song.events.filter((e) => e.kind === 'pluck' && e.role !== 'arp');
    for (const e of melodic) {
      if (e.kind === 'pluck') expect(GONG_PITCH_CLASSES, `midi ${e.midi}`).toContain(e.midi % 12);
    }
    expect(song.events.some((e) => e.kind === 'pluck' && e.role === 'run')).toBe(true);
  });

  it('starts with an intro that has no lead, and has lead notes in the later sections', () => {
    const introBars = SECTIONS_HSR[0].chords.length;
    for (const e of lead) expect(Math.floor(e.beat / BEATS_PER_BAR)).toBeGreaterThanOrEqual(introBars);
    expect(new Set(lead.map((e) => Math.floor(e.beat / BEATS_PER_BAR))).size).toBeGreaterThan(24);
  });

  it('has light percussion: kicks, off-beat hats and rim ticks, but no steam chug or whistle', () => {
    const kinds = new Set(song.events.map((e) => e.kind));
    for (const k of ['kick', 'hat', 'rim', 'pad', 'sub', 'pluck']) expect(kinds.has(k as never), k).toBe(true);
    expect(kinds.has('chug')).toBe(false);
    expect(kinds.has('whistle')).toBe(false);
  });
});
