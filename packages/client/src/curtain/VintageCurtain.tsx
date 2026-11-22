import { useEffect, useState, type CSSProperties } from 'react';
import type { CurtainProps } from './EnterCurtain';
import './vintage.css';

/**
 * 'vintage' (USA) curtain: the doorway of a 1930s American railroad depot.
 * Closed: the camera faces an arched stone doorway in a dim, lamp-lit concourse: a window onto a hazy desert
 * evening (a tiny train crossing it), a bench, a ticking depot clock, a "Go West" poster and stacked luggage.
 * Gold-leaf "ALL ABOARD" glass on the walnut doors, soft light leaking through the seam and the fanlight, and a
 * railroad ticket carrying the title. A Wild West cue (introVintage.ts `playVintageWaiting`) plays meanwhile.
 * Opening: the conductor's punch clips the ticket, it tears along the perforation and falls, the latch gives, the
 * doors swing open onto pure soft light, and the camera dollies through the doorway into it; the light then
 * dissolves into the real board underneath, which comes into focus from a blurred, sepia-washed glow
 * (`backdrop-filter`). Closed build ~2.8 s (HOLD_MS 3.2 s), opening beats inside OPEN_MS (5.2 s), the glow is
 * gone by ~4.8 s and the focus by ~5.0 s.
 *
 * Geometry: the doorway box is --dw wide and 1.8 --dw tall (SVG units 100 x 180: arch centre (50,50), doors y 50..180).
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** --dw in px, mirrored from vintage.css (min(56vw, 40vh)); the door centre sits at 48% + .25 dw. */
function dollyZoom(): number {
  if (typeof window === 'undefined') return 6;
  const vw = window.innerWidth, vh = window.innerHeight;
  const dw = Math.min(0.56 * vw, 0.4 * vh);
  const oy = 0.48 * vh + 0.25 * dw;
  const s = Math.max(vw / dw, (2 * Math.max(oy, vh - oy)) / (1.3 * dw));
  return Math.max(2, s * 1.15);
}

/* ============================== inside: the depot wall ============================== */

const HOLE = 'M0 180 L0 50 A50 50 0 0 1 100 50 L100 180 Z';
const WALL = `M-3000 -3000 H3100 V180 H-3000 Z ${HOLE}`;
const VOUSSOIRS = range(11).map((i) => 180 + (i + 1) * 15);
const FLOOR_RAYS = range(15).map((i) => -7 + i);

function Sconce({ x }: { x: number }) {
  return (
    <g>
      <circle className="vd-halo" cx={x} cy="88" r="34" fill="url(#vd-halo)" />
      <rect x={x - 3} y="96" width="6" height="12" rx="1.5" fill="url(#vd-brass)" />
      <path d={`M${x - 4} 93 h8 l-1.5 4 h-5 z`} fill="url(#vd-brass)" />
      <circle className="vd-bulb" cx={x} cy="88" r="5" fill="#fff1c2" />
      <circle cx={x} cy="88" r="5" fill="none" stroke="#e9c27a" strokeWidth=".6" />
    </g>
  );
}

/* ---------- decor: a window onto a hazy desert, the depot clock, a travel poster, a bench, luggage ---------- */

/** Window opening in its own frame (66 x 90, arched top), placed at (-140, 22) on the wall. */
const WIN = 'M0 90 V33 A33 33 0 0 1 66 33 V90 Z';
const WIN_POLES = [0.1, 0.25, 0.45, 0.75, 1.1].map((t) => ({ x: 20 - 22 * t, y: 64 + 24 * t, h: 4 + 26 * t }));

function DepotWindow() {
  return (
    <g transform="translate(-140 22)">
      <defs>
        <clipPath id="vd-win"><path d={WIN} /></clipPath>
        <linearGradient id="vd-wsky" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6e5a82" />
          <stop offset=".45" stopColor="#c98a7c" />
          <stop offset=".85" stopColor="#f2c48e" />
          <stop offset="1" stopColor="#fbe0aa" />
        </linearGradient>
        <radialGradient id="vd-wsun" cx="46" cy="57" r="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4d0" stopOpacity=".95" />
          <stop offset=".3" stopColor="#ffd796" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffd796" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vd-wground" x1="0" y1="64" x2="0" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#d8a070" />
          <stop offset="1" stopColor="#7a4630" />
        </linearGradient>
        <linearGradient id="vd-whaze" x1="0" y1="44" x2="0" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe2b4" stopOpacity="0" />
          <stop offset=".6" stopColor="#ffe2b4" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffe2b4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath="url(#vd-win)">
        <rect width="66" height="66" fill="url(#vd-wsky)" />
        <circle cx="46" cy="57" r="26" fill="url(#vd-wsun)" />
        <circle cx="46" cy="57" r="5.5" fill="#fff2cc" opacity=".85" />
        <g className="vd-wclouds" fill="#ffd9b8" opacity=".5">
          <rect x="4" y="22" width="30" height="1.6" rx=".8" />
          <rect x="30" y="30" width="34" height="1.3" rx=".65" />
          <rect x="-6" y="38" width="26" height="1" rx=".5" />
        </g>
        {/* far mesas, then the haze */}
        <path d="M0 64 V52 H9 L12 49 H25 L27 53 H39 L43 50 H56 L59 54 H66 V64 Z" fill="#a8788a" opacity=".75" />
        <rect y="44" width="66" height="28" fill="url(#vd-whaze)" />
        {/* a tiny train crossing far off */}
        <g className="vd-wtrain">
          <g fill="#7a4e5e">
            <rect x="-12" y="-2.2" width="3" height="1.8" />
            <rect x="-8.6" y="-2.2" width="3" height="1.8" />
            <rect x="-5.2" y="-2.6" width="2.4" height="2.2" />
            <rect x="-2.6" y="-2" width="3.6" height="1.6" rx=".7" />
            <rect x="-1.9" y="-3.4" width=".8" height="1.4" />
          </g>
          <g className="vd-wsteam" fill="#ffe6cc" opacity=".6">
            <circle cx="-2" cy="-4.6" r=".9" />
            <circle cx="-4" cy="-5.4" r="1.3" />
            <circle cx="-6.6" cy="-5.9" r="1.7" />
          </g>
        </g>
        {/* near butte, the plain, telegraph line, a saguaro */}
        <path d="M0 64 V43 H5 L8 46 L13 57 L17 64 Z" fill="#7a4a5a" />
        <rect y="64" width="66" height="26" fill="url(#vd-wground)" />
        <path d="M0 70 Q33 69 66 70 M0 78 Q33 77 66 78" stroke="#8a4e30" strokeOpacity=".35" strokeWidth=".5" fill="none" />
        <polyline fill="none" stroke="#4a2a22" strokeWidth=".25" points={WIN_POLES.map((p) => `${p.x},${p.y - p.h * 0.9}`).join(' ')} />
        {WIN_POLES.map((p, i) => <rect key={i} x={p.x - 0.3 - i * 0.12} y={p.y - p.h} width={0.6 + i * 0.24} height={p.h} fill="#4a2a22" />)}
        <path d="M51 86 V68 M51 76 h-3.4 v-5 M51 73 h3 v-4.6" stroke="#4e3226" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* drifting haze over everything */}
        <rect className="vd-whazeband" x="-40" y="50" width="146" height="18" fill="url(#vd-whaze)" opacity=".7" />
        <rect width="66" height="90" fill="#ffdcae" opacity=".14" />
        {/* old glass: a soft reflection */}
        <polygon points="6,90 16,90 50,0 40,0" fill="#fff6e0" opacity=".1" />
      </g>
      {/* sash, mullions, sill */}
      <g stroke="#2a160c" fill="none">
        <path d={WIN} strokeWidth="2.6" />
        <path d="M33 0 V90 M0 33 H66 M0 62 H66" strokeWidth="1.4" />
        <path d="M17 33 A16 16 0 0 1 49 33" strokeWidth="1.2" />
      </g>
      <path d={WIN} stroke="#c9a24e" strokeOpacity=".35" strokeWidth=".4" fill="none" transform="translate(.6 .6)" />
      <path d="M-4 33 A37 37 0 0 1 70 33 V91 H-4 Z M0 90 V33 A33 33 0 0 1 66 33 V90 Z" fill="url(#vd-stone)" fillRule="evenodd" opacity=".9" />
      <rect x="-6" y="90" width="78" height="4" fill="#5e412c" />
      <rect x="-6" y="90" width="78" height=".7" fill="#e8c79a" opacity=".35" />
    </g>
  );
}

function DepotClock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 1.2} y={y - 24} width="2.4" height="9" fill="url(#vd-brass)" />
      <circle cx={x} cy={y} r="15.5" fill="#1c0e06" opacity=".5" transform="translate(1 1.5)" />
      <circle cx={x} cy={y} r="15.5" fill="url(#vd-brass)" />
      <circle cx={x} cy={y} r="13" fill="#f3e6c4" />
      <circle cx={x} cy={y} r="13" fill="none" stroke="#6e4f1c" strokeWidth=".5" />
      {range(12).map((i) => {
        const r = (i * Math.PI) / 6;
        const big = i % 3 === 0;
        return <line key={i} x1={x + Math.sin(r) * (big ? 9.2 : 10.4)} y1={y - Math.cos(r) * (big ? 9.2 : 10.4)} x2={x + Math.sin(r) * 12} y2={y - Math.cos(r) * 12} stroke="#1c2c52" strokeWidth={big ? 1.1 : 0.5} />;
      })}
      <text x={x} y={y - 3.6} fontSize="2.3" textAnchor="middle" fill="#a3262a" className="vd-gold-small" letterSpacing=".3">STANDARD TIME</text>
      <line x1={x} y1={y} x2={x - 5.2} y2={y - 3} stroke="#1c2c52" strokeWidth="1.1" strokeLinecap="round" />
      <line className="vd-minute" x1={x} y1={y} x2={x} y2={y - 10} stroke="#1c2c52" strokeWidth=".8" strokeLinecap="round" style={{ transformOrigin: `${x}px ${y}px` } as CSSProperties} />
      <line className="vd-second" x1={x} y1={y + 2.5} x2={x} y2={y - 11} stroke="#a3262a" strokeWidth=".35" style={{ transformOrigin: `${x}px ${y}px` } as CSSProperties} />
      <circle cx={x} cy={y} r=".9" fill="#a3262a" />
      <path d={`M${x - 9} ${y - 10} A13 13 0 0 1 ${x + 4} ${y - 12.4}`} stroke="#fff" strokeOpacity=".5" strokeWidth="1" fill="none" />
    </g>
  );
}

/** A framed "Go West" travel poster (generic, no railroad brand). */
function Poster({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <defs>
        <linearGradient id="vd-psky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9b25c" />
          <stop offset=".6" stopColor="#e07a3c" />
          <stop offset="1" stopColor="#a3262a" />
        </linearGradient>
        <clipPath id="vd-pclip"><rect x="3" y="3" width="38" height="50" /></clipPath>
      </defs>
      <rect x="1" y="1.5" width="44" height="56" fill="#0e0704" opacity=".5" />
      <rect width="44" height="56" fill="#2a160c" />
      <rect x="1.2" y="1.2" width="41.6" height="53.6" fill="none" stroke="#c9a24e" strokeOpacity=".6" strokeWidth=".5" />
      <g clipPath="url(#vd-pclip)">
        <rect x="3" y="3" width="38" height="50" fill="url(#vd-psky)" />
        {range(9).map((i) => {
          const a = Math.PI + (i * Math.PI) / 8;
          return <polygon key={i} points={`22,36 ${22 + 40 * Math.cos(a - 0.08)},${36 + 40 * Math.sin(a - 0.08)} ${22 + 40 * Math.cos(a + 0.08)},${36 + 40 * Math.sin(a + 0.08)}`} fill="#ffe2a0" opacity=".25" />;
        })}
        <circle cx="22" cy="36" r="8" fill="#ffe7a8" />
        <path d="M3 38 H9 L12 33 H19 L21 37 H28 L31 31 H38 L41 35 V53 H3 Z" fill="#6b2a2c" />
        <rect x="3" y="42" width="38" height="11" fill="#3a1a1c" />
        {/* locomotive in silhouette, heading west */}
        <g fill="#1c0e10" transform="translate(9 35.5)">
          <rect x="4" y="2" width="14" height="4" rx="1.6" />
          <rect x="16" y="-1" width="6" height="7" />
          <rect x="7" y="-1.5" width="2" height="3.5" />
          <polygon points="4,6 0,6.5 4,3" />
          <circle cx="7" cy="6.5" r="1.6" /><circle cx="11" cy="6.5" r="1.6" /><circle cx="15" cy="6.5" r="1.6" /><circle cx="20" cy="7" r="1" />
        </g>
        <g fill="#ffe2c4" opacity=".7"><circle cx="17" cy="31" r="2" /><circle cx="21" cy="28" r="2.6" /><circle cx="26" cy="26" r="3" /></g>
        <rect x="3" y="43.5" width="38" height=".5" fill="#e9b25c" opacity=".5" />
      </g>
      <text x="22" y="13.5" fontSize="7" textAnchor="middle" className="vd-gold" fill="#f3e6c4" stroke="#3a1a1c" strokeWidth=".5" paintOrder="stroke">GO WEST</text>
      <rect x="3" y="16.2" width="38" height="4.4" fill="#1c2c52" />
      <text x="22" y="19.4" fontSize="2.5" textAnchor="middle" className="vd-gold-small" fill="#f3e6c4" letterSpacing=".5">COAST TO COAST BY RAIL</text>
      <text x="22" y="50" fontSize="2.6" textAnchor="middle" className="vd-gold-small" fill="#f3e6c4" letterSpacing=".6">★ THE WESTBOUND LIMITED ★</text>
    </g>
  );
}

function Bench({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="44" cy="188" rx="48" ry="5" fill="#000" opacity=".35" />
      {[0, 1, 2].map((i) => <rect key={i} x="4" y={142 + i * 5.4} width="80" height="3.6" rx=".8" fill="#4e2a16" stroke="#1c0c05" strokeOpacity=".6" strokeWidth=".3" />)}
      <rect x="1" y="160" width="86" height="5" rx="1" fill="#6a3a1f" />
      <rect x="1" y="160" width="86" height="1" fill="#c99a6a" opacity=".35" />
      <rect x="1" y="165" width="86" height="2.4" fill="#2a1408" />
      {[4, 80].map((lx) => (
        <g key={lx} fill="#1c120a">
          <rect x={lx} y="138" width="4" height="27" rx="1" />
          <path d={`M${lx - 1} 165 h6 l-1 21 h-4 z`} />
        </g>
      ))}
      <rect x="40" y="165" width="8" height="21" fill="#1c120a" />
      {/* a folded newspaper someone left behind */}
      <rect x="58" y="157.5" width="12" height="2.8" fill="#e8dcc0" transform="rotate(-6 64 159)" />
    </g>
  );
}

function Luggage({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <ellipse cx="26" cy="186" rx="30" ry="4" fill="#000" opacity=".35" />
      {/* steamer trunk */}
      <rect x="0" y="160" width="52" height="25" rx="2" fill="#5a2a1a" />
      <rect x="0" y="160" width="52" height="6" rx="2" fill="#6e3622" />
      {[10, 40].map((sx) => <rect key={sx} x={sx} y="160" width="3" height="25" fill="#2a160c" />)}
      {[[0, 160], [48, 160], [0, 181], [48, 181]].map(([cx, cy]) => <rect key={`${cx}-${cy}`} x={cx} y={cy} width="4" height="4" fill="url(#vd-brass)" />)}
      <rect x="23" y="164" width="6" height="5" rx="1" fill="url(#vd-brass)" />
      {/* a valise on top, with a tag */}
      <rect x="8" y="146" width="34" height="14" rx="2.5" fill="#7a5a34" />
      <rect x="8" y="146" width="34" height="2" rx="1" fill="#a07a48" />
      <path d="M20 146 v-3.4 a2 2 0 0 1 2 -2 h6 a2 2 0 0 1 2 2 v3.4" stroke="#3a2214" strokeWidth="1.3" fill="none" />
      <rect x="36" y="149" width="5" height="3" fill="#f3e6c4" transform="rotate(18 38 150)" />
    </g>
  );
}

function Wall() {
  return (
    <svg className="vd-wall" viewBox="0 0 100 180" overflow="visible" aria-hidden>
      <defs>
        <radialGradient id="vd-wallg" cx="50" cy="110" r="240" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8c6142" />
          <stop offset=".28" stopColor="#5e3d28" />
          <stop offset=".7" stopColor="#2c1b11" />
          <stop offset="1" stopColor="#140c07" />
        </radialGradient>
        <pattern id="vd-ashlar" width="40" height="20" patternUnits="userSpaceOnUse" x="10" y="0">
          <path d="M0 .3 H40 M0 10.3 H40 M.3 0 V10 M20.3 10 V20" stroke="#ffe0bc" strokeOpacity=".07" strokeWidth=".5" />
          <path d="M0 0 H40 M0 10 H40 M0 0 V10 M20 10 V20" stroke="#120804" strokeOpacity=".45" strokeWidth=".5" />
        </pattern>
        <linearGradient id="vd-oak" x1="0" y1="124" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a2a18" />
          <stop offset="1" stopColor="#24130a" />
        </linearGradient>
        <pattern id="vd-wains" width="30" height="56" patternUnits="userSpaceOnUse" x="-5" y="124">
          <rect x="3" y="6" width="24" height="44" fill="none" stroke="#120804" strokeOpacity=".55" strokeWidth=".8" />
          <rect x="3.8" y="6.8" width="22.4" height="42.4" fill="none" stroke="#c99a6a" strokeOpacity=".12" strokeWidth=".4" />
        </pattern>
        <linearGradient id="vd-floor" x1="0" y1="180" x2="0" y2="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a3022" />
          <stop offset=".5" stopColor="#24160d" />
          <stop offset="1" stopColor="#0e0805" />
        </linearGradient>
        <linearGradient id="vd-stone" x1="0" y1="-14" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b48b62" />
          <stop offset=".5" stopColor="#8e6847" />
          <stop offset="1" stopColor="#5e412c" />
        </linearGradient>
        <linearGradient id="vd-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3a6" />
          <stop offset=".45" stopColor="#c9a24e" />
          <stop offset="1" stopColor="#6e4f1c" />
        </linearGradient>
        <radialGradient id="vd-halo">
          <stop offset="0" stopColor="#ffd98f" stopOpacity=".55" />
          <stop offset=".35" stopColor="#f0a85a" stopOpacity=".2" />
          <stop offset="1" stopColor="#f0a85a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="vd-fanglass" x1="0" y1="0" x2="0" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity=".38" />
          <stop offset="1" stopColor="#ffb066" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id="vd-winbeam" x1="0" y1="60" x2="0" y2="260" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity=".1" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* plaster and ashlar, oak wainscot, marble floor */}
      <path d={WALL} fill="url(#vd-wallg)" fillRule="evenodd" />
      <path d={WALL} fill="url(#vd-ashlar)" fillRule="evenodd" />
      <rect x="-3000" y="124" width="3000" height="56" fill="url(#vd-oak)" />
      <rect x="100" y="124" width="3000" height="56" fill="url(#vd-oak)" />
      <rect x="-3000" y="124" width="3000" height="56" fill="url(#vd-wains)" />
      <rect x="100" y="124" width="3000" height="56" fill="url(#vd-wains)" />
      {[-3000, 100].map((x) => (
        <g key={x}>
          <rect x={x} y="121.5" width="3000" height="3" fill="#3a2214" />
          <rect x={x} y="121.5" width="3000" height=".7" fill="#c99a6a" opacity=".35" />
        </g>
      ))}
      <rect x="-3000" y="180" width="6100" height="3000" fill="url(#vd-floor)" />
      <g stroke="#000" strokeOpacity=".35" strokeWidth=".35">
        {FLOOR_RAYS.map((k) => <line key={k} x1={50 + k * 18} y1="180" x2={50 + k * 18 * 40} y2={180 + 80 * 40} />)}
        {[3, 7, 13, 22, 35, 55, 85, 130].map((d) => <line key={d} x1="-3000" y1={180 + d} x2="3100" y2={180 + d} />)}
      </g>

      {/* stone surround: jambs, voussoirs, keystone */}
      <rect x="-11" y="50" width="11" height="130" fill="url(#vd-stone)" />
      <rect x="100" y="50" width="11" height="130" fill="url(#vd-stone)" />
      <g stroke="#2a170d" strokeOpacity=".55" strokeWidth=".45">
        {[66, 84, 102, 120, 138, 156].map((y) => <path key={y} d={`M-11 ${y} H0 M100 ${y} H111`} />)}
      </g>
      <rect x="-13" y="168" width="15" height="12" fill="#5e412c" />
      <rect x="98" y="168" width="15" height="12" fill="#5e412c" />
      <path d="M-11 50 A61 61 0 0 1 111 50 L100 50 A50 50 0 0 0 0 50 Z" fill="url(#vd-stone)" />
      <g stroke="#2a170d" strokeOpacity=".6" strokeWidth=".5">
        {VOUSSOIRS.map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1={50 + 50 * Math.cos(r)} y1={50 + 50 * Math.sin(r)} x2={50 + 61 * Math.cos(r)} y2={50 + 61 * Math.sin(r)} />;
        })}
      </g>
      <path d="M-11 50 A61 61 0 0 1 111 50" fill="none" stroke="#e8c79a" strokeOpacity=".25" strokeWidth=".6" />
      <polygon points="42.5,-16 57.5,-16 55,1 45,1" fill="url(#vd-stone)" stroke="#2a170d" strokeOpacity=".6" strokeWidth=".5" />
      <path className="vd-star" d="M50 -11.5 l1.3 3.9 h4.1 l-3.3 2.4 1.3 3.9 -3.4 -2.4 -3.4 2.4 1.3 -3.9 -3.3 -2.4 h4.1 z" fill="url(#vd-brass)" />

      {/* fanlight: amber glass with sunburst muntins */}
      <path className="vd-fan" d="M0 50 A50 50 0 0 1 100 50 Z" fill="url(#vd-fanglass)" />
      <g stroke="#2a160c" strokeWidth="1.7" fill="none">
        <path d="M1.5 50 A48.5 48.5 0 0 1 98.5 50" />
        <path d="M37 50 A13 13 0 0 1 63 50" />
        {[30, 60, 90, 120, 150].map((d) => {
          const r = ((180 + d) * Math.PI) / 180;
          return <line key={d} x1={50 + 13 * Math.cos(r)} y1={50 + 13 * Math.sin(r)} x2={50 + 48.5 * Math.cos(r)} y2={50 + 48.5 * Math.sin(r)} />;
        })}
      </g>
      <g stroke="#c9a24e" strokeOpacity=".55" strokeWidth=".35" fill="none">
        <path d="M2.6 50 A47.4 47.4 0 0 1 97.4 50" />
        <path d="M38.1 50 A11.9 11.9 0 0 1 61.9 50" />
      </g>
      <rect x="-1" y="46.5" width="102" height="4.5" fill="#2a160c" />
      <rect x="-1" y="46.9" width="102" height=".6" fill="#c9a24e" opacity=".6" />

      {/* depot decor around the doorway */}
      <polygon className="vd-winbeam" points="-140,60 -74,60 -10,260 -110,260" fill="url(#vd-winbeam)" />
      <DepotWindow />
      <Bench x={-152} />
      <DepotClock x={174} y={36} />
      <Poster x={152} y={60} />
      <Luggage x={146} />

      <Sconce x={-30} />
      <Sconce x={130} />
      {/* the room darkens as the eye adjusts to the sunlight outside */}
      <path className="vd-dim" d={`M-3000 -3000 H3100 V3200 H-3000 Z ${HOLE}`} fill="#080402" fillRule="evenodd" />
    </svg>
  );
}

/* ============================== the doors ============================== */

const GRAIN = [5, 11, 18, 24, 31, 37, 44];
/** the leaf with its glass pane cut out, so the world outside shows through */
const WOOD = 'M0 0 H50 V130 H0 Z M8 8 H42 V62 H8 Z';

function Leaf({ side }: { side: 'l' | 'r' }) {
  const id = `vd-${side}`;
  const word = side === 'l' ? 'ALL' : 'ABOARD';
  const small = side === 'l' ? 'TRACK No. 1' : 'WESTBOUND';
  return (
    <div className={`vd-leaf vd-leaf-${side}`}>
      <svg viewBox="0 0 50 130" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={`${id}-wood`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3a1d10" />
            <stop offset=".4" stopColor="#6a3a1f" />
            <stop offset=".7" stopColor="#552d17" />
            <stop offset="1" stopColor="#331a0d" />
          </linearGradient>
          <linearGradient id={`${id}-glass`} x1="0" y1="0" x2=".4" y2="1">
            <stop offset="0" stopColor="#ffe9c4" stopOpacity=".26" />
            <stop offset=".5" stopColor="#ffbe78" stopOpacity=".12" />
            <stop offset="1" stopColor="#5a2c14" stopOpacity=".35" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff2b8" />
            <stop offset=".45" stopColor="#e6b64f" />
            <stop offset=".55" stopColor="#b8862c" />
            <stop offset="1" stopColor="#f2d27a" />
          </linearGradient>
          <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6e3a6" />
            <stop offset=".45" stopColor="#c9a24e" />
            <stop offset="1" stopColor="#6e4f1c" />
          </linearGradient>
          <clipPath id={`${id}-woodclip`}><path d={WOOD} clipRule="evenodd" /></clipPath>
          <clipPath id={`${id}-pane`}><rect x="7" y="7" width="36" height="56" rx="1" /></clipPath>
        </defs>
        <g transform={side === 'r' ? 'translate(50 0) scale(-1 1)' : undefined}>
          <path d={WOOD} fill={`url(#${id}-wood)`} fillRule="evenodd" />
          <g stroke="#1c0c05" strokeOpacity=".22" strokeWidth=".3" fill="none" clipPath={`url(#${id}-woodclip)`}>
            {GRAIN.map((x, i) => <path key={x} d={`M${x} 0 C ${x + (i % 2 ? 1.2 : -1)} 40 ${x + (i % 2 ? -1 : 1.4)} 90 ${x} 130`} />)}
          </g>
          {/* glass pane: the world outside shows through */}
          <rect x="7" y="7" width="36" height="56" rx="1" fill={`url(#${id}-glass)`} />
          <rect x="7" y="7" width="36" height="56" rx="1" fill="#2a1408" opacity=".18" />
          <g clipPath={`url(#${id}-pane)`}>
            <polygon className="vd-sheen" points="0,70 14,70 46,-6 32,-6" fill="#fff6dc" opacity=".22" />
          </g>
          <rect x="7" y="7" width="36" height="56" rx="1" fill="none" stroke={`url(#${id}-brass)`} strokeWidth=".9" />
          <rect x="5.6" y="5.6" width="38.8" height="58.8" rx="1.6" fill="none" stroke="#1c0c05" strokeOpacity=".55" strokeWidth=".8" />
          {/* raised lower panel */}
          <rect x="7" y="71" width="36" height="44" fill="#3e1f10" />
          <polygon points="7,71 43,71 39.5,74.5 10.5,74.5 10.5,111.5 7,115" fill="#8a5330" opacity=".55" />
          <polygon points="43,71 43,115 7,115 10.5,111.5 39.5,111.5 39.5,74.5" fill="#160903" opacity=".55" />
          <rect x="10.5" y="74.5" width="29" height="37" fill="#5a2f18" />
          <rect x="13" y="77" width="24" height="32" fill="none" stroke="#1c0c05" strokeOpacity=".45" strokeWidth=".5" />
          {/* kick plate, push bar, hinges, astragal */}
          <rect x="0" y="119" width="50" height="11" fill={`url(#${id}-brass)`} />
          <rect x="0" y="119" width="50" height=".6" fill="#fff4cc" opacity=".6" />
          {[3, 25, 47].map((x) => <circle key={x} cx={x} cy="124.5" r=".7" fill="#6e4f1c" />)}
          <rect x="44.2" y="58" width="2.6" height="26" rx="1.3" fill={`url(#${id}-brass)`} />
          <rect x="43.6" y="59" width="1.4" height="2.2" fill="#6e4f1c" />
          <rect x="43.6" y="80.8" width="1.4" height="2.2" fill="#6e4f1c" />
          {[12, 64, 106].map((y) => <rect key={y} x="0" y={y} width="1.8" height="9" fill={`url(#${id}-brass)`} />)}
          <rect x="49" y="0" width="1" height="130" fill="#1c0c05" opacity=".7" />
        </g>
        {/* gold-leaf lettering on the glass (never mirrored) */}
        <path id={`${id}-arc`} d="M10 27 Q25 15 40 27" fill="none" />
        <text className="vd-gold" fontSize={side === 'l' ? 10 : 6.6} fill={`url(#${id}-gold)`} stroke="#3a1d0d" strokeWidth=".35" paintOrder="stroke" textAnchor="middle">
          <textPath href={`#${id}-arc`} startOffset="50%">{word}</textPath>
        </text>
        <text className="vd-gold-small" x="25" y="36" fontSize="3.1" fill={`url(#${id}-gold)`} stroke="#3a1d0d" strokeWidth=".3" paintOrder="stroke" textAnchor="middle" letterSpacing=".5">{small}</text>
        <path d="M15 39.5 H35" stroke={`url(#${id}-gold)`} strokeWidth=".4" />
        <rect className="vd-leaf-shade" width="50" height="130" fill="#0b0503" />
      </svg>
    </div>
  );
}

/* ============================== light: shafts and dust ============================== */

const FAN_BEAMS = [
  '18,30 30,20 -40,190 -95,190',
  '40,12 52,10 40,200 0,200',
  '62,13 74,18 140,200 92,200',
  '84,26 92,36 215,190 165,190',
];
const DOOR_BEAMS = [
  '0,52 18,52 -150,330 -260,330',
  '22,52 40,52 -40,330 -120,330',
  '46,52 54,52 75,340 25,340',
  '60,52 78,52 220,330 140,330',
  '82,52 100,52 360,330 250,330',
];
const MOTES = range(16).map((i) => ({ x: 8 + ((i * 37) % 90), y: 70 + ((i * 53) % 110), r: 0.35 + (i % 3) * 0.2, d: -((i * 0.83) % 7) }));

function Shafts() {
  return (
    <svg className="vd-wall vd-shafts" viewBox="0 0 100 180" overflow="visible" aria-hidden>
      <defs>
        <linearGradient id="vd-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe6b0" stopOpacity=".8" />
          <stop offset="1" stopColor="#ffb866" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="vd-pool" x1="0" y1="180" x2="0" y2="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd98c" stopOpacity=".95" />
          <stop offset=".45" stopColor="#f2a457" stopOpacity=".35" />
          <stop offset="1" stopColor="#f2a457" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* light from outside: a pool on the floor, the sill line, the seam */}
      <polygon className="vd-pool" points="0,180 100,180 230,340 -130,340" fill="url(#vd-pool)" />
      <polygon className="vd-pool-seam" points="49,180 51,180 62,340 38,340" fill="url(#vd-pool)" />
      <rect className="vd-sill" x="0" y="179" width="100" height="1.6" fill="#ffe2a0" />
      <g className="vd-fanbeams">{FAN_BEAMS.map((p) => <polygon key={p} points={p} fill="url(#vd-beam)" />)}</g>
      <g className="vd-doorbeams">{DOOR_BEAMS.map((p) => <polygon key={p} points={p} fill="url(#vd-beam)" />)}</g>
      <g className="vd-motes" fill="#fff0c8">
        {MOTES.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={m.r} style={{ animationDelay: `${m.d}s` } as CSSProperties} />)}
      </g>
    </svg>
  );
}

/* ============================== the ticket ============================== */

/** Ragged tear down the middle (same points for both halves, so they fit together). */
const TEAR = range(21).map((i) => `${(50 + (i % 2 ? 0.9 : -0.7) * (i % 3 ? 1 : 0.5)).toFixed(2)}% ${i * 5}%`);
const CLIP_L = `polygon(0% 0%, ${TEAR.join(', ')}, 0% 100%)`;
const CLIP_R = `polygon(100% 0%, ${TEAR.join(', ')}, 100% 100%)`;

function TicketFace({ title }: { title: string }) {
  return (
    <div className="vd-face">
      <div className="vd-face-in">
        <div className="vd-band"><span>No. 1869</span><span>★ First Class ★</span><span>Admit One</span></div>
        <div className="vd-kicker">Good for one passage aboard the</div>
        <div className="vd-title">{title}</div>
        <div className="vd-rule"><span /><i>★</i><span /></div>
        <div className="vd-sub">Westbound Limited</div>
        <div className="vd-perf vd-perf-t" />
        <div className="vd-perf vd-perf-b" />
      </div>
      <div className="vd-stamp"><b>All</b><b>Aboard</b><small>★ 1869 ★</small></div>
      <div className="vd-punch" />
    </div>
  );
}

function Ticket({ title }: { title: string }) {
  return (
    <div className="vd-ticket">
      <div className="vd-ticket-jolt">
        <div className="vd-whole"><TicketFace title={title} /></div>
        <div className="vd-half vd-half-l" style={{ clipPath: CLIP_L }}><TicketFace title={title} /></div>
        <div className="vd-half vd-half-r" style={{ clipPath: CLIP_R }}><TicketFace title={title} /></div>
        <div className="vd-chad" />
      </div>
    </div>
  );
}

/* ============================== scene ============================== */

export function VintageCurtain({ opening, title }: CurtainProps) {
  const [zoom, setZoom] = useState(dollyZoom);
  useEffect(() => {
    const on = () => setZoom(dollyZoom());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <div className={`vd-root${opening ? ' vd-open' : ''}`} style={{ '--zoom': zoom } as CSSProperties}>
      {/* beyond the doors: no landscape, only light, which dissolves into the real board underneath */}
      <div className="vd-focus" />
      <div className="vd-glow"><div className="vd-glow-rays" /></div>
      <div className="vd-stage">
        <div className="vd-box">
          <Wall />
          <div className="vd-doors">
            <Leaf side="l" />
            <Leaf side="r" />
            <div className="vd-seamlight" />
          </div>
          <Shafts />
        </div>
      </div>
      <Ticket title={title} />
      <div className="vd-bloom" />
      <div className="vd-vignette" />
      <div className="vd-bar vd-bar-t" />
      <div className="vd-bar vd-bar-b" />
      <div className="vd-fadein" />
    </div>
  );
}
