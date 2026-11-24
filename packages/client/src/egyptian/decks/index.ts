import type { DeckSkin } from './types';
import { EGYPTIAN_DECK } from './egyptian';

export const DECKS: Record<string, DeckSkin> = { egyptian: EGYPTIAN_DECK };
/** The deck every table draws with. */
export const DECK: DeckSkin = DECKS.egyptian;
export type { DeckSkin } from './types';
