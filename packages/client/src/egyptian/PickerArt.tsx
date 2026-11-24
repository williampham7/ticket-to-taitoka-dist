import { cardOf } from '@boboland/shared/src/egyptian';
import { CardView } from './CardView';
import { DECK } from './decks';
import '@fontsource/cinzel/700.css';
import './menu.css';

const HAND = [cardOf(13, 'S'), cardOf(12, 'H'), cardOf(1, 'D'), cardOf(11, 'D'), cardOf(13, 'C')];

/** A fanned hand of court cards from the active deck (the picker card's art). */
export function PickerArt() {
  const Defs = DECK.Defs;
  return (
    <span className="egw-fan" aria-hidden>
      {Defs && <Defs />}
      {HAND.map((c, i) => (
        <span key={c} className="egw-fan-card" style={{ '--i': i - 2 } as React.CSSProperties}><CardView card={c} /></span>
      ))}
    </span>
  );
}
