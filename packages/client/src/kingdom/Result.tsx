import type { CSSProperties } from 'react';
import { TREASURE_NAME, type KView } from '@boboland/shared/src/kingdom';
import { TreasureGlyph } from './art/treasures';
import { HeroFigure, HERO_VIEWBOX } from './art/heroes';
import { HeroPortrait } from './art/portraits';
import { INK } from './art/Defs';
import { HERO_COLOR, heroName, heroOf } from './text';

/** The last page: "The End", the winner at the castle gate under fireworks, and everyone's treasures laid out. */
export function ResultPage({ d, names, me, again, onExit }: { d: KView; names: Record<string, string>; me: string | null; again?: { label: string; onClick: () => void; disabled?: boolean }; onExit: () => void }) {
  const w = d.result!.winner;
  const h = heroOf(d, w);
  const order = [w, ...d.order.filter((p) => p !== w)];
  return (
    <div className="kg-result" role="dialog" aria-label="The End" data-testid="kg-result">
      <div className="kg-result-page">
        <svg viewBox="0 0 400 190" className="kg-gate" aria-hidden>
          <rect width="400" height="190" fill="#232a5c" />
          {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={(i * 83) % 400} cy={(i * 37) % 90} r={1 + (i % 2)} fill="#fffbe0" opacity=".8" />)}
          {[[90, 40, '#ffd34d', 0], [310, 34, '#f49ac0', 1], [200, 22, '#9fd3f2', 2]].map(([x, y, c, i]) => (
            <g key={i as number} className="kg-gate-fw" style={{ ['--i' as string]: i } as CSSProperties} transform={`translate(${x},${y})`}>
              {Array.from({ length: 10 }, (_, j) => <path key={j} d="M0,0 L0,-22" stroke={c as string} strokeWidth="3" strokeLinecap="round" transform={`rotate(${j * 36})`} />)}
            </g>
          ))}
          <path d="M0,190 Q200,130 400,190 Z" fill="#3f6a3a" stroke={INK} strokeWidth="2" />
          <g transform="translate(200,178)">
            <rect x="-110" y="-92" width="220" height="92" fill="#e8dcc0" stroke={INK} strokeWidth="2.6" />
            {[-110, -80, -50, -20, 10, 40, 70].map((x) => <rect key={x} x={x + 4} y="-104" width="22" height="14" fill="#e8dcc0" stroke={INK} strokeWidth="2.2" />)}
            {[-150, 110].map((x, k) => (
              <g key={x}>
                <rect x={x} y="-130" width="40" height="130" fill="#f1e6cc" stroke={INK} strokeWidth="2.6" />
                <path d={`M${x - 6},-130 L${x + 20},-170 L${x + 46},-130 Z`} fill={k ? '#5a8ad9' : '#d9546f'} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />
                <rect x={x + 14} y="-104" width="12" height="18" rx="6" fill="#ffd66b" stroke={INK} strokeWidth="1.8" />
              </g>
            ))}
            <path d="M-40,0 V-56 Q0,-92 40,-56 V0 Z" fill="#5c3417" stroke={INK} strokeWidth="2.6" />
            <path d="M-40,-56 Q0,-92 40,-56" fill="none" stroke="#e9b63c" strokeWidth="3" />
          </g>
          <ellipse cx="200" cy="182" rx="60" ry="10" fill="url(#kg-glow)" />
          <svg x="168" y="98" width="64" height="88" viewBox={HERO_VIEWBOX} className="kg-gate-hero"><HeroFigure hero={h} /></svg>
        </svg>
        <h2>The End</h2>
        <p className="kg-result-line" style={{ ['--pc' as string]: HERO_COLOR[h] } as CSSProperties}>
          {w === me ? 'You win! ' : ''}{names[w] ?? heroName(d, w)} the {heroName(d, w)} {d.result!.reason === 'home' ? 'found every treasure and made it home first.' : 'is the last hero standing.'}
        </p>
        <ul className="kg-result-list">
          {order.map((p) => (
            <li key={p} className={p === w ? 'kg-result-win' : undefined} style={{ ['--pc' as string]: HERO_COLOR[heroOf(d, p)] } as CSSProperties}>
              <span className="kg-seat-face"><HeroPortrait hero={heroOf(d, p)} /></span>
              <b>{names[p] ?? heroName(d, p)}<small>the {heroName(d, p)}{d.out.includes(p) ? ' · went home early' : ''}</small></b>
              <span className="kg-result-found">{d.found[p].length ? d.found[p].map((t) => <svg key={t} viewBox="0 0 100 100" className="kg-mini"><title>{TREASURE_NAME[t]}</title><TreasureGlyph t={t} /></svg>) : <i>no treasures yet</i>}</span>
            </li>
          ))}
        </ul>
        <div className="kg-result-actions">
          {again && <button type="button" className="kg-btn kg-btn-gold" onClick={again.onClick} disabled={again.disabled} data-testid="kg-again">{again.label}</button>}
          <button type="button" className="kg-btn" onClick={onExit} data-testid="kg-result-exit">Close the book</button>
        </div>
      </div>
    </div>
  );
}
