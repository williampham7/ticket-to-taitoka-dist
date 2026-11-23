import type { ReactNode } from 'react';
import { MapView } from '../board/MapView';
import { SKIN } from '../lib/skin';
import { MRT_LINES, Orchid } from './MerlionCards';

/**
 * Merlion (Singapore build) screen pieces: the menu frame, the home hero (Marina Bay at golden hour with an
 * MRT train gliding by) and the title with the six MRT line colours underneath. Decoration and copy only;
 * the game logic stays in the shared screens.
 */

const none = new Set<string>();
const INK = '#10343c';

/** Menu screens: the board under a sea-glass wash, a white card edged with Peranakan tiles on top. */
export function MerlionFrame({ children, wide, top }: { children: ReactNode; wide?: boolean; top: ReactNode }) {
  return (
    <div className="mrt-frame relative h-full overflow-hidden">
      <div className="absolute inset-0 opacity-75" aria-hidden>
        <MapView claims={{}} playerFill={{}} claimable={none} />
      </div>
      <div className="mrt-frame-wash absolute inset-0" aria-hidden />
      {top}
      <div className="relative grid h-full overflow-auto px-4 pb-6 pt-16 [place-items:safe_center] sm:p-8">
        <div className={`mrt-page fade-in relative w-full ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
          <div className="mrt-page-tiles" aria-hidden />
          <div className="relative min-w-0 px-6 pb-7 pt-6 sm:px-10 sm:pb-9 sm:pt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** "Ticket to / Singapore" with the MRT line colours as a rule. */
export function MerlionTitle({ sub, compact }: { sub?: string; compact?: boolean }) {
  return (
    <div className={compact ? 'mb-5' : 'mb-6'}>
      <h1 className="mrt-title font-display leading-[1]">
        <span className={`block text-muted ${compact ? 'text-[13px]' : 'text-[14px] sm:text-[15px]'}`}>Ticket to</span>
        <span className={`mrt-title-name mt-1 block text-poster ${compact ? 'text-[38px]' : 'text-[44px] sm:text-[56px]'}`}>{SKIN.name}</span>
      </h1>
      <div className="mrt-rule mt-3" aria-hidden>{MRT_LINES.map((c) => <i key={c} style={{ background: c }} />)}</div>
      {sub && <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">{sub}</p>}
    </div>
  );
}

/** A small MRT train, side view, nose to the right, for banners. */
export function MrtTrainIcon({ width = 40, height = 20, fill = '#fff' }: { width?: number; height?: number; fill?: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 44 22" aria-hidden className="shrink-0">
      <path d="M2,3 H30 C37,3 42,8 43,14 V18 H2Z" fill={fill} />
      {[6, 14, 22].map((x) => <rect key={x} x={x} y="6" width="6" height="5" rx="1.2" fill="#10343c" opacity=".55" />)}
      <path d="M30,6 H33 C36,6 38.6,8.4 39.6,11 H30Z" fill="#10343c" opacity=".55" />
      <rect x="2" y="13" width="41" height="2" fill="#10343c" opacity=".35" />
      <rect x="2" y="18.6" width="41" height="2" rx="1" fill={fill} />
    </svg>
  );
}

/** Home hero: Marina Bay Sands and the Merlion at golden hour, Supertrees, an MRT train on the viaduct. */
export function MerlionHero() {
  return (
    <div className="mrt-hero -mx-6 -mt-6 mb-6 sm:-mx-10 sm:-mt-7" aria-hidden>
      <svg viewBox="0 0 560 150" preserveAspectRatio="xMidYMid slice" className="block h-[128px] w-full sm:h-[150px]">
        <defs>
          <linearGradient id="mrt-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7fcfe0" />
            <stop offset=".62" stopColor="#d9f1ee" />
            <stop offset="1" stopColor="#ffe9c4" />
          </linearGradient>
          <linearGradient id="mrt-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#58bcc4" />
            <stop offset="1" stopColor="#2c9aa6" />
          </linearGradient>
        </defs>
        <rect width="560" height="150" fill="url(#mrt-sky)" />
        <circle cx="440" cy="62" r="30" fill="#ffe08a" opacity=".45" />
        <circle cx="440" cy="62" r="19" fill="#ffd05a" />
        <g fill="#fff" opacity=".85">
          <ellipse cx="90" cy="26" rx="34" ry="7" /><ellipse cx="112" cy="22" rx="20" ry="7" />
          <ellipse cx="330" cy="18" rx="30" ry="6" /><ellipse cx="520" cy="30" rx="26" ry="6" />
        </g>
        {/* the far skyline */}
        <g fill="#a9d8d6">
          {[[372, 62, 14], [388, 50, 12], [404, 66, 16], [450, 58, 14], [466, 46, 12], [482, 64, 18], [504, 54, 14], [522, 68, 16], [540, 58, 14]].map(([x, y, w]) => (
            <rect key={x} x={x} y={y} width={w} height={96 - y} />
          ))}
        </g>
        {/* Supertrees */}
        {[{ x: 510, t: 52, w: 14 }, { x: 540, t: 66, w: 11 }].map(({ x, t, w }) => (
          <g key={x} strokeLinejoin="round">
            <path d={`M${x - 2.4},${t + 9} L${x - 4.4},98 H${x + 4.4} L${x + 2.4},${t + 9}Z`} fill="#6f8d85" stroke={INK} strokeWidth="1" />
            <path d={`M${x - w},${t + 10} Q${x},${t - 10} ${x + w},${t + 10} Q${x},${t + 14} ${x - w},${t + 10}Z`} fill="#17a673" stroke={INK} strokeWidth="1.1" />
            {[-0.55, 0, 0.55].map((k) => <circle key={k} cx={x + k * w} cy={t + 10.6 - Math.abs(k) * 1.4} r="1.5" fill="#ff7fc6" />)}
          </g>
        ))}
        {/* the bay */}
        <rect y="94" width="560" height="56" fill="url(#mrt-sea)" />
        <path d="M0,106 q10,-4 20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0 t20,0" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
        <path d="M240,112 q10,-4 20,0 t20,0 t20,0 t20,0" fill="none" stroke="#ffe08a" strokeWidth="1.6" strokeLinecap="round" className="sg-glint" />
        {/* Marina Bay Sands: three towers, the SkyPark ship on top */}
        <g strokeLinejoin="round">
          {[{ x: 288, lean: 5 }, { x: 318, lean: 0 }, { x: 348, lean: -5 }].map(({ x, lean }) => (
            <path key={x} d={`M${x - 8},96 L${x - 7 + lean * 0.4},40 L${x + 8 + lean * 0.4},40 L${x + 8},96Z`} fill="#f4f1ea" stroke={INK} strokeWidth="1.1" />
          ))}
          {[{ x: 288 }, { x: 318 }, { x: 348 }].map(({ x }) => (
            <g key={x} stroke="#9fb9bf" strokeWidth=".7">
              {[50, 58, 66, 74, 82, 90].map((y) => <path key={y} d={`M${x - 7},${y} H${x + 7}`} />)}
            </g>
          ))}
          <path d="M270,40 Q300,36 320,38 Q350,36 372,40 L366,44 Q320,40 276,44Z" fill="#fff" stroke={INK} strokeWidth="1.1" />
          <path d="M338,38 Q352,30 372,38" fill="none" stroke="#17a673" strokeWidth="2" strokeLinecap="round" />
          <path d="M280,96 H358" stroke={INK} strokeWidth="1.2" />
        </g>
        {/* the Merlion, spouting into the bay */}
        <g strokeLinejoin="round" transform="translate(52 0)">
          <path d="M92,100 Q148,66 176,96" fill="none" stroke="#e8fbff" strokeWidth="3" strokeLinecap="round" className="mrt-jet" opacity=".95" />
          <rect x="62" y="92" width="26" height="9" rx="2" fill="#d9d3c4" stroke={INK} strokeWidth="1" />
          <path d="M66,92 C62,78 66,66 72,60 L88,60 C92,66 92,74 88,80 C94,84 98,88 96,92Z" fill="#f4f6f8" stroke={INK} strokeWidth="1.1" />
          <path d="M88,80 Q96,78 100,70 Q92,72 90,66" fill="#e6edf1" stroke={INK} strokeWidth=".9" />
          {Array.from({ length: 11 }, (_, i) => {
            const a = (i / 11) * Math.PI * 2;
            return <circle key={i} cx={(80 + Math.cos(a) * 11.6).toFixed(1)} cy={(50 + Math.sin(a) * 11.6).toFixed(1)} r="4.2" fill="#f3d27a" stroke={INK} strokeWidth=".8" />;
          })}
          <circle cx="80" cy="50" r="10.6" fill="#f7e2a6" stroke={INK} strokeWidth="1.1" />
          <circle cx="75.6" cy="47.6" r="1.4" fill={INK} /><circle cx="84" cy="47.6" r="1.4" fill={INK} />
          <path d="M77.6,52 Q80,50.6 82.4,52 L80,54.6Z" fill="#c9783a" stroke={INK} strokeWidth=".7" />
          <path d="M70,55 Q76,60 80,57" fill="#d8453a" stroke={INK} strokeWidth=".8" />
        </g>
        {/* the viaduct and an MRT train, in the six line colours */}
        <g>
          <rect y="124" width="560" height="5" fill="#cfd9db" stroke={INK} strokeWidth="1" />
          {[30, 130, 230, 330, 430, 530].map((x) => <rect key={x} x={x - 4} y="129" width="8" height="21" fill="#f4efe3" stroke={INK} strokeWidth="1" />)}
          <g className="mrt-train">
            <g transform="translate(250 100)" strokeLinejoin="round">
              <path d="M0,0 H92 C106,0 116,8 120,18 V24 H0Z" fill="#fff" stroke={INK} strokeWidth="1.3" />
              {MRT_LINES.map((c, i) => <rect key={c} x="1" y={14.2 + i * 1.6} width="118" height="1.6" fill={c} />)}
              {[6, 22, 38, 54, 70].map((x) => <rect key={x} x={x} y="4" width="12" height="8" rx="1.8" fill="#2b5a78" stroke={INK} strokeWidth=".8" />)}
              <path d="M88,4 H94 C101,4 108,8 111,12 H88Z" fill="#2b5a78" stroke={INK} strokeWidth=".8" />
              <circle cx="115" cy="20" r="1.8" fill="#ffe27a" stroke={INK} strokeWidth=".6" />
              <rect x="0" y="24" width="120" height="2.4" fill={INK} />
            </g>
          </g>
        </g>
        {[{ x: 40, y: 20 }, { x: 250, y: 12 }, { x: 420, y: 22 }].map(({ x, y }, i) => (
          <g key={x} className="mrt-twinkle" style={{ animationDelay: `${i * 0.9}s` }}>
            <Orchid x={x} y={y} s={0.34} petal="#ffd45a" light="#fff1b8" />
          </g>
        ))}
      </svg>
    </div>
  );
}
