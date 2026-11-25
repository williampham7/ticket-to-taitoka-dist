import { memo } from 'react';
import { LAND_PATHS, MAP_H, MAP_W, SEA_PATHS, project } from '@boboland/shared/src/warfront';
import { DESERTS, FORESTS, RANGES, RIVERS, SEA_LABELS } from './mapArt';

/** The war map's static cartography. `Terrain` sits under the faction acetate, `TerrainTop` above it (rivers, ranges). */
type P = [number, number];
const pts = (a: number[]): P[] => { const o: P[] = []; for (let i = 0; i < a.length; i += 2) o.push(project(a[i], a[i + 1])); return o; };
const f1 = (n: number) => n.toFixed(1);

/** Catmull-Rom through the points, as cubic Béziers. */
function smooth(p: P[]): string {
  let d = `M${f1(p[0][0])},${f1(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
    d += `C${f1(b[0] + (c[0] - a[0]) / 6)},${f1(b[1] + (c[1] - a[1]) / 6)} ${f1(c[0] - (e[0] - b[0]) / 6)},${f1(c[1] - (e[1] - b[1]) / 6)} ${f1(c[0])},${f1(c[1])}`;
  }
  return d;
}
/** Points every `step` units along a polyline. */
function along(p: P[], step: number): { x: number; y: number; nx: number; ny: number }[] {
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  let carry = step / 2;
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, ay] = p[i], [bx, by] = p[i + 1], L = Math.hypot(bx - ax, by - ay);
    for (let s = carry; s < L; s += step) { const t = s / L; out.push({ x: ax + t * (bx - ax), y: ay + t * (by - ay), nx: -(by - ay) / L, ny: (bx - ax) / L }); }
    carry = (carry - L) % step; if (carry < 0) carry += step;
  }
  return out;
}
const ellipse = ([lon, lat, rl, rt]: number[]) => {
  const [x, y] = project(lon, lat), [x2] = project(lon + rl, lat), [, y2] = project(lon, lat + rt), [, y3] = project(lon, lat - rt);
  return { cx: x, cy: y, rx: x2 - x, ry: (y3 - y2) / 2 };
};

const RIVER_D = RIVERS.map((r) => smooth(pts(r)));
const RANGE_D = (() => {
  let ridge = '', shade = '';
  RANGES.forEach((r, ri) => along(pts(r), 6.2).forEach(({ x, y, nx, ny }, i) => {
    const o = (i % 2 ? 2.6 : -2.2) * (ri % 2 ? 1 : -1), cx = x + nx * o, cy = y + ny * o, h = i % 3 === 1 ? 3.6 : 2.8, w = h * 1.15;
    ridge += `M${f1(cx - w)},${f1(cy + h * 0.55)}L${f1(cx)},${f1(cy - h)}L${f1(cx + w)},${f1(cy + h * 0.55)}`;
    shade += `M${f1(cx)},${f1(cy - h)}L${f1(cx + w)},${f1(cy + h * 0.55)}L${f1(cx)},${f1(cy + h * 0.55)}Z`;
  }));
  return { ridge, shade };
})();
const LAT_LINES = [60, 30, 0, -30];
const LON_LINES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180];
const RIM = 11;
const COLS = 'ABCDEFGHJKLMNOPQ';

export const Terrain = memo(function Terrain() {
  const [cx, cy] = project(-20, -47);
  const [kx, ky] = project(-127, -44);
  const [, eqY] = project(0, 0);
  const kmPerUnit = 40075 / MAP_W; // at the equator
  const bar = 2000 / kmPerUnit;
  return (
    <g className="wf-terrain" pointerEvents="none">
      <defs>
        <linearGradient id="wf-t-ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b6f80" /><stop offset=".45" stopColor="#1f6478" /><stop offset="1" stopColor="#163f52" />
        </linearGradient>
        <radialGradient id="wf-t-deep" cx=".5" cy=".55" r=".7"><stop offset=".55" stopColor="#0b2633" stopOpacity="0" /><stop offset="1" stopColor="#0b2633" stopOpacity=".45" /></radialGradient>
        <pattern id="wf-t-waves" width="26" height="14" patternUnits="userSpaceOnUse">
          <path d="M1,9 q3,-3 6,0 t6,0 M14,3 q3,-3 6,0" fill="none" stroke="#d9f2ee" strokeWidth=".55" strokeOpacity=".16" />
        </pattern>
        <linearGradient id="wf-t-land" x1="0" y1="0" x2="0" y2={MAP_H} gradientUnits="userSpaceOnUse">
          {[[0, '#eef1ec'], [0.09, '#d5dacb'], [0.17, '#a9b98c'], [0.28, '#88a56b'], [0.39, '#a6ab72'], [0.46, '#d6c08a'], [0.52, '#d2b983'],
            [0.57, '#9bb06a'], [0.65, '#7c9f5f'], [0.75, '#b4a774'], [0.84, '#a2ab7c'], [1, '#d6dacb']].map(([o, c]) => <stop key={o} offset={o} stopColor={c as string} />)}
        </linearGradient>
        <linearGradient id="wf-t-cold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".85" /><stop offset=".12" stopColor="#f2f5f2" stopOpacity=".55" /><stop offset=".24" stopColor="#e9efe6" stopOpacity="0" />
          <stop offset=".93" stopColor="#eef1ee" stopOpacity="0" /><stop offset="1" stopColor="#f6f8f6" stopOpacity=".6" />
        </linearGradient>
        <radialGradient id="wf-t-sand"><stop offset="0" stopColor="#e6c98b" stopOpacity=".85" /><stop offset=".6" stopColor="#dcc08a" stopOpacity=".5" /><stop offset="1" stopColor="#dcc08a" stopOpacity="0" /></radialGradient>
        <radialGradient id="wf-t-green"><stop offset="0" stopColor="#3f7a3e" stopOpacity=".5" /><stop offset=".6" stopColor="#4d8445" stopOpacity=".25" /><stop offset="1" stopColor="#4d8445" stopOpacity="0" /></radialGradient>
        <pattern id="wf-t-stipple" width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r=".55" fill="#8a6a35" fillOpacity=".55" /><circle cx="5" cy="4.6" r=".45" fill="#8a6a35" fillOpacity=".45" />
        </pattern>
        <radialGradient id="wf-t-stipmask-g"><stop offset="0" stopColor="#fff" /><stop offset=".7" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <mask id="wf-t-stipmask" maskUnits="userSpaceOnUse" x="0" y="0" width={MAP_W} height={MAP_H}>
          {DESERTS.map((d, i) => <ellipse key={i} {...ellipse(d)} fill="url(#wf-t-stipmask-g)" />)}
        </mask>
        <clipPath id="wf-t-landclip">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</clipPath>
        <filter id="wf-t-relief" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="11" result="n" />
          <feDiffuseLighting in="n" surfaceScale="3" lightingColor="#fff6e2" result="l"><feDistantLight azimuth="225" elevation="50" /></feDiffuseLighting>
          <feComposite in="l" in2="SourceGraphic" operator="in" result="lc" />
          <feBlend in="SourceGraphic" in2="lc" mode="multiply" />
        </filter>
        <linearGradient id="wf-t-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6dc93" /><stop offset=".5" stopColor="#c99a3c" /><stop offset="1" stopColor="#7d5a1c" /></linearGradient>
      </defs>

      {/* ocean */}
      <rect width={MAP_W} height={MAP_H} fill="url(#wf-t-ocean)" />
      <rect width={MAP_W} height={MAP_H} fill="url(#wf-t-waves)" />
      <rect width={MAP_W} height={MAP_H} fill="url(#wf-t-deep)" />
      {/* graticule */}
      <g stroke="#a9dcd6" fill="none" opacity=".38">
        {LON_LINES.map((l) => { const [x] = project(l, 0); return <line key={l} x1={x} x2={x} y1={0} y2={MAP_H} strokeWidth=".6" strokeDasharray="2 6" />; })}
        {LAT_LINES.map((l) => { const [, y] = project(0, l); return <line key={l} x1={0} x2={MAP_W} y1={y} y2={y} strokeWidth={l === 0 ? 1 : 0.6} strokeDasharray={l === 0 ? '12 5' : '2 6'} />; })}
      </g>
      <text x={MAP_W - 18} y={eqY - 4} textAnchor="end" fill="#cdeae4" fillOpacity=".55" style={{ font: 'italic 600 7px Manrope, sans-serif', letterSpacing: '.3em' }}>EQUATOR</text>
      {/* continental shelf and bathymetry */}
      <g fill="none" strokeLinejoin="round">
        {([[34, '#5fb0b0', 0.06], [22, '#6fbcb8', 0.09], [13, '#83c8c0', 0.14], [6, '#a2d8cc', 0.22]] as const).map(([w, c, o]) => (
          <g key={w} stroke={c} strokeWidth={w} opacity={o}>{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
        ))}
        <g stroke="#cfeee6" strokeWidth="26" opacity=".14" strokeDasharray="1 5" strokeLinecap="round">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
        <g stroke="#f3ead0" strokeWidth="2.4" opacity=".7">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>
      </g>

      {/* land: latitude colours, relief, climate */}
      <g clipPath="url(#wf-t-landclip)">
        <g filter="url(#wf-t-relief)"><rect width={MAP_W} height={MAP_H} fill="url(#wf-t-land)" /></g>
        {FORESTS.map((d, i) => <ellipse key={`f${i}`} {...ellipse(d)} fill="url(#wf-t-green)" />)}
        {DESERTS.map((d, i) => <ellipse key={`d${i}`} {...ellipse(d)} fill="url(#wf-t-sand)" />)}
        <rect width={MAP_W} height={MAP_H} fill="url(#wf-t-stipple)" mask="url(#wf-t-stipmask)" />
        <rect width={MAP_W} height={MAP_H} fill="url(#wf-t-cold)" />
      </g>
      <g fill="none" stroke="#2f4b4f" strokeWidth=".9" opacity=".85" strokeLinejoin="round">{LAND_PATHS.map((d, i) => <path key={i} d={d} />)}</g>

      {/* sea names */}
      <g fill="#d7efe9" textAnchor="middle">
        {SEA_LABELS.map(([t, lon, lat, size]) => {
          const [x, y] = project(lon, lat), big = t === t.toUpperCase();
          return <text key={`${t}${lon}`} x={x} y={y} fillOpacity={big ? 0.5 : 0.62} style={{ font: `italic ${big ? 600 : 500} ${size}px Manrope, sans-serif`, letterSpacing: big ? '.42em' : '.12em' }}>{t}</text>;
        })}
      </g>

      {/* compass rose */}
      <g transform={`translate(${f1(cx)},${f1(cy)})`} opacity=".9">
        <circle r="40" fill="#0f3443" fillOpacity=".25" stroke="#e9dcb5" strokeWidth=".8" strokeDasharray="1.5 3" />
        <circle r="31" fill="none" stroke="#e9dcb5" strokeWidth="1" />
        <circle r="28" fill="none" stroke="#e9dcb5" strokeWidth=".5" />
        {Array.from({ length: 32 }, (_, i) => <line key={i} y1="-31" y2={i % 4 ? -29 : -26} stroke="#e9dcb5" strokeWidth=".7" transform={`rotate(${i * 11.25})`} />)}
        {[45, 135, 225, 315].map((r) => <path key={r} d="M0,-22 L3.2,0 L0,3 L-3.2,0Z" fill="#e9dcb5" fillOpacity=".75" transform={`rotate(${r})`} />)}
        {[0, 90, 180, 270].map((r) => (
          <g key={r} transform={`rotate(${r})`}>
            <path d="M0,-44 L6,0 L0,0Z" fill="url(#wf-t-brass)" stroke="#5a3e12" strokeWidth=".5" />
            <path d="M0,-44 L-6,0 L0,0Z" fill="#7d5a1c" stroke="#5a3e12" strokeWidth=".5" />
          </g>
        ))}
        <circle r="3.4" fill="url(#wf-t-brass)" stroke="#5a3e12" strokeWidth=".6" />
        <text y="-49" textAnchor="middle" fill="#f3e6bf" style={{ font: '800 12px Sora, sans-serif' }}>N</text>
      </g>

      {/* cartouche and scale bar */}
      <g transform={`translate(${f1(kx)},${f1(ky)})`}>
        <rect x="-96" y="-30" width="192" height="76" rx="3" fill="#f3e9cc" fillOpacity=".93" stroke="#5a3e12" strokeWidth="1.2" />
        <rect x="-91" y="-25" width="182" height="66" rx="2" fill="none" stroke="#8f6a24" strokeWidth=".6" />
        {[[-91, -25], [91, -25], [-91, 41], [91, 41]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.4" fill="url(#wf-t-brass)" stroke="#5a3e12" strokeWidth=".4" />)}
        <text y="-11" textAnchor="middle" fill="#2b2116" style={{ font: '400 13px "Saira Stencil One", sans-serif', letterSpacing: '.22em' }}>THEATRE OF WAR</text>
        <text y="1" textAnchor="middle" fill="#5b4a33" style={{ font: '700 6.2px Manrope, sans-serif', letterSpacing: '.3em' }}>OPERATIONS MAP · SHEET 1 · MILLER PROJ.</text>
        <g transform={`translate(${f1(-bar / 2)},16)`}>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={(i * bar) / 4} y="0" width={bar / 4} height="4" fill={i % 2 ? '#f3e9cc' : '#2b2116'} stroke="#2b2116" strokeWidth=".5" />)}
          {[0, 1000, 2000].map((k, i) => <text key={k} x={(i * bar) / 2} y="13" textAnchor="middle" fill="#2b2116" style={{ font: '700 5.6px Manrope, sans-serif' }}>{k}</text>)}
          <text x={bar + 6} y="5" fill="#2b2116" style={{ font: '700 5.6px Manrope, sans-serif' }}>KM</text>
        </g>
        <text y="38" textAnchor="middle" fill="#8a2a22" style={{ font: '400 6.5px "Saira Stencil One", sans-serif', letterSpacing: '.4em' }}>CLASSIFIED</text>
      </g>

      {/* military grid rim */}
      <g>
        <path d={`M0,0H${MAP_W}V${MAP_H}H0Z M${RIM},${RIM}V${MAP_H - RIM}H${MAP_W - RIM}V${RIM}Z`} fill="#0c2430" fillOpacity=".5" fillRule="evenodd" />
        <rect x={RIM} y={RIM} width={MAP_W - 2 * RIM} height={MAP_H - 2 * RIM} fill="none" stroke="#e9dcb5" strokeOpacity=".5" strokeWidth=".8" />
        <g fill="#efe2bd" fillOpacity=".75" textAnchor="middle" style={{ font: '800 6.6px Sora, sans-serif' }}>
          {Array.from({ length: 16 }, (_, i) => {
            const x = (i + 0.5) * (MAP_W / 16);
            return <g key={i}><text x={x} y={RIM - 3}>{COLS[i]}</text><text x={x} y={MAP_H - 3}>{COLS[i]}</text>
              {i > 0 && <><line x1={i * (MAP_W / 16)} x2={i * (MAP_W / 16)} y1={0} y2={RIM} stroke="#efe2bd" strokeOpacity=".5" strokeWidth=".6" /><line x1={i * (MAP_W / 16)} x2={i * (MAP_W / 16)} y1={MAP_H - RIM} y2={MAP_H} stroke="#efe2bd" strokeOpacity=".5" strokeWidth=".6" /></>}</g>;
          })}
          {Array.from({ length: 8 }, (_, i) => {
            const y = (i + 0.5) * (MAP_H / 8) + 2.4;
            return <g key={i}><text x={RIM / 2} y={y}>{i + 1}</text><text x={MAP_W - RIM / 2} y={y}>{i + 1}</text>
              {i > 0 && <><line y1={i * (MAP_H / 8)} y2={i * (MAP_H / 8)} x1={0} x2={RIM} stroke="#efe2bd" strokeOpacity=".5" strokeWidth=".6" /><line y1={i * (MAP_H / 8)} y2={i * (MAP_H / 8)} x1={MAP_W - RIM} x2={MAP_W} stroke="#efe2bd" strokeOpacity=".5" strokeWidth=".6" /></>}</g>;
          })}
        </g>
      </g>
    </g>
  );
});

/** Rivers and mountain ranges: drawn over the acetate so they read through every faction colour. */
export const TerrainTop = memo(function TerrainTop() {
  return (
    <g className="wf-terrain-top" pointerEvents="none">
      {/* inland seas stay water above the acetate */}
      {SEA_PATHS.map((d, i) => <path key={i} d={d} fill="#246d82" stroke="#f3ead0" strokeOpacity=".6" strokeWidth="1.2" />)}
      <g fill="none" clipPath="url(#wf-t-landclip)" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#f3ead0" strokeOpacity=".45" strokeWidth="2.6">{RIVER_D.map((d, i) => <path key={i} d={d} />)}</g>
        <g stroke="#2f7891" strokeOpacity=".85" strokeWidth="1.15">{RIVER_D.map((d, i) => <path key={i} d={d} />)}</g>
      </g>
      <g clipPath="url(#wf-t-landclip)">
      <path d={RANGE_D.shade} fill="#3d2c18" fillOpacity=".3" />
      <path d={RANGE_D.ridge} fill="none" stroke="#3d2c18" strokeOpacity=".6" strokeWidth=".75" strokeLinejoin="round" />
      </g>
    </g>
  );
});
