import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { QRCodeSVG } from 'qrcode.react';
import { BlockyGame, BLOCKY_BOT_LEVELS, type Action, type BBotLevel, type BView, type Board } from '@boboland/shared/src/blocky';
import { joinedSeats } from '@boboland/shared/src/lobbyRules';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { BlyScreen } from './Screen';
import { Avatar } from './art/avatars';
import { Sky } from './art/sky';
import { AVATAR_NAME, BOT_TITLE } from './text';
import {
  addBot, boardFor, enterGame, hostRoom, joinRoom, leaveRoom, matchMeta, nextRoom, rejoinRoom, removeBot, renameSeat, roomInfo, roomUrl, savedSeat,
  setAvatar, setSettings, startGame, type MatchMeta, type RoomInfo, type RoomSettings,
} from './lobby';

const myName = (n?: string) => n?.trim() || 'Builder';

export function BlyHost() {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => { hostRoom(myName(party.name)).then((s) => navigate(`/blocky/wait/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Raising the Guild Hall" text={err || 'Hoisting the pennants'} error={!!err} />;
}

export function BlyJoin({ matchID }: { matchID: string }) {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/blocky/wait/${matchID}`, true); return; }
    joinRoom(matchID, myName(party.name)).then(() => navigate(`/blocky/wait/${matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [matchID]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Flying to the isle" text={err || 'Catching the wind'} error={!!err} />;
}

/** A waiting page: a cloud card with a drifting block. */
export function Shell({ title, text, error }: { title: string; text: string; error?: boolean }) {
  return (
    <div className="blocky bly-page bly-shell">
      <Sky progress={0.36} />
      <div className="bly-shell-card bly-cloud" role="status" aria-live="polite">
        <h1>{title}</h1>
        <p className={error ? 'bly-err' : undefined}>{error ? <>The wind turned. <small>({text})</small></> : <>{text}<span className="bly-dots" /></>}</p>
        <button type="button" className="bly-key" onClick={() => navigate('/blocky')}>‹ Back to the isle</button>
      </div>
    </div>
  );
}

const BOARD_TEXT: Record<Board, { title: string; text: string }> = {
  duo: { title: 'Duo', text: '14×14 · one guild each' },
  classic: { title: 'Classic', text: '20×20 · four guilds' },
};

/** The Guild Hall: neutral seat pennants (guilds are dealt at the start), avatars, the host's settings and bots. */
export function BlyWait({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(seat?.name ?? '');
  useEffect(() => { if (!seat) navigate(`/blocky/join/${matchID}`, true); }, [seat, matchID]);
  const sent = useRef<RoomSettings | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = () => roomInfo(matchID).then((i) => alive && setInfo(i)).catch(() => {});
    poll();
    const t = setInterval(poll, 1000);
    roomUrl(matchID).then(setUrl);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  useEffect(() => {
    if (!seat || !info?.nextMatchID) return;
    enterGame(seat, info).then((s) => navigate(`/blocky/play/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [info?.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1800); return () => clearTimeout(t); }, [copied]);
  if (!seat || !info) return <Shell title="The Guild Hall" text="Opening the doors" />;
  const host = String(info.host) === seat.playerID;
  const joined = joinedSeats(info.seats);
  const board = boardFor(info.settings, joined.length);
  const taken = new Set(joined.filter((s) => String(s.id) !== seat.playerID).map((s) => s.avatar));
  const run = (p: Promise<unknown>) => p.catch((e) => setErr(String(e.message ?? e)));
  // build on the last setting sent, not the last poll: two quick changes must not undo each other
  const set = (patch: Partial<RoomSettings>) => { if (!host) return; const next = { ...(sent.current ?? info.settings), ...patch }; sent.current = next; run(setSettings(seat, next)); };
  const copy = () => { void navigator.clipboard?.writeText(url); setCopied(true); };
  return (
    <div className="blocky bly-page bly-hall" data-testid="bly-room">
      <Sky progress={0.36} />
      <header className="bly-hall-head">
        <button type="button" className="bly-key bly-key-ghost" onClick={() => run(leaveRoom(seat).then(() => navigate('/blocky')))} data-testid="bly-room-leave">‹ Leave</button>
        <div className="bly-hall-sign bly-brass"><small>The</small><h1>Guild Hall</h1><small>{joined.length} of 4 builders</small></div>
        <span />
      </header>
      <div className="bly-hall-grid">
        <section className="bly-hall-seats" aria-label="Seats">
          {info.seats.map((s) => {
            const mine = String(s.id) === seat.playerID;
            const a = s.avatar ?? 0;
            return (
              <article key={s.id} className={`bly-pennant${s.name ? '' : ' bly-pennant-open'}${mine ? ' bly-pennant-mine' : ''}`} data-testid={`bly-seat-${s.id}`}>
                {s.name ? (
                  <>
                    <span className="bly-pennant-face"><Avatar id={a} size={64} /></span>
                    <div className="bly-pennant-body">
                      <div className="bly-pennant-line">
                        {mine ? <input value={name} maxLength={20} aria-label="Your name" onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== seat.name && run(renameSeat(seat, name.trim()))} /> : <b>{s.name}</b>}
                        {host && s.bot && <button type="button" className="bly-x" aria-label="Remove computer builder" onClick={() => run(removeBot(seat, s.id))}>×</button>}
                      </div>
                      <small>{s.bot ? `Computer · ${BOT_TITLE[s.bot]}` : s.id === info.host ? 'Host' : mine ? 'You' : 'Builder'} · the {AVATAR_NAME[a]}</small>
                      {!mine && <span className="bly-ready">✓ Ready to build</span>}
                      {mine && (
                        <span className="bly-avatars" role="group" aria-label="Your builder">
                          {AVATAR_NAME.map((n, k) => (
                            <button key={n} type="button" aria-pressed={a === k} disabled={taken.has(k)} onClick={() => run(setAvatar(seat, k))} title={n} data-testid={`bly-avatar-pick-${k}`}>
                              <Avatar id={k} size={44} /><span>{n}</span>
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bly-pennant-body bly-pennant-empty">
                    <b>An empty pennant</b>
                    <small>{host ? 'Waiting for a friend, or invite a computer builder:' : 'Waiting for a friend…'}</small>
                    {host && (
                      <span className="bly-row-btns">
                        {BLOCKY_BOT_LEVELS.map((l: BBotLevel) => <button key={l} type="button" className="bly-key bly-key-sm" onClick={() => run(addBot(seat, l))} data-testid={`bly-addbot-${l}`}>+ {BOT_TITLE[l]} <small>({l})</small></button>)}
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
        <aside className="bly-hall-side">
          <div className="bly-invite bly-stone">
            <h2>Invite builders</h2>
            {url && <span className="bly-qr"><QRCodeSVG value={url} size={112} bgColor="#f6f1e6" fgColor="#2f3a4a" /></span>}
            <code data-testid="bly-invite-url">{url}</code>
            <button type="button" className="bly-key bly-key-sm" onClick={copy} disabled={!url}>{copied ? '✓ Copied' : 'Copy link'}</button>
          </div>
          <div className="bly-rules bly-plank" role="group" aria-label="Room options">
            <h2>The isle{!host && <small> · set by the host</small>}</h2>
            <div className="bly-seg" role="radiogroup" aria-label="Board">
              {(['duo', 'classic'] as Board[]).map((b) => (
                <button key={b} type="button" role="radio" aria-checked={board === b} disabled={!host || (b === 'duo' && joined.length !== 2)} onClick={() => set({ board: b })} data-testid={`bly-board-pick-${b}`}>
                  <b>{BOARD_TEXT[b].title}</b><small>{BOARD_TEXT[b].text}</small>
                </button>
              ))}
            </div>
            {joined.length > 2 && <p className="bly-note">Three or more builders play on Classic.</p>}
            <label className="bly-row"><span><b>Hints</b> <small>“Suggest a move” and corner warnings</small></span><input type="checkbox" checked={info.settings.hints} disabled={!host} onChange={(e) => set({ hints: e.target.checked })} data-testid="bly-hints" /></label>
          </div>
          {host ? (
            <div className="bly-launch">
              <button type="button" className="bly-key bly-key-go bly-key-big" disabled={joined.length < 2} onClick={() => run(startGame(seat, info))} data-testid="bly-start">Start building</button>
              <p>{joined.length < 2 ? 'You need at least 2 builders: invite a friend or a computer builder.' : `${joined.length} builders are ready.`}</p>
            </div>
          ) : <p className="bly-await" role="status">The host starts when everyone is here.</p>}
          {err && <p className="bly-err">{err}</p>}
        </aside>
      </div>
    </div>
  );
}

interface Live { view: BView | null; connected: Record<string, boolean>; chat: ChatLine[] }
function useMatch(matchID: string, seat: { playerID: string; credentials: string } | null) {
  const [meta, setMeta] = useState<MatchMeta | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = () => matchMeta(matchID).then((m) => alive && setMeta(m)).catch(() => {});
    poll();
    const t = setInterval(poll, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  const count = meta?.count;
  // the client needs the real number of seats (it builds a placeholder state until the server's arrives)
  const client = useMemo(() => (count ? Client({
    game: BlockyGame, numPlayers: count, multiplayer: SocketIO({ server: window.location.origin }), matchID, debug: false,
    ...(seat ? { playerID: seat.playerID, credentials: seat.credentials } : {}),
  }) as unknown as BgioClient : null), [matchID, seat, count]);
  const [live, setLive] = useState<Live>({ view: null, connected: {}, chat: [] });
  useEffect(() => {
    if (!client) return;
    client.start();
    const off = client.subscribe((s) => {
      const st = s as { G: BView } | null;
      const md = (client as unknown as { matchData?: { id: number; isConnected?: boolean }[] }).matchData ?? [];
      const connected = Object.fromEntries(md.map((p) => [String(p.id), p.isConnected !== false]));
      const chat = (client.chatMessages ?? []).map(readChat).filter((x): x is ChatLine => !!x);
      // ignore the placeholder until the server's state has arrived
      setLive((l) => ({ view: st && st.G?.order?.length === count && st.G.log ? st.G : l.view, connected, chat }));
    });
    return () => { off(); client.stop(); };
  }, [client, count]);
  return { client, ...live, meta: meta ?? { names: {}, bots: {}, nextMatchID: undefined, count: 0 } };
}

export function BlyPlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  useEffect(() => { if (!seat) navigate(`/blocky/watch/${matchID}`, true); }, [seat, matchID]);
  const { client, view, meta, connected, chat } = useMatch(matchID, seat);
  const over = !!view?.result;
  const me = seat?.playerID ?? null;
  const humans = view ? view.order.filter((p) => !view.bots[Number(p)] && !view.out.includes(p)).sort((a, b) => Number(a) - Number(b)) : [];
  const actingHost = humans.find((p) => connected[p] !== false) ?? null;
  // after the game the acting host opens the next waiting room; everyone follows into it
  useEffect(() => {
    if (!seat || !over || !meta.nextMatchID || !view) return;
    rejoinRoom(seat, meta.nextMatchID, { avatar: view.avatars[Number(seat.playerID)], host: seat.playerID === actingHost, settings: { board: view.board, hints: view.hints } })
      .then((s) => navigate(`/blocky/wait/${s.matchID}`)).catch(() => {});
  }, [over, meta.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!seat || !view || !client) return <Shell title="Blocky" text="Flying to the isle" />;
  return (
    <BlyScreen view={view} me={me} names={meta.names} kind="online" connected={connected}
      send={(a: Action) => client.moves.act(a)} resign={() => client.moves.resign()} dismiss={(p) => client.moves.dismiss(p)}
      chat={{ lines: chat, send: (p: ChatPayload) => client.sendChatMessage?.(p) }}
      onExit={() => navigate('/blocky')}
      again={me === actingHost ? { label: 'Back to the Guild Hall', onClick: () => { void nextRoom(seat); } } : { label: 'Waiting for the host…', onClick: () => {}, disabled: true }} />
  );
}

export function BlyWatch({ matchID }: { matchID: string }) {
  const { view, meta, connected, chat } = useMatch(matchID, null);
  if (!view) return <Shell title="Blocky" text="Finding a good cloud to watch from" />;
  return <BlyScreen view={view} me={null} names={meta.names} kind="watch" connected={connected} chat={{ lines: chat, send: () => {} }} onExit={() => navigate('/blocky')} />;
}
