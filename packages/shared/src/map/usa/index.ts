import type { MapData } from '../model';
import { CITIES } from './cities';
import { ROUTES } from './routes';
import { TICKETS } from './tickets';
import { MAP_BOUNDS, project } from './projection';

/** The USA map (version "usa"): the lower 48 plus Toronto, with Taitoka as a hub in Kansas. */
export const USA: MapData = { id: 'usa', cities: CITIES, routes: ROUTES, tickets: TICKETS, project, bounds: MAP_BOUNDS, autoInset: true };
