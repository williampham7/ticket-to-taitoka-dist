import { useState } from 'react';
import { MAP_ID } from '@boboland/shared';
import { navigate } from '../lib/router';
import { useOnline } from '../lib/lobby';
import { SKIN } from '../lib/skin';
import { HSR, MERLION, RAIL } from '../theme';
import { RailHero } from '../rail/RailChrome';
import { MerlionHero } from '../merlion/MerlionChrome';
import { HowToPlay } from '../game/HowToPlay';
import { Frame, PrimaryButton, SecondaryButton, Title } from './Frame';

export function Home() {
  const [help, setHelp] = useState(false);
  const online = useOnline();
  const sub = MAP_ID === 'sg'
    ? `Ride the MRT from Tuas to Changi, connect Marina Bay, Chinatown and the Gardens, and make it to ${SKIN.name}.`
    : MAP_ID === 'europe'
    ? `Claim rail lines from Edinburgh to Constantinople, connect your destinations, and make it to ${SKIN.name}.`
    : MAP_ID === 'china'
    ? `Claim high-speed lines from Ngari to Harbin, connect your destinations, and make it to ${SKIN.name}.`
    : `Claim railways from Seattle to Miami, connect your destinations, and make it to ${SKIN.name}.`;
  return (
    <Frame edition>
      {help && <HowToPlay onClose={() => setHelp(false)} />}
      {HSR && <HsrHero />}
      {RAIL && <RailHero />}
      {MERLION && <MerlionHero />}
      <Title sub={sub} />
      <div className={`grid gap-3 ${HSR ? 'sm:grid-cols-2' : ''}`}>
        <PrimaryButton onClick={() => navigate('/local' + window.location.search)} data-testid="play-local">Play on this computer</PrimaryButton>
        <SecondaryButton onClick={() => navigate('/host')} data-testid="play-lan">{online ? 'Play online' : 'Play on two computers'}</SecondaryButton>
        <button type="button" onClick={() => setHelp(true)} data-testid="open-help"
          className={MERLION ? 'mrt-link mt-1 justify-self-start' : RAIL ? 'rail-link mt-1 justify-self-start' : HSR ? 'hsr-link mt-1 justify-self-start'
            : 'mt-1 justify-self-start font-display text-[16px] text-poster underline decoration-2 underline-offset-4 hover:text-poster-dark'}>How to play</button>
      </div>
      <p className={`mt-5 text-[14px] leading-relaxed text-muted ${HSR ? 'border-t border-line pt-4 text-[13.5px]' : RAIL ? 'rail-footnote' : MERLION ? 'mrt-footnote' : ''}`}>
        On one computer you pass it back and forth, and a screen hides your cards between turns.{' '}
        {online
          ? 'Online, everyone plays on their own computer from anywhere. You host the game and send the others the link you’ll see next.'
          : 'On two computers, both need to be on the same Wi-Fi. The other player opens the link or scans the QR code you’ll see next.'}
      </p>
    </Frame>
  );
}

/** A high-speed EMU gliding in from the left on a viaduct, with speed lines behind it. Decoration only. */
function HsrHero() {
  return (
    <div className="hsr-hero -mx-5 -mt-6 mb-6 sm:-mx-10 sm:-mt-8" aria-hidden>
      <svg viewBox="0 0 560 132" preserveAspectRatio="xMaxYMid slice" className="block h-[112px] w-full sm:h-[132px]">
        <defs>
          <linearGradient id="hsr-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eaf1fa" />
            <stop offset="1" stopColor="#f8fafc" />
          </linearGradient>
          <linearGradient id="hsr-speed" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#1d5fbf" stopOpacity="0" />
            <stop offset="1" stopColor="#1d5fbf" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id="hsr-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".7" stopColor="#f2f5f9" />
            <stop offset="1" stopColor="#dfe5ee" />
          </linearGradient>
          <linearGradient id="hsr-fade-g" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <mask id="hsr-fade"><rect width="560" height="132" fill="url(#hsr-fade-g)" /></mask>
          <linearGradient id="hsr-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#14213d" />
            <stop offset="1" stopColor="#2c4673" />
          </linearGradient>
        </defs>
        <rect width="560" height="132" fill="url(#hsr-sky)" />
        {/* distant skyline */}
        <path d="M0 96 V84 h18 v-10 h14 v14 h12 v-22 h16 v22 h20 v-8 h12 v8 h30 v-16 h10 v-6 h8 v22 h26 v-12 h18 v12 h40 v-20 h12 v20 h22 v-9 h16 v9 h34 v-26 l8 -8 l8 8 v26 h24 v-12 h20 v12 h36 v-18 h14 v18 h22 v-10 h18 v10 h28 v-14 h16 v14 h20 V96 Z" fill="#dbe4ef" />
        {/* viaduct deck and rail */}
        <rect x="0" y="104" width="560" height="5" fill="#a8b4c6" />
        <rect x="0" y="109" width="560" height="23" fill="#eef2f7" />
        {[40, 160, 280, 400, 520].map((x) => <rect key={x} x={x - 6} y="109" width="12" height="23" fill="#d5dce6" />)}
        <g className="hsr-train" mask="url(#hsr-fade)">
          {/* body: long cars running off the left edge, a long low nose to the right */}
          <path d="M150 50 H390 C440 50 486 64 524 86 C534 92 532 100 520 100 H150 Z" fill="url(#hsr-body)" stroke="#a8b4c6" strokeWidth="1.2" />
          {/* window band */}
          {[164, 196, 228, 260, 292, 324].map((x) => <rect key={x} x={x} y="60" width="24" height="11" rx="3" fill="url(#hsr-glass)" />)}
          {/* cockpit glass */}
          <path d="M372 58 C420 58 458 68 486 82 L470 83 C440 72 404 66 372 66 Z" fill="url(#hsr-glass)" />
          {/* livery stripes: CR red with a thin blue line, sweeping up into the nose */}
          <path d="M150 78 H400 C440 78 478 84 510 94 L506 97 C474 89 438 84 400 84 H150 Z" fill="#c8102e" />
          <path d="M150 89 H396 C436 89 470 93 498 99 L494 100.5 C468 95 434 92 396 92 H150 Z" fill="#1d5fbf" />
          {/* bogies */}
          {[188, 344].map((x) => <rect key={x} x={x} y="99" width="40" height="6" rx="2" fill="#3d4b66" />)}
          {/* car joint */}
          <rect x="146" y="52" width="6" height="48" fill="#d5dce6" />
          <path d="M0 50 H146 V100 H0 Z" fill="url(#hsr-body)" stroke="#a8b4c6" strokeWidth="1.2" />
          {[14, 46, 78, 110].map((x) => <rect key={x} x={x} y="60" width="24" height="11" rx="3" fill="url(#hsr-glass)" />)}
          <rect x="0" y="78" width="146" height="6" fill="#c8102e" />
          <rect x="0" y="89" width="146" height="3" fill="#1d5fbf" />
          <rect x="40" y="99" width="40" height="6" rx="2" fill="#3d4b66" />
        </g>
        {/* speed lines streaming off the tail */}
        <g className="hsr-speedlines" stroke="url(#hsr-speed)" strokeLinecap="round">
          <line x1="10" y1="40" x2="170" y2="40" strokeWidth="1.5" />
          <line x1="40" y1="66" x2="120" y2="66" strokeWidth="2" />
          <line x1="0" y1="84" x2="150" y2="84" strokeWidth="1.5" />
          <line x1="60" y1="96" x2="200" y2="96" strokeWidth="1.2" />
          <line x1="90" y1="30" x2="230" y2="30" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
