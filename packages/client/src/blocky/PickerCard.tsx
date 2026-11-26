import { navigate } from '../lib/router';
import './picker.css';

/** One self-contained toy block on the picker (the shared art defs are not mounted on `/`). */
function Block({ x, y, top, south, east, ink, mark }: { x: number; y: number; top: string; south: string; east: string; ink: string; mark: 'wave' | 'dot' | 'leaf' | 'crack' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="3" y="7" width="30" height="30" rx="7" fill="#2b3550" opacity=".2" />
      <rect width="30" height="30" rx="7" fill={south} stroke={ink} strokeWidth="1.5" />
      <rect y="-5" width="30" height="30" rx="7" fill={east} />
      <rect x="-2.5" y="-5" width="29" height="29" rx="7" fill={top} />
      <rect x="-2.5" y="-5" width="29" height="29" rx="7" fill="url(#bly-ep-dome)" />
      {mark === 'wave' && <path d="M1,6 q3.5,-3 7,0 t7,0 t7,0 M1,15 q3.5,-3 7,0 t7,0 t7,0" stroke="#fff" strokeOpacity=".5" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      {mark === 'dot' && <g fill="#fff" fillOpacity=".55"><circle cx="5" cy="2" r="1.8" /><circle cx="17" cy="13" r="1.8" /><circle cx="17" cy="2" r="2.2" fill="none" stroke="#fff" strokeWidth="1" /></g>}
      {mark === 'leaf' && <path d="M3,8 q4,-5 8,0 q-4,5 -8,0z M13,15 q4,-5 8,0 q-4,5 -8,0z" fill="#fff" fillOpacity=".45" />}
      {mark === 'crack' && <path d="M2,0 l6,5 l-1,6 l6,5" stroke="#2b3550" strokeOpacity=".3" strokeWidth="1.2" fill="none" />}
      <path d="M2,-2 q3,-2 7,-1.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </g>
  );
}

/** Blocky's card on the `/` picker: a small floating isle with a tetromino hill, a waterfall and drifting clouds. */
export function BlockyCard({ follower }: { follower: boolean }) {
  const tide = { top: '#3aa7bd', south: '#1d6676', east: '#2a8597', ink: '#144652' };
  const sun = { top: '#ecab3f', south: '#a3631a', east: '#c7862c', ink: '#6a3f0f' };
  const ember = { top: '#ee6d56', south: '#9b3527', east: '#c34d3a', ink: '#661f16' };
  const grove = { top: '#6bb14c', south: '#3b7428', east: '#4f9036', ink: '#25501a' };
  return (
    <button type="button" className="ep-card bly-ep" onClick={() => !follower && navigate('/blocky')} data-testid="blocky-card" aria-label="Blocky: build toy-block isles for 2 to 4 players">
      <span className="ep-art bly-ep-art" aria-hidden>
        <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bly-ep-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fb0ea" /><stop offset=".6" stopColor="#9fd6f3" /><stop offset="1" stopColor="#e8f6fb" /></linearGradient>
            <radialGradient id="bly-ep-dome" cx=".22" cy=".18" r=".95"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset=".5" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#2b3550" stopOpacity=".08" /></radialGradient>
            <linearGradient id="bly-ep-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b5a68b" /><stop offset="1" stopColor="#7d86a0" /></linearGradient>
            <linearGradient id="bly-ep-fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d4f6f6" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
          </defs>
          <rect width="320" height="240" fill="url(#bly-ep-sky)" />
          <g className="bly-ep-clouds-far" fill="#fff" opacity=".7"><ellipse cx="60" cy="50" rx="46" ry="8" /><ellipse cx="250" cy="34" rx="58" ry="7" /></g>
          <g className="bly-ep-isle">
            <path d="M58,148 L96,182 L130,192 L160,222 L188,196 L226,184 L262,148Z" fill="url(#bly-ep-rock)" stroke="#6f6453" strokeWidth="2" />
            <path d="M90,170 q30,6 70,2 t70,-2" stroke="#6f6453" strokeOpacity=".4" strokeWidth="2" fill="none" />
            <path d="M120,186 c-4,10 4,18 -2,28 M200,188 c4,8 -4,14 2,24" stroke="#5e3b1f" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M144,198 l-5,-12 l6,-4 l5,10z M176,194 l4,-12 l6,3 l-4,11z" fill="#b9a6f2" stroke="#2b3550" strokeOpacity=".5" />
            <rect x="52" y="128" width="216" height="30" rx="12" fill="#c9b997" stroke="#7d6f58" strokeWidth="2" />
            <rect x="52" y="120" width="216" height="28" rx="12" fill="#f2ead9" stroke="#8c7e66" strokeWidth="2" />
            {[66, 96, 126, 156, 186, 216, 246].map((x) => <path key={x} d={`M${x},122 v24`} stroke="#b9aa8d" strokeWidth="1.5" />)}
            <g className="bly-ep-fallwater"><rect x="232" y="146" width="14" height="70" fill="url(#bly-ep-fall)" /><path d="M235,150 v56 M242,154 v50" stroke="#fff" strokeWidth="2" strokeDasharray="8 10" strokeLinecap="round" /></g>
            <circle cx="70" cy="126" r="9" fill="#7fa858" /><circle cx="78" cy="122" r="7" fill="#94bf68" /><circle cx="252" cy="124" r="7" fill="#94bf68" />
            {/* the tetromino hill: a T of toy blocks in the four guild colours */}
            <Block x={108} y={92} {...tide} mark="wave" />
            <Block x={140} y={92} {...sun} mark="dot" />
            <Block x={172} y={92} {...grove} mark="leaf" />
            <Block x={140} y={60} {...ember} mark="crack" />
            <path d="M176,60 v-22" stroke="#4a4f5c" strokeWidth="2.4" /><path className="bly-ep-flag" d="M176,38 l18,6 l-18,6z" fill="#ee6d56" stroke="#661f16" strokeWidth="1.2" />
          </g>
          <g className="bly-ep-fallwater"><rect x="74" y="146" width="11" height="58" fill="url(#bly-ep-fall)" /><path d="M77,150 v44 M82,154 v40" stroke="#fff" strokeWidth="2" strokeDasharray="7 9" strokeLinecap="round" /></g>
          <g className="bly-ep-clouds" fill="#fff">
            <g><circle cx="30" cy="206" r="22" /><circle cx="58" cy="198" r="26" /><circle cx="88" cy="210" r="20" /></g>
            <g><circle cx="248" cy="214" r="22" /><circle cx="278" cy="202" r="28" /><circle cx="308" cy="214" r="20" /></g>
            <g><circle cx="150" cy="238" r="26" /><circle cx="190" cy="232" r="22" /><circle cx="118" cy="236" r="18" /></g>
          </g>
        </svg>
      </span>
      <span className="ep-text bly-ep-text">
        <span className="bly-ep-to">2 to 4 players · online</span>
        <span className="bly-ep-name">Blocky</span>
        <span className="bly-ep-line">Raise toy-block isles above the clouds. Every new piece may only touch your own at the corners.</span>
        <span className="bly-ep-label">Sky Isles</span>
      </span>
    </button>
  );
}
