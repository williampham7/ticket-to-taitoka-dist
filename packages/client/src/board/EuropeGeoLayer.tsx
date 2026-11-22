import { memo } from 'react';
import { MAPS } from '@boboland/shared';
import * as EUROPE_GEO from '../../../shared/src/map/europe/geo';
import { STRETCH_X } from '../../../shared/src/map/europe/projection';
import type { Box } from './fit';
import { OCEAN, OCEAN_INK, RIVER, SOFT_INK } from '../theme';
import { GAME_TITLE } from '../lib/skin';
import { LANDMARK_ART, type LandmarkId } from '../rail/landmarks';

/**
 * Geography for the Europe map in the rail theme: an antique railway map. A sea with fine engraved hatching
 * and water-lines following the coasts, warm paper land with a tinted coastal border, a faint graticule and
 * paper grain, a compass rose and a title cartouche in empty corners, and optional landmark vignettes.
 * Everything here is decoration under the routes (pointer-events: none). Static: only re-renders on resize.
 */
type LL = [number, number];
const project = (MAPS as Record<string, { project: (p: LL) => number[] }>).europe.project;
const f = (n: number) => n.toFixed(1);
const linePath = (ll: readonly LL[], close = false) => ll.map((p, i) => (i ? 'L' : 'M') + project(p).map(f).join(',')).join('') + (close ? 'Z' : '');
const at = (lon: number, lat: number) => project([lon, lat]);

/** Sepia ink for the decoration (compass, cartouche, landmarks, graticule). */
const SEPIA = '#6b4f33';
const LAND = '#f3e9cc';
const COAST_TINT = '#e3cf9c';

/**
 * Landmark vignettes, placed in empty parts of the board, each centred on its point. `scale` 1 draws one about
 * 100 map units tall (a train car is about 44); each is sized to stay well inside its clear area.
 */
export interface Landmark { id: LandmarkId; lon: number; lat: number; scale: number }
export const LANDMARKS: Landmark[] = [
  { id: 'eiffel', lon: -12, lat: 49.4, scale: 1 }, // Atlantic, west of Brittany
  { id: 'bigben', lon: -12, lat: 52.6, scale: 0.85 }, // west of Ireland
  { id: 'viking', lon: -1, lat: 61, scale: 0.95 }, // Norwegian Sea
  { id: 'sagrada', lon: 7.5, lat: 37.4, scale: 1 }, // western Mediterranean
  { id: 'colosseum', lon: 17, lat: 37.3, scale: 1.1 }, // Ionian Sea
  { id: 'parthenon', lon: 29.5, lat: 35.9, scale: 1.1 }, // south of Turkey
  { id: 'hagiasophia', lon: 32.5, lat: 43, scale: 0.7 }, // Black Sea
  { id: 'brandenburg', lon: 34, lat: 52.5, scale: 1.2 }, // Belarus
];

/** The compass rose (in the open Atlantic below the Eiffel Tower; `r` in map units) and the title cartouche (top left). */
const COMPASS = { lon: -10.95, lat: 45.4, r: 52 };
const CARTOUCHE: { lon: number; lat: number; w: number } = { lon: -13.6, lat: 58.4, w: 240 };

const GEO = (() => {
  const g = EUROPE_GEO as unknown as { LAND: LL[][]; RIVERS?: Record<string, LL[][]> };
  const land = g.LAND.map((r) => linePath(r, true)).join('');
  const rivers = g.RIVERS ? Object.values(g.RIVERS).flat().map((r) => linePath(r)).join('') : '';
  const graticule = [
    ...[35, 40, 45, 50, 55, 60, 65, 70].map((lat) => linePath(Array.from({ length: 121 }, (_, i) => [-40 + i * 0.8, lat] as LL))),
    ...[-30, -20, -10, 0, 10, 20, 30, 40, 50].map((lon) => linePath(Array.from({ length: 61 }, (_, i) => [lon, 25 + i * 0.9] as LL))),
  ].join('');
  return { land, rivers, graticule };
})();

/** A 32-point compass rose: rings with degree ticks, long and short points, the north point in oxblood. */
function CompassRose({ x, y, r }: { x: number; y: number; r: number }) {
  const pt = (a: number, d: number) => `${f(x + Math.sin(a) * d)},${f(y - Math.cos(a) * d)}`;
  const star = (n: number, len: number, w: number, fill: string, offset = 0) => Array.from({ length: n }, (_, i) => {
    const a = offset + (i * 2 * Math.PI) / n;
    return (
      <g key={`${n}-${i}`}>
        <path d={`M${pt(a, len)} L${pt(a + Math.PI / 2, w)} L${f(x)},${f(y)} Z`} fill={fill} />
        <path d={`M${pt(a, len)} L${pt(a - Math.PI / 2, w)} L${f(x)},${f(y)} Z`} fill="#f6eed6" />
      </g>
    );
  });
  return (
    <g stroke={SEPIA} strokeWidth={0.9} strokeLinejoin="round">
      <circle cx={x} cy={y} r={r} fill="none" />
      <circle cx={x} cy={y} r={r - 5} fill="none" strokeWidth={0.6} />
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i * Math.PI) / 36;
        return <path key={i} d={`M${pt(a, r - 5)} L${pt(a, i % 2 ? r - 2.5 : r)}`} strokeWidth={0.5} />;
      })}
      {star(16, r * 0.62, r * 0.05, '#d6c49a', Math.PI / 16)}
      {star(8, r * 0.78, r * 0.08, '#c7ae78', Math.PI / 8)}
      {star(4, r * 0.98, r * 0.12, SEPIA)}
      {/* north point picked out in oxblood */}
      <path d={`M${pt(0, r * 0.98)} L${pt(Math.PI / 2, r * 0.12)} L${f(x)},${f(y)} Z`} fill="#7b1e2b" />
      <circle cx={x} cy={y} r={r * 0.07} fill="#f6eed6" />
      <text x={x} y={y - r - 8} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={r * 0.3} fill={SEPIA} stroke="none">N</text>
    </g>
  );
}

/** The title cartouche: an art-deco framed panel with the title, a rule and a scale bar in kilometres. */
function Cartouche({ x, y, w }: { x: number; y: number; w: number }) {
  const h = w * 0.46;
  // one map unit is about 6371 / 2650 = 2.4 km on the standard parallels; the bar runs east-west, which is stretched
  const km = (d: number) => (d * 2650 * STRETCH_X) / 6371;
  const bar = km(400);
  const bx = x - bar / 2, by = y + h * 0.3;
  const step = (x0: number, y0: number, sx: number, sy: number) => `M${x0},${y0 + sy * 16} V${y0 + sy * 6} H${x0 + sx * 6} V${y0} H${x0 + sx * 16}`;
  return (
    <g stroke={SEPIA} fill="none">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#f6eed6" fillOpacity={0.88} strokeWidth={1.4} />
      <rect x={x - w / 2 + 5} y={y - h / 2 + 5} width={w - 10} height={h - 10} strokeWidth={0.6} />
      {/* stepped deco corners */}
      <g strokeWidth={0.9}>
        <path d={step(x - w / 2 + 9, y - h / 2 + 9, 1, 1)} />
        <path d={step(x + w / 2 - 9, y - h / 2 + 9, -1, 1)} />
        <path d={step(x - w / 2 + 9, y + h / 2 - 9, 1, -1)} />
        <path d={step(x + w / 2 - 9, y + h / 2 - 9, -1, -1)} />
      </g>
      {/* sunburst above the title */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = -Math.PI / 2 + ((i - 4) * Math.PI) / 14;
        return <path key={i} d={`M${f(x + Math.cos(a) * 8)},${f(y - h * 0.22 + Math.sin(a) * 8)} L${f(x + Math.cos(a) * 18)},${f(y - h * 0.22 + Math.sin(a) * 18)}`} strokeWidth={0.8} />;
      })}
      <text x={x} y={y - h * 0.02} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={700} fontSize={w * 0.07} letterSpacing="0.12em" fill="#7b1e2b" stroke="none">{GAME_TITLE.toUpperCase()}</text>
      <text x={x} y={y + h * 0.15} textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize={w * 0.05} fill={SEPIA} stroke="none">Railway map of the continent</text>
      {/* scale bar: 0 to 400 km in alternating blocks */}
      {[0, 1, 2, 3].map((i) => <rect key={i} x={bx + (i * bar) / 4} y={by} width={bar / 4} height={4} fill={i % 2 ? '#f6eed6' : SEPIA} strokeWidth={0.6} />)}
      {[0, 200, 400].map((d) => (
        <text key={d} x={bx + (d / 400) * bar} y={by + 14} textAnchor="middle" fontFamily="var(--font-ui)" fontSize={9} fill={SEPIA} stroke="none">{d === 400 ? '400 km' : d}</text>
      ))}
    </g>
  );
}

export const EuropeGeoLayer = memo(function EuropeGeoLayer({ vb }: { vb: Box }) {
  const [cx, cy] = at(COMPASS.lon, COMPASS.lat);
  const [tx, ty] = at(CARTOUCHE.lon, CARTOUCHE.lat);
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden data-geo="europe">
      <defs>
        <pattern id="eu-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0,3 H6" stroke={OCEAN_INK} strokeWidth="0.55" opacity="0.32" />
        </pattern>
        <radialGradient id="eu-vignette" cx="50%" cy="48%" r="70%">
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#3f5a4c" stopOpacity="0.22" />
        </radialGradient>
        <clipPath id="eu-land"><path d={GEO.land} clipRule="evenodd" /></clipPath>
        {/* paper grain: low-frequency mottling plus fine fibre noise */}
        <filter id="eu-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.26  0 0 0 0 0.15  0 0 0 0.55 -0.12" />
        </filter>
        <filter id="eu-mottle" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="3" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.2  0 0 0 0.5 -0.18" />
        </filter>
      </defs>
      {/* sea, water-lines following the coast (ink then erased with sea, from wide to narrow), hatching */}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={OCEAN} />
      <g fill="none" strokeLinejoin="round">
        {[46, 32, 20, 10].map((w, i) => (
          <g key={w}>
            <path d={GEO.land} stroke={OCEAN_INK} strokeOpacity={0.22 + i * 0.05} strokeWidth={w} />
            <path d={GEO.land} stroke={OCEAN} strokeWidth={w - 2.2} />
          </g>
        ))}
      </g>
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#eu-hatch)" />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#eu-vignette)" />
      {/* land: warm paper with a tinted band inside the coast, like a hand-coloured border */}
      <path d={GEO.land} fill={LAND} fillRule="evenodd" />
      <g clipPath="url(#eu-land)">
        <path d={GEO.land} fill="none" stroke={COAST_TINT} strokeWidth={14} strokeOpacity={0.65} strokeLinejoin="round" />
        <path d={GEO.land} fill="none" stroke={COAST_TINT} strokeWidth={6} strokeOpacity={0.6} strokeLinejoin="round" />
      </g>
      {GEO.rivers && <path d={GEO.rivers} fill="none" stroke={RIVER} strokeWidth={1.4} strokeLinecap="round" opacity={0.8} />}
      <path d={GEO.graticule} fill="none" stroke={SEPIA} strokeWidth={0.7} strokeDasharray="1 5" strokeLinecap="round" opacity={0.4} />
      <path d={GEO.land} fill="none" fillRule="evenodd" stroke={SOFT_INK} strokeWidth={1.1} strokeLinejoin="round" />
      {/* paper grain and mottling over everything */}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} filter="url(#eu-mottle)" opacity={0.5} />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} filter="url(#eu-grain)" opacity={0.35} />
      {/* corner decoration and landmarks */}
      <g opacity={0.82}>
        <CompassRose x={cx} y={cy} r={COMPASS.r} />
        <Cartouche x={tx} y={ty} w={CARTOUCHE.w} />
      </g>
      {LANDMARKS.length > 0 && (
        <g fill="none" stroke={SEPIA} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.42} data-landmarks>
          {LANDMARKS.map((l) => {
            const [x, y] = at(l.lon, l.lat);
            return <g key={l.id} transform={`translate(${f(x)},${f(y + 50 * l.scale)}) scale(${l.scale})`} data-landmark={l.id} style={{ color: SEPIA }}>{LANDMARK_ART[l.id]}</g>;
          })}
        </g>
      )}
    </svg>
  );
});
