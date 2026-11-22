import type { MapData } from '../model';
import { CITIES } from './cities';
import { ROUTES } from './routes';
import { TICKETS } from './tickets';
import { MAP_BOUNDS, project } from './projection';

/** The Europe map (version "europe"): Lisbon to Istanbul and Helsinki, with Frankfurt as the hub. */
export const EUROPE: MapData = { id: 'europe', cities: CITIES, routes: ROUTES, tickets: TICKETS, project, bounds: MAP_BOUNDS, autoInset: true };
