import { INK } from './palette';

/** The Eye of Horus, facing right, in a 120 x 84 box. */
export function EyeOfHorus({ fill = 'url(#egw-gold)' }: { fill?: string }) {
  return (
    <g fill="none" stroke={fill} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 16 Q60 0 114 14 L112 21 Q60 9 10 23 Z" fill={fill} stroke="none" />
      <path d="M12 42 Q58 16 106 38 Q60 58 12 42 Z" strokeWidth="5" />
      <circle cx="58" cy="39" r="10.5" fill={fill} stroke="none" />
      <path d="M106 38 L119 38" strokeWidth="5" />
      <path d="M44 52 L38 80" strokeWidth="5" />
      <path d="M64 53 Q70 76 88 74 Q100 70 95 60 Q89 53 82 61" strokeWidth="4.5" />
    </g>
  );
}

/** Lapis field, gold diaper, and a cartouche holding two Eyes of Horus: the same either way up. */
export function EgyptianBack() {
  const eye = (
    <g transform="translate(125 117) scale(0.62) translate(-60 -42)"><EyeOfHorus /></g>
  );
  const corner = (
    <use href="#egw-lotus" x="22" y="22" width="30" height="24" fill="url(#egw-gold)" opacity="0.85" />
  );
  return (
    <g data-back="egyptian">
      <rect x="1.5" y="1.5" width="247" height="347" rx="15" fill="url(#egw-lapis)" stroke="#0a1230" strokeWidth="1.5" />
      <rect x="10" y="10" width="230" height="330" rx="9" fill="url(#egw-diaper)" />
      <rect x="8.5" y="8.5" width="233" height="333" rx="10" fill="none" stroke="url(#egw-gold)" strokeWidth="3" />
      <rect x="15" y="15" width="220" height="320" rx="6" fill="none" stroke="url(#egw-gold)" strokeWidth="1" />
      {corner}
      <g transform="rotate(180 125 175)">{corner}</g>
      <g transform="translate(250 0) scale(-1 1)">{corner}</g>
      <g transform="translate(0 350) scale(1 -1)">{corner}</g>
      {/* the cartouche: a rope oval with a bar at both ends */}
      <rect x="68" y="62" width="114" height="226" rx="57" fill={INK.lapisDeep} stroke="url(#egw-gold)" strokeWidth="5" />
      <rect x="76" y="70" width="98" height="210" rx="49" fill="none" stroke="url(#egw-gold)" strokeWidth="2" strokeDasharray="3 3" />
      <rect x="80" y="51" width="90" height="7" rx="3" fill="url(#egw-gold)" />
      <rect x="80" y="292" width="90" height="7" rx="3" fill="url(#egw-gold)" />
      {eye}
      <g transform="rotate(180 125 175)">{eye}</g>
      <circle cx="125" cy="175" r="15" fill="none" stroke="url(#egw-gold)" strokeWidth="2" />
      <circle cx="125" cy="175" r="8.5" fill="url(#egw-gold)" />
      <path d="M125 151v8M125 191v8M101 175h8M141 175h8" stroke="url(#egw-gold)" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}
