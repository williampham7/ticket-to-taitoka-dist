import { memo, useMemo } from 'react';
import {
  CONTINENTS, CONT_TERRS, LANES, LAND_PATHS, MAP_H, MAP_W, SEA_PATHS, TERR, TERRITORY_GEO, TERRITORY_IDS, TERRITORY_PATHS, project,
  type Battle, type WarView,
} from '@boboland/shared/src/warfront';
import { WarDefs, metalOf, unitKind } from './Units';
import { factionOf } from './factions';
import { useZoom } from './useZoom';

export interface Marks {
  selected?: string | null;
  target?: string | null;
  /** territories that can be clicked now (glow) */
  valid?: Set<string>;
  validKind?: 'attack' | 'friendly';
  arrow?: { from: string; to: string; kind: 'attack' | 'fortify' } | null;
  draft?: Record<string, number>;
  /** conquered this turn: push-pins stay in */
  pins?: string[];
}

const idx = (factions: number[], owner: string | null) => (owner === 'N' || owner == null ? 'N' : factions[Number(owner)] ?? Number(owner));
const PLAQUES: Record<string, [number, number]> = { na: [-142, 31], sa: [-108, -22], eu: [-32, 50], af: [-18, -18], as: [165, 46], oc: [172, -12] };
const GRATICULE = { lon: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180], lat: [60, 30, 0, -30] };

/** Splits long names over two lines. */
const lines = (name: string) => {
  if (name.length <= 11) return [name];
  const i = name.indexOf(' ', Math.floor(name.length / 2) - 3);
  const j = i < 0 ? name.lastIndexOf(' ') : i;
  return j < 0 ? [name] : [name.slice(0, j), name.slice(j + 1)];
};

/** The static map: ocean, bathymetry, relief land, inland seas, lanes, graticule, compass, cartouche. */
const Terrain = memo(function Terrain() {
  const [cx, cy] = project(-28, -44);
  return (
    <g>
      <rect width={MAP_W} height={MAP_H} fill="url(#wf-ocean)" />
      <g stroke="#9fd6d6" fill="none" opacity=".5">
        {GRATICULE.lon.map((l) => { const [x] = project(l, 0); return <line key={l} x1={x} x2={x} y1={0} y2={MAP_H} strokeWidth=".6" strokeDasharray="2 6" />; })}
        {GRATICULE.lat.map((l) => { const [, y] = project(0, l); return <line key={l} x1={0} x2={MAP_W} y1={y} y2={y} strokeWidth={l === 0 ? 1 : 0.6} strokeDasharray={l === 0 ? '10 6' : '2 6'} />; })}
      </g>
      <g fill="none" strokeLinejoin="round">
        {[[30, 0.1], [18, 0.16], [9, 0.24]].map(([w, o]) => <g key={w} stroke="#7cc7c4" strokeWidth={w} opacity={o}>{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>)}
        <g stroke="#f3ead0" strokeWidth="2.6" opacity=".75">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
      </g>
      <g filter="url(#wf-relief)">
        <rect width={MAP_W} height={MAP_H} fill="url(#wf-land)" clipPath="url(#wf-landclip)" />
      </g>
      <g fill="url(#wf-ocean)" stroke="#2f4b4f" strokeWidth=".8">{SEA_PATHS.map((d, i) => <path key={i} d={d} pointerEvents="all" />)}</g>
      <g fill="none" stroke="#2f4b4f" strokeWidth=".9" opacity=".9">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
      <g transform={`translate(${cx},${cy})`} className="wf-compass" opacity=".85">
        <circle r="34" fill="none" stroke="#e9dcb5" strokeWidth="1" strokeDasharray="2 3" />
        <circle r="26" fill="none" stroke="#e9dcb5" strokeWidth=".8" />
        <path d="M0,-40 L6,0 L0,40 L-6,0Z" fill="url(#wf-brass)" stroke="#5a3e12" strokeWidth=".6" />
        <path d="M-40,0 L0,-6 L40,0 L0,6Z" fill="#e9dcb5" opacity=".85" />
        <text y="-44" textAnchor="middle" className="wf-compass-n">N</text>
      </g>
    </g>
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
}

export function Board({ view, factions, marks, onPick, onHover, effects, washed }: BoardProps) {
  const zoom = useZoom(MAP_W, MAP_H);
  const valid = marks.valid ?? new Set<string>();
  const dim = !!marks.selected || valid.size > 0;
  const landGrad = useMemo(() => {
    const stops: [number, string][] = [[0, '#eef2f0'], [0.1, '#c6cfb2'], [0.2, '#9fb682'], [0.32, '#7fa368'], [0.42, '#a7ad73'], [0.47, '#d8c48d'],
      [0.53, '#d5bc84'], [0.58, '#9eb06c'], [0.66, '#79a160'], [0.76, '#b6aa78'], [0.84, '#a3ad7d'], [1, '#d9dccf']];
    return stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />);
  }, []);
  return (
    <div className="wf-board">
      <svg ref={zoom.svg} viewBox={zoom.viewBox} className="wf-map" {...zoom.handlers} role="img" aria-label="War map">
        <WarDefs />
        <defs>
          <linearGradient id="wf-ocean" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2c7d8f" /><stop offset=".5" stopColor="#1f6c80" /><stop offset="1" stopColor="#184f63" /></linearGradient>
          <linearGradient id="wf-land" x1="0" y1="0" x2="0" y2={MAP_H} gradientUnits="userSpaceOnUse">{landGrad}</linearGradient>
          <clipPath id="wf-landclip">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</clipPath>
          {washed && <clipPath id={`wf-wash-${washed.seq}`}><path d={TERRITORY_PATHS[washed.t]} /></clipPath>}
        </defs>
        <Terrain />
        <g className="wf-lanes">
          {LANES.map((l) => l.segs.map(([a, b], i) => (
            <g key={`${l.a}${l.b}${i}`} className={l.kind === 'land' ? 'wf-bridge' : 'wf-lane'}>
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
              {l.kind === 'sea' && <circle cx={(a[0] + b[0]) / 2} cy={(a[1] + b[1]) / 2} r="2.6" />}
            </g>
          )))}
        </g>
        <g className={`wf-terrs${dim ? ' wf-dimming' : ''}`}>
          {TERRITORY_IDS.map((t) => {
            const fi = idx(factions, view.owner[t]);
            const cls = ['wf-terr', valid.has(t) ? `wf-valid wf-valid-${marks.validKind ?? 'attack'}` : '', marks.selected === t ? 'wf-sel' : '', marks.target === t ? 'wf-tgt' : ''].join(' ');
            return (
              <g key={t} className={cls} data-t={t} onClick={(e) => onPick?.(t, e)} onPointerEnter={() => onHover?.(t)} onPointerLeave={() => onHover?.(null)}>
                <path d={TERRITORY_PATHS[t]} className="wf-acetate" fill={view.owner[t] ? factionOf(factions, view.owner[t]).color : 'transparent'} />
                {view.owner[t] && <path d={TERRITORY_PATHS[t]} fill={`url(#wf-h${fi})`} className="wf-hatch" />}
                <path d={TERRITORY_PATHS[t]} className="wf-hit" />
                <title>{TERR[t].name}</title>
              </g>
            );
          })}
        </g>
        <g clipPath="url(#wf-landclip)" className="wf-borders" pointerEvents="none">
          {TERRITORY_IDS.map((t) => <path key={t} d={TERRITORY_PATHS[t]} />)}
        </g>
        {washed && view.owner[washed.t] && (
          <g key={washed.seq} clipPath={`url(#wf-wash-${washed.seq})`} pointerEvents="none">
            <circle className="wf-wash" cx={TERRITORY_GEO[washed.t].x} cy={TERRITORY_GEO[washed.t].y} r="90" fill={factionOf(factions, view.owner[washed.t]).color} />
          </g>
        )}
        {marks.selected && (
          <g className="wf-lifted" pointerEvents="none" filter="url(#wf-lift)">
            <path d={TERRITORY_PATHS[marks.selected]} fill={factionOf(factions, view.owner[marks.selected]).color} fillOpacity=".55" />
          </g>
        )}
        {[...valid].map((t) => <path key={t} d={TERRITORY_PATHS[t]} className={`wf-glow wf-glow-${marks.validKind ?? 'attack'}`} pointerEvents="none" />)}
        <Plaques view={view} factions={factions} />
        {marks.arrow && <Arrow {...marks.arrow} />}
        <g className="wf-units">
          {TERRITORY_IDS.map((t) => (
            <Unit key={t} t={t} n={view.armies[t]} fi={idx(factions, view.owner[t])} draft={marks.draft?.[t]} pin={marks.pins?.includes(t) ? factionOf(factions, view.owner[t]).color : null}
              onPick={onPick} hit={effects && (effects.from === t || effects.to === t) ? effects.seq : null} />
          ))}
        </g>
        {effects && <Effects b={effects} />}
      </svg>
      <div className="wf-zoom">
        <button type="button" onClick={zoom.zoomIn} aria-label="Zoom in">+</button>
        <button type="button" onClick={zoom.zoomOut} aria-label="Zoom out">−</button>
        <button type="button" onClick={zoom.fit} aria-label="Fit the map" disabled={!zoom.zoomed}>⤢</button>
      </div>
    </div>
  );
}

function Unit({ t, n, fi, draft, pin, onPick, hit }: { t: string; n: number; fi: number | 'N'; draft?: number; pin: string | null; onPick?: BoardProps['onPick']; hit: number | null }) {
  const g = TERRITORY_GEO[t];
  const name = lines(TERR[t].name);
  if (!n) return null;
  return (
    <g transform={`translate(${g.x.toFixed(1)},${g.y.toFixed(1)})`} className="wf-unit" data-unit={t} onClick={(e) => onPick?.(t, e)}>
      <text className="wf-label" y={name.length > 1 ? -27 : -18} textAnchor="middle">
        {name.map((l, i) => <tspan key={i} x="0" dy={i ? 9.5 : 0}>{l}</tspan>)}
      </text>
      <g key={hit ?? 'still'} className={hit ? 'wf-shake' : undefined}>
        <use href={`#wf-u-${unitKind(n)}`} x="-13" y="-11" width="26" height="26" fill={metalOf(fi)} stroke="#1d150c" strokeWidth=".7" filter="url(#wf-shadow)" />
      </g>
      <g transform="translate(12,7)">
        <circle r="7.4" fill="url(#wf-brass)" stroke="#4a3410" strokeWidth=".8" />
        <circle r="5.8" fill="#fbf4df" />
        <text className="wf-count" textAnchor="middle" dy="2.7">{n}</text>
      </g>
      {draft ? (
        <g transform="translate(-14,6)" className="wf-draft">
          <rect x="-9" y="-6.5" width="18" height="13" rx="6.5" />
          <text textAnchor="middle" dy="3">+{draft}</text>
        </g>
      ) : null}
      {pin && (
        <g className="wf-pin" transform="translate(4,-6)">
          <line x1="0" y1="0" x2="0" y2="-16" stroke="#3a2a14" strokeWidth="1.2" />
          <path d="M0,-16 L10,-13 L0,-10Z" fill={pin} stroke="#2a1d0c" strokeWidth=".5" />
          <circle cy="-16" r="1.8" fill="url(#wf-brass)" />
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
        const owners = new Set(CONT_TERRS[c.id].map((t) => view.owner[t]));
        const held = owners.size === 1 ? [...owners][0] : null;
        const f = held && held !== 'N' ? factionOf(factions, held) : null;
        return (
          <g key={c.id} transform={`translate(${x},${y})`} className={f ? 'wf-plaque wf-plaque-lit' : 'wf-plaque'}>
            <rect x="-56" y="-15" width="112" height="30" rx="3" fill="url(#wf-brass)" stroke="#4d3510" />
            <rect x="-52" y="-11" width="104" height="22" rx="2" fill="none" stroke="#fff3c9" strokeOpacity=".55" />
            {[-50, 50].map((sx) => <circle key={sx} cx={sx} cy="0" r="1.6" fill="#5d4214" />)}
            <text className="wf-plaque-name" textAnchor="middle" y="-1">{c.name.toUpperCase()}</text>
            <text className="wf-plaque-bonus" textAnchor="middle" y="9">+{c.bonus} ARMIES</text>
            {f && <circle cx="44" cy="-9" r="5" fill={f.color} stroke="#fff" strokeWidth="1.2" className="wf-plaque-lamp" />}
          </g>
        );
      })}
    </g>
  );
}

const wraps = (a: string, b: string) => Math.abs(TERRITORY_GEO[a].x - TERRITORY_GEO[b].x) > MAP_W / 2;
function Arrow({ from, to, kind }: { from: string; to: string; kind: 'attack' | 'fortify' }) {
  const a = TERRITORY_GEO[from], b = TERRITORY_GEO[to];
  let bx = b.x, by = b.y;
  if (wraps(from, to)) { bx = a.x < MAP_W / 2 ? -20 : MAP_W + 20; by = a.y; }
  const dx = bx - a.x, dy = by - a.y, len = Math.hypot(dx, dy) || 1;
  const ex = bx - (dx / len) * 14, ey = by - (dy / len) * 14;
  const mx = (a.x + ex) / 2 - (dy / len) * len * 0.18, my = (a.y + ey) / 2 + (dx / len) * len * 0.18;
  const ang = Math.atan2(ey - my, ex - mx);
  const head = [ang + 2.6, ang - 2.6].map((r) => `${ex + Math.cos(r) * 12},${ey + Math.sin(r) * 12}`);
  return (
    <g className={`wf-arrow wf-arrow-${kind}`} pointerEvents="none" filter="url(#wf-pencil)">
      <path d={`M${a.x},${a.y} Q${mx},${my} ${ex},${ey}`} pathLength={100} />
      <path d={`M${head[0]} L${ex},${ey} L${head[1]}`} className="wf-arrow-head" />
    </g>
  );
}

function Effects({ b }: { b: Battle }) {
  const f = TERRITORY_GEO[b.from], t = TERRITORY_GEO[b.to];
  return (
    <g key={b.seq} pointerEvents="none" className="wf-fx">
      {b.attLoss > 0 && <text x={f.x} y={f.y - 6} className="wf-loss" textAnchor="middle">−{b.attLoss}</text>}
      {b.defLoss > 0 && <text x={t.x} y={t.y - 6} className="wf-loss" textAnchor="middle">−{b.defLoss}</text>}
      {[0, 1, 2].map((i) => <circle key={i} cx={t.x + (i - 1) * 7} cy={t.y + 2} r="6" className={`wf-smoke wf-smoke-${i}`} />)}
      <circle cx={t.x} cy={t.y} r="4" className="wf-flash" />
    </g>
  );
}
