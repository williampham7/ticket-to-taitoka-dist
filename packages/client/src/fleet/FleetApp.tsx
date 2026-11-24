import { useEffect } from 'react';
import { usePath } from '../lib/router';
import { FleetMenu } from './FleetMenu';
import { FleetWatch } from './FleetWatch';
import { FleetBot } from './FleetBot';
import { FleetLocal } from './FleetLocal';
import { SceneGallery } from './cine/Gallery';
import { FleetHost, FleetJoin, FleetPlay } from './FleetLan';
import { Doors } from './Doors';
import { FleetArtDefs } from './shipArt';
import './fleet.css';

export function FleetApp() {
  return <><FleetArtDefs /><FleetRoute /><Doors /></>;
}

function FleetRoute() {
  const path = usePath();
  const [, , sub, id] = path.split('/');
  useEffect(() => { document.title = 'Fleet'; });
  switch (sub) {
    case 'local': return <FleetLocal />;
    case 'scenes': return <SceneGallery />;
    case 'bot': return <FleetBot />;
    case 'watch': return <FleetWatch key={id} matchID={id} />;
    case 'host': return <FleetHost />;
    case 'join': return <FleetJoin key={id} matchID={id} />;
    case 'play': return <FleetPlay key={id} matchID={id} />;
    default: return <FleetMenu />;
  }
}
