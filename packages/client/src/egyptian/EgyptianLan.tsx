import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { EgyptianGame, type SlapRuleId } from '@boboland/shared/src/egyptian';
import { canStart } from '@boboland/shared';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { navigate } from '../lib/router';
import { inviteUrl, usePartyState } from '../lib/party';
import { controlsFor, viewOf, type EgwClientState } from './controls';
import { EgwScreen } from './EgwScreen';
import { EGW_COLORS, EGW_COLOR_NAMES } from './colors';
import { loadLocal } from './localSetup';
import { RulesChecklist } from './RulesChecklist';
import {
  createRoom, egwUrl, enterGame, gameInfo, joinedSeats, joinRoom, leaveRoom, openNextRoom, rejoinRoom, roomInfo, savedSeat,
  setRoomRules, setSeatColor, startGame, type EgwSeat, type GameInfo, type RoomInfo,
} from './lobby';
import { seatColors } from '@boboland/shared';
import './menu.css';

function Shell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="egw egw-menu">
      <section className="egw-hero"><h1 className="egw-display egw-hero-title" style={{ fontSize: 40 }}>{title}</h1></section>
      <div className="egw-panel" style={{ padding: 22, display: 'grid', gap: 12, justifyItems: 'center' }}>{children}</div>
    </main>
  );
}

/** Open a waiting room with me in seat 0 and the rules I used last. */
export function EgwHost() {
  const { name } = usePartyState();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !name) return;
    started.current = true;
    createRoom(name, loadLocal().rules).then((s) => navigate(`/egyptian/wait/${s.matchID}`, true), () => setError('Could not reach the game server. Is it running?'));
  }, [name]);
  return (
    <Shell title={error ? 'Host a game' : 'Opening the room…'}>
      {error ? <><p className="egw-warn" role="alert">{error}</p><button type="button" className="egw-btn" onClick={() => navigate('/egyptian')}>Back</button></> : <p className="egw-sub">Setting up the table…</p>}
    </Shell>
  );
}

/** Take the first free seat in a waiting room. */
export function EgwJoin({ matchID }: { matchID: string }) {
  const { name } = usePartyState();
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/egyptian/wait/${matchID}`, true); return; }
    if (!name || tried.current) return;
    tried.current = true;
    joinRoom(matchID, name).then(() => navigate(`/egyptian/wait/${matchID}`, true), () => setError('Could not join: the room is full or has closed.'));
  }, [matchID, name]);
  return (
    <Shell title="Joining…">
      {error ? <><p className="egw-warn" role="alert">{error}</p><button type="button" className="egw-btn" onClick={() => navigate('/egyptian')}>Back</button></> : <p className="egw-sub">Taking your seat…</p>}
    </Shell>
  );
}

function usePoll<T>(fetcher: () => Promise<T>, ms: number, deps: unknown[]): { data: T | null; error: boolean; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const f = useRef(fetcher);
  f.current = fetcher;
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = () => f.current().then((d) => { if (alive) { setData(d); setError(false); } }, () => alive && setError(true));
    tick();
    const t = setInterval(tick, ms);
    return () => { alive = false; clearInterval(t); };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, refresh: () => setN((x) => x + 1) };
}

/** The waiting room: seats and colours, the host's rules (live for everyone), the invite, Start. */
export function EgwWaiting({ matchID }: { matchID: string }) {
  const me = useMemo(() => savedSeat(matchID), [matchID]);
  useEffect(() => { if (!me) navigate(`/egyptian/join/${matchID}`, true); }, [me, matchID]);
  const { data: info, error, refresh } = usePoll<RoomInfo>(() => roomInfo(matchID), 1000, [matchID]);
  const host = me?.playerID === '0';
  const [draft, setDraft] = useState<SlapRuleId[] | null>(null);
  const rules = host && draft ? draft : info?.rules ?? [];
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const party = usePartyState();
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (party.party) void inviteUrl(party.party.id).then(setUrl);
    else void egwUrl(`/egyptian/join/${matchID}`).then(setUrl);
  }, [party.party?.id, matchID]); // eslint-disable-line react-hooks/exhaustive-deps

  // the host started: everyone moves into the game
  const next = info?.nextMatchID;
  const entering = useRef<string | null>(null);
  useEffect(() => {
    if (!me || !info || !next || entering.current === next) return;
    entering.current = next;
    enterGame(me, info.seats, next).then((s) => navigate(`/egyptian/play/${s.matchID}`, true))
      .catch(() => { entering.current = null; setProblem('The game started without you. Ask the host to start a new one.'); });
  }, [me, info, next]);

  if (!me) return null;
  if (error && !info) return <Shell title="Room closed"><p className="egw-sub">That waiting room could not be found.</p><button type="button" className="egw-btn" onClick={() => navigate('/egyptian')}>Back</button></Shell>;
  const seats = info?.seats ?? [];
  const joined = joinedSeats(seats);
  const colors = seatColors(seats, EGW_COLORS.length);
  const colorOf = (id: number) => colors[joined.findIndex((s) => s.id === id)];
  const mine = colorOf(Number(me.playerID));
  const taken = new Set(joined.filter((s) => String(s.id) !== me.playerID).map((s) => colorOf(s.id)));
  const changeRules = (r: SlapRuleId[]) => { setDraft(r); void setRoomRules(me, r).then(refresh); };
  const start = () => {
    setStarting(true);
    startGame(me, joined.length, rules).catch(() => { setStarting(false); setProblem('Could not start the game.'); });
  };
  return (
    <main className="egw egw-menu" data-testid="egw-waiting">
      <header className="egw-menu-bar">
        <button type="button" className="egw-btn egw-btn-ghost" data-testid="egw-room-leave" onClick={() => { void leaveRoom(me).finally(() => navigate('/egyptian')); }}>← Leave room</button>
      </header>
      <section className="egw-hero" style={{ marginBottom: 18 }}>
        <p className="egw-eyebrow">Waiting room</p>
        <h1 className="egw-display egw-hero-title" style={{ fontSize: 'clamp(34px, 5vw, 52px)' }}>Egyptian War</h1>
      </section>
      <div className="egw-room">
        <div className="egw-room-col">
          <section className="egw-panel" aria-label="Players">
            <h2 className="egw-eyebrow">Players · {joined.length} of 5</h2>
            <div className="egw-room-seats">
              {seats.map((s) => {
                const isIn = !!s.name;
                const c = isIn ? colorOf(s.id) : undefined;
                const isMe = String(s.id) === me.playerID;
                return (
                  <div key={s.id} className={`egw-room-seat ${isIn ? '' : 'is-empty'}`} data-testid={`egw-room-seat-${s.id}`}>
                    <span className="egw-avatar" style={{ background: c !== undefined ? EGW_COLORS[c] : '#2a2533' }}>{isIn ? s.name!.slice(0, 1).toUpperCase() : ''}</span>
                    <span className="egw-room-seat-name">{isIn ? <>{s.name}{isMe && <span className="egw-you"> · you</span>}{s.id === 0 && <span className="egw-tag gold" style={{ marginLeft: 8 }}>Host</span>}</> : 'Open seat'}</span>
                    {isMe && (
                      <span className="egw-swatches" role="radiogroup" aria-label="Your colour">
                        {EGW_COLORS.map((col, i) => (
                          <button key={col} type="button" className={`egw-swatch ${mine === i ? 'on' : ''}`} style={{ background: col }} disabled={taken.has(i)}
                            aria-label={EGW_COLOR_NAMES[i]} aria-checked={mine === i} role="radio" data-testid={`egw-color-${i}`}
                            onClick={() => { void setSeatColor(me, i).then(refresh); }} />
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          {url && (
            <section className="egw-panel egw-invite" aria-label="Invite">
              <div className="egw-invite-qr"><QRCodeSVG value={url} size={96} /></div>
              <div style={{ display: 'grid', gap: 8 }}>
                <span className="egw-eyebrow">Invite</span>
                <span className="egw-url" data-testid="egw-join-url">{url}</span>
                <button type="button" className="egw-btn" style={{ width: 'fit-content' }} onClick={() => navigator.clipboard?.writeText(url)}>Copy link</button>
              </div>
            </section>
          )}
        </div>
        <div className="egw-room-col">
          <section className="egw-panel" aria-label="Slap rules">
            <h2 className="egw-eyebrow">Slap rules {host ? '· you choose' : '· the host chooses'}</h2>
            <RulesChecklist value={rules} onChange={host ? changeRules : undefined} disabled={!host} />
          </section>
          {problem && <p className="egw-warn" role="alert">{problem}</p>}
          {host ? (
            <button type="button" className="egw-btn egw-btn-gold" style={{ minHeight: 52, fontSize: 16 }} data-testid="egw-start"
              disabled={!canStart(seats) || starting} onClick={start}>
              {canStart(seats) ? `Deal for ${joined.length} players` : 'Waiting for at least 2 players'}
            </button>
          ) : <p className="egw-sub" role="status">The host starts the game when everyone is here.</p>}
        </div>
      </div>
    </main>
  );
}

function useChat(client: BgioClient) {
  const raw = client.chatMessages;
  return useMemo(() => ({
    lines: (raw ?? []).map(readChat).filter((l): l is ChatLine => l !== null),
    send: (p: ChatPayload) => client.sendChatMessage?.(p),
  }), [raw, client]);
}

export function EgwPlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  useEffect(() => { if (!seat) navigate(`/egyptian/watch/${matchID}`, true); }, [seat, matchID]);
  return seat ? <PlaySeat seat={seat} /> : null;
}

function PlaySeat({ seat }: { seat: EgwSeat }) {
  const { matchID } = seat;
  const client = useMemo(() => Client({
    game: EgyptianGame, matchID, playerID: seat.playerID, credentials: seat.credentials,
    multiplayer: SocketIO({ server: window.location.origin }), debug: false,
  }) as unknown as BgioClient, [matchID, seat.playerID, seat.credentials]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const raw = useClientState(client) as unknown as EgwClientState | null;
  const controls = useMemo(() => [controlsFor(client)], [client]);
  const chat = useChat(client);
  const { data: info } = usePoll<GameInfo>(() => gameInfo(matchID), 2000, [matchID]);
  const [asked, setAsked] = useState(false);

  // after the game: the host opens the next waiting room; everyone follows into it
  const view = raw ? viewOf(raw) : null;
  const next = info?.nextMatchID;
  const moving = useRef(false);
  useEffect(() => {
    if (!next || !view || moving.current) return;
    moving.current = true;
    const color = EGW_COLORS.indexOf(info!.colors[seat.playerID] as (typeof EGW_COLORS)[number]);
    rejoinRoom(seat, next, color >= 0 ? color : undefined, view.rules).then((s) => navigate(`/egyptian/wait/${s.matchID}`))
      .catch(() => { moving.current = false; });
  }, [next, view, info, seat]);

  const [watchUrl, setWatchUrl] = useState('');
  useEffect(() => { void egwUrl(`/egyptian/watch/${matchID}`).then(setWatchUrl); }, [matchID]);
  if (!raw || !view || !info) return <Shell title="Connecting…" />;
  const notice = !raw.isConnected ? <p role="status" className="egw-warn">Connection lost. Reconnecting…</p> : null;
  const host = seat.playerID === '0';
  return (
    <EgwScreen view={view} me={seat.playerID} mode="online" names={info.names} colors={info.colors} controls={controls} chat={chat}
      notice={notice} onExit={() => navigate('/egyptian')}
      again={host
        ? { label: asked ? 'Opening the room…' : 'Play again', onClick: () => { if (asked) return; setAsked(true); openNextRoom(seat, view.rules).catch(() => setAsked(false)); } }
        : { label: '', waiting: 'Waiting for the host to play again…' }}
      watchUrl={watchUrl} />
  );
}

export function EgyptianWatch({ matchID }: { matchID: string }) {
  const client = useMemo(() => Client({
    game: EgyptianGame, matchID, multiplayer: SocketIO({ server: window.location.origin }), debug: false,
  }) as unknown as BgioClient, [matchID]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const raw = useClientState(client) as unknown as EgwClientState | null;
  const { data: info } = usePoll<GameInfo>(() => gameInfo(matchID), 2000, [matchID]);
  if (!raw || !info) return <Shell title="Connecting…" />;
  return <EgwScreen view={viewOf(raw)} me={null} mode="watch" names={info.names} colors={info.colors} controls={[]} onExit={() => navigate('/egyptian')} />;
}
