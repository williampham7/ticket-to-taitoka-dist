import type { MapData } from '../model';
import { CITIES } from './cities';
import { ROUTES } from './routes';
import { TICKETS } from './tickets';
import { MAP_BOUNDS, project } from './projection';

/** The Singapore map (version "sg"): Tuas to Changi, Sentosa to Sembawang, with Marina Bay as the hub. */
export const SG: MapData = { id: 'sg', cities: CITIES, routes: ROUTES, tickets: TICKETS, project, bounds: MAP_BOUNDS, autoInset: true };
