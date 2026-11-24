import { useEffect, useMemo, useRef, useState } from 'react';
import {
  SHIPS, WEAPONS, isOpen, label, other, viewActionError, viewSalvoSize, viewWeaponReady,
  type Dir, type FleetView, type PlayerID, type SeenCell, type ShipClass, type ViewReport,
} from '@boboland/shared/src/fleet';
import type { FleetControls } from './controls';
import { Grid, type GridShip } from './Grid';
import { accuracy, actionFor, aimSquares, displayGrid, toggleMark, type Arm } from './battleLogic';
import { effectiveFx, useFx } from './fx';
import { useReveal } from './useReveal';
import { fleetSound } from './sound';
import { Cinematic } from './cine/Cinematic';
import { ChargeMeter, WeaponIcon } from './weaponArt';
import { SIDE, SIDE_W } from './cine/sideArt';

const CELL_WORD: Record<string, string> = { miss: 'miss', hit: 'hit', deflect: 'deflected', sunk: 'sunk' };

/** The mark on a resolved square: each result has its own shape and colour. */
export function Marker({ c }: { c: SeenCell }) {
  if (c === null) return null;
  const common = { className: `fleet-mark m-${c}`, viewBox: '0 0 40 40', 'aria-hidden': true } as const;
  switch (c) {
    case 'miss': return <svg {...common}><circle cx="20" cy="20" r="7.5" fill="none" strokeWidth="3" /></svg>;
    case 'hit': return <svg {...common}><circle cx="20" cy="20" r="13" className="glow" /><path d="M11 11 L29 29 M29 11 L11 29" strokeWidth="5" strokeLinecap="round" /></svg>;
    case 'deflect': return <svg {...common}><path d="M20 6 L32 13 V27 L20 34 L8 27 V13 Z" fill="none" strokeWidth="3" strokeLinejoin="round" /></svg>;
    case 'sunk': return <svg {...common}><path d="M12 12 L28 28 M28 12 L12 28" strokeWidth="4" strokeLinecap="round" /></svg>;
  }
}

/** Fire and scorch on a damaged square of your own ship. */
const Fire = () => (
  <svg className="fleet-fire" viewBox="0 0 40 40" aria-hidden>
    <circle cx="20" cy="22" r="13" className="scorch" />
    <path className="flame" d="M20 8 C24 15 29 18 27 25 C26 30 22 32 20 32 C16 32 13 29 13 25 C13 21 16 20 17 15 C18 19 20 20 21 19 C22 16 20 12 20 8 Z" />
  </svg>
);

interface Props {
  view: FleetView;
  me: PlayerID;
  spectator?: boolean;
  controls: FleetControls;
  nameOf: (p: PlayerID) => string;
  /** last report this screen has already shown (pass and play hands over between seats) */
  revealFrom?: number;
  /** results are landing (busy) or all shown */
  onBusy?: (busy: boolean, seq: number) => void;
  curtainUp?: boolean;
}

export function Battle({ view, me, spectator, controls, nameOf, revealFrom, onBusy, curtainUp }: Props) {
  const fx = effectiveFx(useFx());
  const enemy = other(me);
  const [from] = useState(() => revealFrom ?? view.seq);
  const reveal = useReveal(view.log, from, fx);
  useEffect(() => { onBusy?.(reveal.busy, view.seq); }, [reveal.busy, view.seq, view.stage]); // eslint-disable-line react-hooks/exhaustive-deps

  // sounds follow the reveal: guns or the weapon as a report starts, then each square as it lands, then a sinking
  useEffect(() => {
    const r = reveal.current;
    if (!r) return;
    const theirs = !spectator && r.by !== me;
    if (fx === 'off') {
      if (reveal.step !== 0) return;
      const rs = r.cells.map((c) => c.r);
      if (r.sunk.length) fleetSound.sink();
      else if (rs.includes('hit')) { fleetSound.hit(); if (theirs) fleetSound.alarm(); }
      else if (rs.includes('deflect')) fleetSound.deflect();
      else if (r.weapon) fleetSound.weapon(r.weapon);
      else if (rs.length) fleetSound.splash();
      return;
    }
    if (reveal.step === 0) {
      if (r.weapon) fleetSound.weapon(r.weapon);
      else if (r.kind !== 'mine') { fleetSound.fire(); fleetSound.whistle(); }
      return;
    }
    const c = r.cells[reveal.step - 1];
    if (c) {
      if (c.r === 'hit' || c.r === 'sunk') { fleetSound.hit(); if (theirs && reveal.step === 1) fleetSound.alarm(); }
      else if (c.r === 'deflect') fleetSound.deflect();
      else fleetSound.splash();
    }
    if (reveal.step === r.cells.length && r.sunk.length) fleetSound.sink();
  }, [reveal.current?.seq, reveal.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // a tap skips what is playing, but only a tap that began while results were landing (not the shot that started them)
  const pressedWhileBusy = useRef(false);
  useEffect(() => {
    if (!reveal.busy) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') reveal.skip(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [reveal.busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const myTurn = !spectator && view.stage === 'battle' && view.turn === me && !reveal.busy && !curtainUp;
  const salvo = view.mode === 'salvo';
  const [arm, setArm] = useState<Arm>('shell');
  const [dir, setDir] = useState<Dir>('h');
  const [aim, setAim] = useState<number | null>(null);
  const [marks, setMarks] = useState<number[]>([]);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => { setAim(null); setMarks([]); setNote(null); if (!myTurn) setArm('shell'); }, [myTurn, view.seq]);

  const salvoN = viewSalvoSize(view, me);
  const ready = (w: Arm) => w === 'shell' || viewWeaponReady(view, me, w);
  useEffect(() => {
    if (!myTurn) return;
    const key = (e: KeyboardEvent) => { if ((e.key === 'r' || e.key === 'R') && arm === 'airStrike') setDir((d) => (d === 'h' ? 'v' : 'h')); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [myTurn, arm]);

  // which reports touch which grid: my shots land on the enemy grid, theirs on mine
  const pendingOn = (attacker: PlayerID) => reveal.pending.filter((r) => r.by === attacker);
  const sunkSquares = (owner: PlayerID) => (cls: ShipClass) => view.sides[owner].fleet.filter((s) => s.cls === cls && s.squares).flatMap((s) => s.squares!);
  const stepFor = (list: ViewReport[]) => (list[0] && list[0] === reveal.current ? reveal.step : 0);
  const gridFor = (attacker: PlayerID): SeenCell[] => {
    const list = pendingOn(attacker);
    return displayGrid(view.sides[attacker].shots, list, stepFor(list), sunkSquares(other(attacker)));
  };
  const target = gridFor(me); // my results on the enemy grid
  const incoming = gridFor(enemy); // their results on my grid
  const shownSunk = (owner: PlayerID, attacker: PlayerID) => {
    const cells = attacker === me ? target : incoming;
    return view.sides[owner].fleet.filter((s) => s.sunk && s.squares && s.squares.every((q) => cells[q] === 'sunk'));
  };

  const aimed = useMemo(() => {
    if (!myTurn) return new Set<number>();
    if (salvo) return new Set(aim !== null ? [aim] : []);
    return new Set(aim !== null ? aimSquares(arm, aim, dir, view.sides[me].shots) : []);
  }, [myTurn, salvo, aim, arm, dir, view.sides, me]);

  const fire = (s: number) => {
    const a = actionFor(arm, s, dir);
    const err = viewActionError(view, me, a);
    if (err) { setNote(err === 'nothing left to hit there' ? 'Nothing left to hit there.' : err === 'not an open square' ? 'You have already shot there.' : 'You cannot fire that now.'); return; }
    controls.act(a);
    setArm('shell');
  };
  const onTarget = (s: number) => {
    if (!myTurn) return;
    setNote(null);
    if (salvo) { setMarks((m) => toggleMark(m, s, salvoN, view.sides[me].shots)); return; }
    if (aim === s) fire(s);
    else setAim(s);
  };

  const enemyShips: GridShip[] = (spectator ? [] : view.sides[enemy].fleet)
    .filter((s) => s.sunk && s.squares)
    .filter((s) => shownSunk(enemy, me).includes(s))
    .map((s) => ({ cls: s.cls, at: s.squares![0], dir: s.squares!.length > 1 && s.squares![1] - s.squares![0] === 10 ? 'v' : 'h', className: 'sunk' }));
  const ownShips: GridShip[] = spectator ? [] : view.sides[me].fleet.filter((s) => s.squares).map((s) => ({
    cls: s.cls, at: s.squares![0], dir: s.squares!.length > 1 && s.squares![1] - s.squares![0] === 10 ? 'v' : 'h',
    className: s.sunk && shownSunk(me, enemy).includes(s) ? 'sunk' : '',
  }));
  const decoy = view.sides[me].decoy;
  if (!spectator && decoy !== null && decoy !== undefined) ownShips.push({ cls: 'decoy', at: decoy, dir: 'h' });
  const ownShipSquares = new Set(spectator ? [] : view.sides[me].fleet.flatMap((s) => s.squares ?? []));

  const banner = bannerText({ view, me, spectator, reveal: reveal.current, nameOf, myTurn, salvo, salvoN, arm });

  const myHits = target.filter((c) => c === 'hit' || c === 'sunk').length;
  const shotsFired = target.filter((c) => c !== null).length;
  const hint = !myTurn ? null : salvo ? `Mark ${salvoN}, then fire` : arm === 'shell' ? 'Tap to aim, tap again to fire' : `Aim the ${WEAPONS[arm].name}`;

  const targetGrid = (
    <section className="fleet-plate hostile fleet-sea enemy-sea" aria-label={spectator ? `${nameOf('1')}'s waters` : 'Enemy waters'}>
      <div className="fleet-board-head">
        <span className="fleet-station">{spectator ? `${nameOf('1')}'s waters` : 'Enemy waters'}</span>
        <span className={`fleet-board-note ${note ? 'warn' : ''}`} role={note ? 'alert' : undefined} data-testid="fleet-note">{note ?? hint ?? `${shotsFired} squares searched`}</span>
      </div>
      <Grid name={spectator ? `${nameOf('1')}'s waters` : 'Enemy waters: your target'} testid="fleet-target" interactive={myTurn} ships={enemyShips}
        className={`enemy ${myTurn ? 'live' : ''}`}
        onCell={onTarget}
        onCellHover={(s, how) => { if (myTurn && !salvo && (how === 'mouse' || how === 'focus' || s === null)) setAim(s); else if (myTurn && salvo && how === 'mouse') setAim(s); }}
        cellClass={(s) => {
          const c = target[s];
          const classes = [c ? `has-${c}` : ''];
          if (aimed.has(s)) classes.push(isOpen(target[s]) ? 'aim' : 'aim-dim');
          if (marks.includes(s)) classes.push('marked');
          if (reveal.current?.by === me && reveal.current.cells[reveal.step - 1]?.sq === s) classes.push('just');
          return classes.join(' ');
        }}
        cellContent={(s) => <Marker c={target[s]} />}
        cellLabel={(s) => (target[s] ? CELL_WORD[target[s]!] : marks.includes(s) ? 'marked' : '')}
        disabledCell={(s) => !myTurn || (salvo ? !isOpen(target[s]) && !marks.includes(s) : false)} />
    </section>
  );
  const ownGrid = (
    <section className="fleet-plate fleet-sea own-sea" aria-label={spectator ? `${nameOf('0')}'s waters` : 'Your fleet'}>
      <div className="fleet-board-head">
        <span className="fleet-station">{spectator ? `${nameOf('0')}'s waters` : 'Your fleet'}</span>
        <span className="fleet-board-note">{incoming.filter((c) => c === 'hit' || c === 'sunk').length} hits taken</span>
      </div>
      <Grid name={spectator ? `${nameOf('0')}'s waters` : 'Your fleet'} testid="fleet-home" ships={ownShips} className="home"
        cellClass={(s) => {
          const c = incoming[s];
          const just = reveal.current?.by === enemy && reveal.current.cells[reveal.step - 1]?.sq === s ? 'just' : '';
          return `${c ? `has-${c}` : ''} ${just}`;
        }}
        cellContent={(s) => {
          const c = incoming[s];
          if ((c === 'hit' || c === 'sunk') && ownShipSquares.has(s)) return <Fire />;
          return <Marker c={c} />;
        }}
        cellLabel={(s) => (incoming[s] ? CELL_WORD[incoming[s]!] : '')} />
    </section>
  );
  const live = view.stage === 'battle';

  return (
    <section className={`fleet-battle ${view.mode}`} data-testid="fleet-battle"
      onPointerDownCapture={() => { pressedWhileBusy.current = reveal.busy; }}
      onClick={() => { if (pressedWhileBusy.current && reveal.busy) reveal.skip(); pressedWhileBusy.current = false; }}>
      <div className="fleet-hub">
      <section className="fleet-hub-status" aria-label="Combat information centre">
        <div className="fleet-hub-strip">
          <span className="fleet-station">Combat information</span>
          <span className={`fleet-live ${live ? 'on' : ''}`}>{live ? 'Live' : 'Round over'}</span>
        </div>
        <div className={`fleet-banner ${banner.tone}`} role="status" aria-live="polite" data-testid="fleet-banner">
          <span className="fleet-banner-lamp" aria-hidden />
          <span className="fleet-banner-main">{banner.main}</span>
          <span className="fleet-banner-sub">{banner.sub ?? '\u00a0'}</span>
        </div>
      </section>
      <Intel view={view} me={me} spectator={spectator} nameOf={nameOf} target={target} incoming={incoming}
        shownAsSunk={(owner, i) => shownSunk(owner, owner === me ? enemy : me).includes(view.sides[owner].fleet[i])}
        log={view.log.filter((r) => r.round === view.round && !reveal.pending.includes(r))}
        myHits={myHits} shotsFired={shotsFired} />
      </div>
      <div className="fleet-hud-slot">
        {!spectator && (
          <Hud view={view} me={me} myTurn={myTurn} arm={arm} setArm={(a) => { setArm(a); setAim(null); }} dir={dir} setDir={setDir}
            ready={ready} salvo={salvo} salvoN={salvoN} marks={marks}
            onSalvo={() => { controls.act({ type: 'salvo', sqs: marks }); setMarks([]); }} />
        )}
      </div>
      <Cinematic report={reveal.current} step={reveal.step} viewer={spectator ? null : me} ownFleet={spectator ? null : view.sides[me].fleet} fx={fx} />
      <div className="fleet-enemy-slot">{targetGrid}</div>
      <div className="fleet-own-slot">{ownGrid}</div>
    </section>
  );
}

function bannerText({ view, me, spectator, reveal, nameOf, myTurn, salvo, salvoN, arm }: {
  view: FleetView; me: PlayerID; spectator?: boolean; reveal: ViewReport | null; nameOf: (p: PlayerID) => string;
  myTurn: boolean; salvo: boolean; salvoN: number; arm: Arm;
}): { main: string; sub?: string; tone: string } {
  if (reveal) {
    const mine = !spectator && reveal.by === me;
    const who = nameOf(reveal.by);
    const weapon = reveal.weapon ? WEAPONS[reveal.weapon].name : null;
    if (reveal.kind === 'mine') return { main: mine ? 'Your sea mine goes off' : 'A sea mine goes off', tone: 'alert' };
    if (reveal.weapon === 'seaMine' && reveal.cells.length === 0) return { main: mine ? 'Sea mine dropped' : `${who} dropped a sea mine`, sub: 'It drifts each turn.', tone: 'warn' };
    const sunk = reveal.sunk.map((c) => SHIPS[c].name);
    const names = sunk.join(' and the ');
    const sub = !sunk.length ? undefined : mine ? `You sank their ${names}!` : spectator ? `${who} sank the ${names}` : `They sank your ${names}`;
    const main = spectator ? `${who} fires${weapon ? ` ${weapon}` : ''}` : mine ? (weapon ? `${weapon} away` : salvo ? 'Salvo away' : 'Shot away') : `Incoming${weapon ? `: ${weapon}` : ''}`;
    return { main, sub, tone: mine ? 'info' : 'alert' };
  }
  if (view.stage !== 'battle') return { main: 'Ceasefire', tone: 'info' };
  if (spectator) return { main: `${nameOf(view.turn)} to fire`, tone: 'info' };
  if (!myTurn) return { main: `${nameOf(other(me))} is aiming…`, sub: 'Stand by.', tone: 'wait' };
  if (salvo) return { main: 'Your turn', sub: `Mark ${salvoN} squares, then fire the salvo.`, tone: 'go' };
  return { main: 'Your turn', sub: arm === 'shell' ? 'Tap a square to aim, tap again to fire.' : `Aim the ${WEAPONS[arm].name}, then tap again to fire.`, tone: 'go' };
}

const SHELL_ICON = (
  <svg viewBox="0 0 44 44" width="34" height="34" aria-hidden>
    <path d="M22 6 C27 11 27 16 27 20 V36 H17 V20 C17 16 17 11 22 6 Z" fill="#dce7ef" />
    <rect x="17" y="30" width="10" height="6" fill="#b58b3c" />
    <path d="M14 38 H30" stroke="#5fd4ff" strokeWidth="2" />
  </svg>
);

function Hud({ view, me, myTurn, arm, setArm, dir, setDir, ready, salvo, salvoN, marks, onSalvo }: {
  view: FleetView; me: PlayerID; myTurn: boolean; arm: Arm; setArm: (a: Arm) => void; dir: Dir; setDir: (d: Dir) => void;
  ready: (a: Arm) => boolean; salvo: boolean; salvoN: number; marks: number[]; onSalvo: () => void;
}) {
  const side = view.sides[me];
  const loadout = side.loadout ?? [];
  if (salvo) {
    return (
      <div className="fleet-hud fleet-salvo">
        <span className="fleet-station">Salvo</span>
        <span className="fleet-salvo-pips" aria-hidden>{Array.from({ length: salvoN }, (_, i) => <span key={i} className={i < marks.length ? 'on' : ''} />)}</span>
        <span className="fleet-mono fleet-salvo-count" data-testid="fleet-salvo-count">{marks.length}/{salvoN} marked</span>
        <button type="button" className="fleet-btn primary fleet-salvo-fire" disabled={!myTurn || marks.length !== salvoN} onClick={onSalvo} data-testid="fleet-fire-salvo">Fire salvo</button>
      </div>
    );
  }
  if (view.mode !== 'super') return null;
  return (
    <div className="fleet-hud">
      <div className="fleet-arms" role="radiogroup" aria-label="Weapon">
        <button type="button" role="radio" aria-checked={arm === 'shell'} className={`fleet-arm ${arm === 'shell' ? 'on' : ''} charged`} disabled={!myTurn} onClick={() => setArm('shell')} data-testid="fleet-arm-shell">
          <span className="fleet-arm-icon">{SHELL_ICON}</span>
          <span className="fleet-arm-name">Shell</span>
          <span className="fleet-arm-state ok">Always ready</span>
        </button>
        {loadout.map((w) => {
          const def = WEAPONS[w];
          if (def.passive) {
            return (
              <div key={w} className="fleet-arm passive" data-testid={`fleet-arm-${w}`}>
                <span className="fleet-arm-icon"><WeaponIcon id={w} size={34} /></span>
                <span className="fleet-arm-name">{def.name}</span>
                <span className="fleet-arm-state">{passiveState(w, view, me)}</span>
              </div>
            );
          }
          const ok = ready(w);
          const spent = def.oncePerRound && side.spent?.includes(w);
          return (
            <button key={w} type="button" role="radio" aria-checked={arm === w} className={`fleet-arm ${arm === w ? 'on' : ''} ${ok ? 'charged' : ''}`}
              disabled={!myTurn || !ok} onClick={() => setArm(w)} data-testid={`fleet-arm-${w}`}>
              <span className="fleet-arm-icon"><WeaponIcon id={w} size={34} /></span>
              <span className="fleet-arm-name">{def.name}</span>
              {spent ? <span className="fleet-arm-state">Used this round</span>
                : w === 'seaMine' && side.mineLive ? <span className="fleet-arm-state">Drifting</span>
                  : ok ? <span className="fleet-arm-state ok">Ready</span>
                    : <ChargeMeter value={side.charge?.[w] ?? 0} of={def.charge} label={`${def.name} charge`} />}
            </button>
          );
        })}
      </div>
      <div className="fleet-hud-side">
        {arm === 'airStrike' && (
          <button type="button" className="fleet-btn fleet-turn-btn" onClick={() => setDir(dir === 'h' ? 'v' : 'h')} data-testid="fleet-turn" data-dir={dir}
            aria-label={`Air Strike runs ${dir === 'h' ? 'across' : 'down'}. Turn it`}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M20 12 a8 8 0 1 1 -2.6 -5.9" /><path d="M18.5 2.5 V7 H14" /></svg>
            {dir === 'h' ? 'Across' : 'Down'}
          </button>
        )}
      </div>
    </div>
  );
}

function passiveState(w: string, view: FleetView, me: PlayerID): string {
  const side = view.sides[me];
  if (w === 'shield') {
    const up = side.fleet.filter((s) => s.shield && !s.sunk).length;
    return `${up} ship${up === 1 ? '' : 's'} shielded`;
  }
  if (w === 'decoy') return side.decoyHit ? 'Found' : 'Unseen';
  if (w === 'reinforcement') return side.fleet.find((s) => s.cls === 'cutter')?.sunk ? 'Cutter lost' : 'Cutter afloat';
  return 'Passive';
}

/** A ship side-on, for the threat board. */
function Silhouette({ cls }: { cls: ShipClass }) {
  return (
    <svg className="fleet-sil" viewBox={`-14 -100 ${SIDE_W[cls] + 28} 118`} preserveAspectRatio="xMinYMax meet" aria-hidden>
      {SIDE[cls]}
    </svg>
  );
}

/** One line of the contact log: who, what, where, and what it found. */
function logLine(r: ViewReport, me: PlayerID, spectator: boolean | undefined, nameOf: (p: PlayerID) => string) {
  const who = !spectator && r.by === me ? 'You' : nameOf(r.by);
  const what = r.kind === 'mine' ? 'Sea mine' : r.kind === 'salvo' ? `Salvo x${r.cells.length}` : r.weapon ? WEAPONS[r.weapon].name : 'Shell';
  const hits = r.cells.filter((c) => c.r === 'hit' || c.r === 'sunk').length;
  const deflects = r.cells.filter((c) => c.r === 'deflect').length;
  const where = r.cells.length === 1 ? label(r.cells[0].sq) : r.cells.length ? `${r.cells.length} sq` : r.anchor !== undefined ? label(r.anchor) : '';
  const result = r.sunk.length ? `Sunk ${r.sunk.map((c) => SHIPS[c].name).join(', ')}` : hits ? (hits > 1 ? `${hits} hits` : 'Hit') : deflects ? 'Deflected' : r.cells.length ? 'Miss' : 'Laid';
  const tone = r.sunk.length ? 'sunk' : hits ? 'hit' : deflects ? 'deflect' : 'miss';
  return { who, what, where, result, tone, mine: !spectator && r.by === me };
}

function Intel({ view, me, spectator, nameOf, target, incoming, shownAsSunk, log, myHits, shotsFired }: {
  view: FleetView; me: PlayerID; spectator?: boolean; nameOf: (p: PlayerID) => string; target: SeenCell[]; incoming: SeenCell[];
  /** sunk as far as the results on screen go (a sinking still landing does not count yet) */
  shownAsSunk: (owner: PlayerID, index: number) => boolean;
  /** this round's reports already shown, oldest first */
  log: ViewReport[];
  myHits: number;
  shotsFired: number;
}) {
  const them = other(me);
  const fleetPanel = (p: PlayerID, title: string, friendly: boolean) => {
    const cells = p === me ? incoming : target;
    const fleet = view.sides[p].fleet.map((s, i) => ({
      ...s, sunk: shownAsSunk(p, i),
      hits: s.squares ? s.squares.filter((q) => cells[q] === 'hit' || cells[q] === 'sunk') : undefined,
    }));
    const afloat = fleet.filter((s) => !s.sunk).length;
    return (
      <section className={`fleet-force ${friendly ? 'friend' : 'hostile'}`} data-testid={`fleet-rail-${p === me ? 'me' : 'them'}`}>
        <div className="fleet-force-head">
          <span className="fleet-force-sym" aria-hidden>
            <svg viewBox="-12 -12 24 24">{friendly ? <circle r="8" fill="none" strokeWidth="2.2" /> : <path d="M0 -9 L9 0 L0 9 L-9 0 Z" fill="none" strokeWidth="2.2" />}</svg>
          </span>
          <span className="fleet-force-name">{title}</span>
          <span className="fleet-force-count fleet-mono" aria-label={`${afloat} of ${fleet.length} afloat`}>{afloat}/{fleet.length}</span>
        </div>
        <div className="fleet-strength" aria-hidden><i style={{ width: `${(afloat / Math.max(1, fleet.length)) * 100}%` }} /></div>
        <ul className="fleet-roster">
          {fleet.map((s, i) => {
            const len = SHIPS[s.cls].length;
            const known = !!s.hits;
            const dmg = s.sunk ? len : s.hits?.length ?? 0;
            return (
              <li key={`${s.cls}-${i}`} className={`${s.sunk ? 'sunk' : ''} ${dmg && !s.sunk ? 'damaged' : ''}`}>
                <Silhouette cls={s.cls} />
                <span className="fleet-roster-name">{SHIPS[s.cls].name}</span>
                {s.sunk ? <span className="fleet-roster-tag sunk">Sunk</span>
                  : known ? (
                    <span className="fleet-pips" aria-label={`${dmg} of ${len} hit${s.shield ? ', shield up' : ''}`}>
                      {s.shield && <span className="shield" title="Shield up" />}
                      {Array.from({ length: len }, (_, k) => <span key={k} className={k < dmg ? 'hit' : ''} />)}
                    </span>
                  ) : <span className="fleet-roster-tag">Hidden</span>}
              </li>
            );
          })}
        </ul>
      </section>
    );
  };
  const acc = accuracy(myHits, shotsFired);
  const lines = log.slice(-6).reverse();
  return (
    <aside className="fleet-hub-intel" aria-label="Fleet status">
      {spectator ? (
        <>
          {fleetPanel('0', nameOf('0'), true)}
          {fleetPanel('1', nameOf('1'), false)}
        </>
      ) : (
        <>
          {fleetPanel(me, 'Your fleet', true)}
          {fleetPanel(them, `${nameOf(them)}'s fleet`, false)}
        </>
      )}
      {!spectator && (
        <section className="fleet-gauges" aria-label="Your gunnery">
          <div className="fleet-ring" role="img" aria-label={`Accuracy ${acc}%`}>
            <svg viewBox="0 0 48 48" aria-hidden>
              <circle cx="24" cy="24" r="20" className="track" />
              <circle cx="24" cy="24" r="20" className="bar" pathLength={100} style={{ strokeDashoffset: 100 - acc }} />
            </svg>
            <span className="fleet-ring-in"><b>{acc}%</b><small>Accuracy</small></span>
          </div>
          <dl className="fleet-reads">
            <div><dt>Searched</dt><dd>{shotsFired}</dd></div>
            <div><dt>Hits</dt><dd>{myHits}</dd></div>
            <div><dt>Turn</dt><dd>{view.sides[me].turns + (view.turn === me && view.stage === 'battle' ? 1 : 0)}</dd></div>
          </dl>
        </section>
      )}
      <section className="fleet-log" aria-label="Contact log">
        <span className="fleet-station">Contact log</span>
        {lines.length === 0 ? <p className="fleet-log-empty">No contacts yet. Fire to open the log.</p> : (
          <ol>
            {lines.map((r) => {
              const l = logLine(r, me, spectator, nameOf);
              return (
                <li key={r.seq} className={`${l.tone} ${l.mine ? 'mine' : 'theirs'}`}>
                  <span className="who">{l.who}</span>
                  <span className="what">{l.what}{l.where ? <span className="where"> {l.where}</span> : null}</span>
                  <span className="res">{l.result}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </aside>
  );
}
