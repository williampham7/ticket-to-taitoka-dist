import { navigate } from '../lib/router';
import './picker.css';

/* Land masses and the borders inside them (art only, 320 x 240). */
const WEST = 'M14,70 C26,50 52,40 80,46 C98,50 114,40 132,48 C148,56 150,76 140,90 C132,102 138,116 124,128 C110,142 90,140 76,154 C66,166 48,164 40,150 C34,136 18,130 16,112 C14,96 6,84 14,70Z';
const EAST = 'M172,44 C192,30 224,32 248,38 C270,42 296,36 308,54 C318,70 304,86 306,102 C308,120 290,134 270,132 C252,130 240,142 220,138 C202,134 196,118 184,110 C170,100 158,86 160,70 C161,58 164,50 172,44Z';
const SOUTH = 'M150,162 C166,154 190,158 204,168 C218,180 214,198 206,210 C198,222 184,232 172,228 C160,224 162,210 152,200 C142,190 136,172 150,162Z';
const ISLE = 'M262,170 C272,164 288,166 292,176 C296,186 286,194 274,192 C264,190 254,178 262,170Z';
const RED_ZONE = 'M0,0 L90,0 C86,30 100,58 90,86 C82,112 96,136 86,240 L0,240Z';
const BLUE_ZONE = 'M238,0 C232,40 250,70 240,100 C234,120 246,140 242,240 L320,240 L320,0Z';
const BORDERS = ['M90,40 C86,62 100,74 92,96 C86,114 96,128 88,150', 'M240,34 C234,56 250,76 240,100 C234,116 244,128 240,140', 'M132,92 C116,96 104,104 96,100'];
const RIVERS = ['M60,60 C66,80 58,96 66,112 C72,126 64,140 70,152', 'M200,52 C206,70 196,84 210,98 C220,108 214,122 224,132'];
const RIDGE = [[40, 92], [48, 86], [56, 92], [64, 86], [72, 92], [262, 64], [270, 58], [278, 64], [286, 58]];

/** Warfront's card on the `/` picker: a corner of the general's war table. */
export function WarfrontCard({ follower }: { follower: boolean }) {
  return (
    <button type="button" className="ep-card wf-ep" onClick={() => !follower && navigate('/warfront')} data-testid="warfront-card" aria-label="Warfront: territory conquest for 2 to 6 players">
      <span className="ep-art wf-ep-art" aria-hidden>
        <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="wf-ep-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2f8496" /><stop offset=".55" stopColor="#1f6c80" /><stop offset="1" stopColor="#164a5c" /></linearGradient>
            <linearGradient id="wf-ep-land" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stopColor="#c9cfae" /><stop offset=".35" stopColor="#9fb47c" /><stop offset=".6" stopColor="#d6c08a" /><stop offset="1" stopColor="#a7ad76" /></linearGradient>
            <linearGradient id="wf-ep-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8e2a0" /><stop offset=".5" stopColor="#c99a3c" /><stop offset="1" stopColor="#7d5a1c" /></linearGradient>
            <linearGradient id="wf-ep-red" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#f2a3a3" /><stop offset=".4" stopColor="#c8323c" /><stop offset="1" stopColor="#7d1a22" /></linearGradient>
            <linearGradient id="wf-ep-blue" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#a9c1f5" /><stop offset=".4" stopColor="#2f63d6" /><stop offset="1" stopColor="#183a85" /></linearGradient>
            <linearGradient id="wf-ep-gold" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#f7dc93" /><stop offset=".4" stopColor="#e2a01a" /><stop offset="1" stopColor="#8f5f00" /></linearGradient>
            <pattern id="wf-ep-h-red" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-2,9 L9,-2 M3,12 L12,3" stroke="#7d1a22" strokeWidth="1.2" /></pattern>
            <pattern id="wf-ep-h-blue" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0,0 L7,7 M7,0 L0,7" stroke="#183a85" strokeWidth=".9" /></pattern>
            <pattern id="wf-ep-h-gold" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.1" fill="#8f5f00" /></pattern>
            <pattern id="wf-ep-waves" width="22" height="10" patternUnits="userSpaceOnUse"><path d="M0,6 Q5.5,2 11,6 T22,6" fill="none" stroke="#bfe6e6" strokeWidth=".6" opacity=".35" /></pattern>
            <filter id="wf-ep-relief" x="0" y="0" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="7" result="n" />
              <feDiffuseLighting in="n" surfaceScale="2.2" lightingColor="#fff4da" result="l"><feDistantLight azimuth="225" elevation="50" /></feDiffuseLighting>
              <feComposite in="l" in2="SourceGraphic" operator="in" result="lc" />
              <feBlend in="SourceGraphic" in2="lc" mode="multiply" />
            </filter>
            <filter id="wf-ep-pencil" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" /></filter>
            <filter id="wf-ep-drop" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1.2" dy="2" stdDeviation="1.2" floodColor="#140c05" floodOpacity=".6" /></filter>
            <clipPath id="wf-ep-west"><path d={WEST} /></clipPath>
            <clipPath id="wf-ep-east"><path d={EAST} /></clipPath>
            <clipPath id="wf-ep-sheet"><rect x="10" y="10" width="300" height="220" rx="2" /></clipPath>
            <radialGradient id="wf-ep-lamp" cx=".28" cy=".18" r=".95"><stop offset="0" stopColor="#ffe7aa" stopOpacity=".32" /><stop offset=".45" stopColor="#ffd98a" stopOpacity="0" /><stop offset="1" stopColor="#120a04" stopOpacity=".62" /></radialGradient>
            <symbol id="wf-ep-tank" viewBox="-12 -12 24 24" overflow="visible">
              <rect x="-11" y="2.5" width="22" height="6.5" rx="3.2" /><path d="M-9,2.5 L-7,-1.5 L8,-1.5 L10,2.5Z" /><path d="M-5,-1.5 L-4,-6 L4,-6 L5.5,-1.5Z" /><rect x="4" y="-5.2" width="10" height="1.8" rx=".9" />
            </symbol>
            <symbol id="wf-ep-inf" viewBox="-12 -12 24 24" overflow="visible">
              <path d="M-5,9 L-4.2,0 Q-4.6,-4 -1.5,-5 L1.5,-5 Q4.6,-4 4.2,0 L5,9 L2,9 L1.2,2.5 L-1.2,2.5 L-2,9Z" /><path d="M-4.4,-6.2 Q0,-12.6 4.4,-6.2 L5.2,-5.4 L-5.2,-5.4Z" /><path d="M4,-3.5 L9,-10.5 L10,-9.8 L5.4,-2.4Z" />
            </symbol>
          </defs>
          {/* walnut table under the sheet */}
          <rect width="320" height="240" fill="#3b2414" />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M0,${i * 21 + 4} Q160,${i * 21 + (i % 2 ? 10 : -4)} 320,${i * 21 + 6}`} stroke="#24150b" strokeOpacity=".5" strokeWidth=".8" fill="none" />)}
          <rect x="7" y="8" width="306" height="226" rx="3" fill="#000" opacity=".45" />
          <g clipPath="url(#wf-ep-sheet)">
            <rect x="10" y="10" width="300" height="220" fill="url(#wf-ep-sea)" />
            <rect x="10" y="10" width="300" height="220" fill="url(#wf-ep-waves)" />
            <g stroke="#a7dcdc" strokeOpacity=".35" fill="none" strokeDasharray="2 5" strokeWidth=".6">
              {[60, 120, 180, 240].map((x) => <line key={x} x1={x} y1="10" x2={x} y2="230" />)}
              {[60, 120, 180].map((y) => <line key={y} x1="10" y1={y} x2="310" y2={y} />)}
            </g>
            {/* bathymetry halos */}
            {[[14, 0.1], [8, 0.16], [4, 0.26]].map(([w, o]) => <g key={w} fill="none" stroke="#86cfc9" strokeWidth={w} opacity={o} strokeLinejoin="round">{[WEST, EAST, SOUTH, ISLE].map((d) => <path key={d} d={d} />)}</g>)}
            <g filter="url(#wf-ep-relief)">{[WEST, EAST, SOUTH, ISLE].map((d) => <path key={d} d={d} fill="url(#wf-ep-land)" />)}</g>
            {/* acetate overlays */}
            <g clipPath="url(#wf-ep-west)"><path d={RED_ZONE} fill="#c8323c" opacity=".48" /><path d={RED_ZONE} fill="url(#wf-ep-h-red)" opacity=".35" /></g>
            <g clipPath="url(#wf-ep-east)"><path d={BLUE_ZONE} fill="#2f63d6" opacity=".45" /><path d={BLUE_ZONE} fill="url(#wf-ep-h-blue)" opacity=".35" /></g>
            <path d={SOUTH} fill="#e2a01a" opacity=".45" /><path d={SOUTH} fill="url(#wf-ep-h-gold)" opacity=".4" />
            <path d={ISLE} fill="#e2a01a" opacity=".4" />
            {/* rivers, ridges, borders, coast */}
            <g fill="none" stroke="#3f8fa3" strokeWidth="1.1" strokeLinecap="round" opacity=".8">{RIVERS.map((d) => <path key={d} d={d} />)}</g>
            <g fill="none" stroke="#5d4a2a" strokeWidth=".9" opacity=".7">{RIDGE.map(([x, y]) => <path key={`${x}${y}`} d={`M${x - 4},${y + 3} L${x},${y - 3} L${x + 4},${y + 3}`} />)}</g>
            <g fill="none" stroke="#2a2622" strokeWidth=".9" strokeDasharray="3 1.6" opacity=".75">{BORDERS.map((d) => <path key={d} d={d} />)}</g>
            <g fill="none" stroke="#2f4b4f" strokeWidth="1">{[WEST, EAST, SOUTH, ISLE].map((d) => <path key={d} d={d} />)}</g>
            {/* sea lane */}
            <path d="M206,166 Q238,150 262,172" fill="none" stroke="#0f3445" strokeWidth="1.2" strokeDasharray="4 3" />
            <text x="34" y="214" className="wf-ep-sea-label">OCEANUS</text>
            {/* the attack: grease-pencil arrow */}
            <g filter="url(#wf-ep-pencil)">
              <path className="wf-ep-arrow" d="M104,92 C140,58 176,54 210,76" fill="none" stroke="#c8323c" strokeWidth="5.5" strokeLinecap="round" pathLength="100" />
              <path className="wf-ep-head" d="M198,66 L212,78 L195,84" fill="none" stroke="#c8323c" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* unit tokens */}
            {([[66, 100, 'tank', 'red', 9], [42, 132, 'inf', 'red', 3], [214, 92, 'inf', 'blue', 2], [270, 102, 'tank', 'blue', 7], [178, 196, 'inf', 'gold', 4]] as const).map(([x, y, u, f, n]) => (
              <g key={`${x}${y}`} transform={`translate(${x},${y})`} className={u === 'tank' ? 'wf-ep-token wf-ep-token-move' : 'wf-ep-token'}>
                <ellipse cx="0" cy="9" rx="10" ry="2.6" fill="#000" opacity=".35" />
                <use href={`#wf-ep-${u}`} x="-11" y="-11" width="22" height="22" fill={`url(#wf-ep-${f})`} stroke="#1d150c" strokeWidth=".6" filter="url(#wf-ep-drop)" />
                <g transform="translate(11,6)"><circle r="6" fill="url(#wf-ep-brass)" stroke="#4a3410" strokeWidth=".7" /><circle r="4.6" fill="#fbf4df" /><text className="wf-ep-count" textAnchor="middle" dy="2.4">{n}</text></g>
              </g>
            ))}
            {/* push-pin flag on the target */}
            <g className="wf-ep-pin" transform="translate(222,72)">
              <line x1="0" y1="0" x2="0" y2="-24" stroke="#3a2a14" strokeWidth="1.6" />
              <path d="M0,-24 L16,-19.5 L0,-15Z" fill="#c8323c" stroke="#5a1015" strokeWidth=".6" />
              <circle cy="-24" r="2.4" fill="url(#wf-ep-brass)" />
              <ellipse cx="1" cy="1" rx="3" ry="1" fill="#000" opacity=".35" />
            </g>
            {/* compass rose */}
            <g transform="translate(40,184)" opacity=".9">
              <circle r="17" fill="none" stroke="#e9dcb5" strokeWidth=".8" strokeDasharray="1.5 2.5" />
              <circle r="12" fill="none" stroke="#e9dcb5" strokeWidth=".7" />
              <path d="M0,-20 L3,0 L0,20 L-3,0Z" fill="url(#wf-ep-brass)" stroke="#5a3e12" strokeWidth=".5" />
              <path d="M-20,0 L0,-3 L20,0 L0,3Z" fill="#e9dcb5" opacity=".85" />
              <text y="-23" textAnchor="middle" className="wf-ep-n">N</text>
            </g>
            {/* scale bar */}
            <g transform="translate(232,218)"><rect width="60" height="4" fill="#fbf4df" stroke="#2b2116" strokeWidth=".6" /><rect width="15" height="4" fill="#2b2116" /><rect x="30" width="15" height="4" fill="#2b2116" /></g>
          </g>
          {/* paper edge and brass corners */}
          <rect x="10" y="10" width="300" height="220" fill="none" stroke="#f3ead0" strokeWidth="2" opacity=".8" />
          <rect x="13" y="13" width="294" height="214" fill="none" stroke="#2b2116" strokeWidth=".6" opacity=".6" />
          {[[14, 14], [306, 14], [14, 226], [306, 226]].map(([x, y]) => <g key={`${x}${y}`}><circle cx={x} cy={y} r="4" fill="url(#wf-ep-brass)" stroke="#4d3510" strokeWidth=".7" /><path d={`M${x - 2},${y} H${x + 2}`} stroke="#4d3510" strokeWidth=".7" /></g>)}
          {/* brass dice resting on the sheet */}
          <g className="wf-ep-die wf-ep-die-a" transform="translate(268,196) rotate(-14)">
            <rect x="-11" y="-11" width="22" height="22" rx="5" fill="url(#wf-ep-brass)" stroke="#5b3f10" filter="url(#wf-ep-drop)" />
            <rect x="-8.5" y="-8.5" width="17" height="17" rx="4" fill="none" stroke="#fff" strokeOpacity=".4" />
            {[[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.9" fill="#3b2606" />)}
          </g>
          <g className="wf-ep-die wf-ep-die-b" transform="translate(294,178) rotate(18)">
            <rect x="-9" y="-9" width="18" height="18" rx="4" fill="#d9dee3" stroke="#3e444b" filter="url(#wf-ep-drop)" />
            {[[-4, -4], [4, 4], [0, 0]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.7" fill="#1d2228" />)}
          </g>
          <rect width="320" height="240" fill="url(#wf-ep-lamp)" pointerEvents="none" />
        </svg>
      </span>
      <span className="ep-text wf-ep-text">
        <span className="wf-ep-to">2-6 players · vs Computer · Online</span>
        <span className="wf-ep-plate"><span className="wf-ep-name">Warfront</span></span>
        <span className="wf-ep-line">Command your armies across a world at war. Reinforce, attack, fortify, and take every continent.</span>
        <span className="wf-ep-foot">
          <span className="wf-ep-label">Conquest</span>
          <span className="wf-ep-chips" aria-hidden>
            <i style={{ background: '#c8323c' }} /><i style={{ background: '#2f63d6' }} /><i style={{ background: '#e2a01a' }} /><i style={{ background: '#1e9b5c' }} /><i style={{ background: '#8b4fd0' }} /><i style={{ background: '#4d545e' }} />
          </span>
        </span>
      </span>
    </button>
  );
}
