import type { Ticket } from '@boboland/shared';
import { cityName } from '../lib/skin';

/**
 * Rail (Europe build) destination tickets, drawn as old continental card tickets: buff card stock with a fine
 * ruling, a class band down the left edge (1st class brass, 2nd green, 3rd oxblood, by points), a red serial,
 * a perforated stub on the right with the fare (points) in a wax seal. Same footprint and behaviour as the
 * vintage tickets.
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

/** 1st class for the long journeys, 3rd for the short hops. */
export const ticketClass = (t: Ticket): 1 | 2 | 3 => (t.points >= 20 ? 1 : t.points >= 11 ? 2 : 3);
const CLASS_NAME = { 1: '1st class', 2: '2nd class', 3: '3rd class' } as const;

/** A stable five-digit serial per ticket, printed in red like a real ticket's number. */
export function serial(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return String((h >>> 0) % 100000).padStart(5, '0');
}

function Seal({ points, size, state }: { points: number; size: number; state?: 'ok' | 'lost' }) {
  return (
    <div className={`rail-seal ${state === 'ok' ? 'rail-seal-ok' : state === 'lost' ? 'rail-seal-lost' : ''}`} style={{ width: size, height: size }}>
      <span style={{ fontSize: size * (points <= -10 ? 0.36 : 0.44) }}>{points < 0 ? `−${-points}` : points}</span>
    </div>
  );
}

function Stamp({ ok }: { ok: boolean }) {
  return (
    <div className={`rail-stamp ${ok ? 'rail-stamp-ok' : 'rail-stamp-no'} pointer-events-none -rotate-[9deg] whitespace-nowrap px-2.5 py-[3px] text-[10px] leading-none`}>
      {ok ? 'Connected' : 'Not connected'}
    </div>
  );
}

export function RailTicketCard({ ticket, done, selected, selectable, onToggle, onHover, revealed }: Props) {
  const Tag = selectable ? 'button' : 'div';
  const connected = done || revealed === 'done';
  const failed = revealed === 'failed';
  const cls = ticketClass(ticket);
  const a = cityName(ticket.a), b = cityName(ticket.b);
  const long = a.length > 12 || b.length > 12;
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
      <div data-class={cls} className={`rail-ticket ${selected ? 'rail-selected' : ''} ${connected ? 'rail-done' : ''} ${failed ? 'rail-failed' : ''} relative h-full w-full overflow-hidden rounded-[5px]`}>
        {/* class band */}
        <div className="rail-band pointer-events-none absolute inset-y-0 left-0 w-[5px]" />
        <div className="rail-band-stripe pointer-events-none absolute inset-y-0 left-[5px] w-[5px]" />
        {/* serial and class */}
        <div className="absolute left-[16px] top-[6px] flex items-center gap-2 leading-none" style={{ right: 54 }}>
          <span className="rail-t-red font-ui text-[9.5px] font-bold tabular-nums tracking-[0.08em]">Nº {serial(ticket.id)}</span>
          <span className="rail-t-dim ml-auto font-ui text-[9px] font-semibold tracking-[0.04em]">{CLASS_NAME[cls]}</span>
        </div>
        {/* from / to */}
        <div className="absolute left-[16px] top-[19px] grid grid-cols-[18px_minmax(0,1fr)] items-baseline gap-y-[1px]" style={{ right: 54 }}>
          <span className="rail-t-dim font-ui text-[9px] italic">from</span>
          <span className={`truncate font-display font-bold leading-[1.2] ${long ? 'text-[12.5px]' : 'text-[14px]'}`}>{a}</span>
          <span className="rail-t-dim font-ui text-[9px] italic">to</span>
          <span className={`truncate font-display font-bold leading-[1.2] ${long ? 'text-[12.5px]' : 'text-[14px]'}`}>{b}</span>
        </div>
        <div className="absolute bottom-[6px] left-[16px] flex items-center leading-none" style={{ right: 54 }}>
          {selectable
            ? <span className={`rounded-[3px] px-1.5 py-[2px] font-ui text-[10px] ${selected ? 'rail-keep-on font-semibold' : 'rail-keep'}`}>{selected ? 'Keeping' : 'Tap to keep'}</span>
            : <span className="rail-t-dim font-ui text-[8.5px] tracking-[0.06em]">Valid for one journey</span>}
        </div>
        {/* perforated stub with the fare seal */}
        <div className="rail-perf pointer-events-none absolute inset-y-[4px] w-[4px]" style={{ right: 46 }} />
        <div className="absolute inset-y-0 right-0 flex w-[46px] flex-col items-center justify-center gap-[3px]">
          <Seal points={failed ? -ticket.points : ticket.points} size={34} state={connected ? 'ok' : failed ? 'lost' : undefined} />
          <span className="rail-t-dim font-ui text-[8px] font-semibold tracking-[0.16em]">PTS</span>
        </div>
        {(connected || failed) && <div className="absolute left-[70px] top-[38px] -translate-x-1/2"><Stamp ok={connected} /></div>}
      </div>
    </Tag>
  );
}

/** Slim ticket strip (the docked chooser): class band, the two cities (long names wrap), the fare seal. */
export function RailCompactTicket({ ticket, selected, onToggle, onHover }: Pick<Props, 'ticket' | 'selected' | 'onToggle' | 'onHover'>) {
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  const cls = ticketClass(ticket);
  return (
    <button type="button" onClick={onToggle} aria-pressed={!!selected} data-ticket={ticket.id} title={name}
      onPointerEnter={() => onHover?.(ticket)} onPointerLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ticket)} onBlur={() => onHover?.(null)}
      className={`ticket-stub relative block w-full shrink-0 text-left transition duration-150 ${selected ? 'translate-x-0.5' : 'hover:translate-x-0.5'}`}>
      <div data-class={cls} className={`rail-ticket ${selected ? 'rail-selected' : ''} relative flex min-h-[42px] w-full items-stretch overflow-hidden rounded-[4px]`}>
        <div className="rail-band w-[4px] shrink-0" />
        <div className="min-w-0 flex-1 py-[5px] pl-2.5 pr-2">
          <div className="flex items-center gap-2 leading-none">
            <span className="rail-t-red font-ui text-[8.5px] font-bold tabular-nums tracking-[0.08em]">Nº {serial(ticket.id)}</span>
            <span className="rail-t-dim font-ui text-[8.5px]">{CLASS_NAME[cls]}</span>
          </div>
          <div className="mt-[3px] break-words font-display text-[13px] font-bold leading-tight" data-ticket-name>{name}</div>
        </div>
        <div className="rail-perf my-[3px] w-[4px] shrink-0" />
        <div className="flex w-[40px] shrink-0 items-center justify-center">
          <Seal points={ticket.points} size={28} />
        </div>
      </div>
      {selected && <div className="rail-check absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[10px] leading-none" aria-hidden>✓</div>}
    </button>
  );
}

/** A slim ticket being scored at the end of the game, stamped connected (+points) or not (−points). Fixed height. */
export function RailCountedTicket({ ticket, result }: { ticket: Ticket; result: 'done' | 'failed' }) {
  const done = result === 'done';
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  return (
    <div className="relative" data-ticket={ticket.id} title={name} style={{ filter: 'drop-shadow(0 3px 5px rgba(31,42,36,.28))' }}>
      <div data-class={ticketClass(ticket)} className={`rail-ticket ${done ? 'rail-done' : 'rail-failed'} relative flex h-[48px] w-full items-stretch overflow-hidden rounded-[4px]`}>
        <div className="rail-band w-[4px] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-2.5 pr-2">
          <div className={`font-ui text-[9px] font-bold leading-none tracking-[0.14em] ${done ? 'text-[#2f6b4f]' : 'rail-t-red'}`}>{done ? '✓ CONNECTED' : '✗ NOT CONNECTED'}</div>
          <div className={`mt-[2px] line-clamp-2 break-words font-display text-[12.5px] font-bold leading-[1.15] ${done ? '' : 'opacity-60'}`}>{name}</div>
        </div>
        <div className="rail-perf my-[3px] w-[4px] shrink-0" />
        <div className="flex w-[44px] shrink-0 items-center justify-center">
          <Seal points={done ? ticket.points : -ticket.points} size={32} state={done ? 'ok' : 'lost'} />
        </div>
      </div>
    </div>
  );
}
