import { useEffect, useRef, type CSSProperties } from 'react';
import type { KView } from '@boboland/shared/src/kingdom';
import { INK } from './Defs';

export type TimeOfDay = 'morning' | 'afternoon' | 'sunset' | 'night';
/** The time of day follows the game: morning, golden afternoon, sunset when a hero heads home, night at the finish. */
export function timeOfDay(d: Pick<KView, 'result' | 'order' | 'out' | 'left' | 'found'>): TimeOfDay {
  if (d.result) return 'night';
  const live = d.order.filter((p) => !d.out.includes(p));
  if (live.some((p) => d.left[p] === 0)) return 'sunset';
  const found = live.reduce((n, p) => n + d.found[p].length, 0);
  const total = live.reduce((n, p) => n + d.found[p].length + d.left[p], 0);
  return total && found / total >= 0.34 ? 'afternoon' : 'morning';
}

const ink = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const CLOUD = 'M0,30 Q-4,12 14,10 Q20,-4 38,2 Q50,-8 64,4 Q82,0 84,18 Q98,22 92,34 Z';
const tree = (x: number, y: number, s: number, k: number) => (
  <g key={k} transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M0,0 V18" stroke="#5a3a20" strokeWidth="6" />
    <path d="M-22,4 Q-30,-14 -14,-22 Q-14,-44 4,-44 Q22,-46 22,-26 Q36,-18 26,2 Q4,10 -22,4 Z" fill={k % 3 ? '#5f9a46' : '#4f8a3c'} {...ink} />
    <path d="M-8,-26 Q0,-34 10,-30" stroke="#8cc867" strokeWidth="3" fill="none" />
  </g>
);
const cottage = (x: number, y: number, roof: string, k: number) => (
  <g key={k} transform={`translate(${x},${y})`}>
    <rect x="-22" y="-20" width="44" height="30" fill="#f6ead0" {...ink} />
    <path d="M-28,-18 L0,-42 L28,-18 Z" fill={roof} {...ink} />
    <rect x="10" y="-44" width="8" height="16" fill="#b77b47" {...ink} strokeWidth="2.4" />
    <g className="kg-smoke" style={{ ['--i' as string]: k } as CSSProperties}>
      <circle cx="14" cy="-52" r="5" /><circle cx="18" cy="-62" r="6.5" /><circle cx="14" cy="-74" r="8" />
    </g>
    <rect x="-6" y="-4" width="10" height="14" fill="#8a5329" {...ink} strokeWidth="2" />
    <rect className="kg-win" x="-17" y="-12" width="8" height="8" fill="#7ab8e0" {...ink} strokeWidth="1.8" />
  </g>
);

/**
 * The painted background: sky, sun or moon, drifting clouds, hills, a castle with waving pennants, a village with
 * smoking chimneys, a winding river, the forest edge, birds, butterflies and, at night, stars, lit windows and
 * fireflies. The time of day only cross-fades sky layers and tints the landscape (the board keeps full daylight).
 * Cheap CSS/SMIL motion, paused while the tab is hidden; a gentle pointer parallax on wide screens.
 */
export function Scene({ phase }: { phase: TimeOfDay }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const vis = () => el.toggleAttribute('data-paused', document.hidden);
    document.addEventListener('visibilitychange', vis);
    let raf = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', ((e.clientX / window.innerWidth) - 0.5).toFixed(3));
        el.style.setProperty('--py', ((e.clientY / window.innerHeight) - 0.5).toFixed(3));
      });
    };
    window.addEventListener('pointermove', move);
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={root} className={`kg-scene kg-scene-${phase}`} aria-hidden data-testid="kg-scene">
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="kg-scene-svg">
        <defs>
          <linearGradient id="kg-sc-morning" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fd3f2" /><stop offset=".65" stopColor="#dff1f4" /><stop offset="1" stopColor="#fff3d6" /></linearGradient>
          <linearGradient id="kg-sc-afternoon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8ec5ea" /><stop offset=".6" stopColor="#f6e2a6" /><stop offset="1" stopColor="#ffd88a" /></linearGradient>
          <linearGradient id="kg-sc-sunset" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6b5aa8" /><stop offset=".45" stopColor="#ef8a78" /><stop offset="1" stopColor="#ffc47a" /></linearGradient>
          <linearGradient id="kg-sc-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141a42" /><stop offset=".7" stopColor="#2d3470" /><stop offset="1" stopColor="#4a4a7e" /></linearGradient>
          <linearGradient id="kg-sc-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9fd6f0" /><stop offset="1" stopColor="#5fa8d6" /></linearGradient>
          <radialGradient id="kg-sc-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff6c8" /><stop offset=".45" stopColor="#ffe17a" stopOpacity=".9" /><stop offset="1" stopColor="#ffe17a" stopOpacity="0" /></radialGradient>
        </defs>
        {(['morning', 'afternoon', 'sunset', 'night'] as const).map((p) => <rect key={p} className={`kg-sky kg-sky-${p}`} width="1600" height="900" fill={`url(#kg-sc-${p})`} />)}
        <g className="kg-stars">{Array.from({ length: 46 }, (_, i) => <circle key={i} className="kg-twinkle" cx={(i * 337) % 1600} cy={(i * 131) % 420} r={1 + (i % 3) * 0.7} fill="#fffbe0" style={{ ['--i' as string]: i % 7 } as CSSProperties} />)}</g>
        <g className="kg-sun"><circle cx="0" cy="0" r="120" fill="url(#kg-sc-sun)" /><circle cx="0" cy="0" r="44" fill="#fff0a8" {...ink} /></g>
        <g className="kg-moon"><circle cx="0" cy="0" r="38" fill="#fdf6d8" {...ink} /><circle cx="14" cy="-8" r="34" fill="#2d3470" /></g>
        <g className="kg-par-1">
          {[[120, 110, 1.6, 0], [620, 70, 1.1, 1], [1040, 150, 1.4, 2], [1380, 60, 1, 3], [300, 230, 0.9, 4]].map(([x, y, s, i]) => (
            <g key={i} transform={`translate(${x},${y}) scale(${s})`}><path className="kg-cloud" d={CLOUD} fill="#fffdf6" {...ink} strokeWidth={2.4} style={{ ['--i' as string]: i } as CSSProperties} /></g>
          ))}
        </g>
        <g className="kg-land kg-par-2">
          <path d="M0,520 Q200,420 420,470 Q640,520 860,440 Q1080,370 1300,430 Q1460,470 1600,420 V900 H0 Z" fill="#a8cf8e" {...ink} strokeWidth={2.4} />
          {/* the castle on its hill */}
          <path d="M1120,470 Q1250,300 1420,320 Q1540,340 1600,380 V560 H1100 Z" fill="#94c27a" {...ink} />
          <g transform="translate(1340,300)">
            <rect x="-70" y="-60" width="140" height="70" fill="#efe4c8" {...ink} />
            {[-70, -46, -22, 2, 26, 50].map((x) => <rect key={x} x={x} y="-72" width="14" height="14" fill="#efe4c8" {...ink} strokeWidth="2.4" />)}
            {[[-92, -110, 34, 120, '#d9546f'], [62, -96, 30, 106, '#5a8ad9'], [-14, -150, 30, 140, '#e9b63c']].map(([x, y, w, h, roof], k) => (
              <g key={k}>
                <rect x={x as number} y={y as number} width={w as number} height={h as number} fill="#f6ecd2" {...ink} />
                <path d={`M${(x as number) - 6},${y} L${(x as number) + (w as number) / 2},${(y as number) - 46} L${(x as number) + (w as number) + 6},${y} Z`} fill={roof as string} {...ink} />
                <path d={`M${(x as number) + (w as number) / 2},${(y as number) - 46} V${(y as number) - 72}`} stroke={INK} strokeWidth="2.4" />
                <path className="kg-flag" d={`M${(x as number) + (w as number) / 2},${(y as number) - 72} q12,3 22,0 q-6,6 0,10 q-10,-3 -22,0 Z`} fill={k === 1 ? '#e9b63c' : '#d9546f'} {...ink} strokeWidth="1.6" style={{ ['--i' as string]: k } as CSSProperties} />
                <rect className="kg-win" x={(x as number) + (w as number) / 2 - 5} y={(y as number) + 20} width="10" height="16" rx="5" fill="#7a6a5a" {...ink} strokeWidth="1.8" />
              </g>
            ))}
            <path d="M-16,10 V-20 Q0,-36 16,-20 V10 Z" fill="#8a5329" {...ink} />
          </g>
          {/* the river from the castle hill down to the meadow */}
          <path d="M1240,470 Q1180,520 1250,560 Q1330,610 1230,660 Q1120,710 1210,780 Q1290,840 1200,900 L1320,900 Q1400,840 1320,780 Q1240,720 1340,670 Q1440,610 1340,560 Q1270,520 1300,470 Z" fill="url(#kg-sc-river)" {...ink} strokeWidth={2.4} />
          <g className="kg-shimmer" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8">
            <path d="M1262,560 h22 M1255,668 h26 M1250,782 h24 M1262,868 h18" strokeDasharray="8 10" />
          </g>
        </g>
        <g className="kg-land kg-par-3">
          {/* the forest edge and the village on the left */}
          <path d="M0,430 Q140,380 300,420 Q440,450 520,520 Q560,600 480,700 L0,760 Z" fill="#86bb67" {...ink} />
          {[[40, 420, 1.3], [110, 400, 1.6], [190, 410, 1.2], [260, 430, 1.4], [30, 520, 1.5], [90, 560, 1.2]].map(([x, y, s], k) => tree(x, y, s, k))}
          {cottage(250, 560, '#d9546f', 0)}{cottage(350, 600, '#5a8ad9', 1)}{cottage(190, 640, '#e9b63c', 2)}{cottage(420, 680, '#c96f3a', 3)}
          <path d="M1600,600 Q1480,640 1440,720 Q1420,800 1500,900 H1600 Z" fill="#7fb35e" {...ink} />
          {[[1520, 640, 1.4], [1570, 700, 1.2], [1490, 760, 1.5]].map(([x, y, s], k) => tree(x, y, s, k + 10))}
          <path d="M0,760 Q400,700 800,760 Q1200,820 1600,760 V900 H0 Z" fill="#9fcd6c" {...ink} />
          {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={40 + i * 72} cy={820 + (i % 3) * 18} r="5" fill={['#f7a8c0', '#fff3a8', '#ffffff'][i % 3]} stroke={INK} strokeWidth="1.4" />)}
        </g>
        <rect className="kg-tint" width="1600" height="900" />
        <g className="kg-lit">
          {[[233, 548], [333, 588], [173, 628], [403, 668]].map(([x, y], k) => <rect key={k} x={x} y={y} width="8" height="8" fill="#ffd66b" />)}
          {[[1253, 210, 0], [1407, 224, 1], [1335, 170, 2]].map(([x, y, k]) => <rect key={`c${k}`} x={x} y={y} width="10" height="16" rx="5" fill="#ffd66b" />)}
        </g>
        <g className="kg-birds"><path d="M0,0 q8,-8 16,0 q8,-8 16,0 M40,18 q6,-6 12,0 q6,-6 12,0 M-30,22 q6,-6 12,0 q6,-6 12,0" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" /></g>
        <g className="kg-fireflies">{Array.from({ length: 16 }, (_, i) => <circle key={i} className="kg-firefly" cx={60 + ((i * 397) % 1480)} cy={520 + ((i * 173) % 340)} r="3.4" fill="#f6ff9a" style={{ ['--i' as string]: i } as CSSProperties} />)}</g>
      </svg>
      {[0, 1].map((k) => (
        <svg key={k} className={`kg-butterfly kg-butterfly-${k}`} viewBox="-12 -10 24 20" aria-hidden>
          <g className="kg-wings"><path d="M0,0 Q-10,-12 -11,-2 Q-10,6 0,1 Z" fill={k ? '#f7a8c0' : '#ffd34d'} stroke={INK} strokeWidth="1.2" /><path d="M0,0 Q10,-12 11,-2 Q10,6 0,1 Z" fill={k ? '#f7a8c0' : '#ffd34d'} stroke={INK} strokeWidth="1.2" /></g>
          <path d="M0,-4 V5" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ))}
      <div className="kg-grain" />
    </div>
  );
}
