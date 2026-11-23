import type { CSSProperties } from 'react';
import type { Ticket } from '@boboland/shared';
import { cityName } from '../lib/skin';
import { HSR, MERLION, RAIL } from '../theme';
import { HsrCompactTicket, HsrCountedTicket, HsrTicketCard } from '../hsr/HsrTicket';
import { RailCompactTicket, RailCountedTicket, RailTicketCard } from '../rail/RailTicket';
import { MerlionCompactTicket, MerlionCountedTicket, MerlionTicketCard } from '../merlion/MerlionTicket';

interface Props {
  ticket: Ticket;
  done?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: () => void;
  onHover?: (t: Ticket | null) => void;
  revealed?: 'done' | 'failed';
  /** a slim one-line strip (the docked chooser) */
  compact?: boolean;
}

/** Where the perforation sits, measured from the right edge: the stub to its right holds the fare (points). */
const STUB = 46;
const NOTCH = 6;

/** Two round bites out of the top and bottom edges at the perforation, like a real ticket (works on any background). */
const NOTCHES: CSSProperties = {
  WebkitMask: `radial-gradient(circle ${NOTCH}px at calc(100% - ${STUB}px) 0, #0000 97%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle ${NOTCH}px at calc(100% - ${STUB}px) 100%, #0000 97%, #000) bottom / 100% 51% no-repeat`,
  mask: `radial-gradient(circle ${NOTCH}px at calc(100% - ${STUB}px) 0, #0000 97%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle ${NOTCH}px at calc(100% - ${STUB}px) 100%, #0000 97%, #000) bottom / 100% 51% no-repeat`,
};

/** A destination ticket, drawn as a railway ticket: the route on the left, a tear-off stub with the fare on the right. */
export function TicketCard({ ticket, done, selected, selectable, onToggle, onHover, revealed, compact }: Props) {
  if (HSR) {
    if (compact) return revealed ? <HsrCountedTicket ticket={ticket} result={revealed} /> : <HsrCompactTicket ticket={ticket} selected={selected} onToggle={onToggle} onHover={onHover} />;
    return <HsrTicketCard ticket={ticket} done={done} selected={selected} selectable={selectable} onToggle={onToggle} onHover={onHover} revealed={revealed} />;
  }
  if (RAIL) {
    if (compact) return revealed ? <RailCountedTicket ticket={ticket} result={revealed} /> : <RailCompactTicket ticket={ticket} selected={selected} onToggle={onToggle} onHover={onHover} />;
    return <RailTicketCard ticket={ticket} done={done} selected={selected} selectable={selectable} onToggle={onToggle} onHover={onHover} revealed={revealed} />;
  }
  if (MERLION) {
    if (compact) return revealed ? <MerlionCountedTicket ticket={ticket} result={revealed} /> : <MerlionCompactTicket ticket={ticket} selected={selected} onToggle={onToggle} onHover={onHover} />;
    return <MerlionTicketCard ticket={ticket} done={done} selected={selected} selectable={selectable} onToggle={onToggle} onHover={onHover} revealed={revealed} />;
  }
  if (compact) return revealed ? <CountedTicket ticket={ticket} result={revealed} /> : <CompactTicket ticket={ticket} selected={selected} onToggle={onToggle} onHover={onHover} />;
  const a = { name: cityName(ticket.a) }, b = { name: cityName(ticket.b) };
  const Tag = selectable ? 'button' : 'div';
  const connected = done || revealed === 'done';
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
        ${selectable ? 'hover:-translate-y-1.5' : 'hover:-translate-y-1'}`}
      style={{ filter: selected ? 'drop-shadow(0 0 1.5px #b23a2e) drop-shadow(0 0 1.5px #b23a2e) drop-shadow(0 4px 8px rgba(178,58,46,.35))' : 'drop-shadow(0 2px 3px rgba(60,40,20,.2))' }}>
      <div className={`gold-ticket relative h-full w-full rounded-[10px] border-[1.5px] ${selected ? 'gold-selected' : ''} ${connected ? 'gold-done' : ''}`}
        style={NOTCHES}>
        {/* a faint double rule inside the edge, like printed card stock */}
        <div className="gold-rule pointer-events-none absolute inset-[3px] rounded-[7px] border" />
        {/* perforation */}
        <div className="pointer-events-none absolute inset-y-[9px] border-l-2 border-dotted border-[#c39a3e]" style={{ right: STUB - 1 }} />
        <div className="absolute inset-y-0 left-0 py-2 pl-3" style={{ right: STUB + 4 }}>
          <div className="font-display text-[8.5px] tracking-[0.22em] text-poster">DESTINATION</div>
          <div className={`font-display leading-[1.25] tracking-[0.02em] text-ink ${a.name.length + b.name.length > 21 ? 'text-[12.5px]' : 'text-[14px]'}`}>
            {a.name}
            <br />
            <span className="font-ui text-xs text-muted">to </span>
            {b.name}
          </div>
        </div>
        {/* the stub: fare stamp */}
        <div className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1" style={{ width: STUB }}>
          <div className={`grid h-[32px] w-[32px] place-items-center rounded-full font-sans text-[14px] font-extrabold shadow-[inset_0_0_0_2px_rgba(255,246,230,.35)]
            ${revealed === 'failed' ? 'bg-ink/70 text-paper' : 'bg-poster text-[#fff6e6]'}`}>
            {revealed === 'failed' ? `−${ticket.points}` : ticket.points}
          </div>
          <div className="font-display text-[7px] tracking-[0.18em] text-muted">PTS</div>
        </div>
        {connected && (
          <div className="absolute bottom-2 left-3 -rotate-6 rounded border-2 border-[#4f7f4a] px-1.5 text-[11px] font-semibold tracking-wider text-[#4f7f4a]">CONNECTED</div>
        )}
        {revealed === 'failed' && (
          <div className="absolute bottom-2 left-3 -rotate-6 rounded border-2 border-poster px-1.5 text-[11px] font-semibold tracking-wider text-poster">NOT CONNECTED</div>
        )}
        {selectable && (
          <div className={`absolute bottom-2 left-3 text-[12px] ${selected ? 'font-semibold text-poster' : 'text-muted'}`}>{selected ? 'Keeping' : 'Tap to keep'}</div>
        )}
      </div>
    </Tag>
  );
}

const C_STUB = 40;
const C_NOTCHES: CSSProperties = {
  WebkitMask: `radial-gradient(circle ${NOTCH - 1}px at calc(100% - ${C_STUB}px) 0, #0000 97%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle ${NOTCH - 1}px at calc(100% - ${C_STUB}px) 100%, #0000 97%, #000) bottom / 100% 51% no-repeat`,
  mask: `radial-gradient(circle ${NOTCH - 1}px at calc(100% - ${C_STUB}px) 0, #0000 97%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle ${NOTCH - 1}px at calc(100% - ${C_STUB}px) 100%, #0000 97%, #000) bottom / 100% 51% no-repeat`,
};

/** A slim ticket strip: the two cities (long names wrap, the strip grows), then a tear-off stub with the fare. */
function CompactTicket({ ticket, selected, onToggle, onHover }: Pick<Props, 'ticket' | 'selected' | 'onToggle' | 'onHover'>) {
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  return (
    <button type="button" onClick={onToggle} aria-pressed={!!selected} data-ticket={ticket.id} title={name}
      onPointerEnter={() => onHover?.(ticket)} onPointerLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ticket)} onBlur={() => onHover?.(null)}
      className={`ticket-stub relative block w-full shrink-0 text-left transition duration-150 ${selected ? 'translate-x-0.5' : 'hover:translate-x-0.5'}`}
      style={{ filter: selected ? 'drop-shadow(0 0 1.5px #b23a2e) drop-shadow(0 0 1.5px #b23a2e)' : 'drop-shadow(0 1px 2px rgba(60,40,20,.2))' }}>
      <div className={`gold-ticket relative flex min-h-[40px] w-full items-center rounded-[8px] border-[1.5px] ${selected ? 'gold-selected' : ''}`} style={C_NOTCHES}>
        <div className="pointer-events-none absolute inset-y-[7px] border-l-2 border-dotted border-[#c39a3e]" style={{ right: C_STUB - 1 }} />
        <div className="min-w-0 flex-1 py-[6px] pl-3" style={{ paddingRight: C_STUB + 4 }}>
          <div className="break-words font-display text-[13px] leading-tight tracking-[0.02em] text-ink" data-ticket-name>{name}</div>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: C_STUB }}>
          <div className="grid h-[26px] w-[26px] place-items-center rounded-full bg-poster font-sans text-[12px] font-extrabold text-[#fff6e6]">{ticket.points}</div>
        </div>
      </div>
      {selected && <div className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-poster text-[10px] leading-none text-[#fff6e6]" aria-hidden>✓</div>}
    </button>
  );
}

/**
 * A slim ticket being scored at the end of the game: same gold stock, perforation and stub as the chooser's strips,
 * stamped CONNECTED (green, +points) or NOT CONNECTED (points taken away). Fixed height so a stack lines up.
 */
function CountedTicket({ ticket, result }: { ticket: Ticket; result: 'done' | 'failed' }) {
  const done = result === 'done';
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  return (
    <div className="relative" data-ticket={ticket.id} title={name} style={{ filter: 'drop-shadow(0 3px 5px rgba(60,40,20,.3))' }}>
      <div className={`gold-ticket ${done ? 'gold-done' : ''} relative flex h-[48px] w-full items-center rounded-[8px] border-[1.5px]`} style={C_NOTCHES}>
        <div className="pointer-events-none absolute inset-y-[7px] border-l-2 border-dotted border-[#c39a3e]" style={{ right: C_STUB - 1 }} />
        <div className="min-w-0 flex-1 pl-3" style={{ paddingRight: C_STUB + 4 }}>
          <div className={`font-display text-[7.5px] tracking-[0.2em] ${done ? 'text-[#4f7f4a]' : 'text-poster'}`}>{done ? '✓ CONNECTED' : '✗ NOT CONNECTED'}</div>
          <div className={`line-clamp-2 break-words font-display text-[12.5px] leading-[1.15] tracking-[0.02em] ${done ? 'text-ink' : 'text-ink/55'}`}>{name}</div>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center justify-center" style={{ width: C_STUB }}>
          <div className={`grid h-[28px] min-w-[28px] place-items-center rounded-full px-1 font-sans text-[11.5px] font-extrabold text-[#fff6e6] ${done ? 'bg-[#4f7f4a]' : 'bg-poster'}`}>
            {done ? '+' : '−'}{ticket.points}
          </div>
        </div>
      </div>
    </div>
  );
}
