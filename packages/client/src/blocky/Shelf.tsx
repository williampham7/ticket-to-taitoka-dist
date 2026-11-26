import { type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { PIECE_IDS, PIECE_NAME, squaresOf, type Guild, type PieceId } from '@boboland/shared/src/blocky';
import { ShelfPiece } from './art/blocks';
import { GUILD_NAME } from './text';

export interface ShelfProps {
  guild: Guild; pieces: PieceId[]; held?: { piece: PieceId; orient: number } | null; noRoom?: Set<PieceId>;
  title?: string; idle?: { guild: Guild; pieces: PieceId[] } | null; cell?: number; grounded?: boolean;
  onPick?: (id: PieceId, e: RPointerEvent<HTMLButtonElement>) => void; onKeyPick?: (id: PieceId) => void; children?: ReactNode;
}
/** Shelf rows: the big pieces first (play them early). */
const ROWS: PieceId[][] = [PIECE_IDS.filter((p) => squaresOf(p) === 5), PIECE_IDS.filter((p) => squaresOf(p) === 4), PIECE_IDS.filter((p) => squaresOf(p) <= 3)];

/**
 * The wooden shelf: a plank on ropes holding the acting guild's pieces, biggest first. The held piece lifts; a
 * piece with no room anywhere dims with a "No room" tag. Roving tabindex: arrows move between pieces, Enter picks.
 */
export function Shelf({ guild, pieces, held, noRoom, title, idle, cell = 14, grounded, onPick, onKeyPick, children }: ShelfProps) {
  const left = pieces.reduce((t, p) => t + squaresOf(p), 0);
  const order = ROWS.flat().filter((p) => pieces.includes(p));
  const focusIdx = Math.max(0, held ? order.indexOf(held.piece) : 0);
  const key = (e: KeyboardEvent<HTMLButtonElement>, id: PieceId) => {
    const i = order.indexOf(id);
    const move = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (move) { e.preventDefault(); const n = order[(i + move + order.length) % order.length]; (e.currentTarget.parentElement?.parentElement?.querySelector(`[data-piece="${n}"]`) as HTMLElement | null)?.focus(); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onKeyPick?.(id); }
  };
  return (
    <section className={`bly-shelfwrap bly-g-${guild}${grounded ? ' bly-shelf-grounded' : ''}`} aria-label={`${GUILD_NAME[guild]} shelf`}>
      <div className="bly-shelf bly-plank">
        <span className="bly-rope" style={{ left: '18%' }} /><span className="bly-rope" style={{ right: '18%' }} />
        <header className="bly-shelf-head">
          <span className="bly-shelf-tab">{title ?? `${GUILD_NAME[guild]} pieces`}</span>
          <small>{pieces.length} left · {left} squares</small>
        </header>
        <div className="bly-shelf-rows" role="listbox" aria-label="Pieces">
          {ROWS.map((row, ri) => (
            <div key={ri} className="bly-shelf-row">
              {row.map((id) => {
                const has = pieces.includes(id);
                if (!has) return <span key={id} className="bly-slot-empty" aria-hidden />;
                const isHeld = held?.piece === id;
                const dead = noRoom?.has(id);
                return (
                  <button key={id} type="button" role="option" aria-selected={isHeld} data-piece={id} data-testid={`bly-piece-${id}`}
                    tabIndex={order[focusIdx] === id ? 0 : -1} className={`bly-slot${isHeld ? ' bly-slot-held' : ''}${dead ? ' bly-slot-dead' : ''}`}
                    aria-label={`${PIECE_NAME[id]}, ${squaresOf(id)} squares${dead ? ', no room' : ''}`} title={`${PIECE_NAME[id]} · ${squaresOf(id)}`}
                    onPointerDown={(e) => onPick?.(id, e)} onKeyDown={(e) => key(e, id)}>
                    <ShelfPiece guild={guild} piece={id} orient={isHeld ? held!.orient : 0} cell={cell} />
                    {dead && <span className="bly-noroom">No room</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {grounded && <span className="bly-stamp bly-stamp-big">Grounded</span>}
      </div>
      {idle && (
        <div className={`bly-shelf-idle bly-plank bly-g-${idle.guild}`} aria-label={`${GUILD_NAME[idle.guild]} shelf, waiting`}>
          <span className="bly-shelf-tab">{GUILD_NAME[idle.guild]} waits</span>
          <div className="bly-idle-pieces">{ROWS.flat().filter((p) => idle.pieces.includes(p)).map((id) => <ShelfPiece key={id} guild={idle.guild} piece={id} orient={0} cell={6} />)}</div>
        </div>
      )}
      {children}
    </section>
  );
}
