/**
 * Egyptian profile figures for the court cards: head in profile facing right, shoulders frontal, a broad collar,
 * the hand at (150, 146) holding something on the staff line x = 150. Drawn for the top half of the card
 * (y 36..175); the card mirrors it by a 180 degree turn.
 */
import type { ReactNode } from 'react';
import { INK } from './palette';

export const FACE = 'M104 70 C112 66 124 66 128 72 C130 76 130 82 131 86 L137 95 C137 97 135 98 132 98 C133 100 132 102 130 102 C131 104 131 106 129 107 C128 112 124 116 116 117 C110 117 104 114 102 110 Z';
const NECK = 'M106 108 L125 108 L127 131 L104 131 Z';
const TORSO = 'M56 176 C58 152 66 139 84 133 C95 129 103 128 108 128 L124 128 C131 128 140 130 150 133 C168 139 174 154 176 176 Z';
const ARM = 'M143 176 C143 166 142 158 142 151 L158 149 C159 157 161 166 163 176 Z';
const LARM = 'M86 176 C86 166 88 158 90 151 L105 151 C104 158 102 166 101 176 Z';
const SHORT_WIG = 'M96 76 C96 65 106 59 118 60 C126 62 129 68 128 74 L114 76 C110 84 110 96 112 108 L98 108 C94 98 94 86 96 76 Z';
const LONG_WIG = 'M95 74 C96 62 108 56 120 58 C128 60 131 66 129 74 L113 77 C109 90 110 112 116 146 L99 148 C92 122 90 96 95 74 Z';
const BEARD = 'M121 113 L127 132 C126 135 121 135 120 132 L118 115 Z';

export type Wig = 'short' | 'long' | 'none';
export type Garment = 'bare' | 'dress' | 'cuirass' | 'scale' | 'kilt';

export interface FigureSpec {
  skin: string;
  wig: Wig;
  wigColor?: string;
  /** stripes on the wig lappet */
  wigStripe?: string;
  /** an animal mask replaces the face (jackal, falcon) */
  mask?: ReactNode;
  beard?: boolean;
  /** drawn behind everything (plumes, horns behind the head) */
  back?: ReactNode;
  /** drawn over the head */
  crown?: ReactNode;
  collar: string[];
  garment: Garment;
  garmentColor?: string;
  garmentTrim?: string;
  /** on the chest, over the collar */
  pectoral?: ReactNode;
  /** the main hand's object (behind the hand) */
  held?: ReactNode;
  /** the other hand: true draws the left forearm and hand at (97, 146) */
  leftHand?: boolean;
  /** drawn over the left side (a shield, a scroll) */
  offhand?: ReactNode;
  /** drawn over the hands (a crossed crook and flail) */
  front?: ReactNode;
}

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k)));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
};

function Collar({ bands }: { bands: string[] }) {
  const rs = [42, 35, 28, 21];
  return (
    <g>
      {bands.slice(0, 4).map((col, i) => {
        const r = rs[i];
        return <path key={i} d={`M${116 - r} 129 A${r} ${r} 0 0 0 ${116 + r} 129 Z`} fill={col} stroke={INK.line} strokeWidth="0.6" />;
      })}
      {Array.from({ length: 13 }, (_, k) => {
        const a = ((12 + k * 13) * Math.PI) / 180;
        return <ellipse key={k} cx={116 + 44 * Math.cos(a)} cy={129 + 44 * Math.sin(a)} rx="2.3" ry="3.2" transform={`rotate(${(12 + k * 13) - 90} ${116 + 44 * Math.cos(a)} ${129 + 44 * Math.sin(a)})`} fill={bands[1]} stroke={INK.line} strokeWidth="0.4" />;
      })}
    </g>
  );
}

function GarmentShape({ kind, color, trim }: { kind: Garment; color: string; trim: string }) {
  if (kind === 'bare') return null;
  if (kind === 'dress') {
    return (
      <g>
        <path d="M70 176 L78 151 C100 158 132 158 156 151 L164 176 Z" fill={color} stroke={INK.line} strokeWidth="0.8" />
        <path d="M78 151 C100 158 132 158 156 151" fill="none" stroke={trim} strokeWidth="2.4" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M${86 + i * 11} 160 L${82 + i * 12} 176`} stroke={shade(color, 0.8)} strokeWidth="0.8" />)}
      </g>
    );
  }
  if (kind === 'kilt') {
    return <path d="M64 176 L70 160 C100 166 134 166 162 160 L168 176 Z" fill={color} stroke={INK.line} strokeWidth="0.8" />;
  }
  const body = 'M64 176 L72 146 C96 153 136 153 160 146 L168 176 Z';
  return (
    <g>
      <path d={body} fill={color} stroke={INK.line} strokeWidth="0.8" />
      {kind === 'cuirass' && [0, 1, 2].map((r) => (
        <path key={r} d={`M${70 + r * 2} ${156 + r * 7} C100 ${162 + r * 7} 134 ${162 + r * 7} ${162 - r * 2} ${156 + r * 7}`} fill="none" stroke={trim} strokeWidth="1.4" />
      ))}
      {kind === 'scale' && Array.from({ length: 3 }, (_, r) => Array.from({ length: 9 }, (_, c) => (
        <path key={`${r}-${c}`} d={`M${74 + c * 10 + (r % 2) * 5} ${152 + r * 8} a5 5 0 0 0 10 0`} fill="none" stroke={trim} strokeWidth="1.2" />
      )))}
      <path d="M72 146 C96 153 136 153 160 146" fill="none" stroke={trim} strokeWidth="2.2" />
    </g>
  );
}

/** The face's eye, brow, lips and (for kings) the false beard. */
function Features({ beard, lips }: { beard?: boolean; lips: string }) {
  return (
    <g>
      <path d="M116.5 86 C119 83 124 83 126.5 85.5 C124 88 119 88.5 116.5 86 Z" fill="#fbf6ea" stroke={INK.hair} strokeWidth="1" />
      <circle cx="122.4" cy="85.8" r="2.2" fill={INK.hair} />
      <path d="M126.5 85.5 L134 84.2" stroke={INK.hair} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M115 80.5 C119 78 125 77.6 130 79.8" stroke={INK.hair} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M128.6 100.6 L132.6 100.4" stroke={lips} strokeWidth="1.8" strokeLinecap="round" />
      {beard && (
        <g>
          <path d={BEARD} fill={INK.hair} />
          {[118, 122, 126].map((y) => <path key={y} d={`M${118 + (y - 114) * 0.12} ${y} L${123.5 + (y - 114) * 0.25} ${y - 1}`} stroke={INK.gold} strokeWidth="0.8" />)}
        </g>
      )}
    </g>
  );
}

export function Hand({ cx, cy, skin }: { cx: number; cy: number; skin: string }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="8.6" ry="8" fill={skin} stroke={INK.line} strokeWidth="0.7" />
      <path d={`M${cx - 6} ${cy - 4} C${cx - 3} ${cy - 8} ${cx + 3} ${cy - 8} ${cx + 5} ${cy - 5}`} fill="none" stroke={shade(skin, 0.72)} strokeWidth="1.1" />
      <path d={`M${cx - 7} ${cy + 1} L${cx + 6} ${cy + 1} M${cx - 6} ${cy + 4.5} L${cx + 5} ${cy + 4.5}`} stroke={shade(skin, 0.72)} strokeWidth="0.8" />
    </g>
  );
}

/** One half of a court card's figure. */
export function HalfFigure(s: FigureSpec) {
  const skinShade = shade(s.skin, 0.8);
  const wigColor = s.wigColor ?? INK.hair;
  return (
    <g>
      {s.back}
      <path d={TORSO} fill={s.skin} stroke={INK.line} strokeWidth="0.8" />
      <path d="M84 133 C96 140 104 150 104 176" fill="none" stroke={skinShade} strokeWidth="1" opacity="0.7" />
      <GarmentShape kind={s.garment} color={s.garmentColor ?? '#f4eedc'} trim={s.garmentTrim ?? INK.gold} />
      <path d={NECK} fill={s.skin} stroke={INK.line} strokeWidth="0.7" />
      <Collar bands={s.collar} />
      {s.pectoral}
      {s.mask ?? (
        <g>
          <path d={FACE} fill={s.skin} stroke={INK.line} strokeWidth="0.9" />
          {s.wig !== 'none' && <path d={s.wig === 'long' ? LONG_WIG : SHORT_WIG} fill={wigColor} stroke={INK.line} strokeWidth="0.7" />}
          {s.wig === 'long' && s.wigStripe && [86, 96, 106, 116, 126, 136].map((y) => (
            <path key={y} d={`M${101 + (y - 86) * 0.04} ${y} L${112 + (y - 86) * 0.08} ${y}`} stroke={s.wigStripe} strokeWidth="1.3" opacity="0.85" />
          ))}
          {s.wig === 'short' && <ellipse cx="111" cy="91" rx="4" ry="6.2" fill={s.skin} stroke={INK.line} strokeWidth="0.7" />}
          <Features beard={s.beard} lips={s.wig === 'long' ? '#9c2f26' : shade(s.skin, 0.6)} />
        </g>
      )}
      {s.crown}
      {s.held}
      <path d={ARM} fill={s.skin} stroke={INK.line} strokeWidth="0.7" />
      <rect x="142.4" y="157" width="17.6" height="4.4" rx="1" fill="url(#egw-gold)" stroke={INK.line} strokeWidth="0.4" />
      <Hand cx={150} cy={146} skin={s.skin} />
      {s.leftHand && (
        <g>
          <path d={LARM} fill={s.skin} stroke={INK.line} strokeWidth="0.7" />
          <rect x="88" y="158" width="15.5" height="4.4" rx="1" fill="url(#egw-gold)" stroke={INK.line} strokeWidth="0.4" />
          <Hand cx={97} cy={146} skin={s.skin} />
        </g>
      )}
      {s.offhand}
      {s.front}
    </g>
  );
}
