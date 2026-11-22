import { usePath } from './lib/router';
import { EditionPicker } from './screens/EditionPicker';
import { Home } from './screens/Home';
import { LocalScreen } from './screens/LocalGame';
import { LanGame, LanHost, LanJoin, LanWaiting } from './screens/Lan';

export function App() {
  const path = usePath();
  const [, root, id] = path.split('/');
  switch (root) {
    case 'menu': return <Home />;
    case 'local': return <LocalScreen />;
    case 'host': return <LanHost />;
    case 'wait': return <LanWaiting key={id} matchID={id} />;
    case 'join': return <LanJoin key={id} matchID={id} />;
    case 'play': return <LanGame key={id} matchID={id} />;
    default: return <EditionPicker />;
  }
}
