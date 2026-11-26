import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import {
  PIECE_NAME, anchors, canPlace, cellsOf, guildsOf, hasMove, hostSeat, orientations, type Action, type BEvent, type BView, type Guild, type PieceId, type Place, type Reason,
} from '@boboland/shared/src/blocky';
import type { ChatLine, ChatPayload } from '../lib/chat';
import { Sky } from './art/sky';
import { SkyFront } from './art/skyfront';
import { Icon } from './art/icons';
import { ShelfPiece } from './art/blocks';
import { BoardView, boardBox, type GhostShow } from './Board';
import { Banner, LogPanel, StatusLine } from './Hud';
import { Crest } from './art/crests';
import { Shelf } from './Shelf';
import { banners, fitSets, noRoomOf, progressOf } from './derive';
import { GUILD_NAME, REASON_LINE, nameOf, statusLine } from './text';
import { badCells, cellAt, fitCycle, ghostCell, keepPending, needsConfirm, originAt, snap, tapAnchor, type Pending, type Pt } from './input';
import { flipOrient, rotateOrient } from './geom';
import { suggestPending } from './usePending';
import { useSettings, setSetting } from './settings';
import { useBlockyFx } from './useBlockyFx';
import { ambience, land, sfx, stopAmbience } from './sound';
import { BoardFx } from './BoardFx';
import { Moments } from './Moments';
import { BlyChat, useChatBubbles } from './Chat';
import { SettingsPanel } from './SettingsPanel';
import { Result } from './Result';
import { CoachMark, useCoach } from './Coach';

export interface ScreenProps {
  view: BView; me: string | null; names: Record<string, string>; kind: 'online' | 'local' | 'bot' | 'watch';
  connected?: Record<string, boolean>; send?: (a: Action) => void; resign?: () => void; dismiss?: (p: string) => void;
  chat?: { lines: ChatLine[]; send: (p: ChatPayload) => void }; onExit: () => void;
  again?: { label: string; onClick: () => void; disabled?: boolean }; onBusy?: (b: boolean) => void;
}
interface Held { piece: PieceId; orient: number }
interface Hover { origin: Pt; place: Place | null; near: Place; bad: number[]; reason: Reason | null }
declare global { interface Window { __blyFrames?: number[] } }

/** The guild a seat plans with: the one to place if it is theirs, else their next guild still building. */
function planGuild(v: BView, me: string | null): Guild | null {
  if (me === null) return null;
  if (v.actor === me && !v.result) return v.current;
  const own = guildsOf(v, me).filter((g) => !v.grounded.includes(g));
  if (!own.length) return null;
  const order = v.guilds, i = order.indexOf(v.current);
  for (let k = 1; k <= order.length; k++) { const g = order[(i + k) % order.length]; if (own.includes(g)) return g; }
  return own[0];
}
const cellPx = () => (typeof window === 'undefined' ? 15 : window.innerWidth < window.innerHeight ? 14 : window.innerHeight >= 1000 ? 21 : window.innerHeight >= 880 ? 17 : window.innerHeight >= 800 ? 15 : 13);

/** The game screen for every mode: the plateau, banners, status line, shelf, and all the input. */
export function BlyScreen(props: ScreenProps) {
  const { view, me, names, kind } = props;
  const [rise, setRise] = useState(0);
  const fx = useBlockyFx(view, me, (e, _d, a) => {
    // sounds ride the public log, like the animations: landings at the moment the blocks land
    if (e.k === 'turn' && e.actor === me) { setRise(Date.now()); sfx('turn'); }
    else if (e.k === 'place') setTimeout(() => land(e.guild, e.points), a.land);
    else if (e.k === 'stuck') sfx('stuck');
    else if (e.k === 'end') sfx('win');
  });
  useEffect(() => { if (!rise) return; const t = setTimeout(() => setRise(0), 950); return () => clearTimeout(t); }, [rise]);
  const d = fx.d;
  const settings = useSettings();
  const myTurn = me !== null && !d.result && d.actor === me;
  const canAct = myTurn && !fx.busy;
  const pg = planGuild(d, me);
  const shelfGuild = pg ?? d.current;
  const [held, setHeld] = useState<Held | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pointer, setPointer] = useState<string>('mouse');
  const [reason, setReason] = useState<{ text: string; bad: number[]; t: number } | null>(null);
  const [notice, setNotice] = useState('');
  const [flash, setFlash] = useState<number | null>(null);
  const [inspect, setInspect] = useState<number | null>(null);
  const [vHeld, setVHeld] = useState(false);
  const [openMini, setOpenMini] = useState<string | null>(null);
  const [panel, setPanel] = useState<'' | 'settings' | 'done' | 'leave' | 'chat'>('');
  const [sentAt, setSentAt] = useState(-1);
  const [cell, setCell] = useState(cellPx);
  const coach = useCoach();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const ghostRef = useRef<SVGGElement | null>(null);
  const drag = useRef<{ id: number; type: string; x: number; y: number; moved: boolean; fromShelf: boolean; startT: number; px: number; py: number; dirty: boolean } | null>(null);
  const raf = useRef(0);
  const lastFrame = useRef(0);
  const clean = settings.clean || vHeld;
  const progress = progressOf(d);
  const busy = fx.busy || sentAt === d.logTotal;
  useEffect(() => { props.onBusy?.(fx.busy); }, [fx.busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const r = () => setCell(cellPx()); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, []);
  useEffect(() => { ambience(progress); }, [Math.round(progress * 20)]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopAmbience(), []);

  // a held piece belongs to the guild we plan with; it goes back if that guild changes or the piece is gone
  useEffect(() => { setHeld((h) => (h && d.shelf[shelfGuild]?.includes(h.piece) ? h : null)); setHover(null); }, [shelfGuild, d.logTotal]); // eslint-disable-line react-hooks/exhaustive-deps
  // the pending ghost is re-checked on every display change and dropped with a notice if it no longer holds
  useEffect(() => {
    setPending((p) => {
      const k = keepPending(p, d, me, fx.jumped);
      if (p && !k) setNotice(fx.jumped ? 'Caught up with the game: your piece went back to the shelf' : d.actor !== me ? 'The turn moved on: your piece went back to the shelf' : 'That spot was taken: your piece went back to the shelf');
      return k;
    });
  }, [d, fx.jumped]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(''), 2600); return () => clearTimeout(t); }, [notice]);
  useEffect(() => { if (!reason) return; const t = setTimeout(() => setReason(null), 2600); return () => clearTimeout(t); }, [reason]);
  useEffect(() => { if (flash === null) return; const t = setTimeout(() => setFlash(null), 1500); return () => clearTimeout(t); }, [flash]);

  const live = useMemo(() => (pg ? anchors(d, pg) : []), [d, pg]);
  const sets = useMemo(() => (held && pg ? fitSets(d, pg, held.piece, held.orient) : null), [d, pg, held]);
  const noRoom = useMemo(() => (pg ? noRoomOf(d, pg) : new Set<PieceId>()), [d, pg]);

  const box = boardBox(d.size);
  const pointCell = (x: number, y: number) => { const el = svgRef.current; if (!el) return null; const r = el.getBoundingClientRect(); return cellAt({ x, y }, { left: r.left, top: r.top, width: r.width, height: r.height }, box); };
  const pxPerCell = () => { const el = svgRef.current; if (!el) return 40; const r = el.getBoundingClientRect(); return Math.min(r.width / box.w, r.height / box.h); };
  const inBoard = (p: Pt) => p.r > -1.5 && p.c > -1.5 && p.r < d.size + 1.5 && p.c < d.size + 1.5;

  /** Recompute the ghost for a pointer position; the transform is written straight to the DOM (no React render per move). */
  const track = useCallback((x: number, y: number, type: string) => {
    if (!held || !pg) return;
    const f = pointCell(x, y);
    if (!f || !inBoard(f)) { setHover(null); return; }
    const g = ghostCell(f, type, pxPerCell());
    const origin = originAt(g, held.piece, held.orient);
    const place = snap(d, pg, held.piece, held.orient, origin);
    const at = place ? { r: Math.floor(place.at / d.size), c: place.at % d.size } : origin;
    ghostRef.current?.setAttribute('transform', `translate(${at.c} ${at.r})`);
    const near = { piece: held.piece, orient: held.orient, at: Math.round(origin.r) >= 0 && Math.round(origin.c) >= 0 && Math.round(origin.r) < d.size && Math.round(origin.c) < d.size ? Math.round(origin.r) * d.size + Math.round(origin.c) : -1 };
    setHover((h) => {
      const key = `${place?.at ?? 'x'}|${near.at}|${held.orient}|${held.piece}`;
      const old = h ? `${h.place?.at ?? 'x'}|${h.near.at}|${h.near.orient}|${h.near.piece}` : '';
      if (key === old) return h; // same cells: no React render, the rAF transform alone moves the ghost
      const b = place ? { cells: [] as number[], reason: null } : badCells(d, pg, near, origin);
      if (place && !h?.place) sfx('snap');
      return { origin, place, near, bad: b.cells, reason: b.reason };
    });
  }, [held, pg, d]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackRef = useRef(track);
  trackRef.current = track;
  const send = (p: Place) => { props.send?.({ k: 'place', ...p }); setSentAt(d.logTotal); setHeld(null); setHover(null); setPending(null); };
  /** A drop (or a tap, or Enter): pending or commit by the drop's pointer type, never an illegal move. */
  const drop = (place: Place | null, near: Place | null, type: string) => {
    if (!pg || !held) return;
    if (!myTurn) { setReason({ text: REASON_LINE.notYours, bad: [], t: Date.now() }); return; }
    if (busy) return;
    if (place && !canPlace(d, pg, place)) {
      if (needsConfirm(settings.confirm, type)) { setPending({ guild: pg, place, pointerType: type }); setHover(null); } else send(place);
      return;
    }
    const why = near && near.at >= 0 ? canPlace(d, pg, near) : 'offBoard';
    const b = near ? badCells(d, pg, near, { r: Math.floor(near.at / d.size), c: near.at % d.size }) : { cells: [] };
    setReason({ text: REASON_LINE[why ?? 'offBoard'], bad: b.cells, t: Date.now() });
    sfx('invalid');
  };

  // ---- pointer: shelf pick, drag, tap ----
  const startDrag = (e: RPointerEvent<Element>, fromShelf: boolean) => {
    drag.current = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, moved: false, fromShelf, startT: performance.now(), px: e.clientX, py: e.clientY, dirty: false };
    setPointer(e.pointerType);
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    window.__blyFrames = [];
    lastFrame.current = 0;
    // one rAF loop for the whole drag: pointer moves only store the position; each frame applies the latest one
    cancelAnimationFrame(raf.current);
    const loop = (now: number) => {
      const g = drag.current;
      if (!g) return;
      if (lastFrame.current) window.__blyFrames?.push(now - lastFrame.current);
      lastFrame.current = now;
      if (g.moved && g.dirty) { g.dirty = false; trackRef.current(g.px, g.py, g.type); }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const onPick = (id: PieceId, e: RPointerEvent<HTMLButtonElement>) => {
    if (!pg || d.result) return;
    setPending(null);
    setHeld((h) => (h?.piece === id ? h : { piece: id, orient: 0 }));
    sfx('pick');
    startDrag(e, true);
  };
  const onBoardDown = (e: RPointerEvent<SVGSVGElement>) => {
    setPointer(e.pointerType);
    if (pending) {
      const f = pointCell(e.clientX, e.clientY);
      const hit = f && cellsOf(d.size, pending.place).includes(Math.floor(f.r) * d.size + Math.floor(f.c));
      if (hit) { startDrag(e, false); return; }
    }
    if (held) { startDrag(e, false); track(e.clientX, e.clientY, e.pointerType); return; }
    if (e.pointerType !== 'mouse') {
      // long press to inspect a placed piece
      const f = pointCell(e.clientX, e.clientY);
      const t = setTimeout(() => { if (f) { const i = Math.floor(f.r) * d.size + Math.floor(f.c); if (d.cells[i] >= 0) setInspect(d.cells[i]); } }, 450);
      const up = () => { clearTimeout(t); window.removeEventListener('pointerup', up); setTimeout(() => setInspect(null), 1600); };
      window.addEventListener('pointerup', up);
    }
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const g = drag.current;
      if (!g || e.pointerId !== g.id) return;
      if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) { g.moved = true; if (pending) { setHeld({ piece: pending.place.piece, orient: pending.place.orient }); setPending(null); } }
      if (!g.moved) return;
      g.px = e.clientX; g.py = e.clientY; g.dirty = true;
    };
    const up = (e: PointerEvent) => {
      const g = drag.current;
      if (!g || e.pointerId !== g.id) return;
      drag.current = null;
      cancelAnimationFrame(raf.current);
      const f = pointCell(e.clientX, e.clientY);
      if (!g.moved) {
        if (g.fromShelf || !f) return; // a tap on the shelf just picks the piece up
        const i = Math.floor(f.r) * d.size + Math.floor(f.c);
        if (pending && cellsOf(d.size, pending.place).includes(i)) { if (myTurn && !busy) send(pending.place); return; }
        if (!held || !pg) return;
        if (live.includes(i)) { const p = tapAnchor(d, pg, held.piece, held.orient, i); if (p) { sfx('corner'); drop(p, p, g.type); return; } }
        const o = originAt(f, held.piece, held.orient);
        drop(snap(d, pg, held.piece, held.orient, o), { piece: held.piece, orient: held.orient, at: Math.round(o.r) * d.size + Math.round(o.c) }, g.type);
        return;
      }
      if (!f || !inBoard(f) || !held || !pg) { setHover(null); return; }
      const o = originAt(ghostCell(f, g.type, pxPerCell()), held.piece, held.orient);
      const r0 = Math.round(o.r), c0 = Math.round(o.c);
      drop(snap(d, pg, held.piece, held.orient, o), { piece: held.piece, orient: held.orient, at: r0 >= 0 && c0 >= 0 && r0 < d.size && c0 < d.size ? r0 * d.size + c0 : -1 }, g.type);
      setHover(null);
    };
    const cancel = (e: PointerEvent) => { if (drag.current?.id === e.pointerId) { drag.current = null; setHover(null); } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // mouse hover: the ghost follows a held piece; with empty hands a placed piece shows its tag
  const onBoardMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (e.pointerType !== 'mouse' || drag.current) return;
    if (held && !pending) { track(e.clientX, e.clientY, 'mouse'); return; }
    const f = pointCell(e.clientX, e.clientY);
    const i = f && f.r >= 0 && f.c >= 0 && f.r < d.size && f.c < d.size ? Math.floor(f.r) * d.size + Math.floor(f.c) : -1;
    setInspect(i >= 0 && d.cells[i] >= 0 ? d.cells[i] : null);
  };
  const onBoardLeave = () => { if (!drag.current) { setHover(null); setInspect(null); } };

  // ---- keys ----
  const turn = (f: (p: PieceId, o: number) => number) => {
    sfx(f === flipOrient ? 'flip' : 'rotate');
    if (pending) { setHeld({ piece: pending.place.piece, orient: f(pending.place.piece, pending.place.orient) }); setPending(null); return; }
    setHeld((h) => (h ? { ...h, orient: f(h.piece, h.orient) } : h));
  };
  const suggest = () => { if (!myTurn || busy || !me || !d.hints) return; const p = suggestPending(d, me); if (p) { setHeld({ piece: p.place.piece, orient: p.place.orient }); setPending(p); setHover(null); } };
  const kbGhost = useRef<Pt>({ r: Math.floor(d.size / 2), c: Math.floor(d.size / 2) });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.repeat && e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const k = e.key.toLowerCase();
      const onBoard = document.activeElement === svgRef.current;
      if (onBoard && (k.startsWith('arrow') || k === ' ' || k === 'enter')) setPointer('keyboard');
      if (k === 'r') turn(rotateOrient);
      else if (k === 'f') turn(flipOrient);
      else if (k === 'v') setVHeld(true);
      else if (k === 's') suggest();
      else if (k === 'd' && myTurn) setPanel('done');
      else if (k === 'escape') { setHeld(null); setPending(null); setHover(null); setPanel(''); }
      else if (k === 'enter' && pending) { e.preventDefault(); if (myTurn && !busy) send(pending.place); }
      else if (onBoard && held && pg && (k.startsWith('arrow') || k === ' ' || k === 'enter')) {
        e.preventDefault();
        const g = kbGhost.current;
        if (k === 'arrowup') g.r = Math.max(0, g.r - 1); if (k === 'arrowdown') g.r = Math.min(d.size - 1, g.r + 1);
        if (k === 'arrowleft') g.c = Math.max(0, g.c - 1); if (k === 'arrowright') g.c = Math.min(d.size - 1, g.c + 1);
        const origin = { r: g.r, c: g.c };
        if (k === ' ') {
          // cycle only the orientations that fit at the nearest open corner
          const near = live.reduce((b, a) => { const dd = (x: number) => Math.hypot(Math.floor(x / d.size) - g.r, (x % d.size) - g.c); return b < 0 || dd(a) < dd(b) ? a : b; }, -1);
          const list = near >= 0 ? fitCycle(d, pg, held.piece, near) : [];
          if (list.length) {
            const cur = hover?.place ? list.findIndex((p) => p.at === hover.place!.at && p.orient === hover.place!.orient) : -1;
            const nx = list[(cur + 1) % list.length];
            setHeld({ piece: nx.piece, orient: nx.orient });
            g.r = Math.floor(nx.at / d.size); g.c = nx.at % d.size;
            setHover({ origin: { r: g.r, c: g.c }, place: nx, near: nx, bad: [], reason: null });
            ghostRef.current?.setAttribute('transform', `translate(${g.c} ${g.r})`);
          }
          return;
        }
        if (k === 'enter') { drop(hover?.place ?? null, hover?.near ?? null, 'keyboard'); return; }
        const place = snap(d, pg, held.piece, held.orient, origin);
        const near = { piece: held.piece, orient: held.orient, at: g.r * d.size + g.c };
        const b = place ? { cells: [], reason: null } : badCells(d, pg, near, origin);
        setHover({ origin, place, near, bad: b.cells, reason: b.reason });
      }
    };
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'v') setVHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  });
  useEffect(() => { // dblclick commits a pending piece for mice
    const el = svgRef.current; if (!el) return;
    const dbl = () => { if (pending && myTurn && !busy) send(pending.place); };
    el.addEventListener('dblclick', dbl); return () => el.removeEventListener('dblclick', dbl);
  });

  // ---- what the ghost shows ----
  let ghost: GhostShow | null = null;
  if (pending) ghost = { guild: pending.guild, piece: pending.place.piece, orient: pending.place.orient, r: Math.floor(pending.place.at / d.size), c: pending.place.at % d.size, legal: true, pending: true };
  else if (held && hover && pg) {
    const p = hover.place;
    const at = p ? { r: Math.floor(p.at / d.size), c: p.at % d.size } : hover.origin;
    ghost = { guild: pg, piece: held.piece, orient: held.orient, r: at.r, c: at.c, legal: !!p, bad: hover.bad };
  }
  const badShow = reason && Date.now() - reason.t < 2000 ? reason.bad : [];
  if (ghost && badShow.length) ghost = { ...ghost, bad: [...(ghost.bad ?? []), ...badShow] };
  const anchorShow = pg && me !== null && !d.result && (myTurn || held) && (held || settings.corners)
    ? { guild: pg, cells: live, fit: pending ? undefined : sets?.fit, fitNow: pending ? undefined : sets?.now, idle: !myTurn || !!pending } : null;

  // ---- HUD data ----
  const bs = banners(d, me, names, props.connected);
  const bubbles = useChatBubbles(props.chat?.lines ?? []);
  const st0 = statusLine(d, me, { held: !!held, pending: !!pending, pointer, names, fits: !!(held && hover?.place) });
  const fitting = pg && myTurn ? d.shelf[pg].filter((x) => !noRoom.has(x)) : [];
  const st = st0.step === 0 && fitting.length === 1 ? { ...st0, sub: `Only your ${PIECE_NAME[fitting[0]]} fits now: pick it` } : st0;
  const myLive = pg && myTurn ? live.length : 99;
  const standing = useMemo(() => (d.result || !d.placed.length ? [] : d.guilds.filter((g) => !d.grounded.includes(g) && hasMove(d, g))), [d]);
  const lastStanding = standing.length === 1;
  const host = hostSeat(d);
  const ownShelfIdle = me !== null && d.board === 'classic' && guildsOf(d, me).length === 2 ? guildsOf(d, me).find((g) => g !== shelfGuild && !d.grounded.includes(g)) : undefined;
  const pickLog = (e: BEvent) => { if (e.k !== 'place') return; const i = d.placed.findIndex((q) => q.guild === e.guild && q.piece === e.piece && q.at === e.at); if (i >= 0) setFlash(i); };
  const leave = () => (kind === 'watch' || d.result || !props.resign ? props.onExit() : setPanel('leave'));
  const offline = me === host ? d.order.filter((p) => p !== me && !d.out.includes(p) && !d.bots[Number(p)] && props.connected?.[p] === false) : [];
  const away = useAway(offline);

  return (
    <div className={`blocky bly-game${clean ? ' bly-clean' : ''}${myTurn ? ' bly-myturn' : ''}${rise ? ' bly-rise bly-rise-board' : ''}`} data-testid="bly-game">
      <Sky progress={clean ? 0.3 : progress} className="bly-ambient" />
      <div className="bly-bar">
        <span className="bly-brand bly-brass"><ShelfPiece guild="sun" piece="T4" orient={2} cell={9} className="bly-brand-mark" /><span className="bly-brand-word">Blocky</span></span>
        <button type="button" className="bly-key bly-key-icon" aria-label={kind === 'watch' ? 'Stop watching' : 'Leave the game'} onClick={leave} data-testid="bly-leave"><Icon name="leave" /></button>
        <button type="button" className="bly-key bly-key-icon" aria-label="Settings" onClick={() => setPanel(panel === 'settings' ? '' : 'settings')} data-testid="bly-settings"><Icon name="settings" /></button>
        <SoundKey />
      </div>
      <aside className="bly-left">
        <div className="bly-banners">
          {bs.map((b) => <Banner key={b.key} b={b} open={openMini === b.key} onToggle={() => setOpenMini(openMini === b.key ? null : b.key)} bubble={bubbles[b.key]} />)}
        </div>
        {away.map((p) => (
          <div key={p} className="bly-away bly-brass" role="status">{nameOf(names, p)} has been away a while
            <button type="button" className="bly-key bly-key-sm" onClick={() => props.dismiss?.(p)} data-testid={`bly-dismiss-${p}`}>Send {nameOf(names, p)} home</button></div>
        ))}
        <LogPanel log={d.log} names={names} onPick={pickLog} tappable={(e) => e.k === 'place'}
          action={kind === 'online' || (kind === 'watch' && props.chat) ? <button type="button" className="bly-key bly-key-sm bly-key-icon" aria-label="Chat" onClick={() => setPanel(panel === 'chat' ? '' : 'chat')} data-testid="bly-chat"><Icon name="chat" /></button> : undefined} />
      </aside>
      <main className="bly-stage">
        <BoardView ref={svgRef} view={d} names={names} progress={progress} anchors={anchorShow} ghost={ghost} ghostRef={ghostRef} flash={flash}
          inspect={inspect !== null && !held ? { index: inspect } : null} clean={clean} hide={fx.hide}
          onPointerDown={onBoardDown} onPointerMove={onBoardMove} onPointerLeave={onBoardLeave}
          pendingKeys={<>
            <button type="button" className="bly-key bly-key-go" aria-label="Build here" onClick={() => pending && myTurn && !busy && send(pending.place)} data-testid="bly-confirm"><Icon name="confirm" size={28} /></button>
            <button type="button" className="bly-key" aria-label="Put it back" onClick={() => { setPending(null); }} data-testid="bly-cancel"><Icon name="cancel" size={28} /></button>
          </>}
          fx={<BoardFx anims={fx.anims} />} />
        <Moments anims={fx.anims} me={me} names={names} view={d} local={kind === 'local'} />
        {!clean && <SkyFront />}
        {lastStanding && <div className={`bly-lastbuilder bly-brass bly-g-${standing[0]}`} role="status" data-testid="bly-lastbuilder"><Crest guild={standing[0]} size={30} />Last builder standing · {GUILD_NAME[standing[0]]}</div>}
      </main>
      <aside className="bly-side">
        <StatusLine guild={st.guild} text={st.text} sub={st.sub} step={st.step} avatar={st.avatar} thinking={st.thinking} alert={reason?.text ?? (notice || undefined)} />
        {d.hints && myTurn && myLive <= 3 && myLive > 0 && pg && d.placed.filter((q) => q.guild === pg).length >= 3 && <p className="bly-hint bly-cloud bly-hint-dock" role="note">Only {myLive} open {myLive === 1 ? 'corner' : 'corners'} left: build where no one can block you.</p>}
        <Shelf guild={shelfGuild} pieces={d.shelf[shelfGuild] ?? []} held={held} noRoom={noRoom} cell={(d.shelf[shelfGuild]?.length ?? 0) > 14 && cell <= 15 ? 12 : cell} grounded={d.grounded.includes(shelfGuild) && !d.result}
          title={me === null ? `${GUILD_NAME[shelfGuild]} pieces` : myTurn ? `${GUILD_NAME[shelfGuild]} pieces` : `${GUILD_NAME[shelfGuild]} · plan ahead`}
          idle={ownShelfIdle ? { guild: ownShelfIdle, pieces: d.shelf[ownShelfIdle] } : null}
          onPick={me !== null && pg ? onPick : undefined} onKeyPick={me !== null && pg ? (id) => setHeld((h) => (h?.piece === id ? null : { piece: id, orient: 0 })) : undefined}>
          {me !== null && !d.result && (
            <div className="bly-tools">
              <button type="button" className="bly-key" onClick={() => turn(rotateOrient)} disabled={!held} data-testid="bly-rotate"><Icon name="rotate" />Rotate<span className="bly-kbd">R</span></button>
              <button type="button" className="bly-key" onClick={() => turn(flipOrient)} disabled={!held} data-testid="bly-flip"><Icon name="flip" />Flip<span className="bly-kbd">F</span></button>
              <button type="button" className="bly-key" onClick={suggest} disabled={!myTurn || busy || !d.hints} title={d.hints ? 'Suggest a move' : 'Hints are off in this game'} data-testid="bly-suggest"><Icon name="suggest" />Suggest<span className="bly-kbd">S</span></button>
              <button type="button" className="bly-key" aria-pressed={settings.clean} onClick={() => setSetting('clean', !settings.clean)} data-testid="bly-clean"><Icon name="eye" />View<span className="bly-kbd">V</span></button>
              <button type="button" className="bly-key" onClick={() => setPanel('done')} disabled={!myTurn || busy || d.seats[d.current] === 'shared'} data-testid="bly-done"><Icon name="done" />Done<span className="bly-kbd">D</span></button>
            </div>
          )}
        </Shelf>
        {coach.mark && myTurn && kind !== 'watch' && <CoachMark mark={coach.mark} next={coach.next} skip={coach.skip} />}
      </aside>
      {panel === 'settings' && <SettingsPanel onClose={() => setPanel('')} />}
      {panel === 'chat' && props.chat && <BlyChat lines={props.chat.lines} send={props.chat.send} names={names} readOnly={kind === 'watch'} onClose={() => setPanel('')} />}
      {panel === 'done' && (
        <Confirm title="Done building?" text={`Your ${guildsOf(d, me ?? '').map((g) => GUILD_NAME[g]).join(' and ')} ${guildsOf(d, me ?? '').length > 1 ? 'guilds stop' : 'guild stops'} building now. Pieces left on the shelf still cost a point per square.`}
          yes="I’m done building" no="Keep building" onYes={() => { props.send?.({ k: 'done' }); setPanel(''); }} onNo={() => setPanel('')} />
      )}
      {panel === 'leave' && (
        <Confirm title="Leave this game?" text="Your guilds are grounded and you rank last. The others play on." yes="Leave the isle" no="Stay" danger
          onYes={() => { props.resign?.(); setPanel(''); props.onExit(); }} onNo={() => setPanel('')} />
      )}
      {d.result && !fx.busy && <Result view={d} me={me} names={names} again={props.again} onExit={props.onExit} />}
      <span hidden data-testid="bly-turn" data-actor={d.actor} />
    </div>
  );
}

/** Seats that have been offline for 30 s (the host may send them home). */
function useAway(offline: string[]): string[] {
  const since = useRef<Record<string, number>>({});
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 5000); return () => clearInterval(t); }, []);
  const now = Date.now();
  for (const p of Object.keys(since.current)) if (!offline.includes(p)) delete since.current[p];
  for (const p of offline) since.current[p] ??= now;
  return offline.filter((p) => now - since.current[p] >= 30_000);
}

/** A themed confirm: a stone slab with two carved keys. */
export function Confirm({ title, text, yes, no, onYes, onNo, danger }: { title: string; text: string; yes: string; no: string; onYes: () => void; onNo: () => void; danger?: boolean }) {
  return (
    <div className="bly-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bly-modal-card bly-stone">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="bly-modal-keys">
          <button type="button" className="bly-key" onClick={onNo} autoFocus>{no}</button>
          <button type="button" className={`bly-key ${danger ? 'bly-key-danger' : 'bly-key-go'}`} onClick={onYes} data-testid="bly-confirm-yes">{yes}</button>
        </div>
      </div>
    </div>
  );
}

/** Quick sound toggle in the top bar (the full volume sliders live in Settings). */
function SoundKey() {
  const [on, setOn] = useState(() => localStorage.getItem('bly.muted') !== 'true');
  return (
    <button type="button" className="bly-key bly-key-icon" aria-pressed={!on} aria-label={on ? 'Mute sound' : 'Turn sound on'}
      onClick={() => { const n = !on; setOn(n); localStorage.setItem('bly.muted', String(!n)); window.dispatchEvent(new Event('bly-sound')); }}>
      <Icon name="sound" />{!on && <span className="bly-muted-slash" aria-hidden />}
    </button>
  );
}
