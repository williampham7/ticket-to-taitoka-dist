import type { EgwView, PlayerID } from '@boboland/shared/src/egyptian';
import { CardView } from './CardView';
import type { Names } from './screenLogic';

export interface Again { label: string; onClick?: () => void; waiting?: string }

/** Game over: the winner's stack grows to 52, then the stats. */
export function Result({ view, names, colors, me, again, onExit }: {
  view: EgwView; names: Names; colors: Record<PlayerID, string>; me: PlayerID | null; again?: Again; onExit: () => void;
}) {
  const w = view.result!.winner;
  const rows: [string, (p: PlayerID) => number][] = [
    ['Slaps won', (p) => view.stats[p]?.slapsWon ?? 0],
    ['False slaps', (p) => view.stats[p]?.falseSlaps ?? 0],
    ['Challenges won', (p) => view.stats[p]?.challengesWon ?? 0],
    ['Longest stack', (p) => view.stats[p]?.longest ?? 0],
  ];
  return (
    <div className="egw-modal egw-result-wrap" data-testid="egw-result">
      <div className="egw-panel egw-result" role="dialog" aria-label="Game over">
        <div className="egw-victory" aria-hidden>
          <div className="egw-rays" />
          <div className="egw-tower">
            {Array.from({ length: 13 }, (_, i) => <div key={i} className="egw-tower-card" style={{ animationDelay: `${i * 70}ms`, bottom: `${i * 5}px` }}><CardView back /></div>)}
          </div>
        </div>
        <p className="egw-eyebrow">All 52 cards</p>
        <h2 className="egw-display egw-result-title" style={{ color: colors[w] }}>{w === me ? 'You win the war!' : `${names[w]} wins the war!`}</h2>
        <table className="egw-stats">
          <thead><tr><th />{view.players.map((p) => <th key={p} style={{ color: colors[p] }}>{names[p]}</th>)}</tr></thead>
          <tbody>{rows.map(([label, f]) => <tr key={label}><th>{label}</th>{view.players.map((p) => <td key={p}>{f(p)}</td>)}</tr>)}</tbody>
        </table>
        <div className="egw-result-actions">
          {again && (again.waiting
            ? <p className="egw-sub" role="status">{again.waiting}</p>
            : <button type="button" className="egw-btn egw-btn-gold" data-testid="egw-again" onClick={again.onClick}>{again.label}</button>)}
          <button type="button" className="egw-btn" onClick={onExit} data-testid="egw-menu">Menu</button>
        </div>
      </div>
    </div>
  );
}
