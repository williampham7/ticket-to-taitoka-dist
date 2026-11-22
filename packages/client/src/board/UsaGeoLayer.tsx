import { memo, useMemo } from 'react';
import { USA_GEO, project } from '@boboland/shared';
import type { Box } from './fit';
import { Compass, PointsCartouche, Ship } from './GeoLayer';
import { ACCENT, INK, OCEAN, OCEAN_INK, PAPER, SOFT_INK } from '../theme';

type LL = [number, number];
const f = (n: number) => n.toFixed(1);
const linePath = (ll: LL[], close = false) => ll.map((p, i) => (i ? 'L' : 'M') + project(p).map(f).join(',')).join('') + (close ? 'Z' : '');

/** Static decorative geography for the USA map, in a faded travel-poster style. */
export const UsaGeoLayer = memo(function UsaGeoLayer({ vb }: { vb: Box }) {
  const geo = useMemo(() => {
    const land = USA_GEO.LAND.map((r) => linePath(r as LL[], true)).join('');
    const states = USA_GEO.STATES.map((l) => linePath(l as LL[])).join('');
    const canada = USA_GEO.BORDERS.canada.map((l) => linePath(l as LL[])).join('');
    const mexico = USA_GEO.BORDERS.mexico.map((l) => linePath(l as LL[])).join('');
    const graticule = [
      ...[25, 30, 35, 40, 45, 50].map((lat) => linePath(Array.from({ length: 141 }, (_, i) => [-135 + i * 0.5, lat] as LL))),
      ...[-125, -120, -115, -110, -105, -100, -95, -90, -85, -80, -75, -70, -65].map((lon) => linePath(Array.from({ length: 81 }, (_, i) => [lon, 18 + i * 0.5] as LL))),
    ];
    return { land, states, canada, mexico, graticule };
  }, []);

  const border = project([-110, 49]);
  const mexicoLabel = project([-104, 28]);

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <filter id="u-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves={3} stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 .22  0 0 0 0 .16  0 0 0 0 .1  0 0 0 1 0" /></filter>
        <filter id="u-mottle"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves={3} seed={4} /><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .32  0 0 0 0 .18  0 0 0 .9 -.25" /></filter>
        <pattern id="u-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke={OCEAN_INK} strokeWidth="1" /></pattern>
        <clipPath id="u-land"><path d={geo.land} clipRule="evenodd" /></clipPath>
        <radialGradient id="u-vig" cx="50%" cy="48%" r="72%"><stop offset="62%" stopColor="#5a3a18" stopOpacity="0" /><stop offset="100%" stopColor="#5a3a18" stopOpacity=".3" /></radialGradient>
      </defs>

      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={OCEAN} />
      {[[90, 0.06], [60, 0.08], [36, 0.11], [18, 0.15]].map(([w, o]) => (
        <path key={w} d={geo.land} fill="none" stroke={OCEAN_INK} strokeWidth={w} strokeOpacity={o} strokeLinejoin="round" />
      ))}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#u-hatch)" opacity={0.12} />

      <path d={geo.land} fill={PAPER} fillRule="evenodd" />
      <g clipPath="url(#u-land)">
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} filter="url(#u-mottle)" opacity={0.35} />
      </g>
      <path d={geo.land} fill="none" stroke={INK} strokeWidth={1.8} opacity={0.55} strokeLinejoin="round" />

      <g stroke={INK} strokeWidth={0.8} strokeDasharray="2 6" opacity={0.22} fill="none">
        {geo.graticule.map((d, i) => <path key={i} d={d} />)}
      </g>

      <path d={geo.states} fill="none" stroke={INK} strokeWidth={1.1} strokeDasharray="7 4 1.5 4" opacity={0.3} />
      {[geo.canada, geo.mexico].map((d, i) => (
        <g key={i}>
          <path d={d} fill="none" stroke={ACCENT} strokeWidth={5} opacity={0.18} />
          <path d={d} fill="none" stroke={INK} strokeWidth={1.8} strokeDasharray="12 4 2 4 2 4" opacity={0.6} />
        </g>
      ))}

      <g fontFamily="Oswald" fontWeight={600} fontSize={13} letterSpacing="0.45em" fill={INK} opacity={0.55} textAnchor="middle">
        <text x={border[0]} y={border[1] - 9}>CANADA</text>
        <text x={border[0]} y={border[1] + 20}>UNITED STATES</text>
        <text x={mexicoLabel[0]} y={mexicoLabel[1]}>MEXICO</text>
      </g>
      <g fontFamily="Libre Baskerville" fontStyle="italic" letterSpacing="0.4em" fill={OCEAN_INK} opacity={0.8} textAnchor="middle">
        <text fontSize={22} transform="translate(-45 270) rotate(-75)">Pacific Ocean</text>
        <text fontSize={22} transform="translate(1575 600) rotate(-58)">Atlantic Ocean</text>
        <text fontSize={22} transform="translate(1185 965)">Gulf of Mexico</text>
      </g>

      <Compass cx={1585} cy={830} />
      {/* tucked into the bottom-left corner, clear of the California coast */}
      <PointsCartouche x={-84} y={774} />
      <g stroke={OCEAN_INK} fill="none" strokeWidth={1.6} opacity={0.6}>
        {[[-60, 120], [1620, 330], [1650, 960], [960, 1000], [-70, 520]].map(([x, y], i) => (
          <path key={i} d={`M${x},${y} q7,-6 14,0 t14,0 t14,0`} />
        ))}
      </g>
      <Ship x={1660} y={430} />
      <Ship x={1290} y={1010} flip={-1} />

      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} filter="url(#u-grain)" opacity={0.13} style={{ mixBlendMode: 'multiply' }} />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#u-vig)" />
      <rect x={vb.x + 4} y={vb.y + 4} width={vb.w - 8} height={vb.h - 8} fill="none" stroke={INK} strokeWidth={3} />
      <rect x={vb.x + 11} y={vb.y + 11} width={vb.w - 22} height={vb.h - 22} fill="none" stroke={SOFT_INK} strokeWidth={1} />
    </svg>
  );
});
