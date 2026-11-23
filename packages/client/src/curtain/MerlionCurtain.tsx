import { useEffect, useState, type CSSProperties } from 'react';
import type { CurtainProps } from './EnterCurtain';
import './merlion.css';

/**
 * WIRING (integration agent), all in EnterCurtain.tsx, following the other themes:
 *   import { MerlionCurtain } from './MerlionCurtain';
 *   import { playMerlionIntro, playMerlionWaiting } from './introMerlion';
 *   CURTAINS:      merlion: MerlionCurtain        CUES: merlion: playMerlionIntro        WAITING_CUES: merlion: playMerlionWaiting
 * Contract is the same as HsrCurtain / BayCurtain: `({ opening, title }: CurtainProps)`, no own timers, never takes
 * pointer events; base styles are the settled closed state, so reduced motion (`.is-reduced *` kills animations)
 * shows the finished title card. Fonts: Josefin Sans (already bundled for the rail theme), imported in merlion.css.
 *
 * 'merlion' (Singapore) curtain: dusk turns to night over Marina Bay, seen from a fare gate.
 * Closed: the sky goes from orchid-and-gold dusk to deep indigo while the skyline's windows light up: the Esplanade's
 * durian domes, Marina Bay Sands (three towers and the SkyPark ship), the ArtScience lotus, the Flyer, the Merlion
 * spouting its arc; the Supertrees of Gardens by the Bay light up one after another; a driverless MRT glides along
 * the viaduct and stops, its doors glowing open; lasers sweep and fountain jets leap in a Spectra-style show, with
 * frangipani and orchid petals drifting down. The title rises in the sky. In front, a fare gate waits, "TAP".
 * Opening: a pass slides up to the reader and taps (beep: reader and lamp turn green, rings ripple), the flaps
 * slide open, fireworks bloom, and the camera walks through the gate and pushes into the bay; the light dissolves into
 * the real board, which comes into focus from a blurred, washed-out glow (`backdrop-filter`, as in the others).
 * Closed build ~2.8 s (HOLD_MS 3.2 s); opening beats inside OPEN_MS (5.2 s), the glow gone by ~4.7 s, focus by ~4.95 s.
 *
 * The scene is one SVG in world units (1600 x 1000, drawn well past its edges); `camera()` picks a viewBox that
 * always shows the core (x 440..1240, y 0..1000), so phones in portrait see the whole landmark row and wide screens
 * see more skyline. The gate and the title are HTML on top, sized from vh/vw (merlion.css).
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
/** deterministic pseudo-random in [0, 1), so the skyline is the same every time */
const rnd = (i: number, k = 1) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** the waterline */
const H = 560;

/** viewBox for the current window: the core always visible, the screen always filled. */
function camera(): string {
  const vw = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 860 : window.innerHeight;
  const aspect = Math.max(0.3, vw / Math.max(1, vh));
  const w = Math.max(800, 1000 * aspect);
  const h = w / aspect;
  const cy = 500 - Math.max(0, h - 1000) * 0.22;
  const cx = 800 + 35 * Math.min(1, Math.max(0, (1000 - w) / 200)); // narrow screens lean toward the landmarks
  return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
}

function splitTitle(title: string): [string, string] {
  const m = /^(Ticket to)\s+(.+)$/i.exec(title);
  return m ? [m[1], m[2]] : ['', title];
}

/* ============================== sky ============================== */

const STARS = range(110).map((i) => ({
  x: Math.round(-300 + rnd(i, 1) * 2200), y: Math.round(-700 + rnd(i, 2) * 1120), r: 0.8 + rnd(i, 3) * 1.6, d: -rnd(i, 4) * 5, t: 2 + rnd(i, 5) * 3,
}));

function Sky() {
  return (
    <g>
      <rect x={-800} y={-900} width={3200} height={H + 904} fill="url(#mc-night)" />
      {STARS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i % 7 === 0 ? '#ffd9a0' : '#fff'} className="mc-star" style={{ animationDelay: `${s.d}s`, animationDuration: `${s.t}s` }} />
      ))}
      {/* a thin crescent moon */}
      <g className="mc-moon" transform="translate(1190 262)">
        <circle r={70} fill="url(#mc-moonhalo)" />
        <path d="M-2,-26 A26,26 0 1 0 22,12 A21,21 0 1 1 -2,-26Z" fill="#fff0c8" />
      </g>
      <ellipse cx={800} cy={H} rx={1100} ry={170} fill="url(#mc-haze)" />
      {/* dusk: the sunset sky, which gives way to night */}
      <rect className="mc-dusk" x={-800} y={-900} width={3200} height={H + 904} fill="url(#mc-dusk)" />
      <ellipse className="mc-dusk" cx={720} cy={H} rx={900} ry={260} fill="url(#mc-sun)" />
    </g>
  );
}

/* ============================== the skyline ============================== */

/** the downtown towers: lit windows, red aviation lights; the core stays low so the landmarks read */
const TOWERS = (() => {
  const out: { x: number; w: number; h: number; far: boolean; crown: number; i: number }[] = [];
  let x = -420;
  for (let i = 0; x < 2100; i++) {
    const w = 26 + Math.round(rnd(i, 7) * 34);
    const core = x > 540 && x < 1080;
    const h = core ? 26 + Math.round(rnd(i, 8) * 34) : 60 + Math.round(rnd(i, 8) * 170);
    out.push({ x, w, h, far: rnd(i, 9) > 0.45, crown: Math.floor(rnd(i, 10) * 4), i });
    x += w * (0.55 + rnd(i, 11) * 0.5);
  }
  return out;
})();

function Tower({ t }: { t: (typeof TOWERS)[number] }) {
  const y = H - t.h;
  const fill = t.far ? '#1b2a5c' : '#0f1c3f';
  const win = `mc-lit mc-lit-${t.i % 3}`;
  return (
    <g>
      <rect x={t.x} y={y} width={t.w} height={t.h + 2} fill={fill} />
      {t.crown === 1 && <path d={`M${t.x} ${y} L${t.x + t.w / 2} ${y - 16} L${t.x + t.w} ${y}Z`} fill={fill} />}
      {t.crown === 2 && <rect x={t.x + t.w * 0.3} y={y - 20} width={t.w * 0.4} height={21} fill={fill} />}
      {t.crown === 3 && <rect x={t.x + t.w / 2 - 1.1} y={y - 30} width={2.2} height={31} fill={fill} />}
      <rect className={win} x={t.x + 2} y={y + 4} width={t.w - 4} height={t.h - 4} fill={t.i % 2 ? 'url(#mc-win)' : 'url(#mc-win2)'} />
      {t.h > 150 && t.crown !== 0 && <circle className="mc-blink" cx={t.x + t.w / 2} cy={y - (t.crown === 3 ? 31 : t.crown === 1 ? 17 : t.crown === 2 ? 21 : 3)} r={1.8} fill="#ff4a4a" style={{ animationDelay: `${-rnd(t.i, 3) * 2}s` }} />}
    </g>
  );
}

/** the Singapore Flyer: a slowly turning wheel on a pair of legs */
function Flyer({ x }: { x: number }) {
  const cy = H - 118, r = 92;
  return (
    <g>
      <path d={`M${x - 36} ${H} L${x - 3} ${cy + 20} L${x + 3} ${cy + 20} L${x + 36} ${H}Z`} fill="#0c1838" opacity={0.9} />
      <g className="mc-wheel">
        <circle cx={x} cy={cy} r={r} fill="none" stroke="#7aa6d4" strokeWidth={2.4} opacity={0.75} />
        <circle cx={x} cy={cy} r={r - 9} fill="none" stroke="#7aa6d4" strokeWidth={0.8} opacity={0.4} />
        {range(14).map((i) => {
          const a = (i * Math.PI * 2) / 28;
          return <line key={i} x1={x + Math.cos(a) * r} y1={cy + Math.sin(a) * r} x2={x - Math.cos(a) * r} y2={cy - Math.sin(a) * r} stroke="#7aa6d4" strokeWidth={0.7} opacity={0.38} />;
        })}
        {range(28).map((i) => {
          const a = (i * Math.PI * 2) / 28;
          return <rect key={i} x={x + Math.cos(a) * r - 3} y={cy + Math.sin(a) * r - 3} width={6} height={6} rx={2} fill="#ffe3a8" opacity={0.9} />;
        })}
      </g>
      <circle cx={x} cy={cy} r={4} fill="#9cc2e8" />
    </g>
  );
}

/** the Esplanade: two spiky "durian" domes with a golden lattice */
function Esplanade() {
  const lattice = (id: string, x: number, w: number, h: number) => (
    <g>
      <clipPath id={id}><path d={`M${x} ${H} L${x} ${H - h * 0.55} Q${x + w * 0.04} ${H - h} ${x + w / 2} ${H - h} Q${x + w * 0.96} ${H - h} ${x + w} ${H - h * 0.55} L${x + w} ${H}Z`} /></clipPath>
      <path d={`M${x} ${H} L${x} ${H - h * 0.55} Q${x + w * 0.04} ${H - h} ${x + w / 2} ${H - h} Q${x + w * 0.96} ${H - h} ${x + w} ${H - h * 0.55} L${x + w} ${H}Z`} fill="url(#mc-dome)" />
      <g clipPath={`url(#${id})`}>
        <rect className="mc-lit mc-lit-1" x={x} y={H - h} width={w} height={h} fill="url(#mc-lattice)" />
        <ellipse className="mc-lit mc-lit-0" cx={x + w / 2} cy={H} rx={w * 0.5} ry={h * 0.55} fill="url(#mc-domeglow)" />
      </g>
      {/* the spikes */}
      {range(Math.round(w / 9)).map((i) => {
        const px = x + 4 + (i * (w - 8)) / Math.round(w / 9 - 1);
        const t = (px - x) / w;
        const py = H - h + (h * 0.55) * Math.pow(Math.abs(t - 0.5) * 2, 3.2) * 0.95 + 1;
        return <path key={i} d={`M${px - 2} ${py + 2} L${px} ${py - 7} L${px + 2} ${py + 2}Z`} fill="#16335a" />;
      })}
    </g>
  );
  return (
    <g>
      {lattice('mc-cl-a', 580, 100, 70)}
      {lattice('mc-cl-b', 686, 68, 52)}
      <rect x={574} y={H - 6} width={188} height={8} fill="#0a1630" />
    </g>
  );
}

/** Marina Bay Sands: three leaning towers under the SkyPark ship */
function Mbs() {
  const towers: [number, number, number, number, number][] = [
    // baseL, baseR, topL, topR, topY
    [768, 812, 788, 820, 330],
    [826, 870, 833, 863, 316],
    [884, 928, 876, 908, 330],
  ];
  return (
    <g>
      {towers.map(([bl, br, tl, tr, ty], i) => (
        <g key={i}>
          <polygon points={`${bl},${H + 2} ${br},${H + 2} ${tr},${ty} ${tl},${ty}`} fill="url(#mc-mbs)" />
          <polygon className={`mc-lit mc-lit-${i}`} points={`${bl + 3},${H} ${br - 3},${H} ${tr - 2},${ty + 6} ${tl + 2},${ty + 6}`} fill="url(#mc-mbswin)" />
          <polygon points={`${tr - 3},${ty} ${tr},${ty} ${br},${H} ${br - 6},${H}`} fill="#ffcf8a" opacity={0.12} />
        </g>
      ))}
      {/* the SkyPark: a ship laid across the tops, its bow reaching out over the north end */}
      <path d="M758 300 L952 300 Q974 300 986 296 Q996 296 984 306 L930 328 L778 328 Q760 326 758 312Z" fill="#101f45" />
      <path d="M760 300 L986 296" stroke="#ffe0a0" strokeWidth={1.4} opacity={0.8} />
      <rect className="mc-skypool" x={786} y={303} width={158} height={2.6} rx={1.3} fill="#7fe8ff" />
      {range(9).map((i) => <circle key={i} cx={792 + i * 20} cy={298} r={3} fill="#1d6a5a" />)}
      {range(7).map((i) => <rect key={i} className="mc-lit mc-lit-2" x={768 + i * 24} y={310} width={9} height={3.4} rx={1.2} fill="#ffd98a" />)}
    </g>
  );
}

/** the ArtScience Museum: a lotus of ten long fingers */
function Lotus() {
  const cx = 986, by = H;
  const petal = (ang: number, len: number, wid: number) => {
    const a = (ang * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const nx = -dy, ny = dx;
    const tx = cx + dx * len, ty = by + dy * len;
    const mx = cx + dx * len * 0.55 + nx * wid * 0.4, my = by + dy * len * 0.55 + ny * wid * 0.4;
    const m2x = cx + dx * len * 0.55 - nx * wid * 0.4, m2y = by + dy * len * 0.55 - ny * wid * 0.4;
    return `M${cx + nx * wid} ${by + ny * wid} Q${mx + nx * wid * 0.7} ${my + ny * wid * 0.7} ${tx} ${ty} Q${m2x - nx * wid * 0.7} ${m2y - ny * wid * 0.7} ${cx - nx * wid} ${by - ny * wid}Z`;
  };
  const angles = [-72, -54, -36, -18, 0, 18, 36, 54, 72];
  return (
    <g>
      {angles.map((a, i) => <path key={i} d={petal(a, 84 - Math.abs(a) * 0.35, 9)} fill={i % 2 ? '#10224a' : '#142a55'} stroke="#ff9ad0" strokeOpacity={0.5} strokeWidth={0.9} />)}
      <path d={`M${cx - 52} ${H} Q${cx - 40} ${H - 26} ${cx} ${H - 28} Q${cx + 40} ${H - 26} ${cx + 52} ${H}Z`} fill="#0c1a3c" />
      <path className="mc-lit mc-lit-1" d={`M${cx - 50} ${H} Q${cx - 38} ${H - 24} ${cx} ${H - 26} Q${cx + 38} ${H - 24} ${cx + 50} ${H}Z`} fill="url(#mc-win2)" />
      <ellipse className="mc-lit mc-lit-0" cx={cx} cy={by - 20} rx={46} ry={34} fill="url(#mc-lotusglow)" />
    </g>
  );
}

/* ============================== the Supertrees ============================== */

const TREES = [
  { x: 1022, h: 150, w: 26, c: '#35e0d2' },
  { x: 1068, h: 296, w: 40, c: '#ff4fa3' },
  { x: 1118, h: 214, w: 34, c: '#a46bff' },
  { x: 1162, h: 268, w: 42, c: '#ffc14a' },
  { x: 1212, h: 190, w: 32, c: '#4fd0ff' },
  { x: 1258, h: 244, w: 38, c: '#ff7a5c' },
  { x: 1300, h: 170, w: 28, c: '#c35bff' },
];

function Supertree({ t, i }: { t: (typeof TREES)[number]; i: number }) {
  const base = H + 40, top = base - t.h, x = t.x, w = t.w;
  const cy = top + t.h * 0.2;
  const trunk = `M${x - 7} ${base} Q${x - 3} ${base - t.h * 0.5} ${x - 2.6} ${cy} L${x + 2.6} ${cy} Q${x + 3} ${base - t.h * 0.5} ${x + 7} ${base}Z`;
  const cone = `M${x - 3} ${cy + 2} C${x - w * 0.3} ${cy - 4} ${x - w * 0.85} ${top + 14} ${x - w} ${top} L${x + w} ${top} C${x + w * 0.85} ${top + 14} ${x + w * 0.3} ${cy - 4} ${x + 3} ${cy + 2}Z`;
  const dots = range(13).map((k) => {
    const a = (k / 12) * Math.PI;
    return { px: x - Math.cos(a) * w, py: top + Math.sin(a) * w * 0.2 };
  });
  const style = { '--d': `${1.1 + i * 0.26}s`, '--c': t.c } as CSSProperties;
  return (
    <g style={style}>
      <path d={trunk} fill="#0a1531" />
      <path d={cone} fill="#101c40" />
      <ellipse cx={x} cy={top} rx={w} ry={w * 0.2} fill="#16244f" />
      {/* lit: glow, canopy colour, rim lights and the lights up the trunk */}
      <g className="mc-tree-on">
        <radialGradient id={`mc-tg-${i}`}><stop offset="0" stopColor={t.c} stopOpacity=".55" /><stop offset=".5" stopColor={t.c} stopOpacity=".16" /><stop offset="1" stopColor={t.c} stopOpacity="0" /></radialGradient>
        <circle cx={x} cy={top + 10} r={w * 2.6} fill={`url(#mc-tg-${i})`} />
        <path d={cone} fill={t.c} opacity={0.55} />
        <ellipse cx={x} cy={top} rx={w} ry={w * 0.2} fill={t.c} opacity={0.85} />
        {[-0.62, -0.3, 0, 0.3, 0.62].map((f) => <line key={f} x1={x + f * w} y1={top} x2={x + f * 4} y2={cy} stroke="#fff" strokeOpacity={0.45} strokeWidth={0.8} />)}
        {dots.map((d, k) => <circle key={k} cx={d.px} cy={d.py + w * 0.2} r={1.9} fill="#fff" className="mc-sparkle" style={{ animationDelay: `${-(k * 0.23 + i * 0.4)}s` }} />)}
        {range(Math.floor(t.h / 22)).map((k) => <circle key={k} cx={x + (k % 2 ? 2 : -2) * (1 - k / 14)} cy={cy + 12 + k * 20} r={1.5} fill={t.c} opacity={0.9} />)}
        <path d={trunk} fill={t.c} opacity={0.18} />
      </g>
    </g>
  );
}

function Supertrees() {
  const a = TREES[1], b = TREES[3];
  const wy = H + 40 - a.h * 0.56;
  return (
    <g>
      {TREES.map((t, i) => <Supertree key={i} t={t} i={i} />)}
      {/* the skyway slung between two trees */}
      <path d={`M${a.x + 2} ${wy} Q${(a.x + b.x) / 2} ${wy + 5} ${b.x - 2} ${wy - 12}`} stroke="#0a1531" strokeWidth={4} fill="none" />
      <path className="mc-tree-on" style={{ '--d': '2.2s' } as CSSProperties} d={`M${a.x + 2} ${wy - 2} Q${(a.x + b.x) / 2} ${wy + 3} ${b.x - 2} ${wy - 14}`} stroke="#ffe3a8" strokeWidth={1.2} strokeDasharray="1.6 3.2" fill="none" />
    </g>
  );
}

/* ============================== the Merlion ============================== */

function Merlion() {
  // local coords: 0..150 wide, 0..230 tall (feet at y 230), the head faces right
  return (
    <g transform="translate(452 408) scale(1.02)">
      {/* spotlight cone behind it */}
      <ellipse cx={74} cy={150} rx={70} ry={118} fill="url(#mc-mlglow)" />
      {/* plinth and the waves around it */}
      <path d="M6 232 Q40 222 74 232 T146 232 L150 244 L2 244Z" fill="#cfe4ea" opacity={0.85} />
      <rect x={12} y={216} width={110} height={16} rx={4} fill="#d6dcd8" />
      <rect x={12} y={216} width={110} height={4} rx={2} fill="#fff" opacity={0.7} />
      {/* the fish body, curling up into the lion's neck, scales etched on */}
      <path d="M26 218 C10 188 20 158 52 150 C76 144 86 116 80 92 L112 92 C118 124 110 150 96 168 C84 184 92 204 102 218Z" fill="url(#mc-stone)" />
      {range(30).map((i) => {
        const col = i % 5, row = Math.floor(i / 5);
        const sx = 38 + col * 11 + (row % 2 ? 5 : 0) + row * 1.5, sy = 154 + row * 11;
        return <path key={i} d={`M${sx} ${sy} q5.5 7 11 0`} fill="none" stroke="#6f8aa0" strokeOpacity={0.5} strokeWidth={1} />;
      })}
      {/* the tail: a flick that curls up behind */}
      <path d="M30 214 C2 214 -8 186 4 166 C0 190 14 200 36 198Z" fill="url(#mc-stone)" />
      <path d="M4 166 C-6 154 0 140 12 140 C6 148 10 156 18 160Z" fill="url(#mc-stone)" />
      {/* the head: mane, face, open mouth */}
      <g>
        {range(16).map((i) => {
          const a = (i / 16) * Math.PI * 2;
          return <ellipse key={i} cx={74 + Math.cos(a) * 36} cy={58 + Math.sin(a) * 36} rx={11} ry={8} transform={`rotate(${(a * 180) / Math.PI} ${74 + Math.cos(a) * 36} ${58 + Math.sin(a) * 36})`} fill="#e7ece9" stroke="#8fa3b2" strokeOpacity={0.55} strokeWidth={0.8} />;
        })}
        <circle cx={74} cy={58} r={34} fill="url(#mc-stone)" />
        <circle cx={74} cy={62} r={25} fill="#f4f6f3" />
        <ellipse cx={64} cy={52} rx={4.2} ry={4.8} fill="#2b3b52" />
        <ellipse cx={86} cy={52} rx={4.2} ry={4.8} fill="#2b3b52" />
        <path d="M58 44 Q64 40 70 45 M80 45 Q86 40 92 44" fill="none" stroke="#7d8d9c" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M68 62 Q74 58 80 62 Q77 68 74 68 Q71 68 68 62Z" fill="#9aa8b4" />
        <path d="M61 72 Q74 90 87 72 Q74 78 61 72Z" fill="#37465c" />
        <path d="M66 74 Q74 86 82 74" fill="#e8647f" opacity={0.8} />
        <circle cx={46} cy={36} r={8} fill="#e7ece9" stroke="#8fa3b2" strokeOpacity={0.55} strokeWidth={0.8} />
        <circle cx={102} cy={36} r={8} fill="#e7ece9" stroke="#8fa3b2" strokeOpacity={0.55} strokeWidth={0.8} />
      </g>
      {/* water from its mouth */}
      <path className="mc-spout-glow" d="M82 80 Q150 30 244 174" fill="none" stroke="#bfe9ff" strokeWidth={9} strokeLinecap="round" opacity={0.2} />
      <path className="mc-spout" d="M82 80 Q150 30 244 174" fill="none" stroke="#f2fbff" strokeWidth={3.2} strokeLinecap="round" strokeDasharray="7 7" />
      <ellipse className="mc-ripple" cx={244} cy={178} rx={22} ry={4.5} fill="none" stroke="#dff4ff" strokeWidth={1.2} />
      <ellipse className="mc-ripple mc-ripple-2" cx={244} cy={178} rx={22} ry={4.5} fill="none" stroke="#dff4ff" strokeWidth={1.2} />
    </g>
  );
}

/** a small flag on the promenade: red over white, crescent and five stars */
function Flag() {
  return (
    <g transform="translate(626 462)">
      <rect x={-1} y={0} width={2} height={170} fill="#aab6c8" />
      <circle cy={-1} r={2.6} fill="#ffd98a" />
      <g className="mc-flagwave">
        <rect x={1} y={2} width={46} height={15} fill="#e22b3a" />
        <rect x={1} y={17} width={46} height={15} fill="#f7f7f7" />
        <path d="M13 9.5 a5 5 0 1 0 3.2 5.6 a4 4 0 1 1 -3.2 -5.6Z" fill="#fff" />
        {range(5).map((i) => <circle key={i} cx={22 + Math.cos(((i * 72 - 90) * Math.PI) / 180) * 5.6} cy={9.5 + Math.sin(((i * 72 - 90) * Math.PI) / 180) * 5.6} r={0.9} fill="#fff" />)}
      </g>
    </g>
  );
}

/* ============================== the Spectra show: lasers and fountain jets ============================== */

const BEAMS = [
  { x: 808, y: 296, a: -34, b: 6, c: 'url(#mc-b-mag)', d: 0, t: 3.4 },
  { x: 846, y: 282, a: -10, b: 28, c: 'url(#mc-b-teal)', d: 0.15, t: 4.1 },
  { x: 894, y: 296, a: -22, b: 34, c: 'url(#mc-b-gold)', d: 0.3, t: 3.7 },
  { x: 958, y: 296, a: 4, b: 40, c: 'url(#mc-b-mag)', d: 0.45, t: 4.6 },
  { x: 986, y: H - 70, a: -30, b: 20, c: 'url(#mc-b-teal)', d: 0.6, t: 3.9 },
  { x: 776, y: 300, a: -46, b: -12, c: 'url(#mc-b-gold)', d: 0.75, t: 4.3 },
];

function Beams() {
  return (
    <g style={{ mixBlendMode: 'screen' }}>
      {BEAMS.map((b, i) => (
        <g key={i} className="mc-beam" style={{ '--a': `${b.a}deg`, '--b': `${b.b}deg`, '--t': `${b.t}s`, '--d': `${1.5 + b.d}s` } as CSSProperties}>
          <g className="mc-beam-in">
            <polygon points={`${b.x},${b.y} ${b.x - 4},${b.y - 1100} ${b.x + 4},${b.y - 1100}`} fill={b.c} />
            <circle cx={b.x} cy={b.y} r={4} fill="#fff" opacity={0.9} />
          </g>
        </g>
      ))}
    </g>
  );
}

const JETS = range(15).map((i) => {
  const x = 700 + i * 20;
  const h = 40 + Math.round(Math.sin(i * 0.55) * 26) + 34;
  const dir = (i - 7) * 7;
  return { x, h, dir, d: -rnd(i, 21) * 1.4 };
});

function Jets() {
  return (
    <g>
      {JETS.map((j, i) => {
        const y0 = H + 96;
        const d = `M${j.x} ${y0} Q${j.x + j.dir * 0.5} ${y0 - j.h * 2.1} ${j.x + j.dir} ${y0 - 6}`;
        return (
          <g key={i} className="mc-jet" style={{ animationDelay: `${1.6 + i * 0.05}s` }}>
            <path d={d} fill="none" stroke="#ffd1ec" strokeWidth={5} strokeLinecap="round" opacity={0.16} />
            <path className="mc-jetflow" d={d} fill="none" stroke={i % 3 === 0 ? '#ffe6a8' : '#f4fbff'} strokeWidth={1.8} strokeLinecap="round" strokeDasharray="5 6" style={{ animationDelay: `${j.d}s` }} />
          </g>
        );
      })}
    </g>
  );
}

/* ============================== water, viaduct, the MRT ============================== */

const GLINTS = range(46).map((i) => ({ x: Math.round(-200 + rnd(i, 31) * 2100), y: H + 14 + Math.round(Math.pow(rnd(i, 32), 1.4) * 380), w: 14 + Math.round(rnd(i, 33) * 56), c: rnd(i, 34), d: -rnd(i, 35) * 6 }));

function Water() {
  return (
    <g>
      <rect x={-800} y={H} width={3200} height={900} fill="url(#mc-water)" />
      {/* the skyline's reflection, fading with depth */}
      <g opacity={0.3} transform={`translate(0 ${2 * H}) scale(1 -1)`}><use href="#mc-skyline" /></g>
      <rect x={-800} y={H} width={3200} height={300} fill="url(#mc-waterfade)" />
      {GLINTS.map((g, i) => (
        <rect key={i} className="mc-glint" x={g.x} y={g.y} width={g.w} height={1.6} rx={0.8} fill={g.c < 0.4 ? '#ff8fd0' : g.c < 0.7 ? '#ffd98a' : '#8fe4ff'} opacity={0.5} style={{ animationDelay: `${g.d}s` }} />
      ))}
    </g>
  );
}

const DECK = 744;

function Viaduct() {
  return (
    <g>
      {/* the piers go down into the bay */}
      {[-400, 80, 560, 1040, 1520, 2000].map((x) => (
        <g key={x}>
          <path d={`M${x - 44} ${DECK + 18} L${x + 44} ${DECK + 18} L${x + 12} ${DECK + 52} L${x + 12} ${DECK + 300} L${x - 12} ${DECK + 300} L${x - 12} ${DECK + 52}Z`} fill="#0b1630" />
          <path d={`M${x - 12} ${DECK + 56} L${x - 12} ${DECK + 300}`} stroke="#ff9ad0" strokeOpacity={0.25} strokeWidth={1.4} />
        </g>
      ))}
      <rect x={-800} y={DECK} width={3200} height={18} fill="#1a2750" />
      <rect x={-800} y={DECK} width={3200} height={3} fill="#cfe0ff" opacity={0.35} />
      <rect x={-800} y={DECK + 15} width={3200} height={3} fill="#050a1c" />
      <line x1={-800} y1={DECK + 8} x2={2400} y2={DECK + 8} stroke="#ffd98a" strokeOpacity={0.5} strokeWidth={1.4} strokeDasharray="2 12" />
    </g>
  );
}

const CAR_W = 232, GAP = 10, CAR_H = 76;
function Train() {
  const y = DECK - CAR_H;
  const x0 = 488;
  return (
    <g className="mc-train">
      {/* its glow on the deck and the water below */}
      <ellipse cx={x0 + (CAR_W * 3 + GAP * 2) / 2} cy={DECK + 30} rx={(CAR_W * 3 + GAP * 2) / 2 + 40} ry={46} fill="url(#mc-traindown)" />
      {range(3).map((c) => {
        const cx = x0 + c * (CAR_W + GAP);
        const front = c === 2;
        const body = front
          ? `M${cx} ${y + 10} Q${cx} ${y} ${cx + 10} ${y} L${cx + CAR_W - 52} ${y} Q${cx + CAR_W - 8} ${y + 4} ${cx + CAR_W} ${y + 36} L${cx + CAR_W} ${y + CAR_H} L${cx} ${y + CAR_H}Z`
          : `M${cx} ${y + 10} Q${cx} ${y} ${cx + 10} ${y} L${cx + CAR_W - 10} ${y} Q${cx + CAR_W} ${y} ${cx + CAR_W} ${y + 10} L${cx + CAR_W} ${y + CAR_H} L${cx} ${y + CAR_H}Z`;
        const winEnd = front ? cx + CAR_W - 62 : cx + CAR_W - 10;
        return (
          <g key={c}>
            <path d={body} fill="url(#mc-car)" />
            {/* windows, in bays between the doors */}
            <rect x={cx + 8} y={y + 12} width={winEnd - cx - 8} height={30} rx={4} fill="#101b3d" />
            {range(5).map((k) => {
              const bx = cx + 12 + k * ((winEnd - cx - 16) / 5);
              return <rect key={k} className="mc-lit mc-lit-1" x={bx} y={y + 14} width={(winEnd - cx - 16) / 5 - 5} height={26} rx={3} fill="#ffe7b0" opacity={0.92} />;
            })}
            {/* doors, which slide open once the train has stopped */}
            {[0.2, 0.62].map((f, k) => {
              const dx = cx + (winEnd - cx) * f;
              return (
                <g key={k}>
                  <rect x={dx - 1} y={y + 8} width={26} height={CAR_H - 8} fill="#0d1733" opacity={0.55} />
                  <rect className="mc-door" x={dx + 2} y={y + 11} width={20} height={CAR_H - 13} rx={2} fill="url(#mc-doorglow)" />
                </g>
              );
            })}
            <rect x={cx} y={y + 50} width={CAR_W} height={7} fill="#e02a6a" />
            <rect x={cx} y={y + 57} width={CAR_W} height={2.4} fill="#25d2c0" />
            <rect x={cx} y={y + 63} width={CAR_W} height={13} fill="#1b2543" />
            {front && (
              <g>
                <path d={`M${cx + CAR_W - 60} ${y + 8} L${cx + CAR_W - 52} ${y + 6} Q${cx + CAR_W - 14} ${y + 10} ${cx + CAR_W - 6} ${y + 38} L${cx + CAR_W - 60} ${y + 38}Z`} fill="#0a1636" />
                <path d={`M${cx + CAR_W - 56} ${y + 12} L${cx + CAR_W - 24} ${y + 14} Q${cx + CAR_W - 12} ${y + 20} ${cx + CAR_W - 10} ${y + 34} L${cx + CAR_W - 56} ${y + 34}Z`} fill="#3ab8d6" opacity={0.4} />
                <circle cx={cx + CAR_W - 5} cy={y + 46} r={3.2} fill="#fffbe0" />
                <ellipse cx={cx + CAR_W + 22} cy={y + 46} rx={34} ry={7} fill="url(#mc-headlamp)" opacity={0.7} />
              </g>
            )}
          </g>
        );
      })}
      {/* the walk-through gangways between the cars */}
      {[0, 1].map((c) => <rect key={c} x={x0 + CAR_W * (c + 1) + GAP * c - 1} y={y + 6} width={GAP + 2} height={CAR_H - 8} fill="#0a1228" />)}
    </g>
  );
}

/* ============================== the sky show ============================== */

const BURSTS = [
  { x: 700, y: 110, c: '#ffd98a', d: 0.9 },
  { x: 960, y: 30, c: '#ff7ac0', d: 1.1 },
  { x: 560, y: 0, c: '#7fe8ff', d: 1.35 },
  { x: 1100, y: 120, c: '#ff5a5a', d: 1.55 },
  { x: 820, y: 150, c: '#fff1c8', d: 1.8 },
];

function Fireworks() {
  return (
    <g>
      {BURSTS.map((b, i) => (
        <g key={i} className="mc-burst" style={{ '--bd': `${b.d}s` } as CSSProperties}>
          {range(18).map((k) => {
            const a = (k / 18) * Math.PI * 2;
            return <circle key={k} cx={b.x + Math.cos(a) * 84} cy={b.y + Math.sin(a) * 84} r={3} fill={b.c} />;
          })}
          {range(18).map((k) => {
            const a = ((k + 0.5) / 18) * Math.PI * 2;
            return <circle key={k} cx={b.x + Math.cos(a) * 50} cy={b.y + Math.sin(a) * 50} r={2.3} fill="#fff" opacity={0.8} />;
          })}
          <circle cx={b.x} cy={b.y} r={5} fill="#fff" />
        </g>
      ))}
    </g>
  );
}

/* ============================== the scene ============================== */

function Defs() {
  return (
    <defs>
      <linearGradient id="mc-night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#060822" />
        <stop offset=".45" stopColor="#0f1448" />
        <stop offset=".8" stopColor="#2b1c68" />
        <stop offset="1" stopColor="#7a2c86" />
      </linearGradient>
      <linearGradient id="mc-dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d1b66" />
        <stop offset=".5" stopColor="#7b3a9a" />
        <stop offset=".8" stopColor="#e5557f" />
        <stop offset="1" stopColor="#ffb25e" />
      </linearGradient>
      <radialGradient id="mc-sun"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".95" /><stop offset=".4" stopColor="#ff9a6a" stopOpacity=".5" /><stop offset="1" stopColor="#ff6aa0" stopOpacity="0" /></radialGradient>
      <radialGradient id="mc-haze"><stop offset="0" stopColor="#ff8fc8" stopOpacity=".5" /><stop offset=".6" stopColor="#b84fc0" stopOpacity=".18" /><stop offset="1" stopColor="#b84fc0" stopOpacity="0" /></radialGradient>
      <radialGradient id="mc-moonhalo"><stop offset="0" stopColor="#fff0c8" stopOpacity=".5" /><stop offset="1" stopColor="#fff0c8" stopOpacity="0" /></radialGradient>
      <linearGradient id="mc-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a2a78" />
        <stop offset=".12" stopColor="#14275c" />
        <stop offset=".5" stopColor="#0a1a40" />
        <stop offset="1" stopColor="#050c24" />
      </linearGradient>
      <linearGradient id="mc-waterfade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a1a40" stopOpacity="0" /><stop offset="1" stopColor="#050c24" stopOpacity=".95" /></linearGradient>
      <pattern id="mc-win" width="7" height="9" patternUnits="userSpaceOnUse"><rect x="1.6" y="2.4" width="2.6" height="3.4" fill="#ffd98a" /></pattern>
      <pattern id="mc-win2" width="9" height="7" patternUnits="userSpaceOnUse"><rect x="2" y="1.6" width="3.4" height="2.6" fill="#ffe9b8" /></pattern>
      <pattern id="mc-mbswin" width="4.5" height="10" patternUnits="userSpaceOnUse"><rect x="0.6" y="1.5" width="3.3" height="3.6" fill="#ffd490" opacity=".85" /></pattern>
      <pattern id="mc-lattice" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H8M0 0V8" stroke="#ffd36a" strokeWidth=".9" opacity=".85" /></pattern>
      <linearGradient id="mc-mbs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#10204a" /><stop offset=".7" stopColor="#16295c" /><stop offset="1" stopColor="#223470" /></linearGradient>
      <linearGradient id="mc-dome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d3a6c" /><stop offset="1" stopColor="#0d1c40" /></linearGradient>
      <radialGradient id="mc-domeglow"><stop offset="0" stopColor="#ffd070" stopOpacity=".6" /><stop offset="1" stopColor="#ffd070" stopOpacity="0" /></radialGradient>
      <radialGradient id="mc-lotusglow"><stop offset="0" stopColor="#ff7ac0" stopOpacity=".5" /><stop offset="1" stopColor="#ff7ac0" stopOpacity="0" /></radialGradient>
      <radialGradient id="mc-mlglow"><stop offset="0" stopColor="#ffd9a8" stopOpacity=".38" /><stop offset="1" stopColor="#ffd9a8" stopOpacity="0" /></radialGradient>
      <linearGradient id="mc-stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#9fb4c8" /><stop offset=".45" stopColor="#f2f5f2" /><stop offset="1" stopColor="#ffe6bd" /></linearGradient>
      <linearGradient id="mc-car" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbfcff" /><stop offset=".6" stopColor="#d9e0f0" /><stop offset="1" stopColor="#aeb9d4" /></linearGradient>
      <linearGradient id="mc-doorglow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff3c8" /><stop offset="1" stopColor="#ffc86a" /></linearGradient>
      <radialGradient id="mc-traindown"><stop offset="0" stopColor="#ffd98a" stopOpacity=".34" /><stop offset="1" stopColor="#ffd98a" stopOpacity="0" /></radialGradient>
      <radialGradient id="mc-headlamp"><stop offset="0" stopColor="#fffbe0" stopOpacity=".9" /><stop offset="1" stopColor="#fffbe0" stopOpacity="0" /></radialGradient>
      <linearGradient id="mc-b-mag" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff4fb0" stopOpacity=".95" /><stop offset=".25" stopColor="#ff4fb0" stopOpacity=".4" /><stop offset="1" stopColor="#ff4fb0" stopOpacity="0" /></linearGradient>
      <linearGradient id="mc-b-teal" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#2ff0e0" stopOpacity=".95" /><stop offset=".25" stopColor="#2ff0e0" stopOpacity=".4" /><stop offset="1" stopColor="#2ff0e0" stopOpacity="0" /></linearGradient>
      <linearGradient id="mc-b-gold" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ffd15a" stopOpacity=".95" /><stop offset=".25" stopColor="#ffd15a" stopOpacity=".4" /><stop offset="1" stopColor="#ffd15a" stopOpacity="0" /></linearGradient>
      {/* a frangipani and an orchid petal, for the drifting petals */}
      <symbol id="mc-frangi" viewBox="-12 -12 24 24">
        {range(5).map((i) => <ellipse key={i} cx={0} cy={-6} rx={4.4} ry={6.6} transform={`rotate(${i * 72})`} fill="#fffaf0" stroke="#f3c9d4" strokeWidth={0.5} />)}
        <circle r={2.6} fill="#ffc94a" />
      </symbol>
      <symbol id="mc-orchid" viewBox="-12 -12 24 24">
        <path d="M0 -10 C9 -8 10 4 0 10 C-10 4 -9 -8 0 -10Z" fill="#e0489c" />
        <path d="M0 -10 C4 -4 4 4 0 10" fill="none" stroke="#ffd0ee" strokeWidth={0.9} opacity={0.8} />
      </symbol>
    </defs>
  );
}

function Scene({ viewBox }: { viewBox: string }) {
  return (
    <svg className="mc-scene" viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <Defs />
      <Sky />
      <g id="mc-skyline">
        <g className="mc-flyer"><Flyer x={286} /></g>
        {TOWERS.map((t) => <Tower key={t.i} t={t} />)}
        <Esplanade />
        <Mbs />
        <Lotus />
      </g>
      {/* the bay */}
      <Water />
      {/* gardens by the bay */}
      <path d={`M960 ${H + 2} Q1100 ${H + 10} 1500 ${H + 4} L1900 ${H + 4} L1900 ${H + 60} L960 ${H + 60}Z`} fill="#0a1630" />
      <Supertrees />
      <Jets />
      <Beams />
      {/* the Merlion's promenade */}
      <path d={`M-800 ${H + 66} L560 ${H + 66} Q640 ${H + 66} 664 ${H + 82} L664 ${H + 100} L-800 ${H + 100}Z`} fill="#0d1a38" />
      <rect x={-800} y={H + 64} width={1464} height={3} fill="#ffd98a" opacity={0.4} />
      <Merlion />
      <Flag />
      <Viaduct />
      <Train />
      <Fireworks />
    </svg>
  );
}

/* ============================== the gate ============================== */

function Pillar({ side }: { side: 'l' | 'r' }) {
  return (
    <div className={`mc-pillar mc-pillar-${side}`}>
      <svg viewBox="0 0 100 190" aria-hidden>
        <defs>
          <linearGradient id={`mc-pb-${side}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0c1a30" /><stop offset=".5" stopColor="#1a3a5c" /><stop offset="1" stopColor="#0c1a30" /></linearGradient>
          <linearGradient id={`mc-pt-${side}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#274e78" /><stop offset="1" stopColor="#15304f" /></linearGradient>
        </defs>
        <rect x="14" y="30" width="72" height="156" rx="6" fill={`url(#mc-pb-${side})`} />
        <rect x="14" y="30" width="72" height="2.4" fill="#7fe8ff" opacity=".6" />
        <rect x={side === 'l' ? 83 : 14} y="34" width="3" height="144" fill="#35e0d2" opacity=".5" />
        {/* the reader's face, seen from above */}
        <path d="M8 36 L92 36 L84 8 L16 8Z" fill={`url(#mc-pt-${side})`} stroke="#8fd8ff" strokeOpacity=".5" strokeWidth="1" />
        <g className="mc-ring-icon" fill="none" strokeLinecap="round" strokeWidth="2.6" transform="translate(50 22) rotate(90)">
          <path d="M-2 -6 A8 8 0 0 1 -2 6" /><path d="M2 -10 A13 13 0 0 1 2 10" /><path d="M6 -14 A18 18 0 0 1 6 14" />
        </g>
        {/* its display and lamp */}
        <rect x="26" y="52" width="48" height="30" rx="3" fill="#03101c" stroke="#35597f" strokeWidth="1" />
        <text className="mc-msg mc-tap" x="50" y="72" textAnchor="middle">TAP</text>
        <text className="mc-msg mc-ok" x="50" y="72" textAnchor="middle">OK</text>
        <rect x="38" y="96" width="24" height="7" rx="3.5" className="mc-lamp-r" />
        <rect x="38" y="96" width="24" height="7" rx="3.5" className="mc-lamp-g" />
        <rect x="8" y="176" width="84" height="14" rx="3" fill="#07111f" />
      </svg>
      {side === 'r' && (
        <>
          <i className="mc-ring mc-ring-0" /><i className="mc-ring mc-ring-1" /><i className="mc-ring mc-ring-2" />
        </>
      )}
    </div>
  );
}

function PassCard({ title }: { title: string }) {
  return (
    <div className="mc-card">
      <div className="mc-card-face">
        <span className="mc-card-flag" />
        <span className="mc-card-chip" />
        <svg className="mc-card-wave" viewBox="0 0 100 30" aria-hidden><path d="M0 22 Q12 6 25 18 T50 14 T75 20 T100 8" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2.2" /><path d="M0 28 Q14 14 28 24 T56 20 T84 26 T100 16" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" /></svg>
        <span className="mc-card-name">{title}</span>
        <span className="mc-card-sub">TRAVEL PASS</span>
      </div>
    </div>
  );
}

function Gate({ title }: { title: string }) {
  return (
    <div className="mc-gate">
      <div className="mc-floor" />
      <div className="mc-gate-row">
        <Pillar side="l" />
        <div className="mc-gap">
          <div className="mc-flap mc-flap-l" />
          <div className="mc-flap mc-flap-r" />
        </div>
        <div className="mc-right">
          <Pillar side="r" />
          <PassCard title={title} />
        </div>
      </div>
    </div>
  );
}

/* ============================== curtain ============================== */

/** the title in the sky */
function Title({ title }: { title: string }) {
  const [small, big] = splitTitle(title);
  return (
    <div className="mc-title">
      {small && <div className="mc-title-small"><i />{small}<i /></div>}
      <div className="mc-title-big" style={{ '--n': big.length } as CSSProperties}>{big}</div>
      <div className="mc-title-sub" lang="und">Singapore · 新加坡 · சிங்கப்பூர் · Singapura</div>
    </div>
  );
}

const PETALS = range(15).map((i) => ({
  x: Math.round(rnd(i, 41) * 100), s: 2.4 + rnd(i, 42) * 2.6, d: -rnd(i, 43) * 14, t: 11 + rnd(i, 44) * 9, dx: Math.round((rnd(i, 45) - 0.4) * 24), kind: i % 3 === 0 ? 'mc-orchid' : 'mc-frangi', r: Math.round(rnd(i, 46) * 360),
}));

export function MerlionCurtain({ opening, title }: CurtainProps) {
  const [vb, setVb] = useState(camera);
  useEffect(() => {
    const on = () => setVb(camera());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return (
    <div className={`mc-root${opening ? ' mc-opening' : ''}`}>
      {/* beyond the gate: warm light, which dissolves into the real board underneath */}
      <div className="mc-focus" />
      <div className="mc-glow" />
      <div className="mc-stage"><Scene viewBox={vb} /></div>
      <div className="mc-petals" aria-hidden>
        {PETALS.map((p, i) => (
          <i key={i} style={{ left: `${p.x}%`, '--s': `${p.s}vmin`, '--dx': `${p.dx}vw`, '--r': `${p.r}deg`, animationDelay: `${p.d}s`, animationDuration: `${p.t}s` } as CSSProperties}>
            <svg viewBox="-12 -12 24 24"><use href={`#${p.kind}`} /></svg>
          </i>
        ))}
      </div>
      <Title title={title} />
      <Gate title={title} />
      <div className="mc-flash" />
      <div className="mc-vignette" />
      <div className="mc-fadein" />
    </div>
  );
}
