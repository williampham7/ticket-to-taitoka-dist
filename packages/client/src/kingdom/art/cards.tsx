import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { TREASURE_NAME, type TreasureId } from '@boboland/shared/src/kingdom';
import { TreasureGlyph } from './treasures';
import { Tent } from './tiles';
import { HERO_COLOR } from '../text';
import { ms } from '../fx';

/** A deckled (torn-paper) edge, generated once: many tiny steps around the card's outline. */
const DECKLE = (() => {
  const pts: string[] = [];
  const n = 18;
  const j = (k: number) => (Math.sin(k * 12.9898) * 43758.5453) % 1;
  const wob = (k: number) => 0.6 + Math.abs(j(k)) * 1.6;
  for (let k = 0; k <= n; k++) pts.push(`${(k / n) * 100}% ${wob(k)}%`);
  for (let k = 0; k <= n; k++) pts.push(`${100 - wob(k + 40) * 0.8}% ${(k / n) * 100}%`);
  for (let k = n; k >= 0; k--) pts.push(`${(k / n) * 100}% ${100 - wob(k + 80)}%`);
  for (let k = n; k >= 0; k--) pts.push(`${wob(k + 120) * 0.8}% ${(k / n) * 100}%`);
  return `polygon(${pts.join(',')})`;
})();

/** An illustrated storybook card: deckled parchment, a gold frame, the treasure and its name. */
export function StoryCard({ t, small }: { t: TreasureId; small?: boolean }) {
  return (
    <div className={`kg-card${small ? ' kg-card-sm' : ''}`} style={{ clipPath: DECKLE }} data-t={t}>
      <div className="kg-card-frame">
        <svg viewBox="0 0 100 100" className="kg-card-art" aria-hidden><circle cx="50" cy="52" r="46" fill="url(#kg-glow)" opacity=".55" /><TreasureGlyph t={t} /></svg>
        <b>{TREASURE_NAME[t]}</b>
      </div>
    </div>
  );
}

/** The back: wax-sealed parchment. */
export function CardBack({ small }: { small?: boolean }) {
  return (
    <div className={`kg-card kg-card-back${small ? ' kg-card-sm' : ''}`} style={{ clipPath: DECKLE }}>
      <svg viewBox="0 0 100 140" className="kg-card-seal" aria-hidden>
        <path d="M10,46 L50,70 L90,46 M10,94 L50,70 L90,94" stroke="#c9ad74" strokeWidth="1.6" fill="none" />
        <path d="M50,52 Q62,50 68,60 Q74,72 66,82 Q58,92 46,90 Q32,88 30,76 Q28,62 38,56 Q44,52 50,52 Z" fill="#b8323c" stroke="#5e1218" strokeWidth="2" />
        <circle cx="50" cy="71" r="12" fill="#a42630" stroke="#7a1820" strokeWidth="1.6" />
        <path d="M42,76 L44,66 L48,71 L50,63 L52,71 L56,66 L58,76 Z" fill="#e0868c" stroke="#7a1820" strokeWidth="1" />
        <path d="M58,88 Q60,100 54,106 M44,90 Q40,100 46,108" stroke="#b8323c" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** "Return home": your tent and banner. */
export function HomeCard({ hero, small }: { hero: number; small?: boolean }) {
  return (
    <div className={`kg-card kg-card-home${small ? ' kg-card-sm' : ''}`} style={{ clipPath: DECKLE, ['--pc' as string]: HERO_COLOR[hero] } as CSSProperties}>
      <div className="kg-card-frame">
        <svg viewBox="0 0 100 100" className="kg-card-art" aria-hidden>
          <circle cx="50" cy="54" r="44" fill="url(#kg-glow)" opacity=".7" />
          <ellipse cx="50" cy="80" rx="38" ry="9" fill="#9fcd6c" stroke="#4a3020" strokeWidth="2" />
          <g transform="translate(50,58) scale(2.6)"><Tent x={0} y={0} hero={hero} /></g>
        </svg>
        <b>Return home</b>
      </div>
    </div>
  );
}

/**
 * The player's target: the current card (every remaining card in Young Adventurer mode), or "Return home".
 * When a treasure is found (`flipKey` changes) the next card flips over from its wax-sealed back.
 */
export function TargetCard({ targets, young, home, hero, flipKey }: { targets: TreasureId[]; young: boolean; home: boolean; hero: number; flipKey: number }) {
  const first = useRef(flipKey);
  const [flip, setFlip] = useState(0);
  useEffect(() => { if (flipKey !== first.current) setFlip((f) => f + 1); }, [flipKey]);
  const style = { ['--flip-ms' as string]: `${Math.max(1, ms('collect') * 0.5)}ms` } as CSSProperties;
  const front = home ? <HomeCard hero={hero} small={young} /> : <div className={`kg-cards${young ? ' kg-cards-young' : ''}`}>{(young ? targets : targets.slice(0, 1)).map((t) => <StoryCard key={t} t={t} small={young && targets.length > 2} />)}</div>;
  return (
    <div className={`kg-flipper${flip ? ' kg-flipping' : ''}`} key={flip} style={style}>
      <div className="kg-face kg-face-front">{front}</div>
      {flip > 0 && <div className="kg-face kg-face-back"><CardBack small={young} /></div>}
    </div>
  );
}
