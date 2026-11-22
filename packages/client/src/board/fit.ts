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
