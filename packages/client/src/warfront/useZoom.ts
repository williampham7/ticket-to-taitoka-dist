import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pan (drag) and zoom (wheel, pinch, buttons) by moving the SVG viewBox. The viewBox always has the
 * container's shape, so a tall phone board shows the full height of the map and pans sideways.
 * A drag never counts as a click.
 */
export function useZoom(W: number, H: number) {
  const svg = useRef<SVGSVGElement | null>(null);
  const [aspect, setAspect] = useState(H / W);
  const [vb, setVb] = useState<{ x: number; y: number; w: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; vb: { x: number; y: number; w: number }; moved: boolean } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; w: number } | null>(null);
  const suppress = useRef(false);

  const maxW = Math.min(W, H / aspect);
  const clamp = useCallback((v: { x: number; y: number; w: number }) => {
    const w = Math.min(maxW, Math.max(W / 6, v.w)), h = w * aspect;
    return { w, x: Math.min(W - w, Math.max(0, v.x)), y: Math.min(H - h, Math.max(0, v.y)) };
  }, [W, H, aspect, maxW]);
  const full = useCallback(() => clamp({ w: maxW, x: (W - maxW) / 2 + (maxW < W ? W * 0.04 : 0), y: 0 }), [clamp, maxW, W]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setAspect(r.height / r.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const view = vb ? clamp(vb) : full();

  const scaleOf = () => view.w / (svg.current?.getBoundingClientRect().width || 1);
  const zoomAt = useCallback((cx: number | null, cy: number | null, k: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    setVb((old) => {
      const v = old ? clamp(old) : full();
      const s = v.w / r.width;
      const p = cx === null ? { x: v.x + v.w / 2, y: v.y + (v.w * aspect) / 2 } : { x: v.x + (cx - r.left) * s, y: v.y + (cy! - r.top) * s };
      const w = Math.min(maxW, Math.max(W / 6, v.w * k));
      return clamp({ w, x: p.x - ((p.x - v.x) * w) / v.w, y: p.y - ((p.y - v.y) * w) / v.w });
    });
  }, [clamp, full, aspect, maxW, W]);

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.15 : 1 / 1.15); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [zoomAt]);

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.current.size === 2) {
        const [a, b] = [...pts.current.values()];
        pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), w: view.w };
      } else drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, vb: view, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pts.current.has(e.pointerId)) return;
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current && pts.current.size === 2) {
        const [a, b] = [...pts.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const w = (pinch.current.w * pinch.current.d) / d;
        setVb({ ...view, x: view.x + (view.w - w) / 2, y: view.y + ((view.w - w) * aspect) / 2, w });
        suppress.current = true;
        return;
      }
      const g = drag.current;
      if (!g || g.id !== e.pointerId) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      if (!g.moved) { g.moved = true; svg.current?.setPointerCapture(e.pointerId); }
      const s = scaleOf();
      setVb({ w: g.vb.w, x: g.vb.x - dx * s, y: g.vb.y - dy * s });
      suppress.current = true;
    },
    onPointerUp: (e: React.PointerEvent) => {
      pts.current.delete(e.pointerId);
      if (pts.current.size < 2) pinch.current = null;
      if (drag.current?.id === e.pointerId) drag.current = null;
      setTimeout(() => { suppress.current = false; }, 0);
    },
    onPointerCancel: (e: React.PointerEvent) => { pts.current.delete(e.pointerId); pinch.current = null; drag.current = null; },
    onClickCapture: (e: React.MouseEvent) => { if (suppress.current) { e.stopPropagation(); e.preventDefault(); } },
  };
  return {
    svg, handlers, viewBox: `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${(view.w * aspect).toFixed(1)}`,
    zoomed: view.w < maxW - 1,
    zoomIn: () => zoomAt(null, null, 1 / 1.4), zoomOut: () => zoomAt(null, null, 1.4), fit: () => setVb(null),
  };
}
