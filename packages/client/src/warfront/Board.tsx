import { memo, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  CONTINENTS, CONT_TERRS, LANES, MAP_H, MAP_W, TERR, TERRITORY_GEO, TERRITORY_IDS, TERRITORY_PATHS, project,
  type Battle, type WarView,
} from '@boboland/shared/src/warfront';
import { WarDefs, metalOf, unitKind } from './Units';
import { factionOf } from './factions';
import { useZoom } from './useZoom';
import { Terrain, TerrainTop } from './Terrain';
import type { Pulse, Trail } from './actionFx';

export interface Marks {
  selected?: string | null;
  target?: string | null;
  /** territories that can be clicked now (glow) */
  valid?: Set<string>;
  validKind?: 'attack' | 'friendly' | 'source';
  arrow?: { from: string; to: string; kind: 'attack' | 'fortify' } | null;
  draft?: Record<string, number>;
  /** conquered this turn: push-pins stay in */
  pins?: string[];
  /** the current general's territories get a soft spotlight */
  spot?: string | null;
}

const idx = (factions: number[], owner: string | null) => (owner === 'N' || owner == null ? 'N' : factions[Number(owner)] ?? Number(owner));
const PLAQUES: Record<string, [number, number]> = { na: [-142, 31], sa: [-108, -22], eu: [-32, 50], af: [-18, -18], as: [165, 46], oc: [172, -12] };

/** Splits long names over two lines. */
const lines = (name: string) => {
  if (name.length <= 11) return [name];
  const i = name.indexOf(' ', Math.floor(name.length / 2) - 3);
  const j = i < 0 ? name.lastIndexOf(' ') : i;
  return j < 0 ? [name] : [name.slice(0, j), name.slice(j + 1)];
};


/** Per-territory clip paths (inner glow bands) and the land clip, built once. */
const StaticDefs = memo(function StaticDefs() {
  return (
    <defs>
      {TERRITORY_IDS.map((t) => <clipPath key={t} id={`wf-tc-${t}`}><path d={TERRITORY_PATHS[t]} /></clipPath>)}
      <radialGradient id="wf-blast"><stop offset="0" stopColor="#fff7d6" /><stop offset=".35" stopColor="#ffc24a" /><stop offset=".7" stopColor="#e2461f" stopOpacity=".8" /><stop offset="1" stopColor="#6b1a0a" stopOpacity="0" /></radialGradient>
      <radialGradient id="wf-spot"><stop offset="0" stopColor="#fff3c4" stopOpacity=".55" /><stop offset="1" stopColor="#fff3c4" stopOpacity="0" /></radialGradient>
      <marker id="wf-head" viewBox="-6 -6 12 12" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse" markerUnits="strokeWidth">
        <path d="M-5,-5 L5,0 L-5,5 L-2.6,0Z" fill="context-stroke" />
      </marker>
    </defs>
  );
});

export interface BoardProps {
  view: WarView;
  factions: number[];
  marks: Marks;
  onPick?: (t: string, e: React.MouseEvent) => void;
  onHover?: (t: string | null) => void;
  effects?: Battle | null;
  washed?: { t: string; seq: number } | null;
  pulses?: Pulse[];
  trails?: Trail[];
  /** hover card content for a territory */
  tip?: (t: string) => ReactNode;
}

export function Board({ view, factions, marks, onPick, onHover, effects, washed, pulses = [], trails = [], tip }: BoardProps) {
  const zoom = useZoom(MAP_W, MAP_H);
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ t: string; x: number; y: number } | null>(null);
  const valid = marks.valid ?? new Set<string>();
  const kind = marks.validKind ?? 'attack';
  const dim = !!marks.selected || valid.size > 0;
  const hoverAt = (t: string | null, e?: React.PointerEvent) => {
    onHover?.(t);
    if (!t || !e || e.pointerType === 'touch') { setHover(null); return; }
    const r = wrap.current!.getBoundingClientRect();
    setHover({ t, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return (
    <div className="wf-board" ref={wrap}>
      <svg ref={zoom.svg} viewBox={zoom.viewBox} className="wf-map" {...zoom.handlers} role="img" aria-label="War map">
        <WarDefs />
        <StaticDefs />
        {washed && <defs><clipPath id={`wf-wash-${washed.seq}`}><path d={TERRITORY_PATHS[washed.t]} /></clipPath></defs>}
        <Terrain />
        <Lanes />
        <g className={`wf-terrs${dim ? ' wf-dimming' : ''}`} clipPath="url(#wf-t-landclip)">
          {TERRITORY_IDS.map((t) => {
            const o = view.owner[t];
            const f = factionOf(factions, o);
            const cls = ['wf-terr', valid.has(t) ? `wf-valid wf-valid-${kind}` : '', marks.selected === t ? 'wf-sel' : '', marks.target === t ? 'wf-tgt' : '', o === marks.spot && o ? 'wf-spot' : ''].join(' ');
            return (
              <g key={t} className={cls} data-t={t} onClick={(e) => onPick?.(t, e)} onPointerMove={(e) => hoverAt(t, e)} onPointerLeave={() => hoverAt(null)}>
                <path d={TERRITORY_PATHS[t]} className="wf-acetate" fill={o ? f.color : 'transparent'} />
                {o && <path d={TERRITORY_PATHS[t]} fill={`url(#wf-h${idx(factions, o)})`} className="wf-hatch" />}
                {o && <path d={TERRITORY_PATHS[t]} className="wf-inner" stroke={f.color} clipPath={`url(#wf-tc-${t})`} />}
                <path d={TERRITORY_PATHS[t]} className="wf-hit" />
              </g>
            );
          })}
        </g>
        <g clipPath="url(#wf-t-landclip)" className="wf-borders" pointerEvents="none">
          {TERRITORY_IDS.map((t) => <path key={t} d={TERRITORY_PATHS[t]} />)}
        </g>
        <TerrainTop />
        {washed && view.owner[washed.t] && (
          <g key={washed.seq} clipPath={`url(#wf-wash-${washed.seq})`} pointerEvents="none">
            <circle className="wf-wash" cx={TERRITORY_GEO[washed.t].x} cy={TERRITORY_GEO[washed.t].y} r="110" fill={factionOf(factions, view.owner[washed.t]).color} />
          </g>
        )}
        {marks.selected && (
          <g className="wf-lifted" pointerEvents="none" filter="url(#wf-lift)">
            <path d={TERRITORY_PATHS[marks.selected]} fill={factionOf(factions, view.owner[marks.selected]).color} fillOpacity=".55" />
          </g>
        )}
        {[...valid].map((t) => <path key={t} d={TERRITORY_PATHS[t]} className={`wf-glow wf-glow-${kind}`} pointerEvents="none" />)}
        <Plaques view={view} factions={factions} />
        <g className="wf-trails" pointerEvents="none">{trails.map((t) => <TrailArrow key={t.id} {...t} />)}</g>
        {marks.arrow && <Arrow {...marks.arrow} />}
        <g className="wf-units">
          {TERRITORY_IDS.map((t) => (
            <Unit key={t} t={t} n={view.armies[t]} fi={idx(factions, view.owner[t])} draft={marks.draft?.[t]} pin={marks.pins?.includes(t) ? factionOf(factions, view.owner[t]).color : null}
              onPick={onPick} hit={effects && (effects.from === t || effects.to === t) ? effects.seq : null} />
          ))}
        </g>
        {effects && <Effects b={effects} />}
        <g className="wf-pulses" pointerEvents="none">{pulses.map((p) => <PulseMark key={p.id} {...p} />)}</g>
      </svg>
      {hover && tip && (
        <div className="wf-tip" style={{ left: hover.x, top: hover.y }} data-flip={hover.x > (wrap.current?.clientWidth ?? 0) - 260 ? '' : undefined}>{tip(hover.t)}</div>
      )}
      <div className="wf-zoom">
        <button type="button" onClick={zoom.zoomIn} aria-label="Zoom in">+</button>
        <button type="button" onClick={zoom.zoomOut} aria-label="Zoom out">−</button>
        <button type="button" onClick={zoom.fit} aria-label="Fit the map" disabled={!zoom.zoomed}>⤢</button>
      </div>
    </div>
  );
}

const Lanes = memo(function Lanes() {
  return (
    <g className="wf-lanes" pointerEvents="none">
      {LANES.map((l) => l.segs.map(([a, b], i) => (
        <g key={`${l.a}${l.b}${i}`} className={l.kind === 'land' ? 'wf-bridge' : 'wf-lane'}>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
          {l.kind !== 'land' && <><circle cx={a[0]} cy={a[1]} r="2.2" /><circle cx={b[0]} cy={b[1]} r="2.2" /></>}
        </g>
      )))}
    </g>
  );
});

function Unit({ t, n, fi, draft, pin, onPick, hit }: { t: string; n: number; fi: number | 'N'; draft?: number; pin: string | null; onPick?: BoardProps['onPick']; hit: number | null }) {
  const g = TERRITORY_GEO[t];
  const name = lines(TERR[t].name);
  if (n == null || (!n && fi === 'N')) return null;
  const digits = String(n).length;
  const w = 10 + digits * 7.2;
  return (
    <g transform={`translate(${g.x.toFixed(1)},${g.y.toFixed(1)})`} className="wf-unit" data-unit={t} onClick={(e) => onPick?.(t, e)}>
      <text className="wf-label" y={name.length > 1 ? -31 : -21} textAnchor="middle">
        {name.map((l, i) => <tspan key={i} x="0" dy={i ? 10 : 0}>{l}</tspan>)}
      </text>
      <g key={hit ?? 'still'} className={hit ? 'wf-shake' : undefined}>
        <ellipse cx="1.5" cy="11" rx="12" ry="3.6" fill="#000" opacity=".35" />
        <circle r="12.5" fill={metalOf(fi)} stroke="#1d150c" strokeWidth=".9" />
        <circle r="10.4" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".8" />
        <use href={`#wf-u-${unitKind(n)}`} x="-9.5" y="-10" width="19" height="19" fill="#fbf4df" stroke="#1d150c" strokeWidth=".5" />
      </g>
      <g transform="translate(0,15.5)" className="wf-count-plate">
        <rect x={-w / 2} y="-7.5" width={w} height="15" rx="3.5" fill="#fbf4df" stroke="#3b2606" strokeWidth="1.1" />
        <rect x={-w / 2 + 1.6} y="-5.9" width={w - 3.2} height="11.8" rx="2.4" fill="none" stroke={metalOf(fi)} strokeWidth="1.2" />
        <text className="wf-count" textAnchor="middle" dy="4.4">{n}</text>
      </g>
      {draft ? (
        <g transform="translate(17,-8)" className="wf-draft">
          <rect x="-11" y="-8" width="22" height="16" rx="8" />
          <text textAnchor="middle" dy="3.8">+{draft}</text>
        </g>
      ) : null}
      {pin && (
        <g className="wf-pin" transform="translate(9,-9)">
          <line x1="0" y1="0" x2="0" y2="-18" stroke="#3a2a14" strokeWidth="1.4" />
          <path d="M0,-18 L12,-14.5 L0,-11Z" fill={pin} stroke="#2a1d0c" strokeWidth=".5" />
          <circle cy="-18" r="2" fill="url(#wf-brass)" />
        </g>
      )}
    </g>
  );
}

function Plaques({ view, factions }: { view: WarView; factions: number[] }) {
  return (
    <g className="wf-plaques" pointerEvents="none">
      {CONTINENTS.map((c) => {
        const [x, y] = project(...PLAQUES[c.id]);
        const ts = CONT_TERRS[c.id];
        const owners = new Set(ts.map((t) => view.owner[t]));
        const held = owners.size === 1 ? [...owners][0] : null;
        const f = held && held !== 'N' ? factionOf(factions, held) : null;
        return (
          <g key={c.id} transform={`translate(${x},${y})`} className={f ? 'wf-plaque wf-plaque-lit' : 'wf-plaque'}>
            <rect x="-62" y="-17" width="124" height="34" rx="3" fill="url(#wf-brass)" stroke="#4d3510" />
            <rect x="-58" y="-13" width="116" height="26" rx="2" fill="none" stroke="#fff3c9" strokeOpacity=".55" />
            {[-56, 56].map((sx) => <circle key={sx} cx={sx} cy="0" r="1.7" fill="#5d4214" />)}
            <text className="wf-plaque-name" textAnchor="middle" y="-1.5">{c.name.toUpperCase()}</text>
            <text className="wf-plaque-bonus" textAnchor="middle" y="9.5">HOLD ALL {ts.length} · +{c.bonus} / TURN</text>
            {f && <circle cx="50" cy="-10" r="5.5" fill={f.color} stroke="#fff" strokeWidth="1.2" className="wf-plaque-lamp" />}
          </g>
        );
      })}
    </g>
  );
}

const wraps = (a: string, b: string) => Math.abs(TERRITORY_GEO[a].x - TERRITORY_GEO[b].x) > MAP_W / 2;
/** A curved route between two territory centres (off the board edge for the wrap-around link). */
function route(from: string, to: string, bend = 0.18, inset = 16) {
  const a = TERRITORY_GEO[from], b = TERRITORY_GEO[to];
  let bx = b.x, by = b.y;
  if (wraps(from, to)) { bx = a.x < MAP_W / 2 ? -20 : MAP_W + 20; by = a.y; }
  const dx = bx - a.x, dy = by - a.y, len = Math.hypot(dx, dy) || 1;
  const sx = a.x + (dx / len) * 10, sy = a.y + (dy / len) * 10;
  const ex = bx - (dx / len) * inset, ey = by - (dy / len) * inset;
  const mx = (sx + ex) / 2 - (dy / len) * len * bend, my = (sy + ey) / 2 + (dx / len) * len * bend;
  return { d: `M${sx},${sy} Q${mx},${my} ${ex},${ey}`, sx, sy, ex, ey, mx, my, cx: (sx + 2 * mx + ex) / 4, cy: (sy + 2 * my + ey) / 4 };
}

function Arrow({ from, to, kind }: { from: string; to: string; kind: 'attack' | 'fortify' }) {
  const r = route(from, to);
  const ang = Math.atan2(r.ey - r.my, r.ex - r.mx);
  const head = [ang + 2.6, ang - 2.6].map((a) => `${r.ex + Math.cos(a) * 12},${r.ey + Math.sin(a) * 12}`);
  return (
    <g className={`wf-arrow wf-arrow-${kind}`} pointerEvents="none" filter="url(#wf-pencil)">
      <path d={r.d} pathLength={100} />
      <path d={`M${head[0]} L${r.ex},${r.ey} L${head[1]}`} className="wf-arrow-head" />
    </g>
  );
}

/** Someone's attack or march, drawn for everyone: a coloured route with a moving column, and a count for marches. */
function TrailArrow({ from, to, kind, color, n, won }: Trail) {
  const r = route(from, to, kind === 'attack' ? 0.2 : 0.14, kind === 'attack' ? 8 : 14);
  return (
    <g className={`wf-trail wf-trail-${kind}${won ? ' wf-trail-won' : ''}`} style={{ ['--tc' as string]: color }}>
      <path d={r.d} className="wf-trail-shadow" />
      <path d={r.d} className="wf-trail-line" pathLength={100} stroke={color} markerEnd="url(#wf-head)" />
      <path d={r.d} className="wf-trail-flow" pathLength={100} />
      {kind === 'attack' && [0, 1, 2].map((i) => (
        <circle key={i} r="3.2" className="wf-tracer" style={{ offsetPath: `path('${r.d}')`, animationDelay: `${i * 0.18}s` }} />
      ))}
      {n ? (
        <g transform={`translate(${r.cx},${r.cy})`} className="wf-trail-n">
          <rect x="-15" y="-9" width="30" height="18" rx="9" fill={color} stroke="#fbf4df" strokeWidth="1.6" />
          <text textAnchor="middle" dy="4.2">{n}</text>
        </g>
      ) : null}
    </g>
  );
}

function PulseMark({ t, n, color, loss, delay }: Pulse) {
  const g = TERRITORY_GEO[t];
  return (
    <g transform={`translate(${g.x},${g.y})`} className={`wf-pulse${loss ? ' wf-pulse-loss' : ''}`} style={{ ['--d' as string]: `${delay}ms` }}>
      <circle r="14" fill="none" stroke={color} className="wf-pulse-ring" />
      <text className="wf-pulse-n" textAnchor="middle" y="-16" fill={loss ? '#ff5547' : color}>{n > 0 ? `+${n}` : `−${-n}`}</text>
    </g>
  );
}

function Effects({ b }: { b: Battle }) {
  const t = TERRITORY_GEO[b.to];
  return (
    <g key={b.seq} pointerEvents="none" className="wf-fx" transform={`translate(${t.x},${t.y})`}>
      <circle r="10" className="wf-shock" />
      <circle r="9" fill="url(#wf-blast)" className="wf-flash" />
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1="-8" x2="0" y2="-17" className="wf-spark" transform={`rotate(${i * 45 + 20})`} />)}
      {[0, 1, 2, 3].map((i) => <circle key={i} cx={(i - 1.5) * 7} cy={3 - (i % 2) * 4} r="6" className={`wf-smoke wf-smoke-${i}`} />)}
      {b.conquered && <text y="-30" textAnchor="middle" className="wf-captured">CAPTURED</text>}
    </g>
  );
}
