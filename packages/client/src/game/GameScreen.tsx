import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { ROUTE_BY_ID, legalActions, type BotLevel, type Card, type LogEntry, type Ticket } from '@boboland/shared';
import { SKIN, cityName } from '../lib/skin';
import { MapView } from '../board/MapView';
import { claimableRoutes, finalTurnsDone, handList, handSize, paymentOptionsFor, ticketStatus, whyNot, type Turn } from './selectors';
import { CardBack, CardTile, HandCard, TicketBack } from './CardFace';
import { TicketCard } from './TicketCard';
import { ClaimPicker } from './ClaimPicker';
import { TicketChooser } from './TicketChooser';
import { GameOver, type NewGame } from './GameOver';
import { FinaleOverlay, useFinale } from './ScoreCount';
import { finaleInput, finaleScript } from './finale';
import { reducedMotion } from './Roll';
import { RESHUFFLE_BACKS_MS, RESHUFFLE_MS } from '../lib/reshuffle';
import { Bubble, useBubble } from './Bubble';
import { Stopwatch } from './Stopwatch';
import { busyRemaining, flyCard, markBusy, revealThenFly, showcase } from './fx';
import { claimTiming } from '../board/claimFx';
import { HowToPlay } from './HowToPlay';
import { PrintSheet } from './PrintSheet';
import type { BgioClient, BgioState } from '../lib/useClientState';
import { sfx } from '../lib/sound';
import { load, save } from '../lib/storage';
import { MusicButton, VolumeSlider } from '../lib/AudioButtons';
import { ChatPanel, type ChatProps } from './ChatPanel';
import { CARD_FILL, HSR, INK, LOCO_BG, MERLION, RAIL, cardName } from '../theme';
import { RailTurnSign } from '../rail/RailChrome';
import { MrtTrainIcon } from '../merlion/MerlionChrome';
import { pick } from '../hsr/pick';
import { PartyButton } from '../components/Party';
import { DepartureBoard } from '../hsr/DepartureBoard';

export interface PlayerMeta { id: string; name: string; fill: string; bot?: BotLevel }

/** Every card type in hand at once: 8 cards 64px wide with 8px gaps. */
const WIDEST_HAND = 8 * 64 + 7 * 8;

/** A plain mouse wheel scrolls the ticket row sideways. */
function wheelSideways(e: ReactWheelEvent<HTMLElement>) {
  const el = e.currentTarget;
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) el.scrollLeft += e.deltaY;
}

interface Props {
  state: BgioState;
  playerID: string;
  moves: BgioClient['moves'];
  players: PlayerMeta[];
  onExit: () => void;
  exitLabel: string;
  /** LAN / online: the top-bar exit asks first, then sends the whole table back to the waiting room */
  onLeave?: () => void;
  /** pass-and-play: the curtain covers the screen between seats, so turn chimes are handled there */
  shared?: boolean;
  /** chat with the other players (LAN, online and pass-and-play) */
  chat?: ChatProps;
  /** a curtain (pass-and-play privacy, or the LAN enter-the-game curtain) covers this screen: hold the turn banner until it lifts */
  hidden?: boolean;
  /** end of game: start another one (only the host's button works in a LAN / online game) */
  newGame?: NewGame;
}

/** A chat message or emote shown briefly over the sender's chip in the top bar. */
interface Reaction { key: string; x: number; y: number; kind: 'text' | 'emote'; text: string; fill?: string }

type At = { x: number; y: number };
const atOf = (e: ReactMouseEvent) => ({ x: e.clientX, y: e.clientY });

function usePref(key: string, initial: boolean) {
  const [v, setV] = useState(() => load(key, initial));
  return [v, (n: boolean) => { setV(n); save(key, n); }] as const;
}

export function GameScreen({ state, playerID, moves, players, onExit, exitLabel, onLeave, shared, chat, hidden, newGame }: Props) {
  const { G, ctx } = state;
  const me = G.players[playerID];
  const root = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);
  const names = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.name])), [players]);
  const fills = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p.fill])), [players]);
  const over = !!G.result;
  const stage = ctx.activePlayers?.[playerID];
  const turn: Turn = { phase: ctx.phase, currentPlayer: ctx.currentPlayer, stage, over };
  const myTurn = !over && ctx.phase === 'main' && ctx.currentPlayer === playerID;
  const canStart = myTurn && !stage;
  const legal = useMemo(() => legalActions(G, playerID), [G, playerID]);
  const claimable = useMemo(() => (canStart ? claimableRoutes(G, playerID) : new Set<string>()), [G, playerID, canStart]);
  const tickets = useMemo(() => ticketStatus(G, playerID), [G, playerID]);
  const [hoverTicket, setHoverTicket] = useState<Ticket | null>(null);
  const [picker, setPicker] = useState<{ routeId: string; at: At; options: Card[] } | null>(null);
  const [hideHand, setHideHand] = usePref('boboland.hideHand', false);
  const [hideTickets, setHideTickets] = usePref('boboland.hideTickets', false);

  // A full ticket row opens on its right-hand end (the newest tickets, like a short row), and glides
  // there again whenever you keep new ones.
  const ticketRow = useRef<HTMLDivElement>(null);
  const ticketCount = useRef(-1);
  useEffect(() => {
    const el = ticketRow.current;
    if (!el) { ticketCount.current = -1; return; } // hidden: snap to the end when shown again
    const first = ticketCount.current < 0;
    if (first || tickets.length > ticketCount.current) el.scrollTo({ left: el.scrollWidth, behavior: first ? 'auto' : 'smooth' });
    ticketCount.current = tickets.length;
  }, [tickets.length, hideTickets]);
  const [spotlight, setSpotlight] = useState(false);
  const { bubble, show: explain } = useBubble();
  const [banner, setBanner] = useState<{ id: number; text: string; fill?: string } | null>(null);
  const [claimBanner, setClaimBanner] = useState<{ id: number; who: string; route: string; fill: string } | null>(null);
  const [confirmTickets, setConfirmTickets] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [finalSplash, setFinalSplash] = useState<{ id: number; who: string; fill?: string } | null>(null);
  const [help, setHelp] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [flash, setFlash] = useState<Card | null>(null);
  const [showLongest, setShowLongest] = useState(false);

  // --- end of game: the counting finale, then the results -------------------------------------
  const seatOrder = useMemo(() => players.map((p) => p.id), [players]);
  const beats = useMemo(() => (G.result ? finaleScript(finaleInput(G, seatOrder)) : []), [G.result, seatOrder]); // eslint-disable-line react-hooks/exhaustive-deps
  const animateFinale = over && !reducedMotion();
  const finale = useFinale(beats, animateFinale);
  const finaleOn = animateFinale && !finale.done;
  const fb = finale.beat;
  const longestBeat = beats.at(-1);
  const longestOwners = useMemo(() => longestBeat?.active ?? [], [longestBeat]);
  const longestRoutes = useMemo(() => new Set(longestBeat?.routes ?? []), [longestBeat]);
  const beatRoutes = useMemo(() => new Set(fb?.routes ?? []), [fb]);
  const [slotVersion, setSlotVersion] = useState<number[]>([0, 0, 0, 0, 0]);
  // market reshuffle (engine logs 'redeal'): 'backs' = old cards sweeping away, 'deal' = new five dealing in
  const [reshuffle, setReshuffle] = useState<null | 'backs' | 'deal'>(null);

  const rectOf = useCallback((sel: string) => root.current?.querySelector(sel)?.getBoundingClientRect(), []);
  const handTarget = () => rectOf('[data-testid=hand]') ?? rectOf('[data-testid=hand-tray]');
  const flashAfter = (p: Promise<void>, c: Card) => void p.then(() => { setFlash(c); setTimeout(() => setFlash(null), 1400); });
  const announce = (text: string, fill?: string) => setBanner({ id: Date.now() + Math.random(), text, fill });

  // --- what just happened: animations, banners and sounds for every player ------------------
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const seenLog = useRef(G.log.length);
  useEffect(() => {
    const entries = G.log.slice(seenLog.current);
    seenLog.current = G.log.length;
    const added: string[] = [];
    for (const e of entries) {
      const who = 'p' in e ? names[e.p] ?? 'Someone' : '';
      const mine = 'p' in e && e.p === playerID;
      const chip = 'p' in e ? rectOf(`[data-player="${e.p}"]`) : undefined;
      if (e.t === 'drawFaceUp') {
        sfx.card();
        setSlotVersion((v) => v.map((n, i) => (i === e.slot ? n + 1 : n)));
        const from = rectOf(`[data-market="${e.slot}"]`), to = mine ? handTarget() : chip;
        const what = `a ${cardName(e.card).toLowerCase()} card`;
        if (from && to) {
          const shown = showcase(<CardTile card={e.card} />, `${mine ? 'You' : who} took ${what}`, from, to);
          if (mine) flashAfter(shown, e.card);
        }
      } else if (e.t === 'drawBlind') {
        sfx.card();
        if (!mine) {
          const from = rectOf('[data-testid=draw-deck]');
          if (from && chip) void showcase(<CardBack />, `${who} drew a card from the deck`, from, chip);
        }
      } else if (e.t === 'claim') {
        const r = ROUTE_BY_ID[e.route];
        const t = claimTiming(r.length);
        sfx.claim(t.drops.map((d) => d / 1000), t.arrive / 1000, t.start / 1000);
        markBusy(t.total + 200);
        added.push(e.route);
        setClaimBanner({ id: Date.now() + Math.random(), who: mine ? 'You' : who, route: `${cityName(r.a)} – ${cityName(r.b)}`, fill: fills[e.p] });
      } else if (e.t === 'drawTickets') {
        // destination tickets, not train cards
        sfx.ticket();
        const from = rectOf('[data-testid=draw-tickets]');
        if (mine) {
          const to = rectOf('[data-testid=hand-tray]');
          if (from && to) for (let k = 0; k < e.n; k++) setTimeout(() => void flyCard(<TicketBack />, from, to, { endScale: 0.9, duration: 650 }), k * 140);
        } else if (from && chip) {
          void showcase(<TicketFan n={e.n} />, `${who} is choosing tickets`, from, chip);
        }
      } else if (e.t === 'tickets') {
        sfx.ticket();
        if (!mine) announce(`${who} kept ${e.kept} new ${e.kept === 1 ? 'ticket' : 'tickets'}`, fills[e.p]);
      } else if (e.t === 'redeal') {
        setSlotVersion((v) => v.map((n) => n + 1));
        if (reducedMotion()) announce('Three locomotives face up: all five cards were replaced');
        else {
          setReshuffle('backs');
          setTimeout(() => setReshuffle('deal'), RESHUFFLE_BACKS_MS);
          setTimeout(() => setReshuffle(null), RESHUFFLE_MS);
        }
      } else if (e.t === 'finalRound') {
        sfx.whistle();
        setTimeout(() => sfx.whistle(), 650);
        setFinalSplash({ id: Date.now(), who: mine ? 'You are' : `${who} is`, fill: fills[e.p] });
        markBusy(3000); // pass-and-play hands over only after everyone has seen it
        setTimeout(() => setFinalSplash(null), 3400); // also clears it when animations are switched off
      }
    }
    if (added.length) {
      setFresh(new Set(added));
      const longest = Math.max(...added.map((id) => claimTiming(ROUTE_BY_ID[id].length).total));
      const t = setTimeout(() => setFresh(new Set()), longest + 150);
      return () => clearTimeout(t);
    }
  }, [G.log]); // eslint-disable-line react-hooks/exhaustive-deps

  // Your own blind draw: show the card big, then send it to your hand.
  const lastSeq = useRef(me.lastDrawn?.seq ?? 0);
  useEffect(() => {
    const d = me.lastDrawn;
    if (!d || d.seq === lastSeq.current) return;
    lastSeq.current = d.seq;
    const from = rectOf('[data-testid=draw-deck]'), to = handTarget();
    if (from && to) flashAfter(revealThenFly(<CardTile card={d.card} />, `You drew ${d.card === 'locomotive' ? 'a locomotive' : `a ${d.card} card`}`, from, to), d.card);
  }, [me.lastDrawn?.seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const wasMyTurn = useRef(myTurn);
  useEffect(() => {
    if (!shared && myTurn && !wasMyTurn.current && !HSR) sfx.turn(); // HSR: the departure board's chime announces it
    wasMyTurn.current = myTurn;
  }, [myTurn, shared]);

  // Whose turn it is now: a big banner every time the turn changes (yours in your colour, others plain),
  // shown once the move's animations have finished, and in pass-and-play once the curtain lifts.
  const [turnBanner, setTurnBanner] = useState<{ id: number; who: string; mine: boolean } | null>(null);
  const turnOf = ctx.phase === 'main' && !over ? ctx.currentPlayer : null;
  const bannerFor = useRef<string | null>(null);
  useEffect(() => {
    if (hidden || turnOf === null || bannerFor.current === turnOf) return;
    bannerFor.current = turnOf;
    const show = () => {
      setTurnBanner({ id: Date.now() + Math.random(), who: turnOf, mine: turnOf === playerID });
      if (HSR) sfx.stationChime();
    };
    const t = setTimeout(show, busyRemaining());
    return () => clearTimeout(t);
  }, [turnOf, hidden, playerID]);

  // --- chat: a soft pop for other people's messages, and each one shown over its sender's chip ----
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const seenChat = useRef(chat?.lines.length ?? 0);
  useEffect(() => {
    const lines = chat?.lines ?? [];
    const fresh = lines.slice(seenChat.current);
    seenChat.current = lines.length;
    if (!fresh.length) return;
    if (fresh.some((l) => l.sender !== playerID)) sfx.chat();
    const added: Reaction[] = [];
    for (const l of fresh) {
      const chip = rectOf(`[data-player="${l.sender}"]`);
      if (!chip) continue;
      const text = l.kind === 'text' && l.text.length > 60 ? `${l.text.slice(0, 58)}…` : l.text;
      added.push({ key: l.id, x: chip.left + chip.width / 2, y: chip.bottom + 8, kind: l.kind, text, fill: fills[l.sender] });
    }
    if (!added.length) return;
    setReactions((r) => [...r.filter((x) => !added.some((a) => a.x === x.x)), ...added]);
    const keys = new Set(added.map((a) => a.key));
    setTimeout(() => setReactions((r) => r.filter((x) => !keys.has(x.key))), 2900);
  }, [chat?.lines]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- actions (refused ones explain themselves) ---------------------------------------------
  const onRoute = (routeId: string, at: At) => {
    const reason = whyNot.claim(G, playerID, routeId, turn, names);
    if (reason) return explain(reason, at);
    setPicker({ routeId, at, options: paymentOptionsFor(G, playerID, routeId) });
  };
  const onFaceUp = (i: number, e: ReactMouseEvent) => {
    const reason = whyNot.faceUp(G, playerID, i, turn, names);
    if (reshuffle) return;
    if (reason) return explain(reason, atOf(e));
    moves.drawFaceUp(i);
  };
  const onDeck = (e: ReactMouseEvent) => {
    const reason = whyNot.deck(G, playerID, turn, names);
    if (reshuffle) return;
    if (reason) return explain(reason, atOf(e));
    moves.drawBlind();
  };
  const onTickets = (e: ReactMouseEvent) => {
    const reason = whyNot.tickets(G, playerID, turn, names);
    if (reason) return explain(reason, atOf(e));
    setConfirmTickets(true);
  };

  // --- derived display -------------------------------------------------------------------------
  const pile = (G.deckCount ?? G.deck.length) + (G.discardCount ?? G.discard.length);
  const deckLive = (canStart || stage === 'secondDraw') && pile > 0;
  const hoverStatus = hoverTicket ? tickets.find((t) => t.id === hoverTicket.id) : undefined;
  const highlightCities = hoverTicket ? [hoverTicket.a, hoverTicket.b] : [];
  const hoverRoutes = useMemo(() => new Set(hoverStatus?.path ?? []), [hoverStatus]);
  // during the finale the map follows the count; on the final board you can light up the longest route
  const longestOn = fb ? fb.kind === 'longest' : showLongest;
  const focusSet = fb ? beatRoutes : longestRoutes;
  const mapFocus = longestOn && focusSet.size ? focusSet : null;
  const mapSpotlight = fb ? (fb.active.length ? fb.active : null) : spotlight ? playerID : null;
  const highlightRoutes = fb ? beatRoutes : showLongest ? longestRoutes : hoverRoutes;
  const mapCities = fb ? fb.cities : highlightCities;
  const chooserMin = ctx.phase === 'chooseTickets' ? 2 : 1;
  const showChooser = !over && me.pending.length > 0 && (ctx.phase === 'chooseTickets' || stage === 'chooseTickets');
  const yourMove = myTurn || showChooser;
  const lastTurn = myTurn && !!G.finalRound;
  const doneFinal = finalTurnsDone(G.finalRound, G.turnOrder ?? Array.from({ length: ctx.numPlayers }, (_, i) => String(i)));

  const status = (() => {
    if (over) return 'Game over';
    if (ctx.phase === 'chooseTickets') return me.pending.length ? 'Choose your destination tickets' : 'Waiting for everyone to choose tickets';
    if (!myTurn) return `${names[ctx.currentPlayer] ?? 'Next player'} is playing`;
    if (stage === 'secondDraw') return 'Take one more card (not a face-up locomotive)';
    if (stage === 'chooseTickets') return 'Keep at least one of the new tickets';
    if (legal.pass) return 'Nothing is possible this turn. Pass to continue';
    if (lastTurn) return 'Your LAST turn! Draw two cards, claim a route, or take tickets';
    return 'Your turn: draw two cards, claim a route, or take tickets';
  })();

  const liveBtn = 'transition enabled:hover:-translate-y-px';
  const dim = (live: boolean) => (live ? '' : 'opacity-75');

  return (
    <div ref={root} className="grid h-full grid-cols-[minmax(0,1fr)_236px] grid-rows-[56px_1fr_136px] bg-table [grid-template-areas:'top_top''map_side''hand_side']">
      {/* top bar */}
      <header className="flex items-center gap-3 border-b border-line bg-panel px-4 [grid-area:top]">
        <h1 className="whitespace-nowrap font-display text-[23px] tracking-[0.02em]">Ticket to <span className="text-poster">{SKIN.name}</span>{HSR && SKIN.zh && <span className="ml-1.5 align-[2px] text-[15px] font-bold text-poster/80" style={{ fontFamily: 'var(--font-zh)' }}>{SKIN.zh}</span>}</h1>
        <div className={`flex min-w-0 items-center gap-2 truncate rounded-full border px-3 py-1.5 text-[14px] ${lastTurn ? pick('turn-pulse border-transparent bg-mustard font-semibold text-ink', 'turn-pulse border-ink bg-mustard font-semibold text-ink') : yourMove ? pick('turn-pulse border-transparent bg-poster font-medium text-white', 'turn-pulse border-poster bg-poster text-[#fff6e6]') : pick('border-line bg-panel-2 text-muted', 'border-line bg-panel-2')}`} data-testid="status" data-your-turn={yourMove || undefined} data-last-turn={lastTurn || undefined}>
          {yourMove && <span className={pick(`hsr-status-dot h-2 w-2 shrink-0 rounded-full ${lastTurn ? 'bg-ink' : 'bg-white'}`, 'h-2.5 w-2.5 shrink-0 animate-ping rounded-full bg-[#fff6e6]')} aria-hidden />}
          <span className="truncate">{status}</span>
        </div>
        <div className="ml-auto flex gap-2">
          {players.map((p) => {
            const ps = G.players[p.id];
            const cards = ps.handCount ?? handSize(ps.hand);
            const me = p.id === playerID;
            // starting tickets: how many someone kept stays secret until everyone has chosen
            const tixHidden = ctx.phase === 'chooseTickets' && !me && !over;
            const tix = tixHidden ? '?' : (ps.ticketCount ?? ps.tickets.length);
            const active = ctx.phase === 'main' && ctx.currentPlayer === p.id && !over;
            return (
              <div key={p.id} data-player={p.id}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full border bg-panel-2 py-1 pl-1 pr-3 text-[13px] ${active ? 'border-transparent' : 'border-line'}`}
                style={active ? { boxShadow: `0 0 0 3px ${p.fill}` } : undefined} title={`${p.name}: ${ps.trains} trains, ${cards} cards, ${tixHidden ? 'choosing' : tix} tickets`}>
                <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: p.fill }}>{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="max-w-24 truncate font-medium">{p.name}{me ? <span className="font-normal text-muted"> (you)</span> : ''}</span>
                {p.bot && <span className="rounded-full border border-line px-1.5 text-[10.5px] uppercase tracking-wide text-muted" data-bot={p.bot} title={`Bot (${p.bot})`}>bot</span>}
                {/* your own trains get a soft glow in your colour, so the number you watch most pops */}
                <span className={`flex items-center gap-1 tabular-nums ${me ? '-my-0.5 rounded-full px-1.5 py-0.5 font-semibold' : ''}`} data-trains={ps.trains} data-own-trains={me || undefined}
                  style={me ? { background: `color-mix(in srgb, ${p.fill} 20%, transparent)`, boxShadow: `0 0 0 1.5px color-mix(in srgb, ${p.fill} 70%, transparent), 0 0 8px color-mix(in srgb, ${p.fill} 45%, transparent)` } : undefined}>
                  <StatIcon kind="trains" />{ps.trains}
                </span>
                <span className="flex items-center gap-1 text-muted tabular-nums" data-cards={cards}><StatIcon kind="cards" />{cards}</span>
                <span className="flex items-center gap-1 text-muted tabular-nums" data-tickets={tix} data-tickets-hidden={tixHidden || undefined}><StatIcon kind="tickets" />{tix}</span>
                {doneFinal.includes(p.id) && !over && (
                  <span className="rounded-full bg-ink px-1.5 text-[11px] text-paper" title="Has taken their last turn" data-final-done={p.id}>✓ done</span>
                )}
              </div>
            );
          })}
        </div>
        <Stopwatch startedAt={G.startedAt} endedAt={G.endedAt} />
        <button type="button" onClick={() => setHelp(true)} data-testid="open-help" aria-label="How to play" title="How to play"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 text-[14px] hover:border-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M9 7h6" />
          </svg>
          Rules
        </button>
        <MusicButton />
        <VolumeSlider />
        <button type="button" onClick={onLeave ? () => setConfirmLeave(true) : onExit} data-testid="leave-game" className="rounded-lg border border-[#d33a2c]/40 bg-[#d33a2c]/10 px-3 py-1.5 text-[14px] hover:border-[#d33a2c]/80 hover:bg-[#d33a2c]/15">{exitLabel}</button>
        <PartyButton inline />
      </header>

      {/* map */}
      <main className="relative [grid-area:map]">
        <MapView claims={G.claims} playerFill={fills} claimable={claimable} fresh={fresh} spotlight={mapSpotlight} focus={mapFocus}
          highlightCities={mapCities} highlightRoutes={highlightRoutes} onRouteClick={onRoute}
          routeNote={(r) => (claimable.has(r.id) ? 'click to claim' : null)} />
        {!finaleOn && <button type="button" onClick={() => { setSpotlight(!spotlight); setShowLongest(false); }} aria-pressed={spotlight} data-testid="spotlight"
          className={`absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-[14px] transition ${pick(`border shadow-[0_2px_8px_rgba(20,33,61,.16)] ${spotlight ? 'border-transparent font-medium text-white' : 'border-line bg-panel/95 hover:border-line-strong'}`, `border-2 shadow-md ${spotlight ? 'border-ink text-white' : 'border-ink/40 bg-panel/95 hover:border-ink'}`)}`}
          style={spotlight ? { background: fills[playerID] } : undefined}>
          <span className="h-3 w-3 rounded-full border border-white/70" style={{ background: fills[playerID] }} />
          {spotlight ? 'Showing my routes' : 'Highlight my routes'}
        </button>}
        {over && !finaleOn && !showResults && (
          <button type="button" onClick={() => { setShowLongest(!showLongest); setSpotlight(false); }} aria-pressed={showLongest} data-testid="show-longest"
            className={`absolute left-4 top-[62px] z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-[14px] transition ${pick(`border shadow-[0_2px_8px_rgba(20,33,61,.16)] ${showLongest ? 'border-transparent bg-mustard font-medium text-ink' : 'border-line bg-panel/95 hover:border-line-strong'}`, `border-2 shadow-md ${showLongest ? 'border-ink bg-mustard text-ink' : 'border-ink/40 bg-panel/95 hover:border-ink'}`)}`}>
            <svg width="20" height="12" viewBox="0 0 38 20" aria-hidden><path d="M2,13 V6 H16 V2 H24 V6 H30 L36,13 Z" fill="currentColor" /><circle cx="9" cy="16" r="3" fill="currentColor" /><circle cx="20" cy="16" r="3" fill="currentColor" /><circle cx="30" cy="16" r="2.5" fill="currentColor" /></svg>
            {showLongest ? `Longest route: ${longestOwners.map((id) => names[id]).join(' & ') || 'nobody'}` : 'Show longest route'}
          </button>
        )}
        {fb && G.result && <FinaleOverlay beat={fb} index={finale.index} players={players} result={G.result} onSkip={finale.skip} />}
        {G.finalRound && !over && (
          <div className={`final-ribbon pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 px-5 py-1.5 ${pick('rounded-full shadow-[0_6px_18px_rgba(200,16,46,.35)]', 'rounded-xl border-[3px] border-ink shadow-lg')}`} data-testid="final-round">
            {HSR ? <TrainNoseIcon width={32} height={16} fill="#ffffff" /> : <svg width="30" height="18" viewBox="0 0 38 20" aria-hidden><path d="M2,13 V6 H16 V2 H24 V6 H30 L36,13 Z" fill={INK} /><circle cx="9" cy="16" r="3" fill={INK} /><circle cx="20" cy="16" r="3" fill={INK} /><circle cx="30" cy="16" r="2.5" fill={INK} /></svg>}
            <span className="font-display text-[18px] tracking-[0.06em]">{myTurn ? 'YOUR LAST TURN' : 'FINAL ROUND'}</span>
          </div>
        )}
        {finalSplash && (
          <div key={finalSplash.id} className="final-splash pointer-events-none absolute inset-0 z-40 grid place-items-center" onAnimationEnd={() => setFinalSplash(null)} data-testid="final-splash">
            <div className="rounded-2xl border-4 border-ink bg-mustard px-10 py-6 text-center shadow-[0_20px_60px_rgba(59,42,30,.5)]">
              <div className="font-display text-[54px] leading-none text-ink">Final round!</div>
              <div className="mt-2 text-[19px] text-ink">{finalSplash.who} down to 2 or fewer trains.</div>
              <div className="text-[19px] font-semibold text-ink">Everyone gets one last turn.</div>
            </div>
          </div>
        )}
        {turnBanner && (
          <div key={turnBanner.id} role="status" aria-live="polite" data-testid="turn-banner" data-mine={turnBanner.mine || undefined}
            className="turn-banner pointer-events-none absolute left-1/2 top-[18%] z-30" onAnimationEnd={(e) => e.target === e.currentTarget && setTurnBanner(null)}>
            {HSR ? (
              <DepartureBoard mine={turnBanner.mine} name={names[turnBanner.who] ?? 'Next player'} fill={fills[turnBanner.who] ?? INK}
                platform={Math.max(1, seatOrder.indexOf(turnBanner.who) + 1)} />
            ) : RAIL ? (
              <RailTurnSign mine={turnBanner.mine} name={names[turnBanner.who] ?? 'Next player'} fill={(turnBanner.mine ? fills[playerID] : fills[turnBanner.who]) ?? INK} />
            ) : turnBanner.mine ? (
              <div className="rounded-2xl border-[3px] border-ink px-10 py-4 text-center text-[#fff8e6] shadow-[0_16px_40px_rgba(59,42,30,.45)]" style={{ background: fills[playerID] }}>
                <div className="font-display text-[46px] leading-none tracking-[0.02em]">Your turn!</div>
                <div className="mt-1.5 text-[16px] opacity-90">Draw two cards, claim a route, or take tickets</div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-ticket px-8 py-3 shadow-[0_12px_30px_rgba(59,42,30,.35)]">
                <span className="h-5 w-5 rounded-full border-2 border-ink" style={{ background: fills[turnBanner.who] }} />
                <span className="font-display text-[32px] leading-none text-ink">{names[turnBanner.who] ?? 'Next player'}’s turn</span>
              </div>
            )}
          </div>
        )}
        {claimBanner && (
          <div key={claimBanner.id} role="status" aria-live="polite" data-testid="claim-banner"
            className={`claim-banner pointer-events-none absolute left-1/2 top-3 z-30 flex items-center gap-3 px-5 py-2 ${pick('hsr-claim-banner rounded-[14px] text-white', 'rounded-xl border-[3px] border-ink text-[#fff8e6] shadow-[0_10px_30px_rgba(59,42,30,.45)]')}`}
            style={{ background: claimBanner.fill }} onAnimationEnd={() => setClaimBanner(null)}>
            {HSR ? <TrainNoseIcon width={40} height={20} fill="#ffffff" /> : MERLION ? <MrtTrainIcon width={42} height={21} /> : <svg width="34" height="20" viewBox="0 0 38 20" aria-hidden><path d="M2,13 V6 H16 V2 H24 V6 H30 L36,13 Z" fill="#fff8e6" /><circle cx="9" cy="16" r="3" fill="#fff8e6" /><circle cx="20" cy="16" r="3" fill="#fff8e6" /><circle cx="30" cy="16" r="2.5" fill="#fff8e6" /></svg>}
            <div className="leading-tight">
              <div className="font-display text-[13px] tracking-[0.18em] opacity-90">{HSR && <span className="mr-1.5 tracking-[0.1em]" style={{ fontFamily: 'var(--font-zh)' }}>已占领</span>}ROUTE CLAIMED</div>
              <div className="font-display text-[22px]">{claimBanner.route}</div>
            </div>
            <div className="ml-2 rounded-full bg-black/25 px-3 py-1 text-[15px]">{claimBanner.who}</div>
          </div>
        )}
        {banner && (
          <div key={banner.id} role="status" aria-live="polite" data-testid="banner"
            className={`banner-in pointer-events-none absolute left-1/2 top-4 z-20 flex items-center gap-2 rounded-full px-4 py-1.5 text-[16px] ${pick('border border-line bg-panel shadow-[0_6px_20px_rgba(20,33,61,.18)]', 'border-2 border-ink bg-ticket shadow-lg')}`}
            onAnimationEnd={() => setBanner(null)}>
            {banner.fill && <span className="h-3 w-3 rounded-full" style={{ background: banner.fill }} />}
            {banner.text}
          </div>
        )}
      </main>

      {/* side rail: face-up cards and the two decks */}
      <aside className="flex flex-col gap-3 overflow-y-auto border-l border-line bg-panel p-3 [grid-area:side]" data-testid="side-rail">
        <section>
          <h2 className={pick('mb-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted', 'mb-2 text-[14px] font-medium text-muted')}>Train cards</h2>
          <div className="grid grid-cols-3 justify-items-center gap-x-2 gap-y-2.5">
            <button type="button" onClick={onDeck} aria-disabled={!deckLive || !!reshuffle} data-testid="draw-deck" aria-label={`Draw from the deck (${pile} left)`}
              className={`relative rounded-[10px] ${liveBtn} ${dim(deckLive && !reshuffle)}`}>
              <CardBack label="Deck" />
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink px-2 text-[12px] tabular-nums text-paper">{pile}</span>
            </button>
            {G.market.map((c, i) => {
              if (reshuffle === 'backs') return <div key={`rs-${i}`} data-market={i} className="reshuffle-out" style={{ animationDelay: `${i * 60}ms` }} aria-hidden><CardBack /></div>;
              const live = !reshuffle && !!c && (canStart || (stage === 'secondDraw' && c !== 'locomotive'));
              return c ? (
                <button key={`${i}-${slotVersion[i]}`} type="button" data-market={i} data-card={c} aria-disabled={!live}
                  onClick={(e) => onFaceUp(i, e)} aria-label={`Take face-up ${cardName(c)}`}
                  style={reshuffle ? { animationDelay: `${i * 70}ms` } : undefined}
                  className={`${slotVersion[i] > 0 ? 'deal-in' : ''} rounded-[10px] ${liveBtn} ${dim(live)}`}>
                  <CardTile card={c} />
                </button>
              ) : (
                <div key={`${i}-${slotVersion[i]}`} data-market={i} className="h-[92px] w-[64px] rounded-[10px] border-2 border-dashed border-line-strong" aria-label="Empty slot" />
              );
            })}
          </div>
          {reshuffle && <div className="reshuffle-label mt-2 text-center text-[12px] text-muted" role="status" data-testid="reshuffle-label">Reshuffling market…</div>}
        </section>
        <DrawTicketsButton count={G.ticketDeckCount ?? G.ticketDeck.length} live={canStart && legal.tickets} onClick={onTickets} />
        {canStart && legal.pass && (
          <button type="button" onClick={() => moves.pass()} className={pick('rounded-[10px] bg-poster py-2 font-display text-[16px] text-white shadow-[0_2px_6px_rgba(200,16,46,.3)] hover:bg-poster-dark', 'rounded-lg border-2 border-ink bg-mustard py-2 font-display')}>Pass</button>
        )}
        <div className="mt-auto grid shrink-0 grid-cols-[minmax(0,1fr)] gap-3 pt-6">
          {chat && <ChatPanel {...chat} me={playerID} names={names} fills={fills} />}
          <section>
            <h2 className={pick('mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-muted', 'mb-1.5 text-[14px] font-medium text-muted')}>Last moves</h2>
            {/* always room for exactly the four latest moves, one line each */}
            <ol className="grid h-[116px] content-start gap-1 overflow-hidden text-[13px] leading-[18px]" data-testid="log">
              {G.log.slice(-4).reverse().map((e, i) => (
                <li key={G.log.length - i} className="truncate rounded-md bg-panel-2 px-2 py-1" title={describe(e, names, playerID)}><LogLine e={e} names={names} me={playerID} fills={fills} /></li>
              ))}
              {G.log.length === 0 && <li className="text-muted">No moves yet</li>}
            </ol>
          </section>
        </div>
      </aside>

      {/* hand tray */}
      <section className="relative flex min-w-0 items-end gap-3 border-t border-line bg-panel px-4 pb-2.5 pt-1.5 [grid-area:hand]" data-testid="hand-tray">
        {/* the hand always has room for every card type, so the routes beside it never need to move */}
        <div className="flex shrink-0 flex-col gap-1 pb-2" style={{ width: WIDEST_HAND }}>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[14px] tracking-[0.03em] text-ink">My hand</h2>
            <TrayToggle hidden={hideHand} onToggle={() => setHideHand(!hideHand)} what="hand" testid="toggle-hand" />
          </div>
          {hideHand ? (
            <div className="grid h-[92px] place-items-center rounded-[10px] border-2 border-dashed border-line-strong px-6 text-[15px] text-muted" data-testid="hand-hidden">
              Hand hidden
            </div>
          ) : (
            <div className="flex h-[92px] items-end gap-2" data-testid="hand">
              {handList(me.hand).map(([c, n]) => <HandCard key={c} card={c} count={n} flash={flash === c} />)}
              {handSize(me.hand) === 0 && <p className="self-center text-[14px] text-muted">No train cards yet. Draw some from the right.</p>}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <TrayToggle hidden={hideTickets} onToggle={() => setHideTickets(!hideTickets)} what="routes" testid="toggle-tickets" />
            <h2 className="font-display text-[14px] tracking-[0.03em] text-ink">My routes</h2>
          </div>
          {hideTickets ? (
            <div className="mb-2 grid h-[92px] place-items-center rounded-[10px] border-2 border-dashed border-line-strong px-6 text-[15px] text-muted" data-testid="tickets-hidden">
              Routes hidden
            </div>
          ) : (
            <div ref={ticketRow} className="ticket-scroll -mt-1.5 h-[106px] w-full" data-testid="my-tickets" onWheel={wheelSideways}>
              <div className="ml-auto flex h-[98px] w-max items-end gap-2.5">
                {tickets.map((t) => <TicketCard key={t.id} ticket={t.ticket} done={t.done} onHover={setHoverTicket} />)}
                {tickets.length === 0 && <p className="self-center text-[14px] text-muted">No destination tickets yet</p>}
              </div>
            </div>
          )}
        </div>
      </section>

      {showChooser && (
        <div className="pointer-events-none relative [grid-column:1/2] [grid-row:2/3]">
          <TicketChooser key={me.pending.join()} pending={me.pending} min={chooserMin} initial={ctx.phase === 'chooseTickets'}
            onHover={setHoverTicket}
            onKeep={(ids) => (ctx.phase === 'chooseTickets' ? moves.keepInitialTickets(ids) : moves.keepTickets(ids))} />
        </div>
      )}

      {picker && (
        <ClaimPicker {...picker} hand={me.hand} onClose={() => setPicker(null)}
          onClaim={(c) => { moves.claimRoute(picker.routeId, c); setPicker(null); }} />
      )}
      <Bubble bubble={bubble} />
      {reactions.map((r) => (
        <div key={r.key} className="emote-pop pointer-events-none fixed z-[70]" style={{ left: r.x, top: r.y }} data-testid="reaction" aria-hidden>
          {r.kind === 'emote' ? (
            <div className={`grid h-14 w-14 place-items-center rounded-full border-[3px] text-[34px] leading-none ${pick('bg-panel shadow-[0_8px_20px_rgba(20,33,61,.22)]', 'bg-ticket shadow-[0_8px_20px_rgba(59,42,30,.35)]')}`} style={{ borderColor: r.fill }}>{r.text}</div>
          ) : (
            <div className={`relative max-w-[240px] rounded-xl border-2 px-3 py-1.5 text-[14px] leading-snug ${pick('bg-panel shadow-[0_8px_20px_rgba(20,33,61,.2)]', 'bg-ticket shadow-[0_8px_20px_rgba(59,42,30,.3)]')}`} style={{ borderColor: r.fill }}>
              <span className={`absolute -top-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l-2 border-t-2 ${pick('bg-panel', 'bg-ticket')}`} style={{ borderColor: r.fill }} />
              {r.text}
            </div>
          )}
        </div>
      ))}
      {confirmTickets && (
        <ConfirmTickets n={Math.min(3, G.ticketDeckCount ?? G.ticketDeck.length)} onCancel={() => setConfirmTickets(false)}
          onConfirm={() => { setConfirmTickets(false); moves.drawTickets(); }} />
      )}
      {confirmLeave && onLeave && <ConfirmLeave onCancel={() => setConfirmLeave(false)} onConfirm={() => { setConfirmLeave(false); onLeave(); }} />}
      {help && <HowToPlay onClose={() => setHelp(false)} />}

      {over && G.result && showResults && !finaleOn && (
        <div className="relative [grid-column:1/3] [grid-row:1/4]">
          <GameOver result={G.result} players={players} durationMs={G.endedAt ? G.endedAt - G.startedAt : null} onDone={onExit} newGame={newGame}
            onViewBoard={() => setShowResults(false)} onSave={() => setPrinting(true)} />
        </div>
      )}
      {over && G.result && !showResults && !finaleOn && (
        <div className={`fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full bg-panel px-4 py-2 ${pick('border border-line shadow-[0_10px_30px_rgba(20,33,61,.22)]', 'border-2 border-ink shadow-xl')}`} data-testid="board-view-bar">
          <span className="text-[15px]">The final board</span>
          <button type="button" onClick={() => setSpotlight(!spotlight)} className={pick('rounded-full border border-line-strong px-3 py-1 text-[14px] hover:border-ink', 'rounded-full border border-ink px-3 py-1 text-[14px]')}>{spotlight ? 'Show everyone' : 'Highlight mine'}</button>
          <button type="button" onClick={() => setPrinting(true)} className={pick('rounded-full border border-line-strong px-3 py-1 text-[14px] hover:border-ink', 'rounded-full border border-ink px-3 py-1 text-[14px]')}>Save results (PDF)</button>
          <button type="button" onClick={() => setShowResults(true)} data-testid="show-results" className={`rounded-full bg-poster px-3 py-1 font-display text-[14px] ${pick('text-white', 'text-[#fff6e6]')}`}>Show results</button>
        </div>
      )}
      {printing && G.result && (
        <PrintSheet result={G.result} claims={G.claims} players={players} startedAt={G.startedAt} endedAt={G.endedAt} onDone={() => setPrinting(false)} />
      )}
    </div>
  );
}

/** The destination-ticket pile, drawn as a railway ticket: stub, perforation, and the count as its fare stamp. */
function DrawTicketsButton({ count, live, onClick }: { count: number; live: boolean; onClick: (e: ReactMouseEvent) => void }) {
  if (HSR) return <HsrDrawTickets count={count} live={live} onClick={onClick} />;
  const card = 'gold-ticket rounded-[10px] border-[1.5px]';
  return (
    <button type="button" onClick={onClick} aria-disabled={!live} data-testid="draw-tickets" aria-label={`Take destination tickets (${count} left)`}
      className={`group relative mr-1.5 mb-1.5 text-left transition enabled:hover:-translate-y-px ${live ? '' : 'opacity-75'}`}>
      {/* the rest of the pile, peeking out behind */}
      {count > 1 && <span aria-hidden className={`absolute inset-0 translate-x-[6px] translate-y-[6px] rotate-[2.5deg] ${card}`} />}
      {count > 0 && <span aria-hidden className={`absolute inset-0 translate-x-[3px] translate-y-[3px] rotate-[1deg] ${card}`} />}
      <span className={`ticket-stub relative flex h-[78px] overflow-hidden shadow-[0_2px_6px_rgba(60,40,20,.18)] ${card} ${live ? 'group-hover:border-ink' : ''}`}>
        <span className="flex w-[30px] shrink-0 items-center justify-center bg-poster/[.07]">
          <span className="-rotate-90 whitespace-nowrap font-display text-[8.5px] tracking-[0.14em] text-poster">ADMIT ONE</span>
        </span>
        <span className="border-l-2 border-dashed border-line-strong" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-3 pr-3">
          <span className="font-display text-[10.5px] tracking-[0.2em] text-poster">DESTINATION</span>
          <span className="font-display text-[16px] leading-tight text-ink">Take tickets</span>
          <span className="text-[12px] leading-tight text-muted">Draw 3, keep at least 1</span>
        </span>
      </span>
      {/* the count, in the same dark pill as the train-card deck */}
      <span className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-2 text-[12px] tabular-nums text-paper">{count}</span>
      {/* punched notches where the stub tears off */}
      <span aria-hidden className="absolute -top-[6px] left-[24px] h-3 w-3 rounded-full border-[1.5px] border-line-strong bg-panel [clip-path:inset(50%_0_0_0)]" />
      <span aria-hidden className="absolute -bottom-[6px] left-[24px] h-3 w-3 rounded-full border-[1.5px] border-line-strong bg-panel [clip-path:inset(0_0_50%_0)]" />
    </button>
  );
}

/** HSR: the ticket pile as a stack of pale blue China Railway tickets, with the count in the deck's pill. */
function HsrDrawTickets({ count, live, onClick }: { count: number; live: boolean; onClick: (e: ReactMouseEvent) => void }) {
  const card = 'hsr-ticket rounded-[10px]';
  return (
    <button type="button" onClick={onClick} aria-disabled={!live} data-testid="draw-tickets" aria-label={`Take destination tickets (${count} left)`}
      className={`group relative mb-1.5 mr-1.5 text-left transition enabled:hover:-translate-y-px ${live ? '' : 'opacity-75'}`}>
      {count > 1 && <span aria-hidden className={`absolute inset-0 translate-x-[6px] translate-y-[6px] ${card}`} />}
      {count > 0 && <span aria-hidden className={`absolute inset-0 translate-x-[3px] translate-y-[3px] ${card}`} />}
      <span className={`ticket-stub hsr-pile relative flex h-[78px] overflow-hidden ${card}`}>
        <span className="flex w-[30px] shrink-0 items-center justify-center bg-[#1d5fbf]">
          <span className="text-[12px] font-bold leading-[1.15] text-white [writing-mode:vertical-rl]" style={{ fontFamily: 'var(--font-zh)' }}>车票</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-3 pr-3">
          <span className="font-display text-[10.5px] tracking-[0.2em] text-[#1d5fbf]">DESTINATION</span>
          <span className="font-display text-[17px] leading-tight text-ink">Take tickets</span>
          <span className="text-[11.5px] leading-tight text-muted">Draw 3, keep at least 1</span>
        </span>
      </span>
      <span className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink px-2 text-[12px] tabular-nums text-paper">{count}</span>
    </button>
  );
}

/** HSR: a small side view of an EMU nose, for banners. */
function TrainNoseIcon({ width, height, fill }: { width: number; height: number; fill: string }) {
  return (
    <svg width={width} height={height} viewBox="0 0 40 20" aria-hidden>
      <path d="M1,4 H17 C25,4 31,7.5 37.5,13 C39,14.4 38.4,16 36,16 H1 Z" fill={fill} />
      <path d="M19,5.2 C24,5.8 28,7.8 31.5,10.6 C28,11.4 23.5,11 20.5,9.8 Z" fill="currentColor" opacity=".45" />
      <rect x="3" y="7" width="13" height="2.6" rx="1" fill="currentColor" opacity=".45" />
      <circle cx="9" cy="18" r="1.6" fill={fill} /><circle cx="27" cy="18" r="1.6" fill={fill} />
    </svg>
  );
}

/** HSR: the little icons in a player's chip (trains, train cards, tickets). */
function StatIcon({ kind }: { kind: 'trains' | 'cards' | 'tickets' }) {
  const p = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, className: 'shrink-0 opacity-70' };
  if (kind === 'trains') return <svg {...p}><path d="M2 7h11c4.5 0 7 2.2 8.6 5.6.4.9-.2 1.9-1.2 1.9H2z" /><path d="M2 10.5h8M6 18h.01M15 18h.01" /></svg>;
  if (kind === 'cards') return <svg {...p}><rect x="4" y="3" width="11" height="16" rx="2" /><path d="M19 7v12a2 2 0 0 1-2 2H9" /></svg>;
  return <svg {...p}><path d="M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2.5a2.5 2.5 0 0 0 0 5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2.5a2.5 2.5 0 0 0 0-5z" /><path d="M14 6.5v11" strokeDasharray="2 2.2" /></svg>;
}

/** A few destination tickets fanned out, for the "someone is choosing tickets" moment. */
function TicketFan({ n }: { n: number }) {
  const k = Math.max(1, Math.min(3, n));
  return (
    <div className="relative h-[66px] w-[112px]">
      {Array.from({ length: k }, (_, i) => (
        <div key={i} className="absolute left-2 top-1" style={{ transform: `translate(${(i - (k - 1) / 2) * 7}px, ${-i * 2}px) rotate(${(i - (k - 1) / 2) * 6}deg)` }}>
          <TicketBack />
        </div>
      ))}
    </div>
  );
}

function TrayToggle({ hidden, onToggle, what, testid }: { hidden: boolean; onToggle: () => void; what: string; testid: string }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={hidden} data-testid={testid}
      aria-label={hidden ? `Show my ${what}` : `Hide my ${what}`} title={hidden ? `Show my ${what}` : `Hide my ${what}`}
      className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-panel-2 hover:border-ink">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        {hidden && <path d="M3 3l18 18" />}
      </svg>
    </button>
  );
}

export function describe(e: LogEntry, names: Record<string, string>, me?: string): string {
  const who = 'p' in e ? (e.p === me ? 'You' : names[e.p] ?? 'Someone') : '';
  switch (e.t) {
    case 'drawBlind': return `${who} drew from the deck`;
    case 'drawFaceUp': return `${who} took a ${cardName(e.card).toLowerCase()} card`;
    case 'claim': {
      const r = ROUTE_BY_ID[e.route];
      return `${who} claimed ${cityName(r.a)} – ${cityName(r.b)}`;
    }
    case 'drawTickets': return `${who} drew destination tickets`;
    case 'tickets': return `${who} kept ${e.kept} new ${e.kept === 1 ? 'ticket' : 'tickets'}`;
    case 'pass': return `${who} passed`;
    case 'redeal': return 'Three face-up locomotives: the face-up cards were replaced';
    case 'finalRound': return `${who} ${who === 'You' ? 'are' : 'is'} down to 2 or fewer trains. Final round!`;
  }
}

/** Last-moves line: the player's name in their train colour, and the colour of a taken card in that colour. */
function LogLine({ e, names, me, fills }: { e: LogEntry; names: Record<string, string>; me: string; fills: Record<string, string> }) {
  if (!('p' in e)) return <>{describe(e, names, me)}</>;
  const who = <PlayerWord name={e.p === me ? 'You' : names[e.p] ?? 'Someone'} fill={fills[e.p]} />;
  const text = describe(e, names, me);
  const name = e.p === me ? 'You' : names[e.p] ?? 'Someone';
  // describe() always starts with the name, so the rest of the line is whatever follows it
  const rest = text.startsWith(name) ? text.slice(name.length) : ` ${text}`;
  if (e.t === 'drawFaceUp') return <>{who} took a <CardWord card={e.card} /> card</>;
  return <>{who}{rest}</>;
}

/** A player's name written in their train colour (outlined, so light colours still read). */
function PlayerWord({ name, fill }: { name: string; fill?: string }) {
  if (!fill) return <>{name}</>;
  return (
    <span className="font-semibold" style={{ color: fill, textShadow: '0 0 1px #3b2a1e, 0 0 1px #3b2a1e, 0 0 1px #3b2a1e' }}>{name}</span>
  );
}

export function CardWord({ card }: { card: Card }) {
  if (card === 'locomotive')
    return <span className="font-semibold" style={{ background: LOCO_BG, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>locomotive</span>;
  const light = card === 'white' || card === 'yellow';
  return (
    <span className="font-semibold" data-card-word={card}
      style={{ color: CARD_FILL[card], textShadow: light ? '0 0 1px #3b2a1e, 0 0 1px #3b2a1e, 0 0 1px #3b2a1e' : undefined }}>
      {cardName(card).toLowerCase()}
    </span>
  );
}

function ConfirmLeave({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className={`fade-in fixed inset-0 z-[75] grid place-items-center p-4 ${pick('bg-ink/35 backdrop-blur-[2px]', 'bg-ink/40')}`} onClick={onCancel}>
      <div role="dialog" aria-label="Leave the game?" data-testid="confirm-leave" onClick={(e) => e.stopPropagation()}
        className={`w-[380px] max-w-full rounded-2xl p-5 ${pick('border border-line bg-panel shadow-[0_24px_60px_rgba(20,33,61,.3)]', 'border-2 border-ink bg-ticket shadow-2xl')}`}>
        <h2 className="font-display text-[22px] leading-tight">Leave the game?</h2>
        <p className="mt-1.5 text-[15px] leading-snug text-muted">
          This ends the game for everyone. All players go back to the waiting room, and this game can’t be resumed.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" autoFocus onClick={onCancel} data-testid="stay-in-game" className={pick('rounded-[10px] border border-line-strong bg-panel px-4 py-2 text-[15px] hover:border-ink', 'rounded-lg border-2 border-ink bg-panel px-4 py-2 text-[15px]')}>Stay</button>
          <button type="button" onClick={onConfirm} data-testid="confirm-leave-yes"
            className={pick('rounded-[10px] bg-poster px-4 py-2 font-display text-[16px] text-white shadow-[0_2px_8px_rgba(200,16,46,.3)] hover:bg-poster-dark active:translate-y-px', 'rounded-lg bg-poster px-4 py-2 font-display text-[15px] text-[#fff6e6] shadow-[0_3px_0_#8e2d24] active:translate-y-0.5 active:shadow-none')}>Leave</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmTickets({ n, onConfirm, onCancel }: { n: number; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className={`fade-in fixed inset-0 z-[75] grid place-items-center ${pick('bg-ink/35 backdrop-blur-[2px]', 'bg-ink/40')}`} onClick={onCancel}>
      <div role="dialog" aria-label="Take destination tickets?" data-testid="confirm-tickets" onClick={(e) => e.stopPropagation()}
        className={`w-[380px] rounded-2xl p-5 ${pick('border border-line bg-panel shadow-[0_24px_60px_rgba(20,33,61,.3)]', 'border-2 border-ink bg-ticket shadow-2xl')}`}>
        <div className="mb-3 flex gap-2">
          {Array.from({ length: n }, (_, i) => <div key={i} style={{ transform: `rotate(${(i - 1) * 5}deg)` }}><TicketBack /></div>)}
        </div>
        <h2 className="font-display text-[22px] leading-tight">Take {n} destination {n === 1 ? 'ticket' : 'tickets'}?</h2>
        <p className="mt-1.5 text-[15px] leading-snug text-muted">
          This uses your whole turn, and you must keep at least one. Tickets you keep score their points if you connect the cities by the end, and cost them if you don't.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={pick('rounded-[10px] border border-line-strong bg-panel px-4 py-2 text-[15px] hover:border-ink', 'rounded-lg border-2 border-ink bg-panel px-4 py-2 text-[15px]')}>Cancel</button>
          <button type="button" autoFocus onClick={onConfirm} data-testid="confirm-draw-tickets"
            className={pick('rounded-[10px] bg-poster px-4 py-2 font-display text-[16px] text-white shadow-[0_2px_8px_rgba(200,16,46,.3)] hover:bg-poster-dark active:translate-y-px', 'rounded-lg bg-poster px-4 py-2 font-display text-[15px] text-[#fff6e6] shadow-[0_3px_0_#8e2d24] active:translate-y-0.5 active:shadow-none')}>Draw tickets</button>
        </div>
      </div>
    </div>
  );
}
