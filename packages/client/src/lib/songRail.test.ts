import { describe, expect, it } from 'vitest';
import {
  BEATS_PER_BAR_RAIL, BPM_RAIL, buildSongRail, COLOUR_PITCH_CLASSES, G_MAJOR_PITCH_CLASSES, MELODY_RAIL, PAH, SECTIONS_RAIL,
} from './songRail';

describe('European rail tune (musette waltz)', () => {
  const song = buildSongRail();
  const sum = (bar: [number | null, number][]) => bar.reduce((s, [, d]) => s + d, 0);
  const lead = song.events.filter((e) => e.kind === 'reed');
  const barOf = (beat: number) => Math.floor(beat / BEATS_PER_BAR_RAIL);

  it('is a waltz in 3/4 at a gentle tempo', () => {
    expect(BEATS_PER_BAR_RAIL).toBe(3);
    expect(BPM_RAIL).toBeGreaterThanOrEqual(120);
    expect(BPM_RAIL).toBeLessThanOrEqual(150);
  });

  it('loops after 60-90 seconds', () => {
    const seconds = song.beats * (60 / BPM_RAIL);
    expect(seconds).toBeGreaterThanOrEqual(60);
    expect(seconds).toBeLessThanOrEqual(90);
  });

  it('every melody bar adds up to exactly one bar', () => {
    for (const [name, bars] of Object.entries(MELODY_RAIL)) {
      bars.forEach((bar, i) => expect(sum(bar), `${name} bar ${i + 1}`).toBe(BEATS_PER_BAR_RAIL));
    }
  });

  it('has intro, A, B, A again and a coda, each lead as long as its chords', () => {
    expect(SECTIONS_RAIL.map((s) => s.name)).toEqual(['intro', 'A', 'B', 'A2', 'coda']);
    expect(song.bars).toBe(SECTIONS_RAIL.reduce((n, s) => n + s.chords.length, 0));
    expect(song.beats).toBe(song.bars * BEATS_PER_BAR_RAIL);
    for (const s of SECTIONS_RAIL) if (s.lead) expect(s.lead, s.name).toHaveLength(s.chords.length);
    expect(new Set(SECTIONS_RAIL.map((s) => s.lead)).size).toBeGreaterThanOrEqual(3);
  });

  it('events are in time order, finite, and stay inside one loop', () => {
    for (let i = 1; i < song.events.length; i++) expect(song.events[i].beat).toBeGreaterThanOrEqual(song.events[i - 1].beat);
    for (const e of song.events) {
      expect(Number.isFinite(e.beat)).toBe(true);
      expect(e.beat).toBeGreaterThanOrEqual(0);
      expect(e.beat).toBeLessThan(song.beats);
      if ('beats' in e) {
        expect(e.beats).toBeGreaterThan(0);
        expect(e.beat + e.beats, e.kind).toBeLessThanOrEqual(song.beats + 1e-9);
      }
      if ('midi' in e) expect(Number.isInteger(e.midi)).toBe(true);
      if ('vel' in e) expect(e.vel).toBeGreaterThan(0);
      if ('vel' in e) expect(e.vel).toBeLessThanOrEqual(1);
    }
  });

  it('keeps oom-pah-pah in every bar: a bass note on 1, chord stabs on 2 and 3, a brush on the downbeat', () => {
    for (let bar = 0; bar < song.bars; bar++) {
      const start = bar * BEATS_PER_BAR_RAIL;
      const inBar = song.events.filter((e) => barOf(e.beat) === bar);
      expect(inBar.filter((e) => e.kind === 'oom').map((e) => e.beat), `bar ${bar + 1} oom`).toEqual([start]);
      expect(inBar.filter((e) => e.kind === 'pah').map((e) => e.beat), `bar ${bar + 1} pah`).toEqual([start + 1, start + 2]);
      expect(inBar.some((e) => e.kind === 'brush' && e.beat === start && e.accent), `bar ${bar + 1} brush`).toBe(true);
    }
  });

  it('keeps every voice in a comfortable range', () => {
    for (const e of song.events) {
      if (e.kind === 'reed') { expect(e.midi).toBeGreaterThanOrEqual(64); expect(e.midi).toBeLessThanOrEqual(86); }
      if (e.kind === 'oom') { expect(e.midi).toBeGreaterThanOrEqual(36); expect(e.midi).toBeLessThanOrEqual(50); }
      if (e.kind === 'pizz') { expect(e.midi).toBeGreaterThanOrEqual(76); expect(e.midi).toBeLessThanOrEqual(91); }
      if (e.kind === 'pah') for (const m of e.midis) { expect(m).toBeGreaterThanOrEqual(52); expect(m).toBeLessThanOrEqual(67); }
    }
  });

  it('keeps the lead in G major, apart from the few Parisian colour notes', () => {
    expect(lead.length).toBeGreaterThan(100);
    const allowed = [...G_MAJOR_PITCH_CLASSES, ...COLOUR_PITCH_CLASSES];
    for (const e of lead) if (e.kind === 'reed') expect(allowed, `midi ${e.midi}`).toContain(e.midi % 12);
    const colour = lead.filter((e) => e.kind === 'reed' && COLOUR_PITCH_CLASSES.includes(e.midi % 12));
    expect(colour.length).toBeLessThan(lead.length * 0.1);
  });

  it('every chord stab is a real triad or seventh (no doubled or clashing notes)', () => {
    for (const [name, notes] of Object.entries(PAH)) {
      expect(new Set(notes).size, name).toBe(notes.length);
      for (let i = 1; i < notes.length; i++) expect(notes[i] - notes[i - 1], name).toBeGreaterThanOrEqual(2);
    }
  });

  it('starts with an intro without lead, adds pizzicato only on the tune’s return, and loops from D7 back to G', () => {
    const introBars = SECTIONS_RAIL[0].chords.length;
    for (const e of lead) expect(barOf(e.beat)).toBeGreaterThanOrEqual(introBars);
    const a2Start = SECTIONS_RAIL.slice(0, 3).reduce((n, s) => n + s.chords.length, 0);
    const pizz = song.events.filter((e) => e.kind === 'pizz');
    expect(pizz.length).toBeGreaterThan(0);
    for (const e of pizz) {
      expect(barOf(e.beat)).toBeGreaterThanOrEqual(a2Start);
      expect(barOf(e.beat)).toBeLessThan(a2Start + 16);
    }
    expect(SECTIONS_RAIL[0].chords[0]).toBe('G');
    expect(SECTIONS_RAIL.at(-1)!.chords.at(-1)).toBe('D7');
  });

  it('has only waltz voices: no steam chug, whistle or synth pad', () => {
    const kinds = new Set<string>(song.events.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['brush', 'oom', 'pah', 'pizz', 'reed']);
  });
});
