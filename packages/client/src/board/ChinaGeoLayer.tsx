import { memo } from 'react';
import { CHINA_GEO, MAPS, ROUTE_POINTS } from '@boboland/shared';
import type { Box } from './fit';
import { ACCENT, INK, OCEAN, OCEAN_INK, RIVER, ROUTE_FILL, ROUTE_STROKE, SOFT_INK } from '../theme';

/**
 * Geography for the China map in the modern (HSR) style: flat, clean cartography. A calm teal sea with a
 * shallow-water glow and two depth contours, light grey land lifted off the sea by a soft shadow, China a
 * shade lighter than its neighbours, thin rivers and a fine border. Static: only re-renders on resize.
 */
type LL = [number, number];
const project = MAPS.china.project;
const f = (n: number) => n.toFixed(1);
const linePath = (ll: readonly LL[], close = false) => ll.map((p, i) => (i ? 'L' : 'M') + project(p).map(f).join(',')).join('') + (close ? 'Z' : '');

/** Lighter China, dimmer neighbours: both cool greys, a step apart. */
const CHINA_LAND = '#f7f8fa';
const NEIGHBOUR_LAND = '#e1e6ec';
const COAST = '#9fb3c4';

const near = (a: LL, b: LL) => Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02;

/** China's land border pieces joined end to end into one line (they are stored as loose segments). */
export function chainBorder(pieces: readonly (readonly LL[])[]): LL[] {
  const left = pieces.map((p) => [...p] as LL[]);
  // start at the end that touches no other piece (one of the two coastal ends)
  const ends = left.flatMap((p) => [p[0], p[p.length - 1]]);
  const lonely = (pt: LL) => ends.filter((e) => near(e, pt)).length === 1;
  let i = left.findIndex((p) => lonely(p[0]) || lonely(p[p.length - 1]));
  let line = lonely(left[i][0]) ? left[i] : [...left[i]].reverse();
  left.splice(i, 1);
  while (left.length) {
    const tail = line[line.length - 1];
    i = left.findIndex((p) => near(p[0], tail) || near(p[p.length - 1], tail));
    if (i < 0) break;
    const next = near(left[i][0], tail) ? left[i] : [...left[i]].reverse();
    line = [...line, ...next.slice(1)];
    left.splice(i, 1);
  }
  return line;
}

/** China's outline: the land border closed along the mainland coast (Hainan and Taiwan are separate rings). */
export function chinaOutline(): LL[] {
  const border = chainBorder(CHINA_GEO.BORDER);
  const coast = CHINA_GEO.LAND[0] as LL[];
  const nearest = (pt: LL) => coast.reduce((best, p, k) => (Math.hypot(p[0] - pt[0], p[1] - pt[1]) < Math.hypot(coast[best][0] - pt[0], coast[best][1] - pt[1]) ? k : best), 0);
  const from = nearest(border[border.length - 1]), to = nearest(border[0]);
  // walk the coast from the border's last point back to its first, the short way round: that is China's own coast
  const walk = (i: number, j: number) => (i <= j ? coast.slice(i, j + 1) : [...coast.slice(i), ...coast.slice(0, j + 1)]);
  const forward = walk(from, to), backward = walk(to, from).reverse();
  return [...border, ...(forward.length <= backward.length ? forward : backward)];
}

/** Rings of the land outlines that are part of China but not the mainland (Hainan). */
function hainan(): LL[][] {
  return (CHINA_GEO.LAND as LL[][]).filter((r) => {
    const lons = r.map((p) => p[0]), lats = r.map((p) => p[1]);
    return Math.min(...lons) < 109.7 && Math.max(...lons) > 109.7 && Math.min(...lats) < 19.2 && Math.max(...lats) > 19.2 && r.length < 200;
  });
}

const GEO = (() => {
  const land = (CHINA_GEO.LAND as LL[][]).map((r) => linePath(r, true)).join('');
  const china = linePath(chinaOutline(), true) + hainan().map((r) => linePath(r, true)).join('');
  const taiwan = (CHINA_GEO.TAIWAN as LL[][]).map((r) => linePath(r, true)).join('');
  const border = linePath(chainBorder(CHINA_GEO.BORDER));
  const rivers = [...CHINA_GEO.RIVERS.yangtze, ...CHINA_GEO.RIVERS.yellow].map((r) => linePath(r as LL[])).join('');
  const graticule = [
    ...[10, 20, 30, 40, 50].map((lat) => linePath(Array.from({ length: 141 }, (_, i) => [50 + i * 0.75, lat] as LL))),
    ...[70, 80, 90, 100, 110, 120, 130, 140].map((lon) => linePath(Array.from({ length: 61 }, (_, i) => [lon, 0 + i * 1] as LL))),
  ].join('');
  // the land data stops at 57°N; tall (phone) views reach further north, so carry the land on to the pole
  const edge = Array.from({ length: 81 }, (_, i) => project([52 + i * ((138.6 - 52) / 80), 56.9]));
  const north = edge.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join('') + `L${f(edge[80][0])},-6000L${f(edge[0][0])},-6000Z`;
  return { land, china, taiwan, border, rivers, graticule, north };
})();

const at = (lon: number, lat: number) => project([lon, lat]);

/** Feature names, faint, in empty land and sea (Chinese above English). */
const FEATURES: { zh: string; en: string; ll: LL; sea?: boolean; size?: number }[] = [
  { zh: '青藏高原', en: 'Tibetan Plateau', ll: [87.6, 35.3] },
  { zh: '戈壁', en: 'Gobi Desert', ll: [104.2, 42.6] },
  { zh: '黄海', en: 'Yellow Sea', ll: [123.4, 34.6], sea: true },
  { zh: '东海', en: 'East China Sea', ll: [125.4, 27.4], sea: true },
  { zh: '南海', en: 'South China Sea', ll: [116.2, 19.3], sea: true },
];

export const ChinaGeoLayer = memo(function ChinaGeoLayer({ vb }: { vb: Box }) {
  // bottom-left, over the Himalaya foothills where no route runs; the north arrow out in the Sea of Japan
  const legend = [40, 870];
  const north = at(133.2, 38.6);
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden data-geo="china">
      <defs>
        <linearGradient id="c-depth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".18" />
          <stop offset=".55" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor={OCEAN_INK} stopOpacity=".16" />
        </linearGradient>
        <filter id="c-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id="c-lift" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="3" dy="5" stdDeviation="5" floodColor={INK} floodOpacity=".16" />
        </filter>
        {/* depth contours: rings at a fixed distance from the coast (a wide stroke minus a slightly narrower one) */}
        {[22, 52].map((d) => (
          <mask key={d} id={`c-contour-${d}`} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.w} height={vb.h}>
            <path d={GEO.land} fill="none" stroke="#fff" strokeWidth={2 * d + 1.4} strokeLinejoin="round" />
            <path d={GEO.land} fill="none" stroke="#000" strokeWidth={2 * d - 1.4} strokeLinejoin="round" />
          </mask>
        ))}
        <clipPath id="c-land"><path d={GEO.land} clipRule="evenodd" /></clipPath>
      </defs>

      {/* sea */}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={OCEAN} />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#c-depth)" />
      <path d={GEO.graticule} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.35} />
      <path d={GEO.land} fill="none" stroke="#ffffff" strokeWidth={34} strokeLinejoin="round" opacity={0.4} filter="url(#c-blur)" />
      {[22, 52].map((d, i) => (
        <rect key={d} x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={OCEAN_INK} opacity={i ? 0.12 : 0.18} mask={`url(#c-contour-${d})`} />
      ))}

      {/* land: neighbours, then China a shade lighter */}
      <path d={GEO.land} fill={NEIGHBOUR_LAND} fillRule="evenodd" filter="url(#c-lift)" />
      <g clipPath="url(#c-land)">
        <path d={GEO.china} fill={CHINA_LAND} />
        <path d={GEO.taiwan} fill={CHINA_LAND} />
      </g>
      <path d={GEO.land} fill="none" stroke={COAST} strokeWidth={1.1} strokeLinejoin="round" fillRule="evenodd" />
      <path d={GEO.north} fill={NEIGHBOUR_LAND} />
      <path d={GEO.rivers} fill="none" stroke={RIVER} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <path d={GEO.border} fill="none" stroke={ACCENT} strokeWidth={5} strokeLinejoin="round" opacity={0.07} />
      <path d={GEO.border} fill="none" stroke={SOFT_INK} strokeWidth={1.1} strokeLinejoin="round" strokeDasharray="6 2.5" opacity={0.55} />

      {FEATURES.map((t) => {
        const [x, y] = at(...t.ll);
        const ink = t.sea ? OCEAN_INK : SOFT_INK;
        return (
          <g key={t.en} textAnchor="middle" fill={ink} opacity={t.sea ? 0.75 : 0.42}>
            <text x={x} y={y} fontSize={19} letterSpacing="0.5em" style={{ fontFamily: 'var(--font-zh)', fontWeight: 500 }}>{t.zh}</text>
            <text x={x} y={y + 19} fontSize={11.5} fontWeight={600} letterSpacing="0.3em" style={{ fontFamily: 'var(--font-ui)' }}>{t.en.toUpperCase()}</text>
          </g>
        );
      })}

      <NorthArrow x={north[0]} y={north[1]} />
      <PointsLegend x={legend[0]} y={legend[1]} />
    </svg>
  );
});

/** A minimal north arrow: a split needle in a hairline ring. */
function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${f(x)},${f(y)})`}>
      <circle r={21} fill="#ffffff" fillOpacity={0.55} stroke={INK} strokeOpacity={0.35} strokeWidth={1} />
      <path d="M0,-15 L6,7 L0,3Z" fill={INK} />
      <path d="M0,-15 L-6,7 L0,3Z" fill="#ffffff" stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
      <text y={-27} textAnchor="middle" fontSize={13} fontWeight={700} fill={INK} style={{ fontFamily: 'var(--font-ui)' }}>N</text>
    </g>
  );
}

/** Route points legend: a clean card with car strips and their points. */
export function PointsLegend({ x, y }: { x: number; y: number }) {
  const w = 196, row = 25, top = 52, h = top + 6 * row + 2;
  const carW = 15, gap = 3;
  return (
    <g transform={`translate(${f(x)},${f(y)}) scale(1.2)`}>
      <rect x={1} y={3} width={w} height={h} rx={12} fill={INK} opacity={0.1} />
      <rect width={w} height={h} rx={12} fill="#ffffff" fillOpacity={0.92} stroke={INK} strokeOpacity={0.14} />
      <rect x={16} y={18} width={4} height={18} rx={1} fill={ACCENT} />
      <text x={28} y={33} fontSize={16} fontWeight={700} letterSpacing="0.06em" fill={INK} style={{ fontFamily: '"Barlow Condensed", var(--font-ui)' }}>ROUTE POINTS</text>
      <text x={w - 16} y={33} textAnchor="end" fontSize={13} fill={SOFT_INK} style={{ fontFamily: 'var(--font-zh)', fontWeight: 500 }}>线路积分</text>
      {[1, 2, 3, 4, 5, 6].map((n, i) => (
        <g key={n} transform={`translate(16,${top + i * row})`}>
          {i > 0 && <path d={`M0,-4.5H${w - 32}`} stroke={INK} strokeOpacity={0.07} />}
          {Array.from({ length: n }, (_, c) => (
            <rect key={c} x={c * (carW + gap)} y={5} width={carW} height={8} rx={2.5} fill={ROUTE_FILL.gray} stroke={ROUTE_STROKE} strokeOpacity={0.5} strokeWidth={0.9} />
          ))}
          <text x={w - 32} y={14} textAnchor="end" fontSize={14} fontWeight={700} fill={INK} style={{ fontFamily: 'var(--font-ui)', fontVariantNumeric: 'tabular-nums' }}>{ROUTE_POINTS[n]}</text>
        </g>
      ))}
    </g>
  );
}

