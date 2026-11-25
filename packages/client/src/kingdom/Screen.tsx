import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  TREASURE_NAME, cellOf, chooseShift, distances, rotMask, suggestShift, type Action, type KEvent, type KView, type TreasureId,
} from '@boboland/shared/src/kingdom';
import type { ChatLine, ChatPayload } from '../lib/chat';
import { Board } from './Board';
import { TileSvg } from './art/tiles';
import { TreasureGlyph } from './art/treasures';
import { HeroPortrait } from './art/portraits';
import { TargetCard } from './art/cards';
import { Scene, timeOfDay } from './art/scene';
import { trayExtent } from './project';
import { HERO_COLOR, heroName, heroOf, narrate } from './text';
import { useKingdomFx } from './useKingdomFx';
import { setFlat, setFx, useFlat, useFx, ms } from './fx';
import { TurnRibbon, Celebration, Intro } from './Moments';
import { ChatPanel } from './Chat';
import { Coach } from './Coach';
import { ResultPage } from './Result';
import { kgSound, useAmbience } from './sound';
import { load } from '../lib/storage';
import { SoundRows } from './SoundRows';

/** Arrow keys move a focus ring around the live banners and the squares you can walk to. */
function moveFocus(key: string): boolean {
  const all = [...document.querySelectorAll<HTMLElement>('.kg-banner:not(:disabled), .kg-banner[aria-disabled="true"], .kg-cell[tabindex]')];
  if (!all.length) return false;
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !all.includes(cur)) { all[0].focus(); return true; }
  const c = cur.getBoundingClientRect();
  const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
  const [dx, dy] = key === 'ArrowLeft' ? [-1, 0] : key === 'ArrowRight' ? [1, 0] : key === 'ArrowUp' ? [0, -1] : [0, 1];
  let best: HTMLElement | null = null, score = Infinity;
  for (const el of all) {
    if (el === cur) continue;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
    const along = x * dx + y * dy;
    if (along <= 4) continue;
    const s = along + Math.abs(x * dy + y * dx) * 2.2;
    if (s < score) { score = s; best = el; }
  }
  best?.focus();
  return !!best;
}

export type KgKind = 'online' | 'local' | 'bot' | 'watch';
export interface KgScreenProps {
  view: KView; me: string | null; names: Record<string, string>; kind: KgKind;
  send?: (a: Action) => void; resign?: () => void; dismiss?: (seat: string) => void;
  connected?: Record<string, boolean>; bots?: Record<string, unknown>;
  onExit: () => void;
  again?: { label: string; onClick: () => void; disabled?: boolean };
  chat?: { lines: ChatLine[]; send: (p: ChatPayload) => void };
  onBusy?: (b: boolean) => void;
}

/** One game screen for every mode: background scene, player banners, the diorama, target card, spare pedestal. */
export function KgScreen(props: KgScreenProps) {
  const { view, me, names, kind } = props;
  const flat = useFlat();
  const fx = useFx();
  const onEvent = useCallback((e: KEvent) => kgSound(e, me), [me]);
  const { d, anim, busy } = useKingdomFx(view, onEvent);
  useEffect(() => { props.onBusy?.(busy); }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = !!me && d.players.includes(me) && !d.out.includes(me);
  const myTurn = playing && d.current === me && !d.result && !busy;
  const mode = myTurn ? d.step : 'idle';
  const hero = (p: string) => heroOf(d, p);

  // the spare's rotation and the aimed banner stay local until the shift is sent
  const [rot, setRot] = useState(0);
  const [spin, setSpin] = useState(0);
  const [aim, setAim] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [pulse, setPulse] = useState<number | 'spare' | null>(null);
  const [tip, setTip] = useState('');
  useEffect(() => { setRot(0); setAim(null); setHover(null); }, [d.spare.id, d.step, d.current]);
  const rotate = (dir: 1 | -1) => { if (mode !== 'shift') return; setRot((r) => (r + dir + 4) % 4); setSpin((s) => s + dir); kgSound('rotate'); };
  const reach = useMemo(() => (mode === 'move' && me ? distances(d.board, d.pos[me]) : null), [mode, d.board, d.pos, me]);
  const shift = (at: number) => { if (mode !== 'shift') return; props.send?.({ k: 'shift', at, rot }); setAim(null); };
  const move = (to: number) => { if (mode !== 'move') return; props.send?.({ k: 'move', to }); setHover(null); };
  const stay = () => me && move(d.pos[me]);

  // hints (my own view only)
  const targets = me ? d.targets[me] ?? [] : [];
  const homeward = !!me && playing && d.left[me] === 0;
  const where = () => {
    if (!me) return;
    const c = homeward ? d.home[me] : cellOf(d, targets[0]);
    setPulse(c >= 0 ? c : 'spare');
    setTimeout(() => setPulse(null), 2600);
  };
  const suggest = () => {
    if (!me || mode !== 'shift') return;
    const s = suggestShift(d, me);
    const pick = s ?? chooseShift(d, me, 'medium', () => 0.5);
    setRot(pick.rot); setAim(pick.at);
    setTip(s ? 'This push opens a way. Press the glowing banner!' : 'No push reaches it this turn; this one gets you closest.');
    setTimeout(() => setTip(''), 4000);
  };

  // keyboard: R rotates (Shift+R the other way), Enter stays put or pushes the aimed banner
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (e.key.startsWith('Arrow')) { if (moveFocus(e.key)) e.preventDefault(); return; }
      if (e.key === 'r' || e.key === 'R') rotate(e.shiftKey ? -1 : 1);
      else if (e.key === 'Enter' && mode === 'move' && !(e.target as HTMLElement)?.closest?.('[role="button"], button')) stay();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  // board size: the largest tile that fits the board area
  const area = useRef<HTMLDivElement>(null);
  const [T, setT] = useState(60);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    // the whole diorama (flags, plinth, shadow) fits, with a small gap above and below; Board shifts it to centre that box
    const fit = () => {
      const r = el.getBoundingClientRect();
      const e = trayExtent(100, !flat);
      const gap = Math.max(8, Math.round(r.height * 0.012));
      setT(Math.max(26, Math.floor(Math.min((r.width - 8) / (2 * e.across / 100), (r.height - 2 * gap) / ((e.up + e.down) / 100)))));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [flat]);

  // offline seats: the acting host may send them home after 30 s
  const [now, setNow] = useState(Date.now());
  const since = useRef<Record<string, number>>({});
  useEffect(() => { if (kind !== 'online') return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [kind]);
  const conn = props.connected ?? {};
  for (const p of d.players) { if (conn[p] === false) since.current[p] ??= Date.now(); else delete since.current[p]; }
  const humans = d.players.filter((p) => !d.out.includes(p) && !d.bots[Number(p)]);
  const actingHost = humans.find((p) => conn[p] !== false) ?? null;
  const canDismiss = (p: string) => kind === 'online' && !!props.dismiss && me === actingHost && p !== me && !d.out.includes(p) && !d.result
    && since.current[p] !== undefined && now - since.current[p] >= 30000 && (me === humans[0] || p === humans[0]);

  const [menu, setMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const phase = timeOfDay(d);
  useAmbience(phase);
  const showResult = !!d.result && !busy;
  const lastLines = useMemo(() => d.log.slice(-6).map((e) => ({ n: e.n, text: narrate(e, d, names), k: e.k })).filter((x) => x.text).reverse(), [d.log, d.heroes, names]); // eslint-disable-line react-hooks/exhaustive-deps
  const curHero = hero(d.current);
  const lastPush = [...d.log].reverse().find((e) => e.k === 'shift');
  const lockWho = lastPush ? (lastPush.p === me ? 'you' : names[lastPush.p] ?? heroName(d, lastPush.p)) : null;
  const spareMask = rotMask(d.spare.m, rot);
  const coach = playing && kind !== 'watch' && myTurn && load<string | null>('kg.coach', null) !== 'done';

  return (
    <div className={`kingdom kg-game kg-tod-${phase}`} style={{ ['--hc' as string]: HERO_COLOR[curHero] } as CSSProperties} data-testid="kg-game" data-step={d.step} data-current={d.current} data-busy={busy ? '1' : '0'}>
      <Scene phase={phase} />
      <header className="kg-top">
        <button type="button" className="kg-btn kg-btn-ghost kg-menu-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu} data-testid="kg-menu">☰</button>
        <ol className="kg-players" aria-label="Players">
          {d.order.map((p) => {
            const h = hero(p);
            const out = d.out.includes(p);
            const off = conn[p] === false;
            return (
              <li key={p} className={`kg-pl${p === d.current && !d.result ? ' kg-pl-now' : ''}${out ? ' kg-pl-out' : ''}${p === me ? ' kg-pl-me' : ''}`} style={{ ['--pc' as string]: HERO_COLOR[h] } as CSSProperties} data-testid={`kg-player-${p}`}>
                <span className="kg-pl-face"><HeroPortrait hero={h} /></span>
                <span className="kg-pl-text" data-left={out ? '–' : d.left[p] === 0 ? '⌂' : String(d.left[p])}>
                  <b>{names[p] ?? heroName(d, p)}{d.young[Number(p)] && <span className="kg-star" title="Young Adventurer" aria-label="Young Adventurer">★</span>}</b>
                  <small>{heroName(d, p)}{out ? ' · gone home' : off ? ' · away' : d.left[p] === 0 ? ' · heading home' : ` · ${d.left[p]} to find`}</small>
                  <span className="kg-pl-found" aria-label={`${d.found[p].length} found`}>
                    {d.found[p].map((t) => <svg key={t} viewBox="0 0 100 100" className="kg-mini" data-t={t}><title>{TREASURE_NAME[t]}</title><TreasureGlyph t={t} /></svg>)}
                  </span>
                </span>
                {canDismiss(p) && <button type="button" className="kg-btn kg-btn-sm kg-dismiss" onClick={() => props.dismiss?.(p)} data-testid={`kg-dismiss-${p}`}>Send {names[p] ?? heroName(d, p)} home</button>}
              </li>
            );
          })}
        </ol>
      </header>

      <aside className="kg-left">
        {me && playing ? (
          <div className={`kg-target${myTurn ? ' kg-target-glow' : ''}`} data-testid="kg-target">
            <TargetCard targets={targets} young={d.young[Number(me)]} home={homeward} hero={hero(me)} flipKey={d.found[me].length} />
            {d.hints && <button type="button" className="kg-btn kg-btn-sm" onClick={where} data-testid="kg-where">Where is it?</button>}
          </div>
        ) : (
          <div className="kg-target kg-target-watch"><p>{kind === 'watch' ? 'Watching the adventure' : 'You have left this adventure'}</p></div>
        )}
        <ol className="kg-log" aria-live="polite" data-testid="kg-log">
          {lastLines.length ? lastLines.map((l) => <li key={l.n} className={`kg-log-${l.k}`}>{l.text}</li>) : <li className="kg-log-empty">Once upon a time, in a kingdom of shifting hedges…</li>}
        </ol>
      </aside>

      <main className="kg-boardarea" ref={area}>
        <Board d={d} T={T} tilt={!flat} me={me} mode={mode} rot={rot} aim={aim} onAim={setAim} onShift={shift}
          reach={reach} lockWho={lockWho} hover={hover} onHover={setHover} onMove={move} pulse={typeof pulse === 'number' ? pulse : null} anim={anim} />
        <TurnRibbon d={d} anim={anim} names={names} me={me} />
      </main>

      <aside className="kg-right">
        <div className={`kg-step${mode === 'idle' ? ' kg-step-wait' : ''}`} data-testid="kg-step">
          {d.result ? <span>The adventure is over</span>
            : mode === 'shift' ? <span><i>1</i> Shift the maze</span>
            : mode === 'move' ? <span><i>2</i> Walk</span>
            : <span>{busy ? '…' : `${names[d.current] ?? heroName(d, d.current)} is ${d.step === 'shift' ? 'shifting the maze' : 'walking'}`}</span>}
        </div>
        <div className={`kg-pedestal${pulse === 'spare' ? ' kg-pulse' : ''}${mode === 'shift' ? ' kg-ped-live' : ''}${anim?.e.k === 'shift' ? ' kg-ped-arriving' : ''}`} style={anim?.e.k === 'shift' ? { ['--dur' as string]: `${anim.dur}ms` } as CSSProperties : undefined} key={anim?.e.k === 'shift' ? `ped${anim.key}` : 'ped'} data-testid="kg-spare">
          <button type="button" className="kg-rot kg-rot-l" onClick={() => rotate(-1)} disabled={mode !== 'shift'} aria-label="Turn the tile left" data-testid="kg-rot-left">⟲</button>
          <button type="button" className="kg-spare-tile" onClick={() => rotate(1)} disabled={mode !== 'shift'} aria-label="Turn the spare tile" data-rot={rot}>
            <span key={spin} className={`kg-spin${spin ? (spin > 0 ? ' kg-spin-cw' : ' kg-spin-ccw') : ''}`} style={{ ['--rot-ms' as string]: `${ms('rotate')}ms` } as CSSProperties}>
              <TileSvg tile={{ ...d.spare, m: spareMask }} showTreasure={!d.spare.t || !Object.values(d.found).flat().includes(d.spare.t as TreasureId)} />
            </span>
          </button>
          <button type="button" className="kg-rot kg-rot-r" onClick={() => rotate(1)} disabled={mode !== 'shift'} aria-label="Turn the tile right" data-testid="kg-rot-right">⟳</button>
          <span className="kg-ped-base" aria-hidden />
        </div>
        <div className="kg-actions">
          {d.hints && playing && <button type="button" className="kg-btn" onClick={suggest} disabled={mode !== 'shift'} data-testid="kg-suggest">Suggest a push</button>}
          {playing && <button type="button" className="kg-btn kg-btn-gold" onClick={stay} disabled={mode !== 'move'} data-testid="kg-stay">Stay here</button>}
        </div>
        {tip && <p className="kg-tip" role="status">{tip}</p>}
      </aside>

      {coach && <Coach step={d.step} />}
      {props.chat && <ChatPanel lines={props.chat.lines} send={props.chat.send} names={names} heroOf={(p) => hero(p)} readOnly={kind === 'watch'} />}
      <Celebration d={d} anim={anim} T={T} />
      {view.logTotal < 2 && <Intro title="Runeshift" />}

      {menu && (
        <div className="kg-pop" role="dialog" aria-label="Settings">
          <h3>Settings</h3>
          <label className="kg-row">Animations
            <span className="kg-seg">{(['full', 'fast', 'off'] as const).map((l) => <button key={l} type="button" aria-pressed={fx === l} onClick={() => setFx(l)}>{l === 'full' ? 'Full' : l === 'fast' ? 'Fast' : 'Off'}</button>)}</span>
          </label>
          <label className="kg-row">Flat view <input type="checkbox" checked={flat} onChange={(e) => setFlat(e.target.checked)} /></label>
          <SoundRows />
          <div className="kg-row kg-row-end">
            {playing && !d.result && props.resign ? (confirmLeave
              ? <><span>Leave the adventure?</span><button type="button" className="kg-btn kg-btn-sm kg-btn-red" onClick={() => { props.resign?.(); setMenu(false); props.onExit(); }} data-testid="kg-leave-yes">Leave</button><button type="button" className="kg-btn kg-btn-sm" onClick={() => setConfirmLeave(false)}>Stay</button></>
              : <button type="button" className="kg-btn kg-btn-sm" onClick={() => setConfirmLeave(true)} data-testid="kg-leave">Leave game</button>)
              : <button type="button" className="kg-btn kg-btn-sm" onClick={props.onExit} data-testid="kg-exit">Back to the menu</button>}
            <button type="button" className="kg-btn kg-btn-sm kg-btn-ghost" onClick={() => setMenu(false)}>Close</button>
          </div>
        </div>
      )}
      {showResult && <ResultPage d={d} names={names} me={me} again={props.again} onExit={props.onExit} />}
    </div>
  );
}

