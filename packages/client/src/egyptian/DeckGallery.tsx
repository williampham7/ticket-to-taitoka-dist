import { cardName, cardOf, SUITS } from '@boboland/shared/src/egyptian';
import { navigate } from '../lib/router';
import { CardView } from './CardView';
import { DECK } from './decks';
import { HOUSES } from './decks/egyptian/palette';

/** QA gallery: every face of the active deck, by suit A to K, plus the back. */
export function DeckGallery() {
  return (
    <main className="egw egw-gallery" data-testid="egw-deck-gallery">
      <header className="egw-gallery-head">
        <button type="button" className="egw-btn egw-btn-ghost" onClick={() => navigate('/egyptian')}>Back</button>
        <h1 className="egw-display">{DECK.name} deck</h1>
        <p className="egw-sub">All 52 faces and the back</p>
      </header>
      {SUITS.map((s) => (
        <section key={s} className="egw-gallery-row" aria-label={HOUSES[s].name}>
          <h2 className="egw-gallery-house">{HOUSES[s].name} <span>· {HOUSES[s].motif}</span></h2>
          <div className="egw-gallery-cards">
            {Array.from({ length: 13 }, (_, i) => {
              const c = cardOf(i + 1, s);
              return <figure key={c} className="egw-gallery-card" data-testid="egw-gallery-card"><CardView card={c} /><figcaption>{cardName(c)}</figcaption></figure>;
            })}
          </div>
        </section>
      ))}
      <section className="egw-gallery-row" aria-label="Back">
        <h2 className="egw-gallery-house">Back</h2>
        <div className="egw-gallery-cards">
          <figure className="egw-gallery-card" data-testid="egw-gallery-card"><CardView back /><figcaption>Back</figcaption></figure>
        </div>
      </section>
    </main>
  );
}
