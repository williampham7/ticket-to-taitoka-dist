import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TICKET_BY_ID, type FinalResult } from '@boboland/shared';
import { SKIN, cityName } from '../lib/skin';
import { MapView } from '../board/MapView';
import type { PlayerMeta } from './GameScreen';
import { podiumOrder } from './finale';
import { formatDuration } from './Stopwatch';

interface Props {
  result: FinalResult;
  claims: Record<string, string>;
  players: PlayerMeta[];
  startedAt: number;
  endedAt: number | null;
  onDone: () => void;
}

const none = new Set<string>();

/**
 * A one-page results sheet (final board + scores + tickets) printed through the browser,
 * so "Save as PDF" in the print dialog gives a keepsake file.
 */
export function PrintSheet({ result, claims, players, startedAt, endedAt, onDone }: Props) {
  const fills = Object.fromEntries(players.map((p) => [p.id, p.fill]));
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const order = podiumOrder(result);
  const date = new Date(endedAt ?? Date.now());

  useEffect(() => {
    const done = () => onDone();
    window.addEventListener('afterprint', done);
    // give the map a moment to measure and draw before opening the print dialog
    const t = setTimeout(() => window.print(), 600);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
  }, [onDone]);

  const winners = result.winners.map((id) => byId[id]?.name).join(' & ');
  return createPortal(
    <div className="print-sheet bg-paper text-ink" data-testid="print-sheet">
      <header className="flex items-end justify-between border-b-2 border-ink pb-2">
        <div>
          <h1 className="font-display text-[30px] leading-none">Ticket to <span className="text-poster">{SKIN.name}</span></h1>
          <p className="mt-1 font-serif text-[13px] italic text-muted">
            {date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {endedAt ? ` · game time ${formatDuration(endedAt - startedAt)}` : ''}
          </p>
        </div>
        <div className="text-right font-display text-[22px] text-poster">{winners} {result.winners.length > 1 ? 'share the win' : 'wins'}</div>
      </header>
      <div className="print-map mt-3 overflow-hidden rounded-md border-2 border-ink">
        <MapView claims={claims} playerFill={fills} claimable={none} />
      </div>
      <table className="mt-3 w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-1">Place</th><th>Player</th><th className="text-right">Routes</th><th className="text-right">Tickets</th>
            <th className="text-right">Longest path</th><th className="text-right">Total</th><th className="pl-4">Destination tickets</th>
          </tr>
        </thead>
        <tbody>
          {order.map((id, i) => {
            const r = result.players[id];
            const p = byId[id];
            return (
              <tr key={id} className="border-b border-line align-top">
                <td className="py-1.5 font-display">{result.winners.includes(id) ? 1 : i + 1}</td>
                <td className="py-1.5"><span className="mr-1.5 inline-block h-3 w-3 rounded-full align-[-1px]" style={{ background: p.fill }} />{p.name}</td>
                <td className="py-1.5 text-right tabular-nums">{r.routePoints}</td>
                <td className="py-1.5 text-right tabular-nums">{r.ticketPoints >= 0 ? '+' : '−'}{Math.abs(r.ticketPoints)}</td>
                <td className="py-1.5 text-right tabular-nums">{r.bonus ? '+10' : '0'} ({r.longest})</td>
                <td className="py-1.5 text-right font-display text-[16px] tabular-nums">{r.total}</td>
                <td className="py-1.5 pl-4">
                  {r.tickets.map((t) => {
                    const tk = TICKET_BY_ID[t.id];
                    return <div key={t.id}>{t.done ? '✓' : '✗'} {nameOf(tk.a)} – {nameOf(tk.b)} ({t.done ? '+' : '−'}{tk.points})</div>;
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>,
    document.body,
  );
}

const nameOf = cityName;
