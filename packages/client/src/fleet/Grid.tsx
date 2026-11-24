import { forwardRef, type ReactNode } from 'react';
import { CELLS, COLS, SHIPS, label, xOf, yOf, type Dir, type ShipClass } from '@boboland/shared/src/fleet';
import { ShipTop } from './shipArt';

export interface GridShip { cls: ShipClass | 'decoy'; at: number; dir: Dir; className?: string; key?: string }

/** Percent box of a ship (or any run of squares) on the 10x10 board. */
export function boxStyle(at: number, len: number, dir: Dir) {
  return {
    left: `${xOf(at) * 10}%`, top: `${yOf(at) * 10}%`,
    width: `${(dir === 'h' ? len : 1) * 10}%`, height: `${(dir === 'v' ? len : 1) * 10}%`,
  };
}

interface Props {
  /** accessible name of the grid, e.g. "Your fleet" */
  name: string;
  testid: string;
  ships?: GridShip[];
  /** per-square class (markers, preview ghosts) */
  cellClass?: (s: number) => string;
  /** per-square content (marker glyphs) */
  cellContent?: (s: number) => ReactNode;
  /** per-square accessible label suffix, e.g. "hit" */
  cellLabel?: (s: number) => string;
  onCell?: (s: number) => void;
  /** the pointer (or keyboard focus) is over a square; `how` tells mouse hover from touch, so a tap can aim first */
  onCellHover?: (s: number | null, how?: string) => void;
  /** squares are buttons only when the grid takes input */
  interactive?: boolean;
  disabledCell?: (s: number) => boolean;
  children?: ReactNode;
  className?: string;
}

/** A 10x10 sea with A-J / 1-10 rims. Ships and other layers sit over the squares, in percent of the board. */
export const Grid = forwardRef<HTMLDivElement, Props>(function Grid(
  { name, testid, ships = [], cellClass, cellContent, cellLabel, onCell, onCellHover, interactive, disabledCell, children, className = '' },
  boardRef,
) {
  return (
    <div className={`fleet-grid ${className}`} data-testid={testid}>
      <div className="fleet-rim-cols" aria-hidden>{COLS.split('').map((c) => <span key={c}>{c}</span>)}</div>
      <div className="fleet-rim-rows" aria-hidden>{Array.from({ length: 10 }, (_, i) => <span key={i}>{i + 1}</span>)}</div>
      <div className="fleet-board" ref={boardRef} role="group" aria-label={name} onPointerLeave={() => onCellHover?.(null)}>
        <div className="fleet-cells">
          {Array.from({ length: CELLS }, (_, s) => {
            const cls = `fleet-cell ${cellClass?.(s) ?? ''}`;
            const extra = cellLabel?.(s);
            const aria = extra ? `${label(s)} ${extra}` : label(s);
            return interactive ? (
              <button key={s} type="button" className={cls} data-sq={s} data-testid={`${testid}-${label(s)}`} aria-label={aria}
                disabled={disabledCell?.(s)} onClick={() => onCell?.(s)} onPointerEnter={(e) => onCellHover?.(s, e.pointerType)} onFocus={() => onCellHover?.(s, 'focus')}>
                {cellContent?.(s)}
              </button>
            ) : (
              <div key={s} className={cls} data-sq={s} data-testid={`${testid}-${label(s)}`} aria-label={aria}>{cellContent?.(s)}</div>
            );
          })}
        </div>
        <div className="fleet-overlay">
          {ships.map((sh) => (
            <div key={sh.key ?? `${sh.cls}-${sh.at}`} className={`fleet-ship-box ${sh.className ?? ''}`} style={boxStyle(sh.at, sh.cls === 'decoy' ? 1 : SHIPS[sh.cls].length, sh.dir)} data-ship={sh.cls}>
              <ShipTop cls={sh.cls} dir={sh.dir} />
            </div>
          ))}
          {children}
        </div>
      </div>
    </div>
  );
});
