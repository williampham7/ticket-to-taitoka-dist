import { useEffect, useState, type CSSProperties } from 'react';
import type { KView } from '@boboland/shared/src/kingdom';
import type { Anim } from './useKingdomFx';
import { HeroPortrait } from './art/portraits';
import { HERO_COLOR, heroName, heroOf } from './text';
import { load } from '../lib/storage';
import { getFx, ms } from './fx';

/** The turn ribbon: unrolls with the hero's portrait and name, holds, and rolls away. */
export function TurnRibbon({ d, anim, names, me }: { d: KView; anim: Anim | null; names: Record<string, string>; me: string | null }) {
  if (!anim || anim.e.k !== 'turn') return null;
  const p = anim.e.p;
  const h = heroOf(d, p);
  const mine = p === me;
  return (
    <div key={anim.key} className={`kg-ribbon${mine ? ' kg-ribbon-me' : ''}`} style={{ ['--dur' as string]: `${anim.dur}ms`, ['--pc' as string]: HERO_COLOR[h] } as CSSProperties} role="status" data-testid="kg-ribbon">
      <span className="kg-ribbon-tail kg-ribbon-tail-l" /><span className="kg-ribbon-tail kg-ribbon-tail-r" />
      <span className="kg-ribbon-body">
        <span className="kg-ribbon-face"><HeroPortrait hero={h} /></span>
        <span><b>{mine ? 'Your turn!' : `${names[p] ?? heroName(d, p)}'s turn`}</b><small>the {heroName(d, p)}</small></span>
      </span>
    </div>
  );
}

/** The win: fireworks over the castle and rose-petal confetti across the page (the hero hops in the overlay). */
export function Celebration({ anim }: { d: KView; anim: Anim | null; T: number }) {
  if (!anim || anim.e.k !== 'win') return null;
  return (
    <div key={anim.key} className="kg-celebrate" style={{ ['--dur' as string]: `${anim.dur}ms` } as CSSProperties} aria-hidden data-testid="kg-celebrate">
      {[[78, 14, 0, '#ffd34d'], [88, 26, 1, '#f49ac0'], [70, 30, 2, '#9fd3f2'], [84, 8, 3, '#ff8a6a'], [62, 16, 4, '#c6f08a']].map(([x, y, i, c]) => (
        <span key={i} className="kg-firework" style={{ left: `${x}%`, top: `${y}%`, ['--i' as string]: i, ['--c' as string]: c } as CSSProperties}>
          {Array.from({ length: 12 }, (_, j) => <i key={j} style={{ ['--a' as string]: `${j * 30}deg` } as CSSProperties} />)}
        </span>
      ))}
      {Array.from({ length: 36 }, (_, j) => <i key={j} className="kg-petal" style={{ left: `${(j * 37) % 100}%`, ['--j' as string]: j, ['--r' as string]: `${(j * 53) % 360}deg` } as CSSProperties} />)}
    </div>
  );
}

/** The intro: a book opens and its pages turn to reveal the board. Skippable; kg.intro = 'seen' turns it off. */
export function Intro({ title }: { title: string }) {
  const [on, setOn] = useState(() => getFx() !== 'off' && load<string | null>('kg.intro', null) !== 'seen');
  useEffect(() => { if (!on) return; const t = setTimeout(() => setOn(false), ms('intro')); return () => clearTimeout(t); }, [on]);
  if (!on) return null;
  return (
    <div className="kg-intro" style={{ ['--dur' as string]: `${ms('intro')}ms` } as CSSProperties} onClick={() => setOn(false)} data-testid="kg-intro">
      <div className="kg-intro-book">
        <div className="kg-intro-page kg-intro-p3" />
        <div className="kg-intro-page kg-intro-p2" />
        <div className="kg-intro-page kg-intro-p1" />
        <div className="kg-intro-cover"><small>A storybook adventure</small><h2>{title}</h2><span className="kg-intro-maze" /></div>
      </div>
      <button type="button" className="kg-btn kg-btn-sm kg-intro-skip" onClick={() => setOn(false)}>Skip ›</button>
    </div>
  );
}
