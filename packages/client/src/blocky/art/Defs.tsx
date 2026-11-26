import { memo, type ReactNode } from 'react';
import { ALL_ORIENTS, GUILDS, type Guild } from '@boboland/shared/src/blocky';
import { outline } from './shape';
import { INK } from './palette';

/** Block depth: the south face height and the east bevel width (cell units). */
export const DEPTH = 0.21, BEVEL = 0.12;
const R = 0.24, INS = 0.04;

/**
 * Shared SVG defs for every Blocky page, mounted once in BlockyApp. Colour reaches a `<use>` through the
 * `bly-g-<guild>` class (CSS variables --g-top, --g-light, --g-south, --g-east, --g-rim, --g-ink, --g-pat);
 * every gradient here is neutral white/ink alpha, because gradient stops don't inherit through `<use>`.
 */
export const BlockyArtDefs = memo(function BlockyArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden focusable="false">
      <defs>
        <linearGradient id="bly-g-vert" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor={INK} stopOpacity=".2" />
        </linearGradient>
        <radialGradient id="bly-g-dome" cx=".22" cy=".18" r=".95">
          <stop offset="0" stopColor="#fff" stopOpacity=".6" /><stop offset=".4" stopColor="#fff" stopOpacity=".16" /><stop offset="1" stopColor={INK} stopOpacity=".12" />
        </radialGradient>
        <linearGradient id="bly-g-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".5" stopColor="#fff" stopOpacity=".15" /><stop offset=".7" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="bly-g-glow"><stop offset="0" stopColor="#fff6c8" stopOpacity=".95" /><stop offset=".5" stopColor="#ffd56a" stopOpacity=".45" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <radialGradient id="bly-g-stud" cx=".35" cy=".3" r=".8"><stop offset="0" stopColor="#fff" stopOpacity=".75" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor={INK} stopOpacity=".3" /></radialGradient>
        {/* guild patterns: one tile per cell, white/ink alpha only, each a different structure so guilds read in grayscale */}
        <pattern id="bly-p-tide" patternUnits="userSpaceOnUse" width="1" height="1">
          <path d="M-.05,.3 q.15,-.11 .3,0 t.3,0 t.3,0 t.3,0" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth=".06" strokeLinecap="round" />
          <path d="M-.2,.66 q.15,-.11 .3,0 t.3,0 t.3,0 t.3,0" fill="none" stroke={INK} strokeOpacity=".3" strokeWidth=".05" strokeLinecap="round" />
        </pattern>
        <pattern id="bly-p-sun" patternUnits="userSpaceOnUse" width="1" height="1">
          <circle cx=".26" cy=".28" r=".085" fill={INK} fillOpacity=".3" />
          <circle cx=".74" cy=".72" r=".085" fill={INK} fillOpacity=".3" />
          <circle cx=".74" cy=".28" r=".095" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth=".045" />
          <circle cx=".26" cy=".72" r=".05" fill="#fff" fillOpacity=".65" />
        </pattern>
        <pattern id="bly-p-ember" patternUnits="userSpaceOnUse" width="1" height="1">
          <path d="M.04,.14 L.3,.34 L.24,.58 L.5,.8 L.62,.98 M.3,.34 L.54,.26 L.66,.04 M.24,.58 L.06,.7 M.5,.8 L.78,.7 L.98,.78" fill="none" stroke="#6e2216" strokeOpacity=".5" strokeWidth=".06" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M.05,.15 L.3,.35 L.25,.58 L.5,.79 L.62,.97 M.3,.35 L.54,.27 M.5,.79 L.78,.7" fill="none" stroke="#ffad7a" strokeOpacity=".85" strokeWidth=".024" strokeLinecap="round" strokeLinejoin="round" />
        </pattern>
        <pattern id="bly-p-grove" patternUnits="userSpaceOnUse" width="1" height="1">
          <g transform="rotate(-30 .3 .32)"><path d="M.08,.32 Q.3,.1 .52,.32 Q.3,.54 .08,.32Z" fill="#fff" fillOpacity=".52" /><path d="M.1,.32 H.5" stroke={INK} strokeOpacity=".4" strokeWidth=".04" /></g>
          <g transform="rotate(35 .7 .72)"><path d="M.48,.72 Q.7,.5 .92,.72 Q.7,.94 .48,.72Z" fill={INK} fillOpacity=".34" /><path d="M.5,.72 H.9" stroke="#fff" strokeOpacity=".5" strokeWidth=".03" /></g>
          <circle cx=".78" cy=".2" r=".05" fill="#fff" fillOpacity=".4" />
        </pattern>
        <pattern id="bly-shared-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="4" height="8" fill="#e9dfca" opacity=".7" /></pattern>
        <pattern id="bly-pb-tide" patternUnits="userSpaceOnUse" width="1" height="1"><path d="M-.05,.36 q.15,-.16 .3,0 t.3,0 t.3,0 t.3,0" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth=".11" strokeLinecap="round" /></pattern>
        <pattern id="bly-pb-sun" patternUnits="userSpaceOnUse" width="1" height="1"><circle cx=".3" cy=".3" r=".12" fill="#fff" fillOpacity=".7" /><circle cx=".7" cy=".7" r=".12" fill={INK} fillOpacity=".35" /></pattern>
        <pattern id="bly-pb-ember" patternUnits="userSpaceOnUse" width="1" height="1"><path d="M.06,.16 L.36,.42 L.28,.66 L.62,.94" fill="none" stroke={INK} strokeOpacity=".5" strokeWidth=".1" strokeLinejoin="round" strokeLinecap="round" /></pattern>
        <pattern id="bly-pb-grove" patternUnits="userSpaceOnUse" width="1" height="1"><path d="M.12,.5 Q.5,.1 .88,.5 Q.5,.9 .12,.5Z" fill="#fff" fillOpacity=".55" /><path d="M.16,.5 H.84" stroke={INK} strokeOpacity=".45" strokeWidth=".07" /></pattern>
        <pattern id="bly-p-socket" patternUnits="userSpaceOnUse" width="1" height="1">
          <rect width="1" height="1" fill="#ece3d0" />
          <rect x=".08" y=".08" width=".84" height=".84" rx=".22" fill="#e4dac4" />
          <rect x=".12" y=".13" width=".78" height=".77" rx=".2" fill="#efe8d8" />
          <path d="M.1,.78 V.3 Q.1,.1 .3,.1 H.78" fill="none" stroke={INK} strokeOpacity=".13" strokeWidth=".05" strokeLinecap="round" />
          <path d="M.24,.92 H.72 Q.92,.92 .92,.72 V.24" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth=".04" strokeLinecap="round" />
        </pattern>
        {ALL_ORIENTS.map((o) => <OrientSymbol key={o.gid} gid={o.gid} cells={o.shape.cells} />)}
        <symbol id="bly-stud" overflow="visible">
          <circle r=".2" fill={INK} opacity=".22" cx=".03" cy=".06" />
          <circle r=".18" style={{ fill: 'var(--g-top)' }} />
          <circle r=".18" fill="url(#bly-g-stud)" />
          <circle r=".18" fill="none" style={{ stroke: 'var(--g-ink)' }} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <circle r=".05" cx="-.05" cy="-.05" fill="#fff" opacity=".9" />
        </symbol>
        {GUILDS.map((g) => [1, 2, 3].map((st) => <symbol key={`${g}${st}`} id={`bly-d-${g}-${st}`} overflow="visible">{DETAIL[g][st - 1]}</symbol>))}
        {GUILDS.map((g) => <symbol key={g} id={`bly-em-${g}`} viewBox="0 0 1 1">{EMBLEM[g]}</symbol>)}
      </defs>
    </svg>
  );
});

/** One moulded piece in one orientation (see ART.md, block render recipe). */
function OrientSymbol({ gid, cells }: { gid: number; cells: [number, number][] }) {
  const body = outline(cells, R, INS);
  const east = outline(cells, R, INS, 0, -DEPTH);
  const top = outline(cells, R, INS, -BEVEL, -DEPTH);
  const [gr, gc] = cells.reduce((b, x) => (x[0] + x[1] < b[0] + b[1] ? x : b));
  return (
    <symbol id={`bly-o-${gid}`} overflow="visible">
      <clipPath id={`bly-cb-${gid}`}><path d={body} /></clipPath>
      <path d={outline(cells, R, INS, 0.14, 0.26)} fill={INK} opacity=".2" />
      <path d={outline(cells, R, INS, 0.06, 0.13)} fill={INK} opacity=".38" />
      <path d={body} style={{ fill: 'var(--g-south)' }} />
      <path d={body} fill="url(#bly-g-vert)" />
      <g clipPath={`url(#bly-cb-${gid})`}>
        <path d={east} style={{ fill: 'var(--g-east)' }} />
        <path d={top} style={{ fill: 'var(--g-top)' }} />
        <path d={top} fill="url(#bly-g-dome)" />
        <path d={top} style={{ fill: 'var(--g-pat)' }} />
        <path d={top} fill="none" stroke="url(#bly-g-rim)" strokeWidth=".14" />
        <path d={`M${gc + 0.12},${gr + 0.3} q.1,-.16 .3,-.18`} fill="none" stroke="#fff" strokeWidth=".1" strokeLinecap="round" opacity=".95" />
        <path d={`M${gc + 0.56},${gr + 0.1} l.05,.06 l-.05,.06 l-.05,-.06z`} fill="#fff" />
      </g>
      <path d={body} fill="none" style={{ stroke: 'var(--g-ink)' }} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </symbol>
  );
}

/** Stage details per guild (a 1x1 cell box, centred), kept below the pattern's contrast. */
const DETAIL: Record<Guild, [ReactNode, ReactNode, ReactNode]> = {
  tide: [
    <g key="1" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth=".045"><ellipse cx=".5" cy=".52" rx=".24" ry=".1" /><ellipse cx=".5" cy=".52" rx=".12" ry=".05" /><circle cx=".5" cy=".52" r=".025" fill="#fff" /></g>,
    <g key="2"><ellipse cx=".5" cy=".54" rx=".27" ry=".15" style={{ fill: 'var(--g-south)' }} opacity=".7" /><ellipse cx=".5" cy=".52" rx=".23" ry=".11" style={{ fill: 'var(--g-light)' }} /><path d="M.4,.5 q.06,-.04 .14,-.01" stroke="#fff" strokeWidth=".025" fill="none" strokeLinecap="round" /><circle cx=".6" cy=".55" r=".035" fill="#7cc06a" /></g>,
    <g key="3"><ellipse cx=".52" cy=".7" rx=".3" ry=".1" fill={INK} opacity=".2" /><path d="M.2,.58 h.6 l-.05,.1 q-.25,.08 -.5,0z" style={{ fill: 'var(--g-east)' }} /><ellipse cx=".5" cy=".58" rx=".3" ry=".09" style={{ fill: 'var(--g-rim)' }} /><ellipse cx=".5" cy=".58" rx=".23" ry=".06" style={{ fill: 'var(--g-light)' }} /><path d="M.5,.58 V.24" stroke="#fff" strokeWidth=".06" strokeLinecap="round" /><g className="bly-fountain" fill="#fff">{[[0.36, 0.42], [0.64, 0.42], [0.42, 0.3], [0.58, 0.3], [0.3, 0.52], [0.7, 0.52]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".028" />)}</g><circle className="bly-twinkle" cx=".5" cy=".22" r=".055" fill="#fff" /></g>,
  ],
  sun: [
    <g key="1" style={{ stroke: 'var(--g-south)' }} strokeOpacity=".55" strokeWidth=".03" fill="none" strokeLinecap="round"><circle cx=".5" cy=".5" r=".09" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M.5,.36 v-.06" transform={`rotate(${a} .5 .5)`} />)}</g>,
    <g key="2" transform="translate(-.15 -.17) scale(1.3)"><ellipse cx=".5" cy=".56" rx=".2" ry=".1" style={{ fill: 'var(--g-rim)' }} stroke={INK} strokeOpacity=".35" strokeWidth=".02" /><path d="M.5,.56 L.62,.6" stroke={INK} strokeOpacity=".3" strokeWidth=".03" strokeLinecap="round" /><path d="M.46,.56 L.5,.38 L.54,.56Z" style={{ fill: 'var(--g-south)' }} />{[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={0.36 + i * 0.07} cy={0.52 - Math.sin((i / 4) * Math.PI) * 0.05} r=".012" fill={INK} opacity=".35" />)}</g>,
    <g key="3"><ellipse cx=".6" cy=".78" rx=".24" ry=".06" fill={INK} opacity=".22" /><rect x=".36" y=".72" width=".28" height=".08" rx=".02" fill="#e3d8c0" stroke={INK} strokeOpacity=".5" strokeWidth=".018" /><path d="M.4,.74 L.46,.16 L.5,.06 L.5,.74Z" style={{ fill: 'var(--g-rim)' }} /><path d="M.5,.74 L.5,.06 L.54,.16 L.6,.74Z" style={{ fill: 'var(--g-south)' }} /><path d="M.4,.74 L.46,.16 L.5,.06 L.54,.16 L.6,.74Z" fill="none" style={{ stroke: 'var(--g-south)' }} strokeOpacity=".5" strokeWidth=".02" strokeLinejoin="round" /><circle className="bly-twinkle" cx=".5" cy=".08" r=".06" fill="#fff8d8" /></g>,
  ],
  ember: [
    <g key="1"><path className="bly-seam" d="M.5,.34 L.54,.46 L.66,.5 L.54,.54 L.5,.66 L.46,.54 L.34,.5 L.46,.46Z" fill="#ffd36b" /><circle cx=".5" cy=".5" r=".035" fill="#fff6d0" /></g>,
    <g key="2" transform="translate(-.15 -.2) scale(1.3)"><rect x=".42" y=".4" width=".16" height=".26" rx=".02" style={{ fill: 'var(--g-south)' }} stroke={INK} strokeOpacity=".45" strokeWidth=".018" /><path d="M.42,.48 h.16 M.42,.56 h.16 M.5,.4 v.08 M.47,.48 v.08 M.53,.56 v.1" stroke={INK} strokeOpacity=".3" strokeWidth=".012" /><rect x=".4" y=".37" width=".2" height=".05" rx=".015" fill={INK} opacity=".7" /><path className="bly-wisp" d="M.5,.34 q-.08,-.08 0,-.14 q.08,-.06 0,-.14" fill="none" stroke="#fff" strokeOpacity=".65" strokeWidth=".035" strokeLinecap="round" /></g>,
    <g key="3"><circle className="bly-glow" cx=".5" cy=".4" r=".42" fill="url(#bly-g-glow)" /><ellipse cx=".54" cy=".78" rx=".16" ry=".05" fill={INK} opacity=".3" /><path d="M.5,.78 v-.18" style={{ stroke: 'var(--g-south)' }} strokeWidth=".04" /><path d="M.38,.3 h.24 l-.03,.3 h-.18Z" fill="#ffe7a6" style={{ stroke: 'var(--g-south)' }} strokeOpacity=".6" strokeWidth=".02" strokeLinejoin="round" /><path d="M.35,.3 L.5,.16 L.65,.3Z" style={{ fill: 'var(--g-east)' }} /><path d="M.5,.33 v.24 M.44,.45 h.12" stroke="#ff9d3d" strokeWidth=".025" /></g>,
  ],
  grove: [
    <g key="1"><path d="M.5,.64 v-.16" style={{ stroke: 'var(--g-south)' }} strokeWidth=".03" strokeLinecap="round" /><path d="M.5,.5 q-.14,-.02 -.16,-.14 q.13,0 .16,.14z" style={{ fill: 'var(--g-light)' }} /><path d="M.5,.48 q.12,-.04 .14,-.16 q-.12,.02 -.14,.16z" style={{ fill: 'var(--g-rim)' }} /></g>,
    <g key="2" transform="translate(-.15 -.17) scale(1.3)"><path d="M.5,.66 v-.16" style={{ stroke: 'var(--g-south)' }} strokeWidth=".03" /><path d="M.5,.6 q-.12,-.02 -.14,-.1 q.1,0 .14,.1z" style={{ fill: 'var(--g-light)' }} />{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx=".5" cy=".36" rx=".045" ry=".08" fill="#f6ecef" stroke="#c99aa6" strokeOpacity=".35" strokeWidth=".01" transform={`rotate(${a} .5 .44)`} />)}<circle cx=".5" cy=".44" r=".045" fill="#f3d98a" /></g>,
    <g key="3"><ellipse cx=".58" cy=".78" rx=".26" ry=".07" fill={INK} opacity=".22" /><g className="bly-sway"><path d="M.5,.78 v-.28" stroke="#8a5a31" strokeWidth=".07" strokeLinecap="round" /><circle cx=".5" cy=".32" r=".27" style={{ fill: 'var(--g-east)' }} /><circle cx=".45" cy=".27" r=".22" style={{ fill: 'var(--g-light)' }} opacity=".85" /><circle cx=".38" cy=".2" r=".09" fill="#fff" opacity=".5" /><circle cx=".5" cy=".32" r=".27" fill="none" style={{ stroke: 'var(--g-south)' }} strokeOpacity=".5" strokeWidth=".02" /></g></g>,
  ],
};

/** The guild emblems (wave, sun, flame, leaf) in a 1x1 box: crests, sigils, flags, pennants. */
export const EMBLEM: Record<Guild, ReactNode> = {
  tide: <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth=".085"><path d="M.16,.42 q.085,-.12 .17,0 t.17,0 t.17,0" /><path d="M.16,.62 q.085,-.12 .17,0 t.17,0 t.17,0" opacity=".7" /><path d="M.5,.2 q.12,.05 .1,.14 q-.08,-.06 -.18,-.02" strokeWidth=".06" /></g>,
  sun: <g fill="currentColor"><circle cx=".5" cy=".5" r=".16" />{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M.46,.25 L.5,.12 L.54,.25Z" transform={`rotate(${a} .5 .5)`} />)}</g>,
  ember: <g fill="currentColor"><path d="M.5,.12 C.62,.3 .78,.4 .72,.62 C.68,.8 .55,.88 .5,.88 C.4,.88 .26,.78 .28,.6 C.3,.48 .38,.42 .4,.32 C.46,.4 .46,.48 .5,.5 C.54,.38 .52,.24 .5,.12Z" /><path d="M.5,.86 C.42,.86 .38,.78 .4,.7 C.42,.62 .48,.6 .5,.54 C.56,.62 .6,.68 .6,.74 C.6,.82 .56,.86 .5,.86Z" fill="#fff" opacity=".55" /></g>,
  grove: <g><path d="M.5,.12 C.76,.26 .8,.62 .5,.86 C.2,.62 .24,.26 .5,.12Z" fill="currentColor" /><path d="M.5,.22 V.84 M.5,.44 L.36,.34 M.5,.56 L.66,.44 M.5,.68 L.38,.58" stroke="#fff" strokeOpacity=".6" strokeWidth=".04" strokeLinecap="round" fill="none" /></g>,
};
