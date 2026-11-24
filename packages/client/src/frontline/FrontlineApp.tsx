import { useEffect } from 'react';
import { usePath } from '../lib/router';
import { FrontlineMenu } from './FrontlineMenu';
import { FrontlineLocal } from './FrontlineLocal';
import { FrontlineBot } from './FrontlineBot';
import { FrontlineWatch } from './FrontlineWatch';
import { FrontlineHost, FrontlineJoin, FrontlinePlay } from './FrontlineLan';

export function FrontlineApp() {
  const path = usePath();
  const [, , sub, id] = path.split('/');
  useEffect(() => { document.title = 'Frontline'; });
  switch (sub) {
    case 'local': return <FrontlineLocal />;
    case 'bot': return <FrontlineBot />;
    case 'watch': return <FrontlineWatch key={id} matchID={id} />;
    case 'host': return <FrontlineHost />;
    case 'join': return <FrontlineJoin key={id} matchID={id} />;
    case 'play': return <FrontlinePlay key={id} matchID={id} />;
    default: return <FrontlineMenu />;
  }
}
