import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { guildsOf, playerScores, squaresOf, squaresPlaced, BONUS_ALL, BONUS_MONO, type BView, type Guild } from '@boboland/shared/src/blocky';
import { Sky } from './art/sky';
import { Avatar } from './art/avatars';
import { Crest } from './art/crests';
import { GUILD_INK } from './art/palette';
import { GUILD_NAME, nameOf } from './text';
import { fxScale } from './fx';
import { sfx } from './sound';

/** One guild's official score, line by line: leftover squares and the finishing bonus. */
export function guildTally(v: BView, g: Guild) {
  const left = v.shelf[g].reduce((t, p) => t + squaresOf(p), 0);
  const mine = v.placed.filter((q) => q.guild === g);
  const last = mine.reduce<typeof mine[0] | null>((b, q) => (!b || q.n > b.n ? q : b), null);
  const bonus = left === 0 ? (last?.piece === 'I1' ? BONUS_MONO : BONUS_ALL) : 0;
  return { left, bonus, placed: squaresPlaced(v, g), total: bonus - left };
}

const GAP = 380;
/** Squares leave one by one, every row at once (staggered), so the whole count takes about 3 s. */
const stepFor = (left: number) => (left ? Math.min(70, 1500 / left) : 70);
/**
 * The result: the isles at night with lanterns. The tally counts each guild's leftover squares off one by one
 * (they fly up off the shelf), with "+15"/"+20" bursts; then the winner stands on a podium isle under fireworks.
 * `?scrub`-free: it runs on its own clock and jumps to the end with animations off.
 */
export function Result({ view, me, names, again, onExit }: { view: BView; me: string | null; names: Record<string, string>; again?: { label: string; onClick: () => void; disabled?: boolean }; onExit: () => void }) {
  const r = view.result!;
  const scores = playerScores(view);
  const win = r.winners;
  const k = fxScale();
  // the timeline: every guild row in ranking order, squares leave one by one, then the bonus
  const plan = useMemo(() => {
    let row = 0;
    return r.ranking.map((p) => guildsOf(view, p).map((g) => {
      const tl = guildTally(view, g), start = 500 + row++ * 220, step = stepFor(tl.left);
      return { g, ...tl, start, step, bonusAt: start + tl.left * step + 120 };
    }));
  }, [view, r.ranking]);
  const end = plan.flat().reduce((m, x) => Math.max(m, x.bonusAt + GAP), 500);
  const [t, setT] = useState(k === 0 ? Infinity : 0);
  const heard = useRef(0);
  useEffect(() => {
    if (k === 0) return;
    const t0 = performance.now();
    let raf = 0;
    const loop = () => { const now = (performance.now() - t0) / k; setT(now); if (now < end + 400) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [k, end]);
  useEffect(() => {
    // tally ticks (at most one per frame), bonus chimes, and the fanfare when the podium shows
    const gone = plan.flat().reduce((n, x) => n + Math.max(0, Math.min(x.left, Math.floor((t - x.start) / x.step))), 0);
    if (gone > heard.current) { sfx('tally', { pitch: 1 + (gone % 8) * 0.04 }); heard.current = gone; }
  }, [t, plan]);
  const bonusHit = plan.flat().filter((x) => x.bonus && t >= x.bonusAt).length;
  const bonusSeen = useRef(0);
  useEffect(() => { if (bonusHit > bonusSeen.current) { sfx('bonus'); bonusSeen.current = bonusHit; } }, [bonusHit]);
  const done = t >= end;
  const cheered = useRef(false);
  useEffect(() => { if (done && !cheered.current) { cheered.current = true; sfx('win'); } }, [done]);
  const title = win.length > 1 ? `${win.map((p) => (p === me ? 'You' : nameOf(names, p))).join(' and ')} share the win` : win[0] === me ? 'You win!' : `${nameOf(names, win[0])} wins!`;
  return (
    <div className="blocky bly-result" role="dialog" aria-label="Game over" data-testid="bly-result">
      <Sky progress={1} />
      {done && <div className="bly-fireworks" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ ['--i' as string]: i } as CSSProperties}>{Array.from({ length: 12 }, (_, j) => <i key={j} style={{ ['--j' as string]: j } as CSSProperties} />)}</span>)}</div>}
      <div className="bly-result-card">
        <Podium view={view} top={r.ranking.slice(0, 3)} winners={win} up={done} />
        <h1>{title}</h1>
        <ol className="bly-tally">
          {r.ranking.map((p, i) => {
            const rows = plan[i];
            const shown = rows.reduce((s, x) => s - Math.max(0, Math.min(x.left, Math.floor((t - x.start) / x.step))) + (x.bonus && t >= x.bonusAt ? x.bonus : 0), 0);
            const final = r.scores[p] ?? scores[p];
            return (
              <li key={p} className={`bly-tally-row bly-pennant bly-g-${guildsOf(view, p)[0] ?? 'tide'}${win.includes(p) && done ? ' bly-tally-win' : ''}`} data-score={final}>
                <span className="bly-tally-rank">{['1st', '2nd', '3rd', '4th'][i]}</span>
                <Avatar id={view.avatars[Number(p)] ?? 0} size={44} />
                <b className="bly-tally-name">{nameOf(names, p)}{p === me ? ' (You)' : ''}{view.out.includes(p) ? ' · left early' : ''}</b>
                <span className="bly-tally-lines">
                  {rows.map((x) => (
                    <span key={x.g} className={`bly-tally-guild bly-g-${x.g}`}>
                      <Crest guild={x.g} size={20} />
                      <span>{GUILD_NAME[x.g]}: {x.placed} placed · −{x.left} left over{x.bonus ? ` · +${x.bonus} all built${x.bonus === BONUS_MONO ? ' (last was the Keystone)' : ''}` : ''}</span>
                      <span className="bly-tally-squares" aria-hidden>
                        {Array.from({ length: Math.min(x.left, 24) }, (_, j) => <i key={j} className={t >= x.start + j * x.step * (x.left / Math.min(x.left, 24)) ? 'gone' : ''} style={{ background: GUILD_INK[x.g].top, borderColor: GUILD_INK[x.g].ink, boxShadow: `inset -2px -3px 0 ${GUILD_INK[x.g].south}, inset 2px 2px 0 rgba(255,255,255,.45)` }} />)}
                        {x.left > 24 && !done && <small className="bly-tally-more">+{x.left - 24} more</small>}
                        {x.bonus > 0 && t >= x.bonusAt && <b className="bly-tally-burst">+{x.bonus} all built!</b>}
                      </span>
                    </span>
                  ))}
                </span>
                <b className="bly-tally-total">{String(done ? final : shown).replace('-', '−')}</b>
              </li>
            );
          })}
        </ol>
        {view.guilds.filter((g) => view.seats[g] === 'shared').map((g) => <p key={g} className="bly-tally-shared"><Crest guild={g} size={18} shared /> {GUILD_NAME[g]} was shared: {squaresPlaced(view, g)} squares placed, not scored.</p>)}
        <div className="bly-result-keys">
          <button type="button" className="bly-key" onClick={onExit}>Back to the menu</button>
          {again && <button type="button" className="bly-key bly-key-go bly-key-big" disabled={again.disabled} onClick={again.onClick} data-testid="bly-rematch">{again.label}</button>}
          {!done && <button type="button" className="bly-key bly-key-ghost bly-key-sm" onClick={() => setT(Infinity)}>Skip the count</button>}
        </div>
      </div>
    </div>
  );
}

/** The podium isle: three carved stone steps on a floating isle, lanterns at its ends, the top builders on it. */
function Podium({ view, top, winners, up }: { view: BView; top: string[]; winners: string[]; up: boolean }) {
  const order = [top[1], top[0], top[2]];
  const H = [46, 66, 32];
  return (
    <div className={`bly-podium${up ? ' bly-podium-up' : ''}`} aria-hidden>
      <svg viewBox="0 0 320 170" className="bly-podium-svg">
        <defs><radialGradient id="bly-pod-glow"><stop offset="0" stopColor="#fff6c8" stopOpacity=".95" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient></defs>
        <path d="M20,118 Q160,104 300,118 L262,138 L210,158 L160,168 L110,158 L58,138Z" fill="#6c7896" stroke="#3a4c86" strokeWidth="2" />
        <path d="M70,140 c-4,10 4,16 -2,26 M250,140 c4,8 -4,14 2,22" stroke="#4a2e14" strokeWidth="3" fill="none" />
        <path d="M150,158 l-6,-14 l6,-8 l6,8z" fill="#b9a6f2" stroke="#2b3550" strokeWidth="1.2" />
        <path d="M20,118 Q160,104 300,118 Q160,130 20,118Z" fill="#e9dfc9" stroke="#8c7e66" strokeWidth="2" />
        {order.map((p, i) => p === undefined ? null : (
          <g key={i} transform={`translate(${58 + i * 70} ${116 - H[i]})`}>
            <rect width="64" height={H[i]} rx="6" fill="#f2ead9" stroke="#8c7e66" strokeWidth="2" />
            <rect x="4" y="4" width="56" height="8" rx="3" fill="#fff" opacity=".7" />
            <text x="32" y={H[i] / 2 + 12} textAnchor="middle" className="bly-pod-num">{[2, 1, 3][i]}</text>
          </g>
        ))}
        {[[30, 112], [290, 112]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r="22" fill="url(#bly-pod-glow)" /><rect x="-2" y="-22" width="4" height="22" fill="#4a4f5c" />
            <path d="M-7,-32 h14 l-1,12 h-12z" fill="#ffe7a6" stroke="#4a4f5c" strokeWidth="2" /><path d="M-9,-32 l9,-7 l9,7z" fill="#4a4f5c" />
          </g>
        ))}
      </svg>
      {order.map((p, i) => p === undefined ? null : (
        <span key={p} className={`bly-pod-face bly-pod-${i}${winners.includes(p) ? ' bly-pod-win' : ''}`}><Avatar id={view.avatars[Number(p)] ?? 0} size={i === 1 ? 78 : 58} /></span>
      ))}
    </div>
  );
}
