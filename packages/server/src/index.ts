/**
 * Server entry point. One server plays every map: each match names its map in `setupData.map`. The shared game
 * reads its default map (for matches without setupData) when it loads, so that default is set here first
 * (see defaultMap) and only then is the server itself loaded.
 */
import { defaultMap } from './map';

process.env.TTB_MAP = defaultMap(process.argv, process.env);

await import('./serve');
