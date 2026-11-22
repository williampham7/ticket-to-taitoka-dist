import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { BobolandGame, legalActions, paymentOptions, ROUTE_BY_ID } from '@boboland/shared';
import { GameScreen, describe, type PlayerMeta } from '../game/GameScreen';
import { seatToShow } from '../game/selectors';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { gameOnMap } from '../lib/setupGame';
import { EDITION } from '../edition';
import { navigate } from '../lib/router';
import { load, save } from '../lib/storage';
import { sfx } from '../lib/sound';
import { busyRemaining } from '../game/fx';
import { HSR, PLAYER_COLORS, colorFill, isValidColor } from '../theme';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { Frame, PrimaryButton, SecondaryButton, Title, ZH_TAGLINE } from './Frame';
import { CountPicker, PlayerRow, type SetupPlayer } from './PlayerSetup';

const NAMES_KEY = 'boboland.localPlayers';
const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];

export function LocalScreen() {
  const [started, setStarted] = useState<PlayerMeta[] | null>(null);
  if (started) return <LocalGame players={started} onExit={() => navigate('/menu')} onNewGame={() => setStarted(null)} />;
  return <LocalSetup onStart={setStarted} />;
}

function LocalSetup({ onStart }: { onStart: (p: PlayerMeta[]) => void }) {
  const saved = load<SetupPlayer[]>(NAMES_KEY, []);
  const [count, setCount] = useState(Math.max(2, Math.min(5, saved.length || 2)));
  const [players, setPlayers] = useState<SetupPlayer[]>(() => {
    const list = DEFAULT_NAMES.map((name, i) => saved[i] ?? { name, color: i });
    // a colour saved by an older version (a custom colour, or a preset that no longer exists) becomes the first free preset
    const used = new Set(list.map((p) => p.color).filter(isValidColor));
    return list.map((p) => {
      if (isValidColor(p.color)) return p;
      let free = 0;
      while (used.has(free) && free < PLAYER_COLORS.length - 1) free++;
      used.add(free);
      return { ...p, color: free };
    });
  });
  const active = players.slice(0, count);
  const valid = active.every((p) => p.name.trim()) && new Set(active.map((p) => p.color)).size === count;
  const start = () => {
    save(NAMES_KEY, active);
    onStart(active.map((p, i) => ({ id: String(i), name: p.name.trim(), fill: colorFill(p.color) })));
  };
  return (
    <Frame edition>
      <Title compact />
      <div className="mb-4 flex items-center gap-4">
        <span className={HSR ? 'hsr-label' : 'text-[16px]'}>Players</span>
        <CountPicker value={count} onChange={setCount} />
      </div>
      <div className={`mb-6 grid ${HSR ? 'gap-2' : 'gap-2.5'}`}>
        {active.map((p, i) => (
          <PlayerRow key={i} index={i} player={p} taken={active.filter((_, j) => j !== i).map((x) => x.color)}
            onChange={(np) => setPlayers((all) => all.map((x, j) => (j === i ? np : x)))} />
        ))}
      </div>
      <div className="flex gap-3">
        <PrimaryButton onClick={start} disabled={!valid} data-testid="start-local">Start the game</PrimaryButton>
        <SecondaryButton onClick={() => navigate('/menu')}>Back</SecondaryButton>
      </div>
    </Frame>
  );
}

function LocalGame({ players, onExit, onNewGame }: { players: PlayerMeta[]; onExit: () => void; onNewGame: () => void }) {
  const clients = useMemo(() => {
    const seed = new URLSearchParams(window.location.search).get('seed');
    // on this page's edition's map (the switcher on the setup screen changes it)
    const onMap = gameOnMap(BobolandGame, EDITION.map);
    const game = seed ? { ...onMap, seed } : onMap;
    const multiplayer = Local();
    return players.map((p) => Client({ game, numPlayers: players.length, multiplayer, playerID: p.id, debug: false }) as unknown as BgioClient);
  }, [players]);
  useEffect(() => {
    // Dev-only hook for fast-forwarding a game while testing the UI.
    if (import.meta.env.DEV) Object.assign(window, { __bobo: { clients, legalActions, paymentOptions, ROUTE_BY_ID } });
    clients.forEach((c) => c.start());
    return () => clients.forEach((c) => c.stop());
  }, [clients]);

  const first = useClientState(clients[0]);
  const seat = first ? seatToShow(first.G, first.ctx) : '0';
  // The screen keeps showing the player who just moved until their animations finish and the curtain has closed;
  // only then is the next player's screen built (behind the opaque curtain).
  const [screenSeat, setScreenSeat] = useState(seat);
  const [handoff, setHandoff] = useState<'none' | 'waiting' | 'closing'>('none');
  useEffect(() => {
    if (seat === screenSeat) {
      // the turn came back to the seat already on screen (e.g. a 1-turn round): nothing to hand over
      setHandoff((h) => (h === 'waiting' ? 'none' : h));
      return;
    }
    setHandoff('waiting');
    const t = setTimeout(() => setHandoff('closing'), Math.max(350, busyRemaining() + 200));
    return () => clearTimeout(t);
  }, [seat, screenSeat]);
  useEffect(() => {
    if (handoff !== 'closing') return;
    const t = setTimeout(() => { setScreenSeat(seat); setHandoff('none'); }, 240);
    return () => clearTimeout(t);
  }, [handoff, seat]);
  const seatClient = clients[Number(screenSeat)];
  const seatState = useClientState(seatClient);
  // chat goes through the in-browser game host to every seat; whoever is on screen is the sender
  const rawChat = seatClient.chatMessages;
  const chat = useMemo(() => ({
    lines: (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null),
    send: (p: ChatPayload) => seatClient.sendChatMessage?.(p),
  }), [rawChat, seatClient]);
  const [revealed, setRevealed] = useState<string | null>(null);
  const over = !!first?.G.result;
  // log position each seat last saw, so the curtain can recap what happened while they looked away
  const seenAt = useRef<Record<string, number>>({});

  if (!first || !seatState) return null;
  const who = players[Number(seat)];
  const curtain = !over && (handoff === 'closing' || (handoff === 'none' && revealed !== screenSeat));
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const since = seenAt.current[seat];
  const recap = since === undefined ? [] : collapse(first.G.log.slice(since).filter((e) => !('p' in e) || e.p !== seat).map((e) => describe(e, names)));

  return (
    <div className="relative h-full">
      <GameScreen key={screenSeat} state={seatState} playerID={screenSeat} moves={clients[Number(screenSeat)].moves} players={players}
        onExit={() => (over || window.confirm('Quit this game? It can’t be resumed.')) && onExit()} exitLabel="Quit" shared chat={chat} hidden={curtain}
        newGame={{ allowed: true, onStart: onNewGame }} />
      {handoff === 'waiting' && <div className="absolute inset-0 z-[55]" aria-hidden data-testid="handoff-wait" />}
      {curtain && HSR && (
        <HsrCurtain who={who} tickets={first.ctx.phase === 'chooseTickets'} lastTurn={!!first.G.finalRound && first.ctx.phase === 'main'} recap={recap}
          onReveal={() => { sfx.turn(); seenAt.current[seat] = first.G.log.length; setRevealed(seat); }} />
      )}
      {curtain && !HSR && (
        <div className="fade-in absolute inset-0 z-[60] grid place-items-center bg-ink" data-testid="curtain">
          <div className="text-center">
            <p className="mb-2 font-serif text-[17px] italic text-paper/70">
              {first.ctx.phase === 'chooseTickets' ? 'Choosing destination tickets' : 'Next up'}
            </p>
            {first.G.finalRound && first.ctx.phase === 'main' && (
              <div className="mx-auto mb-3 w-fit rounded-full border-2 border-ink bg-mustard px-4 py-1 font-display text-[18px] text-ink" data-testid="curtain-last-turn">Last turn!</div>
            )}
            <h2 className="mb-6 font-display text-5xl" style={{ color: who.fill }}>
              <span className="text-paper">Pass to </span>{who.name}
            </h2>
            {recap.length > 0 && (
              <div className="mx-auto mb-6 max-w-md rounded-xl border border-paper/25 bg-paper/10 px-5 py-3 text-left" data-testid="recap">
                <div className="mb-1 text-[14px] text-paper/60">Since your last turn</div>
                <ul className="grid gap-0.5 text-[16px] text-paper">{recap.map((line, i) => <li key={i}>{line}</li>)}</ul>
              </div>
            )}
            <PrimaryButton autoFocus onClick={() => { sfx.turn(); seenAt.current[seat] = first.G.log.length; setRevealed(seat); }} data-testid="reveal">I'm {who.name}, show my cards</PrimaryButton>
            <p className="mt-4 text-[14px] text-paper/60">Everyone else, look away.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * HSR hand-over screen: a station's platform screen doors, closed, with the LED strip above them and the yellow
 * platform edge below. Fully opaque, so nothing of the previous player's hand shows through.
 */
function HsrCurtain({ who, tickets, lastTurn, recap, onReveal }: {
  who: PlayerMeta; tickets: boolean; lastTurn: boolean; recap: string[]; onReveal: () => void;
}) {
  const nameColor = who.fill;
  return (
    <div className="hsr-curtain fade-in absolute inset-0 z-[60]" data-testid="curtain">
      <div className="hsr-door hsr-door-l" aria-hidden />
      <div className="hsr-door hsr-door-r" aria-hidden />
      <div className="hsr-platform-led" aria-hidden>
        <span className="flex items-center gap-2.5"><span className="hsr-platform-dot" /><span className="zh">站台</span> Platform 1</span>
        {ZH_TAGLINE && <span className="hidden sm:inline"><span className="zh">{ZH_TAGLINE}</span> · G1</span>}
        <span><span className="zh">{tickets ? '选票' : '下一位'}</span></span>
      </div>
      <div className="hsr-platform" aria-hidden />
      <div className="relative grid h-full overflow-auto px-4 pb-12 pt-16 [place-items:safe_center]">
        <div className="hsr-screen w-full max-w-xl px-5 py-8 text-center sm:px-10 sm:py-10">
          <p className="mb-3 font-display text-[15px] font-semibold uppercase tracking-[0.22em] text-[#ffb21a]">
            {tickets ? 'Choosing destination tickets' : 'Next up'}
          </p>
          {lastTurn && (
            <div className="mb-4" data-testid="curtain-last-turn">
              <span className="hsr-last-turn"><span className="hsr-zh text-[15px]" aria-hidden>最后一轮</span>Last turn!</span>
            </div>
          )}
          <p className="hsr-board-zh text-[40px] leading-tight text-white sm:text-[54px]" aria-hidden>
            请 <span style={{ color: nameColor }}>{who.name}</span> 上车
          </p>
          <h2 className="mb-7 mt-1 font-display text-[24px] tracking-[0.06em] text-white/75 sm:text-[28px]">
            <span style={{ color: nameColor }}>{who.name}</span>, please board
          </h2>
          {recap.length > 0 && (
            <div className="hsr-recap mx-auto mb-7 max-w-md px-5 py-3 text-left" data-testid="recap">
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">Since your last turn</div>
              <ul className="grid gap-1 text-[15px] text-white/90">{recap.map((line, i) => <li key={i}>{line}</li>)}</ul>
            </div>
          )}
          <PrimaryButton autoFocus onClick={onReveal} data-testid="reveal">I'm {who.name}, show my cards</PrimaryButton>
          <p className="mt-4 text-[14px] text-white/55">Everyone else, look away.<span className="hsr-zh ml-2 text-white/40" aria-hidden>其他乘客请回避</span></p>
        </div>
      </div>
    </div>
  );
}

/** "Bo drew from the deck" ×2 instead of two identical lines. */
function collapse(lines: string[]): string[] {
  const out: { text: string; n: number }[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    if (last && last.text === l) last.n++;
    else out.push({ text: l, n: 1 });
  }
  return out.slice(-8).map((o) => (o.n > 1 ? `${o.text} (×${o.n})` : o.text));
}
