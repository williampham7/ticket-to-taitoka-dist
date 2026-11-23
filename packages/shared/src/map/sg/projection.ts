/**
 * Singapore projection: equirectangular (longitude scaled by cos 1.35°, so the island keeps its true shape),
 * about 37 map units per kilometre, then a gentle fisheye centred on the city centre (Marina Bay to Orchard)
 * that opens up downtown, where the places crowd, and squeezes the ring of suburbs just around it a little.
 * The geography (./geo) goes through the same projection, so places stay where they belong on the coast.
 */
const rad = Math.PI / 180;
const COS = Math.cos(1.35 * rad);
/** Map units per degree of latitude (about 37 per km, so one train car is a bit more than a kilometre). */
const S = 111.32 * 37;
/** The board's top-left corner, in lon/lat. */
const LON0 = 103.585, LAT0 = 1.478;

/** The fisheye: centre (lon/lat), radius (map units) and how much it magnifies at the centre (MAG + 1 times). */
const C: [number, number] = [103.853, 1.294];
const R = 320;
const MAG = 1.1;

function plain(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * COS * S, (LAT0 - lat) * S];
}
const [CX, CY] = plain(...C);

function fish([x, y]: [number, number]): [number, number] {
  const dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy);
  if (d >= R || d === 0) return [x, y];
  const u = d / R, f = (((MAG + 1) * u) / (MAG * u + 1) * R) / d;
  return [CX + dx * f, CY + dy * f];
}

export function project([lon, lat]: readonly [number, number]): [number, number] {
  const [x, y] = fish(plain(lon, lat));
  return [x + 20, y + 40];
}

/** Area the route network and its labels live in; the client may draw geography beyond it. */
export const MAP_BOUNDS = { x: 60, y: 40, width: 1860, height: 1060 };
