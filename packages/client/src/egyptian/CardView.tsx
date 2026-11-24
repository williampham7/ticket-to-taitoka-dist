import { cardName, type Card } from '@boboland/shared/src/egyptian';
import { DECK } from './decks';
import { CARD_H, CARD_W } from './decks/types';

/** One card, face or back, drawn by the active deck skin. Width in px; the height follows. */
export function CardView({ card, back = false, width, className = '', testid, title }: {
  card?: Card; back?: boolean; width?: number; className?: string; testid?: string; title?: string;
}) {
  const showBack = back || card === undefined;
  const { Face, Back } = DECK;
  return (
    <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} width={width} height={width ? (width * CARD_H) / CARD_W : undefined}
      className={`egw-card ${className}`} data-testid={testid} data-card={showBack ? undefined : card}
      role="img" aria-label={title ?? (showBack ? 'Face-down card' : cardName(card!))}>
      {showBack ? <Back /> : <Face card={card!} />}
    </svg>
  );
}
