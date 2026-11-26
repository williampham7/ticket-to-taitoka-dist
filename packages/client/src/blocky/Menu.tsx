import { useState, type CSSProperties } from 'react';
import { navigate } from '../lib/router';
import { Sky } from './art/sky';
import { Icon } from './art/icons';
import { Avatar } from './art/avatars';
import { GUILD_INK } from './art/palette';
import { SettingsPanel } from './SettingsPanel';
import { HowTo } from './HowTo';
import { sfx } from './sound';

const TITLE: { ch: string; g: keyof typeof GUILD_INK }[] = [
  { ch: 'B', g: 'tide' }, { ch: 'L', g: 'sun' }, { ch: 'O', g: 'ember' }, { ch: 'C', g: 'grove' }, { ch: 'K', g: 'tide' }, { ch: 'Y', g: 'sun' },
];

/** /blocky: the title builds itself from falling toy blocks onto a floating isle; carved keys for every mode. */
export function BlyMenu() {
  const [panel, setPanel] = useState<'' | 'settings' | 'howto' | 'join'>('');
  const [code, setCode] = useState('');
  const join = () => { const m = code.trim().match(/([A-Za-z0-9_-]{6,})\/?$/); if (m) navigate(`/blocky/join/${m[1]}`); };
  return (
    <div className="blocky bly-menu" data-testid="bly-menu">
      <Sky progress={0.32} />
      <button type="button" className="bly-key bly-key-ghost bly-menu-back" onClick={() => navigate('/')}><Icon name="leave" size={20} />Library</button>
      <header className="bly-title" aria-label="Blocky">
        <div className="bly-title-blocks" aria-hidden>
          {TITLE.map((t, i) => {
            const c = GUILD_INK[t.g];
            return (
              <span key={i} className="bly-title-block" style={{ ['--i' as string]: i, ['--top' as string]: c.top, ['--south' as string]: c.south, ['--light' as string]: c.light, ['--ink' as string]: c.ink } as CSSProperties}>
                <b>{t.ch}</b>
              </span>
            );
          })}
        </div>
        <svg className="bly-title-isle" viewBox="0 0 600 150" aria-hidden>
          <path d="M60,36 L120,82 L190,98 L250,136 L300,146 L360,130 L420,96 L490,84 L540,36Z" fill="#8f8270" stroke="#5e5446" strokeWidth="3" />
          <path d="M150,70 q60,10 150,4 t170,-4" stroke="#5e5446" strokeOpacity=".35" strokeWidth="3" fill="none" />
          {[[180, 92, '#b9a6f2'], [330, 120, '#8fe0e6'], [420, 88, '#b9a6f2']].map(([x, y, col], i) => <path key={i} d={`M${x},${y} l-7,-16 l7,-9 l7,9z`} fill={col as string} stroke="#2b3550" strokeOpacity=".5" strokeWidth="1.5" />)}
          {[[140, 80], [230, 116], [380, 116], [470, 86]].map(([x, y], i) => <path key={`r${i}`} d={`M${x},${y} c-6,14 8,24 0,38`} stroke="#5e3b1f" strokeWidth="3.5" fill="none" strokeLinecap="round" />)}
          <rect x="40" y="18" width="520" height="30" rx="14" fill="#c9b997" stroke="#7d6f58" strokeWidth="2.5" />
          <rect x="40" y="8" width="520" height="28" rx="14" fill="#f2ead9" stroke="#8c7e66" strokeWidth="2.5" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${82 + i * 40},10 v24`} stroke="#b9aa8d" strokeWidth="2" />)}
          <g className="bly-title-fall"><rect x="96" y="34" width="12" height="70" fill="url(#bly-menu-fall)" /><rect x="494" y="34" width="12" height="60" fill="url(#bly-menu-fall)" /></g>
          <defs><linearGradient id="bly-menu-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d4f6f6" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
          {[[62, 6, 1], [530, 4, .8], [300, 2, .9]].map(([x, y, s], i) => <g key={`m${i}`} transform={`translate(${x} ${y}) scale(${s})`}><circle r="11" fill="#7fa858" /><circle cx="9" cy="-4" r="9" fill="#94bf68" /><circle cx="-8" cy="2" r="8" fill="#94bf68" /></g>)}
        </svg>
        <p className="bly-tagline">Raise toy-block isles above the clouds. Every new piece touches your own only at the corners.</p>
      </header>
      <nav className="bly-menu-keys bly-plank" aria-label="Play">
        <span className="bly-rope" style={{ left: '14%' }} /><span className="bly-rope" style={{ right: '14%' }} />
        <button type="button" className="bly-key bly-key-go bly-key-big" onClick={() => { sfx('pick'); navigate('/blocky/host'); }} data-testid="bly-menu-host"><Icon name="chat" size={26} />Host online</button>
        <button type="button" className="bly-key bly-key-big" onClick={() => setPanel(panel === 'join' ? '' : 'join')} aria-expanded={panel === 'join'} data-testid="bly-menu-join"><Icon name="leave" size={26} />Join a room</button>
        {panel === 'join' && (
          <form className="bly-join bly-stone" onSubmit={(e) => { e.preventDefault(); join(); }}>
            <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the invite link or room code" aria-label="Invite link or room code" data-testid="bly-join-code" />
            <button type="submit" className="bly-key bly-key-go" disabled={!code.trim()}>Join</button>
          </form>
        )}
        <button type="button" className="bly-key bly-key-big" onClick={() => { sfx('pick'); navigate('/blocky/bot'); }} data-testid="bly-menu-bot"><Avatar id={2} size={30} />Play vs computer</button>
        <button type="button" className="bly-key bly-key-big" onClick={() => { sfx('pick'); navigate('/blocky/local'); }} data-testid="bly-menu-local"><Avatar id={0} size={30} />Pass and play</button>
        <div className="bly-menu-row">
          <button type="button" className="bly-key" onClick={() => setPanel('howto')} data-testid="bly-menu-howto"><Icon name="suggest" />How to play</button>
          <button type="button" className="bly-key" onClick={() => setPanel('settings')} data-testid="bly-menu-settings"><Icon name="settings" />Settings</button>
        </div>
      </nav>
      {panel === 'settings' && <SettingsPanel onClose={() => setPanel('')} />}
      {panel === 'howto' && <HowTo onClose={() => setPanel('')} />}
    </div>
  );
}
