import { useEffect, useMemo, type CSSProperties } from 'react';
import { TICKET_BY_ID, type FinalResult } from '@boboland/shared';
import { cityName } from '../lib/skin';
import { sfx } from '../lib/sound';
import type { PlayerMeta } from './GameScreen';
import { places, podiumOrder } from './finale';
import { formatDuration } from './Stopwatch';
import { FlapNumber, Roll } from './Roll';
import { HSR } from '../theme';

interface Props {
  result: FinalResult;
  players: PlayerMeta[];
  durationMs: number | null;
  onDone: () => void;
  onViewBoard: () => void;
  onSave: () => void;
  /** start another game: everyone sees the button, only the host's (or any pass-and-play player's) works */
  newGame?: NewGame;
}

export interface NewGame { allowed: boolean; onStart: () => void; busy?: boolean }

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Results: confetti, the podium, and a scoreboard with everyone's routes, tickets and longest route. */
export function GameOver({ result, players, durationMs, onDone, onViewBoard, onSave, newGame }: Props) {
  useEffect(() => { sfx.fanfare(); }, []);
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const order = podiumOrder(result);
  const place = places(result);
  const winners = result.winners.map((id) => byId[id]).filter(Boolean);

  return (
    <div className="fade-in absolute inset-0 z-50 overflow-auto bg-ink/55 p-5 backdrop-blur-[2px]" data-testid="game-over">
      {HSR ? <Fireworks shells={BACKDROP_SHELLS(winners.map((w) => w.fill))} className="fixed" />
        : <Confetti colours={[...players.map((p) => p.fill), '#e3b23c', '#f3dfa0']} />}
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border-[3px] border-ink bg-panel shadow-2xl">
        {/* header: calm paper, the winner's name underlined in their own colour */}
        <div className="px-6 pb-3 pt-6 text-center">
          <div className="flex items-center justify-center gap-3 font-display text-[12px] tracking-[0.35em] text-muted">
            <span className="h-px w-14 bg-ink/25" />FINAL RESULTS{HSR && <span style={{ fontFamily: 'var(--font-zh)', letterSpacing: '0.2em' }}>最终成绩</span>}<span className="h-px w-14 bg-ink/25" />
          </div>
          <h2 className="mt-1.5 font-display text-[44px] leading-tight text-ink" data-testid="winner-title">
            {winners.map((w, i) => (
              <span key={w.id}>
                {i > 0 && ' & '}
                <span className="underline decoration-[6px] underline-offset-[8px]" style={{ textDecorationColor: w.fill }}>{w.name}</span>
              </span>
            ))}
            {winners.length > 1 ? ' share the win!' : ' wins!'}
          </h2>
          <div className="mt-2 text-[15px] text-muted">
            {durationMs !== null && <>Game time {formatDuration(durationMs)} · </>}
            Longest route {result.longest} {result.longest === 1 ? 'car' : 'cars'}
          </div>
        </div>

        <Podium order={order} place={place} result={result} byId={byId} />

        {/* scoreboard */}
        <div className="px-6 pb-2">
          <div className="grid grid-cols-[56px_minmax(0,1fr)_86px_120px_110px_92px] items-end gap-x-3 border-b-2 border-ink pb-1.5 text-[12px] uppercase tracking-[0.12em] text-muted">
            <span>Place</span><span>Player</span><span className="text-right">Routes</span><span className="text-right">Tickets</span><span className="text-right">Longest</span><span className="text-right">Total</span>
          </div>
          {order.map((id, i) => {
            const p = byId[id], r = result.players[id];
            const won = r.tickets.filter((t) => t.done).reduce((s, t) => s + TICKET_BY_ID[t.id].points, 0);
            const lost = r.tickets.filter((t) => !t.done).reduce((s, t) => s + TICKET_BY_ID[t.id].points, 0);
            return (
              <div key={id} className="card-in border-b border-line py-2.5" style={{ animationDelay: `${600 + i * 120}ms` }} data-final={id}>
                <div className="grid grid-cols-[56px_minmax(0,1fr)_86px_120px_110px_92px] items-center gap-x-3">
                  <span className="text-[26px] leading-none">{MEDAL[place[id]] ?? <span className="font-display text-[20px] text-muted">{place[id]}</span>}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink text-[14px] font-semibold text-white" style={{ background: p.fill }}>{p.name.slice(0, 1).toUpperCase()}</span>
                    <span className="truncate text-[18px]">{p.name}</span>
                  </span>
                  <span className="text-right text-[17px] tabular-nums">{r.routePoints}</span>
                  <span className="text-right text-[15px] tabular-nums">
                    <span className="text-[#4f7f4a]">+{won}</span> <span className="text-poster">−{lost}</span>
                  </span>
                  <span className="text-right text-[15px] tabular-nums">
                    {r.longest} cars{r.bonus > 0 && <span className="ml-1.5 rounded-full bg-mustard px-1.5 font-semibold text-ink">+{r.bonus}</span>}
                  </span>
                  <span className="text-right font-display text-[30px] leading-none tabular-nums" data-total={id}>{r.total}</span>
                </div>
                {r.tickets.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[68px]">
                    {r.tickets.map((t) => {
                      const tk = TICKET_BY_ID[t.id];
                      return (
                        <span key={t.id} className={`rounded-full border px-2 py-0.5 text-[12px] ${t.done ? 'border-[#4f7f4a]/50 bg-[#eef0dc] text-[#3f6a3b]' : 'border-poster/40 bg-poster/10 text-poster'}`}>
                          {t.done ? '✓' : '✗'} {cityName(tk.a)} → {cityName(tk.b)} <b className="tabular-nums">{t.done ? '+' : '−'}{tk.points}</b>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-6 pb-5 pt-3">
          <button type="button" onClick={onViewBoard} data-testid="view-board" className="rounded-md border-2 border-ink bg-panel px-4 py-2 font-display text-[15px] hover:-translate-y-px">View the board</button>
          <button type="button" onClick={onSave} data-testid="save-results" className="rounded-md border-2 border-ink bg-panel px-4 py-2 font-display text-[15px] hover:-translate-y-px">Save results (PDF)</button>
          <button type="button" onClick={onDone} className="rounded-md border-2 border-ink bg-panel px-4 py-2 font-display text-[15px] hover:-translate-y-px">Back to start</button>
          {newGame && (
            <button type="button" onClick={newGame.onStart} disabled={!newGame.allowed || newGame.busy} data-testid="new-game"
              title={newGame.allowed ? 'Start a new game with the same players' : 'Only the host can start a new game'}
              className="rounded-md bg-poster px-5 py-2.5 font-display text-[16px] text-[#fff6e6] shadow-[0_3px_0_#8e2d24] enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-muted/45 disabled:shadow-none">
              {newGame.busy ? 'Starting…' : 'New game'}
            </button>
          )}
        </div>
        {newGame && !newGame.allowed && <p className="-mt-2 px-6 pb-4 text-right text-[13px] text-muted" data-testid="new-game-host-only">Only the host can start a new game.</p>}
      </div>
    </div>
  );
}

function Podium({ order, place, result, byId }: { order: string[]; place: Record<string, number>; result: FinalResult; byId: Record<string, PlayerMeta> }) {
  // classic layout: 2nd – 1st – 3rd
  const slots = [order[1], order[0], order[2]];
  const height = { 1: 150, 2: 112, 3: 84 } as Record<number, number>;
  const delay = [350, 0, 650];
  return (
    <div className={`relative mx-6 mb-5 flex items-end justify-center gap-4 border-b-[6px] border-ink ${HSR ? 'pt-14' : 'pt-6'}`} data-testid="podium">
      {HSR && <LanternGlow />}
      {HSR && <Fireworks shells={PODIUM_SHELLS(slots.filter(Boolean).map((id) => byId[id].fill))} />}
      {slots.map((id, i) => {
        if (!id) return <div key={i} className="w-44" />;
        const p = byId[id], rank = place[id], first = rank === 1;
        return (
          <div key={id} className="podium-rise flex w-44 flex-col items-center" style={{ animationDelay: `${delay[i]}ms` }}>
            <span className={`text-[34px] leading-none ${first ? 'crown-bob' : 'invisible'}`} aria-hidden>👑</span>
            <span className="mt-1 grid h-14 w-14 place-items-center rounded-full border-[3px] border-ink text-[24px] font-semibold text-white shadow-md" style={{ background: p.fill }}>{p.name.slice(0, 1).toUpperCase()}</span>
            <span className="mt-1 max-w-full truncate text-[18px] font-semibold">{p.name}</span>
            {HSR
              ? <span className="my-1"><FlapNumber value={result.players[id].total} width={String(result.players[id].total).length} size="sm" /></span>
              : <span className="font-display text-[26px] leading-tight tabular-nums"><Roll value={result.players[id].total} ms={1400} /></span>}
            <div className="relative mt-1 grid w-full place-items-center rounded-t-lg border-[3px] border-b-0 border-ink text-[#fff6e6]"
              style={{ height: height[rank] ?? 84, background: `linear-gradient(180deg, ${p.fill}, color-mix(in srgb, ${p.fill} 70%, #3b2a1e))` }}>
              <span className="font-display text-[44px] leading-none drop-shadow">{rank}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** A short shower of paper confetti in the players' colours and gold. */
function Confetti({ colours }: { colours: string[] }) {
  const bits = useMemo(() => Array.from({ length: 70 }, (_, i) => {
    const r = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { left: r(1) * 100, delay: r(2) * 1800, dur: 2600 + r(3) * 2200, w: 6 + r(4) * 6, h: 9 + r(5) * 8, c: colours[i % colours.length], rot: r(6) * 360 };
  }), [colours]);
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} className="confetti absolute top-0 rounded-[2px]"
          style={{ left: `${b.left}%`, width: b.w, height: b.h, background: b.c, animationDelay: `${b.delay}ms`, animationDuration: `${b.dur}ms`, rotate: `${b.rot}deg` }} />
      ))}
    </div>
  );
}

/* ======================================================================================================
 * HSR theme: instead of confetti, a few fireworks, and a warm red-lantern glow behind the podium.
 * Nothing moves with reduced motion (the fireworks are hidden, the lanterns hang still).
 * ====================================================================================================== */

interface Shell { x: number; y: number; delay: number; colour: string; size: number; rise: number }

/** A handful of fireworks, in seat colours, gold, red and white, each bursting twice and then gone. */
function Fireworks({ shells, className = '' }: { shells: Shell[]; className?: string }) {
  return (
    <div className={`hsr-firework pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {shells.map((s, k) => <Firework key={k} {...s} />)}
    </div>
  );
}

function Firework({ x, y, delay, colour, size, rise }: Shell) {
  const rays = 18;
  const vars = (v: Record<string, string>) => v as CSSProperties;
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      {/* the rocket's trail, climbing to the burst point */}
      <span className="hsr-rocket absolute left-[-1px] top-0 h-7 w-[2px] rounded-full"
        style={{ ...vars({ '--rise': `${rise}px` }), background: `linear-gradient(180deg, #fff, ${colour}00)`, animationDelay: `${delay}ms` }} />
      <span className="hsr-flash absolute rounded-full"
        style={{ left: -size * 0.3, top: -size * 0.3, width: size * 0.6, height: size * 0.6, background: `radial-gradient(circle, #fff 0%, ${colour}aa 35%, ${colour}00 70%)`, animationDelay: `${delay}ms` }} />
      {Array.from({ length: rays }, (_, i) => {
        const long = i % 2 === 0;
        return (
          <span key={i} className="hsr-spark absolute left-0 top-[-1px] h-[2.5px] rounded-full"
            style={{
              ...vars({ '--a': `${(i / rays) * 360 + (k(x, i) % 9)}deg`, '--d': `${size * (long ? 0.5 : 0.36)}px`, '--drop': `${size * 0.06}px` }),
              width: long ? 18 : 12,
              background: `linear-gradient(90deg, ${colour}00, ${colour} 55%, ${long ? '#fff' : colour})`,
              animationDelay: `${delay}ms`,
            }} />
        );
      })}
    </div>
  );
}
const k = (x: number, i: number) => Math.round(Math.abs(Math.sin(x * 7.1 + i * 3.7)) * 100);

/** A red paper lantern, hanging from its cord, glowing from inside. */
function Lantern({ size = 1, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <svg width={44 * size} height={96 * size} viewBox="0 0 44 96" className="hsr-lantern overflow-visible" aria-hidden style={{ animationDelay: `${delay}ms` }}>
      <defs>
        <radialGradient id="lantern-body" cx="0.42" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#ffd27a" />
          <stop offset="0.35" stopColor="#f2452e" />
          <stop offset="1" stopColor="#a80c22" />
        </radialGradient>
      </defs>
      <line x1={22} y1={0} x2={22} y2={22} stroke="#14213d" strokeOpacity={0.55} strokeWidth={1.2} />
      <ellipse cx={22} cy={52} rx={30} ry={28} fill="#ff7a3a" opacity={0.18} className="hsr-lantern-light" />
      <rect x={14} y={21} width={16} height={6} rx={1.5} fill="#e3a51f" />
      <ellipse cx={22} cy={50} rx={20} ry={23} fill="url(#lantern-body)" className="hsr-lantern-light" />
      {[-12, -5, 5, 12].map((dx) => (
        <path key={dx} d={`M22,27.5 Q${22 + dx * 1.65},50 22,72.5`} fill="none" stroke="#8e0a1d" strokeOpacity={0.45} strokeWidth={0.9} />
      ))}
      <path d="M22,27.5 V72.5" stroke="#8e0a1d" strokeOpacity={0.45} strokeWidth={0.9} />
      <rect x={14} y={72} width={16} height={6} rx={1.5} fill="#e3a51f" />
      <rect x={20.6} y={78} width={2.8} height={4} fill="#e3a51f" />
      {[-3, -1, 1, 3].map((dx) => <line key={dx} x1={22 + dx * 0.6} y1={82} x2={22 + dx} y2={95} stroke="#c8102e" strokeWidth={1.3} strokeLinecap="round" />)}
    </svg>
  );
}

/** The warm glow behind the podium, with a lantern hanging on each side. */
function LanternGlow() {
  return (
    <>
      <div className="hsr-lantern-glow pointer-events-none absolute -bottom-10 left-1/2 h-[360px] w-[760px] max-w-full" aria-hidden
        style={{ background: 'radial-gradient(closest-side, rgba(200,16,46,.30) 0%, rgba(232,90,40,.17) 40%, rgba(242,169,0,.07) 68%, rgba(242,169,0,0) 100%)' }} />
      <div className="pointer-events-none absolute left-[9%] top-0" aria-hidden><Lantern size={1.15} /></div>
      <div className="pointer-events-none absolute right-[9%] top-0" aria-hidden><Lantern size={1} delay={-1200} /></div>
    </>
  );
}

const PODIUM_SHELLS = (fills: string[]): Shell[] => [
  { x: 24, y: 30, delay: 450, colour: fills[0] ?? '#f2a900', size: 120, rise: 90 },
  { x: 77, y: 24, delay: 1250, colour: '#f2a900', size: 140, rise: 110 },
  { x: 38, y: 12, delay: 2300, colour: '#e0102f', size: 100, rise: 70 },
  { x: 64, y: 40, delay: 3100, colour: fills[1] ?? '#ffffff', size: 110, rise: 80 },
];
const BACKDROP_SHELLS = (fills: string[]): Shell[] => [
  { x: 7, y: 26, delay: 200, colour: '#f2a900', size: 170, rise: 160 },
  { x: 93, y: 34, delay: 900, colour: fills[0] ?? '#e0102f', size: 160, rise: 150 },
  { x: 6, y: 62, delay: 1800, colour: '#e0102f', size: 150, rise: 140 },
  { x: 94, y: 70, delay: 2600, colour: '#ffffff', size: 140, rise: 130 },
];
