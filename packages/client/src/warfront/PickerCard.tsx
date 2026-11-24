import { navigate } from '../lib/router';
import './picker.css';

/** Warfront's card on the `/` picker. */
export function WarfrontCard({ follower }: { follower: boolean }) {
  return (
    <button type="button" className="ep-card wf-ep" onClick={() => !follower && navigate('/warfront')} data-testid="warfront-card" aria-label="Warfront: territory conquest for 2 to 6 players">
      <span className="ep-art wf-ep-art" aria-hidden>
        <svg viewBox="0 0 320 180">
          <rect width="320" height="180" fill="#1f6c80" />
          <path d="M20,40 Q60,20 110,38 L150,30 Q170,60 140,90 L100,120 Q70,110 60,80 Z" fill="#c9b98a" />
          <path d="M170,28 Q230,10 290,30 L300,80 Q260,110 220,100 L190,70 Z" fill="#b7c08a" />
          <path d="M150,110 Q190,100 210,130 L200,170 Q170,175 160,150 Z" fill="#d6c38d" />
          <path d="M20,40 Q60,20 110,38 L150,30 Q170,60 140,90 L100,120 Q70,110 60,80 Z" fill="#c8323c" opacity=".45" />
          <path d="M170,28 Q230,10 290,30 L300,80 Q260,110 220,100 L190,70 Z" fill="#2f63d6" opacity=".4" />
          <path className="wf-ep-arrow" d="M120,70 Q170,40 230,62" fill="none" stroke="#c8323c" strokeWidth="6" strokeLinecap="round" />
          <path d="M218,52 L232,63 L216,72" fill="none" stroke="#c8323c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <g className="wf-ep-pin" transform="translate(240,58)"><line y2="-22" stroke="#3a2a14" strokeWidth="2" /><path d="M0,-22 L14,-18 L0,-14Z" fill="#c8323c" /></g>
          <rect width="320" height="180" fill="url(#wf-ep-vig)" />
          <defs><radialGradient id="wf-ep-vig" cx=".3" cy=".25" r=".9"><stop offset="0" stopColor="#ffe6a8" stopOpacity=".25" /><stop offset="1" stopColor="#1a0f06" stopOpacity=".55" /></radialGradient></defs>
        </svg>
      </span>
      <span className="ep-text">
        <span className="wf-ep-to">2-6 players · vs Computer · Online</span>
        <span className="wf-ep-name">Warfront</span>
        <span className="wf-ep-line">Command your armies across a world at war. Reinforce, attack, fortify, and take every continent.</span>
        <span className="wf-ep-label">Conquest</span>
      </span>
    </button>
  );
}
