import { useEffect } from 'react';
import { usePath } from '../lib/router';
import { BlockyArtDefs } from './art/Defs';
import { useBlockyMusic } from './music';
import { BlyLocal } from './Local';
import { BlyHost, BlyJoin, BlyPlay, BlyWait, BlyWatch } from './Lan';
import { BlyMenu } from './Menu';
import { BlyMock } from './Mock';
import { BlyGallery } from './Gallery';
import { BlyScenes } from './Scenes';
import './art/materials.css';
import './board.css';
import './fx.css';
import './menu.css';
import './room.css';
import './blocky.css';

export function BlockyApp() {
  const path = usePath();
  useBlockyMusic();
  const [, , sub, id] = path.split('/');
  useEffect(() => { document.title = 'Blocky'; });
  return (
    <>
      <BlockyArtDefs />
      <Route sub={sub} id={id} path={path} />
    </>
  );
}

function Route({ sub, id, path }: { sub?: string; id?: string; path: string }) {
  switch (sub) {
    case 'bot': case 'local': return <BlyLocal key={path + window.location.search} mode={sub} />;
    case 'host': return <BlyHost />;
    case 'join': return <BlyJoin key={id} matchID={id!} />;
    case 'wait': return <BlyWait key={id} matchID={id!} />;
    case 'play': return <BlyPlay key={id} matchID={id!} />;
    case 'watch': return <BlyWatch key={id} matchID={id!} />;
    case 'mock': return <BlyMock />;
    case 'gallery': return <BlyGallery />;
    case 'scenes': return <BlyScenes />;
    default: return <BlyMenu />;
  }
}
