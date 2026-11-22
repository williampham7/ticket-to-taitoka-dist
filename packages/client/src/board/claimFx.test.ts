import { describe, expect, it } from 'vitest';
import { ROUTES, routeLane } from '@boboland/shared';
import { claimTiming, emuConsist, emuProgress, placeVehicle, roofSide, runsLeft, wirePath } from './claimFx';

describe('HSR claim celebration: the electric train', () => {
  it('runs a longer set on longer routes: two cars, then three, then four', () => {
    expect(emuConsist(1).map((c) => c.kind)).toEqual(['nose', 'tail']);
    expect(emuConsist(3).map((c) => c.kind)).toEqual(['nose', 'mid', 'tail']);
    expect(emuConsist(6).map((c) => c.kind)).toEqual(['nose', 'mid', 'mid', 'tail']);
  });

  it('leaves just before the cars start dropping and pulls in exactly when the cities ring', () => {
    for (const n of [1, 3, 6]) {
      const t = claimTiming(n);
      expect(emuProgress(0, t)).toBe(0);
      expect(emuProgress(t.start - 130, t)).toBe(0);
      expect(emuProgress(t.arrive, t)).toBeCloseTo(1);
      expect(emuProgress(t.total, t)).toBe(1);
      // never runs backwards
      let last = 0;
      for (let ms = 0; ms <= t.total; ms += 20) {
        const p = emuProgress(ms, t);
        expect(p).toBeGreaterThanOrEqual(last);
        last = p;
      }
    }
  });

  it('keeps the train the right way up: mirrored only when it runs right to left', () => {
    const lane = (pts: [number, number][]) => ({ pts, length: 1, at: () => ({ p: pts[0], t: [1, 0] as [number, number] }) });
    expect(runsLeft(lane([[0, 0], [10, 3]]))).toBe(false);
    expect(runsLeft(lane([[10, 0], [0, 3]]))).toBe(true);
  });

  it('hangs the wire on the roof side of the lane, whichever way the train runs', () => {
    const r = ROUTES.find((x) => x.curve === undefined)!;
    const lane = routeLane(r);
    const left = runsLeft(lane);
    const [, y] = roofSide(lane, lane.length / 2, 20, left);
    const mid = lane.at(lane.length / 2).p;
    // the roof is drawn upwards on screen (smaller y), or sideways on a vertical route
    expect(y).toBeLessThanOrEqual(mid[1] + 1e-6);
    expect(wirePath(lane, 10, lane.length - 10, 20, left)).toMatch(/^M[-\d.]+,[-\d.]+L/);
  });

  it('stands each vehicle on the lane, pointing along it', () => {
    for (const r of ROUTES.slice(0, 20)) {
      const lane = routeLane(r);
      const v = placeVehicle(lane, lane.length / 2 + 20, 40);
      const { p } = lane.at(lane.length / 2);
      expect(Math.hypot(v.x - p[0], v.y - p[1])).toBeLessThan(6);
    }
  });
});
