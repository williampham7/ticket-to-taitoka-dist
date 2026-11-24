import { useEffect } from 'react';
import { usePath } from '../lib/router';
import { WarMenu } from './Menu';
import { WarLocal } from './Local';
import { WarHost, WarJoin, WarPlay, WarWait, WarWatch } from './Lan';
import { useWarMusic } from './music';
import './warfront.css';

export function WarfrontApp() {
  const path = usePath();
  const [, , sub, id] = path.split('/');
  useWarMusic();
  useEffect(() => { document.title = 'Warfront'; });
  switch (sub) {
    case 'bot': case 'local': return <WarLocal key={path + window.location.search} />;
    case 'host': return <WarHost />;
    case 'join': return <WarJoin key={id} matchID={id} />;
    case 'wait': return <WarWait key={id} matchID={id} />;
    case 'play': return <WarPlay key={id} matchID={id} />;
    case 'watch': return <WarWatch key={id} matchID={id} />;
    default: return <WarMenu />;
  }
}
