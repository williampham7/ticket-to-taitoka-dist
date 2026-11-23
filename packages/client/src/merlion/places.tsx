import { CITIES, CITY_BY_ID, ROUTES, cityXY, type City } from '@boboland/shared';
import { HALO, INK } from '../theme';
import { cityName } from '../lib/skin';
import { carRects } from '../board/geometry';
import { DOCK_ZONE } from '../board/dock';
import { Orchid } from './MerlionCards';
import { planLabels, type PlacedLabel, type LabelSide } from './placeLabels';

/**
 * Merlion board places. An ordinary place is an MRT-style roundel (white, ink ring, a teal core); the
 * island's best-known sights wear an orchid; the hub, Marina Bay, is a big gold-ringed roundel with a name
 * plate. Labels sit where the map data says (`label`), in Poppins with a pale halo so they read over the
 * sand, the water and the routes.
 */

/** The hub's name plate: its centre and size in map units (shared by the hub drawing and the label planner). */
export function hubPlate(city: City, [x, y]: [number, number], name: string) {
  const banner = city.banner ?? [0, 64];
  const k = banner[2] ?? 1;
  const w = Math.max(150, name.length * 12.4 + 28);
  return { w, k, cx: x + banner[0], cy: y + banner[1], box: { x: x + banner[0] - (w * k) / 2, y: y + banner[1] - 15 * k, w: w * k, h: 30 * k } };
}

let plan: { key: unknown; labels: Map<string, PlacedLabel> } | null = null;
/** Every place's name position, planned once per map (see placeLabels.ts). */
function labelPlan(): Map<string, PlacedLabel> {
  if (plan?.key === CITIES) return plan.labels;
  const hub = CITIES.find((c) => c.hub);
  const fixed = [DOCK_ZONE.sg && { x: DOCK_ZONE.sg.x0, y: DOCK_ZONE.sg.y0, w: 900, h: 900 }].filter(Boolean) as { x: number; y: number; w: number; h: number }[];
  if (hub) fixed.push(hubPlate(hub, cityXY(hub.id), cityName(hub.id)).box);
  const places = CITIES.filter((c) => !c.hub).map((c) => ({ id: c.id, xy: cityXY(c.id), name: cityName(c.id), side: c.label as LabelSide, special: !!c.special }));
  plan = { key: CITIES, labels: planLabels(places, ROUTES.flatMap((r) => carRects(r)), fixed) };
  return plan.labels;
}

export function MerlionPlace({ city, x, y, name }: { city: City; x: number; y: number; name: string }) {
  const lab = labelPlan().get(city.id)!;
  const special = !!city.special;
  return (
    <g data-city={city.id}>
      {special ? (
        <>
          <circle cx={x} cy={y} r={12.6} fill="#fff" stroke={INK} strokeWidth={2.8} />
          <circle cx={x} cy={y} r={9.4} fill="#fbe3f2" />
          <Orchid x={x} y={y} s={0.5} />
        </>
      ) : (
        <>
          <circle cx={x} cy={y} r={9} fill="#fff" stroke={INK} strokeWidth={2.6} />
          <circle cx={x} cy={y} r={3.6} fill="#23868a" />
        </>
      )}
      <text x={lab.x} y={lab.y} textAnchor={lab.anchor} fontFamily="Poppins" fontWeight={lab.weight}
        fontSize={lab.size} fill={special ? '#7a1658' : '#10343c'} stroke={HALO} strokeWidth={5} strokeOpacity={0.94}
        strokeLinejoin="round" paintOrder="stroke" data-label={city.id}>{name}</text>
    </g>
  );
}

/** Marina Bay: a gold-ringed roundel with an orchid, and a teal name plate under it. */
export function MerlionHub({ city, x, y, name }: { city: City; x: number; y: number; name: string }) {
  const banner = CITY_BY_ID[city.id].banner ?? [0, 64];
  const { w } = hubPlate(city, [x, y], name);
  return (
    <g data-city={city.id}>
      <circle cx={x} cy={y} r={29} fill="#f2b632" fillOpacity={0.35} />
      <circle cx={x} cy={y} r={23} fill="#fff" stroke={INK} strokeWidth={3} />
      <circle cx={x} cy={y} r={19} fill="none" stroke="#f2b632" strokeWidth={3.4} />
      <circle cx={x} cy={y} r={15} fill="#fbe3f2" />
      <Orchid x={x} y={y} s={0.74} />
      <g transform={`translate(${x + banner[0]},${y + banner[1]}) scale(${banner[2] ?? 1})`}>
        <rect x={-w / 2} y={-15} width={w} height={30} rx={15} fill="#10343c" stroke="#fff" strokeWidth={2.4} />
        <rect x={-w / 2 + 3} y={-12} width={w - 6} height={24} rx={12} fill="none" stroke="#f2b632" strokeWidth={1.2} />
        <text y={6.5} textAnchor="middle" fontFamily="Poppins" fontWeight={700} fontSize={18} letterSpacing="0.05em" fill="#fff">{name.toUpperCase()}</text>
      </g>
    </g>
  );
}
