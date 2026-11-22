import { describe, expect, it } from 'vitest';
import { MAPS, type MapId } from '@boboland/shared';
import { examplesFor } from './HowToPlay';

describe('rules guide examples', () => {
  it.each(Object.keys(MAPS) as MapId[])('on the %s map, every example ticket joins two real cities', (id) => {
    const cities = new Set(MAPS[id].cities.map((c) => c.id));
    const ex = examplesFor(id, 'Hub');
    for (const t of [ex.intro, ex.done, ex.failed]) {
      expect(cities.has(t.a), `${id} ${t.a}`).toBe(true);
      expect(cities.has(t.b), `${id} ${t.b}`).toBe(true);
    }
  });
});
