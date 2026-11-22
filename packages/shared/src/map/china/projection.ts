/**
 * Albers equal-area conic (standard parallels 25°N and 47°N, centred on 105°E): the familiar shape of
 * China. Scaled so one train car is roughly 44 map units, like the USA map.
 */
const rad = Math.PI / 180;
const p1 = 25 * rad, p2 = 47 * rad, p0 = 36 * rad, l0 = 105 * rad;
const n = (Math.sin(p1) + Math.sin(p2)) / 2;
const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
const r0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
const SCALE = 2200;

function albers(lon: number, lat: number): [number, number] {
  const r = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n;
  const t = n * (lon * rad - l0);
  return [r * Math.sin(t), r0 - r * Math.cos(t)];
}

const [ox] = albers(74.5, 40);
const [, oy] = albers(105, 47.2);

export function project([lon, lat]: readonly [number, number]): [number, number] {
  const [x, y] = albers(lon, lat);
  return [(x - ox) * SCALE + 40, (oy - y) * SCALE + 40];
}

/** Area the route network and its labels live in; the client may draw geography beyond it. */
export const MAP_BOUNDS = { x: 28, y: -26, width: 1555, height: 1155 };
