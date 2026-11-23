import type { Card } from '@boboland/shared';
import { HSR, MERLION, RAIL, cardBackground, cardInk, cardName } from '../theme';
import { HsrCardBack, HsrCardTile, HsrSwatch, HsrTicketBack } from '../hsr/HsrCards';
import { RailCardBack, RailCardTile, RailSwatch, RailTicketBack } from '../rail/RailCards';
import { MerlionCardBack, MerlionCardTile, MerlionSwatch, MerlionTicketBack } from '../merlion/MerlionCards';

/**
 * The engraving on a train card, in the card's ink colour. `cut` is the colour of the details (windows,
 * bands, spokes): light on a dark engraving, dark on a light one.
 */
export function CarGlyph({ color, cut, loco }: { color: string; cut: string; loco?: boolean }) {
  const rail = (w: number, y: number) => (
    <g aria-hidden>
      <rect x="0" y={y} width={w} height="1.1" fill={color} opacity=".7" />
      {Array.from({ length: Math.ceil(w / 7) }, (_, i) => <rect key={i} x={2 + i * 7} y={y + 1.1} width="3" height="1" fill={color} opacity=".45" />)}
    </g>
  );
  const wheel = (cx: number, cy: number, r: number, spokes = false) => (
    <g key={`${cx}`}>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {spokes && [0, 60, 120].map((d) => {
        const a = (d * Math.PI) / 180, dx = Math.cos(a) * (r - 0.8), dy = Math.sin(a) * (r - 0.8);
        return <line key={d} x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} stroke={cut} strokeWidth=".7" />;
      })}
      <circle cx={cx} cy={cy} r={r > 3 ? 1.2 : 0.9} fill={cut} />
    </g>
  );
  if (loco)
    return (
      <svg width="52" height="31" viewBox="0 0 54 32" aria-hidden>
        {/* smoke from the stack */}
        <circle cx="36.5" cy="2.6" r="1.9" fill={color} opacity=".5" />
        <circle cx="32.4" cy="2" r="1.4" fill={color} opacity=".35" />
        <circle cx="29" cy="1.8" r="1" fill={color} opacity=".22" />
        {/* cab, roof and window */}
        <rect x="4" y="6.5" width="12.5" height="15" rx="1" fill={color} />
        <rect x="2.8" y="4.6" width="15" height="2.4" rx="1" fill={color} />
        <rect x="7" y="9" width="6.5" height="5.2" rx="1" fill={cut} />
        {/* boiler with bands, domes, stack and smokebox */}
        <rect x="15.5" y="11" width="27" height="10" rx="5" fill={color} />
        {[22, 29, 36].map((x) => <rect key={x} x={x} y="11.4" width="1" height="9.2" fill={cut} />)}
        <path d="M24.5,11.2 a3.3,3.3 0 0 1 6.6,0 Z" fill={color} />
        <path d="M32.6,11.2 a2,2 0 0 1 4,0 Z" fill={color} />
        <path d="M38.2,11.2 V6.2 L37,4.2 H43.4 L42.2,6.2 V11.2 Z" fill={color} />
        <rect x="41" y="10.4" width="4.8" height="11" rx="1.6" fill={color} />
        {/* headlamp */}
        <rect x="44.6" y="11.2" width="3.6" height="3.4" rx=".9" fill={color} />
        <circle cx="47.4" cy="12.9" r=".95" fill={cut} />
        {/* running board, cowcatcher */}
        <rect x="3.5" y="21" width="44" height="2" fill={color} />
        <path d="M45.5,21 L52.5,27.6 H44.4 Z" fill={color} />
        {[47, 49.2].map((x) => <line key={x} x1={x} y1="22.4" x2={x - 1.2} y2="27.2" stroke={cut} strokeWidth=".6" />)}
        {/* wheels: trailing, two drivers with a connecting rod, leading */}
        {wheel(9.5, 27.6, 2.6)}
        {wheel(21.5, 26.6, 4.2, true)}
        {wheel(31.5, 26.6, 4.2, true)}
        {wheel(40.5, 27.6, 2.6)}
        <rect x="21.5" y="26.1" width="10" height="1.1" rx=".5" fill={cut} />
        {rail(54, 30.4)}
      </svg>
    );
  return (
    <svg width="48" height="29" viewBox="0 0 50 30" aria-hidden>
      {/* arched roof with vents */}
      <path d="M5,7.2 Q25,2.6 45,7.2 L46,9 H4 Z" fill={color} />
      <rect x="14" y="3.9" width="4" height="1.5" rx=".5" fill={color} />
      <rect x="32" y="3.9" width="4" height="1.5" rx=".5" fill={color} />
      {/* body: windows, door, waist stripe */}
      <rect x="5" y="9" width="40" height="11.5" rx="1" fill={color} />
      {[8, 15, 22, 29].map((x) => <rect key={x} x={x} y="11" width="5" height="4.6" rx="1" fill={cut} />)}
      <rect x="37.4" y="10.6" width="4.6" height="9" rx=".6" fill="none" stroke={cut} strokeWidth=".9" />
      <rect x="38.6" y="11.8" width="2.2" height="3" rx=".4" fill={cut} />
      <rect x="5" y="17.2" width="31" height=".9" fill={cut} />
      {/* underframe, couplers, two bogies */}
      <rect x="7" y="20.5" width="36" height="1.5" fill={color} />
      <rect x="1.2" y="17.6" width="3.8" height="1.4" rx=".5" fill={color} />
      <rect x="45" y="17.6" width="3.8" height="1.4" rx=".5" fill={color} />
      {[12, 38].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="21.6" width="12" height="1.4" rx=".6" fill={color} />
          {wheel(x - 3.2, 24.6, 2.6)}
          {wheel(x + 3.2, 24.6, 2.6)}
        </g>
      ))}
      {rail(50, 28)}
    </svg>
  );
}

const SHAPE = 'relative h-[92px] w-[64px] shrink-0 overflow-hidden rounded-[10px] border-[1.5px] border-black/40 shadow-[0_2px_6px_rgba(60,40,20,.25),inset_0_1px_0_rgba(255,255,255,.35)]';
/** Printed-card finish laid over the colour: a soft sheen from the top left, a little shade at the bottom. */
const FINISH = 'linear-gradient(155deg, rgba(255,255,255,.3) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0) 70%, rgba(0,0,0,.14) 100%)';

/** The face of a train card — the same shape in the hand, the face-up row and the animations. */
export function CardTile({ card, count, className = '' }: { card: Card; count?: number; className?: string }) {
  if (HSR) return <HsrCardTile card={card} count={count} className={className} />;
  if (RAIL) return <RailCardTile card={card} count={count} className={className} />;
  if (MERLION) return <MerlionCardTile card={card} count={count} className={className} />;
  const ink = cardInk(card);
  const lightInk = card !== 'white' && card !== 'yellow';
  const cut = lightInk ? 'rgba(30,20,12,.45)' : 'rgba(255,250,240,.75)';
  const rule = lightInk ? 'rgba(255,250,240,.55)' : 'rgba(40,28,18,.4)';
  return (
    <div className={`${SHAPE} ${className}`} style={{ background: `${FINISH}, ${cardBackground(card)}` }}>
      {/* printed frame: a fine rule inset from the edge, with a rivet in each corner */}
      <div className="pointer-events-none absolute inset-[3px] rounded-[7px] border" style={{ borderColor: rule }} />
      {[[6, 6], [6, 'r'], ['b', 6], ['b', 'r']].map(([v, h], i) => (
        <span key={i} className="pointer-events-none absolute h-[3px] w-[3px] rounded-full"
          style={{ background: rule, top: v === 'b' ? undefined : 6, bottom: v === 'b' ? 6 : undefined, left: h === 'r' ? undefined : 6, right: h === 'r' ? 6 : undefined }} />
      ))}
      <span className={`absolute inset-x-0 top-[7px] whitespace-nowrap text-center font-semibold uppercase ${card === 'locomotive' ? 'text-[8px] tracking-[0.04em]' : 'text-[9.5px] tracking-[0.12em]'}`} style={{ color: ink }}>{cardName(card)}</span>
      <span className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 opacity-[.88]"><CarGlyph color={ink} cut={cut} loco={card === 'locomotive'} /></span>
      {count !== undefined && (
        <span key={count} className="pop absolute bottom-1.5 right-1.5 min-w-6 rounded-full bg-black/55 px-1.5 text-center font-sans text-[13px] font-extrabold leading-6 text-white ring-1 ring-white/40">{count}</span>
      )}
    </div>
  );
}

export function CardBack({ className = '', label }: { className?: string; label?: string }) {
  if (HSR) return <HsrCardBack className={className} label={label} />;
  if (RAIL) return <RailCardBack className={className} label={label} />;
  if (MERLION) return <MerlionCardBack className={className} label={label} />;
  return (
    <div className={`${SHAPE} grid place-items-center ${className}`}
      style={{ background: 'repeating-linear-gradient(45deg,#2f4f6f 0 6px,#36597c 6px 12px)' }}>
      <div className="grid h-[70px] w-[46px] place-items-center rounded-md border-2 border-[#f3e8cf]/70 text-center">
        <span className="font-display text-[11px] leading-tight text-[#f3e8cf]">{label ?? 'B'}</span>
      </div>
    </div>
  );
}

/** A destination ticket seen from the back, for animations (landscape, like the tickets in your tray). */
export function TicketBack({ className = '' }: { className?: string }) {
  if (HSR) return <HsrTicketBack className={className} />;
  if (RAIL) return <RailTicketBack className={className} />;
  if (MERLION) return <MerlionTicketBack className={className} />;
  return (
    <div className={`relative flex h-[58px] w-[96px] overflow-hidden gold-ticket rounded-[8px] border-[1.5px] shadow-[0_4px_10px_rgba(60,40,20,.3)] ${className}`}>
      {/* stub, perforation, then the title set clear of the tear line */}
      <div className="w-[16px] shrink-0 bg-[#b23a2e]/10" />
      <div className="my-1.5 border-l-[1.5px] border-dashed border-[#c39a3e]" />
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center leading-none">
        <span className="font-display text-[7.5px] tracking-[0.16em] text-[#b23a2e]">DESTINATION</span>
        <span className="mt-1 font-display text-[13px] tracking-[0.06em] text-[#3b2a1e]">TICKET</span>
      </div>
    </div>
  );
}

export function HandCard({ card, count, flash }: { card: Card; count: number; flash?: boolean }) {
  return (
    <div data-card={card} data-count={count} aria-label={`${count} ${cardName(card)}`} className={flash ? 'drawn-flash rounded-[10px]' : undefined}>
      <CardTile card={card} count={count} />
    </div>
  );
}

export function Swatch({ card, size = 14 }: { card: Card; size?: number }) {
  if (HSR) return <HsrSwatch card={card} size={size} />;
  if (RAIL) return <RailSwatch card={card} size={size} />;
  if (MERLION) return <MerlionSwatch card={card} size={size} />;
  return <span className="inline-block shrink-0 rounded-[3px] border border-black/30 align-middle" style={{ width: size, height: size * 1.4, background: cardBackground(card) }} />;
}
