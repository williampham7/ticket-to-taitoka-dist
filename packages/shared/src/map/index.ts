import { activeMapId } from './active';
import { createMapModel, type MapData, type MapId } from './model';
import { USA } from './usa';
import { CHINA } from './china';
import { EUROPE } from './europe';

export const MAPS: Record<MapId, MapData> = { usa: USA, china: CHINA, europe: EUROPE };

export const isMapId = (x: unknown): x is MapId => typeof x === 'string' && Object.prototype.hasOwnProperty.call(MAPS, x);

/**
 * The map used when nothing else says which: chosen when the code loads (VITE_MAP in the browser,
 * TTB_MAP on the server and in tests). Games record their own map in `G.mapId`.
 */
export const DEFAULT_MAP_ID: MapId = activeMapId();

type Model = ReturnType<typeof createMapModel>;
const models = new Map<MapId, Model>();
const modelOf = (id: MapId): Model => {
  let m = models.get(id);
  if (!m) models.set(id, (m = createMapModel(MAPS[id])));
  return m;
};

// Live bindings: they always describe the current map, which `useMap` / `withMap` switch.
// Read them at call time; a module-level copy (or `const { X } = ...`) would keep the old map.
/** The map in use right now ('usa', 'china' or 'europe'). */
export let MAP_ID: MapId;
export let CITIES: MapData['cities'];
export let ROUTES: MapData['routes'];
export let TICKETS: MapData['tickets'];
export let project: MapData['project'];
export let MAP_BOUNDS: MapData['bounds'];
export let CITY_BY_ID: Model['CITY_BY_ID'];
export let ROUTE_BY_ID: Model['ROUTE_BY_ID'];
export let TICKET_BY_ID: Model['TICKET_BY_ID'];
export let cityXY: Model['cityXY'];
export let routeSegment: Model['routeSegment'];
export let routeLane: Model['routeLane'];
export let routeCars: Model['routeCars'];
export let routeMidpoint: Model['routeMidpoint'];

const listeners = new Set<(id: MapId) => void>();

function bind(id: MapId): void {
  const data = MAPS[id];
  const m = modelOf(id);
  MAP_ID = id;
  CITIES = data.cities;
  ROUTES = data.routes;
  TICKETS = data.tickets;
  project = data.project;
  MAP_BOUNDS = data.bounds;
  ({ CITY_BY_ID, ROUTE_BY_ID, TICKET_BY_ID, cityXY, routeSegment, routeLane, routeCars, routeMidpoint } = m);
}
bind(DEFAULT_MAP_ID);

/** Switch every map binding (and caches registered with `onMapChange`) to map `id`. */
export function useMap(id: MapId): void {
  if (!isMapId(id)) throw new Error(`unknown map: ${String(id)}`);
  if (id === MAP_ID) return;
  bind(id);
  for (const cb of listeners) cb(id);
}

/**
 * Run `fn` with map `id` in use, then switch back to the previous map (also if `fn` throws).
 * `fn` must be synchronous: anything it leaves for later would run on whatever map is current then.
 */
export function withMap<T>(id: MapId, fn: () => T): T {
  const prev = MAP_ID;
  useMap(id);
  try {
    return fn();
  } finally {
    useMap(prev);
  }
}

/** Called after every map switch, so modules with tables built from the map can swap them. Returns an unsubscribe. */
export function onMapChange(cb: (id: MapId) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export { createMapModel, bentRect, carsTouch, NODE_R, HUB_R, CAR_GAP, CAR_H, LANE_OFFSET } from './model';
export type { MapData, MapId, CarSlot, Lane } from './model';
export * as USA_GEO from './usa/geo';
export * as CHINA_GEO from './china/geo';
