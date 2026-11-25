import { HERO_COLOR, HERO_DEEP, HERO_LIGHT } from '../text';

/**
 * Every gradient and pattern the storybook art shares, mounted once at the app root (KingdomApp), so the
 * hundreds of inline SVGs stay small. One style: ink-brown outlines, layered watercolour gradients, no filters.
 */
export const INK = '#4a3020';
export function KingdomArtDefs() {
  return (
    <svg className="kg-defs" aria-hidden focusable="false" width="0" height="0">
      <defs>
        <linearGradient id="kg-grass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9fcd6c" /><stop offset=".55" stopColor="#8cc061" /><stop offset="1" stopColor="#7fb658" /></linearGradient>
        <radialGradient id="kg-grass-patch" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#c4e48e" stopOpacity=".85" /><stop offset="1" stopColor="#c4e48e" stopOpacity="0" /></radialGradient>
        <linearGradient id="kg-sand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0dcae" /><stop offset="1" stopColor="#e2c58c" /></linearGradient>
        <pattern id="kg-cobble" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect x=".8" y=".8" width="5.6" height="3.6" rx="1.6" fill="#d4b47a" stroke="#b89560" strokeWidth=".5" />
          <rect x="6.6" y=".8" width="2.8" height="3.6" rx="1.3" fill="#dcbf86" stroke="#b89560" strokeWidth=".5" />
          <rect x="-.6" y="5.6" width="2.9" height="3.6" rx="1.3" fill="#dcbf86" stroke="#b89560" strokeWidth=".5" />
          <rect x="3.4" y="5.6" width="5.6" height="3.6" rx="1.6" fill="#d0ae72" stroke="#b89560" strokeWidth=".5" />
        </pattern>
        <linearGradient id="kg-hedge-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fa64a" /><stop offset="1" stopColor="#3f8a38" /></linearGradient>
        <linearGradient id="kg-hedge-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2e6a2b" /><stop offset="1" stopColor="#1f4d22" /></linearGradient>
        <pattern id="kg-leaf" patternUnits="userSpaceOnUse" width="8" height="7">
          <circle cx="2" cy="2" r="1.7" fill="#7cc35a" opacity=".55" /><circle cx="6" cy="5" r="1.5" fill="#86cc63" opacity=".5" /><circle cx="6.5" cy="1" r=".9" fill="#a4dc7c" opacity=".55" />
        </pattern>
        <linearGradient id="kg-stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c9c5ad" /><stop offset="1" stopColor="#9c9a82" /></linearGradient>
        <linearGradient id="kg-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a86b3c" /><stop offset=".5" stopColor="#8a5329" /><stop offset="1" stopColor="#6c3f1d" /></linearGradient>
        <linearGradient id="kg-wood-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a86b3c" /><stop offset=".5" stopColor="#8a5329" /><stop offset="1" stopColor="#6c3f1d" /></linearGradient>
        <linearGradient id="kg-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbe7a1" /><stop offset=".45" stopColor="#d9a93e" /><stop offset="1" stopColor="#8f6517" /></linearGradient>
        <linearGradient id="kg-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff0b8" /><stop offset=".5" stopColor="#f1c34e" /><stop offset="1" stopColor="#c08a1e" /></linearGradient>
        <linearGradient id="kg-silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset=".5" stopColor="#cfd6de" /><stop offset="1" stopColor="#8e99a6" /></linearGradient>
        <linearGradient id="kg-parch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fdf6e1" /><stop offset="1" stopColor="#f1e2bb" /></linearGradient>
        <radialGradient id="kg-glass" cx=".35" cy=".3" r=".75"><stop offset="0" stopColor="#ffffff" /><stop offset=".35" stopColor="#d6ecff" /><stop offset="1" stopColor="#7fa8e0" /></radialGradient>
        <radialGradient id="kg-plinth" cx=".5" cy=".35" r=".7"><stop offset="0" stopColor="#f4efe0" /><stop offset="1" stopColor="#b9b29b" /></radialGradient>
        <radialGradient id="kg-shadow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#1d2a10" stopOpacity=".38" /><stop offset="1" stopColor="#1d2a10" stopOpacity="0" /></radialGradient>
        <radialGradient id="kg-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff6c2" stopOpacity=".95" /><stop offset=".6" stopColor="#ffd75a" stopOpacity=".45" /><stop offset="1" stopColor="#ffd75a" stopOpacity="0" /></radialGradient>
        <linearGradient id="kg-rose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6a1b3" /><stop offset="1" stopColor="#c9435f" /></linearGradient>
        <linearGradient id="kg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe3f7" /><stop offset="1" stopColor="#7ab8e0" /></linearGradient>
        <linearGradient id="kg-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe1c4" /><stop offset="1" stopColor="#f0b98e" /></linearGradient>
        {HERO_COLOR.map((c, i) => (
          <linearGradient key={i} id={`kg-hero-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={HERO_LIGHT[i]} /><stop offset=".25" stopColor={c} /><stop offset="1" stopColor={HERO_DEEP[i]} /></linearGradient>
        ))}
      </defs>
    </svg>
  );
}
