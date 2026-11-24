/** Weapon icons: area weapons show their real footprint on a 5x5 mini grid (from the rules' pattern table); others get a glyph. */
import type { ReactNode } from 'react';
import { AREA_WEAPONS, patternSquares, sq, xOf, yOf, type WeaponId } from '@boboland/shared/src/fleet';

const CY = '#38e1ff', AM = '#ffb547', INK = '#dbe7f3';

function Footprint({ id }: { id: WeaponId }) {
  const centre = sq(4, 4);
  const hit = new Set(patternSquares(id, centre, 'h').map((s) => `${xOf(s) - 2},${yOf(s) - 2}`));
  return (
    <g>
      {Array.from({ length: 25 }, (_, i) => {
        const x = i % 5, y = Math.floor(i / 5);
        const on = hit.has(`${x},${y}`);
        return <rect key={i} x={2 + x * 8} y={2 + y * 8} width="7" height="7" rx="1" fill={on ? CY : 'rgba(138,163,187,.16)'} opacity={on ? (x === 2 && y === 2 ? 1 : 0.8) : 1} />;
      })}
    </g>
  );
}

const GLYPH: Partial<Record<WeaponId, ReactNode>> = {
  shield: <path d="M22 4 L37 12.5 V29.5 L22 38 L7 29.5 V12.5 Z" fill="rgba(56,225,255,.15)" stroke={CY} strokeWidth="2.4" strokeLinejoin="round" />,
  seaMine: (
    <g>
      <circle cx="22" cy="23" r="9" fill="#2c3a48" stroke={INK} strokeWidth="2" />
      {[0, 60, 120, 180, 240, 300].map((a) => <line key={a} x1="22" y1="23" x2={22 + Math.cos((a * Math.PI) / 180) * 15} y2={23 + Math.sin((a * Math.PI) / 180) * 15} stroke={INK} strokeWidth="2" strokeLinecap="round" />)}
      <circle cx="22" cy="23" r="3" fill={AM} />
    </g>
  ),
  decoy: <path d="M6 16 L28 14 L37 21 L28 28 L6 26 Z" fill="rgba(56,225,255,.12)" stroke={CY} strokeWidth="2.2" strokeDasharray="4 3" strokeLinejoin="round" />,
  torpedo: (
    <g>
      <path d="M22 4 C26 8 26 12 26 16 V34 H18 V16 C18 12 18 8 22 4 Z" fill={INK} />
      <path d="M18 34 L14 39 H30 L26 34 Z" fill={AM} />
      <path d="M22 39 V43" stroke={CY} strokeWidth="2" strokeDasharray="2 2" />
    </g>
  ),
  supernova: (
    <g>
      <path d="M22 3 L25.5 17 L40 20 L26 24.5 L22 40 L18 24.5 L4 20 L18.5 17 Z" fill="#fff" stroke={CY} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="22" cy="21" r="4" fill={AM} />
    </g>
  ),
  reinforcement: (
    <g>
      <path d="M4 18 L30 16 L40 21 L30 26 L4 24 Z" fill="#c9d3dc" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M30 31 V41 M25 36 H35" stroke={CY} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ),
};

export function WeaponIcon({ id, size = 40 }: { id: WeaponId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden className="fleet-wicon">
      {AREA_WEAPONS.includes(id) ? <Footprint id={id} /> : GLYPH[id]}
    </svg>
  );
}

/** Segmented charge meter: one segment per turn of charge; `value` filled. */
export function ChargeMeter({ value, of, label }: { value: number; of: number; label?: string }) {
  if (of <= 0) return <span className="fleet-meter ready">Ready</span>;
  return (
    <span className="fleet-meter" role="meter" aria-valuemin={0} aria-valuemax={of} aria-valuenow={Math.min(value, of)} aria-label={label ?? 'Charge'}>
      {Array.from({ length: of }, (_, i) => <span key={i} className={i < value ? 'on' : ''} />)}
    </span>
  );
}
