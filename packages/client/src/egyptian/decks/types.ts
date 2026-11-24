import type { ReactElement } from 'react';
import type { Card } from '@boboland/shared/src/egyptian';

/** Every face and back is drawn in this viewBox. */
export const CARD_W = 250;
export const CARD_H = 350;

/**
 * A deck skin: everything a deck looks like. Table and game code never reference a deck's art directly; they
 * draw cards through `CardView`, which reads the active skin. A new deck is a new folder plus one line in DECKS.
 */
export interface DeckSkin {
  id: string;
  name: string;
  /** a full face as SVG content for the 250 x 350 viewBox */
  Face: (p: { card: Card }) => ReactElement;
  /** the back, same viewBox */
  Back: () => ReactElement;
  /** shared <defs> (gradients, patterns, symbols), mounted once per page that draws cards */
  Defs?: () => ReactElement;
  /** --deck-* tokens the table picks up lightly */
  accent: Record<`--deck-${string}`, string>;
  /** music.ts track to play with this deck */
  music?: 'egyptian';
}
