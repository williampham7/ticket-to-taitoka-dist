import { type ReactNode } from 'react';
import { PIECE_IDS, orientations, squaresOf, type BEvent, type Guild, type PieceId } from '@boboland/shared/src/blocky';
import { Avatar } from './art/avatars';
import { Crest } from './art/crests';
import { GUILD_INK } from './art/palette';
import { GUILD_NAME, narrate } from './text';

export interface BannerData {
  key: string; name: string; avatar: number | null; guilds: Guild[]; shared?: boolean; you?: boolean;
  active?: boolean; thinking?: boolean; placed: number; score: number | null; rank?: number; grounded: Guild[];
  danger?: { guild: Guild; n: number } | null; shelves: Partial<Record<Guild, PieceId[]>>; offline?: boolean; bot?: boolean; out?: boolean;
}
const ORD = ['1st', '2nd', '3rd', '4th'];

/** A tiny glyph of one piece (5 px cells) for the mini-shelf. */
function Glyph({ id, guild }: { id: PieceId; guild: Guild }) {
  const sh = orientations(id)[0];
  return (
    <svg className="bly-glyph" width={sh.w * 5 + 1} height={sh.h * 5 + 1} viewBox={`-.1 -.1 ${sh.w + 0.2} ${sh.h + 0.2}`} aria-hidden>
      {sh.cells.map(([r, c]) => <rect key={`${r},${c}`} x={c + 0.06} y={r + 0.06} width=".88" height=".88" rx=".22" fill={GUILD_INK[guild].top} stroke={GUILD_INK[guild].ink} strokeWidth=".1" />)}
    </svg>
  );
}

/** A guild's remaining pieces as tiny glyphs; expanded, it lists every piece left with its size. */
export function MiniShelf({ guild, pieces, open }: { guild: Guild; pieces: PieceId[]; open?: boolean }) {
  const left = pieces.reduce((t, p) => t + squaresOf(p), 0);
  return (
    <div className={`bly-mini${open ? ' bly-mini-open' : ''}`} aria-label={`${GUILD_NAME[guild]} has ${pieces.length} pieces left, ${left} squares`}>
      {PIECE_IDS.filter((id) => open || pieces.includes(id)).map((id) => <span key={id} className={pieces.includes(id) ? '' : 'bly-mini-used'}><Glyph id={id} guild={guild} /></span>)}
      <span className="bly-mini-count">{pieces.length} left</span>
    </div>
  );
}

/** A stitched cloth pennant for one builder (or the shared guild). */
export function Banner({ b, open, onToggle, bubble }: { b: BannerData; open?: boolean; onToggle?: () => void; bubble?: ReactNode }) {
  const lead = b.guilds[0];
  const g2 = b.guilds[1];
  const wid = `bly-weave-${b.key.replace(/[^\w-]/g, '')}`;
  return (
    <article className={`bly-banner bly-g-${lead}${b.active ? ' bly-banner-on' : ''}${b.out ? ' bly-banner-out' : ''}${b.shared ? ' bly-banner-shared' : ''}`}
      data-score={b.score ?? ''}>
      <svg className="bly-cloth" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs><pattern id={wid} width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0,1.5 H3 M1.5,0 V3" stroke="#c9b89a" strokeOpacity=".18" strokeWidth=".5" /></pattern></defs>
        <polygon points="0,0 100,0 100,100 50,88 0,100" className="bly-cloth-fill" />
        <polygon points="0,0 100,0 100,100 50,88 0,100" fill={`url(#${wid})`} />
        {b.shared && <polygon points="0,0 100,0 100,100 50,88 0,100" fill="url(#bly-shared-stripe)" />}
        <rect width={g2 ? 50 : 100} height="11" fill={GUILD_INK[lead].top} />
        {g2 && <rect x="50" width="50" height="11" fill={GUILD_INK[g2].top} />}
        <rect width="100" height="2" y="11" fill="#2b3550" opacity=".12" />
        <polygon points="2.4,14 97.6,14 97.6,92 50,82 2.4,92" fill="none" stroke="#b9a684" strokeWidth="1.4" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="bly-banner-rod" aria-hidden />
      <div className="bly-banner-top">
        <span className="bly-banner-face">
          {b.avatar !== null ? <Avatar id={b.avatar} size={46} thinking={b.thinking} /> : <Crest guild={lead} size={46} shared />}
          {b.offline && <span className="bly-offline" title="Offline">zZ</span>}
        </span>
        <div className="bly-banner-id">
          <b className="bly-banner-name">{b.name}</b>
          <span className="bly-banner-guilds">
            {b.guilds.map((g) => <span key={g} className={`bly-guildtag bly-g-${g}`} data-testid={`bly-banner-${g}`} data-score={b.score ?? ''}><Crest guild={g} size={18} shared={b.shared} />{GUILD_NAME[g]}</span>)}
            {b.you && <span className="bly-you">You</span>}
          </span>
        </div>
        <div className="bly-banner-num bly-brass">
          <span className="bly-placed-row" title="Squares placed"><svg className="bly-placed-glyph" viewBox="0 0 12 12" aria-hidden><rect x="1" y="2" width="10" height="9" rx="2.4" fill="#8a6a2a" /><rect x="1" y="1" width="9.4" height="8" rx="2.4" fill="#f6e09a" stroke="#6f5320" strokeWidth="1" /></svg><b className="bly-placed" aria-label={`${b.placed} squares placed`}>{b.placed}</b></span>
          <small>{b.score === null ? 'Not scored' : `score ${b.score < 0 ? '−' : ''}${Math.abs(b.score)}`}</small>
        </div>
        {b.rank !== undefined && !b.shared && <span className={`bly-rank bly-rank-${b.rank}`} title="Current place">{ORD[b.rank]}</span>}
      </div>
      <button type="button" className="bly-banner-shelf" onClick={onToggle} aria-expanded={!!open} aria-label="Pieces left">
        {b.guilds.map((g) => <MiniShelf key={g} guild={g} pieces={b.shelves[g] ?? []} open={open} />)}
      </button>
      {b.danger && <span className="bly-danger" role="status">⚠ {b.danger.n === 1 ? '1 corner left' : `${b.danger.n} corners left`}</span>}
      {b.grounded.length > 0 && <span className="bly-stamp" aria-label="Grounded">Grounded</span>}
      {bubble}
    </article>
  );
}

/** The status line: always the exact next step, in the acting guild's colours. */
export function StatusLine({ guild, text, sub, avatar, thinking, step, alert }: { guild: Guild; text: string; sub?: string; avatar?: number | null; thinking?: boolean; step?: 0 | 1 | 2 | 3; alert?: string }) {
  return (
    <div className={`bly-status bly-stone bly-g-${guild}`} role="status" aria-live="polite" data-testid="bly-status">
      <span className="bly-status-chip"><Crest guild={guild} size={34} /></span>
      <div className="bly-status-text">
        <b>{text}</b>
        {alert ? <small className="bly-alert" role="alert" data-testid="bly-reason">✕ {alert}</small> : sub && <small>{sub}</small>}
      </div>
      {avatar !== undefined && avatar !== null && <Avatar id={avatar} size={40} thinking={thinking} />}
      {step !== undefined && (
        <ol className="bly-steps" aria-hidden>{['Pick', 'Place', 'Build'].map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{s}</li>)}</ol>
      )}
    </div>
  );
}

/** The narrated log: newest first, guild-coloured; a line whose piece is still on the board flashes it when tapped. */
export function LogPanel({ log, names, onPick, tappable, action }: { log: BEvent[]; names: Record<string, string>; onPick?: (e: BEvent) => void; tappable: (e: BEvent) => boolean; action?: ReactNode }) {
  const lines = log.filter((e) => e.k !== 'turn').slice(-8).reverse();
  return (
    <section className="bly-log bly-stone" aria-label="What happened">
      <header className="bly-log-head"><h3>Builder’s log</h3>{action}</header>
      <ol>
        {lines.map((e) => {
          const g = 'guild' in e ? e.guild : null;
          const can = tappable(e);
          return (
            <li key={e.n} className={g ? `bly-g-${g}` : undefined}>
              {g ? <Crest guild={g} size={18} /> : <span className="bly-log-dot" />}
              {can ? <button type="button" onClick={() => onPick?.(e)}>{narrate(e, names)}</button> : <span>{narrate(e, names)}</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
