import { useState, type CSSProperties } from 'react';
import { E, N, S, W } from '@boboland/shared/src/kingdom';
import { navigate } from '../lib/router';
import { Scene } from './art/scene';
import { TileSvg } from './art/tiles';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { INK } from './art/Defs';
import { HowTo } from './HowTo';
import { SoundRows } from './SoundRows';
import { setFlat, setFx, useFlat, useFx } from './fx';
import { kgSound } from './sound';

/** A small diorama for the title page: nine tiles, the castle behind, the four heroes in front. */
const MINI = [E | S, E | W | S, S | W, N | S, N | E | S, N | W, N | E, E | W, N | W];
export function MiniDiorama() {
  return (
    <div className="kg-mini-dio" aria-hidden>
      <svg viewBox="0 0 240 120" className="kg-mini-castle">
        <path d="M0,120 Q60,84 130,96 Q190,104 240,80 V120 Z" fill="#94c27a" stroke={INK} strokeWidth="2.4" />
        <g transform="translate(160,104) scale(.8)">
          <rect x="-34" y="-30" width="68" height="34" fill="#efe4c8" stroke={INK} strokeWidth="2.4" />
          {[[-44, -54, 18, 58, '#d9546f'], [26, -48, 16, 52, '#5a8ad9'], [-8, -74, 16, 78, '#e9b63c']].map(([x, y, w, h, roof], k) => (
            <g key={k}>
              <rect x={x as number} y={y as number} width={w as number} height={h as number} fill="#f6ecd2" stroke={INK} strokeWidth="2.2" />
              <path d={`M${(x as number) - 4},${y} L${(x as number) + (w as number) / 2},${(y as number) - 24} L${(x as number) + (w as number) + 4},${y} Z`} fill={roof as string} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
              <path className="kg-flag" style={{ ['--i' as string]: k } as CSSProperties} d={`M${(x as number) + (w as number) / 2},${(y as number) - 24} v-12 l10,3 l-10,3`} fill="#d9546f" stroke={INK} strokeWidth="1.2" />
            </g>
          ))}
          <path d="M-8,4 V-10 Q0,-18 8,-10 V4 Z" fill="#8a5329" stroke={INK} strokeWidth="2" />
        </g>
      </svg>
      <div className="kg-mini-tray">
        {MINI.map((m, i) => <div key={i} className="kg-mini-tile"><TileSvg tile={{ id: 60 + i, m, ...(i === 4 ? { t: 'unicorn' as const } : i === 0 ? { t: 'harp' as const } : {}) }} /></div>)}
      </div>
      <div className="kg-mini-heroes">
        {[0, 1, 2, 3].map((h) => <svg key={h} viewBox={HERO_VIEWBOX} className="kg-hero-svg" style={{ ['--i' as string]: h } as CSSProperties}><HeroFigure hero={h} /></svg>)}
      </div>
    </div>
  );
}

/** The storybook opens on a painted title page: host, join, play the computer, pass and play, how to play, settings. */
export function KgMenu() {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [howto, setHowto] = useState(false);
  const [settings, setSettings] = useState(false);
  const fx = useFx();
  const flat = useFlat();
  const go = (path: string) => { kgSound('page'); navigate(path); };
  const join = () => { const id = code.trim().split(/[/?#]/).filter(Boolean).pop(); if (id) go(`/kingdom/join/${id}`); };
  return (
    <div className="kingdom kg-page kg-menu" data-testid="kg-menu-page">
      <Scene phase="morning" />
      <div className="kg-title-book">
        <div className="kg-title-cover" aria-hidden />
        <section className="kg-title-left">
          <MiniDiorama />
          <p className="kg-title-quote">“The hedges move, the paths change, and somewhere in the maze your treasure is waiting.”</p>
        </section>
        <section className="kg-title-right">
          <small className="kg-title-kicker">A storybook adventure for 2 to 4 heroes</small>
          <h1 className="kg-title"><span>S</span>hifting Kingdom</h1>
          <p className="kg-title-sub">Push the maze. Find your treasures. Race home.</p>
          <nav className="kg-menu-list" aria-label="Menu">
            <button type="button" className="kg-mark kg-mark-gold" onClick={() => go('/kingdom/host')} data-testid="kg-host"><b>Host online</b><small>Invite your party with a link</small></button>
            {joining ? (
              <form className="kg-mark kg-join" onSubmit={(e) => { e.preventDefault(); join(); }}>
                <input autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste the invite link" aria-label="Invite link" data-testid="kg-join-input" />
                <button type="submit" className="kg-btn kg-btn-sm">Join</button>
              </form>
            ) : <button type="button" className="kg-mark" onClick={() => setJoining(true)} data-testid="kg-join"><b>Join a friend</b><small>Use their invite link</small></button>}
            <button type="button" className="kg-mark" onClick={() => go('/kingdom/bot')} data-testid="kg-vs-bot"><b>Play vs computer</b><small>Page, Squire or Sage</small></button>
            <button type="button" className="kg-mark" onClick={() => go('/kingdom/local')} data-testid="kg-pass"><b>Pass and play</b><small>One screen, a book between turns</small></button>
            <div className="kg-menu-row">
              <button type="button" className="kg-btn" onClick={() => setHowto(true)} data-testid="kg-howto">How to play</button>
              <button type="button" className="kg-btn" onClick={() => setSettings((s) => !s)} aria-expanded={settings} data-testid="kg-settings">Settings</button>
              <button type="button" className="kg-btn kg-btn-ghost" onClick={() => navigate('/')}>‹ All games</button>
            </div>
          </nav>
          {settings && (
            <div className="kg-menu-settings" role="group" aria-label="Settings">
              <label className="kg-row">Animations
                <span className="kg-seg">{(['full', 'fast', 'off'] as const).map((l) => <button key={l} type="button" aria-pressed={fx === l} onClick={() => setFx(l)}>{l === 'full' ? 'Full' : l === 'fast' ? 'Fast' : 'Off'}</button>)}</span>
              </label>
              <label className="kg-row">Flat board (no tilt) <input type="checkbox" checked={flat} onChange={(e) => setFlat(e.target.checked)} /></label>
              <SoundRows />
            </div>
          )}
        </section>
      </div>
      {howto && <HowTo onClose={() => setHowto(false)} />}
    </div>
  );
}

