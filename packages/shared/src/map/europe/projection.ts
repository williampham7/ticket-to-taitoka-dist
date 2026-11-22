/**
 * Albers equal-area conic (standard parallels 40°N and 62°N, centred on 12°E) scaled so one train car is
 * roughly 44 map units, like the other maps. East-west is stretched by STRETCH_X so the board suits a
 * landscape screen (true Europe is about as tall as it is wide); 1.2 fills the width without looking pulled.
 */
const rad = Math.PI / 180;
const p1 = 40 * rad, p2 = 62 * rad, p0 = 52 * rad, l0 = 12 * rad;
const n = (Math.sin(p1) + Math.sin(p2)) / 2;
const C = Math.cos(p1) ** 2 + 2 * n * Math.sin(p1);
const r0 = Math.sqrt(C - 2 * n * Math.sin(p0)) / n;
const SCALE = 2650;
/** Horizontal exaggeration of the board (1 = true shape). */
export const STRETCH_X = 1.2;

function albers(lon: number, lat: number): [number, number] {
  const r = Math.sqrt(C - 2 * n * Math.sin(lat * rad)) / n;
  const t = n * (lon * rad - l0);
  return [r * Math.sin(t), r0 - r * Math.cos(t)];
}

const [ox] = albers(-9.14, 45);
const [, oy] = albers(12, 64);

export function project([lon, lat]: readonly [number, number]): [number, number] {
  const [x, y] = albers(lon, lat);
  return [(x - ox) * SCALE * STRETCH_X + 80, (oy - y) * SCALE + 40];
}

/** Area the route network and its labels live in; the client may draw geography beyond it. */
export const MAP_BOUNDS = { x: -90, y: 25, width: 1810, height: 1260 };
