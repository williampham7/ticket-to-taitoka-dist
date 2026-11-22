import { describe, expect, it } from 'vitest';
import { MAPS, SKINS, cityNameIn, createMapModel, type CarSlot } from '@boboland/shared';
import { hubPlate, stationLabel, stationR } from './stationLabels';
import { DOCK_ZONE } from './dock';

type Box = { x: number; y: number; w: number; h: number };
const data = MAPS.china, model = createMapModel(data), skin = SKINS.beijing;
const hub = data.cities.find((c) => c.hub)!;
const labels = data.cities.filter((c) => !c.hub).map((c) => ({
  id: c.id,
  box: stationLabel(c, model.cityXY(c.id), cityNameIn(skin, c), c.zh).box,
}));
const plate = (() => { const p = hubPlate(model.cityXY(hub.id), cityNameIn(skin, hub), skin.zh); return { x: p.cx - p.w / 2, y: p.cy - p.h / 2, w: p.w, h: p.h }; })();
const boxes = [...labels, { id: `${hub.id} plate`, box: plate }];

const overlap = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
/** Points along a car's outline (corners, edge midpoints, centre). */
function carPoints(c: CarSlot): [number, number][] {
  const a = (c.angle * Math.PI) / 180, t = [Math.cos(a), Math.sin(a)], n = [-t[1], t[0]];
  const pts: [number, number][] = [];
  for (const u of [-1, -0.5, 0, 0.5, 1]) for (const v of [-1, 0, 1]) {
    pts.push([c.cx + t[0] * (c.w / 2) * u + n[0] * (c.h / 2) * v, c.cy + t[1] * (c.w / 2) * u + n[1] * (c.h / 2) * v]);
  }
  return pts;
}
const inside = ([x, y]: [number, number], b: Box, pad = 0) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;

describe('HSR station labels (China map)', () => {
  it('no two labels overlap, nor the hub plate', () => {
    const hits: string[] = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      if (overlap(boxes[i].box, boxes[j].box, 3)) hits.push(`${boxes[i].id}/${boxes[j].id}`);
    }
    expect(hits).toEqual([]);
  });

  it('no label covers a station', () => {
    const hits: string[] = [];
    for (const l of boxes) for (const c of data.cities) {
      if (l.id === c.id) continue;
      const [x, y] = model.cityXY(c.id), r = stationR(c) + 2;
      if (overlap(l.box, { x: x - r, y: y - r, w: 2 * r, h: 2 * r })) hits.push(`${l.id}/${c.id}`);
    }
    expect(hits).toEqual([]);
  });

  it('no label covers a train car (at most grazes the end of one in the crowded middle)', () => {
    const hits: string[] = [];
    for (const l of boxes) for (const r of data.routes) {
      const covered = model.routeCars(r).map((c) => carPoints(c).filter((p) => inside(p, l.box)).length);
      // 15 sample points per car: a label may clip a car's corner, never cover a third of one
      if (covered.some((n) => n > 4)) hits.push(`${l.id}/${r.id} ${covered.join(',')}`);
    }
    expect(hits).toEqual([]);
  });

  it('labels stay out of the docked ticket chooser', () => {
    const z = DOCK_ZONE.china;
    for (const l of boxes) expect(l.box.x + l.box.w >= z.x0 && l.box.y + l.box.h >= z.y0, l.id).toBe(false);
  });
});
