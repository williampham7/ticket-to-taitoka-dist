import { useId, type ReactNode } from 'react';
import type { Card } from '@boboland/shared';
import { CARD_FILL, cardBackground, cardInk, cardName } from '../theme';

/**
 * Rail (Europe build) train cards: a 1930s continental poster card. A fine double frame with art-deco fan
 * corners, the colour's name on an enamel plate, and an engraved carriage in an arched window. Every colour has
 * its own carriage AND its own corner pip (diamond, triangle, ...), so a colour can be told apart without
 * seeing its hue. The locomotive (wild) card is a streamlined deco engine on a sunburst of all seven colours.
 * Same 64×92 footprint as the vintage cards.
 */

type Colour = Exclude<Card, 'locomotive'>;
const SHAPE = 'rail-card relative h-[92px] w-[64px] shrink-0 overflow-hidden rounded-[9px]';
const BRASS = '#d6b25e';

/** Which carriage each colour shows. */
const KIND: Record<Colour, 'dining' | 'baggage' | 'observation' | 'mail' | 'sleeper' | 'hopper' | 'saloon'> = {
  red: 'dining', orange: 'baggage', yellow: 'observation', green: 'mail', blue: 'sleeper', black: 'hopper', white: 'saloon',
};

/** A small shape per colour, for players who can't rely on hue (also shown on the swatches). */
export function Pip({ card, color, size = 7 }: { card: Card; color: string; size?: number }) {
  const s = size;
  const shape: Record<Card, ReactNode> = {
    red: <path d="M5,0.6 L9.4,5 L5,9.4 L0.6,5Z" fill={color} />,
    orange: <path d="M5,0.8 L9.5,9 H0.5Z" fill={color} />,
    yellow: <circle cx="5" cy="5" r="4.2" fill={color} />,
    green: <path d="M3.4,0.6 H6.6 V3.4 H9.4 V6.6 H6.6 V9.4 H3.4 V6.6 H0.6 V3.4 H3.4Z" fill={color} />,
    blue: <rect x="1" y="1" width="8" height="8" fill={color} />,
    black: <path d="M5,0.4 L6.2,3.6 L9.6,3.7 L6.9,5.8 L7.9,9.2 L5,7.2 L2.1,9.2 L3.1,5.8 L0.4,3.7 L3.8,3.6Z" fill={color} />,
    white: <circle cx="5" cy="5" r="3.5" fill="none" stroke={color} strokeWidth="1.6" />,
    locomotive: <path d="M5,0.4 L6,4 L9.6,5 L6,6 L5,9.6 L4,6 L0.4,5 L4,4Z" fill={color} />,
  };
  return <svg width={s} height={s} viewBox="0 0 10 10" aria-hidden className="block">{shape[card]}</svg>;
}

/** Engraved carriage side, 50×30, in the card's ink (`c`), details cut out in `cut`. */
function Carriage({ kind, c, cut }: { kind: (typeof KIND)[Colour]; c: string; cut: string }) {
  const wheel = (cx: number) => (
    <g key={cx}>
      <circle cx={cx} cy="24.6" r="2.5" fill={c} />
      <circle cx={cx} cy="24.6" r=".8" fill={cut} />
    </g>
  );
  const bogies = (
    <g>
      <rect x="7" y="20.5" width="36" height="1.4" fill={c} />
      {[12, 38].map((x) => <rect key={x} x={x - 6} y="21.6" width="12" height="1.3" rx=".6" fill={c} />)}
      {[8.8, 15.2, 34.8, 41.2].map(wheel)}
      <rect x="1.4" y="17.4" width="3.6" height="1.3" rx=".5" fill={c} />
      <rect x="45" y="17.4" width="3.6" height="1.3" rx=".5" fill={c} />
      {/* rail and sleepers */}
      <rect x="0" y="27.6" width="50" height="1" fill={c} opacity=".75" />
      {Array.from({ length: 7 }, (_, i) => <rect key={i} x={1.5 + i * 7.2} y="28.6" width="3.2" height=".9" fill={c} opacity=".45" />)}
    </g>
  );
  const roof = (clerestory = false) => (
    <g>
      <path d="M5,8.6 Q25,4.4 45,8.6 L45.6,9.4 H4.4 Z" fill={c} />
      {clerestory && <rect x="12" y="4.6" width="26" height="2.4" rx=".6" fill={c} />}
      {clerestory && [15, 20, 25, 30, 35].map((x) => <rect key={x} x={x} y="5.2" width="1.6" height="1.1" fill={cut} />)}
    </g>
  );
  const body = <rect x="5" y="9.2" width="40" height="11.4" rx=".8" fill={c} />;
  const waist = (y = 17) => <rect x="5" y={y} width="40" height=".7" fill={cut} />;
  switch (kind) {
    case 'dining': // wide windows with little table lamps, a door at each end
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          {roof()}{body}
          {[11.5, 20.5, 29.5].map((x) => (
            <g key={x}>
              <rect x={x} y="11" width="7.4" height="5" rx=".7" fill={cut} />
              <path d={`M${x + 3.7},13.6 l-1.4,1.8 h2.8z`} fill={c} />
            </g>
          ))}
          {[6.4, 39].map((x) => <rect key={x} x={x} y="10.6" width="4.2" height="9" rx=".5" fill="none" stroke={cut} strokeWidth=".7" />)}
          {waist(17.6)}{bogies}
        </svg>
      );
    case 'baggage': // two big sliding doors with cross-braces, tiny high windows
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          {roof()}{body}
          {[9, 28].map((x) => (
            <g key={x}>
              <rect x={x} y="10.6" width="12" height="9" fill="none" stroke={cut} strokeWidth=".7" />
              <path d={`M${x},10.6 L${x + 12},19.6 M${x + 12},10.6 L${x},19.6`} stroke={cut} strokeWidth=".55" />
            </g>
          ))}
          {[23, 42].map((x) => <rect key={x} x={x} y="11" width="2.4" height="2" fill={cut} />)}
          {bogies}
        </svg>
      );
    case 'observation': // windows forward, an open balcony with railings at the rear
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          <path d="M5,8.6 Q22,4.6 38,7.8 L46,8.6 L46.4,9.4 H4.4 Z" fill={c} />
          <rect x="5" y="9.2" width="31" height="11.4" rx=".8" fill={c} />
          {[7.5, 14, 20.5, 27].map((x) => <rect key={x} x={x} y="11" width="5" height="5.6" rx="1.2" fill={cut} />)}
          {/* balcony: posts and railing */}
          <rect x="36" y="9.2" width="10" height=".9" fill={c} />
          <rect x="36" y="15.4" width="10" height=".9" fill={c} />
          {[37, 39.5, 42, 44.5].map((x) => <rect key={x} x={x} y="15.4" width=".6" height="5.2" fill={c} />)}
          <rect x="45.4" y="9.2" width=".9" height="11.4" fill={c} />
          <rect x="36" y="19.8" width="10.4" height=".9" fill={c} />
          {waist(17.6)}{bogies}
        </svg>
      );
    case 'mail': // closed van with louvres and a post-horn medallion
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          {roof()}{body}
          {[7.5, 37.5].map((x) => <g key={x}>{[11.4, 13.2, 15, 16.8].map((y) => <rect key={y} x={x} y={y} width="5" height=".7" fill={cut} />)}</g>)}
          <circle cx="25" cy="14.6" r="4.2" fill="none" stroke={cut} strokeWidth=".75" />
          {/* post horn */}
          <path d="M21.8,15 Q25,11.6 28.2,15 M28.2,15 l.9,-1.4 l.5,2.2z M22.4,15 a1.4,1.2 0 1 0 2.4,0" fill="none" stroke={cut} strokeWidth=".7" />
          <rect x="15" y="10.6" width="5" height="9" fill="none" stroke={cut} strokeWidth=".6" />
          <rect x="30" y="10.6" width="5" height="9" fill="none" stroke={cut} strokeWidth=".6" />
          {bogies}
        </svg>
      );
    case 'sleeper': // paired small windows high up, an oval crest in the middle panel
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          {roof(true)}{body}
          {[7.5, 12, 32.5, 37].map((x) => <rect key={x} x={x} y="11" width="3.4" height="3.6" rx=".6" fill={cut} />)}
          <ellipse cx="25" cy="14.4" rx="4.6" ry="3.2" fill="none" stroke={cut} strokeWidth=".75" />
          <path d="M22.8,14.4 h4.4 M25,12.6 v3.6" stroke={cut} strokeWidth=".55" />
          <rect x="5" y="17.4" width="40" height=".6" fill={cut} />
          <rect x="5" y="18.6" width="40" height=".4" fill={cut} />
          {bogies}
        </svg>
      );
    case 'hopper': // planked open wagon heaped with coal
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          <path d="M7,9.6 Q12,5.4 18,7.4 Q24,4.4 31,7 Q37,5.2 43,9.6Z" fill={c} opacity=".7" />
          {[[14, 7.4], [24, 6], [33, 7], [19, 8.4], [38, 8.4]].map(([x, y]) => <circle key={`${x}`} cx={x} cy={y} r=".7" fill={cut} />)}
          <rect x="5" y="9.4" width="40" height="11.2" rx=".4" fill={c} />
          {[12.2, 14.8, 17.4].map((y) => <rect key={y} x="5" y={y} width="40" height=".5" fill={cut} />)}
          {[5.6, 15, 25, 35, 43.6].map((x) => <rect key={x} x={x} y="9.4" width=".9" height="11.2" fill={cut} opacity=".7" />)}
          <path d="M15,9.8 L24.4,20 M25.6,9.8 L35,20" stroke={cut} strokeWidth=".55" />
          {bogies}
        </svg>
      );
    case 'saloon': // first-class saloon: clerestory roof, a long run of tall windows
    default:
      return (
        <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
          {roof(true)}{body}
          {[7, 12.4, 17.8, 23.2, 28.6, 34].map((x) => <rect key={x} x={x} y="10.8" width="4" height="5.8" rx="1.6" fill={cut} />)}
          <rect x="40" y="10.6" width="4" height="9" rx=".5" fill="none" stroke={cut} strokeWidth=".7" />
          {waist(18)}{bogies}
        </svg>
      );
  }
}

/** A streamlined art-deco steam engine: bullet nose, horizontal speed bands, side skirts. 60×30. */
function StreamLoco({ c, cut }: { c: string; cut: string }) {
  return (
    <svg width="58" height="29" viewBox="0 0 60 30" aria-hidden>
      {/* smoke */}
      <path d="M44,4 q-6,-3 -12,-1 q-5,1.6 -10,0" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" opacity=".45" />
      {/* tender */}
      <path d="M1,9.6 H12.4 V21.4 H1 Z" fill={c} />
      {/* cab and the long streamlined casing ending in a bullet nose */}
      <path d="M14,6.4 H24 V9 H40 C50,9 57,13.6 58.4,19.4 L58.4,21.4 H14 Z" fill={c} />
      <rect x="16.4" y="9" width="5" height="4.4" rx=".8" fill={cut} />
      {/* the speed bands sweeping into the nose */}
      <path d="M13,15 H44 C50,15 54,16.6 56.6,18.4" fill="none" stroke={cut} strokeWidth=".9" />
      <path d="M13,17.2 H44 C49,17.2 52.4,18.4 55,19.8" fill="none" stroke={cut} strokeWidth=".6" />
      <rect x="1" y="15" width="11.4" height=".9" fill={cut} />
      <circle cx="55.2" cy="14.4" r="1.1" fill={cut} />
      {/* skirt and wheels peeking below it */}
      <rect x="1" y="21" width="57.4" height="1.4" fill={c} />
      {[4, 9.4, 20, 27.4, 34.8, 50].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy="24.4" r={i >= 2 && i <= 4 ? 3.2 : 2.2} fill={c} />
          <circle cx={x} cy="24.4" r=".8" fill={cut} />
        </g>
      ))}
      <rect x="20" y="23.8" width="14.8" height="1" rx=".5" fill={cut} />
      <rect x="0" y="27.8" width="60" height="1" fill={c} opacity=".75" />
    </svg>
  );
}

/** The fine printed frame: an outer rule, an inner rule, a deco fan in each corner. Coloured with `rule`. */
function Frame({ rule, fan }: { rule: string; fan: string }) {
  const corner = (tx: number, ty: number, rot: number) => (
    <g key={`${tx}${ty}`} transform={`translate(${tx},${ty}) rotate(${rot})`}>
      <path d="M0,0 L7,0 A7,7 0 0 1 0,7 Z" fill={fan} />
      {[20, 45, 70].map((d) => {
        const a = (d * Math.PI) / 180;
        return <line key={d} x1="0" y1="0" x2={(Math.cos(a) * 7).toFixed(2)} y2={(Math.sin(a) * 7).toFixed(2)} stroke={rule} strokeWidth=".5" />;
      })}
      <path d="M0,9.4 A9.4,9.4 0 0 0 9.4,0" fill="none" stroke={rule} strokeWidth=".55" />
    </g>
  );
  return (
    <svg className="pointer-events-none absolute inset-0" width="64" height="92" viewBox="0 0 64 92" aria-hidden>
      <rect x="2.6" y="2.6" width="58.8" height="86.8" rx="6.6" fill="none" stroke={rule} strokeWidth=".9" />
      <rect x="4.6" y="4.6" width="54.8" height="82.8" rx="4.8" fill="none" stroke={rule} strokeWidth=".45" />
      {corner(4.6, 4.6, 0)}{corner(59.4, 4.6, 90)}{corner(59.4, 87.4, 180)}{corner(4.6, 87.4, 270)}
    </svg>
  );
}

/** The arched window in the middle of the card, with faint sunburst rays rising from its sill. */
function Arch({ tint, ray, id }: { tint: string; ray: string; id: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0" width="64" height="92" viewBox="0 0 64 92" aria-hidden>
      <defs><clipPath id={id}><path d="M9,72 V40 A23,23 0 0 1 55,40 V72 Z" /></clipPath></defs>
      <path d="M9,72 V40 A23,23 0 0 1 55,40 V72 Z" fill={tint} />
      <g clipPath={`url(#${id})`}>
        {Array.from({ length: 13 }, (_, i) => {
          const a = Math.PI + (i * Math.PI) / 12;
          return <line key={i} x1="32" y1="72" x2={(32 + Math.cos(a) * 60).toFixed(1)} y2={(72 + Math.sin(a) * 60).toFixed(1)} stroke={ray} strokeWidth="1.6" />;
        })}
      </g>
      <path d="M9,72 V40 A23,23 0 0 1 55,40 V72" fill="none" stroke={ray} strokeWidth=".7" />
    </svg>
  );
}

const ink = (card: Card) => cardInk(card);
const lightCard = (card: Card) => card === 'white' || card === 'yellow';

/** The face of a rail train card. */
export function RailCardTile({ card, count, className = '' }: { card: Card; count?: number; className?: string }) {
  const id = `rc${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const loco = card === 'locomotive';
  if (loco) return <RailLocoTile count={count} className={className} id={id} />;
  const light = lightCard(card);
  const i = ink(card);
  const rule = light ? 'rgba(31,42,36,.5)' : 'rgba(251,247,234,.62)';
  const fan = light ? 'rgba(31,42,36,.16)' : 'rgba(251,247,234,.2)';
  const tint = light ? 'rgba(31,42,36,.07)' : 'rgba(0,0,0,.16)';
  const ray = light ? 'rgba(31,42,36,.1)' : 'rgba(251,247,234,.1)';
  const cut = light ? 'rgba(251,247,234,.92)' : CARD_FILL[card];
  return (
    <div className={`${SHAPE} ${className}`} data-rail-card={card} style={{ background: cardBackground(card) }}>
      <div className="rail-card-finish pointer-events-none absolute inset-0" />
      <Arch tint={tint} ray={ray} id={id} />
      <Frame rule={rule} fan={fan} />
      {/* the enamel name plate */}
      <span className={`rail-plate absolute left-1/2 top-[8px] -translate-x-1/2 whitespace-nowrap ${light ? 'rail-plate-dark' : 'rail-plate-light'}`}>{cardName(card)}</span>
      <span className="absolute left-1/2 top-[44px] -translate-x-1/2"><Carriage kind={KIND[card]} c={i} cut={cut} /></span>
      <span className="absolute bottom-[8px] left-[9px]"><Pip card={card} color={i} /></span>
      {count !== undefined && <Count n={count} />}
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span key={n} className="rail-count pop absolute bottom-[5px] right-[5px] min-w-[22px] px-1 text-center tabular-nums">{n}</span>;
}

/** The wild card: deep enamel green, a sunburst of all seven colours, a brass streamliner. */
function RailLocoTile({ count, className, id }: { count?: number; className: string; id: string }) {
  const colours = Object.values(CARD_FILL);
  const n = 21;
  return (
    <div className={`${SHAPE} rail-card-loco ${className}`} data-rail-card="locomotive">
      <svg className="pointer-events-none absolute inset-0" width="64" height="92" viewBox="0 0 64 92" aria-hidden>
        <defs><clipPath id={id}><path d="M7,74 V38 A25,25 0 0 1 57,38 V74 Z" /></clipPath></defs>
        <g clipPath={`url(#${id})`}>
          {Array.from({ length: n }, (_, k) => {
            const a0 = Math.PI + (k * Math.PI) / n, a1 = Math.PI + ((k + 1) * Math.PI) / n;
            const p = (a: number) => `${(32 + Math.cos(a) * 70).toFixed(1)},${(74 + Math.sin(a) * 70).toFixed(1)}`;
            return <path key={k} d={`M32,74 L${p(a0)} L${p(a1)} Z`} fill={colours[k % colours.length]} />;
          })}
        </g>
        <path d="M7,74 V38 A25,25 0 0 1 57,38 V74 Z" fill="none" stroke={BRASS} strokeWidth=".9" />
      </svg>
      <Frame rule="rgba(214,178,94,.85)" fan="rgba(214,178,94,.3)" />
      <span className="rail-plate rail-plate-brass absolute left-1/2 top-[8px] -translate-x-1/2 whitespace-nowrap">Locomotive</span>
      <span className="rail-loco-art absolute left-1/2 top-[45px] -translate-x-1/2"><StreamLoco c="#15241f" cut="#f1d991" /></span>
      <span className="absolute bottom-[8px] left-[9px]"><Pip card="locomotive" color={BRASS} /></span>
      {count !== undefined && <Count n={count} />}
    </div>
  );
}

/** A winged wheel in brass: the generic emblem of the railway (no company's mark). */
export function WingedWheel({ w = 40, color = BRASS }: { w?: number; color?: string }) {
  const feathers = (dir: 1 | -1) => [0, 1, 2, 3].map((k) => {
    const x0 = 20 + dir * 6.5, len = 13 - k * 2.4, y = 9.6 + k * 2.3;
    return <path key={`${dir}${k}`} d={`M${x0},${y} Q${x0 + dir * len * 0.6},${y - 2.6} ${x0 + dir * len},${y - 1.4} Q${x0 + dir * len * 0.6},${y + 0.8} ${x0},${y + 1.6}Z`} fill={color} />;
  });
  return (
    <svg width={w} height={w * 0.55} viewBox="0 0 40 22" aria-hidden className="block">
      {feathers(-1)}{feathers(1)}
      <circle cx="20" cy="12" r="6.6" fill="none" stroke={color} strokeWidth="1.5" />
      {[0, 45, 90, 135].map((d) => {
        const a = (d * Math.PI) / 180;
        return <line key={d} x1={20 - Math.cos(a) * 6} y1={12 - Math.sin(a) * 6} x2={20 + Math.cos(a) * 6} y2={12 + Math.sin(a) * 6} stroke={color} strokeWidth=".8" />;
      })}
      <circle cx="20" cy="12" r="1.8" fill={color} />
      <rect x="11" y="19.4" width="18" height="1.2" rx=".6" fill={color} />
    </svg>
  );
}

/** The back of a rail train card: green enamel, a brass guilloche, the winged wheel. */
export function RailCardBack({ className = '', label }: { className?: string; label?: string }) {
  return (
    <div className={`${SHAPE} rail-card-back grid place-items-center ${className}`}>
      <Frame rule="rgba(214,178,94,.8)" fan="rgba(214,178,94,.25)" />
      <div className="relative flex flex-col items-center gap-[5px]">
        <WingedWheel w={42} />
        {label && <span className="rail-back-label">{label}</span>}
      </div>
    </div>
  );
}

/** A destination ticket seen from the back, for animations: buff card stock, a green band, the title. */
export function RailTicketBack({ className = '' }: { className?: string }) {
  return (
    <div className={`rail-ticket-back relative flex h-[58px] w-[96px] flex-col items-center justify-center overflow-hidden rounded-[6px] leading-none ${className}`}>
      <span className="rail-ticket-back-band absolute inset-y-0 left-[10px] w-[7px]" aria-hidden />
      <WingedWheel w={24} color="#7b1e2b" />
      <span className="mt-[4px] font-display text-[8px] font-bold tracking-[0.24em] text-[#7b1e2b]">DESTINATION</span>
    </div>
  );
}

export function RailSwatch({ card, size = 14 }: { card: Card; size?: number }) {
  const light = lightCard(card);
  return (
    <span className="rail-swatch relative inline-grid shrink-0 place-items-center align-middle"
      style={{ width: size, height: size * 1.4, background: card === 'locomotive' ? '#1b2e27' : cardBackground(card) }}>
      <Pip card={card} color={card === 'locomotive' ? BRASS : light ? 'rgba(31,42,36,.75)' : 'rgba(251,247,234,.85)'} size={Math.max(5, Math.round(size * 0.5))} />
    </span>
  );
}
