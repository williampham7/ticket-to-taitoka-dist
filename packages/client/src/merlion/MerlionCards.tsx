import type { ReactNode } from 'react';
import type { Card } from '@boboland/shared';
import { CARD_FILL, cardBackground, cardName } from '../theme';

/**
 * Merlion (Singapore build) train cards. The colour fills the card, its name sits on a white pill, and an
 * arched shophouse window shows a Singapore motif, one per colour, so a colour can be told apart without
 * seeing its hue: red Chinese lantern, orange Sentosa cable car, yellow durian, green Supertree grove,
 * blue Merlion, black Marina Bay at night with fireworks, white orchid. The locomotive (wild) card is a
 * driverless MRT train in the six line colours. Same 64x92 footprint as every other theme.
 */

type Colour = Exclude<Card, 'locomotive'>;
const SHAPE = 'mrt-card relative h-[92px] w-[64px] shrink-0 overflow-hidden rounded-[11px]';
const INK = '#10343c';
const ORCHID = '#c2268a';

/** A Vanda Miss Joaquim orchid, centred on 0,0, about 30 wide. */
export function Orchid({ x = 0, y = 0, s = 1, petal = '#e45ab0', light = '#f6b4dc' }: { x?: number; y?: number; s?: number; petal?: string; light?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <ellipse cx="0" cy="-9.5" rx="4.6" ry="8" fill={petal} stroke={INK} strokeWidth=".7" />
      <ellipse cx="0" cy="-9.5" rx="4.6" ry="8" transform="rotate(72)" fill={petal} stroke={INK} strokeWidth=".7" />
      <ellipse cx="0" cy="-9.5" rx="4.6" ry="8" transform="rotate(-72)" fill={petal} stroke={INK} strokeWidth=".7" />
      <ellipse cx="0" cy="-9.5" rx="4.6" ry="8" transform="rotate(144)" fill={petal} stroke={INK} strokeWidth=".7" />
      <ellipse cx="0" cy="-9.5" rx="4.6" ry="8" transform="rotate(-144)" fill={petal} stroke={INK} strokeWidth=".7" />
      <ellipse cx="0" cy="-8.4" rx="1.9" ry="4.4" fill={light} />
      <ellipse cx="0" cy="-8.4" rx="1.9" ry="4.4" transform="rotate(72)" fill={light} />
      <ellipse cx="0" cy="-8.4" rx="1.9" ry="4.4" transform="rotate(-72)" fill={light} />
      <circle r="3" fill="#f7d34a" stroke={INK} strokeWidth=".7" />
      <circle r="1.1" fill={ORCHID} />
    </g>
  );
}

/** The MRT line colours, in the order of the locomotive's stripe. */
export const MRT_LINES = ['#d42e12', '#009645', '#9900aa', '#fa9e0d', '#005ec4', '#9d5b25'];

/** A driverless MRT train, side view, nose to the right; fits a 50 wide window. */
function MrtTrain({ y = 20 }: { y?: number }) {
  return (
    <g transform={`translate(0 ${y})`} strokeLinejoin="round">
      <path d="M-6,0 H34 C42,0 49,6 52,13 V22 H-6Z" fill="#fff" stroke={INK} strokeWidth="1.1" />
      {MRT_LINES.map((c, i) => <rect key={c} x="-6" y={13.2 + i * 1.55} width="55" height="1.55" fill={c} />)}
      {[-2, 9, 20].map((x) => <rect key={x} x={x} y="3.4" width="8" height="7" rx="1.4" fill="#2b5a78" stroke={INK} strokeWidth=".7" />)}
      <path d="M31,3.4 H35 C40,3.4 44,6.6 46,10.4 H31Z" fill="#2b5a78" stroke={INK} strokeWidth=".7" />
      <path d="M33,3.5 L35,3.5 L33,9" stroke="#fff" strokeWidth=".6" opacity=".7" fill="none" />
      <circle cx="47.4" cy="18.4" r="1.3" fill="#ffe27a" stroke={INK} strokeWidth=".5" />
      <rect x="-6" y="22" width="58" height="2.2" fill={INK} />
      {[4, 36].map((x) => <rect key={x} x={x} y="24" width="9" height="2" rx="1" fill="#556b72" />)}
    </g>
  );
}

const Sparkle = ({ x, y, s = 1, fill = '#f7d34a' }: { x: number; y: number; s?: number; fill?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0,-3.4 L.9,-.9 L3.4,0 L.9,.9 L0,3.4 L-.9,.9 L-3.4,0 L-.9,-.9Z" fill={fill} />
);

/** One Supertree: trunk, an umbrella canopy and a few lights. */
function Supertree({ x, top, w = 12, lit }: { x: number; top: number; w?: number; lit: string }) {
  return (
    <g strokeLinejoin="round">
      <path d={`M${x - 2.2},${top + 8} L${x - w * 0.34},56 H${x + w * 0.34} L${x + 2.2},${top + 8}Z`} fill="#7f8f88" stroke={INK} strokeWidth=".8" />
      <path d={`M${x - 3},${top + 20} H${x + 3} M${x - 3.6},${top + 32} H${x + 3.6}`} stroke={INK} strokeWidth=".6" />
      <path d={`M${x - w},${top + 9} Q${x},${top - 9} ${x + w},${top + 9} Q${x},${top + 13} ${x - w},${top + 9}Z`} fill="#17a673" stroke={INK} strokeWidth=".9" />
      <path d={`M${x},${top - 1} V${top + 11} M${x - w * 0.55},${top + 3} L${x - w * 0.3},${top + 11} M${x + w * 0.55},${top + 3} L${x + w * 0.3},${top + 11}`} stroke="#0b6e4b" strokeWidth=".7" fill="none" />
      {[-0.6, 0, 0.6].map((k) => <circle key={k} cx={x + k * w} cy={top + 9.6 - Math.abs(k) * 1.2} r="1.1" fill={lit} />)}
    </g>
  );
}

/** Each colour's picture, drawn into a 50x54 window (keep the subject within x 5..45). */
const MOTIF: Record<Colour, ReactNode> = {
  red: (
    <g strokeLinejoin="round">
      {/* a Chinese lantern for Chinatown, with a tassel */}
      <rect x="-5" y="-5" width="60" height="64" fill="#fff1e6" />
      <path d="M25,-2 V8" stroke={INK} strokeWidth="1" />
      <rect x="18.5" y="7.4" width="13" height="3.6" rx="1" fill="#f2b632" stroke={INK} strokeWidth=".8" />
      <ellipse cx="25" cy="23.5" rx="14" ry="13" fill="#e0443a" stroke={INK} strokeWidth="1.1" />
      <ellipse cx="25" cy="23.5" rx="7" ry="13" fill="none" stroke="#a82a24" strokeWidth=".9" />
      <path d="M25,10.5 V36.5 M11.5,23.5 H38.5" stroke="#a82a24" strokeWidth=".8" />
      <path d="M13,16 Q25,12.6 37,16 M13,31 Q25,34.4 37,31" fill="none" stroke="#a82a24" strokeWidth=".7" />
      <ellipse cx="19" cy="17" rx="3.4" ry="1.6" fill="#fff" opacity=".4" transform="rotate(-24 19 17)" />
      <rect x="18.5" y="36" width="13" height="3.6" rx="1" fill="#f2b632" stroke={INK} strokeWidth=".8" />
      <path d="M25,39.6 V46 M22,40 Q21,46 22.5,50 M28,40 Q29,46 27.5,50 M25,46 l-2.4,5 M25,46 l2.4,5" stroke="#f2b632" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="25" cy="46" r="1.7" fill="#f2b632" stroke={INK} strokeWidth=".5" />
      <Sparkle x={7} y={14} s={1.2} /><Sparkle x={43} y={34} s={1.1} /><Sparkle x={9} y={40} s={.8} fill="#e0443a" />
    </g>
  ),
  orange: (
    <g strokeLinejoin="round">
      {/* the Sentosa cable car over a bright sea, a palm on the shore */}
      <rect x="-5" y="-5" width="60" height="64" fill="#fff4de" />
      <circle cx="40" cy="12" r="6" fill="#ffd36a" />
      <path d="M-5,14 L55,3" stroke={INK} strokeWidth="1" />
      <path d="M26,8.7 V17" stroke={INK} strokeWidth="1.1" />
      <path d="M17,16.6 H35 L37,20 V32 Q37,34 35,34 H17 Q15,34 15,32 V20Z" fill="#f28a1c" stroke={INK} strokeWidth="1.1" />
      <rect x="14" y="15" width="24" height="3" rx="1.4" fill="#c4600d" stroke={INK} strokeWidth=".7" />
      <rect x="18" y="20.6" width="7" height="7" rx="1.2" fill="#d4efff" stroke={INK} strokeWidth=".7" />
      <rect x="27" y="20.6" width="7" height="7" rx="1.2" fill="#d4efff" stroke={INK} strokeWidth=".7" />
      <rect x="15" y="29.6" width="22" height="2.2" fill="#fff" opacity=".7" />
      <path d="M-5,45 Q2,42 8,45 T20,45 T32,45 T44,45 T56,45 V60 H-5Z" fill="#6fd0cf" stroke={INK} strokeWidth=".8" />
      <path d="M4,50 q4,-2 8,0 M22,52 q4,-2 8,0 M36,49 q4,-2 8,0" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
      <path d="M41,46 Q38,38 40,30" fill="none" stroke="#8a5a2b" strokeWidth="2" strokeLinecap="round" />
      <path d="M40,30 Q33,28 31,34 M40,30 Q46,27 49,32 M40,30 Q39,23 33,23 M40,30 Q44,24 49,23" fill="none" stroke="#10996a" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  ),
  yellow: (
    <g strokeLinejoin="round">
      {/* a durian, the king of fruit */}
      <rect x="-5" y="-5" width="60" height="64" fill="#fff9de" />
      <path d="M25,12 Q24,6 29,4" fill="none" stroke="#6b5a2b" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M28,6 Q36,2 40,8 Q33,10 28,6Z" fill="#43b377" stroke={INK} strokeWidth=".8" />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2, r = 16;
        const cx = 25 + Math.cos(a) * r, cy = 31 + Math.sin(a) * r * 0.92;
        const nx = Math.cos(a), ny = Math.sin(a), tx = -ny, ty = nx;
        return <path key={i} d={`M${(cx + tx * 3.2).toFixed(1)},${(cy + ty * 3.2).toFixed(1)} L${(cx + nx * 4.6).toFixed(1)},${(cy + ny * 4.2).toFixed(1)} L${(cx - tx * 3.2).toFixed(1)},${(cy - ty * 3.2).toFixed(1)}Z`} fill="#8fa83a" stroke={INK} strokeWidth=".7" />;
      })}
      <ellipse cx="25" cy="31" rx="16" ry="14.8" fill="#c9d24c" stroke={INK} strokeWidth="1.1" />
      <path d="M25,16.5 Q19,31 25,45.5 M25,16.5 Q31,31 25,45.5" fill="none" stroke="#8fa83a" strokeWidth=".9" />
      {[[16, 24], [34, 24], [14, 34], [36, 35], [20, 41], [30, 41], [25, 30]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x - 2.2},${y + 1.6} L${x},${y - 2.6} L${x + 2.2},${y + 1.6}Z`} fill="#a3b83f" stroke="#5f7424" strokeWidth=".6" />)}
      <ellipse cx="17.5" cy="22" rx="3.6" ry="1.6" fill="#fff" opacity=".4" transform="rotate(-30 17.5 22)" />
    </g>
  ),
  green: (
    <g strokeLinejoin="round">
      {/* the Supertree Grove at Gardens by the Bay, lit pink */}
      <rect x="-5" y="-5" width="60" height="64" fill="#e8f7ee" />
      <path d="M-5,48 Q10,40 25,45 Q40,40 55,48 V60 H-5Z" fill="#8bd3a8" />
      <Supertree x={11} top={22} w={9} lit="#ff7fc6" />
      <Supertree x={39} top={19} w={10} lit="#ffd45a" />
      <Supertree x={25} top={8} w={12} lit="#ff7fc6" />
      <path d="M-2,46 H52" stroke={INK} strokeWidth=".8" />
      <path d="M8,36 Q25,42 42,33" fill="none" stroke={INK} strokeWidth="1" />
      <Sparkle x={6} y={9} s={.9} fill="#ffc94d" /><Sparkle x={44} y={6} s={.8} fill="#ff7fc6" />
    </g>
  ),
  blue: (
    <g strokeLinejoin="round">
      {/* the Merlion: lion head, fish body, a jet of water into the bay */}
      <rect x="-5" y="-5" width="60" height="64" fill="#e3f4fb" />
      <path d="M-5,46 Q2,43 8,46 T20,46 T32,46 T44,46 T56,46 V60 H-5Z" fill="#6cc7e6" stroke={INK} strokeWidth=".8" />
      <path d="M26,8 Q22,16 14,18 Q8,20 2,28" fill="none" stroke="#7fd0ee" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M2,28 Q0,31 1.5,33" fill="none" stroke="#7fd0ee" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24,24 C20,32 22,40 27,46 H40 C42,40 44,35 41,31 C44,30 47,26 46,21 C44,26 40,28 37,25 C35,28 33,26 32,24Z" fill="#f4f6f8" stroke={INK} strokeWidth="1.1" />
      {[[27, 31], [33, 31], [39, 33], [30, 37], [36, 38], [27, 42], [33, 43], [39, 42]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x - 2.6},${y} q2.6,3 5.2,0`} fill="none" stroke="#6cb2cf" strokeWidth=".8" />)}
      <path d="M42,31 Q47,30 49,25 Q45,27 43,24" fill="#e6edf1" stroke={INK} strokeWidth=".8" />
      {Array.from({ length: 11 }, (_, i) => {
        const a = (i / 11) * Math.PI * 2;
        return <circle key={i} cx={(30 + Math.cos(a) * 9.4).toFixed(1)} cy={(15 + Math.sin(a) * 9.4).toFixed(1)} r="3.4" fill="#f3d27a" stroke={INK} strokeWidth=".7" />;
      })}
      <circle cx="30" cy="15" r="8.6" fill="#f7e2a6" stroke={INK} strokeWidth="1" />
      <circle cx="26.6" cy="12.6" r="1.2" fill={INK} /><circle cx="33.4" cy="12.6" r="1.2" fill={INK} />
      <path d="M28.6,16 Q30,15 31.4,16 L30,17.6Z" fill="#c9783a" stroke={INK} strokeWidth=".6" />
      <path d="M25.6,18.6 Q30,22 31,20.4" fill="#d8453a" stroke={INK} strokeWidth=".7" />
      <path d="M26,10.2 q1.6,-1 3,0 M31.4,10.2 q1.6,-1 3,0" stroke={INK} strokeWidth=".6" fill="none" />
      <path d="M0,48 q4,-2 8,0 M30,51 q4,-2 8,0" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </g>
  ),
  black: (
    <g strokeLinejoin="round">
      {/* Marina Bay Sands at night, National Day fireworks over it */}
      <rect x="-5" y="-5" width="60" height="64" fill="#162341" />
      {[[6, 6], [44, 22], [12, 28], [40, 5], [33, 12]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r=".7" fill="#fff" opacity=".8" />)}
      <g stroke="#ff7fc6" strokeWidth="1" strokeLinecap="round">
        {Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <line key={i} x1={(11 + Math.cos(a) * 2.6).toFixed(1)} y1={(12 + Math.sin(a) * 2.6).toFixed(1)} x2={(11 + Math.cos(a) * 7.2).toFixed(1)} y2={(12 + Math.sin(a) * 7.2).toFixed(1)} />; })}
      </g>
      <g stroke="#ffd45a" strokeWidth="1" strokeLinecap="round">
        {Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2 + .3; return <line key={i} x1={(40 + Math.cos(a) * 2).toFixed(1)} y1={(10 + Math.sin(a) * 2).toFixed(1)} x2={(40 + Math.cos(a) * 5.6).toFixed(1)} y2={(10 + Math.sin(a) * 5.6).toFixed(1)} />; })}
      </g>
      <path d="M-5,50 H55 V60 H-5Z" fill="#0d1730" />
      <path d="M-5,49 Q5,47 12,49 T28,49 T44,49 T56,49" fill="none" stroke="#3f6fb0" strokeWidth=".9" />
      {[[11, 30, 40], [22, 30, 40], [33, 30, 40]].map(([x]) => (
        <path key={x} d={`M${x - 1},26 L${x + 5},26 L${x + 7},50 L${x - 3},50Z`} fill="#c9d6ea" stroke="#0d1730" strokeWidth=".7" />
      ))}
      <path d="M3,25.4 Q10,22 24,23.6 Q38,22 48,25.4 L46,28 Q24,25.6 5,28Z" fill="#e8f0fb" stroke="#0d1730" strokeWidth=".8" />
      {[[10, 32], [10, 38], [10, 44], [21, 32], [21, 38], [21, 44], [32, 32], [32, 38], [32, 44]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="2" height="2.2" fill="#ffd45a" />)}
      <path d="M12,23 q2,-5 6,-3 M34,22.6 q3,-4 7,-3" fill="none" stroke="#6ea6e8" strokeWidth="1.2" strokeLinecap="round" />
    </g>
  ),
  white: (
    <g strokeLinejoin="round">
      {/* a Vanda Miss Joaquim orchid, the national flower */}
      <rect x="-5" y="-5" width="60" height="64" fill="#fdf2fa" />
      <path d="M5,54 Q14,46 21,37 T27,29" fill="none" stroke="#3f9e6a" strokeWidth="2" strokeLinecap="round" />
      <path d="M8,50 Q2,44 4,36 Q11,40 8,50Z" fill="#43b377" stroke={INK} strokeWidth=".8" />
      <path d="M18,41 Q26,42 30,48 Q22,50 18,41Z" fill="#43b377" stroke={INK} strokeWidth=".8" />
      <Orchid x={28} y={25} s={1.2} />
      <Orchid x={13} y={14} s={.58} petal="#f08ccb" light="#fbd0ea" />
      <circle cx="42" cy="44" r="2.2" fill="#e45ab0" stroke={INK} strokeWidth=".6" /><circle cx="46" cy="40" r="1.5" fill="#f08ccb" stroke={INK} strokeWidth=".5" />
    </g>
  ),
};

/** Faint tile dots over the card colour, darker on the light cards. */
const dots = (light: boolean) =>
  `radial-gradient(circle, ${light ? 'rgba(16,52,60,.07)' : 'rgba(255,255,255,.16)'} 1.3px, transparent 1.7px) 0 0 / 8px 8px`;
const lightCard = (card: Card) => card === 'white' || card === 'yellow';

/** The face of a Singapore train card. */
export function MerlionCardTile({ card, count, className = '' }: { card: Card; count?: number; className?: string }) {
  const loco = card === 'locomotive';
  const bg = loco ? `${dots(false)}, ${cardBackground(card)}` : `${dots(lightCard(card))}, ${CARD_FILL[card]}`;
  return (
    <div className={`${SHAPE} ${loco ? 'mrt-card-loco' : ''} ${className}`} data-mrt-card={card} style={{ background: bg }}>
      <span className={`mrt-plate absolute left-1/2 top-[5px] -translate-x-1/2 whitespace-nowrap ${loco ? 'mrt-plate-loco' : ''}`}>{cardName(card)}</span>
      <span className="mrt-window absolute left-[6px] right-[6px] top-[21px] bottom-[8px] overflow-hidden">
        <svg viewBox="0 0 50 54" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden className="block">
          {loco ? (
            <>
              <rect x="-5" y="-5" width="60" height="64" fill="#e9f6fb" />
              <path d="M-5,30 V16 h5 v-8 h6 v8 h4 v-12 h7 v12 h5 v-6 h6 v6 h6 v-9 h6 v9 H55 V32Z" fill="#c4dde7" />
              <MrtTrain y={22} />
              <path d="M-5,50 H55" stroke="#9fb7bf" strokeWidth="2" />
              <Sparkle x={9} y={10} s={1} /><Sparkle x={41} y={9} s={.8} fill="#ff7fc6" />
            </>
          ) : MOTIF[card]}
        </svg>
      </span>
      {count !== undefined && <Count n={count} />}
    </div>
  );
}

function Count({ n }: { n: number }) {
  return <span key={n} className="mrt-count pop absolute bottom-[3px] right-[3px] min-w-[22px] px-1 text-center tabular-nums">{n}</span>;
}

/** The orchid on the card backs and ticket backs. */
export function MerlionBadge({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-15 -15 30 30" aria-hidden className="block">
      <Orchid s={0.95} />
    </svg>
  );
}

/** The back of a Singapore train card: a Peranakan tile field in deep teal with a cream medallion and an orchid. */
export function MerlionCardBack({ className = '', label }: { className?: string; label?: string }) {
  return (
    <div className={`${SHAPE} mrt-card-back grid place-items-center ${className}`}>
      <div className="relative flex flex-col items-center gap-[3px]">
        <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[#fffdf6] shadow-[0_0_0_2px_#10343c,0_0_0_4px_#f2b632]">
          <MerlionBadge size={32} />
        </span>
        {label && <span className="mrt-back-label">{label}</span>}
      </div>
    </div>
  );
}

/** A destination ticket seen from the back, for animations: a travel-pass card with the contactless waves. */
export function MerlionTicketBack({ className = '' }: { className?: string }) {
  return (
    <div className={`mrt-ticket-back relative flex h-[58px] w-[96px] flex-col items-center justify-center overflow-hidden rounded-[10px] leading-none ${className}`}>
      <span className="mrt-tile-strip absolute inset-x-0 top-0 h-[9px]" aria-hidden />
      <Waves size={20} />
      <span className="mt-[4px] font-display text-[8.5px] font-semibold tracking-[0.18em] text-white">TRAVEL PASS</span>
    </div>
  );
}

/** The contactless symbol: four arcs. */
export function Waves({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="block shrink-0" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M4,6 Q8,10 4,14" /><path d="M8,3.5 Q14.4,10 8,16.5" /><path d="M12,1.4 Q20.4,10 12,18.6" opacity=".75" />
    </svg>
  );
}

/** A small swatch of a card colour (in the claim picker, logs...): a rounded chip; the locomotive gets the MRT stripes. */
export function MerlionSwatch({ card, size = 14 }: { card: Card; size?: number }) {
  return (
    <span className="mrt-swatch relative inline-block shrink-0 align-middle"
      style={{ width: size, height: size * 1.4, background: cardBackground(card) }}>
      {card === 'white' && <span className="absolute left-1/2 top-1/2 block h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c2268a]/60" />}
    </span>
  );
}
