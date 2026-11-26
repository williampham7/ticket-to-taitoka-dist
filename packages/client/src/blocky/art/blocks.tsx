import { memo } from 'react';
import { orientId, orientations, type BView, type Guild, type PieceId, type Placed } from '@boboland/shared/src/blocky';
import { BEVEL, DEPTH } from './Defs';
import { hash, outline } from './shape';

/** Growth stage of a placed piece: 2 once its guild has placed 2 more pieces, 3 after 6 more. */
export function stageOf(view: Pick<BView, 'placed'>, q: Placed): 1 | 2 | 3 {
  let later = 0;
  for (const o of view.placed) if (o.guild === q.guild && o.n > q.n) later++;
  return later >= 6 ? 3 : later >= 2 ? 2 : 1;
}

/** About 30% of a piece's cells carry a seeded micro-detail (always at least one on a piece of 3+). */
export function detailCells(q: Pick<Placed, 'piece' | 'orient' | 'n'>): [number, number][] {
  const cells = orientations(q.piece)[q.orient].cells;
  const pick = cells.filter(([r, c]) => hash(q.n, r, c, 7) < 0.3);
  if (!pick.length && cells.length >= 3) pick.push(cells[Math.floor(hash(q.n, 11) * cells.length)]);
  return pick;
}

export interface PieceArtProps { guild: Guild; piece: PieceId; orient: number; x: number; y: number; stage?: 1 | 2 | 3; n?: number; className?: string; details?: boolean; shared?: boolean }
/** One placed piece: a single `<use>` of its moulded orientation plus its details `<g>`. Coordinates in cells. */
export const PieceArt = memo(function PieceArt({ guild, piece, orient, x, y, stage = 1, n = 0, className = '', details = true, shared = false }: PieceArtProps) {
  return (
    <g transform={`translate(${x} ${y})`}><g className={`bly-g-${guild} ${className}`}>
      <use href={`#bly-o-${orientId(piece, orient)}`} />
      {shared && <path className="bly-shared-rim" d={outline(orientations(piece)[orient].cells, 0.2, 0.13, -BEVEL, -DEPTH)} />}
      {details && (
        <g key={stage} className="bly-details" transform={`translate(${-BEVEL} ${-DEPTH})`}>
          {detailCells({ piece, orient, n }).map(([r, c]) => <use key={`${r},${c}`} href={`#bly-d-${guild}-${stage}`} x={c} y={r} />)}
        </g>
      )}
    </g></g>
  );
});

/** Studs where two pieces of the same guild meet corner to corner (board cell coordinates of the shared corner). */
export function studs(view: Pick<BView, 'cells' | 'placed' | 'size'>): { x: number; y: number; guild: Guild }[] {
  const { size, cells, placed } = view;
  const out = new Map<string, { x: number; y: number; guild: Guild }>();
  const at = (r: number, c: number) => (r < 0 || c < 0 || r >= size || c >= size ? -1 : cells[r * size + c]);
  for (let i = 0; i < cells.length; i++) {
    const a = cells[i];
    if (a < 0) continue;
    const r = Math.floor(i / size), c = i % size, g = placed[a].guild;
    for (const [dr, dc] of [[1, 1], [1, -1]] as const) {
      const b = at(r + dr, c + dc);
      if (b < 0 || b === a || placed[b].guild !== g) continue;
      const x = dc > 0 ? c + 1 : c, y = r + 1;
      out.set(`${x},${y}`, { x, y, guild: g });
    }
  }
  return [...out.values()];
}

/** A shelf piece in its own little SVG (cell units, room for the shadow). */
export function ShelfPiece({ guild, piece, orient, cell = 16, className }: { guild: Guild; piece: PieceId; orient: number; cell?: number; className?: string }) {
  const sh = orientations(piece)[orient];
  return (
    <svg className={`${className ?? ''}${cell < 22 ? ' bly-small' : ''}`} width={(sh.w + 0.4) * cell} height={(sh.h + 0.5) * cell} viewBox={`-0.12 -0.24 ${sh.w + 0.4} ${sh.h + 0.5}`} aria-hidden>
      <PieceArt guild={guild} piece={piece} orient={orient} x={0} y={0} details={false} />
    </svg>
  );
}
