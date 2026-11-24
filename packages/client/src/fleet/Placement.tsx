import { useEffect, useMemo, useRef, useState } from 'react';
import { SHIPS, shipSquares, type Deployment, type Dir, type ShipClass, type WeaponId } from '@boboland/shared/src/fleet';
import { Grid, boxStyle, type GridShip } from './Grid';
import { ShipTop } from './shipArt';
import {
  EMPTY_DRAFT, anchorForDrop, complete, place, placeDecoy, randomDraft, remove, rotate, toDeployment, type Draft,
} from './draft';
import { btn } from './ui';

type Piece = ShipClass | 'decoy';
interface Drag { piece: Piece; dir: Dir; grab: number; fromBoard: boolean; x0: number; y0: number; x: number; y: number; moved: boolean }

const lengthOf = (p: Piece) => (p === 'decoy' ? 1 : SHIPS[p].length);
const nameOf = (p: Piece) => (p === 'decoy' ? 'Decoy' : SHIPS[p].name);
/** Hull codes painted on each class. */
const HULL: Record<Piece, string> = { dreadnought: 'CV-01', cruiser: 'CG-02', frigate: 'FF-03', submarine: 'SS-04', corvette: 'PC-05', cutter: 'WC-06', decoy: 'DX-00' };

/** Place the fleet: drag ships onto the grid, tap one to turn it, Redeploy for a random layout, Ready to confirm. */
export function Placement({ classes, loadout, onReady, onChangeWeapons, heading }: {
  classes: ShipClass[]; loadout: WeaponId[]; onReady: (d: Deployment) => void; onChangeWeapons?: () => void; heading: string;
}) {
  const needDecoy = loadout.includes('decoy');
  const pieces: Piece[] = needDecoy ? [...classes, 'decoy'] : classes;
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [armed, setArmed] = useState<Piece | null>(null);
  const [trayDir, setTrayDir] = useState<Dir>('h');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const placed = (p: Piece) => (p === 'decoy' ? draft.decoy !== null : !!draft.ships[p]);
  const tray = pieces.filter((p) => !placed(p));
  const ready = complete(draft, classes, needDecoy);

  const squareAt = (x: number, y: number): number | null => {
    const r = board.current?.getBoundingClientRect();
    if (!r || x < r.left || y < r.top || x >= r.right || y >= r.bottom) return null;
    return Math.floor(((y - r.top) / r.height) * 10) * 10 + Math.floor(((x - r.left) / r.width) * 10);
  };

  /** Put `piece` with its `grab`-th square on `s`; returns the new draft or null when it does not fit. */
  const drop = (d: Draft, piece: Piece, dir: Dir, s: number, grab: number): Draft | null => {
    if (piece === 'decoy') return placeDecoy({ ...d, decoy: null }, s);
    return place(d, { cls: piece, at: anchorForDrop(piece, dir, s, grab), dir });
  };

  // the landing preview: while dragging over the board, or with a tray ship picked up and a square under the pointer
  const preview = useMemo(() => {
    let piece: Piece | null = null, dir: Dir = trayDir, s: number | null = null, grab = 0;
    if (drag?.moved) { piece = drag.piece; dir = drag.dir; grab = drag.grab; s = squareAt(drag.x, drag.y); }
    else if (armed && hover !== null) { piece = armed; s = hover; }
    if (!piece || s === null) return null;
    const cells = piece === 'decoy' ? [s] : shipSquares({ cls: piece, at: anchorForDrop(piece, dir, s, grab), dir }) ?? [];
    return { cells: new Set(cells), ok: drop(draft, piece, dir, s, grab) !== null };
  }, [drag, armed, hover, trayDir, draft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => d && { ...d, x: e.clientX, y: e.clientY, moved: d.moved || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6 });
    const up = (e: PointerEvent) => {
      setDrag(null);
      const d = drag;
      const s = squareAt(e.clientX, e.clientY);
      const movedNow = d.moved || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6;
      if (!movedNow) {
        if (d.fromBoard && d.piece !== 'decoy') setDraft((cur) => rotate(cur, d.piece as ShipClass) ?? cur);
        else if (!d.fromBoard) setArmed((a) => (a === d.piece ? null : d.piece));
        return;
      }
      if (s !== null) {
        setDraft((cur) => drop(cur, d.piece, d.dir, s, d.grab) ?? cur);
        setArmed(null);
      } else if (d.fromBoard) {
        setDraft((cur) => (d.piece === 'decoy' ? { ...cur, decoy: null } : remove(cur, d.piece as ShipClass)));
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', () => setDrag(null));
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag?.piece, drag?.fromBoard]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, piece: Piece, dir: Dir, fromBoard: boolean) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const len = lengthOf(piece);
    const along = dir === 'h' ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
    const grab = Math.max(0, Math.min(len - 1, Math.floor(along * len)));
    setDrag({ piece, dir, grab, fromBoard, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false });
  };

  const onCell = (s: number) => {
    if (armed) {
      const next = drop(draft, armed, trayDir, s, 0);
      if (next) {
        setDraft(next);
        const left = pieces.filter((p) => p !== armed && !(p === 'decoy' ? next.decoy !== null : next.ships[p]));
        setArmed(left[0] ?? null);
      }
      return;
    }
    // keyboard and tap: a square of a placed ship turns it
    const hit = classes.find((c) => draft.ships[c] && shipSquares(draft.ships[c]!)?.includes(s));
    if (hit) setDraft((cur) => rotate(cur, hit) ?? cur);
  };

  const ships: GridShip[] = classes.filter((c) => draft.ships[c]).map((c) => ({ ...draft.ships[c]!, className: drag?.fromBoard && drag.piece === c && drag.moved ? 'lifted' : '' }));
  if (draft.decoy !== null) ships.push({ cls: 'decoy', at: draft.decoy, dir: 'h', className: drag?.fromBoard && drag.piece === 'decoy' && drag.moved ? 'lifted' : '' });

  return (
    <section className="fleet-place" data-testid="fleet-placement">
      <header className="fleet-station-head">
        <span className="fleet-station">Deployment</span>
        <h2 className="fleet-h">{heading}</h2>
        <p className="fleet-help">Drag each ship onto your waters. Tap a placed ship to turn it, or drag it off the grid to take it back.</p>
      </header>
      <div className="fleet-place-body">
        <div className="fleet-plate quiet fleet-place-board">
          <div className="fleet-board-head"><span className="fleet-station">Your waters</span><span className="fleet-mono tag">{pieces.length - tray.length}/{pieces.length} on station</span></div>
          <Grid ref={board} name="Your fleet" testid="fleet-own" interactive className="placing" ships={ships}
            onCell={onCell} onCellHover={setHover}
            cellClass={(s) => (preview?.cells.has(s) ? (preview.ok ? 'ghost-ok' : 'ghost-bad') : '')}>
            {ships.map((sh) => (
              <div key={`grab-${sh.cls}`} className="fleet-grab" style={boxStyle(sh.at, lengthOf(sh.cls), sh.dir)} data-testid={`fleet-placed-${sh.cls}`}
                onPointerDown={(e) => startDrag(e, sh.cls, sh.dir, true)} aria-hidden />
            ))}
          </Grid>
        </div>
        <aside className="fleet-plate fleet-oob" aria-label="Ships to place">
          <div className="fleet-tools" role="toolbar" aria-label="Placement tools">
            <button type="button" className={`${btn} icon fleet-rot`} data-testid="fleet-rotate" data-dir={trayDir}
              onClick={() => setTrayDir((d) => (d === 'h' ? 'v' : 'h'))}
              aria-label={trayDir === 'h' ? 'Ships go across. Turn to place them down' : 'Ships go down. Turn to place them across'}
              title={trayDir === 'h' ? 'Placing across (tap to turn)' : 'Placing down (tap to turn)'}>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 12 a8 8 0 1 1 -2.6 -5.9" /><path d="M18.5 2.5 V7 H14" />
                <rect className="fleet-rot-bar" x="8" y="10.5" width="8" height="3" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <button type="button" className={btn} data-testid="fleet-redeploy" title="Place every ship at random"
              onClick={() => { setDraft(randomDraft(classes, needDecoy, Math.random)); setArmed(null); }}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><rect x="2" y="2" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="6.5" cy="6.5" r="1.6" fill="currentColor" /><circle cx="13.5" cy="13.5" r="1.6" fill="currentColor" /><circle cx="10" cy="10" r="1.6" fill="currentColor" /></svg>
              Random
            </button>
            <button type="button" className={btn} data-testid="fleet-clear" onClick={() => { setDraft(EMPTY_DRAFT); setArmed(null); }} disabled={tray.length === pieces.length}>Clear</button>
          </div>
          <span className="fleet-sub">Order of battle</span>
          <ul className="fleet-roll">
            {pieces.map((p) => {
              const done = placed(p);
              return (
                <li key={p}>
                  <button type="button" className={`fleet-tray-item ${armed === p ? 'armed' : ''} ${done ? 'done' : ''}`} data-testid={`fleet-tray-${p}`}
                    disabled={done} aria-pressed={armed === p} aria-label={`${nameOf(p)} (${lengthOf(p)})${done ? ', on station' : ''}`}
                    onPointerDown={(e) => { if (!done) startDrag(e, p, trayDir, false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setArmed((a) => (a === p ? null : p)); } }}>
                    <span className="fleet-tray-code fleet-mono">{HULL[p]}</span>
                    <span className="fleet-tray-name">{nameOf(p)}</span>
                    <span className="fleet-tray-state">{done ? 'On station' : armed === p ? 'Pick a square' : 'Drag to grid'}</span>
                    <span className="fleet-tray-art" style={{ '--len': lengthOf(p) } as React.CSSProperties}>
                      {Array.from({ length: lengthOf(p) }, (_, k) => <i key={k} />)}
                      <span className="fleet-tray-ship"><ShipTop cls={p} /></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="fleet-oob-foot">
            {onChangeWeapons && <button type="button" className={btn} data-testid="fleet-change-weapons" onClick={onChangeWeapons}>Weapons</button>}
            <button type="button" className="fleet-launch" data-testid="fleet-ready" disabled={!ready} onClick={() => onReady(toDeployment(draft, loadout))}>
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M4 12 L10 18 L20 6" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
              <span className="fleet-launch-label">Ready</span>
              <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><path d="M6 3 L15 11 L6 19" fill="none" stroke="currentColor" strokeWidth="3" /></svg>
            </button>
          </div>
        </aside>
      </div>
      {drag?.moved && (
        <div className="fleet-drag-ghost" style={{ left: drag.x, top: drag.y, width: drag.dir === 'h' ? lengthOf(drag.piece) * 30 : 30, height: drag.dir === 'v' ? lengthOf(drag.piece) * 30 : 30, transform: `translate(${-(drag.dir === 'h' ? drag.grab * 30 + 15 : 15)}px, ${-(drag.dir === 'v' ? drag.grab * 30 + 15 : 15)}px)` }} aria-hidden>
          <ShipTop cls={drag.piece} dir={drag.dir} />
        </div>
      )}
    </section>
  );
}
