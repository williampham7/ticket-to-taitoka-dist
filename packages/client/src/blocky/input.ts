import { canPlace, cellsOf, fits, orientations, type BView, type Guild, type PieceId, type Place, type Reason } from '@boboland/shared/src/blocky';

/** Pure input maths for the board (all in cells). The drag hook and the screen use these; input.test.ts pins them. */
export interface Box { x: number; y: number; w: number; h: number }
export interface Rect { left: number; top: number; width: number; height: number }
export interface Pt { r: number; c: number }

/** Client point → fractional board cell, for an SVG with this viewBox drawn `xMidYMin meet` in `rect`. */
export function cellAt(pt: { x: number; y: number }, rect: Rect, box: Box): Pt {
  const k = Math.min(rect.width / box.w, rect.height / box.h);
  const ox = (rect.width - box.w * k) / 2;
  return { c: (pt.x - rect.left - ox) / k + box.x, r: (pt.y - rect.top) / k + box.y };
}
/** Fingers hide what they hold: on touch the ghost floats 1.5 cells above the finger. */
export const TOUCH_LIFT = 1.5;
/** On touch the ghost floats above the finger: 1.5 cells, and never less than 56 px (pass the cell size in px). */
export const ghostCell = (finger: Pt, pointerType: string, cellPx = 40): Pt => (pointerType === 'touch' ? { r: finger.r - Math.max(TOUCH_LIFT, 56 / cellPx), c: finger.c } : finger);
/** The shape cell a held piece hangs from (nearest its middle). */
export function grabOf(piece: PieceId, orient: number): [number, number] {
  const sh = orientations(piece)[orient];
  const mr = (sh.h - 1) / 2, mc = (sh.w - 1) / 2;
  return sh.cells.reduce((b, x) => (Math.hypot(x[0] - mr, x[1] - mc) < Math.hypot(b[0] - mr, b[1] - mc) ? x : b));
}
/** The fractional origin (top-left of the shape) when its grab cell's centre sits at `p`. */
export const originAt = (p: Pt, piece: PieceId, orient: number): Pt => { const g = grabOf(piece, orient); return { r: p.r - g[0] - 0.5, c: p.c - g[1] - 0.5 }; };
const atOf = (size: number, r: number, c: number) => (r < 0 || c < 0 || r >= size || c >= size ? -1 : r * size + c);

/** Magnetic snap: the nearest legal placement among the surrounding grid origins within ¾ cell of the ghost. */
export function snap(s: BView, guild: Guild, piece: PieceId, orient: number, origin: Pt): Place | null {
  const cand: { p: Place; d: number }[] = [];
  for (const r of [Math.floor(origin.r), Math.ceil(origin.r)]) for (const c of [Math.floor(origin.c), Math.ceil(origin.c)]) {
    const d = Math.hypot(origin.r - r, origin.c - c);
    if (d > 0.75) continue;
    const p = { piece, orient, at: atOf(s.size, r, c) };
    if (p.at >= 0 && !canPlace(s, guild, p)) cand.push({ p, d });
  }
  cand.sort((a, b) => a.d - b.d);
  return cand[0]?.p ?? null;
}
/** The rounded placement under the ghost (legal or not), for the reason line. */
export function nearest(s: BView, piece: PieceId, orient: number, origin: Pt): Place {
  return { piece, orient, at: atOf(s.size, Math.round(origin.r), Math.round(origin.c)) };
}
/** Every placement of this piece that covers the anchor, orientation first: Space cycles through these. */
export function fitCycle(s: BView, guild: Guild, piece: PieceId, anchor: number): Place[] {
  return fits(s, guild, piece).filter((p) => cellsOf(s.size, p).includes(anchor)).sort((a, b) => a.orient - b.orient || a.at - b.at);
}
/** Tapping a glowing anchor while holding a piece: the current orientation if it fits there, else the first that does. */
export function tapAnchor(s: BView, guild: Guild, piece: PieceId, orient: number, anchor: number): Place | null {
  const all = fitCycle(s, guild, piece, anchor);
  return all.find((p) => p.orient === orient) ?? all[0] ?? null;
}
/** The cells to flash red for an illegal ghost: the overlaps, the cells touching your own guild along an edge, or the whole piece. */
export function badCells(s: BView, guild: Guild, p: Place, origin: Pt): { reason: Reason; cells: number[] } {
  const size = s.size, sh = orientations(p.piece)[p.orient];
  const r0 = Math.round(origin.r), c0 = Math.round(origin.c);
  const on = sh.cells.map(([r, c]) => [r0 + r, c0 + c]).filter(([r, c]) => r >= 0 && c >= 0 && r < size && c < size).map(([r, c]) => r * size + c);
  const reason = p.at < 0 ? 'offBoard' : (canPlace(s, guild, p) ?? 'offBoard');
  const own = (i: number) => s.cells[i] >= 0 && s.placed[s.cells[i]].guild === guild;
  if (reason === 'overlap') return { reason, cells: on.filter((i) => s.cells[i] >= 0) };
  if (reason === 'ownEdge') return { reason, cells: on.filter((i) => { const r = Math.floor(i / size), c = i % size; return [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => r + dr >= 0 && c + dc >= 0 && r + dr < size && c + dc < size && own((r + dr) * size + c + dc)); }) };
  return { reason, cells: on };
}

/** Confirm placements: on, off, or follow the device (touch and pen confirm, mouse commits). */
export type ConfirmPref = 'auto' | 'on' | 'off';
export const needsConfirm = (pref: ConfirmPref, pointerType: string) => pref === 'on' || (pref === 'auto' && pointerType !== 'mouse');

/** A pending placement survives a new display state only if it is still mine, still legal, and no reconnect jump happened. */
export interface Pending { guild: Guild; place: Place; pointerType: string }
export function keepPending(p: Pending | null, v: BView, me: string | null, jumped: boolean): Pending | null {
  if (!p || jumped || !me || v.result || v.actor !== me || v.current !== p.guild) return null;
  return canPlace(v, p.guild, p.place) ? null : p;
}
