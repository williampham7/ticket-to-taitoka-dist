/**
 * The four Aces: the suit shape stays large and central, wrapped in its house's emblem.
 */
import type { ReactElement } from 'react';
import type { Suit } from '@boboland/shared/src/egyptian';
import { HOUSES, INK, suitInk } from './palette';
import { Pip } from './suits';

const line = { stroke: INK.line, strokeWidth: 0.8 } as const;

/** Layered feather rows of a wing from (x, y) outward (`dir` 1 = right). */
function FeatherWing({ x, y, dir, len, colors }: { x: number; y: number; dir: 1 | -1; len: number; colors: string[] }) {
  return (
    <g>
      {colors.map((col, t) => {
        const L = len * (1 - t * 0.16), top = y + t * 13, h = 15, n = 6;
        let d = `M${x} ${top} Q${x + dir * L * 0.55} ${top - 10} ${x + dir * L} ${top - 6 + t * 3}`;
        d += ` L${x + dir * L} ${top + h * 0.4}`;
        for (let i = n; i >= 1; i--) {
          const x1 = x + dir * L * ((i - 1) / n), xm = x + dir * L * ((i - 0.5) / n);
          d += ` Q${xm} ${top + h + 3} ${x1} ${top + h - (i - 1) * 0.6}`;
        }
        return <path key={t} d={`${d} Z`} fill={col} {...line} />;
      }).reverse()}
    </g>
  );
}

/** A couchant jackal on a shrine, facing right, in a 60 x 44 box at (x, y). */
function Jackal({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})${flip ? ' translate(60 0) scale(-1 1)' : ''}`}>
      <rect x="0" y="34" width="60" height="10" fill="url(#egw-gold)" {...line} />
      <path d="M4 34 C2 28 6 22 14 22 L34 22 C36 14 38 8 42 4 L41 -6 L45 1 L47 -6 L49 3 C53 6 57 10 60 14 L58 17 L50 17 C48 21 47 26 48 30 L56 31 L57 34 Z" fill="#15120f" stroke="url(#egw-gold)" strokeWidth="0.9" />
      <path d="M6 30 C0 30 -2 24 1 20" stroke="#15120f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="47" cy="9" r="1.4" fill="url(#egw-gold)" />
      <path d="M38 22 L46 22" stroke="url(#egw-gold)" strokeWidth="1.4" />
    </g>
  );
}

function AceSpades() {
  const h = HOUSES.S;
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * (1.08 + i * 0.105);
        const x = 125 + 78 * Math.cos(a), y = 172 + 92 * Math.sin(a);
        return <use key={i} href="#egw-star" x={x - 7} y={y - 7} width={14} height={14} fill={i % 2 ? h.main : 'url(#egw-gold)'} />;
      })}
      <Jackal x={52} y={250} />
      <Jackal x={138} y={250} flip />
      <Pip suit="S" cx={125} cy={172} size={118} fill={suitInk('S')} />
      <circle cx="125" cy="168" r="10" fill={h.main} stroke="url(#egw-gold)" strokeWidth="2" />
      <use href="#egw-star" x="118" y="161" width="14" height="14" fill="url(#egw-gold)" />
    </g>
  );
}

function AceHearts() {
  const h = HOUSES.H;
  const wing = (dir: 1 | -1) => (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${125 + dir * 46} ${158 + i * 6} C${125 + dir * (62 + i * 4)} ${136 + i * 10} ${125 + dir * (82 + i * 2)} ${112 + i * 16} ${125 + dir * (88 - i * 6)} ${92 + i * 20} C${125 + dir * (74 - i * 2)} ${118 + i * 12} ${125 + dir * (60 - i)} ${142 + i * 8} ${125 + dir * 46} ${166 + i * 6} Z`}
          fill={i % 2 ? h.main : '#f6f2e6'} {...line} />
      ))}
    </g>
  );
  return (
    <g>
      {wing(-1)}
      {wing(1)}
      <path d="M125 284 L125 222" stroke="#3c7a3a" strokeWidth="4" />
      <use href="#egw-lotus" x="60" y="200" width="130" height="104" fill={h.accent} stroke={INK.line} strokeWidth="1.6" />
      <path d="M86 268 h78" stroke="url(#egw-gold)" strokeWidth="2.4" />
      <Pip suit="H" cx={125} cy={160} size={112} fill={suitInk('H')} />
    </g>
  );
}

function AceDiamonds() {
  const h = HOUSES.D;
  const cols = ['url(#egw-gold)', h.main, '#1d8a8a'];
  return (
    <g>
      <circle cx="125" cy="175" r="72" fill="none" stroke={h.accent} strokeWidth="1.2" strokeDasharray="2 5" />
      <FeatherWing x={98} y={150} dir={-1} len={76} colors={cols} />
      <FeatherWing x={152} y={150} dir={1} len={76} colors={cols} />
      <path d="M88 150 C92 140 100 138 104 142 L100 150 Z" fill="url(#egw-gold)" {...line} />
      <path d="M162 150 C158 140 150 138 146 142 L150 150 Z" fill="url(#egw-gold)" {...line} />
      <Pip suit="D" cx={125} cy={175} size={120} fill={suitInk('D')} />
      <circle cx="125" cy="175" r="13" fill={h.accent} stroke="url(#egw-gold)" strokeWidth="2" />
    </g>
  );
}

function AceClubs() {
  const h = HOUSES.C;
  const fan = (x: number, tilt: number) => (
    <g transform={`rotate(${tilt} ${x} 250)`}>
      <path d={`M${x} 250 L${x} 120`} stroke={h.main} strokeWidth="3" />
      <path d={`M${x} 124 L${x - 22} 92 Q${x} 82 ${x + 22} 92 Z`} fill={h.main} {...line} />
      {[-0.7, -0.35, 0, 0.35, 0.7].map((k) => <path key={k} d={`M${x} 124 L${x + k * 22} 90`} stroke="url(#egw-gold)" strokeWidth="0.9" />)}
    </g>
  );
  return (
    <g>
      {fan(78, -16)}
      {fan(172, 16)}
      <Pip suit="C" cx={125} cy={160} size={112} fill={suitInk('C')} />
      <g transform="translate(125 254)">
        <path d="M-14 -12 L-26 -34 L-20 -48 M14 -12 L26 -34 L20 -48 M-18 4 L-34 2 M18 4 L34 2 M-15 18 L-28 30 M15 18 L28 30" stroke="#15120f" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <ellipse cx="0" cy="8" rx="20" ry="24" fill={h.main} stroke="url(#egw-gold)" strokeWidth="2.4" />
        <path d="M0 -12 V32" stroke="url(#egw-gold)" strokeWidth="1.8" />
        <path d="M-12 -14 A12 10 0 0 1 12 -14 Z" fill={h.deep} stroke="url(#egw-gold)" strokeWidth="1.6" />
      </g>
    </g>
  );
}

const ACES: Record<Suit, () => ReactElement> = { S: AceSpades, H: AceHearts, D: AceDiamonds, C: AceClubs };

export function AceCentre({ suit }: { suit: Suit }) {
  const Art = ACES[suit];
  return <g data-art={`ace-${suit}`}><Art /></g>;
}
