export interface Box { x: number; y: number; w: number; h: number }

/** Grow the content box along one axis to match the container's aspect ratio (cover, never crop). */
export function fitViewBox(container: { w: number; h: number }, content: Box): Box {
  if (container.w <= 0 || container.h <= 0) return content;
  const aspect = container.w / container.h;
  if (aspect >= content.w / content.h) {
    const w = content.h * aspect;
    return { x: content.x - (w - content.w) / 2, y: content.y, w, h: content.h };
  }
  const h = content.w / aspect;
  return { x: content.x, y: content.y - (h - content.h) / 2, w: content.w, h };
}

export interface DockZone { x0: number; y0: number }
export interface DockPanel { w: number; h: number; margin: number }

/** The docked panel's top-left corner, in map units, for a given view box. */
export function dockCorner(container: { w: number; h: number }, vb: Box, panel: DockPanel) {
  const s = container.w / vb.w;
  return { left: vb.x + (container.w - panel.margin - panel.w) / s, top: vb.y + (container.h - panel.margin - panel.h) / s };
}

/**
 * Like fitViewBox, but grows the box to the right and downward just enough that a panel docked in the
 * container's bottom-right corner lies entirely in the empty `zone` (map units, running to the right and bottom).
 * Wide windows are unchanged.
 */
export function fitViewBoxWithDock(container: { w: number; h: number }, content: Box, zone: DockZone, panel: DockPanel): Box {
  const plain = fitViewBox(container, content);
  if (container.w < (panel.w + panel.margin) * 1.5 || container.h < (panel.h + panel.margin) * 1.5) return plain;
  const ok = (vb: Box) => { const c = dockCorner(container, vb, panel); return c.left >= zone.x0 && c.top >= zone.y0; };
  if (ok(plain)) return plain;
  const search = (test: (v: number) => boolean) => {
    let lo = 0, hi = 3000;
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (test(mid)) hi = mid; else lo = mid; }
    return hi;
  };
  const grow = (e: number, f: number) => fitViewBox(container, { ...content, w: content.w + e, h: content.h + f });
  const e = search((v) => dockCorner(container, grow(v, 0), panel).left >= zone.x0);
  const f = search((v) => dockCorner(container, grow(e, v), panel).top >= zone.y0);
  return grow(e, f);
}

/** The smallest the docked panel is drawn (a fraction of its full size) before the map is allowed to zoom out instead. */
export const MIN_DOCK_SCALE = 0.78;
/** How much extra zoom-out (1 = none) the dock may cost the map before the panel shrinks to avoid it. */
const MAX_DOCK_ZOOM_OUT = 1.03;

/**
 * Fit the map to the container, keeping the docked panel clear of the map. On small screens the panel is drawn
 * smaller (`scale`) so the map stays as large as on a desktop; only below MIN_DOCK_SCALE does the map zoom out.
 */
export function fitMapWithDock(container: { w: number; h: number }, content: Box, zone: DockZone, panel: DockPanel): { vb: Box; scale: number } {
  const plain = fitViewBox(container, content);
  const at = (scale: number) => fitViewBoxWithDock(container, content, zone, { ...panel, w: panel.w * scale, h: panel.h * scale });
  for (let i = 0; ; i++) {
    const scale = Math.max(MIN_DOCK_SCALE, 1 - i * 0.02), vb = at(scale);
    if (vb.w / plain.w <= MAX_DOCK_ZOOM_OUT || scale === MIN_DOCK_SCALE) return { vb, scale };
  }
}

/** A rectangle in container pixels (left, top, right, bottom). */
export interface ScreenRect { x0: number; y0: number; x1: number; y1: number }

export interface PieceFitOptions {
  /** gap (container px) kept between the outermost pieces and the container's edges */
  pad: number;
  /** screen areas no piece may lie under (floating buttons); the docked panel is added by fitPiecesWithDock */
  keepOut: ScreenRect[];
}

const union = (pieces: Box[]) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pieces) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h); }
  return { x0, y0, x1, y1 };
};

/** Candidate positions in [lo, hi] (lo <= hi), nearest to `mid` first. */
function spread(lo: number, hi: number, mid: number, n = 9): number[] {
  if (hi - lo < 1e-9) return [lo];
  const vals = Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
  vals.push(Math.min(hi, Math.max(lo, mid)));
  return vals.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid));
}

/** A view box at zoom `s` (container px per map unit) that keeps every piece inside the container and clear of keepOut, or null. */
function placeAt(container: { w: number; h: number }, pieces: Box[], u: ReturnType<typeof union>, s: number, opt: PieceFitOptions): Box | null {
  const { w: W, h: H } = container, pad = opt.pad / s;
  // the view box origin (map units) runs over [lo, hi] on each axis with the pieces inside the padded container
  const xs = spread(u.x1 + pad - W / s, u.x0 - pad, (u.x0 + u.x1) / 2 - W / s / 2);
  const ys = spread(u.y1 + pad - H / s, u.y0 - pad, (u.y0 + u.y1) / 2 - H / s / 2);
  if (xs[0] > u.x0 - pad + 1e-9 || ys[0] > u.y0 - pad + 1e-9) return null;
  const cands = xs.flatMap((x) => ys.map((y) => ({ x, y, d: Math.hypot((x - xs[0]) * s / W, (y - ys[0]) * s / H) }))).sort((a, b) => a.d - b.d);
  for (const { x, y } of cands) {
    const clear = opt.keepOut.every((r) => {
      // the keep-out rect in map units
      const rx0 = x + r.x0 / s, ry0 = y + r.y0 / s, rx1 = x + r.x1 / s, ry1 = y + r.y1 / s;
      return pieces.every((p) => p.x >= rx1 || p.x + p.w <= rx0 || p.y >= ry1 || p.y + p.h <= ry0);
    });
    if (clear) return { x, y, w: W / s, h: H / s };
  }
  return null;
}

/**
 * Zoom in as far as possible on the playable pieces (cars, city dots, labels; map units): every piece stays inside the
 * container (`pad` px from its edges) and out from under the keepOut rects. Water and land around them may be cropped.
 */
export function fitPieces(container: { w: number; h: number }, pieces: Box[], opt: PieceFitOptions): Box {
  const u = union(pieces), { w: W, h: H } = container;
  if (W <= 0 || H <= 0 || !pieces.length) return { x: u.x0, y: u.y0, w: u.x1 - u.x0, h: u.y1 - u.y0 };
  const sMax = Math.min((W - 2 * opt.pad) / (u.x1 - u.x0), (H - 2 * opt.pad) / (u.y1 - u.y0));
  if (sMax <= 0) return fitViewBox(container, { x: u.x0, y: u.y0, w: u.x1 - u.x0, h: u.y1 - u.y0 });
  const best = placeAt(container, pieces, u, sMax, opt);
  if (best) return best;
  let lo = sMax * 0.3, hi = sMax, found: Box | null = null;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2, vb = placeAt(container, pieces, u, mid, opt);
    if (vb) { lo = mid; found = vb; } else hi = mid;
  }
  return found ?? placeAt(container, pieces, u, lo, { ...opt, keepOut: [] })!;
}

/**
 * fitPieces with the docked panel in the container's bottom-right corner kept clear of every piece. Like
 * fitMapWithDock, the panel shrinks (down to MIN_DOCK_SCALE) before the map zooms out more than MAX_DOCK_ZOOM_OUT for it.
 */
export function fitPiecesWithDock(container: { w: number; h: number }, pieces: Box[], opt: PieceFitOptions, panel: DockPanel): { vb: Box; scale: number } {
  const plain = fitPieces(container, pieces, opt);
  const { w: W, h: H } = container;
  if (W < (panel.w + panel.margin) * 1.5 || H < (panel.h + panel.margin) * 1.5) return { vb: plain, scale: 1 };
  const at = (scale: number) => fitPieces(container, pieces, {
    ...opt, keepOut: [...opt.keepOut, { x0: W - panel.margin - panel.w * scale, y0: H - panel.margin - panel.h * scale, x1: W, y1: H }],
  });
  for (let i = 0; ; i++) {
    const scale = Math.max(MIN_DOCK_SCALE, 1 - i * 0.02), vb = at(scale);
    if (vb.w / plain.w <= MAX_DOCK_ZOOM_OUT || scale === MIN_DOCK_SCALE) return { vb, scale };
  }
}
