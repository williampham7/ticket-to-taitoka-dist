import { FACTIONS, NEUTRAL_FACTION, type Faction } from './factions';

/** Shared SVG defs: faction metal gradients and acetate hatches, unit silhouettes, the relief filter. */
const hatch = (f: Faction, id: string) => {
  const s = f.deep;
  const body = {
    diag: <path d="M-2,10 L10,-2 M3,13 L13,3" stroke={s} strokeWidth="1.4" />,
    cross: <path d="M0,0 L8,8 M8,0 L0,8" stroke={s} strokeWidth="1" />,
    dots: <circle cx="4" cy="4" r="1.3" fill={s} />,
    vert: <path d="M4,0 V8" stroke={s} strokeWidth="1.6" />,
    horiz: <path d="M0,4 H8" stroke={s} strokeWidth="1.6" />,
    grid: <path d="M0,0 H8 M0,0 V8" stroke={s} strokeWidth="1" />,
  }[f.hatch];
  return <pattern key={id} id={id} width="8" height="8" patternUnits="userSpaceOnUse">{body}</pattern>;
};
const metal = (f: Faction, id: string) => (
  <linearGradient key={id} id={id} x1="0" y1="0" x2="0.4" y2="1">
    <stop offset="0" stopColor={f.light} /><stop offset="0.38" stopColor={f.color} /><stop offset="1" stopColor={f.deep} />
  </linearGradient>
);

export function WarDefs() {
  return (
    <defs>
      {FACTIONS.map((f, i) => hatch(f, `wf-h${i}`))}{hatch(NEUTRAL_FACTION, 'wf-hN')}
      {FACTIONS.map((f, i) => metal(f, `wf-m${i}`))}{metal(NEUTRAL_FACTION, 'wf-mN')}
      <linearGradient id="wf-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6dc93" /><stop offset=".5" stopColor="#c99a3c" /><stop offset="1" stopColor="#7d5a1c" /></linearGradient>
      <linearGradient id="wf-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f6f8" /><stop offset=".55" stopColor="#a8b0b9" /><stop offset="1" stopColor="#5c646e" /></linearGradient>
      <filter id="wf-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="1.2" dy="2.2" stdDeviation="1.4" floodColor="#1b120a" floodOpacity=".55" /></filter>
      <filter id="wf-lift" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="3" dy="6" stdDeviation="4" floodColor="#140d06" floodOpacity=".6" /></filter>
      <filter id="wf-pencil" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
      </filter>
      <filter id="wf-relief" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="11" result="n" />
        <feDiffuseLighting in="n" surfaceScale="2.6" lightingColor="#fff6e2" result="l"><feDistantLight azimuth="225" elevation="48" /></feDiffuseLighting>
        <feComposite in="l" in2="SourceGraphic" operator="in" result="lc" />
        <feBlend in="SourceGraphic" in2="lc" mode="multiply" />
      </filter>
      <symbol id="wf-u-inf" viewBox="-12 -12 24 24" overflow="visible">
        <ellipse cx="0" cy="10" rx="8" ry="2.4" fill="#000" opacity=".35" />
        <path d="M-5,9 L-4.2,0 Q-4.6,-4 -1.5,-5 L1.5,-5 Q4.6,-4 4.2,0 L5,9 L2,9 L1.2,2.5 L-1.2,2.5 L-2,9Z" />
        <path d="M-4.4,-6.2 Q0,-12.6 4.4,-6.2 L5.2,-5.4 L-5.2,-5.4Z" />
        <path d="M4,-3.5 L9,-10.5 L10,-9.8 L5.4,-2.4Z" />
      </symbol>
      <symbol id="wf-u-arm" viewBox="-12 -12 24 24" overflow="visible">
        <ellipse cx="0" cy="9.5" rx="11" ry="2.6" fill="#000" opacity=".35" />
        <rect x="-11" y="2.5" width="22" height="6.5" rx="3.2" />
        <path d="M-9,2.5 L-7,-1.5 L8,-1.5 L10,2.5Z" />
        <path d="M-5,-1.5 L-4,-6 L4,-6 L5.5,-1.5Z" />
        <rect x="4" y="-5.2" width="10" height="1.8" rx=".9" />
      </symbol>
      <symbol id="wf-u-art" viewBox="-12 -12 24 24" overflow="visible">
        <ellipse cx="0" cy="10" rx="11" ry="2.4" fill="#000" opacity=".35" />
        <path d="M-6,1 L10,-9 L11.4,-7 L-3.6,4.2Z" />
        <path d="M-9,4 L5,4 L3,-1.5 L-7,-1.5Z" />
        <circle cx="-5.5" cy="6" r="3.4" /><circle cx="3.5" cy="6" r="3.4" />
      </symbol>
    </defs>
  );
}

export const unitKind = (n: number) => (n >= 10 ? 'art' : n >= 5 ? 'arm' : 'inf');
export const metalOf = (fi: number | 'N') => `url(#wf-m${fi})`;
