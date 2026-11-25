import { RUNES } from './art/runes';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { INSERTS, lineCells, rc, type KView } from '@boboland/shared/src/kingdom';
import { projectXY } from './project';
import type { Anim } from './useKingdomFx';
import { TileSvg } from './art/tiles';
import { TreasureIcon } from './art/treasures';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { HERO_COLOR, heroOf } from './text';

/** Re-render every frame while a move or shift plays (heroes walk and ride along). */
export function useAnimClock(anim: Anim | null): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!anim || (anim.e.k !== 'move' && anim.e.k !== 'shift')) return;
    let raf = 0;
    const tick = () => { setNow(performance.now()); if (performance.now() < anim.start + anim.dur + 50) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim]);
  return now;
}

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
/** Ease out with a small settle at the end. */
export const settle = (x: number) => (x < 0.85 ? easeOut(x / 0.85) * 1.03 : 1.03 - 0.03 * ((x - 0.85) / 0.15));
/** The share of a shift's time when the line slides (after the spare's flight to the banner). */
export const SLIDE = { from: 0.3, len: 0.55 };

export interface Pose { x: number; y: number; s: number; facing: 1 | -1; hop: boolean }
/** Where a hero is drawn mid-animation (null = at its square). Walking hops along the path; riding slides with the line. */
export function heroPose(anim: Anim | null, q: string, d: KView, T: number, tilt: boolean): Pose | null {
  if (!anim) return null;
  const t = clamp((performance.now() - anim.start) / anim.dur);
  const e = anim.e;
  if (e.k === 'move' && e.p === q && e.path.length > 1) {
    const span = e.path.length - 1;
    const walkT = clamp(t * (span * 140 + 120) / (span * 140)); // the last 120 ms is the landing
    const f = walkT * span;
    const k = Math.min(span - 1, Math.floor(f)), frac = f - k;
    const [r1, c1] = rc(e.path[k]), [r2, c2] = rc(e.path[k + 1]);
    const lift = walkT < 1 ? Math.sin(Math.PI * frac) * 0.22 : 0;
    const p = projectXY(c1 - 3 + (c2 - c1) * frac, r1 - 3 + (r2 - r1) * frac - lift, T, tilt);
    return { ...p, facing: c2 < c1 ? -1 : 1, hop: walkT < 1 };
  }
  if (e.k === 'shift' && anim.before.pos[q] !== undefined) {
    const line = lineCells(e.at);
    const k = line.indexOf(anim.before.pos[q]);
    if (k < 0) return null;
    const side = INSERTS[e.at].side;
    const dx = side === 'W' ? 1 : side === 'E' ? -1 : 0, dy = side === 'N' ? 1 : side === 'S' ? -1 : 0;
    const p = clamp((t - SLIDE.from) / SLIDE.len);
    const [r, c] = rc(line[k]);
    if (k < 6) { const m = settle(p); return { ...projectXY(c - 3 + dx * m, r - 3 + dy * m, T, tilt), facing: 1, hop: false }; }
    // wrapping: hop off the far edge, then drop onto the new tile at the insertion end
    if (p < 0.5) { const m = easeOut(p * 2); return { ...projectXY(c - 3 + dx * m * 0.7, r - 3 + dy * m * 0.7 - Math.sin(Math.PI * m) * 0.5, T, tilt), facing: 1, hop: true }; }
    const [r0, c0] = rc(line[0]);
    const m = easeOut((p - 0.5) * 2);
    return { ...projectXY(c0 - 3, r0 - 3 - (1 - m) * 0.9, T, tilt), facing: 1, hop: true };
  }
  return null;
}

/** A point of the overlay for a DOM element's centre (pedestal, player banner), relative to the stage centre. */
function domPoint(stage: DOMRect | null, sel: string): { x: number; y: number } | null {
  const el = document.querySelector(sel);
  if (!el || !stage) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - stage.left - stage.width / 2, y: r.top + r.height / 2 - stage.top - stage.height / 2 };
}
const px = (n: number) => `${Math.round(n)}px`;
const vars = (o: Record<string, string | number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`--${k}`, v])) as CSSProperties;

/**
 * Everything that flies over the board, played from the event being animated: the spare's flight to its banner,
 * the pushed-out tile's arc to the pedestal, leaf-and-dust puffs, wrap sparkles, footprints behind a walk, the
 * treasure's rise and flight to its finder's banner, the home banner unfurling, and a hero's farewell wave.
 */
export function BoardFx({ d, T, tilt, anim }: { d: KView; T: number; tilt: boolean; anim: Anim | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<DOMRect | null>(null);
  useLayoutEffect(() => { if (anim) setStage(box.current?.getBoundingClientRect() ?? null); }, [anim?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const at = (i: number) => { const [r, c] = rc(i); return projectXY(c - 3, r - 3, T, tilt); };
  const fx: ReactNode[] = [];
  if (anim && stage) {
    const e = anim.e, dur = anim.dur, k = anim.key;
    const base = vars({ dur: `${dur}ms`, T: `${T}px` });
    if (e.k === 'shift') {
      const line = lineCells(e.at);
      const side = INSERTS[e.at].side;
      const dx = side === 'W' ? -1 : side === 'E' ? 1 : 0, dy = side === 'N' ? -1 : side === 'S' ? 1 : 0;
      const [r0, c0] = rc(line[0]), [r6, c6] = rc(line[6]);
      const inn = projectXY(c0 - 3 + dx, r0 - 3 + dy, T, tilt);
      const outEdge = projectXY(c6 - 3 - dx, r6 - 3 - dy, T, tilt);
      const ped = domPoint(stage, '.kg-spare-tile') ?? { x: stage.width / 2 + T, y: stage.height / 2 };
      const inTile = d.board[line[0]];
      const outTile = anim.before.board[line[6]];
      fx.push(
        <div key={`fly${k}`} className="kg-fx-fly" style={{ ...base, ...vars({ x0: px(ped.x), y0: px(ped.y), x1: px(inn.x), y1: px(inn.y), s1: inn.s }) }}><TileSvg tile={inTile} /></div>,
        <div key={`arc${k}`} className="kg-fx-arc" style={{ ...base, ...vars({ x0: px(outEdge.x), y0: px(outEdge.y), x1: px(ped.x), y1: px(ped.y), s0: outEdge.s }) }}><TileSvg tile={outTile} /></div>,
      );
      for (const [p, n] of [[inn, 0], [outEdge, 1]] as const) {
        fx.push(<div key={`puff${k}${n}`} className="kg-fx-puff" style={{ ...base, ...vars({ x: px(p.x), y: px(p.y) }) }}>{[0, 1, 2, 3, 4, 5].map((j) => <i key={j} style={vars({ j })} className={j % 2 ? 'kg-fx-leaf' : 'kg-fx-dust'} />)}</div>);
      }
      line.forEach((cell, j) => {
        const p = at(cell);
        fx.push(<span key={`rw${k}${j}`} className="kg-fx-rune" style={{ ...base, ...vars({ x: px(p.x), y: px(p.y), j }) }}><svg viewBox="-5 -8 10 16"><path d={RUNES[(e.at + j) % 7]} /></svg></span>);
      });
      fx.push(<span key={`rg${k}`} className="kg-fx-ring" style={{ ...base, ...vars({ x: px(inn.x), y: px(inn.y), squash: tilt ? 0.55 : 1, rd: 0.22 }) }} />);
      if (e.wraps.length) for (const p of [outEdge, at(line[0])]) fx.push(<Sparkles key={`w${k}${p.x}`} x={p.x} y={p.y} T={T} dur={dur} delay={0.55} />);
    }
    if (e.k === 'move' && e.path.length > 1) {
      e.path.slice(0, -1).forEach((c, j) => {
        const p = at(c);
        fx.push(<span key={`fp${k}${j}`} className="kg-fx-foot" style={{ ...base, ...vars({ x: px(p.x), y: px(p.y), j, n: e.path.length - 1 }) }} />);
      });
      const end = at(e.path[e.path.length - 1]);
      fx.push(<span key={`land${k}`} className="kg-fx-ring kg-fx-ring-soft" style={{ ...base, ...vars({ x: px(end.x), y: px(end.y), squash: tilt ? 0.55 : 1, rd: 0.7 }) }} />);
    }
    if (e.k === 'collect') {
      const c = anim.before.pos[e.p] ?? d.pos[e.p];
      const p = at(c);
      const ban = domPoint(stage, `[data-testid="kg-player-${e.p}"] .kg-pl-face`) ?? { x: 0, y: -stage.height / 2 };
      fx.push(
        <span key={`cr${k}`} className="kg-fx-ring kg-fx-ring-gold" style={{ ...base, ...vars({ x: px(p.x), y: px(p.y + T * 0.1), squash: tilt ? 0.55 : 1, rd: 0.05 }) }} />,
        <Sparkles key={`cs${k}`} x={p.x} y={p.y - T * 0.4} T={T} dur={dur} delay={0.18} big />,
        <div key={`ct${k}`} className="kg-fx-treasure" style={{ ...base, ...vars({ x0: px(p.x), y0: px(p.y - T * 0.25), x1: px(ban.x), y1: px(ban.y) }) }}><TreasureIcon t={e.t} /></div>,
      );
    }
    if (e.k === 'home') {
      const p = at(d.home[e.p]);
      fx.push(<span key={`pl${k}`} className="kg-fx-pillar" style={{ ...base, ...vars({ x: px(p.x), y: px(p.y) }) }} />);
      fx.push(<div key={`hb${k}`} className="kg-fx-home" style={{ ...base, ...vars({ x: px(p.x), y: px(p.y), hc: HERO_COLOR[heroOf(d, e.p)] }) }}><HomeBanner /></div>);
    }
    if (e.k === 'resign') {
      const c = anim.before.pos[e.p];
      if (c !== undefined) {
        const p = at(c);
        fx.push(<div key={`bye${k}`} className="kg-fx-bye kg-hero" style={{ ...base, left: `calc(50% + ${p.x}px)`, top: `calc(50% + ${p.y}px)`, ['--s' as string]: p.s } as CSSProperties}><svg viewBox={HERO_VIEWBOX} className="kg-hero-svg"><HeroFigure hero={heroOf(d, e.p)} /></svg></div>);
      }
    }
  }
  return <div ref={box} className="kg-fx">{fx}</div>;
}

function Sparkles({ x, y, T, dur, delay, big }: { x: number; y: number; T: number; dur: number; delay: number; big?: boolean }) {
  const n = big ? 10 : 7;
  return (
    <div className={`kg-fx-sparkles${big ? ' kg-fx-big' : ''}`} style={vars({ x: px(x), y: px(y), dur: `${dur}ms`, delay, T: `${T}px` })}>
      {Array.from({ length: n }, (_, j) => <i key={j} style={vars({ a: `${(360 / n) * j}deg`, j })} />)}
    </div>
  );
}

function HomeBanner() {
  return (
    <svg viewBox="-20 -60 40 64" className="kg-homebanner">
      <path d="M-2,2 V-58" stroke="#4a3020" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-2" cy="-58" r="3" fill="url(#kg-brass)" stroke="#4a3020" />
      <path className="kg-hb-cloth" d="M0,-54 H18 V-26 L9,-32 L0,-26 Z" fill="var(--hc)" stroke="#4a3020" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9,-48 L10.5,-44 L14.5,-44 L11.3,-41.5 L12.5,-37.5 L9,-40 L5.5,-37.5 L6.7,-41.5 L3.5,-44 L7.5,-44 Z" fill="#fff4c2" />
    </svg>
  );
}
