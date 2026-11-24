/**
 * Menu art: the operations chart behind the menu (a nautical chart with depth contours, soundings, a graticule,
 * your task force, enemy contacts and one slow radar sweep), the tactical symbols, and the small diagrams on the
 * menu's choice plates. All original, all decorative (aria-hidden).
 */
import type { ReactNode } from 'react';
import { SIDE, SIDE_W, SideJet, DREADNOUGHT_JETS } from './cine/sideArt';

const FR = '#5fd4ff', HO = '#ff4655', UN = '#ffd23f';

/* ---------- tactical symbols (friendly circle, hostile diamond, unknown quatrefoil) ---------- */

export const SymFriend = ({ x = 0, y = 0, r = 9, fill = 'none' }: { x?: number; y?: number; r?: number; fill?: string }) => (
  <g transform={`translate(${x} ${y})`}><circle r={r} fill={fill} stroke={FR} strokeWidth="2" /><path d={`M${-r * 0.45} 0 H${r * 0.45}`} stroke={FR} strokeWidth="2" /></g>
);
export const SymHostile = ({ x = 0, y = 0, r = 10 }: { x?: number; y?: number; r?: number }) => (
  <g transform={`translate(${x} ${y})`}><path d={`M0 ${-r} L${r} 0 L0 ${r} L${-r} 0 Z`} fill="rgba(255,70,85,.12)" stroke={HO} strokeWidth="2" /></g>
);
export const SymUnknown = ({ x = 0, y = 0, r = 9 }: { x?: number; y?: number; r?: number }) => {
  const k = r * 0.55;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M${-k} ${-k} A${k} ${k} 0 0 1 ${k} ${-k} A${k} ${k} 0 0 1 ${k} ${k} A${k} ${k} 0 0 1 ${-k} ${k} A${k} ${k} 0 0 1 ${-k} ${-k} Z`} fill="rgba(255,210,63,.1)" stroke={UN} strokeWidth="2" />
    </g>
  );
};

export function Legend() {
  return (
    <ul className="fleet-legend" aria-label="Map key">
      <li><svg viewBox="-12 -12 24 24" aria-hidden><SymFriend /></svg>Your fleet</li>
      <li><svg viewBox="-12 -12 24 24" aria-hidden><SymHostile /></svg>Enemy</li>
      <li><svg viewBox="-12 -12 24 24" aria-hidden><SymUnknown /></svg>Your aim</li>
    </ul>
  );
}

/* ---------- the chart ---------- */

const ISLANDS = [
  { d: 'M176 132 C204 98 246 112 268 92 C296 70 344 96 352 128 C360 156 398 170 384 204 C372 232 334 226 316 252 C296 280 248 270 226 248 C206 228 166 238 154 206 C142 176 160 152 176 132 Z', c: [268, 180] },
  { d: 'M1062 292 C1094 270 1136 282 1142 316 C1148 350 1104 368 1076 356 C1046 344 1038 310 1062 292 Z', c: [1092, 322] },
  { d: 'M1600 600 C1516 614 1462 668 1436 732 C1408 800 1356 836 1296 866 C1246 892 1222 948 1232 1000 L1600 1000 Z', c: [1460, 860] },
  { d: 'M672 46 C690 22 724 30 742 14 C766 -4 812 20 808 50 C804 74 828 92 806 108 C784 124 760 104 736 116 C708 128 668 106 664 82 C660 64 662 58 672 46 Z', c: [740, 66] },
];
/** chart soundings (depth in fathoms), scattered by hand */
const SOUNDINGS: [number, number, number][] = [
  [90, 380, 42], [140, 470, 57], [420, 330, 61], [560, 210, 38], [620, 420, 74], [880, 140, 66], [960, 220, 81], [1200, 180, 93],
  [1310, 300, 104], [1420, 420, 88], [1260, 520, 71], [1100, 640, 59], [980, 760, 47], [820, 920, 33], [640, 960, 29], [240, 920, 36],
  [80, 640, 48], [1520, 140, 112], [1380, 80, 118], [460, 860, 41], [720, 610, 69], [1180, 900, 27],
];
/** the flagship: everything on the chart is plotted from here */
const FLAG: [number, number] = [330, 740];
const ESCORTS: [number, number][] = [[268, 700], [394, 706], [300, 812], [372, 800]];
const HOSTILES: [number, number][] = [[660, 250], [760, 150], [580, 110], [1480, 520]];
const UNKNOWN: [number, number] = [780, 860];
const SWEEP_S = 12;

/** Where the sweep (clockwise from east, once per SWEEP_S) passes a point: its flare delay. */
const phase = ([x, y]: [number, number]) => ((((Math.atan2(y - FLAG[1], x - FLAG[0]) * 180) / Math.PI) + 360) % 360) / 360;

export function ChartBackdrop() {
  const [fx, fy] = FLAG;
  const lat = ['36°40′N', '36°30′N', '36°20′N', '36°10′N', '36°00′N', '35°50′N'];
  const lon = ['124°00′W', '123°50′W', '123°40′W', '123°30′W', '123°20′W', '123°10′W', '123°00′W', '122°50′W', '122°40′W', '122°30′W'];
  return (
    <svg className="fleet-chart-bg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="fleet-chart-fade" cx="50%" cy="45%" r="75%">
          <stop offset="0" stopColor="#071119" stopOpacity="0" />
          <stop offset="1" stopColor="#03080d" stopOpacity=".85" />
        </radialGradient>
        <linearGradient id="fleet-chart-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={FR} stopOpacity="0" />
          <stop offset="1" stopColor={FR} stopOpacity=".13" />
        </linearGradient>
        <pattern id="fleet-chart-land" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#0c1820" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#1d3344" strokeWidth="2" />
        </pattern>
      </defs>

      {/* graticule with chart labels */}
      <g stroke="#5fd4ff" strokeOpacity=".07" strokeWidth="1">
        {Array.from({ length: 10 }, (_, i) => <line key={`v${i}`} x1={i * 170 + 20} y1="0" x2={i * 170 + 20} y2="1000" />)}
        {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 180 + 40} x2="1600" y2={i * 180 + 40} />)}
      </g>
      <g fill="#5fd4ff" fillOpacity=".28" fontFamily="ui-monospace, Menlo, monospace" fontSize="11">
        {lon.map((t, i) => <text key={t} x={i * 170 + 24} y="992">{t}</text>)}
        {lat.map((t, i) => <text key={t} x="6" y={i * 180 + 36}>{t}</text>)}
      </g>

      {/* depth contours around the land, then the land */}
      {ISLANDS.map(({ d, c }, i) => (
        <g key={i}>
          {[1.9, 1.55, 1.25].map((k) => (
            <path key={k} d={d} fill="none" stroke="#5fd4ff" strokeOpacity={0.05 + (2 - k) * 0.08} strokeDasharray={k > 1.6 ? '2 6' : k > 1.3 ? '6 5' : undefined}
              vectorEffect="non-scaling-stroke" transform={`translate(${c[0]} ${c[1]}) scale(${k}) translate(${-c[0]} ${-c[1]})`} />
          ))}
          <path d={d} fill="url(#fleet-chart-land)" stroke="#3b5a72" strokeWidth="1.5" />
        </g>
      ))}
      <g fill="#8fa4b6" fillOpacity=".3" fontFamily="ui-monospace, Menlo, monospace" fontSize="12">
        {SOUNDINGS.map(([x, y, n]) => <text key={`${x},${y}`} x={x} y={y}>{n}</text>)}
      </g>

      {/* compass rose */}
      <g transform="translate(1460 140)" stroke="#5fd4ff" strokeOpacity=".22" fill="none">
        <circle r="70" /><circle r="58" strokeDasharray="1 4" />
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10 * Math.PI) / 180, r1 = i % 9 === 0 ? 48 : 64;
          return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1} x2={Math.cos(a) * 70} y2={Math.sin(a) * 70} />;
        })}
        <path d="M0 -62 L8 0 L0 62 L-8 0 Z M-62 0 L0 -8 L62 0 L0 8 Z" fill="#5fd4ff" fillOpacity=".1" />
        <text x="0" y="-78" textAnchor="middle" fill="#5fd4ff" fillOpacity=".5" stroke="none" fontFamily="Barlow Condensed, sans-serif" fontWeight="700" fontSize="16">N</text>
      </g>

      {/* the task force: range rings, wake tracks, escorts, flagship */}
      <g stroke={FR} fill="none">
        {[130, 260, 390, 520].map((r, i) => <circle key={r} cx={fx} cy={fy} r={r} strokeOpacity={0.16 - i * 0.025} strokeDasharray="3 7" />)}
      </g>
      <g fill={FR} fillOpacity=".45" fontFamily="ui-monospace, Menlo, monospace" fontSize="11">
        {[130, 260, 390, 520].map((r, i) => <text key={r} x={fx + r * 0.7 + 4} y={fy - r * 0.7 - 4}>{(i + 1) * 10} NM</text>)}
      </g>
      <path d={`M${fx - 260} ${fy + 190} C${fx - 180} ${fy + 120} ${fx - 90} ${fy + 60} ${fx} ${fy}`} stroke={FR} strokeOpacity=".35" strokeDasharray="2 6" fill="none" />
      <line x1={fx} y1={fy} x2={HOSTILES[0][0]} y2={HOSTILES[0][1]} stroke={UN} strokeOpacity=".45" strokeDasharray="10 6" />
      <text x={fx + (HOSTILES[0][0] - fx) * 0.82 + 12} y={fy + (HOSTILES[0][1] - fy) * 0.82} fill={UN} fillOpacity=".7" fontFamily="ui-monospace, Menlo, monospace" fontSize="12">BRG 041  RNG 31.6</text>

      {/* the sweep, turning around the flagship */}
      <g className="fleet-chart-sweep" style={{ transformOrigin: `${fx}px ${fy}px` }}>
        <path d={`M${fx} ${fy} L${fx + 560} ${fy} A560 560 0 0 0 ${fx + 560 * Math.cos(-0.42)} ${fy + 560 * Math.sin(-0.42)} Z`} fill="url(#fleet-chart-sweep)" />
        <line x1={fx} y1={fy} x2={fx + 560} y2={fy} stroke={FR} strokeOpacity=".45" strokeWidth="1.5" />
      </g>

      {ESCORTS.map(([x, y]) => <SymFriend key={`${x}`} x={x} y={y} r={8} />)}
      <SymFriend x={fx} y={fy} r={12} fill="rgba(95,212,255,.18)" />
      <line x1={fx} y1={fy} x2={fx + 40} y2={fy - 30} stroke={FR} strokeWidth="2" />

      {/* enemy contacts with their heading vectors; each flares as the sweep crosses it */}
      {HOSTILES.map((h, i) => (
        <g key={i}>
          <line x1={h[0]} y1={h[1]} x2={h[0] - 46} y2={h[1] + 22} stroke={HO} strokeOpacity=".6" strokeWidth="1.5" />
          <g opacity=".75"><SymHostile x={h[0]} y={h[1]} /></g>
          <circle className="fleet-chart-blip" cx={h[0]} cy={h[1]} r="16" fill="none" stroke={HO} strokeWidth="2" style={{ animationDelay: `${(phase(h) - 1) * SWEEP_S}s` }} />
          <text x={h[0] + 16} y={h[1] - 12} fill={HO} fillOpacity=".55" fontFamily="ui-monospace, Menlo, monospace" fontSize="11">{`H${String(i + 1).padStart(2, '0')}`}</text>
        </g>
      ))}
      <g opacity=".8"><SymUnknown x={UNKNOWN[0]} y={UNKNOWN[1]} /></g>
      <circle className="fleet-chart-blip" cx={UNKNOWN[0]} cy={UNKNOWN[1]} r="15" fill="none" stroke={UN} strokeWidth="2" style={{ animationDelay: `${(phase(UNKNOWN) - 1) * SWEEP_S}s` }} />
      <text x={UNKNOWN[0] + 16} y={UNKNOWN[1] - 10} fill={UN} fillOpacity=".6" fontFamily="ui-monospace, Menlo, monospace" fontSize="11">U01</text>

      <rect width="1600" height="1000" fill="url(#fleet-chart-fade)" />
    </svg>
  );
}

/* ---------- choice plate diagrams (stroke = currentColor, so the chosen plate lights up) ---------- */

const Mini = ({ cols = 6, rows = 3, marks }: { cols?: number; rows?: number; marks: ReactNode }) => (
  <svg viewBox={`0 0 ${cols * 12 + 2} ${rows * 12 + 2}`} aria-hidden>
    {Array.from({ length: cols * rows }, (_, i) => (
      <rect key={i} x={1 + (i % cols) * 12} y={1 + Math.floor(i / cols) * 12} width="12" height="12" fill="none" stroke="currentColor" strokeOpacity=".35" />
    ))}
    {marks}
  </svg>
);
const X = ({ c, r }: { c: number; r: number }) => <path d={`M${c * 12 + 4} ${r * 12 + 4} l6 6 m0 -6 l-6 6`} stroke={HO} strokeWidth="2" strokeLinecap="round" />;
const O = ({ c, r }: { c: number; r: number }) => <circle cx={c * 12 + 7} cy={r * 12 + 7} r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />;
const Fill = ({ c, r }: { c: number; r: number }) => <rect x={c * 12 + 2.5} y={r * 12 + 2.5} width="9" height="9" fill="currentColor" opacity=".75" />;

export const PLATE_ART: Record<string, ReactNode> = {
  local: (
    <svg viewBox="0 0 96 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="32" y="8" width="32" height="34" />
      <path d="M36 14 H60 M36 20 H52" strokeOpacity=".5" />
      <circle cx="14" cy="18" r="6" /><path d="M4 42 C4 32 24 32 24 42" />
      <circle cx="82" cy="18" r="6" /><path d="M72 42 C72 32 92 32 92 42" />
      <path d="M40 34 h16 m-4 -4 l4 4 l-4 4" strokeWidth="1.6" />
    </svg>
  ),
  bot: (
    <svg viewBox="0 0 96 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="10" y="12" width="26" height="26" />
      <rect x="17" y="19" width="12" height="12" fill="currentColor" fillOpacity=".3" />
      {[16, 23, 30].map((v) => <path key={v} d={`M${v} 6 V12 M${v} 38 V44 M4 ${v} H10 M36 ${v} H42`} strokeWidth="1.5" />)}
      <path d="M52 40 A28 28 0 0 1 80 12" strokeOpacity=".4" /><path d="M58 40 A22 22 0 0 1 80 18" strokeOpacity=".6" /><path d="M64 40 A16 16 0 0 1 80 24" />
      <circle cx="80" cy="40" r="3" fill="currentColor" />
    </svg>
  ),
  online: (
    <svg viewBox="0 0 96 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 44 L20 14 L28 44 M15 32 H25" /><circle cx="20" cy="12" r="3" fill="currentColor" />
      <path d="M68 44 L76 14 L84 44 M71 32 H81" /><circle cx="76" cy="12" r="3" fill="currentColor" />
      <path d="M32 12 Q48 2 64 12" strokeDasharray="3 4" /><path d="M34 20 Q48 12 62 20" strokeDasharray="3 4" strokeOpacity=".6" />
    </svg>
  ),
  classic: <Mini marks={<><O c={1} r={0} /><O c={4} r={2} /><X c={3} r={1} /></>} />,
  salvo: <Mini marks={<><X c={0} r={0} /><O c={2} r={0} /><X c={4} r={1} /><O c={1} r={2} /><X c={5} r={2} /></>} />,
  super: <Mini marks={<>{[[2, 0], [3, 0], [4, 0], [2, 1], [3, 1], [4, 1], [2, 2], [3, 2], [4, 2]].map(([c, r]) => <Fill key={`${c}${r}`} c={c} r={r} />)}<X c={3} r={1} /><O c={0} r={1} /></>} />,
};

/** The task force on the horizon, side-on: escorts ahead of the flagship, lit by the display glow. */
export function TaskForce() {
  const ships = [
    { cls: 'corvette', x: 0, s: 0.62 }, { cls: 'frigate', x: 140, s: 0.74 }, { cls: 'dreadnought', x: 360, s: 1 }, { cls: 'cruiser', x: 820, s: 0.82 },
  ] as const;
  return (
    <svg className="fleet-taskforce" viewBox="-20 -112 1140 150" aria-hidden>
      <defs>
        <linearGradient id="fleet-tf-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5fd4ff" stopOpacity=".22" />
          <stop offset="1" stopColor="#5fd4ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="-20" y="0" width="1140" height="38" fill="url(#fleet-tf-sea)" />
      {ships.map(({ cls, x, s }) => (
        <g key={cls} transform={`translate(${x} 0) scale(${s})`}>
          {SIDE[cls]}
          {cls === 'dreadnought' && DREADNOUGHT_JETS.map((j) => <SideJet key={j} x={j} />)}
          <path d={`M${SIDE_W[cls] - 6} 2 q 30 6 60 2`} stroke="#bfefff" strokeOpacity=".5" strokeWidth="2" fill="none" />
          <path d={`M0 4 h${-90 * s}`} stroke="#bfefff" strokeOpacity=".25" strokeWidth="3" strokeDasharray="10 8" />
        </g>
      ))}
      <line x1="-20" y1="0.5" x2="1120" y2="0.5" stroke="#5fd4ff" strokeOpacity=".6" />
    </svg>
  );
}
