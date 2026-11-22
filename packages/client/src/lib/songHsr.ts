import { BEATS_PER_BAR, type Note, type Song, type SongEvent } from './song';

/**
 * "Hexie Express" — an original modern tune for the high-speed-rail theme: C gong mode (the Chinese pentatonic
 * scale C D E G A), 104 BPM, soft synth pads, a plucked guzheng-like lead and light percussion.
 * Pure data like song.ts; the player in music.ts turns the events into Web Audio voices.
 */
export const BPM_HSR = 104;

/** The five notes of the gong mode, as pitch classes (C = 0). The lead and its runs never leave it. */
export const GONG_PITCH_CLASSES = [0, 2, 4, 7, 9];

type Chord = 'C' | 'G' | 'Am' | 'Em' | 'F';

/** Pad voicings (open, mid register) and the bass: root, then the note an octave or a fifth above for the second hit. */
const PAD: Record<Chord, number[]> = {
  C: [55, 62, 64, 67], // Cadd9, no root (the bass has it)
  G: [55, 62, 67, 69], // Gsus2
  Am: [57, 60, 64, 67], // Am7
  Em: [59, 62, 64, 67], // Em7
  F: [57, 60, 65, 67], // Fadd9
};
const SUB: Record<Chord, [number, number]> = { C: [48, 55], G: [43, 50], Am: [45, 52], Em: [40, 47], F: [41, 48] };

type Drums = 'air' | 'light' | 'full' | 'sparse' | 'fade';

const A: Note[][] = [
  [[76, 1.5], [74, 0.5], [72, 1], [67, 1]],
  [[69, 1], [72, 1], [74, 2]],
  [[76, 1.5], [79, 0.5], [76, 1], [72, 1]],
  [[74, 2], [null, 1], [72, 0.5], [74, 0.5]],
  [[72, 1], [69, 1], [72, 1], [76, 1]],
  [[79, 1.5], [76, 0.5], [74, 1], [72, 1]],
  [[74, 1], [72, 0.5], [69, 0.5], [67, 2]],
  [[69, 1], [74, 1], [null, 2]],
];
const B: Note[][] = [
  [[81, 1], [79, 0.5], [76, 0.5], [79, 1], [81, 1]],
  [[84, 1.5], [81, 0.5], [79, 2]],
  [[81, 1], [79, 1], [76, 1], [74, 1]],
  [[76, 1.5], [74, 0.5], [72, 2]],
  [[72, 0.5], [74, 0.5], [76, 1], [79, 1], [81, 1]],
  [[84, 1], [81, 1], [79, 1], [76, 1]],
  [[79, 0.5], [76, 0.5], [74, 1], [72, 2]],
  [[74, 2], [null, 2]],
];
/** the bridge: long, airy notes high above the pads */
const BRIDGE: Note[][] = [
  [[81, 3], [79, 1]],
  [[76, 2], [72, 2]],
  [[74, 1.5], [76, 0.5], [79, 2]],
  [[76, 3], [null, 1]],
  [[81, 2], [84, 2]],
  [[81, 1], [79, 1], [76, 2]],
  [[74, 1], [76, 1], [79, 1], [81, 1]],
  [[79, 2], [null, 2]],
];
/** the tune again, livelier */
const A2: Note[][] = [
  [[79, 1], [76, 0.5], [74, 0.5], [72, 1], [76, 1]],
  [[74, 1], [72, 1], [69, 1], [74, 1]],
  [[76, 1], [79, 1], [81, 1], [79, 1]],
  [[76, 2], [74, 1], [72, 1]],
  [[72, 1], [76, 1], [81, 1], [79, 1]],
  [[76, 1.5], [79, 0.5], [84, 2]],
  [[81, 1], [79, 1], [76, 1], [74, 1]],
  [[72, 0.5], [74, 0.5], [67, 1], [null, 2]],
];
const B2: Note[][] = [...B.slice(0, 6), [[84, 2], [79, 2]], [[81, 1], [79, 1], [74, 2]]];
const OUTRO: Note[][] = [
  [[81, 2], [79, 2]],
  [[76, 3], [null, 1]],
  [[81, 1], [79, 1], [76, 2]],
  [[74, 3], [null, 1]],
];

export const MELODY_HSR = { A, B, BRIDGE, A2, B2, OUTRO };

interface Section {
  name: string;
  chords: Chord[];
  lead?: Note[][];
  drums: Drums;
  /** soft broken-chord plucks under the lead */
  arp?: boolean;
  /** bars (within the section) that end with a quick guzheng run, and which way it goes */
  runs?: Record<number, 'up' | 'down'>;
}

export const SECTIONS_HSR: Section[] = [
  { name: 'intro', chords: ['C', 'Am', 'F', 'G'], drums: 'air', runs: { 3: 'up' } },
  { name: 'A', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'G', 'G'], lead: A, drums: 'light', runs: { 7: 'up' } },
  { name: 'B', chords: ['F', 'C', 'G', 'Am', 'F', 'G', 'C', 'G'], lead: B, drums: 'full', runs: { 7: 'down' } },
  { name: 'bridge', chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'], lead: BRIDGE, drums: 'sparse', arp: true, runs: { 7: 'up' } },
  { name: 'A2', chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'G', 'G'], lead: A2, drums: 'light', arp: true, runs: { 7: 'up' } },
  { name: 'B2', chords: ['F', 'C', 'G', 'Am', 'F', 'G', 'C', 'G'], lead: B2, drums: 'full', arp: true },
  { name: 'outro', chords: ['F', 'C', 'F', 'G'], lead: OUTRO, drums: 'fade' },
];

const RUN_UP = [67, 69, 72, 74, 76, 79];
const RUN_DOWN = [84, 81, 79, 76, 74, 72];
const ARP_ORDER = [0, 2, 1, 3, 2, 3, 1, 2];

/** [beat in bar, kick] etc. for each drum pattern */
const KICKS: Record<Drums, number[]> = { air: [], light: [0, 2.5], full: [0, 2, 3.5], sparse: [], fade: [0] };
const RIMS: Record<Drums, number[]> = { air: [], light: [1, 3], full: [1, 3], sparse: [3], fade: [] };

export function buildSongHsr(): Song {
  const events: SongEvent[] = [];

  // Pads: one long chord per run of identical bars, so a repeated chord doesn't re-attack every bar.
  const all = SECTIONS_HSR.flatMap((s) => s.chords);
  for (let i = 0; i < all.length;) {
    let j = i;
    while (j + 1 < all.length && all[j + 1] === all[i]) j++;
    events.push({ kind: 'pad', beat: i * BEATS_PER_BAR, midis: PAD[all[i]], beats: (j - i + 1) * BEATS_PER_BAR });
    i = j + 1;
  }

  let bar = 0;
  for (const s of SECTIONS_HSR) {
    s.chords.forEach((chord, i) => {
      const start = (bar + i) * BEATS_PER_BAR;
      const [root, upper] = SUB[chord];
      events.push({ kind: 'sub', beat: start, midi: root, beats: s.drums === 'air' ? 3.5 : 1.8 });
      if (s.drums !== 'air') events.push({ kind: 'sub', beat: start + 2.5, midi: upper, beats: 1.2 });
      for (const b of KICKS[s.drums]) events.push({ kind: 'kick', beat: start + b });
      for (const b of RIMS[s.drums]) events.push({ kind: 'rim', beat: start + b });
      for (let b = 0; b < BEATS_PER_BAR; b++) {
        if (s.drums === 'full') events.push({ kind: 'hat', beat: start + b, accent: false });
        events.push({ kind: 'hat', beat: start + b + 0.5, accent: true });
      }
      if (s.arp) {
        ARP_ORDER.forEach((k, n) => events.push({ kind: 'pluck', beat: start + n * 0.5, midi: PAD[chord][k], beats: 0.5, vel: 0.28, role: 'arp' }));
      }
      if (s.lead) {
        let t = start;
        for (const [midi, beats] of s.lead[i]) {
          if (midi !== null) events.push({ kind: 'pluck', beat: t, midi, beats, vel: 1, role: 'lead' });
          t += beats;
        }
      }
      const run = s.runs?.[i];
      if (run) {
        (run === 'up' ? RUN_UP : RUN_DOWN).forEach((midi, n) => events.push({ kind: 'pluck', beat: start + 2.5 + n * 0.25, midi, beats: 0.5, vel: 0.7, role: 'run' }));
      }
    });
    bar += s.chords.length;
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, bars: bar, beats: bar * BEATS_PER_BAR };
}
