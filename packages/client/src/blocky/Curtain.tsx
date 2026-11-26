import { useState } from 'react';
import { guildsOf, type BView } from '@boboland/shared/src/blocky';
import { Avatar } from './art/avatars';
import { Crest } from './art/crests';
import { CloudBank } from './art/bank';
import { GUILD_NAME } from './text';
import { sfx } from './sound';

/**
 * Pass and play: a bank of clouds rolls across the isle with the next builder's avatar and guild crests; tapping
 * parts the clouds. It falls only between two different humans (handoff.ts), never for a computer seat.
 */
export function Curtain({ view, seat, name, onOpen }: { view: BView; seat: string; name: string; onOpen: () => void }) {
  const [parting, setParting] = useState(false);
  const guilds = guildsOf(view, seat);
  const open = () => { if (parting) return; setParting(true); sfx('turn'); setTimeout(onOpen, 520); };
  return (
    <div className={`blocky bly-curtain${parting ? ' bly-curtain-part' : ''}`} role="dialog" aria-label={`${name}, your turn`} data-testid="bly-curtain" onClick={open}>
      <div className="bly-curtain-bank bly-curtain-l" aria-hidden><CloudBank side="l" /></div>
      <div className="bly-curtain-bank bly-curtain-r" aria-hidden><CloudBank side="r" /></div>
      <div className="bly-curtain-card-wrap">
      <span className="bly-rope" style={{ left: '24%', top: -14 }} /><span className="bly-rope" style={{ right: '24%', top: -14 }} />
      <div className="bly-curtain-card bly-pennant">
        <span className="bly-curtain-face"><Avatar id={view.avatars[Number(seat)] ?? 0} size={110} /></span>
        <small>The clouds part for</small>
        <h2>{name}</h2>
        {guilds.length > 0 && <p className="bly-curtain-guilds">{guilds.map((g) => <span key={g} className={`bly-g-${g}`}><Crest guild={g} size={34} />{GUILD_NAME[g]}</span>)}</p>}
        <p className="bly-curtain-hint">Everyone else, look away from the isle!</p>
        <button type="button" className="bly-key bly-key-go bly-key-big" onClick={(e) => { e.stopPropagation(); open(); }} data-testid="bly-open" autoFocus>Part the clouds</button>
      </div>
      </div>
    </div>
  );
}
