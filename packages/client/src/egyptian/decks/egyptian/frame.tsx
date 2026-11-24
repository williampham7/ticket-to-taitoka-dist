import { rankLabel, type Suit } from '@boboland/shared/src/egyptian';
import { HOUSES, suitInk } from './palette';

const INDEX_FONT = "'Barlow Condensed', 'Arial Narrow', sans-serif";

/** Papyrus stock with an aged edge, fibre grain and a gold double border. */
export function Stock() {
  return (
    <g>
      <rect x="1.5" y="1.5" width="247" height="347" rx="15" fill="url(#egw-papyrus)" stroke="#8f7a50" strokeWidth="1.5" />
      <rect x="1.5" y="1.5" width="247" height="347" rx="15" fill="#000" filter="url(#egw-fibre)" />
      <rect x="1.5" y="1.5" width="247" height="347" rx="15" fill="url(#egw-aged)" />
      <rect x="8.5" y="8.5" width="233" height="333" rx="10" fill="none" stroke="url(#egw-gold)" strokeWidth="2.8" />
      <rect x="13.5" y="13.5" width="223" height="323" rx="7" fill="none" stroke="url(#egw-gold)" strokeWidth="0.9" />
    </g>
  );
}

/** A narrow lotus frieze across the top and bottom edge, between the corner indices. */
export function Frieze({ suit }: { suit: Suit }) {
  const h = HOUSES[suit];
  const band = (
    <g>
      <rect x="62" y="17" width="126" height="13" rx="2" fill={h.main} opacity="0.92" />
      <rect x="62" y="17" width="126" height="13" rx="2" fill="none" stroke="url(#egw-gold)" strokeWidth="1" />
      {Array.from({ length: 8 }, (_, i) => (
        <use key={i} href="#egw-lotus" x={64.5 + i * 15.4} y="18.6" width="13" height="10.4" fill={i % 2 ? h.accent : 'url(#egw-gold)'} />
      ))}
    </g>
  );
  return <g>{band}<g transform="rotate(180 125 175)">{band}</g></g>;
}

/** Large rank + suit in the top-left corner, and rotated in the bottom-right. */
export function Indices({ rank, suit }: { rank: number; suit: Suit }) {
  const label = rankLabel(rank);
  const fill = suitInk(suit);
  const one = (
    <g fill={fill}>
      <text x="31" y="60" textAnchor="middle" fontFamily={INDEX_FONT} fontWeight="700" fontSize="50"
        {...(label.length > 1 ? { textLength: 38, lengthAdjust: 'spacingAndGlyphs' } : {})}>{label}</text>
      <use href={`#egw-suit-${suit}`} x="17" y="66" width="28" height="28" fill={fill} />
    </g>
  );
  return <g data-index={label}>{one}<g transform="rotate(180 125 175)">{one}</g></g>;
}
