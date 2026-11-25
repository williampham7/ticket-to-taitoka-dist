import type { CSSProperties } from 'react';

/** Seven simple runes (centred on 0,0, about 6 x 12 units). The insert flags use them as row and column numbers. */
export const RUNES = ['M-3,6V-6M-3,-6L3,-2M-3,-1L3,3', 'M-3,6V-6L3,-2V6', 'M-3,6V-6M-3,-3L3,0L-3,3', 'M-3,6V-6M-3,-6L3,-2M-3,0L3,4', 'M-3,6V-6H1L3,-3L1,0H-3M-1,0L3,6', 'M-2,-6L3,0L-2,6', 'M-3,-6L3,6M3,-6L-3,6'];

/** A carved standing stone with a glowing rune: the motif of Runeshift's menu, picker card and wordmark. */
export function RuneStone({ i = 0, className, style }: { i?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 48 80" className={`kg-rstone${className ? ` ${className}` : ''}`} style={style} aria-hidden>
      <ellipse className="kg-rstone-halo" cx="24" cy="38" rx="22" ry="34" fill="url(#kg-rune-glow)" />
      <ellipse cx="24" cy="74" rx="20" ry="5" fill="url(#kg-grass)" stroke="#4a3020" strokeWidth="1.4" />
      <path d="M6,74 V30 Q6,6 24,6 Q42,6 42,30 V74 Z" fill="url(#kg-rune-stone)" stroke="#4a3020" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12,70 V31 Q12,13 24,13 Q36,13 36,31 V70 Z" fill="url(#kg-rune-face)" stroke="#2f3a3f" strokeWidth="1.1" />
      <path d="M9,30 Q10,11 22,8" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".4" />
      <g transform="translate(24 40) scale(2)">
        <path className="kg-rune-glow" d={RUNES[i % 7]} fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        <path className="kg-rune" d={RUNES[i % 7]} fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** A slowly turning ring of runes, drawn behind the menu book. */
export function RuneRing({ className }: { className?: string }) {
  return (
    <svg viewBox="-200 -200 400 400" className={`kg-rring${className ? ` ${className}` : ''}`} aria-hidden>
      <circle r="190" fill="none" stroke="#7ef0d0" strokeWidth="1.5" opacity=".5" />
      <circle r="150" fill="none" stroke="#7ef0d0" strokeWidth="1" strokeDasharray="3 7" opacity=".6" />
      <circle r="124" fill="none" stroke="#7ef0d0" strokeWidth="1.5" opacity=".4" />
      {Array.from({ length: 14 }, (_, k) => (
        <g key={k} transform={`rotate(${k * (360 / 14)}) translate(0 -170)`}>
          <path d={RUNES[k % 7]} transform="scale(2.2)" fill="none" stroke="#7ef0d0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}

/** Tiny runes drifting up like embers, for the menu. */
export function RuneMotes({ n = 14 }: { n?: number }) {
  return (
    <div className="kg-motes-rune" aria-hidden>
      {Array.from({ length: n }, (_, k) => (
        <svg key={k} viewBox="-5 -8 10 16" className="kg-mote-r" style={{ ['--k' as string]: k, left: `${(k * 83) % 100}%` } as CSSProperties}>
          <path d={RUNES[k % 7]} fill="none" stroke="#7ef0d0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}
