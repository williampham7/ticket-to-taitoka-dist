import type { Note } from './song';

/**
 * "Café de la Gare" — an original musette waltz for the European "rail" theme (Ticket to Europa).
 * G major with a B section in the relative minor (E minor), 3/4 at 132 BPM: an accordion-like reedy lead,
 * oom-pah-pah (bass on 1, short chord stabs on 2 and 3), a soft brush on every beat and, in the last time
 * through the tune, a quiet high pizzicato sparkle. 60 bars, about 82 s before it loops.
 * Pure data like song.ts; the player in music.ts turns the events into Web Audio voices.
 */
export const BPM_RAIL = 132;
export const BEATS_PER_BAR_RAIL = 3;

export type RailEvent =
  /** the accordion lead. `vel` 0-1 scales loudness. */
  | { kind: 'reed'; beat: number; midi: number; beats: number; vel: number }
  /** the "oom": a round bass note on the downbeat */
  | { kind: 'oom'; beat: number; midi: number; beats: number }
  /** a "pah": a short left-hand accordion chord stab */
  | { kind: 'pah'; beat: number; midis: number[] }
  /** a soft brush swish on the snare; the downbeat one is a little longer */
  | { kind: 'brush'; beat: number; accent: boolean }
  /** a quiet high pizzicato note */
  | { kind: 'pizz'; beat: number; midi: number; vel: number };

export interface RailSong { events: RailEvent[]; bars: number; beats: number }

type Chord = 'G' | 'G7' | 'Em' | 'Am' | 'C' | 'Cm' | 'D7' | 'B7';

/** Left-hand chord stabs (mid register) and the bass: the root, then the fifth on the next bar of the same chord. */
export const PAH: Record<Chord, number[]> = {
  G: [55, 59, 62],
  G7: [53, 59, 62],
  Em: [55, 59, 64],
  Am: [57, 60, 64],
  C: [55, 60, 64],
  Cm: [55, 60, 63],
  D7: [54, 57, 60],
  B7: [54, 57, 63],
};
const OOM: Record<Chord, [number, number]> = {
  G: [43, 38], G7: [43, 38], Em: [40, 47], Am: [45, 40], C: [48, 43], Cm: [48, 43], D7: [38, 45], B7: [47, 42],
};

/** The tune: two eight-bar phrases, the first ending on the dominant, the second at home. */
const A: Note[][] = [
  [[74, 2], [71, 0.5], [72, 0.5]],
  [[74, 1], [79, 1], [78, 1]],
  [[76, 2], [72, 1]],
  [[72, 1.5], [71, 0.5], [69, 1]],
  [[78, 2], [76, 0.5], [74, 0.5]],
  [[72, 1], [76, 1], [74, 1]],
  [[71, 1], [67, 1], [71, 1]],
  [[74, 2], [null, 1]],
  [[74, 2], [71, 0.5], [72, 0.5]],
  [[74, 1], [79, 1], [77, 1]],
  [[76, 2], [79, 1]],
  [[75, 2], [72, 1]],
  [[71, 1.5], [74, 0.5], [79, 1]],
  [[78, 1], [76, 1], [72, 1]],
  [[74, 1.5], [72, 0.5], [69, 1]],
  [[67, 2], [null, 1]],
];
const A_CHORDS: Chord[] = ['G', 'G', 'Am', 'D7', 'D7', 'D7', 'G', 'D7', 'G', 'G7', 'C', 'Cm', 'G', 'D7', 'D7', 'G'];

/** The wistful middle, in E minor, climbing a little higher and turning back to D7 for the tune's return. */
const B: Note[][] = [
  [[71, 1], [76, 1], [79, 1]],
  [[83, 2], [81, 0.5], [79, 0.5]],
  [[78, 2], [75, 1]],
  [[81, 1.5], [79, 0.5], [78, 1]],
  [[75, 1], [78, 1], [81, 1]],
  [[83, 2], [81, 1]],
  [[79, 1], [78, 1], [76, 1]],
  [[76, 2], [null, 1]],
  [[72, 1], [76, 1], [81, 1]],
  [[84, 2], [83, 0.5], [81, 0.5]],
  [[79, 2], [76, 1]],
  [[71, 1], [76, 1], [79, 1]],
  [[81, 2], [79, 0.5], [76, 0.5]],
  [[78, 1.5], [81, 0.5], [78, 1]],
  [[76, 2], [71, 1]],
  [[69, 1], [72, 1], [78, 1]],
];
const B_CHORDS: Chord[] = ['Em', 'Em', 'B7', 'B7', 'B7', 'B7', 'Em', 'Em', 'Am', 'Am', 'Em', 'Em', 'C', 'B7', 'Em', 'D7'];

/** A quiet goodbye that settles on D7, so the loop leans back into the intro. */
const CODA: Note[][] = [
  [[79, 2], [78, 0.5], [76, 0.5]],
  [[74, 2], [71, 1]],
  [[72, 2], [76, 1]],
  [[74, 3]],
  [[71, 2], [72, 0.5], [71, 0.5]],
  [[76, 2], [72, 1]],
  [[72, 1], [69, 1], [72, 1]],
  [[74, 2], [null, 1]],
];
const CODA_CHORDS: Chord[] = ['G', 'Em', 'Am', 'D7', 'G', 'C', 'Am', 'D7'];

export const MELODY_RAIL = { A, B, CODA };
/** G major, as pitch classes (C = 0). */
export const G_MAJOR_PITCH_CLASSES = [7, 9, 11, 0, 2, 4, 6];
/** The only notes the lead plays outside G major: F natural (over G7) and E flat / D sharp (over Cm and B7). */
export const COLOUR_PITCH_CLASSES = [5, 3];

interface Section {
  name: string;
  chords: Chord[];
  lead?: Note[][];
  /** lead loudness */
  vel?: number;
  /** brushes on every beat ('full') or only on the downbeat ('light') */
  brush: 'full' | 'light';
  /** a quiet high pizzicato broken chord in every bar */
  pizz?: boolean;
}

export const SECTIONS_RAIL: Section[] = [
  { name: 'intro', chords: ['G', 'Em', 'Am', 'D7'], brush: 'light' },
  { name: 'A', chords: A_CHORDS, lead: A, vel: 1, brush: 'full' },
  { name: 'B', chords: B_CHORDS, lead: B, vel: 0.95, brush: 'full' },
  { name: 'A2', chords: A_CHORDS, lead: A, vel: 1, brush: 'full', pizz: true },
  { name: 'coda', chords: CODA_CHORDS, lead: CODA, vel: 0.8, brush: 'light' },
];

/** pizzicato order through the stab's three notes, two octaves up: a little rising-and-turning figure */
const PIZZ_ORDER = [0, 1, 2, 1];

export function buildSongRail(): RailSong {
  const events: RailEvent[] = [];
  let bar = 0;
  for (const s of SECTIONS_RAIL) {
    let held = 0; // how many bars the current chord has already lasted
    s.chords.forEach((chord, i) => {
      const start = (bar + i) * BEATS_PER_BAR_RAIL;
      held = s.chords[i - 1] === chord ? held + 1 : 0;
      // root on the first bar of a chord, then alternate with the other bass note while the chord carries on
      const bassNote = OOM[chord][held % 2];
      events.push({ kind: 'oom', beat: start, midi: bassNote, beats: 0.9 });
      events.push({ kind: 'pah', beat: start + 1, midis: PAH[chord] });
      events.push({ kind: 'pah', beat: start + 2, midis: PAH[chord] });
      events.push({ kind: 'brush', beat: start, accent: true });
      if (s.brush === 'full') {
        events.push({ kind: 'brush', beat: start + 1, accent: false });
        events.push({ kind: 'brush', beat: start + 2, accent: false });
      }
      if (s.pizz) {
        PIZZ_ORDER.forEach((k, n) => events.push({ kind: 'pizz', beat: start + 0.5 + n * 0.5, midi: PAH[chord][k] + 24, vel: n === 0 ? 0.9 : 0.7 }));
      }
      if (s.lead) {
        let t = start;
        for (const [midi, beats] of s.lead[i]) {
          if (midi !== null) events.push({ kind: 'reed', beat: t, midi, beats, vel: s.vel ?? 1 });
          t += beats;
        }
      }
    });
    bar += s.chords.length;
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, bars: bar, beats: bar * BEATS_PER_BAR_RAIL };
}
