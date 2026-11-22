import { useEffect, useState } from 'react';
import { ROUTE_BY_ID, TICKET_BY_ID, type FinalResult } from '@boboland/shared';
import { cityName, cityNameZh } from '../lib/skin';
import { HSR } from '../theme';
import { sfx } from '../lib/sound';
import type { Beat } from './finale';
import type { PlayerMeta } from './GameScreen';
import { FlapNumber, FlapText, Roll } from './Roll';
import { TicketCard } from './TicketCard';
import { busyRemaining } from './fx';

/**
 * Plays the finale's beats one after another once `run` turns on (after the last move's animations).
 * index -1: waiting to start; index === beats.length: finished.
 */
export function useFinale(beats: Beat[], run: boolean) {
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    if (!run || index >= 0) return;
    // wait until the last move's animations (registered by later effects in this same render) have finished
    let t = 0;
    const check = () => {
      const left = busyRemaining();
      if (left > 0) t = window.setTimeout(check, left + 250);
      else setIndex(0);
    };
    t = window.setTimeout(check, 400);
    return () => clearTimeout(t);
  }, [run, index]);
  useEffect(() => {
    if (index < 0 || index >= beats.length) return;
    const b = beats[index];
    if (b.kind === 'banner') sfx.endGame();
    else if (b.kind === 'intro') sfx.turn();
    else if (b.kind === 'route') sfx.count(b.delta ?? 0);
    else if (b.kind === 'ticket') (b.ticket?.done ? sfx.ticketWon() : sfx.ticketLost());
    else if (b.kind === 'longest' && b.active.length) sfx.bonus();
    const t = setTimeout(() => setIndex((i) => i + 1), b.ms);
    return () => clearTimeout(t);
  }, [index, beats]);
  return {
    index,
    beat: index >= 0 && index < beats.length ? beats[index] : null,
    done: index >= beats.length,
    skip: () => setIndex(beats.length),
  };
}

interface Props {
  beat: Beat;
  index: number;
  players: PlayerMeta[];
  result: FinalResult;
  onSkip: () => void;
}

/** Everything the end-of-game count draws over the map: the banner, the score cards, the longest-route call-out. */
export function FinaleOverlay(props: Props) {
  return HSR ? <BoardOverlay {...props} /> : <PosterOverlay {...props} />;
}

function PosterOverlay({ beat, index, players, result, onSkip }: Props) {
  const winners = players.filter((p) => beat.kind === 'longest' && beat.active.includes(p.id));
  return (
    <div className="pointer-events-none absolute inset-0 z-40" data-testid="finale" data-beat={beat.kind}>
      {beat.kind === 'banner' ? <EndBanner /> : (
        <div className="absolute inset-x-0 top-3 flex justify-evenly gap-2 px-3" data-testid="score-cards">
          {players.map((p, i) => (
            <ScoreCard key={p.id} p={p} i={i} beat={beat} index={index} counted={countedBefore(beat, players, p.id)} />
          ))}
        </div>
      )}
      {beat.kind === 'longest' && (
        <div key={index} className="bonus-pop absolute bottom-6 left-1/2 flex items-center gap-4 rounded-2xl border-[3px] border-ink bg-mustard px-7 py-3 shadow-[0_16px_40px_rgba(59,42,30,.45)]" data-testid="longest-callout">
          <svg width="44" height="26" viewBox="0 0 38 20" aria-hidden><path d="M2,13 V6 H16 V2 H24 V6 H30 L36,13 Z" fill="#3b2a1e" /><circle cx="9" cy="16" r="3" fill="#3b2a1e" /><circle cx="20" cy="16" r="3" fill="#3b2a1e" /><circle cx="30" cy="16" r="2.5" fill="#3b2a1e" /></svg>
          <div className="leading-tight text-ink">
            <div className="font-display text-[13px] tracking-[0.18em]">LONGEST ROUTE{result.longest ? ` · ${result.longest} CARS` : ''}</div>
            <div className="font-display text-[28px]">{winners.length ? winners.map((w) => w.name).join(' & ') : 'No routes, no bonus'}</div>
          </div>
          {winners.length > 0 && <div className="rounded-full bg-ink px-4 py-1.5 font-display text-[26px] text-mustard">+{beat.delta}</div>}
        </div>
      )}
      <button type="button" onClick={onSkip} data-testid="skip-finale"
        className="pointer-events-auto absolute bottom-3 right-3 rounded-full border border-ink/40 bg-panel/90 px-3 py-1 text-[13px] text-muted shadow hover:border-ink hover:text-ink">
        Skip to results
      </button>
    </div>
  );
}

/** What a player's card says under their score at this beat. */
function captionOf(beat: Beat, pid: string, counted: boolean): { en: string; zh?: string } {
  const on = beat.active.includes(pid);
  const route = on && beat.route ? ROUTE_BY_ID[beat.route] : null;
  const ticket = on && beat.ticket ? TICKET_BY_ID[beat.ticket.id] : null;
  if (!on) return { en: counted ? 'Counted' : 'Waiting' };
  if (beat.kind === 'intro') return { en: introCaption(beat) };
  if (route) {
    const za = cityNameZh(route.a), zb = cityNameZh(route.b);
    return { en: `${cityName(route.a)} – ${cityName(route.b)}`, zh: za && zb ? `${za} – ${zb}` : undefined };
  }
  if (ticket) return { en: beat.ticket!.done ? 'Ticket complete' : 'Ticket not connected' };
  return { en: beat.kind === 'longest' ? 'Longest route bonus' : '' };
}

const introCaption = (beat: Beat) => (beat.phase === 'tickets' ? 'Their tickets' : 'Their routes');

/** Whether this player has been counted in the current round (their card shows a check once their turn in it is over). */
function countedBefore(beat: Beat, players: PlayerMeta[], pid: string) {
  if (beat.kind === 'longest') return true;
  const at = players.findIndex((p) => p.id === beat.active[0]);
  return players.findIndex((p) => p.id === pid) < at;
}

function EndBanner() {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden" data-testid="end-banner">
      <div className="end-banner relative flex items-center gap-5 border-y-[5px] border-ink bg-poster px-14 py-5 text-[#fff6e6] shadow-[0_20px_60px_rgba(59,42,30,.55)]">
        <div className="absolute inset-x-0 top-1.5 h-1 bg-[repeating-linear-gradient(90deg,#fff6e6_0_14px,transparent_14px_24px)] opacity-60" />
        <div className="absolute inset-x-0 bottom-1.5 h-1 bg-[repeating-linear-gradient(90deg,#fff6e6_0_14px,transparent_14px_24px)] opacity-60" />
        <svg width="84" height="48" viewBox="0 0 38 20" aria-hidden><path d="M2,13 V6 H16 V2 H24 V6 H30 L36,13 Z" fill="#fff6e6" /><circle cx="9" cy="16" r="3" fill="#fff6e6" /><circle cx="20" cy="16" r="3" fill="#fff6e6" /><circle cx="30" cy="16" r="2.5" fill="#fff6e6" /></svg>
        <div className="text-center">
          <div className="font-display text-[15px] tracking-[0.35em] opacity-90">ALL CHANGE, PLEASE</div>
          <div className="font-display text-[60px] leading-none tracking-[0.02em]">End of the line!</div>
          <div className="mt-1 text-[17px] opacity-90">The game is over. Let’s count the points.</div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ p, i, beat, index, counted }: { p: PlayerMeta; i: number; beat: Beat; index: number; counted: boolean }) {
  const on = beat.active.includes(p.id);
  const total = beat.totals[p.id] ?? 0;
  const showDelta = on && beat.delta !== undefined && beat.delta !== 0 && beat.kind !== 'intro';
  const route = on && beat.route ? ROUTE_BY_ID[beat.route] : null;
  const ticket = on && beat.ticket ? TICKET_BY_ID[beat.ticket.id] : null;
  const caption = !on ? (counted ? 'Counted' : 'Waiting') :
    beat.kind === 'intro' ? introCaption(beat) :
    route ? `${cityName(route.a)} – ${cityName(route.b)}` :
    ticket ? (beat.ticket!.done ? 'Ticket complete' : 'Ticket not connected') :
    beat.kind === 'longest' ? 'Longest route bonus' : '';
  return (
    <div className="score-card-in relative flex flex-col items-center" style={{ animationDelay: `${i * 90}ms` }}>
      <div className={`relative w-[176px] rounded-xl border-[3px] bg-ticket px-3 pb-2 pt-1.5 text-center transition duration-300 ${on ? 'scale-[1.08]' : counted ? 'opacity-90' : 'opacity-75'}`}
        style={{ borderColor: p.fill, boxShadow: on ? `0 0 0 4px ${p.fill}55, 0 14px 30px rgba(59,42,30,.4)` : '0 6px 16px rgba(59,42,30,.25)' }}
        data-score-card={p.id} data-active={on || undefined}>
        <div className="flex items-center justify-center gap-1.5">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.fill }} />
          <span className="truncate text-[15px] font-semibold">{p.name}</span>
          {counted && !on && <span className="text-[13px] text-[#4f7f4a]" aria-hidden>✓</span>}
        </div>
        <div className="font-display text-[40px] leading-none tabular-nums text-ink" data-score={p.id}><Roll value={total} ms={on ? 320 : 600} /></div>
        <div className="mt-0.5 truncate text-[12px] text-muted">{caption}</div>
        {showDelta && (
          <div key={index} className={`delta-float absolute left-1/2 top-[-14px] rounded-full px-2.5 py-0.5 font-display text-[18px] text-[#fff6e6] shadow ${beat.delta! > 0 ? 'bg-[#4f7f4a]' : 'bg-poster'}`}>
            {beat.delta! > 0 ? `+${beat.delta}` : `−${-beat.delta!}`}
          </div>
        )}
      </div>
      {on && beat.shown && <TicketStack shown={beat.shown} />}
    </div>
  );
}

const STRIP_H = 48;

/** The player's tickets counted so far, newest at the bottom; they overlap a little if there are many. */
function TicketStack({ shown }: { shown: { id: string; done: boolean }[] }) {
  const room = Math.max(160, window.innerHeight - 380);
  const step = shown.length > 1 ? Math.min(STRIP_H + 4, (room - STRIP_H) / (shown.length - 1)) : 0;
  return (
    <div className="relative mt-3 w-[232px]" style={{ height: STRIP_H + step * (shown.length - 1) }} data-testid="counted-tickets">
      {shown.map((t, k) => (
        <div key={t.id + k} className="ticket-reveal absolute inset-x-0" style={{ top: k * step, zIndex: k }} data-counted={t.id} data-done={t.done || undefined}>
          <TicketCard compact ticket={TICKET_BY_ID[t.id]} revealed={t.done ? 'done' : 'failed'} />
        </div>
      ))}
    </div>
  );
}

/* ======================================================================================================
 * HSR theme: the count is a station departure board. A "终点站 FINAL STOP" board flaps into place, then
 * every player has a cell on the board whose score turns on split-flap tiles, digit by digit; their
 * tickets slide out beneath it; the longest-route bonus is a board strip of its own.
 * Same beats, same timing, same test ids as the poster version.
 * ====================================================================================================== */

const BOARD_BG = '#0b1220';
const AMBER = '#f2a900';

function BoardOverlay({ beat, index, players, result, onSkip }: Props) {
  const winners = players.filter((p) => beat.kind === 'longest' && beat.active.includes(p.id));
  return (
    <div className="pointer-events-none absolute inset-0 z-40" data-testid="finale" data-beat={beat.kind}>
      {beat.kind === 'banner' ? <FinalStopBoard /> : (
        <div className="absolute inset-x-0 top-3 flex justify-center px-3" data-testid="score-cards">
          <div className="hsr-board-in rounded-2xl p-2 pt-1.5 shadow-[0_18px_44px_rgba(11,18,32,.45)] ring-1 ring-white/10" style={{ background: BOARD_BG }}>
            <div className="flex items-center gap-2.5 px-1.5 pb-1.5">
              <span className="rounded-[5px] bg-poster px-1.5 py-px text-[13px] font-bold leading-[18px] text-white" style={{ fontFamily: 'var(--font-zh)' }}>终点站</span>
              <span className="font-display text-[14px] tracking-[0.3em] text-white">FINAL STOP</span>
              <span className="ml-auto flex items-center gap-1.5 font-display text-[11px] tracking-[0.22em]" style={{ color: AMBER }}>
                <span style={{ fontFamily: 'var(--font-zh)', letterSpacing: '0.1em' }}>积分</span>POINTS
                <span className="hsr-blink-dot h-1.5 w-1.5 rounded-full" style={{ background: AMBER, boxShadow: `0 0 6px ${AMBER}` }} />
              </span>
            </div>
            <div className="flex gap-1.5">
              {players.map((p, i) => (
                <BoardCell key={p.id} p={p} i={i} beat={beat} index={index} counted={countedBefore(beat, players, p.id)} />
              ))}
            </div>
          </div>
        </div>
      )}
      {beat.kind === 'longest' && (
        <div key={index} className="hsr-bonus-in absolute bottom-6 left-1/2 flex items-stretch overflow-hidden rounded-xl text-white shadow-[0_18px_44px_rgba(11,18,32,.5)] ring-1 ring-white/10"
          style={{ background: BOARD_BG }} data-testid="longest-callout">
          <div className="grid place-items-center bg-poster px-4"><EmuIcon width={58} /></div>
          <div className="relative overflow-hidden px-5 py-2.5 leading-tight">
            <span className="hsr-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="font-display text-[13px] tracking-[0.2em]" style={{ color: AMBER }}>
              <span style={{ fontFamily: 'var(--font-zh)', letterSpacing: '0.08em' }}>最长线路</span> LONGEST ROUTE{result.longest ? ` · ${result.longest} CARS` : ''}
            </div>
            <div className="font-display text-[28px]">{winners.length ? winners.map((w) => w.name).join(' & ') : 'No routes, no bonus'}</div>
          </div>
          {winners.length > 0 && <div className="flex items-center pr-4"><FlapText text={`+${beat.delta}`} size="md" delay={260} stagger={70} /></div>}
        </div>
      )}
      <button type="button" onClick={onSkip} data-testid="skip-finale"
        className="pointer-events-auto absolute bottom-3 right-3 rounded-full border border-ink/40 bg-panel/90 px-3 py-1 text-[13px] text-muted shadow hover:border-ink hover:text-ink">
        Skip to results
      </button>
    </div>
  );
}

/** A small side-on high-speed train, white with a red stripe. */
export function EmuIcon({ width = 64, stripe = '#c8102e' }: { width?: number; stripe?: string }) {
  return (
    <svg width={width} height={(width * 20) / 64} viewBox="0 0 64 20" aria-hidden>
      <path d="M2,4.5 H38 C49,4.5 57,8 62,13.2 C63.2,14.6 62.2,16 60,16 H2 Z" fill="#fff" />
      <rect x={5} y={7.2} width={32} height={2.6} rx={1.3} fill="#14213d" />
      <path d="M41,5.6 C48.5,6 54,8.4 57.4,11.2 L50,11.2 C46.4,10.8 43.4,9.2 41,8 Z" fill="#14213d" />
      <path d="M2,12 H44 C50,12 55.5,12.9 60.6,14.6 L60.9,15.6 C55.4,14.6 50,14.1 44,14.1 H2 Z" fill={stripe} />
      <rect x={6} y={16.4} width={9} height={2.2} rx={1.1} fill="#14213d" opacity={0.85} />
      <rect x={42} y={16.4} width={9} height={2.2} rx={1.1} fill="#14213d" opacity={0.85} />
    </svg>
  );
}

/** The opening board: "终点站 · FINAL STOP" flaps into place, while a little train glides along its foot. */
function FinalStopBoard() {
  const led = <span className="hsr-blink-dot h-2 w-2 rounded-full" style={{ background: AMBER, boxShadow: `0 0 8px ${AMBER}` }} />;
  return (
    <div className="absolute inset-0 grid place-items-center overflow-hidden" data-testid="end-banner">
      <div className="hsr-end-board relative overflow-hidden rounded-2xl px-12 pb-8 pt-5 text-center shadow-[0_26px_70px_rgba(11,18,32,.6)] ring-1 ring-white/10" style={{ background: BOARD_BG }}>
        <div className="absolute inset-x-0 top-0 h-1.5 bg-poster" />
        <div className="flex items-center justify-center gap-3 font-display text-[14px] tracking-[0.34em]" style={{ color: AMBER }}>
          {led}ALL CHANGE, PLEASE{led}
        </div>
        <div className="mt-3 flex items-center justify-center gap-5">
          <span className="rounded-lg bg-poster px-3 py-1 text-[40px] font-bold leading-[52px] text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.18)]" style={{ fontFamily: 'var(--font-zh)' }}>终点站</span>
          <FlapText text="FINAL STOP" size="lg" delay={260} stagger={45} />
        </div>
        <div className="mt-3 text-[16px] text-white/75">The game is over. Let&rsquo;s count the points.</div>
        {/* a rail along the foot of the board, and a train gliding along it */}
        <div className="absolute inset-x-0 bottom-2.5 h-px bg-white/15" />
        <div className="hsr-glide absolute bottom-[11px]"><EmuIcon width={70} /></div>
      </div>
    </div>
  );
}

function BoardCell({ p, i, beat, index, counted }: { p: PlayerMeta; i: number; beat: Beat; index: number; counted: boolean }) {
  const on = beat.active.includes(p.id);
  const total = beat.totals[p.id] ?? 0;
  const showDelta = on && beat.delta !== undefined && beat.delta !== 0 && beat.kind !== 'intro';
  const caption = captionOf(beat, p.id, counted);
  return (
    <div className={`score-card-in relative flex flex-col items-center ${on ? 'z-10' : ''}`} style={{ animationDelay: `${i * 90}ms` }}>
      <div className={`hsr-cell relative w-[172px] overflow-hidden rounded-lg text-center ${on ? 'z-10 scale-[1.06]' : counted ? 'opacity-90' : 'opacity-70'}`}
        style={{ background: '#121a2b', boxShadow: on ? `0 0 0 2px ${p.fill}, 0 0 26px ${p.fill}66, 0 10px 24px rgba(0,0,0,.45)` : 'inset 0 0 0 1px rgba(255,255,255,.07)' }}
        data-score-card={p.id} data-active={on || undefined}>
        <div className="h-[3px]" style={{ background: p.fill }} />
        <div className="flex items-center justify-center gap-1.5 px-2 pt-1">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.fill }} />
          <span className="truncate font-display text-[16px] uppercase tracking-[0.12em] text-white">{p.name}</span>
          {counted && !on && <span className="text-[12px] text-[#3fc285]" aria-hidden>✓</span>}
        </div>
        <div className="flex justify-center px-2 py-1" data-score={p.id}><FlapNumber value={total} /></div>
        <div className="truncate px-2 font-display text-[12px] uppercase leading-[15px] tracking-[0.14em]" style={{ color: AMBER }}>{caption.en}</div>
        <div className="h-[15px] truncate px-2 pb-1 text-[11px] leading-[13px] text-white/55" style={{ fontFamily: 'var(--font-zh)' }}>{caption.zh ?? ''}</div>
      </div>
      {showDelta && (
        <div key={index} className={`delta-float absolute left-[calc(100%-14px)] top-[34px] z-20 rounded-md px-2 py-px font-display text-[17px] text-white shadow-lg ${beat.delta! > 0 ? 'bg-[#1fa35c]' : 'bg-poster'}`}>
          {beat.delta! > 0 ? `+${beat.delta}` : `−${-beat.delta!}`}
        </div>
      )}
      {on && beat.shown && <BoardTickets shown={beat.shown} />}
    </div>
  );
}

/** The player's tickets counted so far slide out from under their cell, newest at the bottom. */
function BoardTickets({ shown }: { shown: { id: string; done: boolean }[] }) {
  const room = Math.max(160, window.innerHeight - 400);
  const step = shown.length > 1 ? Math.min(STRIP_H + 4, (room - STRIP_H) / (shown.length - 1)) : 0;
  return (
    <div className="absolute left-1/2 top-full mt-4 w-[232px] -translate-x-1/2" style={{ height: STRIP_H + step * (shown.length - 1) }} data-testid="counted-tickets">
      {shown.map((t, k) => (
        <div key={t.id + k} className="hsr-ticket-in absolute inset-x-0" style={{ top: k * step, zIndex: k }} data-counted={t.id} data-done={t.done || undefined}>
          <TicketCard compact ticket={TICKET_BY_ID[t.id]} revealed={t.done ? 'done' : 'failed'} />
        </div>
      ))}
    </div>
  );
}
