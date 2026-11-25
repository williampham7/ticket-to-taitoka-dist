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
import { useActionFx } from './actionFx';
import { armiesOf, blitzOdds, incomeOf, nearContinents, startArmies, tradedThisTurn } from './help';
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
  const [banner, setBanner] = useState<{ p: string; round: number; key: number; income: number } | null>(null);
  const afx = useActionFx(v, names);
  const [quaking, setQuaking] = useState(false);
  useEffect(() => { if (!afx.quake) return; setQuaking(true); wfSfx.boom(); const t = setTimeout(() => setQuaking(false), 520); return () => clearTimeout(t); }, [afx.quake]);
  useEffect(() => {
    const fresh: LogEvent[] = v.log.slice(Math.max(0, v.log.length - (v.logTotal - seen.current)));
    seen.current = v.logTotal;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const e of fresh) {
      if (e.k === 'battle' && v.battle) {
        const b = v.battle;
        setBattle(b);
        wfSfx.dice(b.rolls[b.rolls.length - 1].att.length + 2);
        if (b.conquered) timers.push(setTimeout(() => { setWashed({ t: b.to, seq: b.seq }); wfSfx.pin(); }, ms('dice') * 0.6));
        timers.push(setTimeout(() => setBattle((x) => (x?.seq === b.seq ? null : x)), ms('dice') + 900));
      }
      if (e.k === 'eliminate') { const key = Date.now(); timers.push(setTimeout(() => { setStamp({ p: e.target, key }); wfSfx.stamp(); }, ms('dice'))); }
      if (e.k === 'turn') { setBanner({ p: e.p, round: e.round, key: Date.now(), income: v.reinforcements }); wfSfx.turn(); }
      if (e.k === 'move') wfSfx.march();
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
    const m: Marks = { selected: sel, target: tgt, draft: draft.alloc, pins: conqueredThisTurn(v), spot: v.result ? null : v.current };
    if (!myTurn) return m;
    const mine = (t: string) => owner(t) === me;
    if (v.stage === 'claim') m.valid = new Set(Object.keys(v.owner).filter((t) => v.owner[t] === null)), m.validKind = 'friendly';
    else if (v.stage === 'place') m.valid = new Set(mustPlaceNeutral(v) ? territoriesOf(v, NEUTRAL) : territoriesOf(v, me!)), m.validKind = 'friendly';
    else if (v.stage === 'reinforce' && !mustTrade && remaining > 0) m.valid = new Set(territoriesOf(v, me!)), m.validKind = 'friendly';
    else if (v.stage === 'attack') {
      if (sel) { m.valid = new Set(ADJ[sel].filter((n) => !mine(n))); m.validKind = 'attack'; if (tgt) m.arrow = { from: sel, to: tgt, kind: 'attack' }; }
      else { m.valid = new Set(attackSources(v, me!)); m.validKind = 'source'; }
    } else if (v.stage === 'fortify' && sel && reach) {
      m.valid = new Set([...reach].filter((t) => t !== sel)); m.validKind = 'friendly';
      if (tgt) m.arrow = { from: sel, to: tgt, kind: 'fortify' };
    } else if (v.stage === 'fortify' && !sel) { m.valid = new Set(fortifySources(v, me!)); m.validKind = 'source'; } else if (v.stage === 'occupy' && v.occupy) m.arrow = { from: v.occupy.from, to: v.occupy.to, kind: 'attack' };
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
        else if (mine && v.armies[t] >= 2 && connected(v, t).size > 1) { wfSfx.click(); setSel(t); setTgt(null); }
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
  const tip = (t: string) => <MapTip t={t} v={v} names={names} me={me} myTurn={myTurn} sel={sel} />;
  return (
    <div className="warfront wf-game" data-fx={fx} style={{ ['--cur' as string]: cur.color }}>
      <TopBar v={v} names={names} me={me} onManual={() => setManual(true)} onLeave={() => setLeaving(true)} />
      <main className="wf-stage">
        <section className="wf-table" aria-label="War table">
          <div className={`wf-table-edge${quaking ? ' wf-quake' : ''}`}>
            <Board view={v} factions={factions} marks={marks} onPick={pick} onHover={setHover} effects={battle} washed={washed} pulses={afx.pulses} trails={afx.trails} tip={tip} />
            <div className="wf-lamp" aria-hidden />
            {battle && <DiceTray b={battle} names={names} factions={factions} />}
            {afx.dispatch && !banner && (
              <div className={`wf-dispatch wf-dispatch-${afx.dispatch.tone}`} key={afx.dispatch.key} style={{ ['--fc' as string]: afx.dispatch.color }} role="status" aria-live="polite" data-testid="wf-dispatch">
                <span className="wf-emblem" aria-hidden><svg viewBox="-9 -9 18 18"><path d={afx.dispatch.emblem} fill="#fff" stroke="#fff" strokeWidth=".6" /></svg></span>
                <span className="wf-dispatch-text"><b>{afx.dispatch.title}</b>{afx.dispatch.detail && <small>{afx.dispatch.detail}</small>}</span>
              </div>
            )}
            {banner && fx !== 'off' && (
              <div className="wf-banner" key={banner.key} style={{ ['--fc' as string]: factionOf(factions, banner.p).color, ['--fd' as string]: factionOf(factions, banner.p).deep }}>
                <span className="wf-banner-band" aria-hidden />
                <span className="wf-banner-emblem" aria-hidden><svg viewBox="-9 -9 18 18"><path d={factionOf(factions, banner.p).emblem} fill="#fff" stroke="#fff" strokeWidth=".6" /></svg></span>
                <span className="wf-banner-text">
                  <small>Round {banner.round} · {factionOf(factions, banner.p).name}</small>
                  <b>{banner.p === me ? 'Your orders, General' : `${nameOf(names, banner.p)} takes command`}</b>
                  {banner.income > 0 && <span>+{banner.income} reinforcements this turn</span>}
                </span>
              </div>
            )}
            {stamp && <div className="wf-stamp" key={stamp.key}><b>NEUTRALISED</b><span>{nameOf(names, stamp.p)}</span></div>}
          </div>
        </section>
        <aside className="wf-orders" aria-label="Orders">
          <Command v={v} me={me} names={names} />
          <Phases v={v} myTurn={myTurn} onFortify={() => send({ type: 'endAttack' })} />
          <div className="wf-orders-body">
            {myTurn ? (
              <Orders v={v} me={me!} sel={sel} tgt={tgt} dice={dice} setDice={setDice} count={count} setCount={setCount}
                remaining={remaining} draft={draft} undo={undo} allHere={allHere} deploy={deploy} attack={attack} confirmMove={confirmMove}
                send={send} mustTrade={mustTrade} clearSel={() => { setSel(null); setTgt(null); }} clearDraft={() => setDraft(EMPTY)} hand={hand} />
            ) : <Waiting v={v} names={names} kind={kind} me={me} />}
            {me && myTurn && mustTrade && (
              <Hand hand={hand} picked={picked} setPicked={setPicked} canTrade={canTrade} mustTrade trades={v.trades} onTrade={trade} owns={(t) => owner(t) === me} />
            )}
            {me && v.missions?.[me] && <div className="wf-orders-mission"><span className="wf-envelope" aria-hidden /> <div><small>Secret orders · eyes only</small><p>{missionText(v.missions[me], names)}</p></div></div>}
            <Intel t={sel ?? hover} v={v} names={names} />
          </div>
        </aside>
        <section className="wf-strip" aria-label="Intelligence">
          {me && !(myTurn && mustTrade) ? (
            <Hand hand={hand} picked={picked} setPicked={setPicked} canTrade={myTurn && canTrade} mustTrade={false} trades={v.trades} onTrade={trade} owns={(t) => owner(t) === me} />
          ) : !me ? <div className="wf-hand"><div className="wf-hand-head"><b>Intel cards</b></div><p className="wf-hint">Cards stay secret: {v.players.map((p) => `${nameOf(names, p)} ${v.handCount[p]}`).join(' · ')}</p></div> : <div className="wf-hand wf-hand-moved"><p className="wf-hint">Your cards are in the orders column: trade a set.</p></div>}
          <Theatre v={v} me={me} />
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
const attackSources = (v: WarView, me: string) => territoriesOf(v, me).filter((t) => v.armies[t] >= 2 && ADJ[t].some((n) => v.owner[n] !== me));
const fortifySources = (v: WarView, me: string) => territoriesOf(v, me).filter((t) => v.armies[t] >= 2 && ADJ[t].some((n) => v.owner[n] === me));

const Emblem = ({ f, cls = 'wf-emblem' }: { f: { emblem: string }; cls?: string }) => (
  <span className={cls} aria-hidden><svg viewBox="-9 -9 18 18"><path d={f.emblem} fill="#fff" stroke="#fff" strokeWidth=".6" /></svg></span>
);
const ICON = {
  terr: 'M3,15 V2 M3,3 C7,1 9,5 14,3 V10 C9,12 7,8 3,10',
  army: 'M5,15 L5.6,8 Q5.2,5 8,4.6 L10,4.6 Q12.8,5 12.4,8 L13,15 M5.6,4.4 Q9,-.4 12.4,4.4',
  card: 'M4,2 H12 Q14,2 14,4 V14 Q14,16 12,16 H4 Q2,16 2,14 V4 Q2,2 4,2Z M5,6 H11 M5,9 H11',
};
const Ico = ({ k }: { k: keyof typeof ICON }) => <svg className="wf-ico" viewBox="0 0 16 17" aria-hidden><path d={ICON[k]} /></svg>;

function TopBar({ v, names, me, onManual, onLeave }: { v: WarClientView; names: Record<string, string>; me: string | null; onManual: () => void; onLeave: () => void }) {
  const fx = useFx();
  const next: Record<FxLevel, FxLevel> = { full: 'fast', fast: 'off', off: 'full' };
  const setup = v.stage === 'claim' || v.stage === 'place';
  return (
    <header className="wf-top">
      <div className="wf-brand"><span>WARFRONT</span><small>{v.round ? `Round ${v.round}` : 'Deployment'}{v.mode === 'mission' ? ' · Secret Mission' : ' · World Domination'}</small></div>
      <ol className="wf-placecards" aria-label="Turn order">
        {v.order.map((p) => {
          const f = factionOf(v.factions, p);
          const ts = territoriesOf(v, p);
          const out = v.out.includes(p);
          const inc = incomeOf(v, p).total;
          return (
            <li key={p} className={`wf-placecard${v.current === p ? ' wf-on' : ''}${out ? ' wf-out' : ''}${p === me ? ' wf-me' : ''}`} style={{ ['--fc' as string]: f.color, ['--fd' as string]: f.deep }} data-testid={`wf-player-${p}`}>
              <Emblem f={f} />
              <span className="wf-pc-name">{nameOf(names, p)}{p === me ? ' (you)' : ''}</span>
              <span className="wf-pc-stats">
                <span title="Territories held" aria-label={`${ts.length} territories`}><Ico k="terr" />{ts.length}</span>
                <span title="Armies on the map" aria-label={`${armiesOf(v, p)} armies`}><Ico k="army" />{armiesOf(v, p)}</span>
                <span title="Intel cards in hand" aria-label={`${v.handCount[p]} cards`}><Ico k="card" />{v.handCount[p]}</span>
              </span>
              {!out && (setup
                ? <span className="wf-pc-income" title="Starting armies still to place">{v.setupLeft[p] ?? 0} to place</span>
                : <span className="wf-pc-income" title="Reinforcements at the start of their next turn">+{inc}/turn</span>)}
              <span className="wf-pc-conts">{continentsOf(v, p).map((c) => <i key={c.id} title={`Holds ${c.name} (+${c.bonus})`}>{c.name.split(' ').map((w) => w[0]).join('')}</i>)}</span>
              {v.current === p && !v.result && <span className="wf-pc-now">Now</span>}
              {out && <span className="wf-pc-stamp">NEUTRALISED</span>}
            </li>
          );
        })}
      </ol>
      <div className="wf-top-tools">
        <button type="button" className="wf-tool" onClick={onManual} aria-label="Field Manual" title="Field Manual: rules and controls">?</button>
        <button type="button" className="wf-tool wf-tool-fx" onClick={() => setFx(next[fx])} aria-label={`Animations: ${fx}`} title={`Animations: ${fx}`}>{fx === 'full' ? 'FX' : fx === 'fast' ? 'FX›' : 'FX×'}</button>
        <MusicButton className="wf-tool" />
        <button type="button" className="wf-tool wf-tool-leave" onClick={onLeave} data-testid="wf-leave">Leave</button>
      </div>
    </header>
  );
}

/** Your general at a glance: what you hold, what you have, what you will get. */
function Command({ v, me, names }: { v: WarClientView; me: string | null; names: Record<string, string> }) {
  const p = me ?? v.current;
  const f = factionOf(v.factions, p);
  const inc = incomeOf(v, p);
  const setup = v.stage === 'claim' || v.stage === 'place';
  const near = setup ? [] : nearContinents(v, p);
  return (
    <section className="wf-command" style={{ ['--fc' as string]: f.color, ['--fd' as string]: f.deep }} aria-label={me ? 'Your command' : 'Current general'}>
      <header>
        <Emblem f={f} cls="wf-emblem-lg" />
        <div><small>{me ? 'Your command' : 'In command'}</small><b>{nameOf(names, p)}</b><span>{f.name}</span></div>
      </header>
      <dl className="wf-cmd-stats">
        <div><dt>Territories</dt><dd>{inc.territories}<small>/42</small></dd></div>
        <div><dt>Armies</dt><dd>{armiesOf(v, p)}</dd></div>
        {setup ? <div className="wf-cmd-hot"><dt>To place</dt><dd data-testid="wf-to-place">{v.setupLeft[p] ?? 0}</dd></div> : <div><dt>Cards</dt><dd>{v.handCount[p]}</dd></div>}
      </dl>
      {setup ? (
        <p className="wf-cmd-line">Every general starts with <b>{startArmies(v)} armies</b>. One sits on each territory you hold; the rest are placed in turns.</p>
      ) : (
        <p className="wf-cmd-line" title="Reinforcements: territories ÷ 3 (at least 3) plus continent bonuses">
          Income <b>+{inc.total}</b> per turn: {inc.territories} territories ÷ 3 = {inc.base}{inc.territories < 9 ? ' (minimum 3)' : ''}
          {inc.conts.map((c) => <span key={c.name}> · {c.name} +{c.bonus}</span>)}
        </p>
      )}
      {near.length > 0 && <p className="wf-cmd-near">Close: {near.map((x) => `${x.c.name} (${x.missing} to go, +${x.c.bonus})`).join(' · ')}</p>}
    </section>
  );
}

function Phases({ v, myTurn, onFortify }: { v: WarView; myTurn: boolean; onFortify: () => void }) {
  const at = v.stage === 'reinforce' ? 0 : v.stage === 'attack' || v.stage === 'occupy' ? 1 : v.stage === 'fortify' ? 2 : -1;
  if (at < 0 && v.stage !== 'over') return <div className="wf-phases wf-phases-setup"><span>{v.stage === 'claim' ? 'Setup · Claim territory' : 'Setup · Place starting armies'}</span></div>;
  return (
    <div className="wf-phases" role="group" aria-label="Phase">
      {['Reinforce', 'Attack', 'Fortify'].map((p, i) => (
        <button key={p} type="button" className={`wf-switch${at === i ? ' wf-switch-on' : ''}${at > i ? ' wf-switch-done' : ''}`}
          disabled={!(myTurn && i === 2 && v.stage === 'attack')} onClick={onFortify} data-testid={`wf-phase-${p.toLowerCase()}`}>
          <span className="wf-switch-lever" aria-hidden /><span><i>{i + 1}</i> {p}</span>
        </button>
      ))}
    </div>
  );
}

/** Numbered steps for the current stage; the step you are on is lit. */
function Steps({ items, at }: { items: string[]; at: number }) {
  return <ol className="wf-steps">{items.map((s, i) => <li key={i} className={i === at ? 'wf-step-on' : i < at ? 'wf-step-done' : ''}><i>{i + 1}</i><span>{s}</span></li>)}</ol>;
}

interface OrdersProps {
  v: WarView; me: string; sel: string | null; tgt: string | null; dice: number; setDice: (n: number) => void; count: number; setCount: (f: number | ((n: number) => number)) => void;
  remaining: number; draft: Draft; undo: (t?: string) => void; allHere: () => void; deploy: () => void; attack: (b: boolean) => void; confirmMove: () => void;
  send: (a: Action) => void; mustTrade: boolean; clearSel: () => void; clearDraft: () => void; hand: WarView['hands'][string];
}
function Orders(o: OrdersProps) {
  const { v, me, sel, tgt } = o;
  const name = (t: string) => TERR[t].name;
  switch (v.stage) {
    case 'claim': {
      const open = Object.values(v.owner).filter((x) => x === null).length;
      return (
        <div className="wf-ord">
          <Hint title="Claim a territory" text={`Click any glowing (unclaimed) territory to put one army on it. ${open} still open.`} />
          <Steps at={0} items={['Claim one territory (glowing)', 'The other generals claim theirs', 'When all 42 are taken, place your remaining armies']} />
          <p className="wf-hint">Tip: claim territories next to each other, and aim for a whole continent for bonus armies every turn.</p>
        </div>
      );
    }
    case 'place': {
      const neutral = mustPlaceNeutral(v);
      const left = v.setupLeft[me] ?? 0, start = startArmies(v), done = start - left;
      return (
        <div className="wf-ord">
          <div className="wf-tally"><b data-testid="wf-remaining">{neutral ? v.setupLeft.N : left}</b><span>{neutral ? 'neutral armies left. Place one on a grey territory to block your rival.' : `of your ${start} starting armies still to place. Click a glowing territory of yours to add one.`}</span></div>
          {!neutral && <div className="wf-meter" aria-hidden><i style={{ width: `${(100 * done) / start}%` }} /></div>}
          <Steps at={neutral ? 1 : 0} items={v.neutral ? ['Place 2 armies on your territories', 'Place 1 neutral army (grey) where it blocks your rival', 'Your rival does the same'] : ['Place 1 army on one of your territories', 'The other generals place theirs', 'Repeat until everyone has placed all armies']} />
          {!neutral && <button type="button" className="wf-btn" onClick={() => o.send({ type: 'autoPlace' })} data-testid="wf-autoplace">Auto-place my remaining {left}</button>}
          <p className="wf-hint">Stack armies on borders that face enemies; quiet interior territories need only one.</p>
        </div>
      );
    }
    case 'reinforce': {
      const inc = incomeOf(v, me), traded = tradedThisTurn(v, me);
      const hasSet = setsIn(o.hand).length > 0;
      const step = o.mustTrade ? 0 : o.remaining > 0 ? 1 : 2;
      return (
        <div className="wf-ord">
          <div className="wf-tally"><b data-testid="wf-remaining">{o.remaining}</b><span>{o.mustTrade ? 'You hold 5+ intel cards: trade a set first (below).' : o.remaining ? 'armies left to deploy. Click your glowing territories.' : 'All assigned. Press Deploy.'}</span></div>
          {!v.forced && (
            <p className="wf-breakdown">
              <span>{inc.territories} territories ÷ 3 <b>+{inc.base}</b></span>
              {inc.conts.map((c) => <span key={c.name}>{c.name} <b>+{c.bonus}</b></span>)}
              {traded > 0 && <span>Intel trade <b>+{traded}</b></span>}
              <span className="wf-breakdown-total">= <b>{v.reinforcements}</b></span>
            </p>
          )}
          <Steps at={step} items={[hasSet || o.mustTrade ? `Trade 3 matching intel cards for +${tradeValue(v.trades)} armies${o.mustTrade ? ' (required)' : ' (optional)'}` : 'Trade intel cards (you have no set yet)', 'Click your territories to add armies', 'Press Deploy']} />
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
          <button type="button" className="wf-key" onClick={o.deploy} disabled={o.remaining !== 0 || o.mustTrade} data-testid="wf-deploy">Deploy {v.reinforcements} armies</button>
          <p className="wf-hint">Click adds one, Shift-click removes one. Keys: A all here, U undo, Enter deploy.</p>
        </div>
      );
    }
    case 'attack': {
      const step = sel && tgt ? 2 : sel ? 1 : 0;
      const odds = sel && tgt ? blitzOdds(v.armies[sel] - 1, v.armies[tgt]) : 0;
      return (
        <div className="wf-ord">
          {sel && tgt ? (
            <>
              <div className="wf-versus">
                <span><small>Attack from</small>{name(sel)}<b>{v.armies[sel]}</b></span><i>➔</i><span><small>Target</small>{name(tgt)}<b>{v.armies[tgt]}</b></span>
              </div>
              <div className="wf-odds" title="Chance to take the territory if you fight to the end (Blitz)">
                <span>Blitz win chance</span><span className="wf-odds-bar"><i style={{ width: `${Math.round(odds * 100)}%` }} /></span><b>{Math.round(odds * 100)}%</b>
              </div>
              <div className="wf-dice-pick" role="group" aria-label="Dice">
                {[1, 2, 3].map((n) => <button key={n} type="button" className={o.dice === n ? 'wf-on' : ''} disabled={n > maxDice(v, sel)} onClick={() => o.setDice(n)}>{n}</button>)}
                <span>dice vs their {Math.min(2, v.armies[tgt])}. Ties go to the defender.</span>
              </div>
              <div className="wf-row">
                <button type="button" className="wf-key wf-key-red" onClick={() => o.attack(false)} data-testid="wf-roll">Roll once</button>
                <button type="button" className="wf-key wf-key-red" onClick={() => o.attack(true)} data-testid="wf-blitz">Blitz</button>
              </div>
            </>
          ) : <Hint title={sel ? `Choose a target for ${name(sel)}` : 'Attack (optional)'} text={sel ? `Click an enemy territory glowing red next to ${name(sel)}. Esc to pick another.` : 'Click one of your glowing territories (2+ armies, next to an enemy). Attack as often as you like, or skip.'} />}
          <Steps at={step} items={['Pick your attacking territory', 'Pick an enemy next to it', 'Roll once, or Blitz to fight until one side breaks', 'When done: Fortify or End turn']} />
          <div className="wf-row">
            <button type="button" className="wf-btn" onClick={() => o.send({ type: 'endAttack' })} data-testid="wf-to-fortify">Fortify ▸</button>
            <button type="button" className="wf-btn" onClick={() => o.send({ type: 'endTurn' })} data-testid="wf-endturn">End turn</button>
          </div>
          <p className="wf-hint">Capture at least one territory this turn to earn an intel card. Keys: 1-3 dice, R roll, B blitz, F fortify, E end turn.</p>
        </div>
      );
    }
    case 'occupy': {
      const oc = v.occupy!;
      return (
        <div className="wf-ord">
          <Hint title={`${name(oc.to)} captured!`} text={`Move armies from ${name(oc.from)} into ${name(oc.to)}: at least ${oc.min} (the dice you rolled), up to ${v.armies[oc.from] - 1}. At least one army must stay behind.`} />
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
          ) : <Hint title="Fortify (optional)" text={sel ? `Click a glowing territory connected to ${name(sel)} through your own lines.` : 'One move per turn: click a glowing territory of yours (2+ armies), then where the armies go. Or end your turn.'} />}
          <Steps at={sel && tgt ? 2 : sel ? 1 : 0} items={['Pick where armies leave from', 'Pick a connected territory of yours', 'Choose how many, then confirm']} />
          <button type="button" className="wf-btn" onClick={() => o.send({ type: 'endTurn' })} data-testid="wf-endturn">End turn</button>
        </div>
      );
    default:
      return null;
  }
}

const DOING: Record<string, string> = {
  claim: 'is claiming a territory', place: 'is placing starting armies', reinforce: 'is deploying reinforcements',
  attack: 'is on the attack', occupy: 'is moving into captured ground', fortify: 'is fortifying their lines',
};
function Waiting({ v, names, kind, me }: { v: WarClientView; names: Record<string, string>; kind: ScreenProps['kind']; me: string | null }) {
  const f = factionOf(v.factions, v.current);
  const order = v.order.filter((p) => !v.out.includes(p));
  const mineNext = me && order[(order.indexOf(v.current) + 1) % order.length] === me;
  return (
    <div className="wf-waiting" style={{ ['--fc' as string]: f.color }}>
      <Emblem f={f} cls="wf-emblem-lg" />
      <div>
        {v.result ? <p>The war is over.</p> : <p><b>{nameOf(names, v.current)}</b> {DOING[v.stage] ?? 'is giving orders'}<span className="wf-dots" /></p>}
        {!v.result && <p className="wf-hint">{mineNext ? 'You are next. ' : ''}Watch the map: arrows and numbers show every move. Hover a territory for details.</p>}
        {kind === 'watch' && <p className="wf-hint">You are watching. Cards and missions stay secret.</p>}
      </div>
    </div>
  );
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
      <output data-testid="wf-count"><b>{v}</b><small>armies ({min}–{max})</small></output>
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
      <div className="wf-hand-head"><b>Intel cards ({hand.length})</b><span>Next set: <b>+{tradeValue(trades)}</b> armies</span></div>
      {mustTrade && <p className="wf-must">Five or more cards: trade a set now.</p>}
      <div className="wf-hand-cards">
        {hand.length ? hand.map((c) => <IntelCard key={c.id} card={c} selected={picked.includes(c.id)} onClick={canTrade ? () => toggle(c.id) : undefined} />) : <p className="wf-hint">Capture a territory on your turn to receive a card. Three of a kind, or one of each, trade for armies.</p>}
      </div>
      {canTrade && sets.length > 0 && (
        <div className="wf-row">
          <button type="button" className="wf-btn" onClick={() => setPicked(sets[0])}>Best set</button>
          <button type="button" className="wf-key wf-key-sm" disabled={!valid} onClick={() => onTrade(picked)} data-testid="wf-trade">Trade for {tradeValue(trades)}</button>
        </div>
      )}
      {hand.length > 0 && sets.length === 0 && <p className="wf-hint">No set yet: you need 3 of a kind or 1 of each (wilds count as anything).</p>}
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

/** The floating card over the map: who holds it, how strong, and what clicking it would do now. */
function MapTip({ t, v, names, me, myTurn, sel }: { t: string; v: WarClientView; names: Record<string, string>; me: string | null; myTurn: boolean; sel: string | null }) {
  const o = v.owner[t];
  const f = factionOf(v.factions, o);
  const cont = CONTINENTS.find((c) => c.id === TERR[t].cont)!;
  const enemies = ADJ[t].filter((n) => v.owner[n] !== o).length;
  let act: string | null = null;
  if (myTurn && me) {
    const mine = o === me;
    if (v.stage === 'attack' && sel && !mine && ADJ[sel].includes(t)) act = `Click to target · blitz win ${Math.round(blitzOdds(v.armies[sel] - 1, v.armies[t]) * 100)}%`;
    else if (v.stage === 'attack' && mine && v.armies[t] >= 2 && ADJ[t].some((n) => v.owner[n] !== me)) act = 'Click to attack from here';
    else if (v.stage === 'attack' && mine) act = v.armies[t] < 2 ? 'Needs 2+ armies to attack' : 'No enemy next to it';
    else if (v.stage === 'reinforce' && mine) act = 'Click to add an army';
    else if (v.stage === 'place' && mine) act = 'Click to place an army';
    else if (v.stage === 'claim' && o === null) act = 'Click to claim';
  }
  return (
    <div className="wf-tip-card" style={{ ['--fc' as string]: o ? f.color : '#bdb39c' }}>
      <small>{cont.name} · +{cont.bonus} if held whole</small>
      <b>{TERR[t].name}</b>
      <span>{o ? <><i className="wf-dot" />{nameOf(names, o)}{o === me ? ' (you)' : ''}</> : 'Unclaimed'} · <b>{v.armies[t]}</b> {v.armies[t] === 1 ? 'army' : 'armies'}</span>
      <span className="wf-tip-n">{ADJ[t].length} neighbours{o ? `, ${enemies} hostile` : ''}</span>
      {act && <em>{act}</em>}
    </div>
  );
}

function Theatre({ v, me }: { v: WarClientView; me: string | null }) {
  return (
    <div className="wf-theatre" aria-label="Theatre control">
      <b>Continents <small>hold all to earn the bonus</small></b>
      {CONTINENTS.map((c) => {
        const ts = CONT_TERRS[c.id];
        const by = new Map<string, number>();
        for (const t of ts) { const o = v.owner[t] ?? '-'; by.set(o, (by.get(o) ?? 0) + 1); }
        const mine = me ? by.get(me) ?? 0 : 0;
        return (
          <div key={c.id} className="wf-theatre-row">
            <span>{c.name}<small>+{c.bonus}</small></span>
            <span className="wf-theatre-bar">{[...by].map(([o, n]) => <i key={o} title={`${n} of ${ts.length}`} style={{ flex: n, background: o === '-' ? '#d8cfb8' : factionOf(v.factions, o).color }} />)}</span>
            {me && <em>{mine}/{ts.length}</em>}
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
      <b>Teleprinter <small>latest first</small></b>
      <ol>{lines.map((l, i) => <li key={v.logTotal - i}>{l}</li>)}</ol>
    </div>
  );
}

export { FACTIONS };
