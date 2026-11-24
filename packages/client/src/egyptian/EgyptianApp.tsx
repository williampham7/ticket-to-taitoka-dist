import { useEffect, type CSSProperties } from 'react';
import { usePath } from '../lib/router';
import { DECK } from './decks';
import { DeckGallery } from './DeckGallery';
import { EgyptianLocal } from './EgyptianLocal';
import { EgyptianMenu } from './EgyptianMenu';
import { EgwHost, EgwJoin, EgwPlay, EgwWaiting, EgyptianWatch } from './EgyptianLan';
import './egw.css';

export function EgyptianApp() {
  const Defs = DECK.Defs;
  return (
    <div style={DECK.accent as CSSProperties}>
      {Defs && <Defs />}
      <EgyptianRoute />
    </div>
  );
}

function EgyptianRoute() {
  const path = usePath();
  const [, , sub, id] = path.split('/');
  useEffect(() => { document.title = 'Egyptian War'; });
  switch (sub) {
    case 'deck': return <DeckGallery />;
    case 'local': return <EgyptianLocal />;
    case 'host': return <EgwHost />;
    case 'wait': return <EgwWaiting key={id} matchID={id} />;
    case 'join': return <EgwJoin key={id} matchID={id} />;
    case 'play': return <EgwPlay key={id} matchID={id} />;
    case 'watch': return <EgyptianWatch key={id} matchID={id} />;
    default: return <EgyptianMenu />;
  }
}
