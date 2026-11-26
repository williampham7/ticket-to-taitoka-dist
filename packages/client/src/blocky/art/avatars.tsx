import type { ReactNode } from 'react';
import { INK } from './palette';

/**
 * The six original builders, one portrait style: 3-tone shading (base, shadow, highlight), a prop each, and a
 * silhouette that stays distinct in grayscale at 40 px. Eyes blink on their own; `thinking` looks up and puffs a
 * thought cloud while it is that builder's turn.
 */
const SKIN = ['#f0c09a', '#c98d62', '#e8b48c', '#8d5a3b', '#f3cfb0', '#b77b52'];
const SKIN_SH = ['#d99c76', '#a86f49', '#cf9670', '#6e4329', '#ddb090', '#97613d'];
const SKIN_HI = ['#fbd9bd', '#e0ab85', '#f6cfae', '#a87452', '#fde4cf', '#d39a70'];
const BG = ['#cfe6f5', '#e3f1cf', '#efe4d2', '#d9d6f2', '#fbe0d6', '#a9c6e6'];

function Face({ id, thinking, blink }: { id: number; thinking?: boolean; blink?: boolean }) {
  const look = thinking ? 'translate(-1 -1.4)' : '';
  return (
    <g>
      <path d="M19,31 a13,13 0 1,0 26,0 a13,13 0 1,0 -26,0" fill={SKIN[id]} />
      <path d="M40,22 a13,13 0 0,1 -2,21 a13,13 0 0,0 7,-12 a13,13 0 0,0 -5,-9z" fill={SKIN_SH[id]} />
      <ellipse cx="26" cy="25.5" rx="5" ry="3" fill={SKIN_HI[id]} opacity=".9" />
      <ellipse cx="24.5" cy="35" rx="2.6" ry="1.6" fill="#ff8f8f" opacity=".45" />
      <ellipse cx="39.5" cy="35" rx="2.6" ry="1.6" fill="#ff8f8f" opacity=".45" />
      <path d={thinking ? 'M24.4,27.2 q2.6,-2.6 5,-.6 M34.8,27.4 q2.4,-1 4.8,0' : 'M24.6,27.6 q2.4,-1.4 4.8,0 M34.6,27.6 q2.4,-1.4 4.8,0'} stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity=".75" />
      {blink ? (
        <g><path d="M25,31.4 q2,1.4 4,0 M35,31.4 q2,1.4 4,0" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" /></g>
      ) : (
        <g className="bly-eyes" style={{ animationDelay: `${id * 0.7}s` }}>
          <ellipse cx="27" cy="31" rx="1.9" ry="2.3" fill={INK} />
          <ellipse cx="37" cy="31" rx="1.9" ry="2.3" fill={INK} />
          <g transform={look}><circle cx="27.6" cy="30.2" r=".7" fill="#fff" /><circle cx="37.6" cy="30.2" r=".7" fill="#fff" /></g>
        </g>
      )}
      <path d={thinking ? 'M30,38.4 q2,-1 4,.4' : 'M29,37.4 q3,2.4 6,0'} stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}
const body = (c: string, sh: string): ReactNode => (
  <g><path d="M10,64 C10,50 20,44 32,44 C44,44 54,50 54,64Z" fill={c} /><path d="M38,45 C47,47 54,53 54,64 H44 C44,56 42,50 38,45Z" fill={sh} /></g>
);

const BUILDERS: ((t?: boolean, b?: boolean) => ReactNode)[] = [
  // 0 aviator: leather cap with ear flaps, goggles up, red scarf
  (t, b) => (<>
    {body('#8a5a31', '#6a4425')}
    <path d="M24,46 q8,6 16,0 l10,10 l-6,3 l-8,-7 q-4,2 -8,0z" fill="#e0475b" /><path d="M44,52 l6,4 l-6,3z" fill="#b8344a" />
    <Face id={0} thinking={t} blink={b} />
    <path d="M18,30 C18,16 46,16 46,30 L46,38 L42,38 L42,30 C42,22 22,22 22,30 L22,38 L18,38Z" fill="#9a6a3e" />
    <path d="M20,24 C24,17 40,17 44,24" fill="none" stroke="#c48a52" strokeWidth="2" strokeLinecap="round" />
    <rect x="18" y="23" width="28" height="4" rx="2" fill="#4a4f5c" />
    <circle cx="26" cy="24.5" r="4.4" fill="#dcb459" stroke="#6f5320" strokeWidth="1.2" /><circle cx="26" cy="24.5" r="2.8" fill="#8fd3e4" /><path d="M24.6,23.4 l1.4,-.8" stroke="#fff" strokeWidth="1" />
    <circle cx="38" cy="24.5" r="4.4" fill="#dcb459" stroke="#6f5320" strokeWidth="1.2" /><circle cx="38" cy="24.5" r="2.8" fill="#8fd3e4" /><path d="M36.6,23.4 l1.4,-.8" stroke="#fff" strokeWidth="1" />
  </>),
  // 1 gardener: wide straw hat with a flower, green overall straps
  (t, b) => (<>
    {body('#6bb14c', '#4f9036')}
    <path d="M24,46 v18 M40,46 v18" stroke="#3b7428" strokeWidth="3" />
    <Face id={1} thinking={t} blink={b} />
    <ellipse cx="32" cy="23" rx="26" ry="6" fill="#d9a46a" /><ellipse cx="32" cy="24.5" rx="26" ry="4.5" fill="#b47f4b" opacity=".6" />
    <path d="M20,22 C20,8 44,8 44,22Z" fill="#e8bf83" /><path d="M36,10 C42,12 44,17 44,22 H38 C38,17 38,13 36,10z" fill="#c9965c" />
    <path d="M20.5,19 h23" stroke="#e0475b" strokeWidth="2.4" />
    <g transform="translate(43 17)">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-3" rx="1.8" ry="3" fill="#ffd7e2" transform={`rotate(${a})`} />)}<circle r="1.7" fill="#ffd34d" /></g>
    <path d="M14,24 q3,-1 6,0" stroke="#fff" strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </>),
  // 2 stonemason: bandana, bushy beard, hammer over the shoulder
  (t, b) => (<>
    <g transform="rotate(-28 50 50)"><rect x="48" y="26" width="4" height="34" rx="2" fill="#b47f4b" /><rect x="42" y="20" width="16" height="9" rx="2" fill="#8c95a6" stroke="#4a4f5c" strokeWidth="1.2" /><rect x="43" y="21" width="14" height="2.5" rx="1" fill="#c9d0dc" /></g>
    {body('#5b7fa6', '#47678a')}
    <Face id={2} thinking={t} blink={b} />
    <path d="M20,34 C20,46 26,50 32,50 C38,50 44,46 44,34 C41,40 36,41 32,40 C28,41 23,40 20,34Z" fill="#7a5c48" /><path d="M36,40 C40,40 43,38 44,34 C44,44 40,49 34,50z" fill="#5e4535" />
    <path d="M28,39.5 q4,2 8,0" stroke="#5e4535" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <path d="M18,27 C18,16 46,16 46,27 Z" fill="#3a6db0" /><path d="M38,18 C43,20 46,23 46,27 H40Z" fill="#2c548a" />
    <path d="M45,25 l7,3 l-2,5 l-6,-4z" fill="#3a6db0" />
    {[24, 30, 36, 41].map((x) => <circle key={x} cx={x} cy="22" r="1.1" fill="#fff" opacity=".85" />)}
  </>),
  // 3 lantern-keeper: deep pointed hood, a lantern held up
  (t, b) => (<>
    {body('#4b4f8a', '#3a3d6e')}
    <path d="M18,52 C14,40 14,24 32,6 C50,24 50,40 46,52 C40,46 24,46 18,52Z" fill="#5a5ea6" /><path d="M32,6 C50,24 50,40 46,52 C44,49 42,48 40,47 C44,34 40,20 32,6Z" fill="#43478a" />
    <path d="M22,22 C26,15 30,11 32,8" stroke="#8c90d4" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <Face id={3} thinking={t} blink={b} />
    <g transform="translate(50 40)"><circle className="bly-lantern-glow" r="11" fill="url(#bly-g-glow)" style={{ opacity: 0.9 }} /><path d="M0,-12 v4" stroke="#4a4f5c" strokeWidth="1.6" /><path d="M-4,-8 h8 l-1,10 h-6z" fill="#ffe08a" stroke="#4a4f5c" strokeWidth="1.4" strokeLinejoin="round" /><path d="M-5,-8 l5,-4 l5,4z" fill="#4a4f5c" /><path d="M0,-6 v6" stroke="#ff9d3d" strokeWidth="1.4" /></g>
  </>),
  // 4 kite-maker: a swinging ponytail, a yellow scarf, a diamond kite on a bow tail
  (t, b) => (<>
    <path d="M44,4 L54,14 L44,26 L34,14Z" fill="#ecab3f" stroke="#6a3f0f" strokeWidth="1.2" strokeLinejoin="round" /><path d="M44,4 L44,26 M34,14 H54" stroke="#6a3f0f" strokeWidth=".8" /><path d="M44,4 L54,14 L44,14Z" fill="#ee6d56" />
    <path d="M44,26 q-4,8 2,12 q-6,4 -2,10" stroke="#6a3f0f" strokeWidth=".9" fill="none" /><path d="M43,33 l-3,-2 v4z M45,33 l3,-2 v4z" fill="#3aa7bd" />
    {body('#3aa7bd', '#2a8597')}
    <path d="M20,46 q12,7 24,0 l2,5 q-14,7 -28,0z" fill="#f3c95e" /><path d="M40,48 l6,10 l-5,1 l-4,-9z" fill="#e0a83a" /><path d="M22,47 q10,4 20,0" stroke="#fff6d0" strokeWidth="1.2" fill="none" />
    <path d="M44,22 C52,24 54,34 50,44 C49,38 47,32 43,28Z" fill="#7a4a2a" /><path d="M46,26 C50,30 51,36 50,41" stroke="#a0683e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <Face id={4} thinking={t} blink={b} />
    <path d="M19,31 C17,17 47,17 45,30 C42,23 37,21 31,22 C26,22 21,25 19,31Z" fill="#7a4a2a" /><path d="M23,23 C27,19 34,18 39,20" stroke="#a0683e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    <circle cx="44.5" cy="25" r="2.4" fill="#ee6d56" stroke="#6a3f0f" strokeWidth=".8" />
  </>),
  // 5 cloud-shepherd: fluffy wool hood, a tall crook
  (t, b) => (<>
    <path d="M11,64 V18 C11,10 21,10 21,18" fill="none" stroke="#8a5a31" strokeWidth="3.4" strokeLinecap="round" /><path d="M11,64 V18 C11,10 21,10 21,18" fill="none" stroke="#d9a46a" strokeWidth="1.2" strokeLinecap="round" />
    {body('#8fb5e0', '#6f97c4')}
    <Face id={5} thinking={t} blink={b} />
    <g>{[[22, 22, 7], [30, 16, 8], [39, 17, 7.5], [45, 25, 6], [19, 30, 5.5], [46, 33, 5]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y + 1.5} r={r} fill="#cfe0ee" />)}{[[22, 22, 7], [30, 16, 8], [39, 17, 7.5], [45, 25, 6], [19, 30, 5.5], [46, 33, 5]].map(([x, y, r], i) => <circle key={`w${i}`} cx={x} cy={y} r={r} fill="#fff" stroke="#7f97b8" strokeWidth=".8" />)}{[[22, 22, 7], [30, 16, 8], [39, 17, 7.5], [45, 25, 6], [19, 30, 5.5], [46, 33, 5]].map(([x, y, r], i) => <circle key={`f${i}`} cx={x} cy={y} r={r - 0.9} fill="#fff" />)}<circle cx="27" cy="13" r="3" fill="#fff" stroke="#eef5fb" /></g>
  </>),
];

export function Avatar({ id, size = 40, thinking = false, blink = false, className = '' }: { id: number; size?: number; thinking?: boolean; blink?: boolean; className?: string }) {
  const k = ((id % 6) + 6) % 6;
  return (
    <svg className={`bly-avatar${thinking ? ' bly-thinking' : ''} ${className}`} width={size} height={size} viewBox="0 0 64 64" overflow="visible" aria-hidden>
      <clipPath id={`bly-av-clip-${k}`}><circle cx="32" cy="32" r="31" /></clipPath>
      <circle cx="32" cy="32" r="31" fill={BG[k]} />
      <g clipPath={`url(#bly-av-clip-${k})`}>{BUILDERS[k](thinking, blink)}</g>
      <circle cx="32" cy="32" r="31" fill="none" stroke={INK} strokeOpacity=".8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      {thinking && (
        <g className="bly-thought">
          <circle cx="54" cy="16" r="2.6" fill="#fff" stroke={INK} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <path d="M50,4 a6,6 0 0,1 10,-3 a6,6 0 0,1 9,6 a5,5 0 0,1 -3,9 h-14 a5,5 0 0,1 -2,-12z" fill="#fff" stroke={INK} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          <circle className="bly-dot1" cx="54" cy="7.5" r="1.6" fill={INK} /><circle className="bly-dot2" cx="59" cy="7.5" r="1.6" fill={INK} /><circle className="bly-dot3" cx="64" cy="7.5" r="1.6" fill={INK} />
        </g>
      )}
    </svg>
  );
}
