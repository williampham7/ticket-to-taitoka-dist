import { CONTINENTS, SEA_LINKS, TERRITORY_DEFS, type ContId } from './mapData';
import { LAND_BORDERS } from './geometry';

export { CONTINENTS, type ContId };
export interface Territory { id: string; name: string; cont: ContId }
export const TERRITORIES: Territory[] = TERRITORY_DEFS.map(([id, name, cont]) => ({ id, name, cont }));
export const TERRITORY_IDS = TERRITORIES.map((t) => t.id);
export const TERR: Record<string, Territory> = Object.fromEntries(TERRITORIES.map((t) => [t.id, t]));
export const CONT_BY_ID = Object.fromEntries(CONTINENTS.map((c) => [c.id, c])) as Record<ContId, (typeof CONTINENTS)[number]>;
export const CONT_TERRS = Object.fromEntries(CONTINENTS.map((c) => [c.id, TERRITORY_IDS.filter((t) => TERR[t].cont === c.id)])) as Record<ContId, string[]>;

/** Adjacency: derived land borders plus the listed sea lanes and land bridges. */
export const ADJ: Record<string, string[]> = Object.fromEntries(TERRITORY_IDS.map((t) => [t, [] as string[]]));
for (const [a, b] of [...LAND_BORDERS, ...SEA_LINKS.map(([a, b]) => [a, b] as [string, string])]) {
  if (!ADJ[a].includes(b)) ADJ[a].push(b);
  if (!ADJ[b].includes(a)) ADJ[b].push(a);
}
export const adjacent = (a: string, b: string) => ADJ[a]?.includes(b) ?? false;
