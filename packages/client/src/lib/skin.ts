import { CITY_BY_ID, cityNameIn, gameTitle, skinFor } from '@boboland/shared';
import { EDITION } from '../edition';

/** The skin of the edition this page plays (edition.ts). */
export const SKIN = skinFor(EDITION.skin);
export const GAME_TITLE = gameTitle(SKIN);

/** A city's display name. Always use this rather than CITY_BY_ID[id].name: the hub is renamed per skin. */
export const cityName = (id: string) => cityNameIn(SKIN, CITY_BY_ID[id]);

/** A city's Chinese name (China map), or undefined. The hub takes the skin's. */
export const cityNameZh = (id: string): string | undefined => (CITY_BY_ID[id].hub ? SKIN.zh : CITY_BY_ID[id].zh);
