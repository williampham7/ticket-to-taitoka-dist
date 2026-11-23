import type { Ticket } from '@boboland/shared';
import { cityName } from '../lib/skin';
import { Waves } from './MerlionCards';

/**
 * Merlion (Singapore build) destination tickets, drawn as contactless travel-pass cards: a coloured tier
 * strip with the contactless waves and the card number, the two places joined like stops on an MRT line
 * diagram, and a stub on the right with the points in a station roundel. Short trips are jade, the middle
 * ones blue, the long ones orchid. Same footprint and behaviour as the vintage tickets.
 */

interface Props {
  ticket: Ticket;
  done?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: () => void;
  onHover?: (t: Ticket | null) => void;
  revealed?: 'done' | 'failed';
}

/** Long trips orchid, middle ones blue, short ones jade. */
export const ticketTier = (t: Ticket): 'long' | 'mid' | 'short' => (t.points >= 15 ? 'long' : t.points >= 10 ? 'mid' : 'short');

/** A stable four-digit card number per ticket. */
export function cardNo(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return String((h >>> 0) % 10000).padStart(4, '0');
}

/** The points in a station roundel: white with a tier ring, jade once connected, grey with a minus when it was not. */
export function PointsRoundel({ points, size, state }: { points: number; size: number; state?: 'ok' | 'lost' }) {
  const ring = state === 'ok' ? '#10996a' : state === 'lost' ? '#9aa8ab' : 'var(--t-ring)';
  const text = points < 0 ? `−${-points}` : String(points);
  return (
    <svg width={size} height={size} viewBox="-10 -10 20 20" aria-hidden className="mrt-points block overflow-visible">
      <circle r="8.6" fill="#fff" stroke={ring} strokeWidth="2.6" />
      <circle r="9.9" fill="none" stroke="#10343c" strokeWidth=".6" opacity=".55" />
      <text x="0" y={text.length > 2 ? 2 : 2.7} textAnchor="middle" fontSize={text.length > 2 ? 6.4 : 8.4}
        fontFamily="Poppins, 'Segoe UI', sans-serif" fontWeight="700" fill={state === 'lost' ? '#7d8d90' : '#10343c'}>{text}</text>
    </svg>
  );
}

/** Two stops joined by a line, like a stop on an MRT diagram. */
function Hop() {
  return (
    <span className="mrt-hop my-[2px] flex items-center pl-[2px]" aria-hidden>
      <span className="mrt-hop-dot" /><span className="mrt-hop-line h-0 flex-1" /><span className="mrt-hop-dot" />
    </span>
  );
}

function Stamp({ ok }: { ok: boolean }) {
  return (
    <div className={`mrt-stamp ${ok ? 'mrt-stamp-ok' : 'mrt-stamp-no'} pointer-events-none -rotate-[7deg] whitespace-nowrap px-2.5 py-[3px] text-[10px] leading-none`}>
      {ok ? '✓ Connected' : 'Not connected'}
    </div>
  );
}

export function MerlionTicketCard({ ticket, done, selected, selectable, onToggle, onHover, revealed }: Props) {
  const Tag = selectable ? 'button' : 'div';
  const connected = done || revealed === 'done';
  const failed = revealed === 'failed';
  const a = cityName(ticket.a), b = cityName(ticket.b);
  const long = a.length > 15 || b.length > 15;
  return (
    <Tag
      type={selectable ? 'button' : undefined}
      onClick={selectable ? onToggle : undefined}
      onPointerEnter={() => onHover?.(ticket)}
      onPointerLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ticket)}
      onBlur={() => onHover?.(null)}
      aria-pressed={selectable ? !!selected : undefined}
      data-ticket={ticket.id}
      className={`ticket-stub relative h-[92px] w-[172px] shrink-0 text-left transition duration-150
        ${selected ? '-translate-y-1.5' : ''}
        ${selectable ? 'hover:-translate-y-1.5' : 'hover:-translate-y-1'}`}>
      <div data-tier={ticketTier(ticket)} className={`mrt-ticket ${selected ? 'mrt-selected' : ''} ${connected ? 'mrt-done' : ''} ${failed ? 'mrt-failed' : ''} relative h-full w-full overflow-hidden rounded-[12px]`}>
        <div className="mrt-strip pointer-events-none absolute inset-x-0 top-0 flex h-[17px] items-center gap-[5px] pl-[9px]" style={{ right: 0 }}>
          <Waves size={11} />
          <span className="font-display text-[8px] font-semibold leading-none tracking-[0.2em] text-white">TRAVEL PASS</span>
          <span className="ml-auto pr-[52px] font-ui text-[8px] font-semibold tabular-nums leading-none text-white/85">{cardNo(ticket.id)}</span>
        </div>
        <div className="absolute left-[10px] top-[22px] flex flex-col" style={{ right: 52 }}>
          <span className={`truncate font-display font-semibold leading-[1.15] ${long ? 'text-[11.5px]' : 'text-[13px]'}`}>{a}</span>
          <Hop />
          <span className={`truncate font-display font-semibold leading-[1.15] ${long ? 'text-[11.5px]' : 'text-[13px]'}`}>{b}</span>
        </div>
        <div className="absolute bottom-[5px] left-[10px] flex items-center leading-none" style={{ right: 52 }}>
          {selectable
            ? <span className={`rounded-full px-2 py-[2px] font-ui text-[9.5px] font-semibold ${selected ? 'mrt-keep-on' : 'mrt-keep'}`}>{selected ? 'Keeping ✓' : 'Tap to keep'}</span>
            : !connected && !failed && <span className="mrt-t-dim font-ui text-[8.5px] font-semibold">One trip, one fare</span>}
        </div>
        <div className="mrt-perf pointer-events-none absolute inset-y-[22px] w-[2px]" style={{ right: 46 }} />
        <div className="mrt-stub absolute bottom-0 right-0 top-[17px] flex w-[45px] flex-col items-center justify-center gap-[2px]">
          <PointsRoundel points={failed ? -ticket.points : ticket.points} size={36} state={connected ? 'ok' : failed ? 'lost' : undefined} />
          <span className="mrt-t-dim font-ui text-[7.5px] font-bold tracking-[0.14em]">PTS</span>
        </div>
        {(connected || failed) && <div className="absolute bottom-[5px] left-[64px] -translate-x-1/2"><Stamp ok={connected} /></div>}
      </div>
    </Tag>
  );
}

/** Slim ticket strip (the docked chooser): tier band, the two places (long names wrap), the points roundel. */
export function MerlionCompactTicket({ ticket, selected, onToggle, onHover }: Pick<Props, 'ticket' | 'selected' | 'onToggle' | 'onHover'>) {
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  return (
    <button type="button" onClick={onToggle} aria-pressed={!!selected} data-ticket={ticket.id} title={name}
      onPointerEnter={() => onHover?.(ticket)} onPointerLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ticket)} onBlur={() => onHover?.(null)}
      className={`ticket-stub relative block w-full shrink-0 text-left transition duration-150 ${selected ? 'translate-x-0.5' : 'hover:translate-x-0.5'}`}>
      <div data-tier={ticketTier(ticket)} className={`mrt-ticket ${selected ? 'mrt-selected' : ''} relative flex min-h-[42px] w-full items-stretch overflow-hidden rounded-[10px]`}>
        <div className="mrt-strip mrt-strip-side w-[6px] shrink-0" />
        <div className="min-w-0 flex-1 py-[6px] pl-2.5 pr-2">
          <div className="break-words font-display text-[12.5px] font-semibold leading-tight" data-ticket-name>{name}</div>
        </div>
        <div className="mrt-perf my-[5px] w-[2px] shrink-0" />
        <div className="mrt-stub flex w-[42px] shrink-0 items-center justify-center">
          <PointsRoundel points={ticket.points} size={30} />
        </div>
      </div>
      {selected && <div className="mrt-check absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] leading-none" aria-hidden>✓</div>}
    </button>
  );
}

/** A slim ticket being scored at the end of the game, connected (+points) or not (−points). Fixed height. */
export function MerlionCountedTicket({ ticket, result }: { ticket: Ticket; result: 'done' | 'failed' }) {
  const done = result === 'done';
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  return (
    <div className="relative" data-ticket={ticket.id} title={name} style={{ filter: 'drop-shadow(0 3px 5px rgba(16,52,60,.25))' }}>
      <div data-tier={ticketTier(ticket)} className={`mrt-ticket ${done ? 'mrt-done' : 'mrt-failed'} relative flex h-[48px] w-full items-stretch overflow-hidden rounded-[10px]`}>
        <div className="mrt-strip mrt-strip-side w-[6px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-2.5 pr-2">
          <div className={`font-ui text-[9px] font-bold leading-none tracking-[0.1em] ${done ? 'text-[#0b7a52]' : 'text-[#b21f6f]'}`}>{done ? '✓ CONNECTED' : '✗ NOT CONNECTED'}</div>
          <div className={`mt-[2px] line-clamp-2 break-words font-display text-[12px] font-semibold leading-[1.15] ${done ? '' : 'opacity-60'}`}>{name}</div>
        </div>
        <div className="mrt-perf my-[5px] w-[2px] shrink-0" />
        <div className="mrt-stub flex w-[44px] shrink-0 items-center justify-center">
          <PointsRoundel points={done ? ticket.points : -ticket.points} size={32} state={done ? 'ok' : 'lost'} />
        </div>
      </div>
    </div>
  );
}
