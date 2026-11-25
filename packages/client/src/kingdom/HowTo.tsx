import { useEffect, useState, type ReactNode } from 'react';
import { E, N, S, W, I_MASK, L_MASK, T_MASK } from '@boboland/shared/src/kingdom';
import { TileSvg } from './art/tiles';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { CardBack, HomeCard, StoryCard } from './art/cards';
import { kgSound } from './sound';

/** How to play: a five-page illustrated storybook, each page with a small looping demo. */
const PAGES: { title: string; text: ReactNode; demo: () => ReactNode }[] = [
  {
    title: 'Your quest',
    text: <>Each hero gets a secret stack of treasure cards. Only you can see the top one: that's where you are heading next. Find it, and your next card turns over.</>,
    demo: () => <div className="kg-demo kg-demo-cards"><div className="kg-demo-flip"><div className="kg-demo-front"><StoryCard t="frog" /></div><div className="kg-demo-back"><CardBack /></div></div></div>,
  },
  {
    title: 'Turn the tile',
    text: <>Every turn starts with the spare tile. Tap it (or the arrows, or press <kbd>R</kbd>) to turn it until its paths point where you want them.</>,
    demo: () => <div className="kg-demo"><div className="kg-demo-spin"><TileSvg tile={{ id: 70, m: T_MASK, t: 'apple' }} /></div></div>,
  },
  {
    title: 'Push the maze',
    text: <>Pick one of the little banners around the board and push the tile in. The whole row slides along and the tile at the far end pops out: it's the next spare. You can't push straight back where the last tile came out.</>,
    demo: () => (
      <div className="kg-demo kg-demo-push">
        <div className="kg-demo-row">
          <div className="kg-demo-in"><TileSvg tile={{ id: 71, m: L_MASK | S }} /></div>
          {[I_MASK, E | W, N | E | W].map((m, i) => <div key={i} className="kg-demo-cell"><TileSvg tile={{ id: 72 + i, m: i === 0 ? E | W : m }} /></div>)}
        </div>
        <span className="kg-demo-flag" />
      </div>
    ),
  },
  {
    title: 'Walk the paths',
    text: <>Now walk as far as you like along connected paths: the squares you can reach glow. Ending on your treasure collects it. You can also stay where you are.</>,
    demo: () => (
      <div className="kg-demo kg-demo-walk">
        <div className="kg-demo-grid">
          {[E | S, E | W, S | W, N | S, N | E | S, N | S | W, N | E, E | W, N | W].map((m, i) => <div key={i} className="kg-demo-cell"><TileSvg tile={{ id: 80 + i, m, ...(i === 8 ? { t: 'goose' as const } : {}) }} /></div>)}
        </div>
        <svg viewBox={HERO_VIEWBOX} className="kg-demo-hero"><HeroFigure hero={1} walking /></svg>
      </div>
    ),
  },
  {
    title: 'Race home',
    text: <>When your stack is empty, your card says <b>Return home</b>. The first hero back to their own tent wins! Younger players can turn on <b>★ Young Adventurer</b>: they see all their cards and may find them in any order.</>,
    demo: () => <div className="kg-demo kg-demo-home"><HomeCard hero={2} /><svg viewBox={HERO_VIEWBOX} className="kg-demo-hero kg-demo-joy"><HeroFigure hero={2} /></svg></div>,
  },
];

export function HowTo({ onClose }: { onClose: () => void }) {
  const [k, setK] = useState(0);
  const turn = (to: number) => { if (to < 0 || to >= PAGES.length) return; kgSound('page'); setK(to); };
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') turn(k + 1); if (e.key === 'ArrowLeft') turn(k - 1); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const p = PAGES[k];
  return (
    <div className="kg-howto" role="dialog" aria-label="How to play" data-testid="kg-howto-book" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="kg-howto-book">
        <section className="kg-howto-pic" key={`pic${k}`}>{p.demo()}</section>
        <section className="kg-howto-text" key={`text${k}`}>
          <small>Page {k + 1} of {PAGES.length}</small>
          <h2>{p.title}</h2>
          <p>{p.text}</p>
          <div className="kg-howto-nav">
            <button type="button" className="kg-btn" onClick={() => turn(k - 1)} disabled={k === 0}>‹ Back</button>
            <span className="kg-howto-dots">{PAGES.map((_, i) => <i key={i} className={i === k ? 'kg-on' : undefined} />)}</span>
            {k < PAGES.length - 1 ? <button type="button" className="kg-btn kg-btn-gold" onClick={() => turn(k + 1)} data-testid="kg-howto-next">Next ›</button> : <button type="button" className="kg-btn kg-btn-gold" onClick={onClose}>Let's play!</button>}
          </div>
        </section>
        <button type="button" className="kg-x kg-howto-x" aria-label="Close" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
