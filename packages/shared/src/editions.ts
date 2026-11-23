/**
 * Editions: the versions of the game the player can pick. An edition sets the map, the skin (game name)
 * and the visual theme together. Only USA, China, Europe and Singapore are offered.
 */
import type { MapId } from './map/model';
import type { SKINS } from './skins';

export type EditionId = 'usa' | 'china' | 'europe' | 'singapore';
export type ThemeId = 'vintage' | 'hsr' | 'rail' | 'merlion';

export interface Edition {
  id: EditionId;
  map: MapId;
  skin: keyof typeof SKINS;
  theme: ThemeId;
  label: string;
}

export const EDITIONS = {
  usa: { id: 'usa', map: 'usa', skin: 'taitoka', theme: 'vintage', label: 'USA' },
  china: { id: 'china', map: 'china', skin: 'beijing', theme: 'hsr', label: 'China' },
  europe: { id: 'europe', map: 'europe', skin: 'europa', theme: 'rail', label: 'Europe' },
  singapore: { id: 'singapore', map: 'sg', skin: 'singapore', theme: 'merlion', label: 'Singapore' },
} as const satisfies Record<EditionId, Edition>;

/** Editions in menu order. */
export const EDITION_IDS: readonly EditionId[] = ['usa', 'china', 'europe', 'singapore'];

export function isEditionId(x: unknown): x is EditionId {
  return typeof x === 'string' && (EDITION_IDS as readonly string[]).includes(x);
}

/** The edition with this id; anything unknown gives USA. */
export function editionFor(id: string | null | undefined): Edition {
  return isEditionId(id) ? EDITIONS[id] : EDITIONS.usa;
}
