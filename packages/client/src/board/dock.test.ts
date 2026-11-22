import { describe, expect, it } from 'vitest';
import { MAPS, createMapModel } from '@boboland/shared';
import { DOCK_PANEL, DOCK_ZONE } from './dock';
import { MIN_DOCK_SCALE, dockCorner, fitMapWithDock, fitViewBox, fitViewBoxWithDock } from './fit';

const SIZES = [[1204, 668], [1684, 888], [1100, 700], [2400, 900], [1600, 1000]] as const;
const IDS = Object.keys(DOCK_ZONE) as (keyof typeof DOCK_ZONE)[];

describe('fitViewBoxWithDock', () => {
  it.each(IDS)('%s: the docked corner is always inside the free zone and nothing is cropped', (id) => {
    const b = MAPS[id].bounds, content = { x: b.x, y: b.y, w: b.width, h: b.height };
    for (const [w, h] of SIZES) {
      const vb = fitViewBoxWithDock({ w, h }, content, DOCK_ZONE[id], DOCK_PANEL);
      const c = dockCorner({ w, h }, vb, DOCK_PANEL);
      expect(c.left, `${id} ${w}x${h} left`).toBeGreaterThanOrEqual(DOCK_ZONE[id].x0 - 1e-6);
      expect(c.top, `${id} ${w}x${h} top`).toBeGreaterThanOrEqual(DOCK_ZONE[id].y0 - 1e-6);
      expect(vb.w / vb.h).toBeCloseTo(w / h, 6);
      expect(vb.x).toBeLessThanOrEqual(content.x + 1e-9);
      expect(vb.y).toBeLessThanOrEqual(content.y + 1e-9);
      expect(vb.x + vb.w).toBeGreaterThanOrEqual(content.x + content.w - 1e-9);
      expect(vb.y + vb.h).toBeGreaterThanOrEqual(content.y + content.h - 1e-9);
    }
  });

  it('leaves a very wide window unchanged', () => {
    const content = { x: 0, y: 0, w: 1926.4, h: 1090 };
    const c = { w: 4000, h: 1090 };
    expect(fitViewBoxWithDock(c, content, DOCK_ZONE.usa, DOCK_PANEL)).toEqual(fitViewBox(c, content));
  });

  it('does not collapse the map in a tiny window', () => {
    const content = { x: 0, y: 0, w: 1926.4, h: 1090 };
    const c = { w: 300, h: 200 };
    expect(fitViewBoxWithDock(c, content, DOCK_ZONE.usa, DOCK_PANEL)).toEqual(fitViewBox(c, content));
  });
});

describe('fitMapWithDock', () => {
  const b = MAPS.usa.bounds, content = { x: b.x, y: b.y, w: b.width, h: b.height };
  it('keeps the map (almost) as large as the plain fit on laptop screens by shrinking the panel instead', () => {
    for (const [w, h] of [[1512, 700], [1440, 650], [1280, 600]]) {
      const { vb, scale } = fitMapWithDock({ w, h }, content, DOCK_ZONE.usa, DOCK_PANEL);
      expect(vb.w / fitViewBox({ w, h }, content).w, `${w}x${h}`).toBeLessThanOrEqual(1.1);
      expect(scale).toBeGreaterThanOrEqual(MIN_DOCK_SCALE);
      expect(scale).toBeLessThan(1);
    }
  });
  it('is the plain fit at full panel size on a big screen', () => {
    const c = { w: 1920, h: 950 };
    expect(fitMapWithDock(c, content, DOCK_ZONE.usa, DOCK_PANEL)).toEqual({ vb: fitViewBox(c, content), scale: 1 });
  });
});

describe('the dock zone is empty', () => {
  it.each(IDS)('%s: no city, label or car lies inside it', (id) => {
    const data = MAPS[id], m = createMapModel(data), z = DOCK_ZONE[id];
    const inside = (x: number, y: number) => x >= z.x0 && y >= z.y0;
    for (const c of data.cities) {
      const [x, y] = m.cityXY(c.id);
      expect(inside(x + 28, y + 28), `${c.id} node`).toBe(false); // hub radius is 26
      const w = c.name.length * 10.5, h = 18;
      const off = { t: [0, -18], b: [0, 27], l: [-15, 5], r: [15, 5], tl: [-11, -11], bl: [-11, 24] }[c.label as string] as [number, number];
      const right = c.label === 'l' || c.label === 'tl' || c.label === 'bl' ? x + off[0] : c.label === 'r' ? x + off[0] + w : x + off[0] + w / 2;
      const bottom = y + off[1] + h / 2;
      expect(inside(right, bottom), `${c.id} label`).toBe(false);
    }
    for (const r of data.routes) {
      for (const car of m.routeCars(r)) {
        const reach = Math.hypot(car.w, car.h) / 2;
        expect(inside(car.cx + reach, car.cy + reach), `${r.id} car`).toBe(false);
      }
    }
  });
});
