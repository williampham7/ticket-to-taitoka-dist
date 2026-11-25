import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { CELLS, INSERTS, HOMES, isFixed, lineCells, opposite, pathTo, rc, rotMask, type KView, type Tile, type TreasureId } from '@boboland/shared/src/kingdom';
import { TileSvg } from './art/tiles';
import { RUNES } from './art/runes';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { INSET, STAGE, project, projectXY, trayShift, trayTransform } from './project';
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
  /** Who made the last push (their name, or 'you'), for the locked flag's tooltip. */
  lockWho?: string | null;
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
  const [tip, setTip] = useState<number | null>(null);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(tipTimer.current), []);
  const touchTip = () => { clearTimeout(tipTimer.current); tipTimer.current = setTimeout(() => setTip(null), 3500); };
  const lockText = p.lockWho === 'you' ? 'Locked: pushing here would undo your last push.' : p.lockWho ? `Locked: pushing here would undo ${p.lockWho}\u2019s last push.` : 'Locked: pushing here would undo the last push.';
  const size = STAGE * T;
  const style = { width: size, height: size, ['--T' as string]: `${T}px`, translate: `0 ${trayShift(T, tilt).toFixed(1)}px` } as CSSProperties;
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
          const state = isBlocked ? 'locked' : aim === at ? 'aimed' : active ? 'live' : 'idle';
          const label = isBlocked ? lockText : `Push the spare tile in from ${SIDE_NAME[ins.side]}, ${ins.side === 'N' || ins.side === 'S' ? 'column' : 'row'} ${ins.line + 1}`;
          return (
            // A locked flag is a real (not `disabled`) button with aria-disabled, so it still gets hover and focus and can explain itself.
            <button key={at} type="button" className={`kg-banner kg-banner-${b.side} kg-rb-${state}${isBlocked ? ' kg-furled' : ''}${aim === at ? ' kg-aimed' : ''}${p.focus === `b${at}` ? ' kg-focus' : ''}`}
              style={{ left: b.x * T, top: b.y * T, ['--i' as string]: at } as CSSProperties} disabled={!active && !isBlocked} aria-disabled={isBlocked ? 'true' : undefined}
              data-testid={`kg-banner-${at}`} data-at={at} data-state={state} aria-label={label}
              onPointerEnter={(e) => { if (isBlocked) setTip(at); else if (active && e.pointerType === 'mouse') p.onAim(at); }}
              onPointerLeave={(e) => { if (e.pointerType !== 'mouse') return; if (isBlocked) setTip(null); else if (aim === at) p.onAim(null); }}
              onFocus={() => { if (isBlocked) setTip(at); else if (active) p.onAim(at); }}
              onBlur={() => { if (isBlocked) setTip(null); }}
              onClick={(e) => {
                if (isBlocked) { setTip(at); touchTip(); return; } // explains, never pushes
                if (!active) return;
                // touch: the first tap previews, the second commits; a mouse click commits at once
                const touch = (e.nativeEvent as PointerEvent).pointerType === 'touch';
                if (touch && aim !== at) { p.onAim(at); return; }
                p.onShift(at);
              }}>
              <BannerArt side={b.side} line={ins.line} state={state} />
            </button>
          );
        })}
      </div>
      {blocked >= 0 && <LockTip at={blocked} T={T} tilt={tilt} text={lockText} show={tip === blocked} />}
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

const PUSH_TURN = { N: 0, E: 90, S: 180, W: -90 } as const;

/**
 * An insert marker: a carved runestone on a grass mound with a pennant. The rune is the row or column number, the
 * chevron points the way the tile will travel. Four states: live (soft mint glow), aimed (bright, haloed, rose
 * pennant, ripples), idle (dim, not your turn) and locked (dead rune, chains and a padlock, furled pennant).
 */
function BannerArt({ side, line, state }: { side: 'N' | 'E' | 'S' | 'W'; line: number; state: string }) {
  const locked = state === 'locked';
  return (
    <svg viewBox="0 0 40 60" className="kg-banner-svg" aria-hidden data-side={side}>
      <ellipse className="kg-rb-halo" cx="14" cy="31" rx="17" ry="24" fill="url(#kg-rune-glow)" />
      <ellipse cx="14" cy="54" rx="14" ry="4.2" fill="url(#kg-grass)" stroke="#4a3020" strokeWidth="1.2" />
      <path d="M3,54 Q8,50 12,53 M16,53 Q21,49 25,54" stroke="#3f7d2e" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M14,12 V2" stroke="#5a3a20" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="14" cy="2" r="2" fill="url(#kg-brass)" stroke="#4a3020" strokeWidth=".9" />
      <g className="kg-cloth">
        {locked
          ? <path d="M14,4 q5,1 7,4 q-5,0 -7,-1 z" fill="#b9a98c" stroke="#4a3020" strokeWidth="1.1" strokeLinejoin="round" />
          : <path className="kg-pennant" d="M14,3.5 H34 L29.5,8.5 L34,13.5 H14 Z" stroke="#4a3020" strokeWidth="1.3" strokeLinejoin="round" />}
        {!locked && <path d="M17,6 H28 M17,11 H28" stroke="#fff4d6" strokeWidth="1" strokeLinecap="round" opacity=".7" />}
      </g>
      <path className="kg-stone" d="M3.5,54 V24 Q3.5,12 14,12 Q24.5,12 24.5,24 V54 Z" fill="url(#kg-rune-stone)" stroke="#4a3020" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7.5,50 V25 Q7.5,16 14,16 Q20.5,16 20.5,25 V50 Z" fill="url(#kg-rune-face)" stroke="#2f3a3f" strokeWidth=".9" opacity=".95" />
      <path d="M6,25 Q7,15 14,13.6" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity=".45" />
      <circle cx="9.5" cy="48" r=".9" fill="#5d6970" /><circle cx="19" cy="20" r=".8" fill="#5d6970" />
      <g transform="translate(14 28) scale(1.15)">
        <path className="kg-rune-glow" d={RUNES[line]} fill="none" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path className="kg-rune" d={RUNES[line]} fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform={`translate(14 43) rotate(${PUSH_TURN[side]})`}>
        <path className="kg-rune-glow" d="M-4,-2.4 L0,2 L4,-2.4" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path className="kg-rune" d="M-4,-2.4 L0,2 L4,-2.4" fill="none" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {locked && (
        <g>
          <path d="M5,26 L23,48 M23,26 L5,48" stroke="#4a3020" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M5,26 L23,48 M23,26 L5,48" stroke="#c9ccd0" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2.4 1.6" />
          <rect x="9.5" y="33" width="9" height="8" rx="1.8" fill="url(#kg-brass)" stroke="#4a3020" strokeWidth="1.2" />
          <path d="M11.5,33 V30.6 A2.5,2.5 0 0 1 16.5,30.6 V33" fill="none" stroke="#4a3020" strokeWidth="1.5" />
          <circle cx="14" cy="37.2" r="1" fill="#4a3020" />
          <path d="M11,21 L13,25 L11.6,28" stroke="#2f3a3f" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      )}
      {state === 'aimed' && <circle className="kg-rb-ripple" cx="14" cy="54" r="6" fill="none" stroke="#9ff5dc" strokeWidth="1.4" />}
    </svg>
  );
}

/** The locked flag's explanation. It lives outside the tilted tray so its text is never skewed; it is placed with the tray's own projection. */
function LockTip({ at, T, tilt, text, show }: { at: number; T: number; tilt: boolean; text: string; show: boolean }) {
  const b = bannerAt(at);
  const q = projectXY(b.x - STAGE / 2, b.y - STAGE / 2, T, tilt);
  const { line } = INSERTS[at];
  const shift = b.side === 'N' || b.side === 'S' ? (line === 0 ? '-12%' : line === 6 ? '-88%' : '-50%') : '0';
  return (
    <div className={`kg-locktip kg-locktip-${b.side}${show ? ' kg-show' : ''}`} role="tooltip" data-testid="kg-locktip" data-at={at}
      style={{ left: `calc(50% + ${q.x}px)`, top: `calc(50% + ${q.y}px)`, ['--sh' as string]: shift, ['--s' as string]: q.s, ['--T' as string]: `${T}px` } as CSSProperties}>
      <span>{text}</span>
    </div>
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
