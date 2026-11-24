import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ARMY, inZone, kindOf, legalMoves, randomPlacement, validatePlacement, type Combat, type FrontlineView, type Placement, type PlayerID, type Rank, type ViewPiece } from '@boboland/shared/src/frontline';
import { ChatPanel, type ChatProps } from '../game/ChatPanel';
import { Board, coordOf, OWNER_STYLE } from './Board';
import { combatSentence, combatSentenceNamed, layoutFromPlacement, placementFromLayout, secondsLeft } from './helpers';
import { PRESETS, fillRest, moveTo, placeAt, presetPlacement, remaining, removeAt } from './presets';
import { Chip } from './Tile';
import { Duel, timelineVars, verdict } from './Duel';
import { combatOutcome, fxFor, prefersReducedMotion, type Fx } from './fx';
import { sound } from './sound';
import { FrontlineAudio } from './FrontlineAudio';
import { useNow } from './timer';
import { load, save } from '../lib/storage';
import type { ChatLine } from '../lib/chat';
import './screen.css';

export interface FrontlineState {
  G: FrontlineView;
  ctx: { phase: string; currentPlayer: string; gameover?: { winner?: string; draw?: boolean } };
}

interface Props {
  state: FrontlineState;
  playerID: PlayerID;
  moves: Record<string, (...args: unknown[]) => void>;
  names: Record<string, string>;
  chat?: ChatProps;
  onExit: () => void;
  /** Offered after the game; `waiting` shows that this player already asked. */
  rematch?: { onClick: () => void; waiting?: boolean };
  /** Extra content in the command panel (connection state, spectator link...). */
  notice?: ReactNode;
  /** The pre-game settings (left column while the match is in its briefing). */
  briefing?: ReactNode;
  /** Read-only view for someone watching (no seat): shown from player 0's side. */
  spectator?: boolean;
  /** Spectators only read the chat. */
  chatLines?: ChatLine[];
}

const REASON: Record<string, string> = {
  flag: 'a command post was captured',
  noMoves: 'one side has no moves left',
  draw: 'neither side can move',
  resign: 'a commander left the battle',
  timeout: 'the turn time ran out',
};

/** Classes for the plain pre-game shells (connecting, joining...). */
export const btn = 'fls-btn';
export const btnPrimary = 'fls-btn primary';

export const TURN_LIMITS = [0, 30, 60, 120] as const;

const SAVED_KEY = 'frontline.layouts';
interface SavedLayout { name: string; ranks: Rank[] }
const loadLayouts = (): SavedLayout[] => {
  const v = load<unknown>(SAVED_KEY, []);
  return Array.isArray(v) ? v.filter((s): s is SavedLayout => !!s && typeof s.name === 'string' && Array.isArray(s.ranks) && s.ranks.length === 40).slice(0, 3) : [];
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const firstLeft = (pl: Placement): Rank | null => { const left = remaining(pl); return ARMY.find((k) => (left.get(k.rank) ?? 0) > 0)?.rank ?? null; };

type DragSrc = { kind: 'tray'; rank: Rank } | { kind: 'cell'; pos: number };
interface Drag { src: DragSrc; rank: Rank; x0: number; y0: number; x: number; y: number; moved: boolean; over: number | 'tray' | null }

export function FrontlineScreen({ state, playerID: me, moves, names, chat, onExit, rematch, notice, briefing, spectator, chatLines }: Props) {
  const { G, ctx } = state;
  const inBriefing = ctx.phase === 'briefing';
  const setup = ctx.phase === 'setup';
  const over = !!G.result;
  const foe: PlayerID = me === '0' ? '1' : '0';
  const name = (id: string) => names[id] || `Player ${Number(id) + 1}`;

  // setup: my placement (starts empty), editable until I confirm
  const [placement, setPlacement] = useState<Placement>([]);
  const [armed, setArmed] = useState<Rank | null>('F');
  const [presetId, setPresetId] = useState<string | null>(null);
  // play: the piece I have tapped
  const [selected, setSelected] = useState<number | null>(null);

  const myTurn = !spectator && ctx.phase === 'play' && !over && ctx.currentPlayer === me;
  const legal = useMemo(() => (myTurn ? legalMoves(G as never, me) : []), [G, me, myTurn]);
  const legalTo = useMemo(() => new Set(legal.filter((m) => m.from === selected).map((m) => m.to)), [legal, selected]);

  const iAmReady = G.ready[me];
  const deploying = setup && !iAmReady && !spectator;
  const pieces: ViewPiece[] = deploying
    ? placement.map((p) => ({ id: `setup-${p.pos}`, owner: me, pos: p.pos, revealed: false, rank: p.rank }))
    : G.pieces;
  const zone = useMemo(() => (deploying ? new Set(Array.from({ length: 100 }, (_, i) => i).filter((p) => inZone(me, p))) : undefined), [deploying, me]);

  // every edit of the placement goes through here, so the armed piece is always one still in the tray
  const edit = (next: Placement, keepPreset = false) => {
    setPlacement(next);
    if (!keepPreset) setPresetId(null);
    const left = remaining(next);
    setArmed((a) => (a !== null && (left.get(a) ?? 0) > 0 ? a : firstLeft(next)));
  };

  // saved layouts
  const [saved, setSaved] = useState<SavedLayout[]>(loadLayouts);
  const [layoutName, setLayoutName] = useState('');
  const [layoutNote, setLayoutNote] = useState<string | null>(null);
  const complete = placement.length === 40 && !validatePlacement(me, placement);
  const saveLayout = () => {
    const nm = layoutName.trim() || `Layout ${saved.length + 1}`;
    const next = [...saved.filter((s) => s.name !== nm), { name: nm, ranks: layoutFromPlacement(me, placement) }].slice(-3);
    setSaved(next); save(SAVED_KEY, next); setLayoutName(''); setLayoutNote(`Saved "${nm}"`);
  };
  const loadLayout = (s: SavedLayout) => {
    const p = placementFromLayout(me, s.ranks);
    if (validatePlacement(me, p)) { setLayoutNote('That layout is not valid'); return; }
    edit(p); setLayoutNote(`Loaded "${s.name}"`);
  };
  const deleteLayout = (nm: string) => { const next = saved.filter((s) => s.name !== nm); setSaved(next); save(SAVED_KEY, next); };

  // ---- animation: a new move slides into place; an attack plays the duel over the board ----
  // The board keeps showing the position from before the attack (this screen's own view of it) until the duel is over.
  const reduced = useMemo(prefersReducedMotion, []);
  const [seenMoves, setSeenMoves] = useState(G.moves);
  const [anim, setAnim] = useState<{ fx: Fx; prev: ViewPiece[]; key: number } | null>(null);
  const snap = useRef(G.pieces);
  if (G.moves !== seenMoves) {
    setSeenMoves(G.moves);
    const f = ctx.phase === 'play' ? fxFor(seenMoves, G, reduced) : null;
    setAnim(f && f.ms > 0 ? { fx: f, prev: snap.current, key: G.moves } : null);
    setSelected(null);
  }
  useEffect(() => { snap.current = G.pieces; });
  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => setAnim(null), anim.fx.ms);
    return () => clearTimeout(t);
  }, [anim]);
  const combatAnim = anim && anim.fx.kind === 'combat' ? anim.fx : null;
  const prevMoves = useRef(G.moves);
  useEffect(() => {
    if (G.moves > prevMoves.current && !G.lastCombat) sound.move();
    prevMoves.current = G.moves;
  }, [G.moves, G.lastCombat]);

  // the end: once the last duel is over, a stamp over the board and a fanfare (or not)
  const wasOver = useRef(over);
  const [endStamp, setEndStamp] = useState(false);
  const endTimers = useRef<number[]>([]);
  useEffect(() => {
    if (over && !wasOver.current) {
      const wait = anim?.fx.ms ?? 0;
      endTimers.current.push(window.setTimeout(() => {
        setEndStamp(true);
        if (!spectator) (G.result!.winner === me ? sound.win : sound.lose)();
      }, wait), window.setTimeout(() => setEndStamp(false), wait + 3000));
    }
    wasOver.current = over;
  }, [over]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => endTimers.current.forEach((t) => clearTimeout(t)), []);

  const playing = ctx.phase === 'play' && !over;
  const now = useNow(playing);
  const left = playing ? secondsLeft(G, now) : null;
  const elapsed = G.startedAt !== null ? Math.max(0, Math.floor((now - G.startedAt) / 1000)) : null;

  // ---- setup: taps ----
  const suppressClick = useRef(false);
  const onSetupCell = (pos: number) => {
    if (!inZone(me, pos)) return;
    const here = placement.find((p) => p.pos === pos);
    // a tap on a placed piece sends it back to the tray (and picks that rank, so the next tap puts it elsewhere)
    if (here) { edit(removeAt(placement, pos)); setArmed(here.rank); sound.select(); return; }
    if (armed !== null) { edit(placeAt(placement, pos, armed)); sound.move(); }
  };
  const onTrayKind = (rank: Rank) => {
    if (suppressClick.current) return;
    if ((remaining(placement).get(rank) ?? 0) > 0) setArmed(rank);
  };

  // ---- setup: drag (tray -> board, board -> board, board -> tray) ----
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  dragRef.current = drag;
  const startDrag = (src: DragSrc, rank: Rank, e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    setDrag({ src, rank, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, over: null });
  };
  const dropTarget = (x: number, y: number): number | 'tray' | null => {
    const el = document.elementFromPoint(x, y);
    if (el?.closest('[data-fl-tray]')) return 'tray';
    const cell = el?.closest('[data-testid^="fl-cell-"]');
    const pos = cell ? Number(cell.getAttribute('data-testid')!.slice('fl-cell-'.length)) : NaN;
    return Number.isInteger(pos) && inZone(me, pos) ? pos : null;
  };
  const dragging = !!drag;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved = d.moved || Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 6;
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved, over: moved ? dropTarget(e.clientX, e.clientY) : null });
    };
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      setDrag(null);
      if (!d?.moved) return;
      suppressClick.current = true;
      setTimeout(() => { suppressClick.current = false; }, 0);
      const to = dropTarget(e.clientX, e.clientY);
      setPlacement((pl) => {
        let next = pl;
        if (d.src.kind === 'tray' && typeof to === 'number') next = placeAt(pl, to, d.src.rank);
        else if (d.src.kind === 'cell' && to === 'tray') next = removeAt(pl, d.src.pos);
        else if (d.src.kind === 'cell' && typeof to === 'number') next = moveTo(pl, d.src.pos, to);
        if (next !== pl) {
          sound.move();
          if (!(d.src.kind === 'cell' && typeof to === 'number')) setPresetId(null);
          const leftNow = remaining(next);
          setArmed((a) => (a !== null && (leftNow.get(a) ?? 0) > 0 ? a : firstLeft(next)));
        }
        return next;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCellPointerDown = (pos: number, e: ReactPointerEvent) => {
    const here = placement.find((p) => p.pos === pos);
    if (here) startDrag({ kind: 'cell', pos }, here.rank, e);
  };

  // ---- play ----
  const onCell = (pos: number) => {
    if (over || spectator || inBriefing) return;
    if (setup) {
      if (!deploying || suppressClick.current) return;
      onSetupCell(pos);
      return;
    }
    if (!myTurn || combatAnim) return;
    if (legalTo.has(pos) && selected !== null) { moves.move(selected, pos); setSelected(null); return; }
    const mine = G.pieces.find((p) => p.pos === pos && p.owner === me);
    const next = mine && legal.some((m) => m.from === pos) ? pos : null;
    if (next !== null) sound.select();
    setSelected(next);
  };

  // ---- leaving ----
  const [confirmLeave, setConfirmLeave] = useState(false);
  const inProgress = !spectator && !over && !inBriefing;
  const leave = () => (inProgress ? setConfirmLeave(true) : onExit());
  // resign, then leave once the result is back (an online socket closed too early would drop the resign); 1.5 s at most
  const [leaving, setLeaving] = useState(false);
  const reallyLeave = () => { setConfirmLeave(false); setLeaving(true); moves.resign(); };
  useEffect(() => {
    if (!leaving) return;
    if (over) { onExit(); return; }
    const t = setTimeout(onExit, 1500);
    return () => clearTimeout(t);
  }, [leaving, over]); // eslint-disable-line react-hooks/exhaustive-deps

  // while a duel plays, the panel still tells the moment before it: whose attack it is, no result yet
  const duelOn = !!combatAnim;
  const turnOf = duelOn && G.lastMove ? G.lastMove.player : ctx.currentPlayer;
  const shownOver = over && !duelOn;
  let banner: string;
  if (shownOver) {
    const r = G.result!;
    banner = r.winner === null ? 'Draw' : spectator ? `${name(r.winner)} wins` : r.winner === me ? 'You win' : 'You lose';
  } else if (spectator) banner = inBriefing ? 'Briefing in progress' : setup ? 'Armies deploying' : `${name(turnOf)}'s turn`;
  else if (inBriefing) banner = 'Mission briefing';
  else if (setup) banner = iAmReady ? 'Waiting for opponent…' : 'Deploy your army';
  else banner = turnOf === me ? 'Your turn' : "Opponent's turn";
  const bannerSub = shownOver ? REASON[G.result!.reason] ?? G.result!.reason : null;
  const sentence = (c: Combat) => (spectator ? combatSentenceNamed(c, { '0': name('0'), '1': name('1') }) : combatSentence(c, me));

  const sideStatus = (id: PlayerID): { text: string; go?: boolean } => {
    if (shownOver) return { text: G.result!.winner === id ? 'Victor' : G.result!.winner === null ? 'Draw' : 'Defeated', go: G.result!.winner === id };
    if (inBriefing) return { text: id === '0' ? 'Host' : names[id] ? 'Joined' : 'Awaiting' };
    if (setup) return { text: G.ready[id] ? 'Ready' : 'Deploying', go: G.ready[id] };
    return turnOf === id ? { text: 'To move', go: true } : { text: 'Waiting' };
  };
  const alive = (id: PlayerID) => 40 - G.fallen.filter((f) => f.owner === id).length;
  const viewer: PlayerID = spectator ? '0' : me;
  const movable = useMemo(() => new Set(legal.map((m) => m.from)), [legal]);

  const briefingPanel = briefing ?? <BriefingPanel turnSeconds={G.turnSeconds} waiting="Waiting for the host to start the game…" />;
  const leftPanel = inBriefing ? null
    : deploying ? (
      <Deploy me={me} placement={placement} armed={armed} presetId={presetId} complete={complete}
        trayDrop={drag?.moved && drag.src.kind === 'cell' && drag.over === 'tray'}
        onArm={onTrayKind} onTrayPointerDown={(rank, e) => { if ((remaining(placement).get(rank) ?? 0) > 0) startDrag({ kind: 'tray', rank }, rank, e); }}
        onPreset={(id) => { const p = PRESETS.find((x) => x.id === id)!; edit(presetPlacement(me, p)); setPresetId(id); }}
        onRandom={() => { edit(randomPlacement(me, Math.random)); }}
        onFill={() => { edit(fillRest(me, placement, Math.random), true); }}
        onClear={() => { edit([]); }}
        onConfirm={() => moves.submitSetup(placement)}
        layouts={{ saved, name: layoutName, setName: setLayoutName, note: layoutNote, save: saveLayout, load: loadLayout, remove: deleteLayout }} />
    ) : setup && !spectator ? (
      <section className="fls-panel" data-testid="fl-deployed">
        <div className="fls-kicker"><span>Deployment</span><span className="fls-live">Locked</span></div>
        <h2 className="fls-h mt-2">Army in position</h2>
        <p className="mt-2 text-[13px] leading-snug opacity-80">Your 40 pieces are set. The enemy's deployment stays hidden until both armies are in place.</p>
      </section>
    ) : <Forces fallen={G.fallen} me={viewer} spectator={!!spectator} name={name} />;

  // the duel outcome is not shown in the panel until the duel has played
  const shownCombat = ctx.phase === 'play' && !combatAnim ? G.lastCombat : null;
  const clockTone = left === null ? '' : left <= 10 ? 'warn' : G.turnSeconds && left / G.turnSeconds < 0.5 ? 'mid' : '';

  return (
    <main className="fls" data-testid="fl-screen">
      <div className="fls-left">{leftPanel}</div>

      <div className={`fls-board ${combatAnim ? 'fx-combat' : ''} ${combatAnim?.outcome === 'blast' ? 'fx-blast' : ''}`}
        style={combatAnim ? timelineVars(combatAnim.outcome) : undefined}>
        <Board pieces={combatAnim ? anim!.prev : pieces} me={viewer} selected={setup ? null : selected} legalTo={legalTo} movable={myTurn && selected === null ? movable : undefined}
          lastMove={ctx.phase === 'play' ? G.lastMove : null} lastCombat={ctx.phase === 'play' ? G.lastCombat : null}
          onCell={spectator ? undefined : onCell} onCellPointerDown={deploying ? onCellPointerDown : undefined}
          zone={zone} dropAt={drag?.moved && typeof drag.over === 'number' ? drag.over : null} fx={anim?.fx ?? null} />
        {inBriefing && (
          <div className="fls-brief-center" data-testid="fl-board-clear">{briefingPanel}</div>
        )}
        {combatAnim && (
          <Duel key={anim!.key} combat={combatAnim.combat} outcome={combatAnim.outcome} reduced={reduced}
            known={{
              attacker: anim!.prev.find((p) => p.id === combatAnim.combat.attacker.id)?.rank !== undefined,
              defender: anim!.prev.find((p) => p.id === combatAnim.combat.defender.id)?.rank !== undefined,
            }}
            viewer={spectator ? null : me} name={(id) => name(id)} coord={coordOf(combatAnim.combat.at)} />
        )}
        {endStamp && over && (
          <div className={`fl-end ${spectator || G.result!.winner === null ? 'neutral' : G.result!.winner === me ? 'good' : 'bad'}`} role="status">
            <b>{over && G.result!.winner === null ? 'Draw' : spectator ? `${name(G.result!.winner!)} wins` : G.result!.winner === me ? 'Victory' : 'Defeat'}</b>
            <span>{bannerSub}</span>
          </div>
        )}
      </div>

      <div className="fls-right">
        <section className="fls-panel flc" data-testid="fl-command">
          <div className="fls-cmd-head">
            <button type="button" className={`fls-btn ${inProgress ? 'danger' : ''}`} onClick={leave} data-testid="fl-resign">Leave</button>
            <span className="ml-auto"><FrontlineAudio /></span>
          </div>
          <div className="flc-strip"><span>Command</span>{playing ? <span className="fls-live">Live</span> : <span>{over ? 'Ended' : 'Standby'}</span>}</div>
          <div data-testid="fl-banner" className="flc-banner">
            <div key={banner} className={`fls-banner ${shownOver ? 'over' : !spectator && ctx.phase === 'play' && turnOf === me ? 'mine' : ''}`}>{banner}</div>
            {bannerSub && <div className="mt-1 text-[13px] opacity-85">{bannerSub}</div>}
          </div>
          <div className="flc-sides">
            {([viewer, viewer === '0' ? '1' : '0'] as PlayerID[]).map((id) => {
              const st = sideStatus(id);
              const n = ctx.phase === 'play' ? alive(id) : 40;
              return (
                <div key={id} className={`flc-side ${ctx.phase === 'play' && !shownOver && turnOf === id ? 'active' : ''}`} data-testid={`fl-side-${id}`}>
                  <Chip owner={id} size={34} />
                  <div className="min-w-0">
                    <div className="flc-side-top">
                      <span className="nm">{name(id)}{!spectator && id === me ? ' (you)' : ''}</span>
                      <span className={`tag ${st.go ? 'go' : ''}`}>{st.text}</span>
                    </div>
                    <div className="flc-strength" title={`${n} of 40 pieces left`} data-army={id === '0' ? 'olive' : 'tan'}><i style={{ width: `${(n / 40) * 100}%` }} /></div>
                  </div>
                  <span className="flc-count" title="Pieces left">{n}</span>
                </div>
              );
            })}
          </div>
          <div className="flc-gauges">
            <div className={`flc-clock ${clockTone}`} title="Turn clock">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="20" className="track" />
                <circle cx="24" cy="24" r="20" className="bar" pathLength={1}
                  style={{ strokeDashoffset: left !== null && G.turnSeconds ? 1 - left / G.turnSeconds : 0, opacity: G.turnSeconds ? 1 : 0.15 }} />
              </svg>
              <div className="flc-clock-in">
                <span data-testid={left !== null ? 'fl-clock' : undefined}>{left !== null ? clock(left) : G.turnSeconds ? clock(G.turnSeconds) : 'Off'}</span>
                <small>Turn</small>
              </div>
            </div>
            <dl className="flc-read">
              <div><dt>Elapsed</dt><dd data-testid="fl-elapsed">{elapsed !== null ? clock(elapsed) : '–:––'}</dd></div>
              <div><dt>Moves</dt><dd>{G.moves}</dd></div>
            </dl>
          </div>
          {shownCombat && <LastEngagement combat={shownCombat} me={viewer} sentence={sentence(shownCombat)} />}
          {notice && <div className="mt-3 grid gap-2">{notice}</div>}
          {shownOver && (
            <div className="mt-3 grid gap-2">
              {rematch && <button type="button" className="fls-btn primary big" data-testid="fl-rematch" onClick={rematch.onClick} disabled={rematch.waiting}>{rematch.waiting ? 'Waiting for opponent…' : 'Rematch'}</button>}
              <button type="button" className="fls-btn" data-testid="fl-exit" onClick={onExit}>Back to menu</button>
            </div>
          )}
        </section>

        {chat && !spectator && (
          <section className="fls-panel fls-chat">
            <ChatPanel {...chat} me={me} names={{ '0': name('0'), '1': name('1') }} fills={{ '0': OWNER_STYLE['0'].bg, '1': OWNER_STYLE['1'].bg }} />
          </section>
        )}
        {spectator && (
          <section className="fls-panel fls-chat fls-scroll" data-testid="fl-spectator-chat">
            <div className="fls-kicker mb-2"><span>Comms</span></div>
            {chatLines && chatLines.length > 0
              ? <ul className="grid gap-1 text-[13px] opacity-85">{chatLines.slice(-30).map((l) => <li key={l.id}><b>{name(l.sender)}:</b> {l.kind === 'emote' ? (l.label ?? l.text) : l.text}</li>)}</ul>
              : <p className="text-[13px] opacity-60">No messages yet.</p>}
          </section>
        )}
      </div>

      {drag?.moved && (
        <div className="fls-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          <Chip owner={me} rank={drag.rank} size={60} />
        </div>
      )}
      {confirmLeave && <ConfirmLeave onCancel={() => setConfirmLeave(false)} onConfirm={reallyLeave} />}
    </main>
  );
}

/** Pre-game settings: names (where this device owns them), the turn limit, and Start. */
export function BriefingPanel({ fields, turnSeconds, onTurnSeconds, start, waiting, children }: {
  fields?: { label: string; value: string; onChange: (v: string) => void; testid: string }[];
  turnSeconds: number | null;
  /** Absent: read-only (only the host changes settings). */
  onTurnSeconds?: (s: number) => void;
  start?: { onClick: () => void; disabled?: boolean; hint?: string };
  waiting?: string;
  children?: ReactNode;
}) {
  const value = turnSeconds ?? 0;
  return (
    <section className="fls-panel fls-scroll grid gap-3" data-testid="fl-briefing">
      <div>
        <div className="fls-kicker"><span>Mission briefing</span><span>Pre-game</span></div>
        <h2 className="fls-h mt-2">Game settings</h2>
      </div>
      {fields?.map((f) => (
        <label key={f.testid} className="fls-field">{f.label}
          <input className="fls-input" value={f.value} maxLength={20} onChange={(e) => f.onChange(e.target.value)} data-testid={f.testid} />
        </label>
      ))}
      <div className="fls-field">
        <span>Turn time limit</span>
        <div className="fls-seg" role="radiogroup" aria-label="Turn time limit" data-testid="fl-timer">
          {TURN_LIMITS.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={value === s} disabled={!onTurnSeconds}
              className={`fls-btn ${value === s ? 'on' : ''}`} onClick={() => onTurnSeconds?.(s)} data-testid={`fl-timer-${s}`}>
              {s ? `${s}s` : 'Off'}
            </button>
          ))}
        </div>
      </div>
      {children}
      <p className="text-[12.5px] leading-snug opacity-70">
        Once the game starts, each commander deploys 40 pieces on their own four rows. Neither side sees the other's deployment until both have confirmed.
      </p>
      {start && (
        <div className="grid gap-1">
          <button type="button" className="fls-btn primary big" data-testid="fl-start" disabled={start.disabled} onClick={start.onClick}>Start game</button>
          {start.hint && <p className="text-center text-[12.5px] opacity-70" role="status">{start.hint}</p>}
        </div>
      )}
      {waiting && <p className="rounded-md border border-[#3c4639] bg-[#161b15] px-3 py-2 text-[14px]" role="status" data-testid="fl-briefing-wait"><span className="fls-live" />{waiting}</p>}
    </section>
  );
}

/** A link with a Copy button (works on plain-http LAN addresses too, where the clipboard API is missing). */
export function CopyLink({ url, testid }: { url: string; testid: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(url);
      else {
        const t = document.createElement('textarea');
        t.value = url; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
      }
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 flex-1 select-all break-all font-mono text-[12px] opacity-85">{url}</span>
      <button type="button" className={`fls-btn shrink-0 ${copied ? 'on' : ''}`} onClick={copy} data-testid={testid}>{copied ? 'Copied' : 'Copy link'}</button>
    </div>
  );
}

interface LayoutsApi {
  saved: SavedLayout[]; name: string; setName: (s: string) => void; note: string | null;
  save: () => void; load: (s: SavedLayout) => void; remove: (nm: string) => void;
}

function Deploy({ me, placement, armed, presetId, complete, trayDrop, onArm, onTrayPointerDown, onPreset, onRandom, onFill, onClear, onConfirm, layouts }: {
  me: PlayerID; placement: Placement; armed: Rank | null; presetId: string | null; complete: boolean; trayDrop?: boolean;
  onArm: (r: Rank) => void; onTrayPointerDown: (r: Rank, e: ReactPointerEvent) => void;
  onPreset: (id: string) => void; onRandom: () => void; onFill: () => void; onClear: () => void; onConfirm: () => void; layouts: LayoutsApi;
}) {
  const left = remaining(placement);
  const placed = placement.length;
  const hint = armed !== null
    ? `Tap an empty square to place: ${kindOf(armed).name}. Tap a placed piece to send it back; hold and drag it onto another square to swap.`
    : 'All pieces placed. Hold and drag a piece onto another to swap them; tap one to send it back to the tray.';
  return (
    <section className="fls-panel fls-scroll grid content-start gap-3" data-testid="fl-deploy">
      <div>
        <div className="fls-kicker"><span>Deployment</span><span data-testid="fl-placed">{placed}/40</span></div>
        <div className="fls-meter mt-2"><i style={{ width: `${(placed / 40) * 100}%` }} /></div>
      </div>
      <div>
        <div className="fls-sub mb-1.5">Presets</div>
        <div className="fls-presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`fls-preset ${presetId === p.id ? 'on' : ''}`} onClick={() => onPreset(p.id)} title={p.blurb} data-testid={`fl-preset-${p.id}`}>
              <b>{p.name}</b><span>{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="fls-sub mb-1.5 flex items-center justify-between"><span>Tray</span>
        </div>
        <div className={`fls-tray ${trayDrop ? 'fls-tray-drop' : ''}`} data-fl-tray>
          {ARMY.map((k) => {
            const n = left.get(k.rank) ?? 0;
            return (
              <button key={String(k.rank)} type="button" className={`fls-kind ${armed === k.rank ? 'armed' : ''} ${n === 0 ? 'empty' : ''}`}
                onClick={() => onArm(k.rank)} onPointerDown={(e) => onTrayPointerDown(k.rank, e)} aria-pressed={armed === k.rank}
                data-testid={`fl-tray-${k.rank}`} title={`${k.name} (${k.rank})`}>
                <Chip owner={me} rank={k.rank} size={32} />
                <span className="nm">{k.name}</span>
                <span className="ct">×{n}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] leading-snug opacity-70" role="status">{hint}</p>
      </div>
      <div className="fls-actions grid grid-cols-3 gap-1.5">
        <button type="button" className="fls-btn" data-testid="fl-randomize" onClick={onRandom}>Random</button>
        <button type="button" className="fls-btn" data-testid="fl-fill" onClick={onFill} disabled={placed === 40}>Fill rest</button>
        <button type="button" className="fls-btn" data-testid="fl-clear" onClick={onClear} disabled={placed === 0}>Clear</button>
      </div>
      <details className="text-[13px]" data-testid="fl-layouts">
        <summary className="fls-sub cursor-pointer">Saved layouts</summary>
        <div className="mt-2 grid gap-1.5">
          <div className="flex gap-1.5">
            <input className="fls-input min-w-0 flex-1 text-[14px]" placeholder="Layout name" maxLength={16}
              value={layouts.name} onChange={(e) => layouts.setName(e.target.value)} data-testid="fl-layout-name" />
            <button type="button" className="fls-btn" data-testid="fl-save-layout" onClick={layouts.save} disabled={!complete}>Save</button>
          </div>
          {layouts.saved.map((s) => (
            <span key={s.name} className="flex items-center gap-1">
              <button type="button" className="fls-btn flex-1" data-testid="fl-load-layout" onClick={() => layouts.load(s)}>Load {s.name}</button>
              <button type="button" className="px-2 opacity-70" aria-label={`Delete ${s.name}`} onClick={() => layouts.remove(s.name)}>✕</button>
            </span>
          ))}
          {layouts.note && <span className="text-[12px] opacity-70" role="status">{layouts.note}</span>}
        </div>
      </details>
      {complete && (
        <div className="fls-confirm">
          <button type="button" className="fls-btn primary big" data-testid="fl-ready" onClick={onConfirm}>Confirm deployment</button>
        </div>
      )}
    </section>
  );
}

/** Pieces left per rank, both sides (losses are public: combat reveals both ranks). */
function Forces({ fallen, me, spectator, name }: { fallen: FrontlineView['fallen']; me: PlayerID; spectator: boolean; name: (id: string) => string }) {
  const foe: PlayerID = me === '0' ? '1' : '0';
  const lost = (owner: PlayerID, rank: Rank) => fallen.filter((f) => f.owner === owner && f.rank === rank).length;
  const total = (owner: PlayerID) => 40 - fallen.filter((f) => f.owner === owner).length;
  const [a, b] = [total(me), total(foe)];
  const mineLabel = spectator ? name(me) : 'Yours';
  const theirLabel = spectator ? name(foe) : 'Theirs';
  const col = (owner: PlayerID, k: (typeof ARMY)[number], testid: string) => {
    const left = k.count - lost(owner, k.rank);
    return (
      <span className={`flf-col ${left === 0 ? 'out' : ''}`} data-testid={testid}>
        <span className="flf-pips" data-army={owner === '0' ? 'olive' : 'tan'} aria-hidden="true">
          {Array.from({ length: k.count }, (_, i) => <i key={i} className={i < left ? 'on' : ''} />)}
        </span>
        <span className="flf-n">{left}/{k.count}</span>
      </span>
    );
  };
  return (
    <section className="fls-panel fls-scroll flf" data-testid="fl-fallen">
      <div className="fls-kicker"><span>Forces</span><span>{fallen.length} fallen</span></div>
      <div className="flf-balance" title={`${mineLabel} ${a}, ${theirLabel} ${b}`}>
        <div className="flf-bal-top"><span>{mineLabel} <b>{a}</b></span><span><b>{b}</b> {theirLabel}</span></div>
        <div className="flf-bar">
          <i data-army={me === '0' ? 'olive' : 'tan'} style={{ flexGrow: a }} />
          <i data-army={foe === '0' ? 'olive' : 'tan'} style={{ flexGrow: b }} />
        </div>
      </div>
      <ul className="flf-list">
        {ARMY.map((k) => {
          const gone = lost(me, k.rank) === k.count && lost(foe, k.rank) === k.count;
          return (
            <li key={String(k.rank)} className={`flf-row ${gone ? 'gone' : ''}`}>
              <Chip owner={me} rank={k.rank} size={34} />
              <span className="flf-name">{k.name}</span>
              {col(me, k, `fl-left-mine-${k.rank}`)}
              {col(foe, k, `fl-left-theirs-${k.rank}`)}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The latest fight in small: both tiles, the losers struck through. */
function LastEngagement({ combat, me, sentence }: { combat: Combat; me: PlayerID; sentence: string }) {
  const o = combatOutcome(combat);
  const lost = (role: 'attacker' | 'defender') =>
    o === 'trade' || (role === 'attacker' ? o === 'repel' || o === 'blast' : o === 'win' || o === 'defuse' || o === 'capture');
  const tile = (role: 'attacker' | 'defender') => (
    <span className={`flc-eng-tile ${lost(role) ? 'lost' : ''}`}><Chip owner={combat[role].owner} rank={combat[role].rank} size={36} /></span>
  );
  const won = o === 'trade' ? null : lost('attacker') ? combat.defender.owner : combat.attacker.owner;
  return (
    <div className="flc-eng" data-testid="fl-last-combat">
      <div className="fls-sub">Last engagement <span className="normal-case tracking-normal opacity-70">at {coordOf(combat.at)}</span></div>
      <div className="flc-eng-row">
        {tile('attacker')}
        <svg viewBox="0 0 20 20" className="flc-eng-x" aria-hidden="true"><path d="M3 3 L17 17 M17 3 L3 17" /></svg>
        {tile('defender')}
        <span className={`flc-eng-v ${won === null ? '' : won === me ? 'good' : 'bad'}`}>{verdict(combat, o).main}</span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug opacity-75">{sentence}</p>
    </div>
  );
}

/** In-page confirmation (no browser dialog): leaving a game in progress resigns it. */
function ConfirmLeave({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/55 p-4 backdrop-blur-[2px]" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-label="Leave the game?" data-testid="confirm-leave" onClick={(e) => e.stopPropagation()}
        className="fls-panel w-[380px] max-w-full p-5">
        <div className="fls-kicker"><span>Abort mission</span></div>
        <h2 className="fls-h mt-2">Leave the game?</h2>
        <p className="mt-2 text-[14.5px] leading-snug opacity-85">
          Leaving counts as resigning: your opponent wins, this game can’t be resumed, and you go back to the Frontline menu.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus className="fls-btn" onClick={onCancel} data-testid="stay-in-game">Stay</button>
          <button type="button" className="fls-btn primary !border-[#d6452f] !bg-[#8e2d24]" onClick={onConfirm} data-testid="confirm-leave-yes">Leave</button>
        </div>
      </div>
    </div>
  );
}
