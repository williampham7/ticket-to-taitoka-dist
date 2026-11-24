import { MAP_H, MAP_W, TERRITORY_IDS, TERRITORY_PATHS, LAND_PATHS, territoriesOf } from '@boboland/shared/src/warfront';
import type { WarClientView } from './WarScreen';
import { factionOf } from './factions';
import { nameOf } from './text';

/** The debrief: a newspaper front page with the final map, a medal for the victor, stats and the share of the world over time. */
export function Result({ v, names, me, again, onExit, onBoard }: {
  v: WarClientView; names: Record<string, string>; me: string | null; again?: { label: string; onClick: () => void } | null; onExit: () => void; onBoard: () => void;
}) {
  const r = v.result!;
  const winner = nameOf(names, r.winner).toUpperCase();
  const head = r.reason === 'mission' ? `GENERAL ${winner} COMPLETES SECRET ORDERS` : r.reason === 'resign' ? `GENERAL ${winner} HOLDS THE FIELD` : `GENERAL ${winner} SECURES THE WORLD`;
  const wf = factionOf(v.factions, r.winner);
  const players = [...v.players].sort((a, b) => (a === r.winner ? -1 : b === r.winner ? 1 : territoriesOf(v, b).length - territoriesOf(v, a).length));
  return (
    <div className="wf-modal wf-result" role="dialog" aria-label="Debrief" data-testid="wf-result">
      <article className="wf-paper">
        <header className="wf-masthead">
          <span>Vol. {v.round} · Late Edition</span>
          <h1>The War Table Gazette</h1>
          <span>Price: one intel card</span>
        </header>
        <h2 className="wf-headline">{head}</h2>
        <div className="wf-paper-cols">
          <figure className="wf-halftone">
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
              <defs><pattern id="wf-ht" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.1" fill="#1a1714" /></pattern></defs>
              {LAND_PATHS.map((d, i) => <path key={i} d={d} fill="#d8d0bd" />)}
              {TERRITORY_IDS.map((t) => <path key={t} d={TERRITORY_PATHS[t]} fill={factionOf(v.factions, v.owner[t]).color} opacity=".85" />)}
              <rect width={MAP_W} height={MAP_H} fill="url(#wf-ht)" opacity=".22" />
              {LAND_PATHS.map((d, i) => <path key={i} d={d} fill="none" stroke="#1a1714" strokeWidth="1.2" />)}
            </svg>
            <figcaption>The world at the end of round {v.round}. {r.winner === me ? 'Your command prevailed.' : ''}</figcaption>
          </figure>
          <div className="wf-medal-col">
            <svg viewBox="-40 -60 80 120" className="wf-medal" aria-hidden>
              <path d="M-16,-58 L16,-58 L8,-8 L-8,-8Z" fill={wf.color} stroke="#2a1d0c" />
              <path d="M-8,-58 L-2,-58 L-4,-10 M2,-58 L8,-58" stroke="#fff" strokeWidth="2" opacity=".6" />
              <circle cy="22" r="30" fill="url(#wf-brass)" stroke="#4d3510" strokeWidth="2" />
              <circle cy="22" r="23" fill="none" stroke="#fff3c9" strokeOpacity=".7" strokeDasharray="2 2.5" />
              <path d={wf.emblem} transform="translate(0,22) scale(2.1)" fill="#5d4214" />
            </svg>
            <p className="wf-byline">By our correspondent at the front</p>
            <p>{r.reason === 'mission' ? `${nameOf(names, r.winner)} opened sealed orders and carried them out to the letter.` : r.reason === 'resign' ? 'The other commanders left the field.' : `After ${v.round} rounds, the last rival flag came down.`} {wf.name} parade in the capitals tonight.</p>
          </div>
        </div>
        <table className="wf-stats">
          <thead><tr><th>General</th><th>Territories</th><th>Battles</th><th>Dice average</th><th>Taken</th><th>Destroyed</th><th>Sets</th></tr></thead>
          <tbody>
            {players.map((p) => {
              const s = v.stats[p];
              return (
                <tr key={p}>
                  <td><i style={{ background: factionOf(v.factions, p).color }} />{nameOf(names, p)}{p === r.winner ? ' ★' : ''}</td>
                  <td>{territoriesOf(v, p).length}</td><td>{s.rolls}</td><td>{s.dice ? (s.diceSum / s.dice).toFixed(2) : '–'}</td>
                  <td>{s.conquered}</td><td>{s.kills}</td><td>{s.trades}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <ShareChart v={v} names={names} />
        <div className="wf-row wf-paper-actions">
          <button type="button" className="wf-btn" onClick={onBoard}>View the board</button>
          {again && <button type="button" className="wf-key" onClick={again.onClick} data-testid="wf-again">{again.label}</button>}
          <button type="button" className="wf-btn" onClick={onExit}>Menu</button>
        </div>
      </article>
    </div>
  );
}

function ShareChart({ v, names }: { v: WarClientView; names: Record<string, string> }) {
  const h = v.history;
  if (h.length < 2) return null;
  const W = 560, H = 120, n = h.length - 1;
  const x = (i: number) => 30 + (i / n) * (W - 40), y = (c: number) => H - 14 - (c / 42) * (H - 24);
  return (
    <figure className="wf-chart">
      <svg viewBox={`0 0 ${W} ${H}`}>
        {[0, 14, 28, 42].map((c) => <g key={c}><line x1="30" x2={W - 10} y1={y(c)} y2={y(c)} stroke="#1a1714" strokeOpacity=".15" /><text x="24" y={y(c) + 3} textAnchor="end">{c}</text></g>)}
        {v.players.map((p) => (
          <polyline key={p} fill="none" stroke={factionOf(v.factions, p).color} strokeWidth="2.2" strokeLinejoin="round"
            points={h.map((r, i) => `${x(i).toFixed(1)},${y(r[p] ?? 0).toFixed(1)}`).join(' ')} filter="url(#wf-pencil)" />
        ))}
      </svg>
      <figcaption>Territories held, round by round: {v.players.map((p) => nameOf(names, p)).join(', ')}</figcaption>
    </figure>
  );
}
