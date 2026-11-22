import { describe, expect, it } from 'vitest';
import { MAPS } from '@boboland/shared';
import { chinaOutline } from './ChinaGeoLayer';

type LL = [number, number];
const inside = ([x, y]: LL, poly: LL[]) => {
  let r = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
};

describe("China's outline (lighter land than its neighbours)", () => {
  const outline = chinaOutline();

  it('is one clean ring: no straight chord cuts across the country', () => {
    const p = outline.map((q) => MAPS.china.project(q));
    const longest = Math.max(...p.map((a, i) => { const b = p[(i + 1) % p.length]; return Math.hypot(a[0] - b[0], a[1] - b[1]); }));
    expect(longest).toBeLessThan(80);
  });

  it('holds the inland cities and not the neighbours', () => {
    for (const id of ['BOB', 'URC', 'KRL', 'LXA', 'CTU', 'WUH', 'HRB', 'KMG', 'XIY', 'CGO']) {
      const c = MAPS.china.cities.find((c) => c.id === id)!;
      expect(inside([c.lon, c.lat], outline), id).toBe(true);
    }
    const neighbours: [string, LL][] = [['Ulaanbaatar', [106.9, 47.9]], ['Seoul', [127, 37.5]], ['Hanoi', [105.8, 21]], ['Kathmandu', [85.3, 27.7]], ['Almaty', [76.9, 43.2]], ['Taipei', [121.5, 25]]];
    for (const [name, ll] of neighbours) expect(inside(ll, outline), name).toBe(false);
  });
});
