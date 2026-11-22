/**
 * Albers equal-area conic (standard parallels 29.5°N and 45.5°N, centred on 96°W): the familiar
 * shape of the lower 48. Scaled so one train car is roughly 44 map units.
 */
const rad = Math.PI / 180;
const p1 = 29.5 * rad, p2 = 45.5 * rad, p0 = 37.5 * rad, l0 = -96 * rad;
const n = (Math.sin(p1) + Math.sin(p2)) / 2;
const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
const r0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
const SCALE = 2280;

function albers(lon: number, lat: number): [number, number] {
  const r = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n;
  const t = n * (lon * rad - l0);
  return [r * Math.sin(t), r0 - r * Math.cos(t)];
}

const [ox] = albers(-125.2, 45);
const [, oy] = albers(-96, 50.2);

export function project([lon, lat]: readonly [number, number]): [number, number] {
  const [x, y] = albers(lon, lat);
  return [(x - ox) * SCALE + 40, (oy - y) * SCALE + 40];
}

/** Area the route network and its labels live in; the client may draw geography beyond it. */
export const MAP_BOUNDS = { x: -90, y: -2, width: 1773, height: 1015 };
