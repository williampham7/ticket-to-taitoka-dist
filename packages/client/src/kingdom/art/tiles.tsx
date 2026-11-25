import { memo } from 'react';
import { E, N, S, W, type Tile } from '@boboland/shared/src/kingdom';
import { INK } from './Defs';
import { TreasureGlyph } from './treasures';
import { HERO_COLOR, HERO_DEEP } from '../text';

/**
 * A maze tile drawn from its opening mask (viewBox 0..100), so the art always matches the rules.
 * Paths: one cobbled band, the same width and offset on every edge (36..64), extended past the edge so its
 * outline never draws a seam: neighbouring paths join. Hedges: a lighter top over a darker front face, outlines
 * drawn first under all the fills so overlapping pieces merge into one hedge with clean corners.
 */
type R = [number, number, number, number];
const HEDGE = 12, FRONT = 4, P0 = 36, P1 = 64;

function hedgeTops(m: number): R[] {
  const out: R[] = [];
  const band = (closed: boolean, full: R, a: R, b: R) => { if (closed) out.push(full); else out.push(a, b); };
  band(!(m & N), [2, 2, 96, HEDGE], [2, 2, 26, HEDGE], [72, 2, 26, HEDGE]);
  band(!(m & S), [2, 98 - HEDGE - FRONT, 96, HEDGE], [2, 98 - HEDGE - FRONT, 26, HEDGE], [72, 98 - HEDGE - FRONT, 26, HEDGE]);
  band(!(m & W), [2, 2, HEDGE, 98 - FRONT - 2], [2, 2, HEDGE, 26], [2, 68, HEDGE, 98 - FRONT - 68]);
  band(!(m & E), [98 - HEDGE, 2, HEDGE, 98 - FRONT - 2], [98 - HEDGE, 2, HEDGE, 26], [98 - HEDGE, 68, HEDGE, 98 - FRONT - 68]);
  return out;
}
function pathRects(m: number): R[] {
  const w = P1 - P0;
  const out: R[] = [[P0, P0, w, w]];
  if (m & N) out.push([P0, -8, w, P1 + 8]);
  if (m & S) out.push([P0, P0, w, 108 - P0]);
  if (m & W) out.push([-8, P0, P1 + 8, w]);
  if (m & E) out.push([P0, P0, 108 - P0, w]);
  return out;
}
/** Grass spots that are never on the path: the four corners, plus the middle of each closed side. */
function spots(m: number): [number, number][] {
  const s: [number, number][] = [[24, 27], [76, 27], [24, 74], [76, 74]];
  if (!(m & N)) s.push([50, 26]);
  if (!(m & S)) s.push([50, 75]);
  if (!(m & W)) s.push([24, 50]);
  if (!(m & E)) s.push([76, 50]);
  return s;
}
const rnd = (seed: number) => { let a = seed * 9301 + 49297; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; };

const DECOR = ['flower', 'flower', 'mushroom', 'pebbles', 'clover', 'flower', 'tuft', 'lantern', 'sign'] as const;
const FLOWER = ['#f7a8c0', '#fff3a8', '#b7c7ff', '#ffffff', '#ffb36b'];
function Decor({ kind, x, y, hue }: { kind: (typeof DECOR)[number]; x: number; y: number; hue: number }) {
  const sw = 0.9;
  switch (kind) {
    case 'flower': return (
      <g transform={`translate(${x},${y})`}>
        <path d="M0,4 Q-1,1 0,-1" stroke="#3f7d2e" strokeWidth="1" fill="none" />
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-3.4" rx="1.9" ry="2.6" fill={FLOWER[hue % FLOWER.length]} stroke={INK} strokeWidth=".5" transform={`rotate(${a}) translate(0,0)`} />)}
        <circle r="1.5" fill="#f4c542" stroke={INK} strokeWidth=".5" />
        <ellipse cx="-4.5" cy="4" rx="1.2" ry="2" fill="#5aa043" transform="rotate(-40 -4.5 4)" />
      </g>
    );
    case 'mushroom': return (
      <g transform={`translate(${x},${y})`}>
        <ellipse cy="4.6" rx="4" ry="1.1" fill="#2c4a18" opacity=".25" />
        <rect x="-1.5" y="-.5" width="3" height="5" rx="1.2" fill="#fbf1dc" stroke={INK} strokeWidth={sw} />
        <path d="M-5,0 Q-5,-6 0,-6 Q5,-6 5,0 Z" fill="#d8413c" stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        <circle cx="-2" cy="-3" r=".9" fill="#fff" /><circle cx="1.8" cy="-4" r=".7" fill="#fff" /><circle cx="2.6" cy="-1.6" r=".6" fill="#fff" />
      </g>
    );
    case 'pebbles': return (
      <g transform={`translate(${x},${y})`} stroke={INK} strokeWidth=".6">
        <ellipse cx="-2.5" cy="1" rx="2.6" ry="1.8" fill="#d9d4c3" /><ellipse cx="2" cy="2" rx="2" ry="1.4" fill="#bfb9a6" /><ellipse cx="1" cy="-1.6" rx="1.5" ry="1.1" fill="#e6e1d2" />
      </g>
    );
    case 'clover': return (
      <g transform={`translate(${x},${y})`}>
        {[0, 120, 240].map((a) => <circle key={a} cy="-2" r="2" fill="#4f9a3c" stroke="#2f5f23" strokeWidth=".5" transform={`rotate(${a})`} />)}
        <path d="M0,0 Q1,3 2,4.5" stroke="#2f5f23" strokeWidth=".8" fill="none" />
      </g>
    );
    case 'tuft': return (
      <g transform={`translate(${x},${y})`} className="kg-tuft" fill="none" stroke="#4c8f36" strokeWidth="1.1" strokeLinecap="round">
        <path d="M0,3 Q-1,-1 -3,-4 M0,3 Q0,-2 1,-5 M0,3 Q1,0 4,-3" />
      </g>
    );
    case 'lantern': return (
      <g transform={`translate(${x},${y})`}>
        <path d="M0,6 V-4" stroke={INK} strokeWidth="1.1" />
        <rect x="-2.4" y="-7.5" width="4.8" height="5" rx="1" fill="#ffe08a" stroke={INK} strokeWidth=".8" className="kg-lamp" />
        <path d="M-3,-7.5 H3 L0,-10 Z" fill="#6a4a2a" stroke={INK} strokeWidth=".6" />
      </g>
    );
    case 'sign': return (
      <g transform={`translate(${x},${y})`}>
        <path d="M0,6 V-5" stroke={INK} strokeWidth="1.2" />
        <path d="M-5,-6 H4 L6,-4 L4,-2 H-5 Z" fill="#c99760" stroke={INK} strokeWidth=".7" strokeLinejoin="round" />
        <path d="M-3.5,-4 H2" stroke={INK} strokeWidth=".5" />
      </g>
    );
  }
}

export interface TileProps { tile: Tile; fixed?: boolean; homeHero?: number | null; showTreasure?: boolean }

export const TileSvg = memo(function TileSvg({ tile, fixed, homeHero, showTreasure = true }: TileProps) {
  const m = tile.m;
  const tops = hedgeTops(m);
  const paths = pathRects(m);
  const r = rnd(tile.id + 7);
  const free = spots(m);
  // the home tent takes the closed corner; decorations take 2-3 of the other spots
  const tentAt = homeHero != null ? free.findIndex(([x, y]) => (x < 50) === !(m & W) && (y < 50) === !(m & N)) : -1;
  const decor = free.filter((_, i) => i !== tentAt).filter(() => r() < 0.55).slice(0, 3);
  const patches = [0, 1].map(() => [10 + r() * 80, 10 + r() * 80, 8 + r() * 10] as const);
  return (
    <svg viewBox="0 0 100 100" className="kg-tile-svg" aria-hidden>
      <rect width="100" height="100" fill="url(#kg-grass)" />
      {patches.map(([x, y, s], i) => <ellipse key={i} cx={x} cy={y} rx={s} ry={s * 0.7} fill="url(#kg-grass-patch)" />)}
      {/* path: outline under fill, so the arms merge into one road */}
      <g stroke={INK} strokeWidth="4.4" strokeLinejoin="round">{paths.map((p, i) => <rect key={i} x={p[0]} y={p[1]} width={p[2]} height={p[3]} rx="3" fill="none" />)}</g>
      <g>{paths.map((p, i) => <rect key={i} x={p[0]} y={p[1]} width={p[2]} height={p[3]} rx="3" fill="url(#kg-sand)" />)}</g>
      <g opacity=".85">{paths.map((p, i) => <rect key={i} x={p[0] + 1.5} y={p[1] + 1.5} width={p[2] - 3} height={p[3] - 3} rx="2" fill="url(#kg-cobble)" />)}</g>
      {decor.map(([x, y], i) => <Decor key={i} kind={DECOR[Math.floor(r() * DECOR.length)]} x={x + (r() - 0.5) * 4} y={y + (r() - 0.5) * 3} hue={Math.floor(r() * 5)} />)}
      {/* hedges: contact shadow, outlines, front faces, tops, leaves */}
      <g fill="#203a12" opacity=".22">{tops.map((h, i) => <rect key={i} x={h[0] + 1} y={h[1] + FRONT + 2} width={h[2]} height={h[3]} rx="6" />)}</g>
      <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinejoin="round">{tops.map((h, i) => <rect key={i} x={h[0]} y={h[1]} width={h[2]} height={h[3] + FRONT} rx="6" />)}</g>
      <g fill="url(#kg-hedge-front)">{tops.map((h, i) => <rect key={i} x={h[0]} y={h[1]} width={h[2]} height={h[3] + FRONT} rx="6" />)}</g>
      <g fill="url(#kg-hedge-top)">{tops.map((h, i) => <rect key={i} x={h[0]} y={h[1]} width={h[2]} height={h[3]} rx="6" />)}</g>
      <g fill="url(#kg-leaf)">{tops.map((h, i) => <rect key={i} x={h[0] + 1} y={h[1] + 1} width={h[2] - 2} height={h[3] - 3} rx="5" />)}</g>
      {fixed && <rect x="1.6" y="1.6" width="96.8" height="96.8" rx="5" fill="none" stroke="url(#kg-stone)" strokeWidth="3.2" strokeDasharray="9 2.2" className="kg-moss" />}
      {fixed && <g fill="#6f9b47" opacity=".8">{[[4, 30], [96, 62], [40, 96], [70, 4]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" />)}</g>}
      {tentAt >= 0 && homeHero != null && <Tent x={free[tentAt][0]} y={free[tentAt][1]} hero={homeHero} />}
      {tile.t && showTreasure && (
        <g>
          <ellipse cx="50" cy="58" rx="15" ry="5.5" fill="url(#kg-plinth)" stroke={INK} strokeWidth="1.2" />
          <svg x="31" y="25" width="38" height="38" viewBox="0 0 100 100" overflow="visible"><TreasureGlyph t={tile.t} /></svg>
        </g>
      )}
    </svg>
  );
});

/** A home corner's tent with a pennant in the hero's colour. */
export function Tent({ x, y, hero }: { x: number; y: number; hero: number }) {
  return (
    <g transform={`translate(${x},${y + 2})`}>
      <ellipse cy="7" rx="11" ry="2.6" fill="#203a12" opacity=".25" />
      <path d="M-10,7 L0,-9 L10,7 Z" fill={HERO_COLOR[hero]} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M-10,7 L0,-9 L-4,7 Z" fill={HERO_DEEP[hero]} opacity=".55" />
      <path d="M-2,7 L0,1 L2,7 Z" fill="#3a2414" />
      <path d="M0,-9 V-17" stroke={INK} strokeWidth="1" />
      <path d="M0,-17 L7,-15 L0,-13 Z" fill="#fff4d2" stroke={INK} strokeWidth=".7" className="kg-pennant" />
    </g>
  );
}
