import { memo, type ReactNode } from 'react';
import type { Guild } from '@boboland/shared/src/blocky';
import { hash } from './shape';
import { INK } from './palette';

/**
 * The floating plateau, drawn in a 20-unit design space and scaled to the board (cells), so Duo and Classic share
 * one look. Board cells occupy [0, size]; the rim, the slab's south face and the underside sit around and below.
 * Static: rendered once per board size. Animated parts (falls, mist, lantern glow) are CSS classes.
 */
/** The board SVG's viewBox margin around the cells, in 20-unit design units (the underside tip and roots overflow below). */
export const PLATEAU_PAD = { top: 2.7, side: 2, bottom: 11.2 };

const STONE = ['#efe6d3', '#e7dcc5', '#f4ecdc'];
const r2 = (x: number) => +x.toFixed(2);

/** Rim stones along one side, seeded: square, long and chipped variants. */
function rimStones(side: 0 | 1 | 2 | 3): ReactNode[] {
  const out: ReactNode[] = [];
  let t = 0.2;
  let i = 0;
  while (t < 19.8) {
    const h = hash(side, i, 3);
    const variant = h < 0.4 ? 0 : h < 0.75 ? 1 : 2;
    const len = Math.min(19.9 - t, variant === 1 ? 2.1 + hash(side, i, 5) * 0.6 : 1.1 + hash(side, i, 6) * 0.4);
    if (len < 0.5) break;
    // along-side position t..t+len, across the rim band -1.15..-0.15 (rotated per side)
    const fill = STONE[Math.floor(hash(side, i, 9) * 3)];
    const chip = variant === 2 ? `l${r2(-0.25)},${0.22}` : '';
    const d = `M${r2(t + 0.06)},-1.12 h${r2(len - 0.12)} ${chip ? `v.2 l-.3,.12` : ''} v${chip ? '.68' : '1'} h${r2(-(len - 0.12))}Z`;
    const crack = hash(side, i, 13) < 0.3 ? <path d={`M${r2(t + len * 0.3)},-1.05 l.22,.3 l-.1,.25`} stroke={INK} strokeOpacity=".22" strokeWidth=".05" fill="none" strokeLinecap="round" /> : null;
    const lichen = hash(side, i, 17) < 0.35 ? <circle cx={r2(t + len * 0.7)} cy="-.45" r=".12" fill="#c4c98a" opacity=".55" /> : null;
    out.push(
      <g key={`${side}-${i}`} data-rim-stone={variant}>
        <path d={d} fill={fill} stroke="#a8987a" strokeWidth=".06" strokeLinejoin="round" />
        <path d={`M${r2(t + 0.14)},-1.02 h${r2(len - 0.3)}`} stroke="#fff" strokeOpacity=".75" strokeWidth=".09" strokeLinecap="round" />
        <path d={`M${r2(t + 0.14)},-.24 h${r2(len - 0.28)}`} stroke="#9c8a6c" strokeOpacity=".5" strokeWidth=".08" strokeLinecap="round" />
        {crack}{lichen}
      </g>,
    );
    t += len;
    i++;
  }
  const rot = ['', 'rotate(90 10 10)', 'rotate(180 10 10)', 'rotate(270 10 10)'][side];
  return [<g key={side} transform={rot}>{out}</g>];
}

const MOSS: [number, number, number][] = [[-0.9, 3.2, 1], [-0.7, 11.5, 0.8], [-0.85, 17.4, 1.1], [4.6, -0.85, 0.9], [12.8, -0.8, 1.2], [20.75, 6.1, 1], [20.8, 14.2, 0.85], [7.3, 20.85, 1.1], [14.9, 20.8, 0.9], [-0.6, 20.4, 0.7], [20.4, -0.5, 0.7]];
function Moss({ x, y, s }: { x: number; y: number; s: number }) {
  const blobs = [[0, 0, 0.42], [0.4, -0.12, 0.32], [-0.38, 0.08, 0.3], [0.12, 0.3, 0.28], [-0.1, -0.3, 0.24]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} data-moss>
      {blobs.map(([dx, dy, r], i) => <circle key={`s${i}`} cx={dx + 0.05} cy={dy + 0.1} r={r} fill="#557f3c" />)}
      {blobs.map(([dx, dy, r], i) => <circle key={i} cx={dx} cy={dy} r={r} fill={i % 2 ? '#7fa858' : '#94bf68'} />)}
      {blobs.slice(0, 3).map(([dx, dy, r], i) => <circle key={`h${i}`} cx={dx - r * 0.3} cy={dy - r * 0.35} r={r * 0.35} fill="#c4e39a" opacity=".8" />)}
    </g>
  );
}

const ROOTS: [number, number, number, number][] = [[0.6, 23.4, -0.4, 2.4], [2.4, 24.6, 0.5, 3], [5.2, 26.1, 0.6, 2.4], [7, 26.9, -0.5, 3.4], [9.2, 28.2, -0.4, 2.6], [11.2, 28.6, 0.5, 3.6], [12.9, 27.9, -0.3, 2.2], [14.6, 27.2, -0.6, 2.8], [17.6, 25.3, 0.4, 2.8], [19.9, 23.9, -0.3, 2.2]];
function Root({ x, y, bend, len, k }: { x: number; y: number; bend: number; len: number; k: number }) {
  const d = `M${x},${y} c${bend},${len * 0.35} ${-bend},${len * 0.6} ${bend * 0.6},${len}`;
  return (
    <g data-root>
      <path d={d} stroke="#5e3b1f" strokeWidth=".26" fill="none" strokeLinecap="round" />
      <path d={d} stroke="#9a6a3e" strokeWidth=".1" fill="none" strokeLinecap="round" transform="translate(-.05 0)" />
      {[0.35, 0.62, 0.86].map((t, i) => (
        <path key={i} d="M0,0 q.3,-.28 .62,0 q-.3,.26 -.62,0z" fill={i % 2 ? '#7fa858' : '#94bf68'} stroke="#3b6a2a" strokeWidth=".04"
          transform={`translate(${x + bend * (i % 2 ? 0.4 : -0.1)} ${y + len * t}) rotate(${(k + i) % 2 ? 30 : 150})`} />
      ))}
    </g>
  );
}

const CRYSTALS: [number, number, number, string][] = [[2.4, 23.9, -16, '#9ee7d0'], [4.6, 24.9, -12, '#b9a6f2'], [7.4, 25.6, 4, '#8fe0e6'], [10.4, 27.4, 10, '#8fe0e6'], [13.3, 26.4, -6, '#b9a6f2'], [15.4, 25.4, 8, '#f2b7d0'], [17.4, 24.6, 14, '#9ee7d0'], [19.2, 23.6, -8, '#b9a6f2']];
function Crystal({ x, y, rot, c }: { x: number; y: number; rot: number; c: string }) {
  const prism = (dx: number, h: number, w: number) => (
    <g transform={`translate(${dx} 0)`}>
      <path d={`M0,0 l${-w / 2},${-h * 0.2} l0,${-h * 0.65} l${w / 2},${-h * 0.25} l${w / 2},${h * 0.25} l0,${h * 0.65}Z`} fill={c} stroke={INK} strokeOpacity=".5" strokeWidth=".05" strokeLinejoin="round" />
      <path d={`M0,0 l0,${-h} l${w / 2},${h * 0.25} l0,${h * 0.65}Z`} fill={INK} opacity=".16" />
      <path d={`M${-w * 0.3},${-h * 0.3} l0,${-h * 0.45}`} stroke="#fff" strokeOpacity=".8" strokeWidth=".07" strokeLinecap="round" />
    </g>
  );
  return (
    <g data-crystal>
      <ellipse cx={x} cy={y + 0.05} rx=".75" ry=".22" fill="#4f4638" opacity=".45" />
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(1 -1)`}>{prism(0, 1.2, 0.5)}{prism(0.42, 0.8, 0.36)}{prism(-0.36, 0.7, 0.32)}</g>
    </g>
  );
}

function Nest() {
  return (
    <g transform="translate(14.6 26.6) scale(1.25)" data-nest>
      <path d="M-1.5,-.6 q1.5,.3 3,0" stroke="#5e3b1f" strokeWidth=".22" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="-.85" rx=".28" ry=".36" fill="#cfe8f2" stroke={INK} strokeOpacity=".4" strokeWidth=".04" />
      <ellipse cx=".38" cy="-.8" rx=".25" ry=".32" fill="#e7f3f7" stroke={INK} strokeOpacity=".4" strokeWidth=".04" />
      <circle cx="-.06" cy="-.95" r=".05" fill="#8aa5b8" />
      <path d="M-.95,-.7 q.95,.75 1.9,0 l-.1,.22 q-.85,.6 -1.7,0z" fill="#7a4e26" stroke="#4a2e14" strokeWidth=".07" />
      {[-0.8, -0.4, 0, 0.4, 0.75].map((x, i) => <path key={i} d={`M${x},${-0.62 + Math.abs(x) * 0.1} l${0.35},${0.12}`} stroke="#d9a46a" strokeWidth=".05" strokeLinecap="round" />)}
    </g>
  );
}

/** A waterfall spilling from a spout in the south rim: a foam lip, a tapering stream with falling foam bands, a mist plume. */
function Fall({ x, len }: { x: number; len: number }) {
  const y0 = 21.05, y1 = y0 + len;
  const body = `M${x - 0.5},${y0} C${x - 0.55},${y0 + 1} ${x - 0.75},${y1 - 2} ${x - 0.95},${y1} H${x + 0.95} C${x + 0.75},${y1 - 2} ${x + 0.55},${y0 + 1} ${x + 0.5},${y0}Z`;
  return (
    <g data-fall>
      <clipPath id={`bly-fall-${x}`}><path d={body} /></clipPath>
      <path d={`M${x - 0.75},20.7 h1.5 l-.12,.95 h-1.26z`} fill="#8c7e66" stroke="#6f6453" strokeWidth=".06" />
      <path d={body} fill="url(#bly-fall-g)" />
      <g clipPath={`url(#bly-fall-${x})`}>
        <g className="bly-foam">{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${x - 1.2},${y0 + i * (len / 6)} q.4,.3 .8,0 t.8,0 t.8,0`} stroke="#fff" strokeOpacity=".8" strokeWidth=".14" fill="none" strokeLinecap="round" />)}</g>
        <path d={`M${x - 0.15},${y0} V${y1}`} stroke="#fff" strokeOpacity=".55" strokeWidth=".12" />
      </g>
      <g fill="#fff">{[[-0.45, 0, 0.3], [0, -0.08, 0.36], [0.45, 0, 0.3], [-0.2, 0.18, 0.22], [0.25, 0.2, 0.22]].map(([dx, dy, r], i) => <circle key={i} cx={x + dx} cy={y0 + dy} r={r} />)}</g>
      <g className="bly-mist">{[[-1.6, 0.2, 1.7], [1.5, 0.3, 1.6], [0, 0.9, 2.3], [-0.4, -0.5, 1.2], [0.6, -0.9, 0.9], [0, 2, 2.9], [-2.4, 1.4, 1.6], [2.4, 1.5, 1.6]].map(([dx, dy, r], i) => <circle key={i} cx={x + dx} cy={y1 + dy} r={r} fill="url(#bly-mist-g)" />)}</g>
    </g>
  );
}

function Lantern({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} data-lantern>
      <circle className="bly-lantern-glow" r="1.6" fill="url(#bly-g-glow)" />
      <ellipse cx=".08" cy=".42" rx=".5" ry=".16" fill={INK} opacity=".25" />
      <rect x="-.09" y="-.6" width=".18" height="1" rx=".06" fill="#4a4f5c" />
      <path d="M-.32,-1.32 h.64 l-.06,.66 h-.52z" className="bly-lantern-pane" fill="#ffe7a6" stroke="#4a4f5c" strokeWidth=".09" strokeLinejoin="round" />
      <path d="M-.4,-1.32 l.4,-.34 l.4,.34z" fill="#4a4f5c" />
      <circle cy="-1.72" r=".08" fill="#dcb459" />
    </g>
  );
}

/** The compass rose engraved faintly at the centre (dark line plus a light offset line = carved). */
function Compass() {
  const star = 'M10,7.2 L10.5,9.5 L12.8,10 L10.5,10.5 L10,12.8 L9.5,10.5 L7.2,10 L9.5,9.5Z';
  const small = 'M10,8.4 L10.35,9.65 L11.6,10 L10.35,10.35 L10,11.6 L9.65,10.35 L8.4,10 L9.65,9.65Z';
  return (
    <g fill="none" strokeLinejoin="round" data-compass>
      <g stroke="#fff" strokeOpacity=".5" strokeWidth=".07" transform="translate(.05 .05)"><circle cx="10" cy="10" r="2.3" /><circle cx="10" cy="10" r="2.05" /><path d={star} /><path d={small} transform="rotate(45 10 10)" /></g>
      <g stroke={INK} strokeOpacity=".16" strokeWidth=".08"><circle cx="10" cy="10" r="2.3" /><circle cx="10" cy="10" r="2.05" /><path d={star} /><path d={small} transform="rotate(45 10 10)" /></g>
      <path d="M9.85,7.05 L10,6.6 L10.15,7.05" stroke={INK} strokeOpacity=".12" strokeWidth=".07" />
    </g>
  );
}

/** The plateau around and under a board of `size` cells. */
export const Plateau = memo(function Plateau({ size }: { size: number }) {
  const k = size / 20;
  return (
    <g className="bly-plateau" transform={`scale(${k})`}>
      <defs>
        <linearGradient id="bly-rock-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b5a68b" /><stop offset=".45" stopColor="#8f8270" /><stop offset="1" stopColor="#7d86a0" stopOpacity=".55" /></linearGradient>
        <linearGradient id="bly-slab-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6efe0" /><stop offset="1" stopColor="#ddd0b5" /></linearGradient>
        <linearGradient id="bly-face-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9b997" /><stop offset="1" stopColor="#9d8d70" /></linearGradient>
        <linearGradient id="bly-fall-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfeaf2" /><stop offset=".7" stopColor="#8fd3e4" stopOpacity=".8" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <radialGradient id="bly-mist-g"><stop offset="0" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <linearGradient id="bly-well-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={INK} stopOpacity=".16" /><stop offset="1" stopColor={INK} stopOpacity="0" /></linearGradient>
        <linearGradient id="bly-well-l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={INK} stopOpacity=".12" /><stop offset="1" stopColor={INK} stopOpacity="0" /></linearGradient>
        <clipPath id="bly-under-clip"><path d={UNDER} /></clipPath>
        <linearGradient id="bly-under-ao" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3a3226" stopOpacity=".55" /><stop offset="1" stopColor="#3a3226" stopOpacity="0" /></linearGradient>
      </defs>
      {/* underside: rock, strata, crystals, roots, nest */}
      <path d={UNDER} fill="url(#bly-rock-g)" stroke="#6f6453" strokeWidth=".08" />
      <g clipPath="url(#bly-under-clip)">
        <path d="M-2,22 H23 V23.9 q-6,.5 -12.6,-.3 t-10.4,.3z" fill="#c6b797" />
        <path d="M-2,25.3 q5,.9 9,-.2 t10,.7 t6,-.4 V31 H-2z" fill="#7f7a80" opacity=".45" />
        <path d="M-2,26.8 q6,.7 9,0 t9,.3 t7,-.2 V31 H-2z" fill="#6c7896" opacity=".5" />
        <g fill="none" stroke="#5e5446" strokeOpacity=".45" strokeWidth=".08">
          <path d="M-1,23.9 q5,1 10,.2 t12.6,.5" /><path d="M1,25.4 q5,.9 9,-.2 t10,.7" /><path d="M4,27 q4,.7 7,0 t5,.3" />
          {[[1.8, 23], [6, 23.4], [9.5, 25.8], [12.4, 24.2], [16.2, 23.6], [18.8, 24.6], [4.6, 25.6], [14.8, 26.4]].map(([x, y], i) => <path key={i} d={`M${x},${y} l.35,.5 l-.15,.45 l.3,.4`} strokeWidth=".06" />)}
        </g>
        <path d="M-1,23.2 q6,.8 11,0 t12,.4" stroke="#fff" strokeOpacity=".35" strokeWidth=".09" fill="none" />
        <rect x="-2" y="22" width="25" height="1.1" fill="url(#bly-under-ao)" />
        {[[1.2, 23.4], [3.6, 24.6], [8, 25.2], [11.6, 26.4], [14.8, 24.2], [18.6, 23.4], [6.2, 27], [12.4, 27.6]].map(([x, y], i) => <path key={`c${i}`} d={`M${x},${y} l.3,-.18 l.32,.1 l.06,.3 l-.34,.16z`} fill={i % 2 ? '#d8cbab' : '#8f8270'} stroke="#5e5446" strokeOpacity=".5" strokeWidth=".04" />)}
        {[[2.6, 23.6], [5.6, 24.3], [8.8, 24], [11.8, 25.2], [15, 24.9], [18, 23.9], [6.8, 26.4], [10, 27.4], [13.4, 26.8]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx=".5" ry=".22" fill="#fff" opacity=".18" />)}
      </g>
      {CRYSTALS.map(([x, y, r, c], i) => <Crystal key={i} x={x} y={y} rot={r} c={c} />)}
      {ROOTS.map(([x, y, b, l], i) => <Root key={i} x={x} y={y} bend={b} len={l} k={i} />)}
      <Nest />
      {/* slab: south face, then the carved top with its rim */}
      <rect x="-1.5" y="-1.2" width="23.2" height="23.7" rx="1.1" fill="url(#bly-face-g)" stroke="#7d6f58" strokeWidth=".08" />
      {[2.2, 5.6, 9.4, 13, 16.4, 19.6].map((x) => <path key={x} d={`M${x},21.5 v.95`} stroke="#7d6f58" strokeOpacity=".5" strokeWidth=".07" />)}
      <path d="M-1.4,21.95 h22.9" stroke="#7d6f58" strokeOpacity=".35" strokeWidth=".06" />
      <rect x="-1.5" y="-1.5" width="23" height="23" rx="1.1" fill="url(#bly-slab-g)" stroke="#8c7e66" strokeWidth=".08" />
      {[0, 1, 2, 3].map((s) => rimStones(s as 0 | 1 | 2 | 3))}
      {/* the sunken building ground */}
      <rect x="-.1" y="-.1" width="20.2" height="20.2" rx=".25" fill="#ebe2cf" />
      <rect x="-.1" y="-.1" width="20.2" height=".7" fill="url(#bly-well-t)" />
      <rect x="-.1" y="-.1" width=".7" height="20.2" fill="url(#bly-well-l)" />
      <Compass />
      <g transform="translate(10 20.62)" data-compass-medallion>
        <circle r=".92" fill="#e9dfc9" stroke="#a8987a" strokeWidth=".06" /><circle r=".72" fill="none" stroke={INK} strokeOpacity=".16" strokeWidth=".05" />
        <path d="M0,-.66 L.16,-.16 L.66,0 L.16,.16 L0,.66 L-.16,.16 L-.66,0 L-.16,-.16Z" fill="#e1d5bb" stroke={INK} strokeOpacity=".28" strokeWidth=".045" />
        <path d="M0,-.66 L.16,-.16 L0,0Z M.66,0 L.16,.16 L0,0Z M0,.66 L-.16,.16 L0,0Z M-.66,0 L-.16,-.16 L0,0Z" fill="#cbbd9e" />
        <path d="M-.62,-.5 a.8,.8 0 0,1 1.2,-.1" stroke="#fff" strokeOpacity=".6" strokeWidth=".05" fill="none" />
      </g>
      {MOSS.map(([x, y, s], i) => <Moss key={i} x={x} y={y} s={s} />)}
      <Fall x={3.6} len={6.6} />
      <Fall x={16.8} len={6} />
      {[[-0.7, -0.6], [20.7, -0.6], [-0.7, 20.6], [20.7, 20.6]].map(([x, y], i) => <Lantern key={i} x={x} y={y} />)}
    </g>
  );
});
const UNDER = 'M-1.3,22.2 L.2,23.7 L2.3,24.5 L3.9,25.9 L6.3,26.4 L8.4,27.7 L10.5,28.8 L12.7,27.9 L14.5,27.3 L16.3,26 L18.3,25.1 L20.2,23.7 L21.6,22.2Z';

/** Faint socket grid over the building ground (in cells, outside the 20-unit scale). */
export const Sockets = memo(function Sockets({ size }: { size: number }) {
  const dots: ReactNode[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (hash(r, c, 23) < 0.08) dots.push(<path key={`${r},${c}`} d={`M${c + 0.25 + hash(r, c, 1) * 0.3},${r + 0.3 + hash(r, c, 2) * 0.4} l.12,.08 l.06,.14`} stroke={INK} strokeOpacity=".12" strokeWidth=".03" fill="none" strokeLinecap="round" />);
  return (
    <g className="bly-sockets" pointerEvents="none">
      <rect width={size} height={size} fill="url(#bly-p-socket)" />
      {dots}
    </g>
  );
});

/** A glowing guild sigil on an uncovered start square (cell coordinates). */
export function Sigil({ guild, r, c }: { guild: Guild; r: number; c: number }) {
  return (
    <g className={`bly-sigil bly-g-${guild}`} transform={`translate(${c} ${r})`} data-sigil={guild}>
      <circle className="bly-sigil-glow" cx=".5" cy=".5" r=".62" style={{ fill: 'var(--g-light)' }} opacity=".45" />
      <rect x=".06" y=".06" width=".88" height=".88" rx=".2" style={{ fill: 'var(--g-rim)', stroke: 'var(--g-top)' }} strokeWidth=".07" strokeDasharray=".16 .08" />
      <use href={`#bly-em-${guild}`} x=".17" y=".17" width=".66" height=".66" style={{ color: 'var(--g-top)' }} />
    </g>
  );
}
