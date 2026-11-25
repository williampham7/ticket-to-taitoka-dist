import { navigate } from '../lib/router';
import './picker.css';

/** Shifting Kingdom's card on the `/` picker: a closed storybook with a gilt maze inlay and the castle. */
export function KingdomCard({ follower }: { follower: boolean }) {
  return (
    <button type="button" className="ep-card kg-ep" onClick={() => !follower && navigate('/kingdom')} data-testid="kingdom-card" aria-label="Shifting Kingdom: a storybook maze adventure for 2 to 4 players">
      <span className="ep-art kg-ep-art" aria-hidden>
        <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="kg-ep-cover" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#4f9a4a" /><stop offset=".55" stopColor="#2f6e33" /><stop offset="1" stopColor="#1d4a22" /></linearGradient>
            <linearGradient id="kg-ep-gilt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset=".5" stopColor="#e9b63c" /><stop offset="1" stopColor="#a87414" /></linearGradient>
            <linearGradient id="kg-ep-pages" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fdf6e1" /><stop offset="1" stopColor="#e6d1a0" /></linearGradient>
            <radialGradient id="kg-ep-glow" cx=".5" cy=".4" r=".6"><stop offset="0" stopColor="#fff6c8" stopOpacity=".55" /><stop offset="1" stopColor="#fff6c8" stopOpacity="0" /></radialGradient>
          </defs>
          <rect width="320" height="240" fill="#f3e2b6" />
          <rect width="320" height="240" fill="url(#kg-ep-glow)" />
          <g transform="translate(160,122) rotate(-4)">
            <rect x="-96" y="-98" width="196" height="200" rx="8" fill="url(#kg-ep-pages)" stroke="#4a3020" strokeWidth="2.4" />
            <rect x="-104" y="-104" width="196" height="200" rx="10" fill="url(#kg-ep-cover)" stroke="#2b1a0c" strokeWidth="3" />
            <path d="M-96,-104 V96" stroke="#163a1a" strokeWidth="6" opacity=".6" />
            <rect x="-88" y="-90" width="166" height="172" rx="8" fill="none" stroke="url(#kg-ep-gilt)" strokeWidth="3" />
            {[[-88, -90], [78, -90], [78, 82], [-88, 82]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="url(#kg-ep-gilt)" stroke="#6a4a10" strokeWidth="1.2" />)}
            <g className="kg-ep-maze" stroke="url(#kg-ep-gilt)" strokeWidth="5" strokeLinecap="round" fill="none">
              <path d="M-50,-4 H34 M-50,-4 V66 H34 V22 M-28,18 V44 H12 M-28,18 H12 M-6,44 V66 M34,-4 V8" />
            </g>
            <g transform="translate(-8,-46)">
              <path d="M-40,8 V-14 H-30 V-8 H-22 V-14 H-12 V-24 L-2,-40 L8,-24 V-14 H18 V-8 H26 V-14 H36 V8 Z" fill="url(#kg-ep-gilt)" stroke="#6a4a10" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M-6,8 V-2 Q-2,-8 2,-2 V8" fill="#1d4a22" />
              <path className="kg-ep-flag" d="M-2,-40 V-52 L10,-48 L-2,-44" fill="#d9546f" stroke="#6a4a10" strokeWidth="1.2" />
            </g>
            <circle className="kg-ep-hero" cx="-38" cy="52" r="6" fill="#c8323c" stroke="#fff0b8" strokeWidth="2" />
            <path d="M-36,-82 L-30,-78 M60,74 L66,78" stroke="#fff6c8" strokeWidth="2.4" strokeLinecap="round" />
          </g>
          <g className="kg-ep-spark">{[[46, 40], [276, 62], [262, 200]].map(([x, y], i) => <path key={i} d={`M${x},${y - 8} L${x + 2},${y - 2} L${x + 8},${y} L${x + 2},${y + 2} L${x},${y + 8} L${x - 2},${y + 2} L${x - 8},${y} L${x - 2},${y - 2} Z`} fill="#fff6c8" stroke="#a87414" strokeWidth="1" />)}</g>
        </svg>
      </span>
      <span className="ep-text kg-ep-text">
        <span className="kg-ep-to">2 to 4 players · online</span>
        <span className="kg-ep-name">Shifting Kingdom</span>
        <span className="kg-ep-line">Push the hedges, walk the winding paths and race your friends to the hidden treasures.</span>
        <span className="kg-ep-label">Storybook maze</span>
      </span>
    </button>
  );
}
