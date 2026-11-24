import { useEffect, useState } from 'react';
import { WEAPONS, other, type BotLevel, type FleetView, type PlayerID, type WeaponId } from '@boboland/shared/src/fleet';
import type { FleetControls } from './controls';
import type { FleetKind } from './FleetScreen';
import { Grid, type GridShip } from './Grid';
import { Marker } from './Battle';
import { accuracy } from './battleLogic';
import { applyGains, loadProgress, matchGains, rankFor, saveProgress, type Gains } from './progress';
import { WeaponIcon } from './weaponArt';
import { fleetSound } from './sound';
import { btn, btnPrimary } from './ui';

const CREDITED = 'fleet.credited';

/** Credit a finished match once per device (a reload or reconnect must not pay twice). */
function creditOnce(key: string, gains: Gains) {
  let done: string[] = [];
  try { done = JSON.parse(localStorage.getItem(CREDITED) ?? '[]'); } catch { done = []; }
  if (!Array.isArray(done)) done = [];
  if (done.includes(key)) return null;
  const before = loadProgress();
  const out = applyGains(before, gains);
  saveProgress(out.next);
  try { localStorage.setItem(CREDITED, JSON.stringify([...done, key].slice(-30))); } catch { /* blocked storage */ }
  return { ...out, before };
}

const shipsOf = (v: FleetView, p: PlayerID): GridShip[] => {
  const out: GridShip[] = v.sides[p].fleet.filter((s) => s.squares).map((s) => ({
    cls: s.cls, at: s.squares![0], dir: s.squares!.length > 1 && s.squares![1] - s.squares![0] === 10 ? 'v' : 'h', className: s.sunk ? 'sunk' : '',
  }));
  const d = v.sides[p].decoy;
  if (d !== null && d !== undefined) out.push({ cls: 'decoy', at: d, dir: 'h' });
  return out;
};

export function RoundResult({ view, me, spectator, kind, botLevel, nameOf, controls, rematch, onExit, matchKey }: {
  view: FleetView; me: PlayerID; spectator?: boolean; kind: FleetKind; botLevel?: BotLevel; nameOf: (p: PlayerID) => string;
  controls: FleetControls; rematch?: { waiting?: boolean; onClick: () => void }; onExit: () => void; matchKey?: string;
}) {
  const over = !!view.result;
  const winner = view.result?.winner ?? view.rounds[view.rounds.length - 1]?.winner;
  const them = other(me);
  const local = kind === 'local' || spectator;
  const headline = local ? `${nameOf(winner)} wins${over ? '' : ' the round'}` : winner === me ? (over ? 'Victory' : 'Round won') : over ? 'Defeat' : 'Round lost';
  const reason = view.result?.reason === 'resign' ? `${nameOf(other(view.result.winner))} resigned.` : over ? 'Every enemy ship is sunk.' : `Round ${view.round} of a best of ${view.bestOf}.`;

  useEffect(() => {
    if (!over) return;
    if (local || winner === me) fleetSound.win(); else fleetSound.lose();
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const [earned, setEarned] = useState<ReturnType<typeof creditOnce> | 'none'>(null);
  useEffect(() => {
    if (!over || spectator || !matchKey) return;
    const gains = matchGains(view, me, kind, botLevel);
    setEarned(gains ? creditOnce(`${kind}:${matchKey}:${me}`, gains) ?? 'none' : 'none');
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps

  const seats: PlayerID[] = spectator ? ['0', '1'] : [me, them];
  const stat = (p: PlayerID) => view.sides[p].stats ?? { shots: 0, hits: 0, turns: 0, lost: 0, sunk: 0, salvoAll5: false };
  return (
    <section className="fleet-result" data-testid="fleet-result" data-outcome={winner === me ? 'win' : 'loss'}>
      <header className={`fleet-result-head ${local ? 'win' : winner === me ? 'win' : 'loss'} ${over ? 'stinger' : ''}`} data-testid="fleet-stinger">
        {over && <span className="fleet-stinger-fx" aria-hidden>{Array.from({ length: 8 }, (_, i) => <span key={i} style={{ '--i': i } as React.CSSProperties} />)}</span>}
        <h2 className="fleet-result-title" data-testid="fleet-result-title">{headline}</h2>
        <p className="fleet-help">{reason}</p>
        {view.bestOf > 1 && <p className="fleet-mono fleet-result-score">{nameOf(seats[0])} {view.wins[seats[0]]} – {view.wins[seats[1]]} {nameOf(seats[1])}</p>}
      </header>
      <div className="fleet-result-boards">
        {seats.map((p) => (
          <div key={p} className="fleet-result-board">
            <h3 className="fleet-grid-title">{spectator ? `${nameOf(p)}'s fleet` : p === me ? 'Your fleet' : `${nameOf(p)}'s fleet`}</h3>
            <Grid name={`${nameOf(p)}'s fleet, revealed`} testid={`fleet-reveal-${p === me && !spectator ? 'me' : 'them'}`} ships={shipsOf(view, p)}
              cellContent={(s) => <Marker c={view.sides[other(p)].shots[s]} />} className={p === me && !spectator ? 'home' : 'home enemy'} />
          </div>
        ))}
      </div>
      <table className="fleet-stats">
        <thead><tr><th scope="col"><span className="sr-only">Stat</span></th>{seats.map((p) => <th key={p} scope="col">{spectator || p !== me ? nameOf(p) : 'You'}</th>)}</tr></thead>
        <tbody>
          <tr><th scope="row">Accuracy</th>{seats.map((p) => <td key={p} className="fleet-mono">{accuracy(stat(p).hits, stat(p).shots)}%</td>)}</tr>
          <tr><th scope="row">Shots</th>{seats.map((p) => <td key={p} className="fleet-mono">{stat(p).shots}</td>)}</tr>
          <tr><th scope="row">Turns</th>{seats.map((p) => <td key={p} className="fleet-mono">{stat(p).turns}</td>)}</tr>
          <tr><th scope="row">Ships lost</th>{seats.map((p) => <td key={p} className="fleet-mono">{stat(p).lost}</td>)}</tr>
        </tbody>
      </table>
      {earned && earned !== 'none' && <Earned earned={earned} />}
      <div className="flex flex-wrap gap-2">
        {!over && !spectator && (view.sides[me].ready
          ? <p className="fleet-help" data-testid="fleet-next-waiting">Waiting for {nameOf(them)}…</p>
          : <button type="button" className={btnPrimary} onClick={() => controls.nextRound()} data-testid="fleet-next-round">Next round</button>)}
        {over && rematch && !spectator && (
          <button type="button" className={btnPrimary} disabled={rematch.waiting} onClick={rematch.onClick} data-testid="fleet-rematch">
            {rematch.waiting ? `Waiting for ${nameOf(them)}…` : 'Rematch'}
          </button>
        )}
        {over && <button type="button" className={btn} onClick={onExit} data-testid="fleet-menu">Menu</button>}
      </div>
    </section>
  );
}

function Earned({ earned }: { earned: NonNullable<ReturnType<typeof creditOnce>> }) {
  const rank = rankFor(earned.next.xp);
  const gained = earned.next.xp - earned.before.xp;
  const span = rank.next ? rank.next.xp - rank.xp : 1;
  const into = rank.next ? earned.next.xp - rank.xp : 1;
  return (
    <section className="fleet-earned" data-testid="fleet-earned">
      <div className="fleet-earned-rank">
        <span className="fleet-rank-name">{rank.name}</span>
        <span className="fleet-mono">+{gained} XP</span>
      </div>
      <div className="fleet-xpbar" role="progressbar" aria-valuemin={0} aria-valuemax={span} aria-valuenow={into} aria-label={rank.next ? `XP to ${rank.next.name}` : 'Top rank'}>
        <span style={{ width: `${Math.min(100, (into / span) * 100)}%` }} />
      </div>
      <p className="fleet-help">{rank.next ? `${rank.next.xp - earned.next.xp} XP to ${rank.next.name}` : 'Top rank reached.'}{earned.rankUp ? ` Promoted to ${earned.rankUp}!` : ''}</p>
      {earned.unlocked.length > 0 && (
        <div className="grid gap-2" data-testid="fleet-unlocked">
          <span className="fleet-sub">New weapons unlocked</span>
          <ul className="flex flex-wrap gap-2">
            {earned.unlocked.map((w: WeaponId) => <li key={w} className="fleet-unlock"><WeaponIcon id={w} size={26} />{WEAPONS[w].name}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Pass and play: the screen goes dark between turns until the next player asks to see theirs. */
export function Curtain({ name, onGo, note }: { name: string; onGo: () => void; note?: string }) {
  return (
    <section className="fleet-curtain" data-testid="fleet-curtain" role="dialog" aria-label={`${name}'s turn`}>
      <div className="fleet-curtain-box">
        <h2 className="fleet-curtain-title">{name}</h2>
        <p className="fleet-help">{note ?? 'Pass the device. Everyone else, look away.'}</p>
        <button type="button" className={btnPrimary} onClick={onGo} data-testid="fleet-curtain-go" autoFocus>Show my screen</button>
      </div>
    </section>
  );
}
