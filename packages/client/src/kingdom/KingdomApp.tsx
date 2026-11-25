import { useEffect } from 'react';
import { usePath } from '../lib/router';
import { KingdomArtDefs } from './art/Defs';
import { KgMenu } from './Menu';
import { KgLocal } from './Local';
import { KgHost, KgJoin, KgPlay, KgWait, KgWatch } from './Lan';
import { KgGallery } from './Gallery';
import { KgScenes } from './Scenes';
import { useKingdomMusic } from './music';
import './kingdom.css';
import './art.css';
import './fx.css';
import './menu.css';

export function KingdomApp() {
  const path = usePath();
  const [, , sub, id] = path.split('/');
  useKingdomMusic();
  useEffect(() => { document.title = 'Shifting Kingdom'; });
  return (
    <>
      <KingdomArtDefs />
      <Route sub={sub} id={id} path={path} />
    </>
  );
}

function Route({ sub, id, path }: { sub?: string; id?: string; path: string }) {
  switch (sub) {
    case 'bot': case 'local': return <KgLocal key={path + window.location.search} mode={sub} />;
    case 'host': return <KgHost />;
    case 'join': return <KgJoin key={id} matchID={id!} />;
    case 'wait': return <KgWait key={id} matchID={id!} />;
    case 'play': return <KgPlay key={id} matchID={id!} />;
    case 'watch': return <KgWatch key={id} matchID={id!} />;
    case 'gallery': return <KgGallery />;
    case 'scenes': return <KgScenes />;
    default: return <KgMenu />;
  }
}
