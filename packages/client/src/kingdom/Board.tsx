import { memo, type CSSProperties } from 'react';
import { CELLS, INSERTS, HOMES, isFixed, lineCells, opposite, pathTo, rc, rotMask, type KView, type Tile, type TreasureId } from '@boboland/shared/src/kingdom';
import { TileSvg } from './art/tiles';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { INSET, STAGE, project, projectXY, trayTransform } from './project';
import { HERO_COLOR, heroOf, heroName } from './text';
import type { Anim } from './useKingdomFx';
import { BoardFx, heroPose, useAnimClock } from './BoardFx';

/**
 * The diorama: a tilted tray (frame, grid of tiles, banners) and a flat overlay above it for everything upright
 * (heroes, footprints, sparkles), positioned by `project()` with the tray's own tilt numbers.
 */
export interface BoardProps {
  d: KView; T: number; tilt: boolean; me: string | null;
  mode: 'shift' | 'move' | 'idle';
  rot: number; aim: number | null; onAim: (at: number | null) => void; onShift: (at: number) => void;
  reach: Map<number, number> | null; hover: number | null; onHover: (i: number | null) => void; onMove: (i: number) => void;
  pulse: number | null; anim: Anim | null; focus?: string | null;
}

const SIDE_NAME = { N: 'the top', E: 'the right', S: 'the bottom', W: 'the left' };
/** Banner pole position on the stage, in tiles from its top-left. */
export function bannerAt(at: number): { x: number; y: number; side: 'N' | 'E' | 'S' | 'W' } {
  const { side, line } = INSERTS[at];
  const mid = INSET + line + 0.5;
  if (side === 'N') return { x: mid, y: INSET - 0.52, side };
  if (side === 'S') return { x: mid, y: INSET + 7.52, side };
  if (side === 'W') return { x: INSET - 0.52, y: mid, side };
  return { x: INSET + 7.52, y: mid, side };
}

export function Board(p: BoardProps) {
  const { d, T, tilt, me, mode, aim, anim } = p;
  const found = new Set<TreasureId>(Object.values(d.found).flat());
  const homeHero = new Map<number, number>(d.order.filter((q) => !d.out.includes(q)).map((q) => [d.home[q], heroOf(d, q)]));
  const blocked = d.lastAt === null ? -1 : opposite(d.lastAt);
  const line = aim !== null ? lineCells(aim) : null;
  // my goal squares (my target treasure(s), or home once my stack is empty), marked for tests and hints
  const goals = new Set<number>(me && d.pos[me] !== undefined ? (d.left[me] === 0 ? [d.home[me]] : d.board.flatMap((t, i) => (t.t && d.targets[me]?.includes(t.t) ? [i] : []))) : []);
  const myPos = me && d.pos[me] !== undefined ? d.pos[me] : null;
  const trail = mode === 'move' && p.hover !== null && myPos !== null && p.reach?.has(p.hover) ? pathTo(d.board, myPos, p.hover) : null;
  const size = STAGE * T;
  const style = { width: size, height: size, ['--T' as string]: `${T}px` } as CSSProperties;
  return (
    <div className={`kg-stage${tilt ? ' kg-tilted' : ' kg-flat'}`} style={style} data-testid="kg-board">
      <div className="kg-tray" style={{ transform: trayTransform(T, tilt) }}>
        <div className="kg-plinth" aria-hidden />
        <div className="kg-frame" aria-hidden>
          {[0, 1, 2, 3].map((k) => <span key={k} className={`kg-brass kg-brass-${k}`} />)}
          {[0, 1, 2, 3].map((k) => <span key={k} className={`kg-lantern kg-lantern-${k}`} />)}
        </div>
        <Grid {...p} found={found} homeHero={homeHero} line={line} trail={trail} goals={goals} />
        {line && aim !== null && mode === 'shift' && <AimGhost at={aim} T={T} tile={{ ...d.spare, m: rotMask(d.spare.m, p.rot) }} />}
        {INSERTS.map((ins, at) => {
          const b = bannerAt(at);
          const isBlocked = at === blocked;
          const active = mode === 'shift' && !isBlocked;
          return (
            <button key={at} type="button" className={`kg-banner kg-banner-${b.side}${isBlocked ? ' kg-furled' : ''}${aim === at ? ' kg-aimed' : ''}${p.focus === `b${at}` ? ' kg-focus' : ''}`}
              style={{ left: b.x * T, top: b.y * T }} disabled={!active} data-testid={`kg-banner-${at}`} data-at={at}
              aria-label={isBlocked ? 'Blocked: this would undo the last push' : `Push the spare tile in from ${SIDE_NAME[ins.side]}, ${ins.side === 'N' || ins.side === 'S' ? 'column' : 'row'} ${ins.line + 1}`}
              onPointerEnter={(e) => { if (active && e.pointerType === 'mouse') p.onAim(at); }}
              onPointerLeave={(e) => { if (e.pointerType === 'mouse' && aim === at) p.onAim(null); }}
              onFocus={() => active && p.onAim(at)}
              onClick={(e) => {
                if (!active) return;
                // touch: the first tap previews, the second commits; a mouse click commits at once
                const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch';
                if (touch && aim !== at) { p.onAim(at); return; }
                p.onShift(at);
              }}>
              <BannerArt side={b.side} blocked={isBlocked} />
            </button>
          );
        })}
      </div>
      <Overlay {...p} trail={trail} line={line} />
    </div>
  );
}

const Grid = memo(function Grid({ d, T, mode, reach, onHover, onMove, pulse, anim, found, homeHero, line, focus, aim, goals }: BoardProps & { found: Set<TreasureId>; homeHero: Map<number, number>; line: number[] | null; trail: number[] | null; goals: Set<number> }) {
  const shiftAnim = anim?.e.k === 'shift' ? anim : null;
  const sliding = shiftAnim ? lineCells(shiftAnim.e.k === 'shift' ? shiftAnim.e.at : 0) : null;
  const dir = aim !== null ? INSERTS[aim].side : null;
  const gx = (dir === 'W' ? 1 : dir === 'E' ? -1 : 0) * 0.5, gy = (dir === 'N' ? 1 : dir === 'S' ? -1 : 0) * 0.5;
  return (
    <div className="kg-grid" style={{ left: INSET * T, top: INSET * T, width: 7 * T, height: 7 * T }}>
      {Array.from({ length: CELLS }, (_, i) => {
        const [r, c] = rc(i);
        const tile = d.board[i];
        const dist = reach?.get(i);
        const can = mode === 'move' && dist !== undefined;
        const k = line ? line.indexOf(i) : -1;
        const slideK = sliding ? sliding.indexOf(i) : -1;
        const cls = `kg-cell${slideK === 0 ? ' kg-incoming' : ''}${isFixed(i) ? ' kg-fixed' : ''}${can ? ' kg-reach' : ''}${k >= 0 ? ' kg-inline' : ''}${k === 6 ? ' kg-outgoing' : ''}${pulse === i ? ' kg-pulse' : ''}${focus === `c${i}` ? ' kg-focus' : ''}${slideK >= 0 ? ' kg-sliding' : ''}`;
        const style = {
          left: c * T, top: r * T, width: T, height: T, ['--d' as string]: dist ?? 0,
          ...(k >= 0 && k < 6 ? { transform: `translate(${gx * T}px, ${gy * T}px)` } : {}),
          ...(slideK >= 0 && shiftAnim ? slideStyle(shiftAnim, T) : {}),
        } as CSSProperties;
        return (
          <div key={tile.id} className={cls} style={style} data-testid={`kg-cell-${i}`} data-cell={i} data-t={tile.t} data-goal={goals.has(i) ? '1' : undefined}
            role={can ? 'button' : undefined} tabIndex={can ? 0 : undefined} aria-label={can ? `Walk to row ${r + 1}, column ${c + 1}` : undefined}
            onPointerEnter={() => can && onHover(i)} onPointerLeave={() => can && onHover(null)}
            onClick={() => can && onMove(i)} onKeyDown={(e) => { if (can && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onMove(i); } }}>
            <TileView tile={tile} fixed={isFixed(i)} homeHero={HOMES.includes(i) ? homeHero.get(i) ?? null : null} showTreasure={!tile.t || !found.has(tile.t)} />
            {can && <span className="kg-glow" aria-hidden />}
          </div>
        );
      })}
      {shiftAnim && shiftAnim.e.k === 'shift' && sliding && <Leaving a={shiftAnim} T={T} cellAt={sliding[6]} />}
    </div>
  );
});

/** The tile pushed out slides off the far edge (inside the tray), then the overlay arcs it to the pedestal. */
function Leaving({ a, T, cellAt }: { a: Anim; T: number; cellAt: number }) {
  const [r, c] = rc(cellAt);
  const tile = a.before.board[cellAt];
  return (
    <div className="kg-cell kg-leaving" style={{ left: c * T, top: r * T, width: T, height: T, ...slideStyle(a, T), ['--fade-at' as string]: `${Math.round(a.dur * 0.82)}ms` } as CSSProperties}>
      <TileSvg tile={tile} fixed={false} />
    </div>
  );
}

/** Aiming: a translucent ghost of the spare, half pushed in at the banner. */
function AimGhost({ at, T, tile }: { at: number; T: number; tile: Tile }) {
  const line = lineCells(at);
  const [r, c] = rc(line[0]);
  const side = INSERTS[at].side;
  const dx = side === 'W' ? -0.5 : side === 'E' ? 0.5 : 0, dy = side === 'N' ? -0.5 : side === 'S' ? 0.5 : 0;
  return (
    <div className="kg-aimghost" style={{ left: (INSET + c + dx) * T, top: (INSET + r + dy) * T, width: T, height: T }} aria-hidden>
      <TileSvg tile={tile} />
    </div>
  );
}

/** During a shift the tiles of the line start one square back (toward the insertion end) and slide in. */
function slideStyle(a: Anim, T: number): CSSProperties {
  if (a.e.k !== 'shift') return {};
  const side = INSERTS[a.e.at].side;
  const dx = side === 'W' ? -1 : side === 'E' ? 1 : 0, dy = side === 'N' ? -1 : side === 'S' ? 1 : 0;
  return { ['--sx' as string]: `${dx * T}px`, ['--sy' as string]: `${dy * T}px`, ['--slide-delay' as string]: `${Math.round(a.dur * 0.3)}ms`, ['--slide-dur' as string]: `${Math.round(a.dur * 0.55)}ms` };
}

const TileView = memo(function TileView(p: { tile: Tile; fixed: boolean; homeHero: number | null; showTreasure: boolean }) {
  return <TileSvg tile={p.tile} fixed={p.fixed} homeHero={p.homeHero} showTreasure={p.showTreasure} />;
});

function BannerArt({ side, blocked }: { side: string; blocked: boolean }) {
  return (
    <svg viewBox="0 0 40 60" className="kg-banner-svg" aria-hidden data-side={side}>
      <path d="M8,58 V4" stroke="#5a3a20" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="8" cy="4" r="3" fill="url(#kg-brass)" stroke="#4a3020" strokeWidth="1" />
      {blocked ? (
        <g>
          <path d="M9,9 Q14,11 9,14 Q14,16 9,19 Q14,21 9,24" fill="#b9a98c" stroke="#4a3020" strokeWidth="1.2" />
          <rect x="13" y="26" width="13" height="11" rx="2" fill="url(#kg-brass)" stroke="#4a3020" strokeWidth="1.2" />
          <path d="M15.5,26 V22.5 A4,4 0 0 1 23.5,22.5 V26" fill="none" stroke="#4a3020" strokeWidth="1.8" />
        </g>
      ) : (
        <g className="kg-cloth">
          <path d="M9,8 H34 Q31,16 34,24 L28,22 L22,28 L16,22 L9,24 Z" fill="url(#kg-rose)" stroke="#4a3020" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M14,14 L19,16 L14,18" fill="none" stroke="#fff4d6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="kg-arrow" />
        </g>
      )}
    </svg>
  );
}

function Overlay({ d, T, tilt, me, line, trail, anim, mode }: BoardProps & { line: number[] | null; trail: number[] | null }) {
  useAnimClock(anim);
  // heroes grouped by square; several on one square spread into a 2x2 cluster
  const live = d.order.filter((q) => d.pos[q] !== undefined);
  const byCell = new Map<number, string[]>();
  for (const q of live) byCell.set(d.pos[q], [...(byCell.get(d.pos[q]) ?? []), q]);
  const wrapping = mode === 'shift' && line ? live.filter((q) => d.pos[q] === line[6]) : [];
  const at = (r: number, c: number) => project(r, c, T, tilt);
  return (
    <div className="kg-overlay" aria-hidden={false}>
      {trail && trail.slice(1).map((i, k) => {
        const [r, c] = rc(i);
        const q = at(r, c);
        return <span key={`f${i}`} className="kg-foot" style={{ left: `calc(50% + ${q.x}px)`, top: `calc(50% + ${q.y}px)`, ['--k' as string]: k } as CSSProperties} />;
      })}
      {wrapping.map((q) => line && <WrapArc key={`w${q}`} from={line[6]} to={line[0]} T={T} tilt={tilt} hero={heroOf(d, q)} />)}
      {live.map((q) => {
        const group = byCell.get(d.pos[q])!;
        const k = group.indexOf(q), n = group.length;
        const off = n > 1 ? [[-0.2, -0.14], [0.2, -0.14], [-0.2, 0.16], [0.2, 0.16]][k] : [0, 0];
        const pose = heroPose(anim, q, d, T, tilt);
        const [r, c] = rc(d.pos[q]);
        const base = projectXY(c - 3 + off[0], r - 3 + off[1], T, tilt);
        const x = pose?.x ?? base.x, y = pose?.y ?? base.y, s = pose?.s ?? base.s;
        const h = heroOf(d, q);
        return (
          <div key={q} className={`kg-hero${anim?.e.k === 'win' && anim.e.p === q ? ' kg-hero-win' : ''}${q === d.current && !d.result ? ' kg-hero-current' : ''}${q === me ? ' kg-hero-me' : ''}${pose?.hop ? ' kg-hopping' : ''}`}
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, ['--s' as string]: s * (n > 1 ? 0.8 : 1), ['--hc' as string]: HERO_COLOR[h], zIndex: Math.round(500 + y) } as CSSProperties}
            data-testid={`kg-hero-${q}`} title={heroName(d, q)}>
            <svg viewBox={HERO_VIEWBOX} className="kg-hero-svg" style={{ transform: `scaleX(${pose?.facing ?? 1})` }}>
              <HeroFigure hero={h} walking={!!pose?.hop} />
            </svg>
          </div>
        );
      })}
      <BoardFx d={d} T={T} tilt={tilt} anim={anim} />
    </div>
  );
}

function WrapArc({ from, to, T, tilt, hero }: { from: number; to: number; T: number; tilt: boolean; hero: number }) {
  const [r1, c1] = rc(from), [r2, c2] = rc(to);
  const a = project(r1, c1, T, tilt), b = project(r2, c2, T, tilt);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const nx = -(b.y - a.y), ny = b.x - a.x, len = Math.hypot(nx, ny) || 1;
  const bend = Math.min(2.2 * T, len * 0.25);
  const cx = mx + (nx / len) * bend * (ny > 0 ? -1 : 1), cy = my + (ny / len) * bend * (ny > 0 ? -1 : 1);
  return (
    <svg className="kg-wraparc" style={{ left: '50%', top: '50%' }} width="1" height="1" overflow="visible">
      <path d={`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`} fill="none" stroke={HERO_COLOR[hero]} strokeWidth="3" strokeDasharray="2 7" strokeLinecap="round" />
      <circle cx={b.x} cy={b.y} r="6" fill="none" stroke={HERO_COLOR[hero]} strokeWidth="2.5" />
    </svg>
  );
}
