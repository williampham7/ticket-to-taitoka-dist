import type { Lane } from '@boboland/shared';

/** Timeline of the route-claim celebration (ms from the moment the claim arrives). */
export interface ClaimTiming { start: number; travel: number; drops: number[]; arrive: number; total: number }

export function claimTiming(cars: number): ClaimTiming {
  const start = 250;
  // unhurried on purpose: the train run is the game's star moment
  const travel = 560 + 330 * cars;
  const drops = Array.from({ length: cars }, (_, i) => start + ((i + 0.6) / cars) * travel);
  const arrive = start + travel;
  return { start, travel, drops, arrive, total: arrive + 900 };
}

/* ---------- HSR theme: the electric multiple unit (EMU) and its overhead line ---------- */

type XY = [number, number];

/** One vehicle of the EMU: a driving car (nose or tail) or a middle car, its length in its own drawing units. */
export interface EmuPiece { kind: 'nose' | 'mid' | 'tail'; len: number }
export const EMU_NOSE = 40;
export const EMU_MID = 26;
/** Gap between two vehicles (the gangway), in drawing units. */
export const EMU_GAP = 1.6;
/** Drawing units -> map units. */
export const EMU_SCALE = 1.6;
/** Height of the contact wire above the rails, in drawing units (the raised pantograph touches it). */
export const EMU_WIRE_Y = 19.4;
/** Where the rails are in the drawing (y grows downwards, so the train stands just above the lane's centre line). */
export const EMU_RAIL_Y = 4.5;

/** Short routes get a two-car set, longer ones three or four cars. */
export function emuConsist(routeCars: number): EmuPiece[] {
  const mids = routeCars <= 2 ? 0 : routeCars <= 4 ? 1 : 2;
  return [
    { kind: 'nose', len: EMU_NOSE },
    ...Array.from({ length: mids }, (): EmuPiece => ({ kind: 'mid', len: EMU_MID })),
    { kind: 'tail', len: EMU_NOSE },
  ];
}

/**
 * Does the train run right-to-left? Then it is drawn mirrored top-to-bottom as well as rotated, so the
 * side-on train is always the right way up (roof and pantograph on top) whichever way the route goes.
 */
export function runsLeft(lane: Lane): boolean {
  const a = lane.pts[0], b = lane.pts[lane.pts.length - 1];
  return b[0] - a[0] < -1e-6 || (Math.abs(b[0] - a[0]) <= 1e-6 && b[1] < a[1]);
}

/**
 * Where the head of the train is at `ms` after the claim: it slides out of the first city, cruises, and
 * brakes to a halt at the second city's platform exactly when the cities ring (`arrive`).
 * Returns a fraction 0..1 of the run.
 */
export function emuProgress(ms: number, t: ClaimTiming): number {
  const from = t.start - 130, u = Math.max(0, Math.min(1, (ms - from) / (t.arrive - from)));
  // mostly a steady cruise, eased gently at both ends (departure and braking)
  const smooth = u * u * u * (u * (u * 6 - 15) + 10);
  return 0.45 * u + 0.55 * smooth;
}

/**
 * A rigid vehicle on the lane, its front at distance `front` along it: it stands on its two bogies, so on
 * a curve it follows the chord between them, like a real carriage. Distances beyond the lane carry on straight.
 */
export function placeVehicle(lane: Lane, front: number, len: number): { x: number; y: number; angle: number } {
  const f = lane.at(front - len * 0.18).p, b = lane.at(front - len * 0.82).p;
  return { x: (f[0] + b[0]) / 2, y: (f[1] + b[1]) / 2, angle: (Math.atan2(f[1] - b[1], f[0] - b[0]) * 180) / Math.PI };
}

/** A point `h` map units to the train's roof side of the lane at distance `s` (where the catenary hangs). */
export function roofSide(lane: Lane, s: number, h: number, left: boolean): XY {
  const { p, t } = lane.at(s);
  const k = left ? -h : h;
  return [p[0] + t[1] * k, p[1] - t[0] * k];
}

/** The contact wire between distances `s0` and `s1` along the lane, as an SVG path (curves are sampled). */
export function wirePath(lane: Lane, s0: number, s1: number, h: number, left: boolean): string {
  const n = lane.pts.length > 2 ? Math.max(2, Math.ceil((s1 - s0) / 6)) : 1;
  return Array.from({ length: n + 1 }, (_, i) => {
    const [x, y] = roofSide(lane, s0 + ((s1 - s0) * i) / n, h, left);
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join('');
}
