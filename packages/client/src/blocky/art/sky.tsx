import { memo, useId } from 'react';
import { hash } from './shape';
import { nightness, skyAt } from './palette';

/** A puffy cloud from overlapping circles with a soft blue underside (no filters). */
export function Puff({ x, y, s, tone = '#fff', shade = '#d7e6f2', o = 1 }: { x: number; y: number; s: number; tone?: string; shade?: string; o?: number }) {
  const b = [[0, 0, 34], [38, -14, 42], [82, -4, 36], [116, 8, 26], [-30, 10, 24], [56, 12, 34]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      {b.map(([dx, dy, r], i) => <circle key={`s${i}`} cx={dx} cy={dy + 8} r={r} fill={shade} />)}
      {b.map(([dx, dy, r], i) => <circle key={i} cx={dx} cy={dy} r={r} fill={tone} />)}
    </g>
  );
}

/** A distant floating islet with a thread of waterfall, hazed toward the sky. */
function Islet({ x, y, s, haze }: { x: number; y: number; s: number; haze: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-60,0 q60,-14 120,0 l-14,10 l-18,26 l-12,6 l-16,30 l-14,-22 l-20,-14 l-10,-18z" fill={haze} opacity=".55" />
      <path d="M-60,0 q60,-14 120,0 q-60,8 -120,0z" fill="#9fc98a" opacity=".6" />
      <path d="M-30,-4 q8,-26 20,-4 M6,-6 q10,-30 24,-2" fill="#8dbb7a" opacity=".55" />
      <path d="M26,4 v60" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
    </g>
  );
}

/**
 * The sky behind every Blocky screen: gradient, high cirrus, distant islets, the mid cloud sea and near wisps,
 * with an airship, birds, sun rays and, toward the end, the moon and stars. `progress` 0..1 sets the time of day;
 * it tints the background only. Ambient motion is CSS (paused when the tab is hidden, calmer with reduced motion).
 */
export const Sky = memo(function Sky({ progress = 0.35, className = '' }: { progress?: number; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const [top, mid, low] = skyAt(progress);
  const night = nightness(progress);
  const p = Math.round(progress * 20) / 20;
  const sunX = 260 + p * 1100, sunY = 260 - Math.sin(Math.min(1, p / 0.8) * Math.PI) * 140 + p * 120;
  const haze = night > 0.5 ? '#3a4c86' : '#a9c4dc';
  return (
    <svg className={`bly-sky ${className}`} viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden style={{ ['--night' as string]: night }}>
      <defs>
        <linearGradient id={`bly-sky-g-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset=".55" stopColor={mid} /><stop offset="1" stopColor={low} /></linearGradient>
        <radialGradient id={`bly-sun-g-${uid}`}><stop offset="0" stopColor="#fffbe6" /><stop offset=".25" stopColor="#fff1b8" stopOpacity=".9" /><stop offset="1" stopColor="#fff1b8" stopOpacity="0" /></radialGradient>
        <linearGradient id={`bly-ray-g-${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff8d8" stopOpacity=".35" /><stop offset="1" stopColor="#fff8d8" stopOpacity="0" /></linearGradient>
        <linearGradient id={`bly-sea-g-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".4" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#eef5fb" /></linearGradient>
        <radialGradient id={`bly-wisp-g-${uid}`}><stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      </defs>
      {/* 1. gradient */}
      <rect width="1600" height="1000" fill={`url(#bly-sky-g-${uid})`} />
      {/* stars and moon (night) */}
      <g opacity={night} className="bly-stars">
        {Array.from({ length: 150 }, (_, i) => <circle key={i} className={i % 6 ? undefined : 'bly-twinkle'} cx={hash(i, 1) * 1600} cy={hash(i, 2) * 620} r={i % 4 ? 1.2 + hash(i, 3) : 2.6 + hash(i, 3) * 1.4} fill="#fff" opacity={0.55 + hash(i, 4) * 0.45} />)}
        <g transform="translate(980 150)"><circle r="78" fill="#fff6dc" opacity=".12" /><circle r="52" fill="#fff6dc" opacity=".2" /><circle r="34" fill="#fdf3d4" /><circle cx="-10" cy="-6" r="7" fill="#e9dcb8" /><circle cx="8" cy="10" r="5" fill="#e9dcb8" /><circle cx="12" cy="-12" r="3.5" fill="#e9dcb8" /></g>
      </g>
      {/* sun and rays (day) */}
      <g opacity={1 - night} transform={`translate(${sunX} ${sunY})`}>
        <g className="bly-rays">{[0, 30, 60, 95, 130, 165, 200, 240, 280, 320].map((a) => <path key={a} d="M0,-14 L520,-46 L520,46 L0,14Z" fill={`url(#bly-ray-g-${uid})`} transform={`rotate(${a})`} />)}</g>
        <circle r="150" fill={`url(#bly-sun-g-${uid})`} />
        <circle r="44" fill="#fff8de" />
      </g>
      {/* 2. high cirrus */}
      <g className="bly-drift-slow" opacity={0.9 - night * 0.55}>
        {[[120, 130, 260], [620, 90, 340], [1120, 150, 280], [1450, 70, 200], [1500, 300, 160]].map(([x, y, w], i) => <g key={i}><ellipse cx={x} cy={y} rx={w} ry="10" fill="#fff" opacity=".7" /><ellipse cx={x + w * 0.3} cy={y + 9} rx={w * 0.6} ry="5" fill="#fff" opacity=".5" /></g>)}
        {[[300, 175, 180], [900, 205, 220], [1380, 380, 120]].map(([x, y, w], i) => <ellipse key={`b${i}`} cx={x} cy={y} rx={w} ry="5" fill="#fff" opacity=".55" />)}
      </g>
      {/* 3. distant islets */}
      <g className="bly-bob-slow">
        <Islet x={170} y={470} s={0.9} haze={haze} />
        <Islet x={1430} y={430} s={1.15} haze={haze} />
        <Islet x={1180} y={560} s={0.55} haze={haze} />
        <Islet x={1390} y={860} s={0.7} haze={haze} />
      </g>
      {/* birds in V formation */}
      {[0, 1].map((f) => (
        <g key={f} className={`bly-birds bly-birds-${f}`} stroke={night > 0.5 ? '#c8d2f0' : '#4a5878'} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity={0.85 - night * 0.5}>
          {[[0, 0], [-24, 13], [-48, 26], [-24, -13], [-48, -26], [-72, 39]].slice(0, f ? 5 : 6).map(([x, y], i) => <path key={i} d={`M${x - 8},${y - 3} q4,-6 8,0 q4,-6 8,0`} />)}
        </g>
      ))}
      {/* the airship */}
      <g className="bly-airship">
        <ellipse cx="0" cy="0" rx="70" ry="24" fill="#e7d1a6" stroke="#6f5320" strokeWidth="2.5" />
        <path d="M-50,-14 q50,-12 100,0 M-60,4 q60,8 120,0" stroke="#b08732" strokeWidth="2" fill="none" />
        <path d="M66,0 l18,-14 v28z" fill="#d9775a" stroke="#6f5320" strokeWidth="2" />
        <path d="M-26,22 l6,14 h40 l6,-14" stroke="#6f5320" strokeWidth="2" fill="none" />
        <rect x="-20" y="34" width="40" height="13" rx="4" fill="#8a5a31" stroke="#5e3b1f" strokeWidth="2" />
        <circle cx="-8" cy="40" r="2.5" fill="#ffe7a6" /><circle cx="6" cy="40" r="2.5" fill="#ffe7a6" />
      </g>
      {/* 4. the mid cloud sea */}
      <rect y="600" width="1600" height="400" fill={`url(#bly-sea-g-${uid})`} opacity={1 - night * 0.55} />
      <g className="bly-drift" opacity={1 - night * 0.45}>
        <Puff x={-40} y={760} s={1.6} /><Puff x={330} y={800} s={1.25} /><Puff x={640} y={830} s={1.7} /><Puff x={1010} y={790} s={1.35} /><Puff x={1330} y={770} s={1.7} />
        <Puff x={140} y={900} s={1.9} /><Puff x={820} y={930} s={2.1} /><Puff x={1450} y={920} s={1.6} />
      </g>
      {/* 5. near wisps */}
      <g className="bly-drift-fast" opacity={0.8 - night * 0.5}>
        <ellipse cx="80" cy="640" rx="200" ry="40" fill={`url(#bly-wisp-g-${uid})`} />
        <ellipse cx="1540" cy="700" rx="240" ry="46" fill={`url(#bly-wisp-g-${uid})`} />
        <ellipse cx="1300" cy="320" rx="160" ry="26" fill={`url(#bly-wisp-g-${uid})`} />
      </g>
    </svg>
  );
});
