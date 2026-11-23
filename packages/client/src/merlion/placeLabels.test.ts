import { describe, expect, it } from 'vitest';
import { MAPS, SKINS, cityNameIn, createMapModel, type CarSlot } from '@boboland/shared';
import { planLabels, nodeR, type Box, type LabelSide } from './placeLabels';
import { DOCK_ZONE } from '../board/dock';

const data = MAPS.sg, model = createMapModel(data), skin = SKINS.singapore;
const hub = data.cities.find((c) => c.hub)!;
const [hx, hy] = model.cityXY(hub.id);
const b = hub.banner ?? [0, 64];
const plate: Box = { x: hx + b[0] - 75, y: hy + b[1] - 15, w: 150, h: 30 };
const dock: Box = { x: DOCK_ZONE.sg.x0, y: DOCK_ZONE.sg.y0, w: 900, h: 900 };
const places = data.cities.filter((c) => !c.hub).map((c) => ({ id: c.id, xy: model.cityXY(c.id), name: cityNameIn(skin, c), side: c.label as LabelSide, special: !!c.special }));
const cars: CarSlot[] = data.routes.flatMap((r) => model.routeCars(r));
const plan = planLabels(places, cars, [plate, dock]);
const overlap = (a: Box, c: Box, pad = 0) => a.x < c.x + c.w + pad && c.x < a.x + a.w + pad && a.y < c.y + c.h + pad && c.y < a.y + a.h + pad;

describe('Singapore place labels', () => {
  it('names every place', () => { expect(plan.size).toBe(places.length); });
  it('no two names overlap, nor the hub plate or the dock zone', () => {
    const all = [...plan.values()], hits: string[] = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) if (overlap(all[i].box, all[j].box)) hits.push(`${all[i].id}/${all[j].id}`);
      if (overlap(all[i].box, plate) || overlap(all[i].box, dock)) hits.push(`${all[i].id}/fixed`);
    }
    expect(hits).toEqual([]);
  });
  it('no name covers a place', () => {
    const hits: string[] = [];
    for (const l of plan.values()) for (const p of places) {
      const r = nodeR(p.special);
      if (overlap(l.box, { x: p.xy[0] - r, y: p.xy[1] - r, w: 2 * r, h: 2 * r })) hits.push(`${l.id}/${p.id}`);
    }
    expect(hits).toEqual([]);
  });
  it('no name covers a train car (a name may graze the end of one in the crowded centre)', () => {
    const hits: string[] = [];
    for (const l of plan.values()) for (const c of cars) {
      const a = (c.angle * Math.PI) / 180;
      const pts = [-1, -0.5, 0, 0.5, 1].map((u) => [c.cx + Math.cos(a) * (c.w / 2) * u, c.cy + Math.sin(a) * (c.w / 2) * u]);
      // five sample points per car: touching one end is a graze, covering three is a hit
      if (pts.filter(([x, y]) => x > l.box.x && x < l.box.x + l.box.w && y > l.box.y && y < l.box.y + l.box.h).length >= 3) hits.push(`${l.id}`);
    }
    expect([...new Set(hits)]).toEqual([]);
  });
});
