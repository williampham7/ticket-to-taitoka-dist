import { memo } from 'react';
import { MAPS, SG_GEO } from '@boboland/shared';
import type { Box } from './fit';
import { INK, OCEAN, OCEAN_INK, SOFT_INK } from '../theme';

/**
 * Geography for the Singapore map in the Merlion theme: a bright tropical sea with a shallow-water glow and
 * two depth contours, warm sand-coloured islands with a faint Peranakan tile texture and green pockets for the
 * nature reserves, reservoirs and Marina Bay in water blue, Johor dimmed across the strait, and a compass
 * cartouche in the south-west corner. Every ring goes through the map's own projection (fisheye included).
 * Static: only re-renders on resize.
 */
type LL = [number, number];
const project = MAPS.sg.project;
const f = (n: number) => n.toFixed(1);
const pt = (ll: LL) => project(ll);

/** A closed Catmull-Rom spline through the projected points: soft, natural coastlines. */
function smoothClosed(ll: readonly LL[], t = 0.5): string {
  const p = ll.map(pt);
  const n = p.length;
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * t) / 3, p1[1] + ((p2[1] - p0[1]) * t) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * t) / 3, p2[1] - ((p3[1] - p1[1]) * t) / 3];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

/** An oval blob round a lon/lat centre (radii in degrees): the green pockets. */
function blob(lon: number, lat: number, rx: number, ry: number, wob = 0.18): LL[] {
  return Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2, k = 1 + wob * Math.sin(i * 2.3 + lon * 40);
    return [lon + Math.cos(a) * rx * k, lat + Math.sin(a) * ry * k] as LL;
  });
}

const LAND = '#efe4c8';
const LAND_EDGE = '#c4b58a';
const JOHOR_LAND = '#e2dccb';
const GREEN = '#bfdca4';
const WATER_FILL = '#8fd2d3';

/** Nature reserves and big parks (lon, lat, radii in degrees). */
const PARKS: [number, number, number, number][] = [
  [103.81, 1.375, 0.026, 0.024], // Central Catchment
  [103.775, 1.35, 0.016, 0.012], // Bukit Timah
  [103.705, 1.443, 0.02, 0.008], // Sungei Buloh
  [103.7, 1.34, 0.012, 0.01], // Tengah
  [103.915, 1.299, 0.022, 0.004], // East Coast Park
  [103.82, 1.314, 0.006, 0.005], // Botanic Gardens
  [103.74, 1.4, 0.012, 0.01], // Mandai / Kranji
];

let cache: ReturnType<typeof build> | null = null;
function build() {
  const G = SG_GEO;
  const rings = [G.MAIN, G.SENTOSA, G.UBIN, G.TEKONG, G.JURONG_ISLAND, ...G.SOUTHERN];
  const land = rings.map((r) => smoothClosed(r)).join('');
  const main = smoothClosed(G.MAIN);
  const islands = [G.SENTOSA, G.UBIN, G.TEKONG, G.JURONG_ISLAND, ...G.SOUTHERN].map((r) => smoothClosed(r)).join('');
  const johor = smoothClosed(G.JOHOR, 0.35);
  const water = G.WATER.map(({ id, ring }) => ({ id, d: smoothClosed(ring) }));
  const parks = PARKS.map(([lon, lat, rx, ry]) => smoothClosed(blob(lon, lat, rx, ry)));
  const at = (lon: number, lat: number) => project([lon, lat]);
  return { land, main, islands, johor, water, parks, at };
}

export const SgGeoLayer = memo(function SgGeoLayer({ vb }: { vb: Box }) {
  const G = (cache ??= build());
  const south = G.at(103.83, 1.205), johor = G.at(103.62, 1.545), strait = G.at(103.86, 1.469);
  const cx = 60 + 118, cy = 1100 - 118;
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden data-geo="sg">
      <defs>
        <linearGradient id="sg-depth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".22" />
          <stop offset=".6" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor={OCEAN_INK} stopOpacity=".2" />
        </linearGradient>
        <filter id="sg-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12" /></filter>
        <filter id="sg-lift" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor={INK} floodOpacity=".2" />
        </filter>
        {[18, 46].map((d) => (
          <mask key={d} id={`sg-contour-${d}`} maskUnits="userSpaceOnUse" x={vb.x} y={vb.y} width={vb.w} height={vb.h}>
            <path d={G.land} fill="none" stroke="#fff" strokeWidth={2 * d + 1.4} strokeLinejoin="round" />
            <path d={G.land} fill="none" stroke="#000" strokeWidth={2 * d - 1.4} strokeLinejoin="round" />
          </mask>
        ))}
        <clipPath id="sg-main"><path d={G.main} /></clipPath>
        {/* a Peranakan tile, very faint, over the land */}
        <pattern id="sg-tile" width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="#10996a" fillOpacity=".075">
            <ellipse cx="32" cy="18" rx="6.4" ry="11" /><ellipse cx="32" cy="46" rx="6.4" ry="11" />
            <ellipse cx="18" cy="32" rx="11" ry="6.4" /><ellipse cx="46" cy="32" rx="11" ry="6.4" />
          </g>
          <g fill="#ef7a68" fillOpacity=".08">
            <path d="M0 0h14a14 14 0 0 1-14 14z" /><path d="M64 0v14a14 14 0 0 1-14-14z" />
            <path d="M0 64v-14a14 14 0 0 1 14 14z" /><path d="M64 64h-14a14 14 0 0 1 14-14z" />
          </g>
          <circle cx="32" cy="32" r="4" fill="#f2b632" fillOpacity=".16" />
        </pattern>
      </defs>

      {/* sea */}
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={OCEAN} />
      <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill="url(#sg-depth)" />
      <path d={G.land} fill="none" stroke="#ffffff" strokeWidth={30} strokeLinejoin="round" opacity={0.45} filter="url(#sg-blur)" />
      {[18, 46].map((d, i) => (
        <rect key={d} x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={OCEAN_INK} opacity={i ? 0.12 : 0.2} mask={`url(#sg-contour-${d})`} />
      ))}
      {/* a few sparkles on the water */}
      <g fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round">
        {[[G.at(103.7, 1.22), 0], [G.at(103.95, 1.225), 1.3], [G.at(104.0, 1.27), 2.4], [G.at(103.64, 1.255), 0.7]].map(([p, d]) => {
          const [x, y] = p as [number, number];
          return <path key={`${f(x)}${f(y)}`} d={`M${f(x - 16)},${f(y)} q8,-5 16,0 t16,0`} className="sg-glint" style={{ animationDelay: `${d}s` }} />;
        })}
      </g>

      {/* Johor across the strait, dimmed */}
      <path d={G.johor} fill={JOHOR_LAND} filter="url(#sg-lift)" />
      <path d={G.johor} fill="none" stroke={LAND_EDGE} strokeWidth={1.1} strokeOpacity={0.7} />
      <g textAnchor="middle" fill={SOFT_INK} opacity={0.72}>
        <text x={f(johor[0])} y={f(johor[1])} fontSize={18} fontWeight={600} letterSpacing="0.4em" style={{ fontFamily: 'var(--font-display)' }}>JOHOR · MALAYSIA</text>
      </g>

      {/* Singapore */}
      <path d={G.land} fill={LAND} fillRule="evenodd" filter="url(#sg-lift)" />
      <path d={G.land} fill="url(#sg-tile)" />
      <path d={G.land} fill="none" stroke="#fff6dc" strokeWidth={5} strokeLinejoin="round" opacity={0.7} />
      <path d={G.land} fill="none" stroke={LAND_EDGE} strokeWidth={1.4} strokeLinejoin="round" />
      <g clipPath="url(#sg-main)">
        {G.parks.map((d, i) => <path key={i} d={d} fill={GREEN} fillOpacity={0.75} stroke="#8fbf79" strokeWidth={1} strokeOpacity={0.6} />)}
      </g>
      {/* Marina Bay and the reservoirs */}
      {G.water.map((w) => <path key={w.id} d={w.d} fill={WATER_FILL} stroke="#4aa6aa" strokeWidth={1.2} strokeOpacity={0.7} />)}

      {/* water names */}
      <g textAnchor="middle" fill={INK} opacity={0.78}>
        <text x={f(south[0])} y={f(south[1])} fontSize={19} fontWeight={600} letterSpacing="0.42em" style={{ fontFamily: 'var(--font-display)' }}>SINGAPORE STRAIT</text>
        <text x={f(strait[0])} y={f(strait[1])} fontSize={12} fontWeight={600} letterSpacing="0.34em" style={{ fontFamily: 'var(--font-display)' }}>JOHOR STRAIT</text>
      </g>

      <Compass x={cx} y={cy} />
    </svg>
  );
});

/** A compass rose in a tile-edged roundel, with the island's nickname. */
function Compass({ x, y }: { x: number; y: number }) {
  const star = (r: number, a: number) => `${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}`;
  const points = [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2 - Math.PI / 2;
    return `M${star(50, a)} L${star(9, a - 0.62)} L0,0 L${star(9, a + 0.62)}Z`;
  }).join('');
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={74} fill="#ffffff" fillOpacity={0.5} stroke={INK} strokeOpacity={0.3} strokeWidth={1.2} />
      <circle r={66} fill="none" stroke="#c2268a" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2 5" strokeLinecap="round" />
      <path d={points} fill="#ffffff" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      <path d={`M0,0 L${star(50, -Math.PI / 2)} L${star(9, -Math.PI / 2 + 0.62)}Z M0,0 L${star(50, Math.PI)} L${star(9, Math.PI + 0.62)}Z`} fill="#c2268a" stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      <circle r={4.5} fill="#f2b632" stroke={INK} strokeWidth={1} />
      <text y={-56} textAnchor="middle" fontSize={15} fontWeight={700} fill={INK} style={{ fontFamily: 'var(--font-display)' }}>N</text>
    </g>
  );
}
