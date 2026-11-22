import { useId } from 'react';
import type { Card } from '@boboland/shared';
import { CARD_FILL, INK, cardBackground, cardInk, cardName } from '../theme';

/**
 * HSR (China build) train cards: a sleek high-speed carriage side on each colour, a Fuxing-style EMU nose on
 * the locomotive (wild) card. Flat and crisp, subtle gradients only. Same 64×92 footprint as the vintage cards.
 */

const ZH: Record<Card, string> = { red: '红', orange: '橙', yellow: '黄', green: '绿', blue: '蓝', black: '黑', white: '白', locomotive: '' };

const SHAPE = 'hsr-card relative h-[92px] w-[64px] shrink-0 overflow-hidden rounded-[10px]';

/** One carriage, bleeding off both card edges (a long train passing), with the previous car's end on the left. */
function Carriage({ card }: { card: Exclude<Card, 'locomotive'> }) {
  const white = card === 'white';
  const stripe = white ? INK : CARD_FILL[card];
  const id = `hsr${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const body = `url(#${id}b)`;
  const edge = 'rgba(20,33,61,.35)';
  // bogies and wheels lighten on the black card, so they don't vanish into it
  const gear = card === 'black' ? '#7d8aa3' : '#2a3550', wheel = card === 'black' ? '#9aa6bb' : '#1b2740';
  return (
    <svg width="64" height="40" viewBox="3 2.4 50 31.2" aria-hidden className="block">
      <defs>
        {white ? (
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#eef2f7" /><stop offset=".7" stopColor="#dfe5ee" /><stop offset="1" stopColor="#c3ccd9" />
          </linearGradient>
        ) : (
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" /><stop offset=".7" stopColor="#f1f4f8" /><stop offset="1" stopColor="#d9e0ea" />
          </linearGradient>
        )}
      </defs>
      {/* rail */}
      <rect x="0" y="30.6" width="64" height="1.2" fill={card === 'black' ? 'rgba(255,255,255,.4)' : 'rgba(20,33,61,.45)'} />
      {/* the previous car's tail and the gangway between the cars */}
      <path d="M-4,9 H3 Q5.5,9 5.5,11.5 V23 H-4 Z" fill={body} stroke={edge} strokeWidth=".6" />
      <rect x="5.5" y="11" width="2.6" height="11" fill="#2a3550" />
      {/* the car: roof, body, skirt */}
      <path d="M8,11.5 Q8,9 10.5,9 H70 V25.5 H8 Z" fill={body} stroke={edge} strokeWidth=".6" />
      <rect x="11" y="8" width="56" height="1.2" rx=".6" fill="#c8d0dc" />
      {/* pantograph */}
      <path d="M38,8 L42,4.6 L46.5,7.4 M40.5,4.4 H45" fill="none" stroke="#5b6780" strokeWidth=".8" strokeLinecap="round" />
      {/* continuous tinted window band, with slim pillars */}
      <rect x="-4" y="12.2" width="8" height="4.4" rx="1.2" fill="#1b2740" />
      <rect x="11" y="12.2" width="56" height="4.4" rx="1.6" fill="#1b2740" />
      {[19, 27, 35, 43, 57].map((x) => <rect key={x} x={x} y="12.2" width=".7" height="4.4" fill="#3a4a6a" />)}
      <rect x="11.6" y="12.7" width="55" height="1" rx=".5" fill="#ffffff" opacity=".18" />
      {/* door */}
      <rect x="49" y="11.2" width="5.4" height="12.6" rx=".9" fill="none" stroke={edge} strokeWidth=".6" />
      <rect x="50.1" y="12.4" width="3.2" height="3.6" rx=".6" fill="#1b2740" />
      {/* colour stripe: a bold band and a fine line under it */}
      <rect x="-4" y="18.4" width="9.5" height="2" fill={stripe} />
      <rect x="8" y="18.4" width="62" height="2" fill={stripe} />
      <rect x="8" y="21.3" width="62" height=".6" fill={stripe} opacity=".75" />
      <rect x="8" y="23.6" width="62" height="1.9" fill="#aab5c6" />
      {/* bogies */}
      {[18, 60].map((x) => (
        <g key={x}>
          <rect x={x - 6.5} y="25.5" width="13" height="2.4" rx="1" fill={gear} />
          <circle cx={x - 3.4} cy="28.4" r="2" fill={wheel} />
          <circle cx={x + 3.4} cy="28.4" r="2" fill={wheel} />
          <circle cx={x - 3.4} cy="28.4" r=".7" fill="#8d99ad" />
          <circle cx={x + 3.4} cy="28.4" r=".7" fill="#8d99ad" />
        </g>
      ))}
    </svg>
  );
}

/** The Fuxing-style EMU nose: long aerodynamic white nose with a swept red stripe, coming in from the left. */
function EmuNose() {
  const id = `hsr${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg width="64" height="38" viewBox="8 3.6 56 33.2" aria-hidden className="block">
      <defs>
        <linearGradient id={`${id}n`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#f2f5f9" /><stop offset="1" stopColor="#cdd5e1" />
        </linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#33476b" /><stop offset="1" stopColor="#0f1a30" />
        </linearGradient>
      </defs>
      <rect x="0" y="32.4" width="64" height="1.2" fill="rgba(20,33,61,.55)" />
      {/* body and nose: the roof flows down into a long, low tip */}
      <path d="M-2,9.5 H24 C36,9.5 44,12 52,17.5 C57,21 61.5,23.6 62.5,25.4 C63,26.6 62,27.5 60,27.5 H-2 Z"
        fill={`url(#${id}n)`} stroke="rgba(20,33,61,.45)" strokeWidth=".7" />
      {/* cab windscreen */}
      <path d="M33,11.4 C40,12 46,14.6 51,18.4 C47.5,19.4 41,19.2 35.5,17.6 C34,16.2 33.2,13.6 33,11.4 Z" fill={`url(#${id}g)`} />
      <path d="M35,12.4 C40,13 44,14.6 47.5,16.8" fill="none" stroke="#ffffff" strokeOpacity=".35" strokeWidth=".7" strokeLinecap="round" />
      {/* passenger windows behind the cab */}
      <rect x="-2" y="13" width="28" height="4" rx="1.4" fill="#1b2740" />
      {[5, 12, 19].map((x) => <rect key={x} x={x} y="13" width=".7" height="4" fill="#3a4a6a" />)}
      {/* the swept stripe: red with a fine gold line, rising towards the nose */}
      <path d="M-2,20 H30 C40,20 48,19.5 56,22.6 L58.4,24.2 C50,22.4 40,22.6 30,22.6 H-2 Z" fill="#c8102e" />
      <path d="M-2,23.6 H30 C40,23.6 47,23.4 54,24.8" fill="none" stroke="#f2a900" strokeWidth=".7" />
      {/* headlamp, skirt and bogies */}
      <path d="M55.4,23.9 L59.6,25.2" stroke="#fff6c8" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="-2" y="26" width="58" height="1.5" fill="#aab5c6" />
      {[12, 42].map((x) => (
        <g key={x}>
          <rect x={x - 6.5} y="27.4" width="13" height="2.4" rx="1" fill="#2a3550" />
          <circle cx={x - 3.4} cy="30.3" r="2" fill="#1b2740" />
          <circle cx={x + 3.4} cy="30.3" r="2" fill="#1b2740" />
        </g>
      ))}
    </svg>
  );
}

/** The face of an HSR train card. */
export function HsrCardTile({ card, count, className = '' }: { card: Card; count?: number; className?: string }) {
  const ink = cardInk(card);
  const loco = card === 'locomotive';
  return (
    <div className={`${SHAPE} ${className}`} data-hsr-card={card} style={{ background: cardBackground(card) }}>
      {/* a soft sheen and a few speed lines behind the train */}
      <div className="hsr-card-sheen pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-[47px] h-[24px] opacity-60"
        style={{ background: `repeating-linear-gradient(180deg, transparent 0 5px, ${loco || card === 'white' || card === 'yellow' ? 'rgba(20,33,61,.08)' : 'rgba(255,255,255,.13)'} 5px 6px)` }} />
      <div className="absolute inset-x-[7px] top-[6px] flex items-center gap-[3px] leading-none" style={{ color: ink }}>
        {!loco && <span className="text-[10px] font-bold" style={{ fontFamily: 'var(--font-zh)' }}>{ZH[card]}</span>}
        <span className={`font-display uppercase ${loco ? 'text-[9px] tracking-[0.06em]' : 'text-[10.5px] tracking-[0.1em]'}`}>{cardName(card)}</span>
      </div>
      <span className={`absolute left-0 ${loco ? 'top-[32px]' : 'top-[28px]'}`}>{loco ? <EmuNose /> : <Carriage card={card} />}</span>
      {loco && (
        <span className="absolute left-[7px] top-[19px] rounded-[4px] bg-[#14213d] px-[4px] py-[1.5px] text-[8px] font-bold leading-[10px] tracking-[0.06em] text-[#f6d27a] shadow-[0_1px_2px_rgba(0,0,0,.3)]"
          style={{ fontFamily: 'var(--font-zh)' }}>复兴号</span>
      )}
      {count !== undefined && (
        <span key={count} className="pop absolute bottom-1.5 right-1.5 min-w-6 rounded-full bg-[#14213d]/85 px-1.5 text-center font-sans text-[13px] font-bold leading-6 text-white ring-1 ring-white/50">{count}</span>
      )}
    </div>
  );
}

/** The back of an HSR train card: deep navy, a swept red stripe, a stylised EMU nose. */
export function HsrCardBack({ className = '', label }: { className?: string; label?: string }) {
  return (
    <div className={`${SHAPE} hsr-card-back grid place-items-center ${className}`}>
      <svg className="pointer-events-none absolute inset-0" width="64" height="92" viewBox="0 0 64 92" aria-hidden>
        <path d="M-4,64 C18,58 40,50 70,30 V40 C42,58 20,66 -4,70 Z" fill="#c8102e" />
        <path d="M-4,73 C20,67 42,58 70,44" fill="none" stroke="#f2a900" strokeWidth="1" />
        {[16, 22, 28].map((y) => <rect key={y} x="8" y={y} width={y === 22 ? 30 : 20} height="1" rx=".5" fill="#ffffff" opacity=".18" />)}
      </svg>
      <div className="relative flex flex-col items-center gap-1">
        <svg width="34" height="16" viewBox="0 0 34 16" aria-hidden>
          <path d="M1,3 H14 C21,3 26,6 31,10.5 C32.4,11.8 31.8,13 30,13 H1 Z" fill="#ffffff" />
          <path d="M16,4 C20.5,4.4 24,6.2 27,8.8 C24,9.4 20,9 17.4,8 Z" fill="#14213d" />
          <path d="M1,10 H24 C26,10 28,10.6 30,11.6" fill="none" stroke="#c8102e" strokeWidth="1.4" />
        </svg>
        <span className="font-display text-[12px] uppercase leading-none tracking-[0.14em] text-white">{label ?? 'B'}</span>
      </div>
    </div>
  );
}

/** A destination ticket seen from the back (animations): the pale blue China Railway stock with its title. */
export function HsrTicketBack({ className = '' }: { className?: string }) {
  return (
    <div className={`hsr-ticket relative flex h-[58px] w-[96px] flex-col items-center justify-center overflow-hidden rounded-[8px] leading-none shadow-[0_4px_10px_rgba(20,33,61,.25)] ${className}`}>
      <span className="text-[13px] font-bold tracking-[0.3em] text-[#1d5fbf]" style={{ fontFamily: 'var(--font-zh)' }}>车票</span>
      <span className="mt-1 font-display text-[8px] tracking-[0.24em] text-[#1d5fbf]/80">DESTINATION</span>
      <span className="absolute inset-x-0 bottom-0 h-[7px] bg-[#1d5fbf]/15" />
    </div>
  );
}

export function HsrSwatch({ card, size = 14 }: { card: Card; size?: number }) {
  return <span className="inline-block shrink-0 rounded-[3px] align-middle shadow-[inset_0_0_0_1px_rgba(20,33,61,.22)]" style={{ width: size, height: size * 1.4, background: cardBackground(card) }} />;
}
