import { useEffect, useState, type CSSProperties } from 'react';
import type { CurtainProps } from './EnterCurtain';
import './rail.css';

/**
 * 'rail' (Europe) curtain: on a covered platform, facing the art-deco doors of a grand continental sleeping car.
 * Closed: the lacquered doors (brass inlay, green-enamel sunburst) are set in the navy, gold-lined side of the
 * carriage, between lamp-lit compartment windows (curtains, a table lamp, a passenger reading), under the iron and
 * glass of the station roof. A gas lamp, a hanging station clock, a luggage trolley piled with trunks, steam drifting
 * along the platform, and the enamel plaque carrying the title. A waiting cue (introRail.ts `playRailWaiting`) plays.
 * Opening: the brass catch turns, the plaque splits at the seam and falls away, the doors swing inward onto
 * champagne light, steam billows, and the camera pushes through the doorway; the light then dissolves into the real
 * board, which comes into focus from a blurred, warm-washed glow (`backdrop-filter`, as in the USA intro).
 * Closed build ~2.8 s (HOLD_MS 3.2 s); opening beats inside OPEN_MS (5.2 s): glow gone by ~4.7 s, focus by ~4.95 s.
 *
 * Geometry: the doorway box is --dw wide and 1.6 --dw tall (SVG units 100 x 160: doors x 0..100, y 0..160; the
 * carriage roof sits at y -40..-26, the platform starts at y 184). The box's top is at 22vh.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** --dw in px, mirrored from rail.css (min(34vw, 36vh)); the door centre sits at 22vh + .8 dw. */
function dollyZoom(): number {
  if (typeof window === 'undefined') return 6;
  const vw = window.innerWidth, vh = window.innerHeight;
  const dw = Math.min(0.34 * vw, 0.36 * vh);
  const oy = 0.22 * vh + 0.8 * dw;
  const s = Math.max(vw / dw, (2 * Math.max(oy, vh - oy)) / (1.6 * dw));
  return Math.max(2, s * 1.15);
}

/* ============================== the doors (art-deco, lacquer and brass) ============================== */

/** Sunburst rays fanning out from the seam (x = 500, y = 500); the right door mirrors the whole face. */
const RAYS = range(17).map((i) => {
  const deg = 100 + i * 10;
  const half = i % 2 ? 1.1 : 2.4;
  const pt = (a: number) => {
    const r = (a * Math.PI) / 180;
    return `${(500 + 1300 * Math.cos(r)).toFixed(1)},${(500 + 1300 * Math.sin(r)).toFixed(1)}`;
  };
  return { d: `500,500 ${pt(deg - half)} ${pt(deg + half)}`, thin: i % 2 === 1, i };
});

function Sunburst() {
  return (
    <svg className="rc-sun" viewBox="0 0 500 1000" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <defs>
        <linearGradient id="rc-brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3dc9a" />
          <stop offset=".45" stopColor="#c9a24e" />
          <stop offset="1" stopColor="#7d5a22" />
        </linearGradient>
      </defs>
      {RAYS.map((r) => <polygon key={r.i} points={r.d} fill="url(#rc-brass)" opacity={r.thin ? 0.35 : 0.6} />)}
      {[170, 230, 300].map((r) => <circle key={r} cx="500" cy="500" r={r} fill="none" stroke="#c9a24e" strokeWidth={r === 230 ? 5 : 2} opacity=".7" />)}
      <circle cx="500" cy="500" r="120" fill="#16362a" stroke="#d9b866" strokeWidth="4" />
    </svg>
  );
}

function Door({ side }: { side: 'l' | 'r' }) {
  return (
    <div className={`rc-door rc-door-${side}`}>
      <div className="rc-face">
        <div className="rc-frame">
          <div className="rc-chev rc-chev-top" />
          <div className="rc-enamel"><Sunburst /><div className="rc-glint" /></div>
          <div className="rc-chev rc-chev-bot" />
        </div>
        <div className="rc-seam" />
        <div className="rc-handle" />
        <div className="rc-hinge" style={{ top: '12%' }} />
        <div className="rc-hinge" style={{ top: '48%' }} />
        <div className="rc-hinge" style={{ top: '84%' }} />
      </div>
      <div className="rc-shade" />
    </div>
  );
}

/* ============================== the plaque ============================== */

/** `at`: place it inside another SVG (x, y, width) instead of as a block on the plaque */
function WingedWheel({ className = 'rc-wheel', at }: { className?: string; at?: [number, number, number] }) {
  const wing = 'M37 22 C 28 13 14 12 2 15 C 13 17 22 18 37 24 Z M37 26 C 28 20 17 20 7 22 C 16 24 25 25 37 28 Z M38 30 C 30 27 21 28 13 30 C 21 31 29 32 38 32 Z';
  const place = at ? { x: at[0], y: at[1], width: at[2], height: at[2] * 0.46 } : {};
  return (
    <svg className={className} viewBox="0 0 100 46" aria-hidden {...place}>
      <g fill="currentColor">
        <path d={wing} />
        <path d={wing} transform="translate(100 0) scale(-1 1)" />
      </g>
      <g className="rc-wheel-spin" fill="none" stroke="currentColor">
        <circle cx="50" cy="25" r="12" strokeWidth="2.6" />
        <circle cx="50" cy="25" r="3" fill="currentColor" stroke="none" />
        {[0, 45, 90, 135].map((a) => <line key={a} x1="50" y1="13" x2="50" y2="37" strokeWidth="1.6" transform={`rotate(${a} 50 25)`} />)}
      </g>
    </svg>
  );
}

function PlaqueFace({ title }: { title: string }) {
  return (
    <div className="rc-plaque-in">
      <WingedWheel />
      <div className="rc-kicker">Société des Voyages Continentaux</div>
      <div className="rc-title">{title}</div>
      <div className="rc-rule"><span /><i /><span /></div>
      <div className="rc-sub">Départ&nbsp;·&nbsp;Voie&nbsp;1&nbsp;·&nbsp;Toutes Directions</div>
    </div>
  );
}

/** Two clipped copies of the plaque, so it can split at the seam and fall away in halves. */
function Plaque({ title }: { title: string }) {
  return (
    <div className="rc-plaques">
      <div className="rc-plaque rc-plaque-l"><PlaqueFace title={title} /></div>
      <div className="rc-plaque rc-plaque-r"><PlaqueFace title={title} /></div>
    </div>
  );
}

/* ============================== the carriage and the platform ============================== */

const HOLE = 'M0 0 H100 V160 H0 Z';
const WINDOWS = [{ x: -182, who: true }, { x: 178, who: false }];
const FLOOR_RAYS = range(19).map((i) => i - 9);
const TRUSSES = range(9).map((i) => -360 + i * 110);

/** a compartment window: lamp-lit interior, drawn curtains, a table lamp, maybe a passenger reading */
function CompartmentWindow({ x, who }: { x: number; who: boolean }) {
  const id = `rc-win-${x < 0 ? 'l' : 'r'}`;
  return (
    <g transform={`translate(${x} 8)`}>
      <defs>
        <clipPath id={id}><rect width="104" height="70" rx="7" /></clipPath>
      </defs>
      <circle className="rc-winglow" cx="52" cy="35" r="80" fill="url(#rc-spill)" />
      <g clipPath={`url(#${id})`}>
        <rect width="104" height="70" fill="url(#rc-cabin)" />
        {/* panelled cabin wall and the seat back */}
        <g stroke="#5a2a14" strokeOpacity=".35" strokeWidth=".6" fill="none">
          <rect x="30" y="8" width="44" height="30" />
          <rect x="33" y="11" width="38" height="24" />
        </g>
        <rect x="14" y="44" width="76" height="30" rx="5" fill="#5b1a22" />
        <rect x="14" y="44" width="76" height="3" rx="1.5" fill="#8a2c36" />
        {who && (
          <g fill="#1d0f0b">
            <circle cx="70" cy="33" r="6.5" />
            <path d="M62.5 30 h15 l-2 -2.4 h-11 z" />
            <path d="M58 70 C 58 50 63 42 70 42 C 77 42 82 50 82 70 Z" />
            {/* the newspaper */}
            <polygon points="50,46 66,43 68,60 52,63" fill="#efe4c8" />
            <g stroke="#7a6a50" strokeWidth=".5"><line x1="53" y1="49" x2="64" y2="47" /><line x1="53.5" y1="52" x2="64.5" y2="50" /><line x1="54" y1="55" x2="65" y2="53" /></g>
          </g>
        )}
        {/* the table lamp under its pleated shade */}
        <rect x="18" y="58" width="68" height="4" fill="#3a1a10" />
        <g transform={`translate(${who ? 30 : 52} 0)`}>
          <circle cx="0" cy="44" r="16" fill="url(#rc-lampglow)" />
          <polygon points="-7,46 7,46 4.5,37 -4.5,37" fill="#ffd38a" />
          <g stroke="#e0a85a" strokeWidth=".4">{[-4, -1.5, 1.5, 4].map((p) => <line key={p} x1={p * 0.65} y1="37" x2={p} y2="46" />)}</g>
          <rect x="-.8" y="46" width="1.6" height="9" fill="#c9a24e" />
          <ellipse cx="0" cy="57.5" rx="4.5" ry="1.4" fill="#c9a24e" />
        </g>
        {/* curtains tied back on both sides */}
        <path d="M0 0 H22 C 18 18 12 30 15 40 C 10 44 6 60 8 70 H0 Z" fill="#7b1e2b" />
        <path d="M104 0 H82 C 86 18 92 30 89 40 C 94 44 98 60 96 70 H104 Z" fill="#7b1e2b" />
        <g stroke="#4e0f18" strokeWidth=".7" fill="none" opacity=".7">
          <path d="M6 0 C 6 20 4 30 10 40" /><path d="M13 0 C 12 18 9 30 13 40" />
          <path d="M98 0 C 98 20 100 30 94 40" /><path d="M91 0 C 92 18 95 30 91 40" />
        </g>
        <rect x="11" y="38" width="7" height="3" rx="1.5" fill="#c9a24e" />
        <rect x="86" y="38" width="7" height="3" rx="1.5" fill="#c9a24e" />
        {/* the glass: a sash bar and a cool reflection of the station roof */}
        <rect y="30" width="104" height="1.6" fill="#c9a24e" opacity=".75" />
        <polygon points="20,0 44,0 14,70 -10,70" fill="#dfe8f0" opacity=".1" />
        <polygon points="54,0 62,0 32,70 24,70" fill="#dfe8f0" opacity=".07" />
      </g>
      <rect width="104" height="70" rx="7" fill="none" stroke="url(#rc-brassg)" strokeWidth="2.4" />
      <rect x="-2.4" y="-2.4" width="108.8" height="74.8" rx="9" fill="none" stroke="#0b1120" strokeOpacity=".6" strokeWidth=".8" />
    </g>
  );
}

function StationClock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 -60 V-17" stroke="#1d2420" strokeWidth="1.6" />
      <path d="M-8 -17 Q0 -24 8 -17" stroke="#1d2420" strokeWidth="1.4" fill="none" />
      <circle r="14" fill="#1d2420" />
      <circle r="12.2" fill="#f4efe2" />
      {range(12).map((i) => {
        const a = (i * Math.PI) / 6;
        return <rect key={i} x="-.45" y="-11.2" width=".9" height={i % 3 ? 2 : 3.2} fill="#1d2420" transform={`rotate(${(a * 180) / Math.PI})`} />;
      })}
      <line x1="0" y1="0" x2="-5" y2="-4.4" stroke="#1d2420" strokeWidth="1.3" strokeLinecap="round" />
      <line className="rc-minute" x1="0" y1="0" x2="0" y2="-10" stroke="#1d2420" strokeWidth=".9" strokeLinecap="round" />
      {/* the red-disc seconds hand of a station clock */}
      <g className="rc-second">
        <line x1="0" y1="3" x2="0" y2="-8" stroke="#b5121b" strokeWidth=".45" />
        <circle cy="-8" r="1.5" fill="#b5121b" />
      </g>
      <circle r=".9" fill="#1d2420" />
      <path d="M-8.4 -8.4 A12 12 0 0 1 4 -11.4" stroke="#fff" strokeOpacity=".55" strokeWidth=".9" fill="none" />
    </g>
  );
}

function GasLamp({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <circle className="rc-gasglow" cx="0" cy="-38" r="40" fill="url(#rc-lampglow)" />
      <rect x="-2.2" y="-26" width="4.4" height="252" fill="#1f3a30" />
      <rect x="-.8" y="-26" width="1" height="252" fill="#5f8a74" opacity=".5" />
      {[30, 120].map((yy) => <rect key={yy} x="-3.4" y={yy} width="6.8" height="3" rx="1" fill="#1f3a30" />)}
      <path d="M-7 226 h14 l-2 -14 h-10 z" fill="#1f3a30" />
      {/* lantern */}
      <path d="M-7 -28 h14 l-2 -16 h-10 z" fill="#ffe2a2" />
      <path d="M-7 -28 h14 l-2 -16 h-10 z" fill="none" stroke="#1f3a30" strokeWidth="1.2" />
      <line x1="0" y1="-44" x2="0" y2="-28" stroke="#1f3a30" strokeWidth=".8" />
      <path d="M-8 -44 h16 l-8 -6 z" fill="#1f3a30" />
      <circle cy="-51.5" r="1.6" fill="#1f3a30" />
      <path d="M-5 -28 h10 l-1 3 h-8 z" fill="#1f3a30" />
    </g>
  );
}

function LuggageTrolley({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} -36)`}>
      <ellipse cx="50" cy="244" rx="58" ry="6" fill="#000" opacity=".35" />
      {/* trunk with travel labels, a valise, a hatbox */}
      <rect x="6" y="180" width="72" height="40" rx="2.5" fill="#6b3a1e" />
      <rect x="6" y="180" width="72" height="7" rx="2.5" fill="#83502b" />
      {[22, 62].map((sx) => <rect key={sx} x={sx} y="180" width="4" height="40" fill="#3a1d0e" />)}
      {[[6, 180], [74, 180], [6, 216], [74, 216]].map(([cx, cy]) => <rect key={`${cx}-${cy}`} x={cx} y={cy} width="4" height="4" fill="url(#rc-brassg)" />)}
      <circle cx="40" cy="200" r="6" fill="#e8d7a8" />
      <text x="40" y="201.6" fontSize="3.4" textAnchor="middle" fill="#7b1e2b" fontWeight="700">WIEN</text>
      <rect x="48" y="192" width="12" height="7" rx="1" fill="#2f5a8a" transform="rotate(-8 54 195)" />
      <text x="54" y="197" fontSize="2.6" textAnchor="middle" fill="#f2ead6" transform="rotate(-8 54 195)">PARIS</text>
      <rect x="16" y="160" width="50" height="20" rx="3" fill="#2a3a5c" />
      <rect x="16" y="160" width="50" height="3" rx="1.5" fill="#3d5280" />
      <path d="M34 160 v-4 a2.4 2.4 0 0 1 2.4 -2.4 h9 a2.4 2.4 0 0 1 2.4 2.4 v4" stroke="#14203a" strokeWidth="1.6" fill="none" />
      <ellipse cx="66" cy="160" rx="13" ry="3.6" fill="#a85a6a" />
      <rect x="53" y="146" width="26" height="14" fill="#c27080" />
      <ellipse cx="66" cy="146" rx="13" ry="3.6" fill="#d88c9b" />
      <rect x="53" y="150" width="26" height="2" fill="#f2ead6" opacity=".7" />
      {/* the trolley itself */}
      <rect x="0" y="220" width="96" height="6" fill="#2c2018" />
      <rect x="0" y="220" width="96" height="1.2" fill="#8a6a4a" />
      <path d="M96 222 L 112 196" stroke="#2c2018" strokeWidth="2.6" strokeLinecap="round" />
      {[12, 84].map((wx) => (
        <g key={wx}>
          <circle cx={wx} cy="234" r="9" fill="#1a120d" />
          <circle cx={wx} cy="234" r="3" fill="#5a4636" />
        </g>
      ))}
    </g>
  );
}

function Carriage() {
  return (
    <svg className="rc-wall" viewBox="0 0 100 160" overflow="visible" aria-hidden>
      <defs>
        <linearGradient id="rc-brassg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3a6" />
          <stop offset=".45" stopColor="#c9a24e" />
          <stop offset="1" stopColor="#6e4f1c" />
        </linearGradient>
        <linearGradient id="rc-body" x1="0" y1="-26" x2="0" y2="172" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#24345a" />
          <stop offset=".45" stopColor="#1a2746" />
          <stop offset="1" stopColor="#0f1830" />
        </linearGradient>
        <linearGradient id="rc-roof" x1="0" y1="-40" x2="0" y2="-26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5d636c" />
          <stop offset="1" stopColor="#2b2f36" />
        </linearGradient>
        <linearGradient id="rc-canopy" x1="0" y1="-260" x2="0" y2="-40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b3e45" />
          <stop offset=".6" stopColor="#a49c8c" />
          <stop offset="1" stopColor="#d9cdb2" />
        </linearGradient>
        <linearGradient id="rc-platform" x1="0" y1="184" x2="0" y2="330" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9a8f7e" />
          <stop offset=".45" stopColor="#6e6455" />
          <stop offset="1" stopColor="#2d2822" />
        </linearGradient>
        <radialGradient id="rc-cabin" cx="52" cy="40" r="70" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe0a6" />
          <stop offset=".45" stopColor="#d9955a" />
          <stop offset="1" stopColor="#6a3218" />
        </radialGradient>
        <radialGradient id="rc-spill">
          <stop offset="0" stopColor="#ffcf86" stopOpacity=".22" />
          <stop offset="1" stopColor="#ffcf86" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rc-lampglow">
          <stop offset="0" stopColor="#fff2c4" stopOpacity=".85" />
          <stop offset=".35" stopColor="#ffd38a" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffd38a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rc-pool" x1="0" y1="160" x2="0" y2="320" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff1cf" stopOpacity=".95" />
          <stop offset=".5" stopColor="#f6cf8a" stopOpacity=".3" />
          <stop offset="1" stopColor="#f6cf8a" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* the station roof: iron arches over glass, hazy morning light */}
      <rect x="-2000" y="-2000" width="4100" height="1960" fill="url(#rc-canopy)" />
      <g stroke="#2a2c30" fill="none">
        {range(60).map((i) => <line key={i} x1={-700 + i * 25} y1="-40" x2={-700 + i * 25} y2="-400" strokeWidth=".6" opacity=".5" />)}
        {TRUSSES.map((tx) => (
          <g key={tx} strokeWidth="2.2">
            <path d={`M${tx} -40 Q ${tx + 55} -150 ${tx + 110} -40`} />
            <path d={`M${tx + 8} -40 Q ${tx + 55} -132 ${tx + 102} -40`} strokeWidth=".8" />
          </g>
        ))}
        <line x1="-2000" y1="-62" x2="2100" y2="-62" strokeWidth="1.6" />
      </g>
      <rect className="rc-haze" x="-2000" y="-120" width="4100" height="90" fill="#f2e6c8" opacity=".18" />

      {/* the carriage: roof, navy body with gold lining, the doorway */}
      <rect x="-2000" y="-40" width="4100" height="14" fill="url(#rc-roof)" />
      <rect x="-2000" y="-40" width="4100" height="1" fill="#9aa1aa" opacity=".6" />
      {range(40).map((i) => <rect key={i} x={-700 + i * 40} y="-36" width="10" height="3" rx="1" fill="#1f2228" />)}
      <path d={`M-2000 -26 H2100 V172 H-2000 Z ${HOLE}`} fill="url(#rc-body)" fillRule="evenodd" />
      <g stroke="#c9a24e" fill="none" strokeOpacity=".75">
        <line x1="-2000" y1="-21" x2="2100" y2="-21" strokeWidth=".7" />
        <line x1="-2000" y1="-6" x2="2100" y2="-6" strokeWidth=".5" />
        {/* the waist lining stops at the door surround (it must not cross the doorway) */}
        <path d="M-2000 100 H-6 M106 100 H2100" strokeWidth=".7" />
        <path d="M-2000 104 H-6 M106 104 H2100" strokeWidth=".35" />
        <line x1="-2000" y1="166" x2="2100" y2="166" strokeWidth=".7" />
        {[-260, -186, -66, 166, 290].map((px) => <rect key={px} x={px} y="112" width={px === -66 ? 54 : 70} height="46" rx="2" strokeWidth=".5" />)}
        <rect x="114" y="112" width="44" height="46" rx="2" strokeWidth=".5" />
      </g>
      <text x="50" y="-10.4" fontSize="6" textAnchor="middle" className="rc-goldtxt" fill="url(#rc-brassg)" letterSpacing="1.6">VOITURE-LITS · 1RE CLASSE</text>
      <text x="-130" y="-10.4" fontSize="5" textAnchor="middle" className="rc-goldtxt" fill="url(#rc-brassg)" letterSpacing="1.4">SOCIÉTÉ DES VOYAGES CONTINENTAUX</text>
      <text x="228" y="-10.4" fontSize="5" textAnchor="middle" className="rc-goldtxt" fill="url(#rc-brassg)" letterSpacing="1.4">SOCIÉTÉ DES VOYAGES CONTINENTAUX</text>
      {/* door surround, step */}
      <rect x="-6" y="-4" width="6" height="168" fill="url(#rc-brassg)" opacity=".85" />
      <rect x="100" y="-4" width="6" height="168" fill="url(#rc-brassg)" opacity=".85" />
      <rect x="-6" y="-4" width="112" height="4" fill="url(#rc-brassg)" opacity=".85" />
      <rect x="2" y="160" width="96" height="8" fill="#3a2a1a" />
      <rect x="2" y="160" width="96" height="2" fill="url(#rc-brassg)" />

      {WINDOWS.map((w) => <CompartmentWindow key={w.x} x={w.x} who={w.who} />)}
      {/* destination plate and the emblem */}
      <g transform="translate(-182 86)">
        <rect width="104" height="10" rx="1.4" fill="#f2ead6" />
        <rect x=".8" y=".8" width="102.4" height="8.4" rx="1" fill="none" stroke="#7b1e2b" strokeWidth=".5" />
        <text x="52" y="6.6" fontSize="3.3" textAnchor="middle" fill="#1f2a24" letterSpacing=".4" className="rc-goldtxt">PARIS · MÜNCHEN · WIEN · BUDAPEST</text>
      </g>
      <g color="#d4ad57"><WingedWheel className="rc-emblem" at={[120, 34, 36]} /></g>
      <text x="138" y="70" fontSize="16" textAnchor="middle" fill="url(#rc-brassg)" className="rc-goldtxt">1</text>

      {/* underframe and the platform */}
      <rect x="-2000" y="172" width="4100" height="12" fill="#0b0b0d" />
      {range(14).map((i) => <circle key={i} cx={-600 + i * 110} cy="183" r="7" fill="#1a1a1e" />)}
      <rect x="-2000" y="184" width="4100" height="2000" fill="url(#rc-platform)" />
      <rect x="-2000" y="184" width="4100" height="3" fill="#e8dfc8" opacity=".8" />
      <g stroke="#1e1a15" strokeOpacity=".35" strokeWidth=".4">
        {FLOOR_RAYS.map((k) => <line key={k} x1={50 + k * 30} y1="187" x2={50 + k * 30 * 40} y2={187 + 127 * 40} />)}
        {[8, 20, 38, 64, 100].map((d) => <line key={d} x1="-2000" y1={187 + d} x2="2100" y2={187 + d} />)}
      </g>
      {/* warm light from the windows lying on the wet platform */}
      {WINDOWS.map((w) => <polygon key={w.x} points={`${w.x},187 ${w.x + 104},187 ${w.x + 150},260 ${w.x - 40},260`} fill="#ffcf86" opacity=".08" />)}
      <polygon className="rc-pool" points="0,187 100,187 240,330 -140,330" fill="url(#rc-pool)" />

      <GasLamp x={-42} />
      <StationClock x={232} y={-44} />
      <LuggageTrolley x={120} />

      {/* the platform dims as the eye adjusts to the light beyond the doors */}
      <path className="rc-dim" d={`M-2000 -2000 H2100 V2000 H-2000 Z ${HOLE}`} fill="#070403" fillRule="evenodd" />
    </svg>
  );
}

/* ============================== scene ============================== */

const PUFFS = range(8);
const MIST = range(6);
const BOKEH = range(14).map((i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, s: 2 + (i % 4) * 1.6, d: -((i * 1.3) % 9) }));

export function RailCurtain({ opening, title }: CurtainProps) {
  const [zoom, setZoom] = useState(dollyZoom);
  useEffect(() => {
    const on = () => setZoom(dollyZoom());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <div className={`rc-root${opening ? ' rc-open' : ''}`} style={{ '--zoom': zoom } as CSSProperties}>
      {/* beyond the doors: champagne light, which dissolves into the real board underneath */}
      <div className="rc-focus" />
      <div className="rc-glow">
        {BOKEH.map((b, i) => (
          <i key={i} style={{ left: `${b.x}%`, top: `${b.y}%`, '--s': `${b.s}vmin`, animationDelay: `${b.d}s` } as CSSProperties} />
        ))}
      </div>
      <div className="rc-stage">
        <div className="rc-box">
          <div className="rc-backing" />
          <div className="rc-crack" />
          <div className="rc-doors">
            <Door side="l" />
            <Door side="r" />
          </div>
          <Carriage />
          <div className="rc-latch"><div className="rc-latch-bar" /><div className="rc-latch-boss" /></div>
        </div>
      </div>
      <div className="rc-mist">{MIST.map((i) => <span key={i} className={`rc-wisp rc-wisp-${i}`} />)}</div>
      <Plaque title={title} />
      <div className="rc-steam">{PUFFS.map((i) => <span key={i} className={`rc-puff rc-puff-${i}`} />)}</div>
      <div className="rc-bloom" />
      <div className="rc-vignette" />
      <div className="rc-fadein" />
    </div>
  );
}
