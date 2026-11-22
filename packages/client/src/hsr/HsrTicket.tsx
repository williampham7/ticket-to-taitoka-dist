import type { Ticket } from '@boboland/shared';
import { cityName, cityNameZh } from '../lib/skin';
import { QR_SIZE, isBusiness, qrPath, ticketMeta } from './ticketMeta';

/**
 * HSR (China build) destination tickets, drawn as China Railway tickets: pale blue stock, a G train number,
 * stations in Chinese over English, the seat class, a red serial and a QR code. Long tickets (20+ points)
 * are business class: deep red with a gold foil stripe. Same footprint and behaviour as the vintage tickets.
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

const ZH = { fontFamily: 'var(--font-zh)' } as const;

export function Qr({ id, size }: { id: string; size: number }) {
  return (
    <span className="hsr-ticket-qr grid shrink-0 place-items-center rounded-[3px] bg-white" style={{ width: size + 4, height: size + 4 }} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} shapeRendering="crispEdges"><path d={qrPath(id)} fill="#14213d" /></svg>
    </span>
  );
}

function Station({ id, align }: { id: string; align: 'left' | 'right' }) {
  const zh = cityNameZh(id), en = cityName(id);
  return (
    <div className={`min-w-0 leading-none ${align === 'right' ? 'text-right' : ''}`}>
      {zh && <div className="hsr-t-zh truncate text-[15px] font-bold tracking-[0.04em]" style={ZH}>{zh}</div>}
      <div className={`hsr-t-en truncate font-display uppercase tracking-[0.06em] ${zh ? 'mt-[3px] text-[9px]' : 'text-[13px]'}`}>{en}</div>
    </div>
  );
}

/** The train number over a long arrow, between the two stations. */
function TrainNo({ train }: { train: string }) {
  return (
    <div className="flex flex-col items-center px-1 pt-[1px] leading-none">
      <span className="hsr-t-train font-display text-[11.5px] tracking-[0.06em]">{train}</span>
      <svg width="34" height="6" viewBox="0 0 34 6" className="mt-[2px]" aria-hidden>
        <path d="M0,4.5 H31 L27,1" fill="none" stroke="currentColor" strokeWidth="1.1" className="hsr-t-arrow" />
      </svg>
      <span className="hsr-t-dim mt-[2px] text-[6.5px] font-medium tracking-[0.1em]" style={ZH}>次</span>
    </div>
  );
}

function Stamp({ ok, small }: { ok: boolean; small?: boolean }) {
  return (
    <div className={`hsr-stamp ${ok ? 'hsr-stamp-ok' : 'hsr-stamp-no'} pointer-events-none flex -rotate-[8deg] flex-col items-center whitespace-nowrap rounded-[6px] border-2 px-1 leading-none ${small ? 'py-[2px]' : 'py-[3px]'}`}>
      <span className="text-[10px] font-bold tracking-[0.14em]" style={ZH}>{ok ? '已连通' : '未连通'}</span>
      <span className="mt-[2px] font-display text-[7px] tracking-[0.08em]">{ok ? 'CONNECTED' : 'NOT CONNECTED'}</span>
    </div>
  );
}

export function HsrTicketCard({ ticket, done, selected, selectable, onToggle, onHover, revealed }: Props) {
  const Tag = selectable ? 'button' : 'div';
  const connected = done || revealed === 'done';
  const failed = revealed === 'failed';
  const biz = isBusiness(ticket);
  const m = ticketMeta(ticket.id);
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
      data-class={biz ? 'business' : 'second'}
      className={`ticket-stub hsr-ticket-wrap relative h-[92px] w-[172px] shrink-0 text-left transition duration-150
        ${selected ? '-translate-y-1.5' : ''}
        ${selectable ? 'hover:-translate-y-1.5' : 'hover:-translate-y-1'}`}>
      <div className={`hsr-ticket ${biz ? 'hsr-biz' : ''} ${selected ? 'hsr-selected' : ''} ${connected ? 'hsr-done' : ''} ${failed ? 'hsr-failed' : ''} relative h-full w-full overflow-hidden rounded-[10px]`}>
        {biz && <div className="hsr-foil pointer-events-none absolute inset-y-0 left-0 w-[6px]" />}
        {/* serial and seat */}
        <div className={`absolute ${biz ? 'left-[13px]' : 'left-[9px]'} right-[9px] top-[6px] flex items-center justify-between leading-none`}>
          <span className="hsr-t-serial font-mono text-[8.5px] font-semibold tracking-[0.04em]">{m.serial}</span>
          {selectable
            ? <span className={`rounded-full px-1.5 py-[2px] text-[9px] leading-none ${selected ? 'hsr-keep-on font-semibold' : 'hsr-keep'}`}>{selected ? 'Keeping' : 'Tap to keep'}</span>
            : <span className="hsr-t-dim text-[7.5px]" style={ZH}>{m.seat}</span>}
        </div>
        {/* from — train — to */}
        <div className={`absolute ${biz ? 'left-[13px]' : 'left-[9px]'} right-[9px] top-[20px] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start`}>
          <Station id={ticket.a} align="left" />
          <TrainNo train={m.train} />
          <Station id={ticket.b} align="right" />
        </div>
        {/* fare (points), seat class, QR */}
        <div className={`absolute ${biz ? 'left-[13px]' : 'left-[9px]'} right-[9px] bottom-[6px] flex items-end gap-2 leading-none`}>
          <div className="flex flex-col">
            <span className={`hsr-t-points font-display text-[22px] leading-[.9] tabular-nums ${failed ? 'hsr-t-neg' : ''}`}>
              {failed ? `−${ticket.points}` : ticket.points}<span className="ml-[2px] text-[8px] tracking-[0.12em]">PTS</span>
            </span>
            <span className="hsr-t-dim mt-[3px] whitespace-nowrap text-[7.5px]"><span style={ZH}>{biz ? '商务座' : '二等座'}</span> · {biz ? 'Business' : '2nd class'}</span>
          </div>
          <div className="ml-auto"><Qr id={ticket.id} size={23} /></div>
        </div>
        {(connected || failed) && <div className="absolute left-1/2 top-[21px] -translate-x-1/2"><Stamp ok={connected} /></div>}
      </div>
    </Tag>
  );
}

/** Slim ticket strip (the docked chooser): train number and Chinese names, the English names (wrap), the fare. */
export function HsrCompactTicket({ ticket, selected, onToggle, onHover }: Pick<Props, 'ticket' | 'selected' | 'onToggle' | 'onHover'>) {
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  const zhA = cityNameZh(ticket.a), zhB = cityNameZh(ticket.b);
  const biz = isBusiness(ticket);
  const m = ticketMeta(ticket.id);
  return (
    <button type="button" onClick={onToggle} aria-pressed={!!selected} data-ticket={ticket.id} data-class={biz ? 'business' : 'second'} title={name}
      onPointerEnter={() => onHover?.(ticket)} onPointerLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ticket)} onBlur={() => onHover?.(null)}
      className={`ticket-stub hsr-ticket-wrap relative block w-full shrink-0 text-left transition duration-150 ${selected ? 'translate-x-0.5' : 'hover:translate-x-0.5'}`}>
      <div className={`hsr-ticket ${biz ? 'hsr-biz' : ''} ${selected ? 'hsr-selected' : ''} relative flex min-h-[40px] w-full items-stretch overflow-hidden rounded-[8px]`}>
        {biz && <div className="hsr-foil pointer-events-none absolute inset-y-0 right-[44px] w-[6px]" />}
        <div className="min-w-0 flex-1 py-[5px] pl-2.5 pr-2">
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="hsr-t-train font-display text-[10px] tracking-[0.06em]">{m.train}</span>
            {zhA && zhB && <span className="hsr-t-zh text-[10.5px] font-bold tracking-[0.04em]" style={ZH}>{zhA} → {zhB}</span>}
            {biz && <span className="hsr-t-dim ml-auto text-[8px]" style={ZH}>商务座</span>}
          </div>
          <div className="hsr-t-en mt-[2px] break-words font-display text-[13px] leading-tight tracking-[0.02em]" data-ticket-name>{name}</div>
        </div>
        <div className="hsr-t-stub flex w-[44px] shrink-0 flex-col items-center justify-center border-l border-dashed leading-none">
          <span className="hsr-t-points font-display text-[18px] leading-[20px] tabular-nums">{ticket.points}</span>
          <span className="hsr-t-dim mt-[1px] font-display text-[7px] tracking-[0.14em]">PTS</span>
        </div>
      </div>
      {selected && <div className="hsr-check absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[10px] leading-none" aria-hidden>✓</div>}
    </button>
  );
}

/** A slim ticket being scored at the end of the game, stamped connected (+points) or not (−points). Fixed height. */
export function HsrCountedTicket({ ticket, result }: { ticket: Ticket; result: 'done' | 'failed' }) {
  const done = result === 'done';
  const name = `${cityName(ticket.a)} → ${cityName(ticket.b)}`;
  const biz = isBusiness(ticket);
  const m = ticketMeta(ticket.id);
  return (
    <div className="relative" data-ticket={ticket.id} title={name} style={{ filter: 'drop-shadow(0 3px 5px rgba(20,33,61,.25))' }}>
      <div className={`hsr-ticket ${biz ? 'hsr-biz' : ''} ${done ? 'hsr-done' : 'hsr-failed'} relative flex h-[48px] w-full items-stretch overflow-hidden rounded-[8px]`}>
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-2.5 pr-2">
          <div className={`flex items-center gap-1 font-display text-[8px] leading-none tracking-[0.14em] ${done ? 'hsr-t-ok' : 'hsr-t-neg'}`}>
            <span>{done ? '✓ CONNECTED' : '✗ NOT CONNECTED'}</span>
            <span className="hsr-t-dim ml-auto tracking-[0.06em]">{m.train}</span>
          </div>
          <div className={`hsr-t-en mt-[2px] line-clamp-2 break-words font-display text-[12.5px] leading-[1.15] tracking-[0.02em] ${done ? '' : 'opacity-60'}`}>{name}</div>
        </div>
        <div className="hsr-t-stub flex w-[44px] shrink-0 items-center justify-center border-l border-dashed">
          <div className={`grid h-[26px] min-w-[30px] place-items-center rounded-[6px] px-1 font-display text-[14px] text-white ${done ? 'bg-[#1f9d55]' : 'bg-[#c8102e]'}`}>
            {done ? '+' : '−'}{ticket.points}
          </div>
        </div>
      </div>
    </div>
  );
}
