import type { MapData } from '../model';
import { CITIES } from './cities';
import { ROUTES } from './routes';
import { TICKETS } from './tickets';
import { MAP_BOUNDS, project } from './projection';

/** The China map (version "china"): Ngari to Harbin and Hainan, with Beijing as the hub. */
export const CHINA: MapData = { id: 'china', cities: CITIES, routes: ROUTES, tickets: TICKETS, project, bounds: MAP_BOUNDS, autoInset: true };
