/**
 * Shared SVG defs for the Egyptian deck: card stock, gold, lapis, house backgrounds and symbols.
 * Mounted once per page that draws cards (EgyptianApp, the picker card).
 */
import { HOUSES, INK } from './palette';
import { SUIT_PATHS } from './suits';

export function EgyptianDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="egw-gold" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor={INK.goldHi} />
          <stop offset="0.45" stopColor={INK.gold} />
          <stop offset="0.7" stopColor="#e9c766" />
          <stop offset="1" stopColor={INK.goldLo} />
        </linearGradient>
        <linearGradient id="egw-lapis" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4699" />
          <stop offset="0.55" stopColor={INK.lapis} />
          <stop offset="1" stopColor={INK.lapisDeep} />
        </linearGradient>
        <radialGradient id="egw-aged" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#8a5a1c" stopOpacity="0" />
          <stop offset="1" stopColor="#7a4c14" stopOpacity="0.28" />
        </radialGradient>
        {/* papyrus: woven horizontal and vertical strips, with a few fibres */}
        <pattern id="egw-papyrus" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="18" height="18" fill={INK.papyrus} />
          <path d="M0 4.5h18M0 13.2h18" stroke="#d9c38f" strokeWidth="1.1" opacity="0.55" />
          <path d="M5 0v18M13.6 0v18" stroke="#cfb880" strokeWidth="0.7" opacity="0.32" />
          <path d="M1 8.6c5-.6 10 .4 16-.3M2 16.4c4 .5 9-.2 14 .3" stroke="#c4a96c" strokeWidth="0.45" opacity="0.5" fill="none" />
          <circle cx="9" cy="2.4" r="0.5" fill="#b99a5c" opacity="0.5" />
        </pattern>
        <filter id="egw-fibre" x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.06" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.12  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <pattern id="egw-diaper" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M11 3 L19 11 L11 19 L3 11 Z" fill="none" stroke={INK.gold} strokeWidth="0.9" opacity="0.55" />
          <circle cx="11" cy="11" r="1.6" fill={INK.gold} opacity="0.7" />
          <circle cx="0" cy="0" r="1" fill={INK.gold} opacity="0.5" />
          <circle cx="22" cy="0" r="1" fill={INK.gold} opacity="0.5" />
          <circle cx="0" cy="22" r="1" fill={INK.gold} opacity="0.5" />
          <circle cx="22" cy="22" r="1" fill={INK.gold} opacity="0.5" />
        </pattern>
        {/* house backgrounds for court panels */}
        <pattern id="egw-bg-S" width="26" height="26" patternUnits="userSpaceOnUse">
          <rect width="26" height="26" fill={HOUSES.S.light} />
          <use href="#egw-star" x="3" y="3" width="7" height="7" fill={HOUSES.S.main} opacity="0.28" />
          <use href="#egw-star" x="16" y="15" width="5" height="5" fill={HOUSES.S.main} opacity="0.22" />
        </pattern>
        <pattern id="egw-bg-H" width="24" height="14" patternUnits="userSpaceOnUse">
          <rect width="24" height="14" fill={HOUSES.H.light} />
          <path d="M0 7 q3 -4 6 0 t6 0 t6 0 t6 0" fill="none" stroke={HOUSES.H.main} strokeWidth="1" opacity="0.3" />
        </pattern>
        <pattern id="egw-bg-D" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill={HOUSES.D.light} />
          <circle cx="11" cy="11" r="2.6" fill={HOUSES.D.accent} opacity="0.45" />
          <path d="M11 4v2.4M11 15.6V18M4 11h2.4M15.6 11H18" stroke={HOUSES.D.main} strokeWidth="0.9" opacity="0.35" />
        </pattern>
        <pattern id="egw-bg-C" width="16" height="30" patternUnits="userSpaceOnUse">
          <rect width="16" height="30" fill={HOUSES.C.light} />
          <path d="M8 30 V10 M8 10 l-4 -6 M8 10 l4 -6 M8 10 v-7" stroke={HOUSES.C.main} strokeWidth="0.9" opacity="0.3" fill="none" />
        </pattern>
        <clipPath id="egw-panel-clip">
          <rect x="52" y="36" width="146" height="278" rx="3" />
        </clipPath>
        {/* symbols (100 x 100 boxes) */}
        {(['S', 'H', 'D', 'C'] as const).map((s) => (
          <symbol key={s} id={`egw-suit-${s}`} viewBox="0 0 100 100">
            {SUIT_PATHS[s].map((d, i) => <path key={i} d={d} />)}
          </symbol>
        ))}
        <symbol id="egw-star" viewBox="0 0 100 100">
          <path d="M50 4 L61 38 L97 38 L68 59 L79 94 L50 73 L21 94 L32 59 L3 38 L39 38 Z" />
        </symbol>
        <symbol id="egw-lotus" viewBox="0 0 100 80">
          <path d="M50 8 C58 26 60 46 50 66 C40 46 42 26 50 8 Z" />
          <path d="M48 66 C34 58 24 42 22 24 C34 32 44 46 50 62 Z" />
          <path d="M52 66 C66 58 76 42 78 24 C66 32 56 46 50 62 Z" />
          <path d="M44 68 C30 70 16 64 8 54 C22 54 36 58 48 66 Z" />
          <path d="M56 68 C70 70 84 64 92 54 C78 54 64 58 52 66 Z" />
          <rect x="20" y="68" width="60" height="7" rx="2" />
        </symbol>
        <symbol id="egw-ankh" viewBox="0 0 60 100">
          <path d="M30 4 C16 4 10 16 12 28 C13 36 20 42 25 46 L4 46 L4 56 L25 56 L23 96 L37 96 L35 56 L56 56 L56 46 L35 46 C40 42 47 36 48 28 C50 16 44 4 30 4 Z M30 13 C38 13 40 22 38 30 C36 36 32 40 30 42 C28 40 24 36 22 30 C20 22 22 13 30 13 Z" fillRule="evenodd" />
        </symbol>
      </defs>
    </svg>
  );
}
