import type { CarSlot } from '@boboland/shared';

/**
 * Place-name labels for the Singapore board. Pure geometry in map units: for every place it tries the eight
 * sides at a few distances and picks the spot that keeps the name off the train cars, the other places, the
 * other names and the hub plate, staying as close as it can to the side the map data asks for. Derived from
 * the live city positions (nothing is hard-coded), so a nudged coordinate re-flows its neighbours.
 */
export type LabelSide = 't' | 'b' | 'l' | 'r' | 'tl' | 'tr' | 'bl' | 'br';
export interface Box { x: number; y: number; w: number; h: number }
export interface PlaceIn { id: string; xy: [number, number]; name: string; side: LabelSide; special?: boolean }
export interface PlacedLabel { id: string; x: number; y: number; anchor: 'start' | 'middle' | 'end'; size: number; weight: number; box: Box }

export const LABEL_SIZE = { normal: 14.5, special: 15.5 };
/** Poppins is wide: about 0.6 em per glyph at weights 600/700 (slightly generous so the test errs safe). */
const ADV = 0.61;
export const nodeR = (special?: boolean) => (special ? 12.6 : 9);
const PAD = 2.5;

const overlap = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Label width and height in map units (the halo is not counted; PAD covers it). */
export function textBox(name: string, special?: boolean): { w: number; h: number; size: number; weight: number } {
  const size = special ? LABEL_SIZE.special : LABEL_SIZE.normal;
  return { w: name.length * size * ADV + (special ? 2 : 0), h: size * 1.05, size, weight: special ? 700 : 600 };
}

function candidates(p: PlaceIn): (PlacedLabel & { cost: number })[] {
  const [px, py] = p.xy;
  const t = textBox(p.name, p.special);
  const R = nodeR(p.special);
  const out: (PlacedLabel & { cost: number })[] = [];
  const sides: LabelSide[] = ['r', 'l', 't', 'b', 'tr', 'tl', 'br', 'bl'];
  for (const side of sides) for (const gap of [3, 10, 19, 30]) for (const shift of [0, -9, 9, -18, 18]) {
    // 'shift' slides the name along the side (up/down for l/r, left/right for t/b)
    const vertical = side === 't' || side === 'b';
    const d = R * 0.72 + gap;
    let x: number, base: number, anchor: PlacedLabel['anchor'];
    switch (side) {
      case 'r': anchor = 'start'; x = px + R + gap; base = py + t.size * 0.35 + shift; break;
      case 'l': anchor = 'end'; x = px - R - gap; base = py + t.size * 0.35 + shift; break;
      case 't': anchor = 'middle'; x = px + shift * 2; base = py - R - gap - t.size * 0.18; break;
      case 'b': anchor = 'middle'; x = px + shift * 2; base = py + R + gap + t.size * 0.8; break;
      case 'tr': anchor = 'start'; x = px + d + shift; base = py - d; break;
      case 'tl': anchor = 'end'; x = px - d + shift; base = py - d; break;
      case 'br': anchor = 'start'; x = px + d + shift; base = py + d + t.size * 0.8; break;
      default: anchor = 'end'; x = px - d + shift; base = py + d + t.size * 0.8; break; // bl
    }
    if (!vertical && shift !== 0 && (side === 'tr' || side === 'tl' || side === 'br' || side === 'bl')) continue;
    const bx = anchor === 'start' ? x : anchor === 'end' ? x - t.w : x - t.w / 2;
    const box = { x: bx, y: base - t.size * 0.8, w: t.w, h: t.h };
    const cost = (side === p.side ? 0 : 4) + gap * 0.35 + Math.abs(shift) * 0.25;
    out.push({ id: p.id, x, y: base, anchor, size: t.size, weight: t.weight, box, cost });
  }
  return out;
}

/** How badly a label box collides with what is around it (0 = clean). */
function clash(c: PlacedLabel, own: PlaceIn, places: PlaceIn[], cars: CarSlot[], fixed: Box[], placed: Map<string, PlacedLabel>): number {
  let bad = 0;
  const b = c.box;
  // train cars: sample five points along each car's axis; a car is hit when one lies inside the box grown by half a car
  for (const car of cars) {
    const a = (car.angle * Math.PI) / 180, tx = Math.cos(a), ty = Math.sin(a);
    let hit = 0;
    for (const u of [-1, -0.5, 0, 0.5, 1]) {
      const x = car.cx + tx * (car.w / 2) * u, y = car.cy + ty * (car.w / 2) * u;
      const g = car.h / 2 + PAD;
      if (x > b.x - g && x < b.x + b.w + g && y > b.y - g && y < b.y + b.h + g) hit++;
    }
    if (hit) bad += 40 * hit;
  }
  for (const o of places) {
    if (o.id === own.id) continue;
    const r = nodeR(o.special) + PAD + 1;
    if (overlap(b, { x: o.xy[0] - r, y: o.xy[1] - r, w: 2 * r, h: 2 * r })) bad += 400;
  }
  const r0 = nodeR(own.special) + 2;
  if (overlap(b, { x: own.xy[0] - r0, y: own.xy[1] - r0, w: 2 * r0, h: 2 * r0 })) bad += 400;
  for (const f of fixed) if (overlap(b, f, 1)) bad += 400;
  for (const [id, l] of placed) if (id !== c.id && overlap(b, l.box, PAD)) bad += 300 + Math.min(b.w, l.box.w);
  return bad;
}

/**
 * `fixed` are boxes the names must stay out of (the hub's name plate, the docked ticket chooser's zone).
 * Greedy by how cramped a place is, then three passes of re-choosing each name against the rest.
 */
export function planLabels(places: PlaceIn[], cars: CarSlot[], fixed: Box[] = []): Map<string, PlacedLabel> {
  const placed = new Map<string, PlacedLabel>();
  const cand = new Map(places.map((p) => [p.id, candidates(p)] as const));
  const pick = (p: PlaceIn) => {
    let best: PlacedLabel | null = null, bestScore = Infinity;
    for (const c of cand.get(p.id)!) {
      const s = c.cost + clash(c, p, places, cars, fixed, placed);
      if (s < bestScore) { bestScore = s; best = c; }
    }
    return best!;
  };
  const free = (p: PlaceIn) => cand.get(p.id)!.filter((c) => clash(c, p, places, cars, fixed, new Map()) === 0).length;
  const order = [...places].sort((a, b) => free(a) - free(b));
  for (const p of order) placed.set(p.id, pick(p));
  for (let pass = 0; pass < 3; pass++) for (const p of order) { placed.delete(p.id); placed.set(p.id, pick(p)); }
  return placed;
}
