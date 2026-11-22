import { useState } from 'react';
import { TICKET_BY_ID, type Ticket } from '@boboland/shared';
import { TicketCard } from './TicketCard';
import { DOCK_PANEL } from '../board/dock';
import { pick } from '../hsr/pick';
import { HSR } from '../theme';

interface Props {
  pending: string[];
  min: number;
  initial: boolean;
  onKeep: (ids: string[]) => void;
  onHover: (t: Ticket | null) => void;
}

/**
 * Docked in the map's bottom-right corner, over the empty area the map fit always keeps free (board/dock.ts),
 * so it hides no city or track and leaves the hand and routes tray visible.
 */
export function TicketChooser({ pending, min, initial, onKeep, onHover }: Props) {
  const [keep, setKeep] = useState<string[]>([]);
  const need = Math.min(min, pending.length);
  const toggle = (id: string) => setKeep((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));
  const ready = keep.length >= need;
  return (
    <div className={`fade-in chooser-glow pointer-events-auto absolute z-30 flex flex-col ${pick('rounded-[14px] border border-line bg-panel/97 shadow-[0_12px_32px_rgba(20,33,61,.22)]', 'rounded-xl border-2 border-ink bg-panel/97 shadow-[0_10px_30px_rgba(60,40,20,.3)]')}`}
      style={{ right: DOCK_PANEL.margin, bottom: DOCK_PANEL.margin, width: DOCK_PANEL.w, transform: 'scale(var(--dock-scale, 1))', transformOrigin: 'bottom right',
        maxHeight: `calc((100% - ${DOCK_PANEL.margin * 2}px) / var(--dock-scale, 1))` }} data-testid="ticket-chooser">
      <div className="px-3 pb-1.5 pt-2.5">
        <h2 className="flex items-start gap-2 font-display text-[16px] leading-tight">
          {/* a small breathing dot: your move is waiting here */}
          <span className="attn-dot mt-[5px] h-2 w-2 shrink-0 rounded-full bg-poster" aria-hidden data-testid="chooser-attn" />
          {initial ? 'Your first destination tickets' : 'New destination tickets'}
          {HSR && <span className="ml-auto mt-[2px] shrink-0 text-[11px] font-bold tracking-[0.12em] text-[#1d5fbf]" style={{ fontFamily: 'var(--font-zh)' }}>选车票</span>}
        </h2>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">Keep at least {need}. Hover to see on the map.</p>
      </div>
      <div className="grid min-h-0 gap-1.5 overflow-y-auto px-3 py-1.5">
        {pending.map((id) => (
          <TicketCard key={id} compact ticket={TICKET_BY_ID[id]} selected={keep.includes(id)} onToggle={() => toggle(id)} onHover={onHover} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-2.5 pt-1.5">
        <button type="button" className="text-[13px] text-muted underline decoration-dotted underline-offset-4 hover:text-ink"
          onClick={() => setKeep(pending)}>Keep all</button>
        <button type="button" disabled={!ready} onClick={() => { onHover(null); onKeep(keep); }} data-testid="keep-tickets"
          className={pick('rounded-[10px] bg-poster px-4 py-2 font-display text-[16px] tracking-wide text-white shadow-[0_2px_8px_rgba(200,16,46,.3)] transition enabled:hover:bg-poster-dark enabled:active:translate-y-px disabled:bg-line disabled:text-muted disabled:shadow-none', 'rounded-md bg-poster px-4 py-2 font-display text-[15px] tracking-wide text-[#fff6e6] shadow-[0_3px_0_#8e2d24] transition enabled:hover:-translate-y-px enabled:active:translate-y-0.5 enabled:active:shadow-none disabled:bg-muted/50 disabled:shadow-none')}>
          {ready ? `Keep ${keep.length} ${keep.length === 1 ? 'ticket' : 'tickets'}` : `Choose ${need - keep.length} more`}
        </button>
      </div>
    </div>
  );
}
