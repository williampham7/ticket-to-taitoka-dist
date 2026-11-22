import { describe, expect, it } from 'vitest';
import { ROUTE_BY_ID, routeSegment } from '@boboland/shared';
import { fitViewBox } from './fit';
import { carRects } from './geometry';

describe('fitViewBox', () => {
  const content = { x: 0, y: 0, w: 1720, h: 1090 };

  it.each([1.2, 1.6, 2.2, 3])('fitViewBox covers container aspect %f without cropping the map', (aspect) => {
    const vb = fitViewBox({ w: aspect * 600, h: 600 }, content);
    expect(vb.w / vb.h).toBeCloseTo(aspect, 6);
    expect(vb.x).toBeLessThanOrEqual(content.x);
    expect(vb.y).toBeLessThanOrEqual(content.y);
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(content.x + content.w - 1e-9);
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(content.y + content.h - 1e-9);
  });

  it('keeps the map centred in the extra space', () => {
    const vb = fitViewBox({ w: 2200, h: 600 }, content);
    expect(vb.x + vb.w / 2).toBeCloseTo(content.w / 2, 6);
  });

  it('falls back to the content box for an empty container', () => {
    expect(fitViewBox({ w: 0, h: 0 }, content)).toEqual(content);
  });
});

describe('carRects', () => {
  it('lays one car per unit of length along the lane, inside the segment', () => {
    const route = ROUTE_BY_ID['SPO-BOI'];
    const cars = carRects(route);
    expect(cars).toHaveLength(route.length);
    const [[x1, y1], [x2, y2]] = routeSegment(route);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (const c of cars) {
      expect(c.angle).toBeCloseTo(angle, 6);
      expect(c.w).toBeGreaterThan(20);
      // perpendicular distance from the lane's centre line is ~0
      const cross = ((x2 - x1) * (c.cy - y1) - (y2 - y1) * (c.cx - x1)) / len;
      expect(Math.abs(cross)).toBeLessThan(1e-6);
      const along = ((c.cx - x1) * (x2 - x1) + (c.cy - y1) * (y2 - y1)) / len;
      expect(along - c.w / 2).toBeGreaterThan(0);
      expect(along + c.w / 2).toBeLessThan(len);
    }
  });

  it('cars do not overlap', () => {
    const cars = carRects(ROUTE_BY_ID['SPO-BIL']);
    for (let i = 1; i < cars.length; i++) {
      const d = Math.hypot(cars[i].cx - cars[i - 1].cx, cars[i].cy - cars[i - 1].cy);
      expect(d).toBeGreaterThan(cars[i].w);
    }
  });
});

describe('route-claim celebration timing', () => {
  it('drops each car in order while the train travels, and finishes within a few seconds', async () => {
    const { claimTiming } = await import('./claimFx');
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const t = claimTiming(n);
      expect(t.drops).toHaveLength(n);
      for (let i = 1; i < n; i++) expect(t.drops[i]).toBeGreaterThan(t.drops[i - 1]);
      expect(t.drops[0]).toBeGreaterThanOrEqual(t.start);
      expect(t.drops[n - 1]).toBeLessThanOrEqual(t.arrive);
      expect(t.total).toBeGreaterThanOrEqual(1000);
      expect(t.total).toBeLessThanOrEqual(4600);
    }
  });

  it('takes its time: the star animation lets the train be enjoyed, about a third of a second per car and more', async () => {
    const { claimTiming } = await import('./claimFx');
    expect(claimTiming(1).travel).toBeGreaterThanOrEqual(850);
    expect(claimTiming(6).travel).toBeGreaterThanOrEqual(2400);
    expect(claimTiming(6).travel).toBeLessThanOrEqual(3000);
  });
});
