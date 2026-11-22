import type { MapId } from './model';
import { EDITIONS, isEditionId } from '../editions';

/**
 * The map used when nothing else says which, fixed when the code loads:
 * - in the browser, the edition the page picked (`globalThis.__TTB_EDITION__`, set by the client's edition.ts
 *   before the map code loads), else VITE_MAP;
 * - on the server and in tests, TTB_MAP (set by the server from `--map=`).
 * `usa`, `china` and `europe` are those maps. Anything else means the USA map.
 */
export function activeMapId(): MapId {
  const edition = (globalThis as { __TTB_EDITION__?: unknown }).__TTB_EDITION__;
  if (isEditionId(edition)) return EDITIONS[edition].map;
  const vite = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_MAP;
  const node = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.TTB_MAP;
  const id = vite || node;
  return id === 'china' || id === 'europe' ? id : 'usa';
}
