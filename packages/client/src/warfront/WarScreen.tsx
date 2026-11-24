import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ADJ, CONTINENTS, CONT_TERRS, NEUTRAL, TERR, connected, continentsOf, maxDice, mustPlaceNeutral, setsIn, territoriesOf, tradeValue,
  type Action, type Battle, type LogEvent, type WarView,
} from '@boboland/shared/src/warfront';
import { Board, type Marks } from './Board';
import { IntelCard } from './Cards';
import { DiceTray } from './Dice';
import { FACTIONS, factionOf } from './factions';
import { effectiveFx, ms, setFx, useFx, type FxLevel } from './fx';
import { wfSfx } from './sound';
import { logLine, missionText, nameOf } from './text';
import { Manual } from './Manual';
import { Result } from './Result';
import { MusicButton } from '../lib/AudioButtons';

export type WarClientView = WarView & { factions: number[] };
export interface ScreenProps {
  view: WarClientView;
  /** the seat this screen gives orders for (null: watching) */
  me: string | null;
  send: (a: Action) => void;
  resign?: () => void;
  names: Record<string, string>;
  kind: 'bot' | 'local' | 'online' | 'watch';
  onExit: () => void;
  again?: { label: string; onClick: () => void } | null;
}

interface Draft { alloc: Record<string, number>; history: string[] }
const EMPTY: Draft = { alloc: {}, history: [] };

export function WarScreen({ view: v, me, send, resign, names, kind, onExit, again }: ScreenProps) {
  const myTurn = !!me && v.current === me && !v.result;
  const [sel, setSel] = useState<string | null>(null);
  const [tgt, setTgt] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [dice, setDice] = useState(3);
  const [count, setCount] = useState(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showResult, setShowResult] = useState(true);

  // reset local orders whenever the turn or stage moves on
  const phaseKey = `${v.current}|${v.stage}|${v.round}`;
  useEffect(() => { setSel(null); setTgt(null); setDraft(EMPTY); setPicked([]); }, [phaseKey]);

  // ---- effects: new events since last render (dice tray, wash, stamps, banner, sounds) ----
  const seen = useRef(v.logTotal);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [washed, setWashed] = useState<{ t: string; seq: number } | null>(null);
  const [stamp, setStamp] = useState<{ p: string; key: number } | null>(null);
  const [banner, setBanner] = useState<{ p: string; round: number; key: number } | null>(null);
  useEffect(() => {
    const fresh: LogEvent[] = v.log.slice(Math.max(0, v.log.length - (v.logTotal - seen.current)));
    seen.current = v.logTotal;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const e of fresh) {
      if (e.k === 'battle' && v.battle) {
        const b = v.battle;
        setBattle(b);
        wfSfx.dice(b.rolls[b.rolls.length - 1].att.length + 2);
        if (b.conquered) timers.push(setTimeout(() => { setWashed({ t: b.to, seq: b.seq }); wfSfx.pin(); wfSfx.boom(); }, ms('dice') * 0.6));
        timers.push(setTimeout(() => setBattle((x) => (x?.seq === b.seq ? null : x)), ms('dice') + 900));
      }
      if (e.k === 'eliminate') { const key = Date.now(); timers.push(setTimeout(() => { setStamp({ p: e.target, key }); wfSfx.stamp(); }, ms('dice'))); }
      if (e.k === 'turn') { setBanner({ p: e.p, round: e.round, key: Date.now() }); wfSfx.turn(); }
      if (e.k === 'deploy') wfSfx.place();
      if (e.k === 'card' && e.p === me) wfSfx.card();
    }
    return () => { /* timers run out on their own; a re-render must not cancel them */ };
  }, [v.logTotal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), ms('banner') + 200); return () => clearTimeout(t); }, [banner]);
  useEffect(() => { if (!stamp) return; const t = setTimeout(() => setStamp(null), ms('stamp') + 300); return () => clearTimeout(t); }, [stamp]);

  // ---- what can be clicked ----
  const owner = (t: string) => v.owner[t];
  const remaining = v.reinforcements - Object.values(draft.alloc).reduce((a, b) => a + b, 0);
  const hand = me ? v.hands[me] ?? [] : [];
  const mustTrade = v.stage === 'reinforce' && hand.length >= 5;
  const canTrade = v.stage === 'reinforce' && (!v.forced || hand.length > 4);
  const reach = useMemo(() => (sel && v.stage === 'fortify' ? connected(v, sel) : null), [sel, v]);
  const marks: Marks = useMemo(() => {
    const m: Marks = { selected: sel, target: tgt, draft: draft.alloc, pins: conqueredThisTurn(v) };
    if (!myTurn) return m;
    const mine = (t: string) => owner(t) === me;
    if (v.stage === 'claim') m.valid = new Set(Object.keys(v.owner).filter((t) => v.owner[t] === null)), m.validKind = 'friendly';
    else if (v.stage === 'place') m.valid = new Set(mustPlaceNeutral(v) ? territoriesOf(v, NEUTRAL) : territoriesOf(v, me!)), m.validKind = 'friendly';
    else if (v.stage === 'reinforce' && !mustTrade && remaining > 0) m.valid = new Set(territoriesOf(v, me!)), m.validKind = 'friendly';
    else if (v.stage === 'attack') {
      if (sel) { m.valid = new Set(ADJ[sel].filter((n) => !mine(n))); m.validKind = 'attack'; if (tgt) m.arrow = { from: sel, to: tgt, kind: 'attack' }; }
    } else if (v.stage === 'fortify' && sel && reach) {
      m.valid = new Set([...reach].filter((t) => t !== sel)); m.validKind = 'friendly';
      if (tgt) m.arrow = { from: sel, to: tgt, kind: 'fortify' };
    } else if (v.stage === 'occupy' && v.occupy) m.arrow = { from: v.occupy.from, to: v.occupy.to, kind: 'attack' };
    return m;
  }, [sel, tgt, draft, v, myTurn, me, reach, mustTrade, remaining]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (t: string, e: React.MouseEvent) => {
    if (!myTurn) return;
    const mine = owner(t) === me;
    switch (v.stage) {
      case 'claim': if (owner(t) === null) { wfSfx.place(); send({ type: 'claim', t }); } return;
      case 'place':
        if (mustPlaceNeutral(v)) { if (owner(t) === NEUTRAL) { wfSfx.place(); send({ type: 'placeNeutral', t }); } }
        else if (mine) { wfSfx.place(); send({ type: 'place', t }); }
        return;
      case 'reinforce':
        if (!mine || mustTrade) return;
        if (e.shiftKey || e.altKey || e.button === 2) return undo(t);
        if (remaining > 0) { wfSfx.click(); setSel(t); setDraft((d) => ({ alloc: { ...d.alloc, [t]: (d.alloc[t] ?? 0) + 1 }, history: [...d.history, t] })); }
        return;
      case 'attack':
        if (mine && v.armies[t] >= 2 && ADJ[t].some((n) => owner(n) !== me)) { wfSfx.click(); setSel(t); setTgt(null); setDice(maxDice(v, t)); }
        else if (sel && !mine && ADJ[sel].includes(t)) { wfSfx.click(); setTgt(t); setDice(maxDice(v, sel)); }
        else { setSel(null); setTgt(null); }
        return;
      case 'fortify':
        if (sel && reach?.has(t) && t !== sel) { wfSfx.click(); setTgt(t); setCount(v.armies[sel] - 1); }
        else if (mine && v.armies[t] >= 2) { wfSfx.click(); setSel(t); setTgt(null); }
        else { setSel(null); setTgt(null); }
        return;
    }
  };
  const undo = (t?: string) => setDraft((d) => {
    const i = t ? d.history.lastIndexOf(t) : d.history.length - 1;
    if (i < 0) return d;
    const x = d.history[i], alloc = { ...d.alloc, [x]: d.alloc[x] - 1 };
    if (!alloc[x]) delete alloc[x];
    return { alloc, history: d.history.filter((_, k) => k !== i) };
  });
  const allHere = () => sel && remaining > 0 && owner(sel) === me && setDraft((d) => ({ alloc: { ...d.alloc, [sel]: (d.alloc[sel] ?? 0) + remaining }, history: [...d.history, ...Array(remaining).fill(sel)] }));
  const deploy = () => { if (remaining === 0 && !mustTrade) send({ type: 'deploy', alloc: draft.alloc }); };
  const attack = (blitz: boolean) => { if (sel && tgt && v.stage === 'attack') send(blitz ? { type: 'blitz', from: sel, to: tgt } : { type: 'attack', from: sel, to: tgt, dice }); };
  const occupyDefault = v.occupy ? (ADJ[v.occupy.from].some((n) => owner(n) !== me) ? v.occupy.min : v.armies[v.occupy.from] - 1) : 1;
  useEffect(() => { if (v.stage === 'occupy') setCount(occupyDefault); }, [v.stage, v.occupy?.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const confirmMove = () => {
    if (v.stage === 'occupy') send({ type: 'occupy', n: count });
    else if (v.stage === 'fortify' && sel && tgt) send({ type: 'fortify', from: sel, to: tgt, n: count });
  };
  const trade = (ids: string[]) => { wfSfx.paper(); send({ type: 'trade', cards: ids }); setPicked([]); };

  // keyboard orders
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e) => {
    if (!myTurn || (e.target as HTMLElement)?.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'escape') { setSel(null); setTgt(null); }
    else if (k === 'r') attack(false);
    else if (k === 'b') attack(true);
    else if (k === 'f' && v.stage === 'attack') send({ type: 'endAttack' });
    else if (k === 'e' && (v.stage === 'attack' || v.stage === 'fortify')) send({ type: 'endTurn' });
    else if (k === 'u' && v.stage === 'reinforce') undo();
    else if (k === 'a' && v.stage === 'reinforce') allHere();
    else if (k === 'enter') { if (v.stage === 'reinforce') deploy(); else confirmMove(); }
    else if (['1', '2', '3'].includes(k) && sel) setDice(Math.min(Number(k), maxDice(v, sel)));
    else if ((k === '+' || k === '=' || k === 'arrowup') && (v.stage === 'occupy' || tgt)) setCount((c) => c + 1);
    else if ((k === '-' || k === 'arrowdown') && (v.stage === 'occupy' || tgt)) setCount((c) => c - 1);
  };
  useEffect(() => { const h = (e: KeyboardEvent) => keys.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  const factions = v.factions;
  const cur = factionOf(factions, v.current);
  const resultShown = v.result && showResult && !battle && !stamp;
  const fx = effectiveFx(useFx());
  return (
    <div className="warfront wf-game" data-fx={fx} style={{ ['--cur' as string]: cur.color }}>
      <TopBar v={v} names={names} me={me} onManual={() => setManual(true)} onLeave={() => setLeaving(true)} />
      <main className="wf-stage">
        <section className="wf-table" aria-label="War table">
          <div className="wf-table-edge">
            <Board view={v} factions={factions} marks={marks} onPick={pick} onHover={setHover} effects={battle} washed={washed} />
            <div className="wf-lamp" aria-hidden />
            {battle && <DiceTray b={battle} names={names} />}
            {banner && fx !== 'off' && (
              <div className="wf-banner" key={banner.key} style={{ ['--fc' as string]: factionOf(factions, banner.p).color }}>
                <small>Round {banner.round}</small>
                <b>{banner.p === me ? 'Your orders, General' : nameOf(names, banner.p)}</b>
                <span>{factionOf(factions, banner.p).name}</span>
              </div>
            )}
            {stamp && <div className="wf-stamp" key={stamp.key}><b>NEUTRALISED</b><span>{nameOf(names, stamp.p)}</span></div>}
          </div>
        </section>
        <aside className="wf-orders" aria-label="Orders">
          <Phases v={v} myTurn={myTurn} onFortify={() => send({ type: 'endAttack' })} />
          <div className="wf-orders-body">
            {myTurn ? (
              <Orders v={v} me={me!} sel={sel} tgt={tgt} dice={dice} setDice={setDice} count={count} setCount={setCount}
                remaining={remaining} draft={draft} undo={undo} allHere={allHere} deploy={deploy} attack={attack} confirmMove={confirmMove}
                send={send} mustTrade={mustTrade} clearSel={() => { setSel(null); setTgt(null); }} clearDraft={() => setDraft(EMPTY)} />
            ) : (
              <div className="wf-waiting">
                <span className="wf-emblem-lg" style={{ background: cur.color }}><svg viewBox="-9 -9 18 18"><path d={cur.emblem} fill="#fff" stroke="#fff" strokeWidth=".8" /></svg></span>
                <p>{v.result ? 'The war is over.' : <>Awaiting orders from <b>{nameOf(names, v.current)}</b><span className="wf-dots" /></>}</p>
                {kind === 'watch' && <p className="wf-hint">You are watching. Cards and missions stay secret.</p>}
              </div>
            )}
            {me && myTurn && mustTrade && (
              <Hand hand={hand} picked={picked} setPicked={setPicked} canTrade={canTrade} mustTrade trades={v.trades} onTrade={trade} owns={(t) => owner(t) === me} />
            )}
            {me && v.missions?.[me] && <div className="wf-orders-mission"><span className="wf-envelope" aria-hidden /> <div><small>Secret orders</small><p>{missionText(v.missions[me], names)}</p></div></div>}
            <Intel t={hover ?? sel} v={v} names={names} />
          </div>
        </aside>
        <section className="wf-strip" aria-label="Intelligence">
          {me && !(myTurn && mustTrade) ? (
            <Hand hand={hand} picked={picked} setPicked={setPicked} canTrade={myTurn && canTrade} mustTrade={false} trades={v.trades} onTrade={trade} owns={(t) => owner(t) === me} />
          ) : !me ? <div className="wf-hand"><div className="wf-hand-head"><b>Intel cards</b></div><p className="wf-hint">Cards stay secret: {v.players.map((p) => `${nameOf(names, p)} ${v.handCount[p]}`).join(' · ')}</p></div> : <div className="wf-hand wf-hand-moved"><p className="wf-hint">Your cards are in the orders column: trade a set.</p></div>}
          <Theatre v={v} />
          <Tape v={v} names={names} />
        </section>
      </main>
      {manual && <Manual onClose={() => setManual(false)} />}
      {leaving && (
        <div className="wf-modal" role="dialog" aria-label="Leave the war?">
          <div className="wf-modal-card">
            <h2>Leave the war?</h2>
            <p>{kind === 'online' && !v.result ? 'Your territories turn neutral and keep defending.' : 'This battle ends for you.'}</p>
            <div className="wf-row">
              <button type="button" className="wf-btn" onClick={() => setLeaving(false)}>Stay</button>
              <button type="button" className="wf-btn wf-btn-red" data-testid="wf-confirm-leave" onClick={() => { if (!v.result) resign?.(); onExit(); }}>Leave</button>
            </div>
          </div>
        </div>
      )}
      {resultShown && <Result v={v} names={names} me={me} again={again} onExit={onExit} onBoard={() => setShowResult(false)} />}
      {v.result && !showResult && <button type="button" className="wf-btn wf-btn-brass wf-debrief" onClick={() => setShowResult(true)}>Debrief</button>}
    </div>
  );
}

function conqueredThisTurn(v: WarView): string[] {
  const out: string[] = [];
  for (let i = v.log.length - 1; i >= 0; i--) {
    const e = v.log[i];
    if (e.k === 'turn') break;
    if (e.k === 'battle' && e.conquered) out.push(e.to);
  }
  return out;
}

function TopBar({ v, names, me, onManual, onLeave }: { v: WarClientView; names: Record<string, string>; me: string | null; onManual: () => void; onLeave: () => void }) {
  const fx = useFx();
  const next: Record<FxLevel, FxLevel> = { full: 'fast', fast: 'off', off: 'full' };
  return (
    <header className="wf-top">
      <div className="wf-brand"><span>WARFRONT</span><small>{v.round ? `Round ${v.round}` : 'Deployment'}{v.mode === 'mission' ? ' · Secret Mission' : ' · World Domination'}</small></div>
      <ol className="wf-placecards" aria-label="Turn order">
        {v.order.map((p) => {
          const f = factionOf(v.factions, p);
          const ts = territoriesOf(v, p);
          const out = v.out.includes(p);
          return (
            <li key={p} className={`wf-placecard${v.current === p ? ' wf-on' : ''}${out ? ' wf-out' : ''}`} style={{ ['--fc' as string]: f.color, ['--fd' as string]: f.deep }} data-testid={`wf-player-${p}`}>
              <span className="wf-emblem" aria-hidden><svg viewBox="-9 -9 18 18"><path d={f.emblem} fill="#fff" stroke="#fff" strokeWidth=".6" /></svg></span>
              <span className="wf-pc-name">{nameOf(names, p)}{p === me ? ' (you)' : ''}</span>
              <span className="wf-pc-stats"><b title="Territories">{ts.length}</b>⛳ <b title="Armies">{ts.reduce((s, t) => s + v.armies[t], 0)}</b>⚔ <b title="Cards">{v.handCount[p]}</b>🂠</span>
              <span className="wf-pc-conts">{continentsOf(v, p).map((c) => <i key={c.id} title={c.name}>{c.name.split(' ').map((w) => w[0]).join('')}</i>)}</span>
              {out && <span className="wf-pc-stamp">NEUTRALISED</span>}
            </li>
          );
        })}
      </ol>
      <div className="wf-top-tools">
        <button type="button" className="wf-tool" onClick={onManual} aria-label="Field Manual">?</button>
        <button type="button" className="wf-tool wf-tool-fx" onClick={() => setFx(next[fx])} aria-label={`Animations: ${fx}`} title="Animations">{fx === 'full' ? 'FX' : fx === 'fast' ? 'FX›' : 'FX×'}</button>
        <MusicButton className="wf-tool" />
        <button type="button" className="wf-tool wf-tool-leave" onClick={onLeave} data-testid="wf-leave">Leave</button>
      </div>
    </header>
  );
}

function Phases({ v, myTurn, onFortify }: { v: WarView; myTurn: boolean; onFortify: () => void }) {
  const at = v.stage === 'reinforce' ? 0 : v.stage === 'attack' || v.stage === 'occupy' ? 1 : v.stage === 'fortify' ? 2 : -1;
  if (at < 0 && v.stage !== 'over') return <div className="wf-phases wf-phases-setup"><span>{v.stage === 'claim' ? 'Claim territory' : 'Deploy starting armies'}</span></div>;
  return (
    <div className="wf-phases" role="group" aria-label="Phase">
      {['Reinforce', 'Attack', 'Fortify'].map((p, i) => (
        <button key={p} type="button" className={`wf-switch${at === i ? ' wf-switch-on' : ''}${at > i ? ' wf-switch-done' : ''}`}
          disabled={!(myTurn && i === 2 && v.stage === 'attack')} onClick={onFortify} data-testid={`wf-phase-${p.toLowerCase()}`}>
          <span className="wf-switch-lever" aria-hidden /><span>{p}</span>
        </button>
      ))}
    </div>
  );
}

interface OrdersProps {
  v: WarView; me: string; sel: string | null; tgt: string | null; dice: number; setDice: (n: number) => void; count: number; setCount: (f: number | ((n: number) => number)) => void;
  remaining: number; draft: Draft; undo: (t?: string) => void; allHere: () => void; deploy: () => void; attack: (b: boolean) => void; confirmMove: () => void;
  send: (a: Action) => void; mustTrade: boolean; clearSel: () => void; clearDraft: () => void;
}
function Orders(o: OrdersProps) {
  const { v, me, sel, tgt } = o;
  const name = (t: string) => TERR[t].name;
  switch (v.stage) {
    case 'claim':
      return <Hint title="Claim territory" text="Pick any unclaimed territory on the map. Claims go round the table one at a time." />;
    case 'place':
      return (
        <div className="wf-ord">
          <Hint title={mustPlaceNeutral(v) ? 'Reinforce the neutral army' : 'Deploy starting armies'}
            text={mustPlaceNeutral(v) ? 'Place one neutral army on a grey territory, ideally where it blocks your rival.' : `Place one army on a territory you hold. ${v.setupLeft[me]} left to place.`} />
          {!mustPlaceNeutral(v) && <button type="button" className="wf-btn" onClick={() => o.send({ type: 'autoPlace' })} data-testid="wf-autoplace">Auto-place my remaining {v.setupLeft[me]}</button>}
        </div>
      );
    case 'reinforce':
      return (
        <div className="wf-ord">
          <div className="wf-tally"><b data-testid="wf-remaining">{o.remaining}</b><span>{o.mustTrade ? 'Trade a set of cards first' : o.remaining ? 'armies to deploy: click your territories' : 'all assigned: confirm'}</span></div>
          {Object.keys(o.draft.alloc).length > 0 && (
            <ul className="wf-draftlist">
              {Object.entries(o.draft.alloc).map(([t, n]) => <li key={t}><span>{name(t)}</span><b>+{n}</b><button type="button" onClick={() => o.undo(t)} aria-label={`One fewer on ${name(t)}`}>−</button></li>)}
            </ul>
          )}
          <div className="wf-row">
            <button type="button" className="wf-btn" onClick={() => o.undo()} disabled={!o.draft.history.length}>Undo</button>
            <button type="button" className="wf-btn" onClick={o.allHere} disabled={!sel || !o.remaining} data-testid="wf-allhere">All on {sel ? name(sel) : '…'}</button>
            <button type="button" className="wf-btn" onClick={o.clearDraft} disabled={!o.draft.history.length}>Clear</button>
          </div>
          <button type="button" className="wf-key" onClick={o.deploy} disabled={o.remaining !== 0 || o.mustTrade} data-testid="wf-deploy">Deploy</button>
          <p className="wf-hint">Click adds one, Shift-click removes one. Keys: A all here, U undo, Enter deploy.</p>
        </div>
      );
    case 'attack':
      return (
        <div className="wf-ord">
          {sel && tgt ? (
            <>
              <div className="wf-versus">
                <span><small>From</small>{name(sel)}<b>{v.armies[sel]}</b></span><i>➔</i><span><small>Target</small>{name(tgt)}<b>{v.armies[tgt]}</b></span>
              </div>
              <div className="wf-dice-pick" role="group" aria-label="Dice">
                {[1, 2, 3].map((n) => <button key={n} type="button" className={o.dice === n ? 'wf-on' : ''} disabled={n > maxDice(v, sel)} onClick={() => o.setDice(n)}>{n}</button>)}
                <span>dice</span>
              </div>
              <div className="wf-row">
                <button type="button" className="wf-key wf-key-red" onClick={() => o.attack(false)} data-testid="wf-roll">Roll</button>
                <button type="button" className="wf-key wf-key-red" onClick={() => o.attack(true)} data-testid="wf-blitz">Blitz</button>
              </div>
            </>
          ) : <Hint title={sel ? 'Choose a target' : 'Attack'} text={sel ? `Pick an enemy territory next to ${name(sel)}.` : 'Pick one of your territories with 2+ armies that borders an enemy. Attack as often as you like.'} />}
          <div className="wf-row">
            <button type="button" className="wf-btn" onClick={() => o.send({ type: 'endAttack' })} data-testid="wf-to-fortify">Fortify ▸</button>
            <button type="button" className="wf-btn" onClick={() => o.send({ type: 'endTurn' })} data-testid="wf-endturn">End turn</button>
          </div>
          <p className="wf-hint">Keys: 1-3 dice, R roll, B blitz, F fortify, E end turn, Esc cancel.</p>
        </div>
      );
    case 'occupy': {
      const oc = v.occupy!;
      return (
        <div className="wf-ord">
          <Hint title="Sector secured" text={`Move armies from ${name(oc.from)} into ${name(oc.to)} (at least ${oc.min}).`} />
          <Dial value={o.count} min={oc.min} max={v.armies[oc.from] - 1} set={o.setCount} />
          <button type="button" className="wf-key" onClick={o.confirmMove} data-testid="wf-movein">Move in</button>
        </div>
      );
    }
    case 'fortify':
      return (
        <div className="wf-ord">
          {sel && tgt ? (
            <>
              <div className="wf-versus wf-versus-blue"><span><small>From</small>{name(sel)}<b>{v.armies[sel]}</b></span><i>➔</i><span><small>To</small>{name(tgt)}<b>{v.armies[tgt]}</b></span></div>
              <Dial value={o.count} min={1} max={v.armies[sel] - 1} set={o.setCount} />
              <button type="button" className="wf-key" onClick={o.confirmMove} data-testid="wf-fortify">Fortify and end turn</button>
            </>
          ) : <Hint title="Fortify" text={sel ? 'Pick one of your territories connected through your own lines.' : 'One move: pick a territory with 2+ armies, then where they go. Or end your turn.'} />}
          <button type="button" className="wf-btn" onClick={() => o.send({ type: 'endTurn' })} data-testid="wf-endturn">End turn</button>
        </div>
      );
    default:
      return null;
  }
}

function Hint({ title, text }: { title: string; text: string }) {
  return <div className="wf-hintcard"><b>{title}</b><p>{text}</p></div>;
}

function Dial({ value, min, max, set }: { value: number; min: number; max: number; set: (f: number | ((n: number) => number)) => void }) {
  const v = Math.min(max, Math.max(min, value));
  useEffect(() => { if (v !== value) set(v); }, [v, value, set]);
  return (
    <div className="wf-dial">
      <button type="button" onClick={() => set(min)} disabled={v <= min} aria-label="Fewest">«</button>
      <button type="button" onClick={() => set((n) => Math.max(min, n - 1))} disabled={v <= min} aria-label="One fewer">−</button>
      <output data-testid="wf-count"><b>{v}</b><small>{min}–{max}</small></output>
      <button type="button" onClick={() => set((n) => Math.min(max, n + 1))} disabled={v >= max} aria-label="One more">+</button>
      <button type="button" onClick={() => set(max)} disabled={v >= max} aria-label="All">»</button>
      <input type="range" min={min} max={max} value={v} onChange={(e) => set(Number(e.target.value))} aria-label="Armies to move" />
    </div>
  );
}

function Hand({ hand, picked, setPicked, canTrade, mustTrade, trades, onTrade, owns }: {
  hand: WarView['hands'][string]; picked: string[]; setPicked: (p: string[]) => void; canTrade: boolean; mustTrade: boolean; trades: number; onTrade: (ids: string[]) => void; owns: (t: string) => boolean;
}) {
  const sets = setsIn(hand, owns);
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked.slice(-2), id]);
  const valid = picked.length === 3 && sets.some((s) => s.every((id) => picked.includes(id)));
  return (
    <div className={`wf-hand${mustTrade ? ' wf-hand-must' : ''}`}>
      <div className="wf-hand-head"><b>Intel cards</b><span>Next set: <b>{tradeValue(trades)}</b> armies</span></div>
      {mustTrade && <p className="wf-must">Five or more cards: trade a set now.</p>}
      <div className="wf-hand-cards">
        {hand.length ? hand.map((c) => <IntelCard key={c.id} card={c} selected={picked.includes(c.id)} onClick={canTrade ? () => toggle(c.id) : undefined} />) : <p className="wf-hint">Win a territory on your turn to receive a card.</p>}
      </div>
      {canTrade && sets.length > 0 && (
        <div className="wf-row">
          <button type="button" className="wf-btn" onClick={() => setPicked(sets[0])}>Best set</button>
          <button type="button" className="wf-key wf-key-sm" disabled={!valid} onClick={() => onTrade(picked)} data-testid="wf-trade">Trade for {tradeValue(trades)}</button>
        </div>
      )}
    </div>
  );
}

function Intel({ t, v, names }: { t: string | null; v: WarClientView; names: Record<string, string> }) {
  if (!t) return null;
  const f = factionOf(v.factions, v.owner[t]);
  return (
    <div className="wf-intel" style={{ ['--fc' as string]: f.color }}>
      <small>{CONTINENTS.find((c) => c.id === TERR[t].cont)!.name}</small>
      <b>{TERR[t].name}</b>
      <span>{v.owner[t] ? nameOf(names, v.owner[t]!) : 'Unclaimed'} · {v.armies[t]} {v.armies[t] === 1 ? 'army' : 'armies'}</span>
      <span className="wf-intel-n">Borders: {ADJ[t].map((n) => TERR[n].name).join(', ')}</span>
    </div>
  );
}

function Theatre({ v }: { v: WarClientView }) {
  return (
    <div className="wf-theatre" aria-label="Theatre control">
      <b>Theatre control</b>
      {CONTINENTS.map((c) => {
        const ts = CONT_TERRS[c.id];
        const by = new Map<string, number>();
        for (const t of ts) { const o = v.owner[t] ?? '-'; by.set(o, (by.get(o) ?? 0) + 1); }
        return (
          <div key={c.id} className="wf-theatre-row">
            <span>{c.name}<small>+{c.bonus}</small></span>
            <span className="wf-theatre-bar">{[...by].map(([o, n]) => <i key={o} style={{ flex: n, background: o === '-' ? '#d8cfb8' : factionOf(v.factions, o).color }} />)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Tape({ v, names }: { v: WarView; names: Record<string, string> }) {
  const lines = v.log.slice(-28).map((e) => logLine(e, names)).filter(Boolean).reverse();
  return (
    <div className="wf-tape" aria-label="Teleprinter">
      <b>Teleprinter</b>
      <ol>{lines.map((l, i) => <li key={v.logTotal - i}>{l}</li>)}</ol>
    </div>
  );
}

export { FACTIONS };
