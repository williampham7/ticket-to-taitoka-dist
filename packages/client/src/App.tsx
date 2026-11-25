import { usePath } from './lib/router';
import { EditionPicker } from './screens/EditionPicker';
import { Home } from './screens/Home';
import { LocalScreen } from './screens/LocalGame';
import { FrontlineApp } from './frontline/FrontlineApp';
import { FleetApp } from './fleet/FleetApp';
import { EgyptianApp } from './egyptian/EgyptianApp';
import { WarfrontApp } from './warfront/WarfrontApp'; // Warfront
import { KingdomApp } from './kingdom/KingdomApp'; // Kingdom
import { NamePrompt, PartyButton, PartyHold } from './components/Party';
import { LanGame, LanHost, LanJoin, LanWaiting } from './screens/Lan';

export function App() {
  return (
    <>
      <Screen />
      <PartyButton />
      <NamePrompt />
    </>
  );
}

function Screen() {
  const path = usePath();
  const [, root, id] = path.split('/');
  switch (root) {
    case 'frontline': return <FrontlineApp />;
    case 'fleet': return <FleetApp />;
    case 'egyptian': return <EgyptianApp />;
    case 'warfront': return <WarfrontApp />; // Warfront
    case 'kingdom': return <KingdomApp />; // Kingdom
    case 'party': return <PartyHold />;
    case 'menu': return <Home />;
    case 'local': return <LocalScreen />;
    case 'host': return <LanHost />;
    case 'wait': return <LanWaiting key={id} matchID={id} />;
    case 'join': return <LanJoin key={id} matchID={id} />;
    case 'play': return <LanGame key={id} matchID={id} />;
    default: return <EditionPicker />;
  }
}
