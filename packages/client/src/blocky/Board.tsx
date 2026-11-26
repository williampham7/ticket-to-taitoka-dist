import { forwardRef, memo, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from 'react';
import { PIECE_NAME, cellsOf, orientations, squaresOf, startIndex, type BView, type Guild, type PieceId, type Place } from '@boboland/shared/src/blocky';
import { PieceArt, stageOf, studs } from './art/blocks';
import { PLATEAU_PAD, Plateau, Sigil, Sockets } from './art/plateau';
import { outline } from './art/shape';
import { nightness } from './art/palette';
import { GUILD_NAME, nameOf } from './text';

export interface AnchorShow { guild: Guild; cells: number[]; fit?: Set<number>; fitNow?: Set<number>; idle?: boolean }
export interface GhostShow { guild: Guild; piece: PieceId; orient: number; r: number; c: number; legal: boolean; bad?: number[]; pending?: boolean }
export interface InspectShow { index: number }
export interface BoardProps {
  view: BView; names: Record<string, string>; progress: number;
  anchors?: AnchorShow | null; ghost?: GhostShow | null; flash?: number | null; inspect?: InspectShow | null; clean?: boolean;
  /** pieces still dropping in (the fx layer draws them until they land) */
  hide?: Set<number>;
  /** scenes: a viewBox override (zoom), and a piece that appears at `at` (scrubbable) */
  zoom?: string; appear?: { n: number; at: number };
  ghostRef?: React.Ref<SVGGElement>; onPointerDown?: (e: RPointerEvent<SVGSVGElement>) => void;
  onPointerMove?: (e: RPointerEvent<SVGSVGElement>) => void; onPointerUp?: (e: RPointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (e: RPointerEvent<SVGSVGElement>) => void; onPointerLeave?: (e: RPointerEvent<SVGSVGElement>) => void;
  pendingKeys?: ReactNode; fx?: ReactNode; children?: ReactNode;
}

const NONE = new Set<number>();

/** The board's viewBox in cells: the plateau's rim, slab and underside around the grid. */
export function boardBox(size: number) {
  const k = size / 20;
  return { x: -PLATEAU_PAD.side * k, y: -PLATEAU_PAD.top * k, w: size + 2 * PLATEAU_PAD.side * k, h: size + (PLATEAU_PAD.top + PLATEAU_PAD.bottom) * k };
}

/**
 * Where the pending ✓ ✕ keys sit, in cells: beside the ghost on the side that covers the fewest placed blocks
 * (above, right, below, left; the ghost itself is never covered), within the rim. `kw`/`kh` = key block size in cells.
 */
export function keySpot(v: Pick<BView, 'size' | 'cells'>, g: { piece: PieceId; orient: number; r: number; c: number }, kw: number, kh: number) {
  const sh = orientations(g.piece)[g.orient], size = v.size, gap = 0.45;
  const cand = [
    { x: g.c + sh.w / 2, y: g.r - gap - kh / 2, side: 'above' },
    { x: g.c + sh.w + gap + kw / 2, y: g.r + sh.h / 2, side: 'right' },
    { x: g.c + sh.w / 2, y: g.r + sh.h + gap + kh / 2, side: 'below' },
    { x: g.c - gap - kw / 2, y: g.r + sh.h / 2, side: 'left' },
  ];
  const score = (k: { x: number; y: number }) => {
    if (k.x - kw / 2 < -1.6 || k.x + kw / 2 > size + 1.6 || k.y - kh / 2 < -1.6 || k.y + kh / 2 > size + 1.6) return 1e6;
    let n = 0;
    for (let r = Math.floor(k.y - kh / 2); r < k.y + kh / 2; r++) for (let c = Math.floor(k.x - kw / 2); c < k.x + kw / 2; c++) {
      if (r < 0 || c < 0 || r >= size || c >= size) continue;
      if (v.cells[r * size + c] >= 0) n += 1;
      if (sh.cells.some(([a, b]) => a + g.r === r && b + g.c === c)) n += 100;
    }
    return n;
  };
  return cand.reduce((b, k) => (score(k) < score(b) ? k : b));
}

/** Absolute board cells of a placed piece, as [row, col]. */
const absCells = (size: number, p: Place) => cellsOf(size, p).map((i) => [Math.floor(i / size), i % size] as [number, number]);

/**
 * The plateau and everything on it, one SVG in cell units: sockets, sigils, the open-corner diamonds, placed pieces
 * (one `<use>` each, drawn north to south), joint studs, each guild's last-piece outline and the newest ring, the
 * ghost, and invisible `rect[data-cell]` targets on top.
 */
export const BoardView = memo(forwardRef<SVGSVGElement, BoardProps>(function BoardView(p, ref) {
  const { view, progress, anchors, ghost, flash, inspect, clean } = p;
  const hide = p.hide ?? NONE;
  const size = view.size;
  const box = boardBox(size);
  const order = useMemo(() => view.placed.map((q, i) => ({ q, i, bottom: Math.floor(q.at / size) + orientations(q.piece)[q.orient].h })).sort((a, b) => a.bottom - b.bottom || a.q.n - b.q.n), [view.placed, size]);
  const lastOf = useMemo(() => {
    const m = new Map<Guild, number>();
    view.placed.forEach((q, i) => { if (!hide.has(q.n)) m.set(q.guild, i); });
    return m;
  }, [view.placed, hide]);
  const newest = useMemo(() => view.placed.reduce((b, q, i) => (!hide.has(q.n) && (b < 0 || q.n > view.placed[b].n) ? i : b), -1), [view.placed, hide]);
  const studList = useMemo(() => studs({ ...view, placed: view.placed }).filter((s) => !clean), [view, clean]);
  const covered = (i: number) => view.cells[i] >= 0 && !hide.has(view.placed[view.cells[i]].n);
  // the rendered size, to put HTML (the ✓ ✕ keys) over the right cells
  const own = useRef<SVGSVGElement | null>(null);
  const [px, setPx] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = own.current; if (!el) return;
    const ro = new ResizeObserver(() => setPx({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const k = px.w ? Math.min(px.w / box.w, px.h / box.h) : 0;
  const keys = ghost?.pending && p.pendingKeys && k ? (() => {
    const kw = 120 / k, kh = 56 / k;
    const spot = keySpot(view, ghost, kw, kh);
    const sh = orientations(ghost.piece)[ghost.orient];
    const edge = { above: [ghost.c + sh.w / 2, ghost.r], right: [ghost.c + sh.w, ghost.r + sh.h / 2], below: [ghost.c + sh.w / 2, ghost.r + sh.h], left: [ghost.c, ghost.r + sh.h / 2] }[spot.side as 'above']!;
    const toPx = (x: number, y: number) => ({ left: (px.w - box.w * k) / 2 + (x - box.x) * k, top: (y - box.y) * k });
    return { at: toPx(spot.x, spot.y), tether: { x1: edge[0], y1: edge[1], x2: spot.x, y2: spot.y } };
  })() : null;
  const setRefs = (el: SVGSVGElement | null) => { own.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
  return (
    <>
    <svg ref={setRefs} preserveAspectRatio="xMidYMin meet" className={`bly-board${clean ? ' bly-clean-board' : ''}`} viewBox={p.zoom ?? `${box.x} ${box.y} ${box.w} ${box.h}`} overflow="visible"
      style={{ ['--night' as string]: nightness(progress) }} data-testid={`bly-board-${view.board}`} role="grid" tabIndex={0} aria-label={`${view.board === 'duo' ? 'Duo' : 'Classic'} board, ${size} by ${size}. With a piece held: arrow keys move it, Space cycles the ways it fits, Enter builds.`}
      onPointerDown={p.onPointerDown} onPointerMove={p.onPointerMove} onPointerUp={p.onPointerUp} onPointerCancel={p.onPointerCancel} onPointerLeave={p.onPointerLeave}>
      {!clean && <Plateau size={size} />}
      {clean && <rect x="-.1" y="-.1" width={size + 0.2} height={size + 0.2} rx=".2" fill="#f3eee2" stroke="#8c7e66" strokeWidth=".06" />}
      <Sockets size={size} />
      {view.guilds.map((g) => { const s = startIndex(view.board, g); return s !== null && !covered(s) ? <Sigil key={g} guild={g} r={Math.floor(s / size)} c={s % size} /> : null; })}
      {anchors && (
        <g className={`bly-anchors bly-g-${anchors.guild}${anchors.idle ? ' bly-anchors-idle' : ''}`} pointerEvents="none">
          {anchors.cells.map((i) => {
            const lvl = anchors.fitNow?.has(i) ? 2 : anchors.fit?.has(i) ? 1 : 0;
            const r = Math.floor(i / size), c = i % size, s = [0.24, 0.3, 0.36][lvl];
            return (
              <g key={i} className={`bly-anchor bly-anchor-${lvl}`} transform={`translate(${c + 0.5} ${r + 0.5})`}>
                <circle r={[0.4, 0.52, 0.64][lvl]} className="bly-anchor-glow" />
                <path d={`M0,${-s} L${s},0 L0,${s} L${-s},0Z`} className="bly-anchor-gem" />
              </g>
            );
          })}
        </g>
      )}
      <g className="bly-pieces">
        {order.map(({ q, i }) => {
          if (hide.has(q.n)) return null;
          const art = <PieceArt key={q.n} guild={q.guild} piece={q.piece} orient={q.orient} x={q.at % size} y={Math.floor(q.at / size)} stage={stageOf(view, q)} n={q.n} details={!clean} shared={view.seats[q.guild] === 'shared'}
            className={`${flash === i ? 'bly-flash ' : ''}${i === newest ? 'bly-landed' : ''}`} />;
          return p.appear?.n === q.n ? <g key={q.n} className="bly-fxa bly-fx-appear" style={{ ['--d' as string]: `${p.appear.at}ms` }}>{art}</g> : art;
        })}
      </g>
      <g className="bly-studs" pointerEvents="none">{studList.map((s) => <use key={`${s.x},${s.y}`} href="#bly-stud" x={s.x - 0.09} y={s.y - 0.17} className={`bly-g-${s.guild}`} />)}</g>
      <g className="bly-last" pointerEvents="none">
        {[...lastOf.entries()].map(([g, i]) => {
          const q = view.placed[i];
          const line = <path key={g} className={`bly-lastline bly-g-${g}${i === newest ? ' bly-newest' : ''}`} d={outline(absCells(size, q), 0.24, -0.06, -0.045, -0.085)} />;
          return p.appear?.n === q.n ? <g key={g} className="bly-fxa bly-fx-appear" style={{ ['--d' as string]: `${p.appear.at}ms` }}>{line}</g> : line;
        })}
        {newest >= 0 && (p.appear?.n === view.placed[newest].n
          ? <g className="bly-fxa bly-fx-appear" style={{ ['--d' as string]: `${p.appear.at}ms` }}><path className={`bly-newring bly-g-${view.placed[newest].guild}`} d={outline(absCells(size, view.placed[newest]), 0.36, -0.22, -0.045, -0.085)} /></g>
          : <path className={`bly-newring bly-g-${view.placed[newest].guild}`} d={outline(absCells(size, view.placed[newest]), 0.36, -0.22, -0.045, -0.085)} />)}
      </g>
      {flash !== null && flash !== undefined && view.placed[flash] && <path className="bly-flashline" d={outline(absCells(size, view.placed[flash]), 0.24, -0.1, -0.045, -0.085)} pointerEvents="none" />}
      {ghost && (
        <g ref={p.ghostRef} className={`bly-ghost${ghost.legal ? '' : ' bly-ghost-bad'}${ghost.pending ? ' bly-ghost-pending' : ''}`} transform={`translate(${ghost.c} ${ghost.r})`} pointerEvents="none">
          <path className="bly-ghost-shadow" d={outline(orientations(ghost.piece)[ghost.orient].cells, 0.24, 0.04, 0.22, 0.34)} />
          <g className="bly-ghost-lift">
            <PieceArt guild={ghost.legal ? ghost.guild : ('none' as Guild)} piece={ghost.piece} orient={ghost.orient} x={0} y={0} details={false} />
            <path className="bly-ghost-ants" d={outline(orientations(ghost.piece)[ghost.orient].cells, 0.24, -0.08, -0.045, -0.085)} />
          </g>
        </g>
      )}
      {ghost?.bad?.map((i) => <rect key={i} className="bly-badcell" x={i % size + 0.04} y={Math.floor(i / size) + 0.04} width=".92" height=".92" rx=".16" pointerEvents="none" />)}
      {p.fx}
      <g className="bly-hit">
        {view.cells.map((_, i) => <rect key={i} data-cell={`${Math.floor(i / size)},${i % size}`} x={i % size} y={Math.floor(i / size)} width="1" height="1" fill="transparent" />)}
      </g>
      {inspect && view.placed[inspect.index] && <InspectTag view={view} names={p.names} index={inspect.index} />}
      {keys && <line className="bly-tether" {...keys.tether} />}
      {p.children}
    </svg>
    {keys && <div className="bly-pendkeys" style={{ left: keys.at.left, top: keys.at.top }}>{p.pendingKeys}</div>}
    </>
  );
}));

/** Hover or long-press a placed piece: owner, themed name, size, on a tag beside it with a leader line. */
function InspectTag({ view, names, index }: { view: BView; names: Record<string, string>; index: number }) {
  const q = view.placed[index], size = view.size, cs = absCells(size, q);
  const minC = Math.min(...cs.map((x) => x[1])), maxC = Math.max(...cs.map((x) => x[1])) + 1;
  const cy = cs.reduce((t, x) => t + x[0], 0) / cs.length + 0.4, cx = cs.reduce((t, x) => t + x[1], 0) / cs.length + 0.4;
  const seat = view.seats[q.guild];
  const who = seat === 'shared' ? 'Shared' : nameOf(names, seat);
  const w = Math.max(5.4, PIECE_NAME[q.piece].length * 0.38 + 1.6);
  const right = maxC + 0.6 + w <= size + 1.2;
  const x = right ? maxC + 0.6 : minC - 0.6 - w, y = Math.max(-1, Math.min(size - 1.4, cy - 0.95));
  return (
    <g className={`bly-inspect bly-g-${q.guild}`} pointerEvents="none">
      <path d={`M${cx},${cy} L${right ? x : x + w},${y + 0.95}`} className="bly-inspect-lead" />
      <circle cx={cx} cy={cy} r=".14" className="bly-inspect-dot" />
      <g transform={`translate(${x} ${y})`}>
        <rect width={w} height="1.9" rx=".45" className="bly-inspect-card" />
        <rect width=".32" height="1.9" rx=".16" style={{ fill: 'var(--g-top)' }} />
        <text x=".6" y=".82" className="bly-inspect-name">{PIECE_NAME[q.piece]}</text>
        <text x=".6" y="1.52" className="bly-inspect-sub">{who} · {GUILD_NAME[q.guild]} · {squaresOf(q.piece)} squares</text>
      </g>
    </g>
  );
}
