import { ROUTE_POINTS } from '@boboland/shared';
import { INK, OCEAN_INK, SOFT_INK, ACCENT, ROUTE_FILL } from '../theme';

/** Poster-style map ornaments shared by the vintage (USA) geography layer. */
const f = (n: number) => n.toFixed(1);

export function Compass({ cx, cy }: { cx: number; cy: number }) {
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const L = i % 4 === 0 ? 62 : i % 2 === 0 ? 40 : 26, w = i % 4 === 0 ? 9 : 6;
    const tip = `${f(cx + Math.cos(a) * L)},${f(cy + Math.sin(a) * L)}`;
    const l = `${f(cx + Math.cos(a - Math.PI / 2) * w)},${f(cy + Math.sin(a - Math.PI / 2) * w)}`;
    const r = `${f(cx + Math.cos(a + Math.PI / 2) * w)},${f(cy + Math.sin(a + Math.PI / 2) * w)}`;
    const major = i % 4 === 0;
    return (
      <g key={i}>
        <path d={`M${cx},${cy}L${l}L${tip}Z`} fill={major ? INK : '#f3e8cf'} stroke={INK} strokeWidth={1} />
        <path d={`M${cx},${cy}L${r}L${tip}Z`} fill={major ? '#f3e8cf' : SOFT_INK} stroke={INK} strokeWidth={1} />
      </g>
    );
  });
  return (
    <g opacity={0.8}>
      <circle cx={cx} cy={cy} r={48} fill="none" stroke={INK} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={44} fill="none" stroke={INK} strokeWidth={0.8} strokeDasharray="2 3" />
      {points}
      <circle cx={cx} cy={cy} r={5} fill={ACCENT} stroke={INK} />
      <text x={cx} y={cy - 70} textAnchor="middle" fontFamily="Alfa Slab One" fontSize={18} fill={INK}>N</text>
    </g>
  );
}

export function PointsCartouche({ x, y }: { x: number; y: number }) {
  const w = 220, h = 230;
  return (
    <g transform={`translate(${x},${y})`}>
      <rect width={w} height={h} fill="#f3e8cf" stroke={INK} strokeWidth={2.5} />
      <rect x={6} y={6} width={w - 12} height={h - 12} fill="none" stroke={INK} strokeWidth={1} />
      <text x={w / 2} y={36} textAnchor="middle" fontFamily="Alfa Slab One" fontSize={17} letterSpacing="0.04em" fill={ACCENT}>Route points</text>
      <path d={`M28,46H${w - 28}`} stroke={INK} strokeWidth={1} />
      {[1, 2, 3, 4, 5, 6].map((n, i) => (
        <g key={n} transform={`translate(0,${72 + i * 26})`}>
          {Array.from({ length: n }, (_, c) => (
            <rect key={c} x={22 + c * 19} y={-10} width={16} height={9} rx={1.5} fill={ROUTE_FILL.gray} stroke={INK} strokeWidth={1} />
          ))}
          <text x={w - 24} y={0} textAnchor="end" fontFamily="Oswald" fontWeight={600} fontSize={16} fill={INK}>{ROUTE_POINTS[n]}</text>
        </g>
      ))}
    </g>
  );
}

export function Ship({ x, y, flip = 1 }: { x: number; y: number; flip?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${flip},1)`} opacity={0.55} fill="none" stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
      <path d="M-22,4 L22,4 L16,12 L-16,12Z" fill={SOFT_INK} fillOpacity={0.35} />
      <path d="M-4,4 V-22 M-4,-20 L12,-6 L-4,-6 M-4,-18 L-18,-2 L-4,-2" />
      <path d="M-30,16 q6,-4 12,0 t12,0 t12,0 t12,0 t12,0" stroke={OCEAN_INK} />
    </g>
  );
}

