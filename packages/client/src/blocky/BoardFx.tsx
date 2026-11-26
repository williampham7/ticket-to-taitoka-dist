import type { CSSProperties, ReactNode } from 'react';
import { cellsOf, squaresOf, startIndex, type BView, type Guild } from '@boboland/shared/src/blocky';
import { BEAT, OWN_PRE, fxScale } from './fx';
import { outline, hash } from './art/shape';
import { PieceArt, stageOf } from './art/blocks';
import type { Anim } from './useBlockyFx';

/**
 * Board effects in cell units, drawn inside the board SVG. Every element is a CSS keyframe animation whose start is
 * `--d` (ms from the event start), so the scenes gallery can freeze any frame (`--scrub`, paused). Timings come
 * from the BEAT table in fx.ts; nothing here decides state.
 */
const v = (o: Record<string, string | number>) => o as CSSProperties;
const ms = (x: number, k: number) => `${Math.round(x * k)}ms`;

export function BoardFx({ anims, k = fxScale() }: { anims: Anim[]; k?: number }) {
  return <g className="bly-fx" pointerEvents="none">{anims.map((a) => (a.e.k === 'place' ? <PlaceFx key={a.key} a={a} k={k} /> : null))}</g>;
}

/** Where a guild's banner sits, in board cells (opponent pieces fly in from there). */
function bannerCell(guild: Guild, size: number): [number, number] {
  const el = typeof document !== 'undefined' ? document.querySelector(`[data-testid="bly-banner-${guild}"]`) : null;
  const svg = typeof document !== 'undefined' ? document.querySelector('.bly-board') as SVGSVGElement | null : null;
  if (!el || !svg) return [-6, -3];
  const r = el.getBoundingClientRect(), s = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  const kk = Math.min(s.width / vb.width, s.height / vb.height), ox = (s.width - vb.width * kk) / 2;
  const x = (r.left + r.width / 2 - s.left - ox) / kk + vb.x, y = (r.top + r.height / 2 - s.top) / kk + vb.y;
  return [Math.max(-size, Math.min(size * 2, x)), Math.max(-size, Math.min(size * 2, y))];
}

function PlaceFx({ a, k }: { a: Anim; k: number }) {
  if (a.e.k !== 'place') return null;
  const e = a.e, d = a.after, size = d.size, g = e.guild;
  const pts = squaresOf(e.piece);
  const cells = cellsOf(size, e).map((i) => [Math.floor(i / size), i % size] as [number, number]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const r0 = Math.floor(e.at / size), c0 = e.at % size;
  const cx = cells.reduce((t, x) => t + x[1], 0) / cells.length + 0.5, cy = cells.reduce((t, x) => t + x[0], 0) / cells.length + 0.5;
  const P = BEAT.place;
  const pre = a.travel ? P.anticipation.ms + P.travel.ms : OWN_PRE;
  const dropAt = (i: number) => pre + i * P.drop.perBlock;
  const land = pre + (pts - 1) * P.drop.perBlock + P.drop.fall;
  const mine = d.placed.filter((q) => q.guild === g);
  const first = mine.length === 1, last = d.shelf[g].length === 0, big = pts === 5;
  const [bx, by] = a.travel ? bannerCell(g, size) : [cx, cy];
  const out: ReactNode[] = [];

  // anticipation: a glow marks where it lands (opponents) / the ghost's dip (yours)
  if (!a.travel) out.push(<path key="dip" className={`bly-fxa bly-fx-dip bly-g-${g}`} d={outline(cells, 0.24, 0.04, -0.045, -0.085)} style={v({ '--d': '0ms', '--t': ms(OWN_PRE + 80, k), transformOrigin: `${cx}px ${cy}px` })} />);
  out.push(<g key="glow" className="bly-fxa bly-fx-glow" style={v({ '--d': '0ms', '--t': ms(a.travel ? P.anticipation.ms + P.travel.ms + 120 : P.anticipation.ms, k) })}>
    {cells.map(([r, c]) => <rect key={`${r},${c}`} x={c + 0.06} y={r + 0.06} width=".88" height=".88" rx=".2" />)}
  </g>);
  // action: an opponent's piece travels from its banner, then the blocks drop in one by one with a squash
  if (a.travel) out.push(
    <g key="travel" className={`bly-fxa bly-fx-travel bly-g-${g}`} style={v({ '--d': ms(P.anticipation.ms * 0.5, k), '--t': ms(P.travel.ms + P.anticipation.ms * 0.5, k), '--pre': ms(pre + 30, k), '--fx': `${bx - cx}px`, '--fy': `${by - cy}px` })}>
      <g transform={`translate(${c0} ${r0 - P.drop.height})`}><PieceArt guild={g} piece={e.piece} orient={e.orient} x={0} y={0} details={false} /></g>
    </g>,
  );
  out.push(<g key="drop" className={`bly-g-${g}`}>{cells.map(([r, c], i) => (
    <g key={`${r},${c}`} className="bly-fxa bly-fx-block" style={v({ '--d': ms(dropAt(i), k), '--t': ms(P.drop.fall, k), '--land': ms(land, k), '--h': `${-P.drop.height}px` })}>
      <g transform={`translate(${c} ${r})`}><use href="#bly-o-0" /></g>
    </g>
  ))}</g>);
  // impact: dust puffs at each block, one ring ripples out through the sockets
  out.push(<g key="dust">{cells.flatMap(([r, c], i) => Array.from({ length: P.impact.dust }, (_, j) => {
    const ang = (j / P.impact.dust) * Math.PI * 2 + hash(e.n, i, j) * 1.2;
    return <circle key={`${i}-${j}`} className="bly-fxa bly-fx-dust" cx={c + 0.5} cy={r + 0.9} r=".22" style={v({ '--d': ms(dropAt(i) + P.drop.fall * 0.8, k), '--t': ms(520, k), '--dx': `${Math.cos(ang) * 0.55}px`, '--dy': `${Math.sin(ang) * 0.3 - 0.1}px` })} />;
  }))}</g>);
  out.push(<path key="ripple" className={`bly-fxa bly-fx-ripple bly-g-${g}`} d={outline(cells, 0.3, -0.15)} style={v({ '--d': ms(land - 40, k), '--t': ms(560, k), transformOrigin: `${cx}px ${cy}px` })} />);
  // settle: the corner joints flash (the piece merges: the board shows it from `land`)
  const joints = cells.flatMap(([r, c]) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    if (rr < 0 || cc < 0 || rr >= size || cc >= size) return null;
    const j = d.cells[rr * size + cc];
    if (j < 0 || d.placed[j].guild !== g || d.placed[j].n === d.placed.length - 1) return null;
    return [dc > 0 ? c + 1 : c, dr > 0 ? r + 1 : r];
  }).filter((x): x is number[] => !!x));
  out.push(<g key="joints">{joints.map(([x, y], i) => <circle key={i} className="bly-fxa bly-fx-joint" cx={x - 0.12} cy={y - 0.21} r=".22" style={v({ '--d': ms(land + P.impact.ms * 0.5, k), '--t': ms(P.settle.ms + 200, k) })} />)}</g>);
  // residue: "+N", the guild flourish, big / first / last moments, the sprite builder
  const grown = a.before.placed.filter((q) => q.guild === g).filter((q) => stageOf(d, q) !== stageOf(a.before, q));
  out.push(<g key="growth">{grown.map((q) => {
    const qc = cellsOf(size, q).map((i) => [Math.floor(i / size), i % size] as [number, number]);
    const gx = qc.reduce((t, x) => t + x[1], 0) / qc.length + 0.4, gy = qc.reduce((t, x) => t + x[0], 0) / qc.length + 0.3;
    return (
      <g key={q.n}>
        <path className={`bly-fxa bly-fx-growring bly-g-${g}`} d={outline(qc, 0.3, -0.1, -0.045, -0.085)} style={v({ '--d': ms(land + 180, k), '--t': ms(700, k), transformOrigin: `${gx}px ${gy}px` })} />
        {[0, 1, 2, 3].map((j) => <path key={j} className="bly-fxa bly-fx-star" d="M0,-.3 L.08,-.08 L.3,0 L.08,.08 L0,.3 L-.08,.08 L-.3,0 L-.08,-.08Z" transform={`translate(${gx} ${gy})`} style={v({ '--d': ms(land + 220 + j * 60, k), '--t': ms(700, k), '--dx': `${[1, -1, 1, -1][j] * 0.9}px`, '--dy': `${[-1, -1, 1, 1][j] * 0.7}px` })} />)}
      </g>
    );
  })}</g>);
  out.push(<text key="plus" className="bly-fxa bly-fx-plus" x={cx - 0.1} y={cy - 0.5} style={v({ '--d': ms(land, k), '--t': ms(P.residue.plus, k) })}>+{pts}</text>);
  out.push(<Flourish key="flourish" g={g} cx={cx} cy={cy} at={land} k={k} n={e.n} />);
  if (big) out.push(<g key="big">{Array.from({ length: P.big.stars }, (_, i) => { const an = (i / P.big.stars) * Math.PI * 2; return <path key={i} className="bly-fxa bly-fx-star" d="M0,-.36 L.1,-.1 L.36,0 L.1,.1 L0,.36 L-.1,.1 L-.36,0 L-.1,-.1Z" transform={`translate(${cx} ${cy})`} style={v({ '--d': ms(land + 80, k), '--t': ms(900, k), '--dx': `${Math.cos(an) * 1.35}px`, '--dy': `${Math.sin(an) * 1.35}px` })} />; })}</g>);
  if (first) { const s = startIndex(d.board, g); if (s !== null) { const fr = Math.floor(s / size), fc = s % size; out.push(<Flag key="flag" g={g} x={fc + 0.5} y={fr + 0.5} at={land + 100} k={k} />); } }
  if (last) out.push(<g key="confetti" className={`bly-g-${g}`}>{Array.from({ length: P.last.confetti }, (_, i) => { const an = hash(e.n, i, 3) * Math.PI * 2, dist = 2 + hash(e.n, i, 4) * 4; return <rect key={i} className="bly-fxa bly-fx-confetti" x={cx - 0.18} y={cy - 0.11} width=".36" height=".22" rx=".04" style={v({ '--d': ms(land + i * 18, k), '--t': ms(P.last.ms, k), '--dx': `${Math.cos(an) * dist}px`, '--dy': `${Math.sin(an) * dist * 0.6 + 2.4}px`, '--rot': `${hash(e.n, i, 5) * 720}deg`, fill: i % 3 ? 'var(--g-top)' : i % 2 ? 'var(--g-light)' : '#fff6d0' })} />; })}</g>);
  if (last) out.push(<text key="bonus" className="bly-fxa bly-fx-bonus" x={cx} y={cy - 2.6} style={v({ '--d': ms(land + 650, k), '--t': ms(P.last.ms, k) })}>{e.piece === 'I1' ? '+20 all built!' : '+15 all built!'}</text>);
  out.push(out.splice(out.findIndex((x) => (x as { key?: string })?.key === 'plus'), 1)[0]);
  out.push(<Sprite key="sprite" g={g} x={cx} y={cy} at={land + 250} k={k} />);
  return <g className="bly-fx-place">{out}</g>;
}

/** The guild flourish: a Tide splash ring, Sun light rays, an Ember spark burst, Grove leaves and a sprout. */
function Flourish({ g, cx, cy, at, k, n }: { g: Guild; cx: number; cy: number; at: number; k: number; n: number }) {
  const F = BEAT.place.flourish, t = ms(BEAT.place.residue.flourish, k);
  if (g === 'tide') return (
    <g className="bly-g-tide">
      {Array.from({ length: F.tide.rings }, (_, i) => <ellipse key={`r${i}`} className="bly-fxa bly-fx-splash" cx={cx} cy={cy} rx="1.2" ry=".7" style={v({ '--d': ms(at + i * 140, k), '--t': t, transformOrigin: `${cx}px ${cy}px` })} />)}
      {Array.from({ length: F.tide.drops }, (_, i) => { const an = (i / F.tide.drops) * Math.PI * 2; return <circle key={`d${i}`} className="bly-fxa bly-fx-drop" cx={cx} cy={cy} r=".17" style={v({ '--d': ms(at, k), '--t': ms(800, k), '--dx': `${Math.cos(an) * 2}px`, '--dy': `${Math.sin(an) * 1.2 - 0.9}px` })} />; })}
    </g>
  );
  if (g === 'sun') return (
    <g className="bly-fxa bly-fx-rays" style={v({ '--d': ms(at, k), '--t': t, transformOrigin: `${cx}px ${cy}px` })}>
      {Array.from({ length: F.sun.rays }, (_, i) => <path key={i} d={`M${cx},${cy - 0.5} L${cx + 0.12},${cy - 1.9} L${cx - 0.12},${cy - 1.9}Z`} transform={`rotate(${i * (360 / F.sun.rays)} ${cx} ${cy})`} />)}
    </g>
  );
  if (g === 'ember') return (
    <g>{Array.from({ length: F.ember.sparks }, (_, i) => { const an = hash(n, i, 9) * Math.PI * 2, dd = 0.9 + hash(n, i, 8) * 1.2; return <g key={i}><circle className="bly-fxa bly-fx-spark-halo" cx={cx} cy={cy} r={0.26 + hash(n, i, 7) * 0.1} style={v({ '--d': ms(at + i * 12, k), '--t': ms(900, k), '--dx': `${Math.cos(an) * dd * 1.7}px`, '--dy': `${Math.sin(an) * dd * 1.7 - 1.1}px` })} /><circle className="bly-fxa bly-fx-spark" cx={cx} cy={cy} r={0.11 + hash(n, i, 7) * 0.08} style={v({ '--d': ms(at + i * 12, k), '--t': ms(900, k), '--dx': `${Math.cos(an) * dd * 1.7}px`, '--dy': `${Math.sin(an) * dd * 1.7 - 1.1}px` })} /></g>; })}</g>
  );
  return (
    <g className="bly-g-grove">
      {Array.from({ length: F.grove.leaves }, (_, i) => { const an = hash(n, i, 6) * Math.PI * 2; return <path key={i} className="bly-fxa bly-fx-leaf" d={`M${cx - 0.3},${cy} q.3,-.34 .6,0 q-.3,.34 -.6,0z`} style={v({ '--d': ms(at + i * 40, k), '--t': ms(1300, k), '--dx': `${Math.cos(an) * 2.3}px`, '--dy': `${Math.sin(an) * 1.2 + 0.9}px`, '--rot': `${hash(n, i, 2) * 540 - 270}deg`, transformOrigin: `${cx}px ${cy}px` })} />; })}
      <g className="bly-fxa bly-fx-sprout" style={v({ '--d': ms(at + 120, k), '--t': ms(700, k), transformOrigin: `${cx}px ${cy + 0.1}px` })}>
        <g transform={`translate(${cx} ${cy}) scale(2) translate(${-cx} ${-cy})`}><path d={`M${cx},${cy + 0.1} v-.4`} stroke="#3a6a28" strokeWidth=".06" /><path d={`M${cx},${cy - 0.2} q-.24,-.04 -.26,-.24 q.22,0 .26,.24z M${cx},${cy - 0.24} q.22,-.06 .24,-.26 q-.2,.02 -.24,.26z`} fill="#a6d27f" stroke="#3a6a28" strokeWidth=".02" /></g>
      </g>
    </g>
  );
}

/** The first piece of a guild plants its flag on the start sigil. */
function Flag({ g, x, y, at, k }: { g: Guild; x: number; y: number; at: number; k: number }) {
  return (
    <g className={`bly-fxa bly-fx-flag bly-g-${g}`} style={v({ '--d': ms(at, k), '--t': ms(BEAT.place.first.ms, k), transformOrigin: `${x}px ${y}px` })}>
      <path d={`M${x},${y} v-1.3`} stroke="#4a4f5c" strokeWidth=".08" strokeLinecap="round" />
      <path className="bly-fx-flagcloth" d={`M${x},${y - 1.3} l.7,.22 l-.7,.22z`} style={{ fill: 'var(--g-top)', stroke: 'var(--g-ink)' }} strokeWidth=".03" />
    </g>
  );
}

/** A tiny builder of the guild pops onto the piece, plants a pennant, waves and hops off. */
function Sprite({ g, x, y, at, k }: { g: Guild; x: number; y: number; at: number; k: number }) {
  return (
    <g className={`bly-fxa bly-fx-sprite bly-g-${g}`} style={v({ '--d': ms(at, k), '--t': ms(BEAT.place.sprite.ms, k), transformOrigin: `${x}px ${y}px` })}>
      <g transform={`translate(${x} ${y - 0.5}) scale(1.7)`}>
        <ellipse cy=".34" rx=".2" ry=".06" fill="#2b3550" opacity=".25" />
        <path d="M-.12,.3 q0,-.3 .12,-.32 q.12,.02 .12,.32z" style={{ fill: 'var(--g-top)', stroke: 'var(--g-ink)' }} strokeWidth=".025" />
        <circle cy="-.1" r=".1" fill="#f3cfb0" stroke="#2b3550" strokeWidth=".025" />
        <path className="bly-fx-wave" d="M.1,.05 l.16,-.18" stroke="#f3cfb0" strokeWidth=".05" strokeLinecap="round" />
        <g className="bly-fx-pennant"><path d="M-.26,.32 v-.6" stroke="#8a5a31" strokeWidth=".03" /><path d="M-.26,-.28 l.22,.07 l-.22,.07z" style={{ fill: 'var(--g-light)' }} /></g>
      </g>
    </g>
  );
}

/** For the scenes gallery: a synthetic place anim for the last piece of `view` (or a given one). */
export function sceneAnim(view: BView, opts: { travel?: boolean; index?: number } = {}): Anim {
  const i = opts.index ?? view.placed.length - 1;
  const q = view.placed[i];
  const seat = view.seats[q.guild];
  const e = { n: 9999, k: 'place' as const, p: seat === 'shared' ? view.order[0] : seat, guild: q.guild, piece: q.piece, orient: q.orient, at: q.at, points: squaresOf(q.piece) };
  const after = { ...view, placed: view.placed.slice(0, i + 1), cells: view.cells.map((c) => (c > i ? -1 : c)) };
  const P = BEAT.place;
  const pre = opts.travel ? P.anticipation.ms + P.travel.ms : OWN_PRE;
  const land = pre + (e.points - 1) * P.drop.perBlock + P.drop.fall;
  const before = { ...view, placed: view.placed.slice(0, i), cells: view.cells.map((c) => (c >= i ? -1 : c)), shelf: { ...view.shelf, [q.guild]: [...view.shelf[q.guild], q.piece] } };
  return { e, key: 1, start: 0, before, after, dur: 0, total: land + P.sprite.ms + 250, land, travel: !!opts.travel };
}
