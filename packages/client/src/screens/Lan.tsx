import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { BobolandGame } from '@boboland/shared';
import { GameScreen, type PlayerMeta } from '../game/GameScreen';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { addBot, removeBot, createLanMatch, enterGame, joinLanMatch, lanInfo, matchInfo, openNextWaitingRoom, rejoinWaitingRoom, savedSeat, setRoomEdition, setSeatColor, shareUrl, startLanMatch, useOnline, type MatchInfo, type MatchSeat, type Seat } from '../lib/lobby';
import { EDITION, setEdition } from '../edition';
import { editionForMap, editionToFollow, shouldFollow, type FollowAttempt } from '../lib/seatData';
import type { EditionId } from '@boboland/shared/src/editions';
import { canStart, firstFreeColor, joinedSeats, seatColors, MAX_SEATS } from '../lib/lobbyRules';
import { load, save } from '../lib/storage';
import { HSR, INK, PLAYER_COLORS, colorFill } from '../theme';
import { ColorPicker } from './ColorPicker';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { BotPicker, RemoveBot } from './BotPicker';
import { Frame, INPUT_CLASS, PrimaryButton, SecondaryButton, Title } from './Frame';
import { EnterCurtain, clearCurtain, dipToDark, queueCurtain, takeCurtain } from '../curtain/EnterCurtain';

const NAME_KEY = 'boboland.myName';
const TOAST_TEXT = HSR ? 'text-white' : 'text-[#fff6e6]';

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  if (HSR) {
    return (
      <label className="mb-5 grid max-w-xs gap-1.5">
        <span className="hsr-label">Your name</span>
        <input value={value} onChange={(e) => onChange(e.target.value.slice(0, 16))} data-testid="my-name" autoFocus className={INPUT_CLASS} />
      </label>
    );
  }
  return (
    <label className="mb-4 flex items-center gap-3">
      <span className="text-[16px]">Your name</span>
      <input value={value} onChange={(e) => onChange(e.target.value.slice(0, 16))} data-testid="my-name" autoFocus
        className="w-48 rounded-md border-2 border-line-strong bg-panel px-3 py-1.5 text-[16px] focus:border-ink focus:outline-none" />
    </label>
  );
}

/** A game's seats, polled; `next` is the new waiting room once the host starts another game. */
function useSeats(matchID: string, poll: boolean) {
  const [seats, setSeats] = useState<MatchSeat[] | null>(null);
  const [next, setNext] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => matchInfo(matchID).then((i) => { if (alive) { setSeats(i.seats); setNext(i.nextMatchID); setError(null); } })
      .catch(() => alive && setError('That game could not be found. It may have ended when the host’s server restarted. Ask the host to start a new game.'));
    void tick();
    const id = poll ? setInterval(tick, 1200) : undefined;
    return () => { alive = false; clearInterval(id); };
  }, [matchID, poll]);
  return { seats, next, error };
}

const metaFrom = (seats: MatchSeat[]): PlayerMeta[] =>
  seats.map((s) => ({ id: String(s.id), name: s.name ?? `Player ${s.id + 1}`, fill: colorFill(s.color ?? s.id), ...(s.bot ? { bot: s.bot } : {}) }));

/** The waiting room's state, polled: who has joined, their colours, and the real game once the host starts. */
function useWaitingRoom(matchID: string) {
  const [info, setInfo] = useState<MatchInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = () => matchInfo(matchID).then((i) => { if (alive) { setInfo(i); setError(null); } })
      .catch(() => alive && setError('That game could not be found. It may have ended when the host’s server restarted. Ask the host to start a new game.'));
    void tick();
    const id = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(id); };
  }, [matchID]);
  return { info, error, refresh: () => matchInfo(matchID).then(setInfo).catch(() => {}) };
}

const FOLLOW_KEY = 'ttb.follow';
const readFollow = (): FollowAttempt | null => {
  try { return JSON.parse(sessionStorage.getItem(FOLLOW_KEY) ?? 'null') as FollowAttempt | null; } catch { return null; }
};

/**
 * Keep this page on the edition the room plays. When the host's choice (`room`) is valid and differs from the
 * edition this page loaded with, save it and reload. After the reload they match, so it never repeats; a
 * session-storage note stops a reload loop if the choice cannot be saved.
 */
function useFollowEdition(room: EditionId | undefined) {
  useEffect(() => {
    const target = editionToFollow(room, EDITION.id);
    if (!target || !shouldFollow(target, readFollow(), Date.now())) return;
    try { sessionStorage.setItem(FOLLOW_KEY, JSON.stringify({ id: target, at: Date.now() })); } catch { /* guard is best effort */ }
    setEdition(target);
  }, [room]);
}

export function LanHost() {
  const [name, setName] = useState(load(NAME_KEY, ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = useOnline();
  const create = async () => {
    setBusy(true);
    save(NAME_KEY, name.trim());
    try {
      const seat = await createLanMatch(name.trim());
      navigate(`/wait/${seat.matchID}`);
    } catch {
      setError('Could not reach the game server. Start it with `npm start` on this computer, then try again.');
      setBusy(false);
    }
  };
  return (
    <Frame edition>
      <Title sub={online
        ? `You'll host the game on this computer. Up to ${MAX_SEATS - 1} others join from anywhere with the link you'll get next, and you start when everyone's in.`
        : `You'll host the game on this computer. Up to ${MAX_SEATS - 1} others join on the same Wi-Fi, and you start when everyone's in.`} />
      <NameField value={name} onChange={setName} />
      {error && <p className="mb-4 rounded-md bg-poster/10 px-3 py-2 text-[14px] text-poster">{error}</p>}
      <div className="flex gap-3">
        <PrimaryButton disabled={!name.trim() || busy} onClick={create} data-testid="host-game">Host a game</PrimaryButton>
        <SecondaryButton onClick={() => navigate('/menu')}>Back</SecondaryButton>
      </div>
    </Frame>
  );
}

export function LanWaiting({ matchID }: { matchID: string }) {
  const me = useMemo(() => savedSeat(matchID), [matchID]);
  const { info, error, refresh } = useWaitingRoom(matchID);
  useFollowEdition(info?.edition);
  const [lan, setLan] = useState<{ lanIp?: string; publicUrl?: string | null }>({});
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  useEffect(() => { lanInfo().then((i) => setLan({ lanIp: i.addresses[0], publicUrl: i.publicUrl })).catch(() => {}); }, []);
  useEffect(() => { if (!me) navigate(`/join/${matchID}`, true); }, [me, matchID]);
  // once the host starts, everyone moves into the real game
  const next = info?.nextMatchID;
  // `info` keeps refreshing while we dip to dark, so enter each next match only once
  const entering = useRef<string | null>(null);
  useEffect(() => {
    if (!me || !info || !next || entering.current === next) return;
    entering.current = next;
    enterGame(me, info.seats, next).then(async (s) => { queueCurtain(s.matchID); await dipToDark(); navigate(`/play/${s.matchID}`, true); })
      .catch(() => { entering.current = null; setStartError('The game started without you. Ask the host to start a new one.'); });
  }, [me, info, next]);

  const url = shareUrl(lan, matchID);
  const online = !!lan.publicUrl;
  const seats = info?.seats ?? [];
  const joined = joinedSeats(seats);
  const colors = seatColors(seats, PLAYER_COLORS.length);
  const colorOf = (id: number) => colors[joined.findIndex((s) => s.id === id)];
  const host = me?.playerID === '0';
  const mine = me && joined.some((s) => String(s.id) === me.playerID) ? colorOf(Number(me.playerID)) : undefined;
  const takenByOthers = new Set(joined.filter((s) => String(s.id) !== me?.playerID).map((s) => colorOf(s.id)));
  const pick = async (c: number) => { if (me) { await setSeatColor(me, c).catch(() => {}); void refresh(); } };
  // only the host picks the map: save it on seat 0, then reload into it (everyone else follows from the poll)
  const switchRoom = async (id: EditionId) => {
    if (!me || !host || id === EDITION.id) return;
    try { await setRoomEdition(me, id); setEdition(id); } catch { setStartError('Could not change the map. Try again.'); }
  };
  const editionBar = { locked: !host || !!next, onChange: (id: EditionId) => void switchRoom(id) };
  const [botBusy, setBotBusy] = useState(false);
  const botOp = async (op: () => Promise<unknown>) => {
    setBotBusy(true); setStartError(null);
    try { await op(); } catch (e) { setStartError(e instanceof Error ? e.message : 'Bot request failed.'); }
    setBotBusy(false); void refresh();
  };
  const canAddBot = host && !next && joined.length < MAX_SEATS;
  const botPicker = canAddBot && me ? <BotPicker busy={botBusy} onAdd={(l) => void botOp(() => addBot(me, l))} /> : null;
  const removeBtn = (s: MatchSeat) => host && s.bot && me && !next
    ? <RemoveBot name={s.name ?? ''} seatId={s.id} busy={botBusy} onClick={() => void botOp(() => removeBot(me, String(s.id)))} /> : null;
  const botTag = (s: MatchSeat) => s.bot ? <span className="text-[13px] text-muted" data-testid={`bot-tag-${s.id}`}>bot · {s.bot[0].toUpperCase() + s.bot.slice(1)}</span> : null;
  const start = async () => {
    if (!me) return;
    setStarting(true);
    try { await startLanMatch(me, joined.length); void refresh(); } catch { setStartError('Could not start the game. Try again.'); setStarting(false); }
  };

  const intro = (
    <>
      {online
        ? `Send this link to the other players (up to ${MAX_SEATS} in all). It works from anywhere on the internet.`
        : `Open this link on the other computers, or scan the code (up to ${MAX_SEATS} players).`}
      {' '}{host ? 'Start the game when everyone is in.' : 'The host starts the game when everyone is in.'}
    </>
  );
  const actions = (
    <>
      {host ? (
        <PrimaryButton disabled={!canStart(seats) || starting || !!next} onClick={() => void start()} data-testid="start-lan">
          {canStart(seats) ? `Start the game (${joined.length} players)` : 'Waiting for players…'}
        </PrimaryButton>
      ) : (
        <p className="text-[15px] text-muted" data-testid="waiting-for-host">Waiting for the host to start…</p>
      )}
      <SecondaryButton onClick={() => navigate('/menu')}>Leave</SecondaryButton>
    </>
  );
  const footnote = online
    ? 'The host keeps their computer on and awake until the game ends: it is hosting the game for everyone.'
    : "If another computer can't connect, allow Node.js through the Windows firewall for private networks. To play with someone in another place, start the game with npm run play:online instead.";

  if (HSR) {
    return (
      <Frame wide edition={editionBar}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-display text-[38px] uppercase leading-none tracking-[0.03em]">Waiting Room</h1>
          <span className="hsr-zh text-[20px] font-bold tracking-[0.3em] text-muted" aria-hidden>候车室</span>
          {online && <span className="hsr-tag ml-auto bg-[var(--color-rail)] text-white" data-testid="online-badge">Online game</span>}
        </div>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{intro}</p>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          <figure className="hsr-qr shrink-0 self-center sm:self-start">
            <QRCodeSVG value={url} size={132} fgColor={INK} bgColor="#ffffff" />
            <figcaption className="mt-2 text-center text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted">
              <span className="hsr-zh mr-1.5 tracking-[0.2em]" aria-hidden>扫码上车</span>Scan to join
            </figcaption>
          </figure>
          <div className="min-w-0 flex-1">
            <div className="hsr-label mb-1.5">Invite link</div>
            <div className="flex items-stretch gap-2">
              <div className="hsr-url min-w-0 flex-1 select-text break-all" data-testid="share-url">{url}</div>
              <button type="button" className="hsr-btn hsr-btn-secondary !min-h-0 !px-3.5 !py-1.5 !text-[14px]"
                onClick={() => navigator.clipboard?.writeText(url)}>Copy link</button>
            </div>
            <div className="hsr-label mb-1.5 mt-4">Passengers</div>
            <ul className="grid gap-2 sm:grid-cols-2" data-testid="waiting-players">
              {joined.map((s) => (
                <li key={s.id} className="hsr-seat !py-2" data-seat={s.id} data-bot={s.bot} data-color={colorOf(s.id)} style={{ ['--seat' as string]: colorFill(colorOf(s.id)) }}>
                  <span className="hsr-seat-no" aria-hidden><small>SEAT</small><b>{String(s.id + 1).padStart(2, '0')}</b></span>
                  <span className="min-w-0 truncate text-[15.5px] font-semibold">{s.name}</span>
                  {String(s.id) === me?.playerID && <span className="text-[13px] text-muted">(you)</span>}
                  {botTag(s)}
                  {s.id === 0 && <span className="hsr-tag ml-auto bg-ink text-white">host</span>}
                  {s.bot && <span className="ml-auto">{removeBtn(s)}</span>}
                </li>
              ))}
              {Array.from({ length: Math.max(0, MAX_SEATS - joined.length) }, (_, i) => (
                <li key={`open-${i}`} className="hsr-seat hsr-seat-open !py-2 text-[14.5px]">
                  <span className="hsr-seat-no !text-muted" aria-hidden><small>SEAT</small><b>{String(joined.length + i + 1).padStart(2, '0')}</b></span>
                  Open seat
                </li>
              ))}
            </ul>
            {botPicker && <div className="mt-3">{botPicker}</div>}
          </div>
        </div>
        {mine !== undefined && (
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4">
            <span className="hsr-label">Your colour</span>
            <ColorPicker label="Your colour" testId="my-color" value={mine} taken={[...takenByOthers]} onChange={(c) => void pick(c)} />
          </div>
        )}
        {(error || startError) && <p className="mt-4 rounded-lg bg-poster/10 px-3 py-2 text-[14px] text-poster">{startError ?? error}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>
        <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-muted">{footnote}</p>
      </Frame>
    );
  }

  return (
    <Frame wide edition={editionBar}>
      <h1 className="font-display text-[34px] leading-tight">Waiting Room</h1>
      <p className="mt-1 text-[15px] text-muted">{intro}</p>
      {online && <div className="mt-2 inline-block rounded-full border-2 border-ink bg-mustard px-3 py-0.5 text-[13px] font-semibold" data-testid="online-badge">Online game</div>}
      <div className="mt-5 flex items-start gap-6">
        <div className="shrink-0 rounded-lg border-2 border-ink bg-white p-2.5"><QRCodeSVG value={url} size={132} fgColor={INK} bgColor="#ffffff" /></div>
        <div className="min-w-0 flex-1">
          <div className="select-text break-all font-display text-[20px] text-poster" data-testid="share-url">{url}</div>
          <button type="button" className="mt-1 text-[14px] text-muted underline decoration-dotted underline-offset-4 hover:text-ink"
            onClick={() => navigator.clipboard?.writeText(url)}>Copy link</button>
          <ul className="mt-3 grid gap-1.5" data-testid="waiting-players">
            {joined.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[16px]" data-seat={s.id} data-bot={s.bot} data-color={colorOf(s.id)}>
                <span className="h-4 w-4 rounded-full border border-ink/40" style={{ background: colorFill(colorOf(s.id)) }} />
                <span className="font-semibold">{s.name}</span>
                {String(s.id) === me?.playerID && <span className="text-muted">(you)</span>}
                {botTag(s)}{removeBtn(s)}
                {s.id === 0 && <span className="rounded-full bg-ink px-2 text-[11px] text-paper">host</span>}
              </li>
            ))}
            {Array.from({ length: Math.max(0, MAX_SEATS - joined.length) }, (_, i) => (
              <li key={`open-${i}`} className="flex items-center gap-2 text-[15px] text-muted">
                <span className="h-4 w-4 rounded-full border border-dashed border-line-strong" />Open seat
              </li>
            ))}
          </ul>
          {botPicker && <div className="mt-3">{botPicker}</div>}
        </div>
      </div>
      {mine !== undefined && (
        <div className="mt-5 flex items-center gap-4">
          <span className="text-[15px]">Your colour</span>
          <ColorPicker label="Your colour" testId="my-color" value={mine} taken={[...takenByOthers]} onChange={(c) => void pick(c)} />
        </div>
      )}
      {(error || startError) && <p className="mt-4 text-[14px] text-poster">{startError ?? error}</p>}
      <div className="mt-5 flex items-center gap-3">{actions}</div>
      <p className="mt-5 text-[13px] text-muted">{footnote}</p>
    </Frame>
  );
}

export function LanJoin({ matchID }: { matchID: string }) {
  const existing = savedSeat(matchID);
  const { info, error } = useWaitingRoom(matchID);
  useFollowEdition(info?.edition); // an invite link always lands on the room's map
  const [name, setName] = useState(load(NAME_KEY, ''));
  const [busy, setBusy] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  useEffect(() => { if (existing) navigate(`/wait/${matchID}`, true); }, [existing, matchID]);
  const seats = info?.seats;
  const open = seats?.some((s) => !s.name);
  const started = !!info?.nextMatchID;

  const join = async () => {
    setBusy(true);
    save(NAME_KEY, name.trim());
    try {
      await joinLanMatch(matchID, name.trim(), undefined, firstFreeColor(seats ?? [], PLAYER_COLORS.length));
      navigate(`/wait/${matchID}`);
    } catch {
      setJoinError('Every seat in this game is taken.');
      setBusy(false);
    }
  };
  return (
    <Frame>
      <Title sub="You've been invited to a game. Enter your name to take a seat." />
      {started && <p className="mb-4 rounded-md bg-poster/10 px-3 py-2 text-[14px] text-poster">This game has already started.</p>}
      {seats && !open && !started && <p className="mb-4 rounded-md bg-poster/10 px-3 py-2 text-[14px] text-poster">Every seat in this game is taken.</p>}
      {(error || joinError) && <p className="mb-4 rounded-md bg-poster/10 px-3 py-2 text-[14px] text-poster">{error ?? joinError}</p>}
      <NameField value={name} onChange={setName} />
      <div className="flex gap-3">
        <PrimaryButton disabled={!name.trim() || busy || !open || started} onClick={join} data-testid="join-game">Join the game</PrimaryButton>
        <SecondaryButton onClick={() => navigate('/menu')}>Back</SecondaryButton>
      </div>
    </Frame>
  );
}

export function LanGame({ matchID }: { matchID: string }) {
  const seat = useMemo<Seat | null>(() => savedSeat(matchID), [matchID]);
  const { seats, next, error } = useSeats(matchID, true);
  // coming straight from the waiting room: play the themed curtain over the board as it loads
  const [curtain, setCurtain] = useState(() => takeCurtain(matchID));
  const [curtainSince] = useState(() => performance.now());
  // after the game: the host opens a new waiting room and everyone moves into it, keeping seat and colour
  const [opening, setOpening] = useState(false);
  const [newGameError, setNewGameError] = useState<string | null>(null);
  const myColor = seat && seats ? seats[Number(seat.playerID)]?.color : undefined;
  useEffect(() => {
    if (!seat || !next) return;
    rejoinWaitingRoom(seat, next, myColor).then(() => navigate(`/wait/${next}`, true))
      .catch(() => setNewGameError('Could not join the new waiting room.'));
  }, [seat, next]); // eslint-disable-line react-hooks/exhaustive-deps
  const backToRoom = (failure: string) => {
    if (!seat || opening || next) return;
    setOpening(true);
    openNextWaitingRoom(seat).then((id) => rejoinWaitingRoom(seat, id, myColor)).then((s) => navigate(`/wait/${s.matchID}`, true))
      .catch(() => { setOpening(false); setNewGameError(failure); });
  };
  const newGame = useMemo(() => seat && {
    allowed: seat.playerID === '0',
    busy: opening || !!next,
    onStart: () => backToRoom('Could not start a new game. Try again.'),
  }, [seat, opening, next, myColor]);
  /** Open the next waiting room (idempotent on the server: the first caller creates it) and go there; everyone else follows through `next`. */
  const leaveGame = () => backToRoom('Could not leave the game. Try again.');
  const players = useMemo(() => (seats ? metaFrom(seats) : null), [seats && seats.map((s) => `${s.name}${s.bot ?? ''}`).join('|')]);
  const client = useMemo(() => {
    if (!seat || !seats) return null;
    return Client({
      game: BobolandGame, numPlayers: seats.length, matchID, playerID: seat.playerID, credentials: seat.credentials,
      multiplayer: SocketIO({ server: window.location.origin }), debug: false,
    }) as unknown as BgioClient;
  }, [seat, matchID, seats?.length]);
  useEffect(() => {
    if (!client) return;
    client.start();
    return () => client.stop();
  }, [client]);
  const state = useClientState(client);
  // a game on another map than this page shows (the host switched in another tab): reload into that edition
  const gameEdition = editionForMap(state?.G.mapId);
  const wrongMap = !!state && !!gameEdition && gameEdition !== EDITION.id;
  useFollowEdition(wrongMap ? gameEdition : undefined);
  // boardgame.io swaps in a new array for each message, and notifies subscribers (re-rendering us)
  const rawChat = client?.chatMessages;
  const chat = useMemo(() => ({
    lines: (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null),
    send: (p: ChatPayload) => client?.sendChatMessage?.(p),
  }), [rawChat, client]);

  const ready = !!state && !!players && !wrongMap;
  const curtainEl = curtain && <EnterCurtain ready={ready} since={curtainSince} onDone={() => { clearCurtain(); setCurtain(false); }} />;
  // The curtain stays the first child in every branch, so it is never remounted (that restarted its animation).
  const view = () => {
    if (!seat) {
      return (
        <Frame>
          <Title sub="This computer doesn't have a seat in that game yet." />
          <PrimaryButton onClick={() => navigate(`/join/${matchID}`)}>Join the game</PrimaryButton>
        </Frame>
      );
    }
    if (error && !seats) {
      return (
        <Frame>
          <Title sub={error} />
          <PrimaryButton onClick={() => navigate('/menu')}>Back to start</PrimaryButton>
        </Frame>
      );
    }
    if (!state || !players || wrongMap) {
      return <Frame><p className="font-display text-2xl">{wrongMap ? 'Switching to the game’s map…' : 'Connecting to the game…'}</p></Frame>;
    }
    return (
      <div className="relative h-full">
        <GameScreen state={state} playerID={seat.playerID} moves={client!.moves} players={players} onExit={() => navigate('/menu')} exitLabel="Leave" onLeave={leaveGame} chat={chat} hidden={curtain}
          newGame={newGame ?? undefined} />
        {newGameError && (
          <div className={`absolute bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-poster px-4 py-1.5 text-[14px] ${TOAST_TEXT} shadow-lg`}>{newGameError}</div>
        )}
        {!state.isConnected && (
          <div className={`absolute left-1/2 top-16 z-[70] -translate-x-1/2 rounded-full bg-poster px-4 py-1.5 text-[14px] ${TOAST_TEXT} shadow-lg`}>
            Connection lost. Reconnecting…
          </div>
        )}
      </div>
    );
  };
  return <>{curtainEl}{view()}</>;
}
