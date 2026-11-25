import type { ReactElement } from 'react';
import { HERO_COLOR, HERO_DEEP } from '../text';
import { INK } from './Defs';

/**
 * The four heroes as illustrated standees (viewBox -50..50 x -104..12, feet at 0,0): chibi proportions so they read
 * small, a coloured base ring, an idle breathe (CSS) and a walking cycle (`walking` swings the legs and arms).
 */
export const HERO_VIEWBOX = '-50 -122 100 136';
const o = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Face({ y = -66 }: { y?: number }) {
  return (
    <g>
      <circle cx="0" cy={y} r="17" fill="url(#kg-skin)" {...o} />
      <circle cx="-6" cy={y + 1} r="2.6" fill={INK} /><circle cx="6" cy={y + 1} r="2.6" fill={INK} />
      <circle cx="-5.2" cy={y} r=".9" fill="#fff" /><circle cx="6.8" cy={y} r=".9" fill="#fff" />
      <ellipse cx="-10" cy={y + 6} rx="3.4" ry="2" fill="#f3a0a0" opacity=".7" /><ellipse cx="10" cy={y + 6} rx="3.4" ry="2" fill="#f3a0a0" opacity=".7" />
      <path d={`M-3.5,${y + 7} Q0,${y + 10} 3.5,${y + 7}`} stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
function Legs({ color, boot = '#5a3a20' }: { color: string; boot?: string }) {
  return (
    <g>
      <g className="kg-leg-l"><path d="M-7,-24 V-7" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M-7,-24 V-7" stroke={color} strokeWidth="5" strokeLinecap="round" /><ellipse cx="-8" cy="-5" rx="6" ry="4" fill={boot} {...o} strokeWidth="2.4" /></g>
      <g className="kg-leg-r"><path d="M7,-24 V-7" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M7,-24 V-7" stroke={color} strokeWidth="5" strokeLinecap="round" /><ellipse cx="8" cy="-5" rx="6" ry="4" fill={boot} {...o} strokeWidth="2.4" /></g>
    </g>
  );
}
function Base({ hero }: { hero: number }) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="28" ry="9" fill={HERO_DEEP[hero]} {...o} />
      <ellipse cx="0" cy="-1" rx="28" ry="9" fill={HERO_COLOR[hero]} {...o} />
      <ellipse cx="0" cy="-2" rx="20" ry="5.5" fill="#fff" opacity=".25" />
    </g>
  );
}

const BODY: ReactElement[] = [
  // Knight: silver armour, scarlet tabard with a gold crown, open helm with a plume, round shield, sword
  <g key="k">
    <Legs color="#b8c2cc" boot="#7a8590" />
    <path d="M-17,-52 Q-20,-30 -16,-20 H16 Q20,-30 17,-52 Q0,-58 -17,-52 Z" fill="url(#kg-silver)" {...o} />
    <path d="M-11,-50 H11 L13,-20 H-13 Z" fill="url(#kg-hero-0)" {...o} strokeWidth="2.4" />
    <path d="M-5,-40 L-3,-35 H3 L5,-40 L2,-37.5 L0,-41 L-2,-37.5 Z" fill="url(#kg-gold)" stroke={INK} strokeWidth="1.2" />
    <g className="kg-arm-r"><path d="M16,-46 L26,-30" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M16,-46 L26,-30" stroke="#cfd6de" strokeWidth="5" strokeLinecap="round" />
      <path d="M27,-32 L36,-62" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M27,-32 L36,-62" stroke="#eef2f6" strokeWidth="3" strokeLinecap="round" /><path d="M22,-34 L32,-30" {...o} strokeWidth="4" /></g>
    <g className="kg-arm-l"><circle cx="-22" cy="-34" r="13" fill="url(#kg-hero-0)" {...o} /><circle cx="-22" cy="-34" r="7" fill="none" stroke="url(#kg-gold)" strokeWidth="3" /><circle cx="-22" cy="-34" r="2.6" fill="url(#kg-gold)" /></g>
    <Face />
    <path d="M-18,-68 Q-18,-88 0,-88 Q18,-88 18,-68 L14,-68 Q12,-80 0,-80 Q-12,-80 -14,-68 Z" fill="url(#kg-silver)" {...o} />
    <path d="M0,-88 Q6,-104 20,-100 Q12,-96 10,-88" fill="url(#kg-hero-0)" {...o} strokeWidth="2.4" />
  </g>,
  // Ranger: green hood and cloak, leather tunic, bow and quiver
  <g key="r">
    <path d="M-20,-60 Q-26,-30 -18,-14 H18 Q26,-30 20,-60 Z" fill="url(#kg-hero-1)" {...o} />
    <Legs color="#6b4a2a" />
    <path d="M-12,-52 Q-14,-30 -12,-20 H12 Q14,-30 12,-52 Z" fill="#a06a3c" {...o} strokeWidth="2.4" />
    <path d="M-12,-30 H12" stroke="#5a3a20" strokeWidth="4" /><rect x="-3" y="-33" width="6" height="6" rx="1" fill="url(#kg-gold)" stroke={INK} strokeWidth="1.2" />
    <path d="M20,-78 Q34,-50 18,-20" fill="none" stroke="#6b4a2a" strokeWidth="4.5" strokeLinecap="round" />
    <path d="M20,-78 L18,-20" stroke="#f4e9d0" strokeWidth="1.2" />
    <g className="kg-arm-l"><path d="M-14,-46 L-22,-30" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M-14,-46 L-22,-30" stroke="#2f7d3a" strokeWidth="5" strokeLinecap="round" /></g>
    <g className="kg-arm-r"><path d="M14,-46 L20,-32" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M14,-46 L20,-32" stroke="#2f7d3a" strokeWidth="5" strokeLinecap="round" /></g>
    <Face />
    <path d="M-20,-62 Q-24,-90 0,-92 Q22,-92 22,-66 Q14,-84 0,-82 Q-16,-82 -20,-62 Z" fill="url(#kg-hero-1)" {...o} />
    <path d="M-18,-84 Q-20,-70 -16,-60" stroke="#174a20" strokeWidth="2" fill="none" />
    <path d="M-4,-82 Q2,-88 10,-86" stroke="#9bd17d" strokeWidth="2" fill="none" />
  </g>,
  // Sorceress: violet-blue robe and starry pointed hat, flowing hair, a staff topped by a star
  <g key="s">
    <g className="kg-leg-l kg-leg-r" />
    <path d="M-12,-52 Q-24,-24 -24,-6 Q0,0 24,-6 Q24,-24 12,-52 Z" fill="url(#kg-hero-2)" {...o} />
    <path d="M-20,-14 Q0,-8 20,-14" stroke="url(#kg-gold)" strokeWidth="3" fill="none" />
    {[[-10, -30], [8, -24], [-2, -40]].map(([x, y], i) => <path key={i} d={`M${x},${y - 3} L${x + 1},${y - 1} L${x + 3},${y} L${x + 1},${y + 1} L${x},${y + 3} L${x - 1},${y + 1} L${x - 3},${y} L${x - 1},${y - 1} Z`} fill="#fff3b0" />)}
    <path d="M-17,-74 Q-22,-50 -14,-40 L-10,-56 Z M17,-74 Q22,-50 14,-40 L10,-56 Z" fill="#3b2a6a" {...o} strokeWidth="2.4" />
    <g className="kg-arm-r"><path d="M12,-46 L22,-34" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M12,-46 L22,-34" stroke="#5a4fcf" strokeWidth="5" strokeLinecap="round" />
      <path d="M26,-4 L26,-80" stroke="#7a4a2a" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M26,-96 L29,-88 L37,-88 L31,-83 L33,-75 L26,-80 L19,-75 L21,-83 L15,-88 L23,-88 Z" fill="#ffe27a" {...o} strokeWidth="2" className="kg-staff-star" /></g>
    <g className="kg-arm-l"><path d="M-12,-46 L-20,-30" stroke={INK} strokeWidth="9" strokeLinecap="round" /><path d="M-12,-46 L-20,-30" stroke="#5a4fcf" strokeWidth="5" strokeLinecap="round" /></g>
    <Face />
    <path d="M-28,-76 Q0,-84 28,-76 Q22,-70 0,-72 Q-22,-70 -28,-76 Z" fill="url(#kg-hero-2)" {...o} />
    <path d="M-15,-78 L4,-120 Q8,-110 15,-78 Z" fill="url(#kg-hero-2)" {...o} />
    <path d="M-2,-96 L0,-92 L4,-92 L1,-89 L2,-85 L-1,-87 L-4,-85 L-3,-89 L-6,-92 L-2,-92 Z" fill="#ffe27a" />
  </g>,
  // Bard: honey-gold tunic with puffed sleeves, feathered cap, lute
  <g key="b">
    <Legs color="#7a4a8a" />
    <path d="M-15,-52 Q-19,-30 -15,-18 H15 Q19,-30 15,-52 Q0,-56 -15,-52 Z" fill="url(#kg-hero-3)" {...o} />
    <path d="M-15,-22 H15" stroke="#7a4a8a" strokeWidth="4" />
    <circle cx="-17" cy="-48" r="7" fill="#f8e2a8" {...o} strokeWidth="2.4" /><circle cx="17" cy="-48" r="7" fill="#f8e2a8" {...o} strokeWidth="2.4" />
    <g className="kg-arm-l">
      <path d="M-6,-24 L22,-54" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M-6,-24 L22,-54" stroke="#8a5329" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="-8" cy="-26" rx="12" ry="9" fill="#c98d4e" {...o} transform="rotate(-45 -8 -26)" />
      <circle cx="-7" cy="-27" r="3" fill="#5a3a20" />
      <path d="M20,-58 l6,-4 l2,4 z" fill="#5a3a20" {...o} strokeWidth="1.6" />
    </g>
    <Face />
    <path d="M-20,-74 Q-18,-90 2,-90 Q20,-90 20,-76 Q4,-80 -20,-74 Z" fill="#7a4a8a" {...o} />
    <path d="M14,-84 Q30,-100 36,-92 Q28,-94 18,-80" fill="#fff3d8" {...o} strokeWidth="2.2" />
  </g>,
];

export function HeroFigure({ hero, walking }: { hero: number; walking?: boolean }) {
  return (
    <g className={walking ? 'kg-walk' : undefined}>
      <Base hero={hero} />
      {BODY[hero] ?? BODY[0]}
    </g>
  );
}
