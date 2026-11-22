/**
 * "Taitoka Line" — an original old-time railway tune in G major, 100 BPM.
 * Pure data: the player in music.ts turns these events into Web Audio voices.
 */
export const BPM = 100;
export const BEATS_PER_BAR = 4;

export type Note = [midi: number | null, beats: number];
type Chord = 'G' | 'C' | 'D7' | 'A7';

/** oom-pah: root on beat 1, fifth on beat 3; chord stabs on 2 and 4 */
const BASS: Record<Chord, [number, number]> = { G: [43, 50], C: [48, 43], D7: [50, 45], A7: [45, 52] };
const VOICING: Record<Chord, number[]> = { G: [55, 59, 62], C: [55, 60, 64], D7: [54, 57, 60], A7: [55, 61, 64] };

const A_CHORDS: Chord[] = ['G', 'G', 'C', 'G', 'G', 'D7', 'G', 'G'];
const B_CHORDS: Chord[] = ['C', 'C', 'G', 'G', 'A7', 'D7', 'G', 'G'];
const BREAK_CHORDS: Chord[] = ['G', 'C', 'G', 'D7', 'G', 'C', 'D7', 'G'];

export const MELODY: Record<'A' | 'B', Note[][]> = {
  A: [
    [[71, 1], [74, 1], [74, 1], [71, 1]],
    [[67, 1.5], [69, 0.5], [71, 1], [67, 1]],
    [[72, 1], [76, 1], [76, 1], [74, 1]],
    [[71, 2], [null, 1], [62, 1]],
    [[67, 1], [71, 1], [74, 1], [79, 1]],
    [[78, 1.5], [76, 0.5], [74, 1], [72, 1]],
    [[71, 1], [69, 0.5], [67, 0.5], [69, 1], [71, 1]],
    [[67, 3], [null, 1]],
  ],
  B: [
    [[76, 1], [76, 0.5], [74, 0.5], [72, 1], [76, 1]],
    [[79, 2], [76, 2]],
    [[74, 1], [71, 1], [67, 1], [71, 1]],
    [[74, 3], [null, 1]],
    [[73, 1], [76, 1], [69, 1], [73, 1]],
    [[74, 1], [72, 1], [69, 1], [66, 1]],
    [[67, 1], [71, 1], [74, 1], [71, 1]],
    [[67, 3], [null, 1]],
  ],
};

export type SongEvent =
  | { kind: 'chug'; beat: number; accent: boolean }
  | { kind: 'bass'; beat: number; midi: number; beats: number }
  | { kind: 'chord'; beat: number; midis: number[] }
  | { kind: 'melody'; beat: number; midi: number; beats: number }
  | { kind: 'whistle'; beat: number }
  // Modern (HSR) song only, see songHsr.ts:
  /** soft synth pad, held for `beats` */
  | { kind: 'pad'; beat: number; midis: number[]; beats: number }
  /** round sine sub bass */
  | { kind: 'sub'; beat: number; midi: number; beats: number }
  /** plucked, guzheng-like string. `vel` 0-1 scales loudness; role says what it is (only 'lead' and 'run' are melody). */
  | { kind: 'pluck'; beat: number; midi: number; beats: number; vel: number; role: 'lead' | 'run' | 'arp' }
  | { kind: 'kick'; beat: number }
  | { kind: 'hat'; beat: number; accent: boolean }
  | { kind: 'rim'; beat: number };

export interface Song { events: SongEvent[]; bars: number; beats: number }

interface Section { chords: Chord[]; melody?: Note[][]; whistleAt?: number[] }

export function buildSong(): Song {
  const sections: Section[] = [
    { chords: ['G', 'G', 'D7', 'G'] }, // intro: rhythm only
    { chords: A_CHORDS, melody: MELODY.A },
    { chords: B_CHORDS, melody: MELODY.B },
    { chords: A_CHORDS, melody: MELODY.A },
    { chords: BREAK_CHORDS, whistleAt: [1, 5] }, // instrumental break with a distant whistle
  ];
  const events: SongEvent[] = [];
  let bar = 0;
  for (const s of sections) {
    s.chords.forEach((chord, i) => {
      const start = (bar + i) * BEATS_PER_BAR;
      for (let b = 0; b < BEATS_PER_BAR; b++) {
        events.push({ kind: 'chug', beat: start + b, accent: b % 2 === 0 });
        events.push({ kind: 'chug', beat: start + b + 0.5, accent: false });
      }
      events.push({ kind: 'bass', beat: start, midi: BASS[chord][0], beats: 1.6 });
      events.push({ kind: 'bass', beat: start + 2, midi: BASS[chord][1], beats: 1.6 });
      events.push({ kind: 'chord', beat: start + 1, midis: VOICING[chord] });
      events.push({ kind: 'chord', beat: start + 3, midis: VOICING[chord] });
      if (s.melody) {
        let t = start;
        for (const [midi, beats] of s.melody[i]) {
          if (midi !== null) events.push({ kind: 'melody', beat: t, midi, beats });
          t += beats;
        }
      }
      if (s.whistleAt?.includes(i)) events.push({ kind: 'whistle', beat: start });
    });
    bar += s.chords.length;
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, bars: bar, beats: bar * BEATS_PER_BAR };
}
