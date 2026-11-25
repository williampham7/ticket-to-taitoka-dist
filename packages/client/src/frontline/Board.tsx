import { useEffect, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { isLake, kindOf, type PlayerID, type ViewPiece, type Combat, type Rank, type Spot } from '@boboland/shared/src/frontline';
import { coordOf, displayPos } from './helpers';
import { Chip, Tile } from './Tile';
import type { Fx } from './fx';
import './board.css';
import './spot.css';

/** Army colours outside the tiles (chat bubbles, swatches). */
export const OWNER_STYLE: Record<PlayerID, { bg: string; fg: string }> = {
  '0': { bg: '#5f7834', fg: '#f3f1e6' },
  '1': { bg: '#cdb385', fg: '#2a2418' },
};

interface Props {
  pieces: ViewPiece[];
  me: PlayerID;
  selected?: number | null;
  legalTo?: ReadonlySet<number>;
  /** My pieces that have a legal move (hover lift). */
  movable?: ReadonlySet<number>;
  lastMove?: { player: PlayerID; from: number; to: number } | null;
  lastCombat?: Combat | null;
  onCell?: (pos: number) => void;
  /** Setup: a pointer went down on a square (the parent runs the drag). */
  onCellPointerDown?: (pos: number, e: ReactPointerEvent) => void;
  /** Setup: the squares this player may deploy on (empty ones are outlined). */
  zone?: ReadonlySet<number>;
  /** Setup: the square a dragged piece would land on. */
  dropAt?: number | null;
  /** The animation playing now (a slide, the approach of an attack, or a spot). */
  fx?: Fx | null;
  /** Spotter army: enemy squares the selected Spotter may spot. */
  spotTo?: ReadonlySet<number>;
  /** Spotter army: the last spot (its sight line and mark stay until the next turn). */
  lastSpot?: Spot | null;
  /** Ranks already named wrongly against a piece, by piece id. */
  ruledOut?: Record<string, Rank[]>;
  /** Board rows: 10 (classic) or 8 (Spotter army). Always 10 columns. */
  rows?: number;
}

export { coordOf } from './helpers';

/* ---- terrain: contour lines and scrub, generated once per board height (in 100 units a square) ---- */
function rng(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const TERRAINS = new Map<number, ReturnType<typeof makeTerrain>>();
const terrainFor = (rows: number) => { if (!TERRAINS.has(rows)) TERRAINS.set(rows, makeTerrain(rows)); return TERRAINS.get(rows)!; };
function makeTerrain(rows: number) {
  const r = rng(20261122);
  const H = rows * 100, mid = H / 2, ky = H / 1000;
  const hills = [
    { x: 150, y: 150, r: 210, n: 6 }, { x: 830, y: 210, r: 230, n: 7 }, { x: 520, y: 70, r: 120, n: 3 },
    { x: 170, y: 850, r: 230, n: 7 }, { x: 860, y: 830, r: 200, n: 6 }, { x: 480, y: 930, r: 120, n: 3 },
    { x: 500, y: 500, r: 120, n: 3 },
  ];
  const contours: { d: string; major: boolean }[] = [];
  for (const h of hills) {
    const harm = [2, 3, 5].map((k) => ({ k, a: 0.06 + r() * 0.1, p: r() * Math.PI * 2 }));
    for (let i = 1; i <= h.n; i++) {
      const rad = (h.r * i) / h.n;
      const pts: string[] = [];
      for (let j = 0; j < 72; j++) {
        const t = (j / 72) * Math.PI * 2;
        const f = 1 + harm.reduce((s, q) => s + q.a * Math.sin(q.k * t + q.p + i * 0.18), 0);
        pts.push(`${(h.x + Math.cos(t) * rad * f).toFixed(1)} ${(h.y * ky + Math.sin(t) * rad * f * 0.86 * ky).toFixed(1)}`);
      }
      contours.push({ d: `M${pts.join(' L')} Z`, major: i % 3 === 0 });
    }
  }
  const scrub = Array.from({ length: 70 }, () => ({ x: r() * 1000, y: r() * H, s: 2 + r() * 5 }))
    .filter((p) => !(p.y > mid - 105 && p.y < mid + 105 && ((p.x > 195 && p.x < 405) || (p.x > 595 && p.x < 805))));
  const lake = (cx: number) => {
    const pts: string[] = [];
    for (let j = 0; j < 64; j++) {
      const t = (j / 64) * Math.PI * 2;
      const c = Math.cos(t), s = Math.sin(t);
      const se = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 0.5);
      const w = 1 + 0.035 * Math.sin(5 * t + cx) + 0.025 * Math.sin(9 * t);
      pts.push(`${(cx + se(c) * 92 * w).toFixed(1)} ${(mid + se(s) * 92 * w).toFixed(1)}`);
    }
    return `M${pts.join(' L')} Z`;
  };
  return { contours, scrub, lakes: [lake(300), lake(700)], H, mid };
}

function Terrain({ flip, rows }: { flip: boolean; rows: number }) {
  const TERRAIN = terrainFor(rows);
  const { H, mid } = TERRAIN;
  return (
    <svg className="flb-terrain" viewBox={`0 0 1000 ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y={mid - 100} width="1000" height="200" className="flb-nml" />
      <g transform={flip ? `rotate(180 500 ${mid})` : undefined}>
        {TERRAIN.contours.map((c, i) => <path key={i} d={c.d} className={c.major ? 'flb-contour major' : 'flb-contour'} />)}
        {TERRAIN.scrub.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.s} className="flb-scrub" />)}
      </g>
      {TERRAIN.lakes.map((d, i) => (
        <g key={i}>
          <path d={d} className="flb-shore" />
          <path d={d} className="flb-water" />
          <g className="flb-ripples" transform={`translate(${i ? 700 : 300} ${mid})`}>
            <path d="M-60 -30 Q-30 -40 0 -30 T60 -30" /><path d="M-70 5 Q-35 -5 0 5 T70 5" /><path d="M-55 40 Q-27 30 0 40 T55 40" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** 10-column field (10 or 8 rows) on a tactical map. Row 0 is the top for player 0; player 1 sees it rotated so their own army is at the bottom. */
export function Board({ pieces, me, selected, legalTo, movable, lastMove, lastCombat, onCell, onCellPointerDown, zone, dropAt, fx, spotTo, lastSpot, ruledOut, rows = 10 }: Props) {
  /** Display row and column of a real square. */
  const rc = (who: PlayerID, pos: number) => { const d = displayPos(who, pos, rows); return { r: Math.floor(d / 10), c: d % 10 }; };
  const at = new Map(pieces.map((p) => [p.pos, p]));

  // an enemy piece that was hidden and now has a rank flips over (several at once, e.g. at the end: a wave)
  const hiddenSeen = useRef(new Set<string>());
  const flipAt = useRef(new Map<string, number>());
  const now = Date.now();
  const fresh = pieces.filter((p) => p.rank !== undefined && hiddenSeen.current.has(p.id) && !flipAt.current.has(p.id));
  for (const p of fresh) flipAt.current.set(p.id, now);
  const wave = fresh.length > 3;
  useEffect(() => { for (const p of pieces) if (p.rank === undefined) hiddenSeen.current.add(p.id); });

  const combatFx = fx?.kind === 'combat' ? fx : null;
  const moveFx = fx?.kind === 'move' ? fx : null;
  const spotFx = fx?.kind === 'spot' ? fx.spot : null;
  const spotTarget = spotFx ? pieces.find((p) => p.pos === spotFx.at) : undefined;

  const cells = [];
  for (let d = 0; d < rows * 10; d++) {
    const pos = displayPos(me, d, rows);
    const piece = at.get(pos);
    const lake = isLake(pos, rows);
    const legal = !!legalTo?.has(pos);
    const attack = legal && !!piece;
    const isSel = selected === pos;
    const inZone = !!zone?.has(pos);
    const r = Math.floor(d / 10), c = d % 10;

    let pieceStyle: CSSProperties | undefined;
    let pieceClass = '';
    if (piece) {
      if (moveFx && moveFx.to === pos) {
        const f = rc(me, moveFx.from), t = rc(me, moveFx.to);
        pieceClass = 'sliding';
        pieceStyle = { '--dx': f.c - t.c, '--dy': f.r - t.r, '--ms': `${moveFx.ms}ms` } as CSSProperties;
      } else if (combatFx && piece.id === combatFx.combat.attacker.id) {
        const f = rc(me, combatFx.from), t = rc(me, combatFx.combat.at);
        const dist = Math.abs(t.c - f.c) + Math.abs(t.r - f.r) || 1;
        const k = (dist - 0.42) / dist;
        pieceClass = 'lunging';
        pieceStyle = { '--dx': (t.c - f.c) * k, '--dy': (t.r - f.r) * k } as CSSProperties;
      }
      const t0 = flipAt.current.get(piece.id);
      if (t0 !== undefined && now - t0 < (wave ? 1600 : 900)) {
        pieceClass += ' flipping';
        pieceStyle = { ...pieceStyle, '--flip-delay': wave ? `${(r + c) * 45}ms` : '0ms' } as CSSProperties;
      }
      if (spotFx && piece.id === spotFx.spotter) pieceClass += ' spotting';
      if (spotFx?.hit && piece.id === spotFx.target) pieceClass += ' spot-struck';
      if (isSel) pieceClass += ' selected';
      else if (movable?.has(pos)) pieceClass += ' movable';
    }
    const raised = pieceClass.includes('sliding') || pieceClass.includes('lunging') || isSel;
    const target = combatFx?.combat.at === pos;
    const scorch = !fx && (lastCombat?.at === pos || (lastSpot?.hit && lastSpot.at === pos));
    const from = !fx && lastMove?.from === pos;
    const spotable = !!spotTo?.has(pos);
    const spotHere = spotFx?.at === pos;
    const missMark = !fx && !!lastSpot && !lastSpot.hit && lastSpot.at === pos;
    const ruled = piece && piece.rank === undefined ? ruledOut?.[piece.id] ?? [] : [];

    cells.push(
      <div key={pos} data-testid={`fl-cell-${pos}`} data-legal={legal ? 'true' : undefined} onClick={() => onCell?.(pos)}
        data-zone={inZone ? 'true' : undefined}
        onPointerDown={onCellPointerDown ? (e) => onCellPointerDown(pos, e) : undefined}
        title={ruled.length ? `Ruled out: ${ruled.map((r) => kindOf(r).name).join(', ')}` : undefined}
        data-spot={spotable ? 'true' : undefined}
        style={{ touchAction: onCellPointerDown && piece ? 'none' : undefined, zIndex: raised || target || spotHere ? 6 : undefined }}
        className={`flb-cell ${lake ? 'lake' : (r + c) % 2 ? 'odd' : ''} ${onCell && !lake ? 'cursor-pointer' : ''} ${inZone && !piece ? 'zone' : ''} ${dropAt === pos ? 'drop' : ''}`}>
        {scorch && <span className={`flb-scorch ${lastCombat?.at === pos && lastCombat.defender.rank === 'B' && lastCombat.winner === 'defender' ? 'crater' : ''}`} />}
        {from && <span className="flb-from" />}
        {legal && !attack && <span className="flb-dest" />}
        {piece && (
          <div data-testid="fl-piece" data-owner={piece.owner} data-id={piece.id} data-revealed={piece.revealed ? 'true' : undefined}
            className={`flp ${pieceClass}`} style={pieceStyle}>
            <Tile owner={piece.owner} rank={piece.rank} revealed={piece.owner === me && piece.revealed} ruledOut={ruled.length} />
          </div>
        )}
        {attack && <span className="flb-attack" aria-hidden="true"><i /><i /><i /><i /></span>}
        {isSel && <span className="flb-sel" aria-hidden="true"><i /><i /><i /><i /></span>}
        {spotable && <span className="flb-spotable" aria-hidden="true" />}
        {missMark && <span className="flb-missmark" aria-hidden="true" />}
        {spotHere && spotFx && (
          <span className={`flb-spot ${spotFx.hit ? 'hit' : 'miss'}`} data-testid="fl-spot-fx" aria-hidden="true">
            <span className="flb-spot-lock"><i /><i /><i /><i /></span>
            <span className="flb-spot-call"><Chip owner={spotTarget?.owner ?? (spotFx.player === '0' ? '1' : '0')} rank={spotFx.guess} size={44} /><b>{kindOf(spotFx.guess).name}?</b></span>
            <b className="flb-spot-verdict">{spotFx.hit ? 'Confirmed' : 'Negative'}</b>
          </span>
        )}
        {target && <span className="flb-reticle" aria-hidden="true"><i /><i /><i /><i /><b /></span>}
      </div>,
    );
  }

  // the last move as a faint track (drawn in as it happens)
  const track = !combatFx && lastMove ? (() => {
    const f = rc(me, lastMove.from), t = rc(me, lastMove.to);
    return { x1: f.c + 0.5, y1: f.r + 0.5, x2: t.c + 0.5, y2: t.r + 0.5, mine: lastMove.player === me };
  })() : null;

  // a spot: the sight line from the Spotter to its target (drawn while it plays, faint afterwards)
  const sightOf = spotFx ?? (!fx ? lastSpot : null) ?? null;
  const sight = sightOf ? (() => {
    const f = rc(me, sightOf.from), t = rc(me, sightOf.at);
    return { x1: f.c + 0.5, y1: f.r + 0.5, x2: t.c + 0.5, y2: t.r + 0.5, live: !!spotFx, mine: sightOf.player === me };
  })() : null;

  const cols = Array.from({ length: 10 }, (_, i) => i);
  const rowLabels = Array.from({ length: rows }, (_, i) => i);
  const square = (d: number) => coordOf(displayPos(me, d, rows), rows);
  return (
    <div className={`flb ${combatFx ? 'engaged' : ''}`} style={{ '--rows': rows } as CSSProperties} data-rows={rows}>
      <div className="flb-rim-cols bottom" aria-hidden="true">{cols.map((c) => <span key={c}>{square((rows - 1) * 10 + c)[0]}</span>)}</div>
      <div className="flb-rim-cols top" aria-hidden="true">{cols.map((c) => <span key={c}>{square(c)[0]}</span>)}</div>
      <div className="flb-rim-rows left" aria-hidden="true">{rowLabels.map((r) => <span key={r}>{square(r * 10).slice(1)}</span>)}</div>
      <div className="flb-rim-rows right" aria-hidden="true">{rowLabels.map((r) => <span key={r}>{square(r * 10).slice(1)}</span>)}</div>
      <div data-testid="fl-board" className="flb-field" style={{ gridTemplateColumns: 'repeat(10, var(--cell))', gridAutoRows: 'var(--cell)' }}>
        <Terrain flip={me === '1'} rows={rows} />
        {cells}
        {track && (
          <svg key={`${lastMove!.from}-${lastMove!.to}`} className={`flb-track ${track.mine ? 'mine' : 'theirs'}`} viewBox={`0 0 10 ${rows}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1={track.x1} y1={track.y1} x2={track.x2} y2={track.y2} pathLength={1} />
          </svg>
        )}
        {sight && (
          <svg key={`sight-${sightOf!.from}-${sightOf!.at}-${sight.live}`} className={`flb-sight ${sight.live ? 'live' : ''} ${sight.mine ? 'mine' : 'theirs'}`} viewBox={`0 0 10 ${rows}`} preserveAspectRatio="none" aria-hidden="true">
            <line x1={sight.x1} y1={sight.y1} x2={sight.x2} y2={sight.y2} />
          </svg>
        )}
      </div>
    </div>
  );
}
