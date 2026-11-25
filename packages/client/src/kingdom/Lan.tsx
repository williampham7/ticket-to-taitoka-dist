import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { QRCodeSVG } from 'qrcode.react';
import { HEROES, HERO_NAME, KingdomGame, type Action, type KBotLevel, type KView, type Length } from '@boboland/shared/src/kingdom';
import { joinedSeats } from '@boboland/shared/src/lobbyRules';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { KgScreen } from './Screen';
import { HeroPortrait } from './art/portraits';
import { HERO_COLOR } from './text';
import { BOT_TITLE } from './setup';
import { Scene } from './art/scene';
import {
  addBot, enterGame, hostRoom, joinRoom, leaveRoom, matchMeta, nextRoom, rejoinRoom, removeBot, renameSeat, roomInfo, roomUrl, savedSeat,
  setHero, setSettings, setYoung, startGame, type MatchMeta, type RoomInfo, type RoomSettings,
} from './lobby';

const myName = (n?: string) => n?.trim() || 'Adventurer';

export function KgHost() {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => { hostRoom(myName(party.name)).then((s) => navigate(`/kingdom/wait/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Opening the inn" text={err || 'Lighting the lanterns'} error={!!err} />;
}

export function KgJoin({ matchID }: { matchID: string }) {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/kingdom/wait/${matchID}`, true); return; }
    joinRoom(matchID, myName(party.name)).then(() => navigate(`/kingdom/wait/${matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [matchID]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Joining the adventure" text={err || 'Following the map'} error={!!err} />;
}

/** A waiting page: an open book with a quill writing. */
export function Shell({ title, text, error }: { title: string; text: string; error?: boolean }) {
  return (
    <div className="kingdom kg-page kg-shell">
      <Scene phase="morning" />
      <div className="kg-shell-book" role="status" aria-live="polite">
        <svg viewBox="0 0 120 70" className="kg-shell-art" aria-hidden>
          <path d="M60,62 Q35,54 8,60 V12 Q35,6 60,14 Q85,6 112,12 V60 Q85,54 60,62 Z" fill="url(#kg-parch)" stroke="#4a3020" strokeWidth="2" strokeLinejoin="round" />
          <path d="M60,14 V62" stroke="#4a3020" strokeWidth="1.4" />
          {[22, 30, 38, 46].map((y) => <path key={y} className="kg-shell-line" d={`M16,${y} Q34,${y - 2} 52,${y}`} stroke="#8a6a4a" strokeWidth="1.4" fill="none" />)}
          <g className="kg-quill"><path d="M84,44 L104,10 Q110,6 106,14 L88,46 Z" fill="#fff8ea" stroke="#4a3020" strokeWidth="1.4" /><path d="M84,44 L82,50" stroke="#4a3020" strokeWidth="1.6" /></g>
        </svg>
        <h1>{title}</h1>
        <p className={error ? 'kg-err' : undefined}>{error ? <>The page tore. <small>({text})</small></> : <>{text}<span className="kg-dots" /></>}</p>
        <button type="button" className="kg-btn" onClick={() => navigate('/kingdom')}>‹ Back to the book</button>
      </div>
    </div>
  );
}

const LENGTH_TEXT: Record<Length, { title: string; text: string }> = {
  short: { title: 'Short', text: '3 treasures each' },
  medium: { title: 'Medium', text: '5 treasures each' },
  full: { title: 'Full', text: 'All 24 shared out' },
};

export function KgWait({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState(seat?.name ?? '');
  useEffect(() => { if (!seat) navigate(`/kingdom/join/${matchID}`, true); }, [seat, matchID]);
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
    enterGame(seat, info).then((s) => navigate(`/kingdom/play/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [info?.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1800); return () => clearTimeout(t); }, [copied]);
  if (!seat || !info) return <Shell title="The adventurers' inn" text="Opening the door" />;
  const host = String(info.host) === seat.playerID;
  const joined = joinedSeats(info.seats);
  const takenHeroes = new Set(joined.filter((s) => String(s.id) !== seat.playerID).map((s) => s.hero));
  const run = (p: Promise<unknown>) => p.catch((e) => setErr(String(e.message ?? e)));
  const set = (patch: Partial<RoomSettings>) => host && run(setSettings(seat, { ...info.settings, ...patch }));
  const copy = () => { void navigator.clipboard?.writeText(url); setCopied(true); };
  return (
    <div className="kingdom kg-page kg-inn" data-testid="kg-room">
      <Scene phase="afternoon" />
      <header className="kg-inn-head">
        <button type="button" className="kg-btn kg-btn-ghost" onClick={() => run(leaveRoom(seat).then(() => navigate('/kingdom')))} data-testid="kg-room-leave">‹ Leave</button>
        <div className="kg-inn-sign"><small>The</small><h1>Adventurers' Inn</h1><small>{joined.length} of 4 at the table</small></div>
        <span />
      </header>
      <div className="kg-inn-grid">
        <section className="kg-inn-seats" aria-label="Seats">
          {info.seats.map((s) => {
            const mine = String(s.id) === seat.playerID;
            const h = s.hero ?? 0;
            return (
              <article key={s.id} className={`kg-seat${s.name ? '' : ' kg-seat-open'}${mine ? ' kg-seat-mine' : ''}`} style={{ ['--pc' as string]: s.name ? HERO_COLOR[h] : '#b9a98c' } as CSSProperties} data-testid={`kg-seat-${s.id}`}>
                {s.name ? (
                  <>
                    <span className="kg-seat-face"><HeroPortrait hero={h} /></span>
                    <div className="kg-seat-body">
                      <div className="kg-seat-line">
                        {mine ? <input value={name} maxLength={20} aria-label="Your name" onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== seat.name && run(renameSeat(seat, name.trim()))} /> : <b>{s.name}</b>}
                        {s.young && <span className="kg-star" title="Young Adventurer">★</span>}
                        {host && s.bot && <button type="button" className="kg-x" aria-label="Remove computer player" onClick={() => run(removeBot(seat, s.id))}>×</button>}
                      </div>
                      <small>{s.bot ? `Computer · ${BOT_TITLE[s.bot]}` : s.id === info.host ? 'Host' : mine ? 'You' : 'Adventurer'} · the {HERO_NAME[HEROES[h]]}</small>
                      {mine && (
                        <>
                          <span className="kg-heroes" role="group" aria-label="Your hero">
                            {HEROES.map((id, k) => (
                              <button key={id} type="button" aria-pressed={h === k} disabled={takenHeroes.has(k)} onClick={() => run(setHero(seat, k))} style={{ ['--pc' as string]: HERO_COLOR[k] } as CSSProperties} title={HERO_NAME[id]} data-testid={`kg-hero-pick-${k}`}>
                                <HeroPortrait hero={k} /><span>{HERO_NAME[id]}</span>
                              </button>
                            ))}
                          </span>
                          <label className="kg-young"><input type="checkbox" checked={!!s.young} onChange={(e) => run(setYoung(seat, e.target.checked))} data-testid="kg-young" /> ★ Young Adventurer <small>see all your treasures, find them in any order</small></label>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="kg-seat-body kg-seat-empty">
                    <b>An empty chair</b>
                    <small>{host ? 'Waiting for a friend, or invite a computer player:' : 'Waiting for a friend…'}</small>
                    {host && (
                      <span className="kg-row-btns">
                        {(['easy', 'medium', 'hard'] as KBotLevel[]).map((l) => <button key={l} type="button" className="kg-btn kg-btn-sm" onClick={() => run(addBot(seat, l))} data-testid={`kg-addbot-${l}`}>+ {BOT_TITLE[l]} <small>({l})</small></button>)}
                      </span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
        <aside className="kg-inn-side">
          <div className="kg-invite">
            <h2>Invite your party</h2>
            {url && <span className="kg-qr"><QRCodeSVG value={url} size={112} bgColor="#fdf6e1" fgColor="#4a3020" /></span>}
            <code data-testid="kg-room-url">{url}</code>
            <button type="button" className="kg-btn kg-btn-sm" onClick={copy} disabled={!url}>{copied ? '✓ Copied' : 'Copy link'}</button>
          </div>
          <div className="kg-rules" role="group" aria-label="Room options">
            <h2>The tale{!host && <small> · set by the host</small>}</h2>
            <div className="kg-seg kg-seg-big" role="radiogroup" aria-label="Game length">
              {(['short', 'medium', 'full'] as Length[]).map((l) => (
                <button key={l} type="button" role="radio" aria-checked={info.settings.length === l} disabled={!host} onClick={() => set({ length: l })} data-testid={`kg-length-${l}`}>
                  <b>{LENGTH_TEXT[l].title}</b><small>{LENGTH_TEXT[l].text}</small>
                </button>
              ))}
            </div>
            <label className="kg-row"><span><b>Hints</b> <small>“Where is it?” and “Suggest a push”</small></span><input type="checkbox" checked={info.settings.hints} disabled={!host} onChange={(e) => set({ hints: e.target.checked })} data-testid="kg-hints" /></label>
          </div>
          {host ? (
            <div className="kg-launch">
              <button type="button" className="kg-btn kg-btn-gold kg-btn-big" disabled={joined.length < 2} onClick={() => run(startGame(seat, info))} data-testid="kg-start">Begin the adventure</button>
              <p>{joined.length < 2 ? 'You need at least 2 heroes: invite a friend or a computer player.' : `${joined.length} heroes are ready.`}</p>
            </div>
          ) : <p className="kg-await" role="status">The host will open the book when everyone is here.</p>}
          {err && <p className="kg-err">{err}</p>}
        </aside>
      </div>
    </div>
  );
}

interface Live { view: KView | null; connected: Record<string, boolean>; chat: ChatLine[] }
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
    game: KingdomGame, numPlayers: count, multiplayer: SocketIO({ server: window.location.origin }), matchID, debug: false,
    ...(seat ? { playerID: seat.playerID, credentials: seat.credentials } : {}),
  }) as unknown as BgioClient : null), [matchID, seat, count]);
  const [live, setLive] = useState<Live>({ view: null, connected: {}, chat: [] });
  useEffect(() => {
    if (!client) return;
    client.start();
    const off = client.subscribe((s) => {
      const st = s as { G: KView; _stateID?: number } | null;
      const md = (client as unknown as { matchData?: { id: number; isConnected?: boolean }[] }).matchData ?? [];
      const connected = Object.fromEntries(md.map((p) => [String(p.id), p.isConnected !== false]));
      const chat = (client.chatMessages ?? []).map(readChat).filter((x): x is ChatLine => !!x);
      // ignore the placeholder until the server's state has arrived
      setLive((l) => ({ view: st && st.G?.players?.length === count && st.G.log ? st.G : l.view, connected, chat }));
    });
    return () => { off(); client.stop(); };
  }, [client, count]);
  return { client, ...live, meta: meta ?? { names: {}, bots: {}, nextMatchID: undefined, count: 0 } };
}

export function KgPlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  useEffect(() => { if (!seat) navigate(`/kingdom/watch/${matchID}`, true); }, [seat, matchID]);
  const { client, view, meta, connected, chat } = useMatch(matchID, seat);
  const over = !!view?.result;
  const me = seat?.playerID ?? null;
  const humans = view ? view.players.filter((p) => !view.bots[Number(p)] && !view.out.includes(p)) : [];
  const actingHost = humans.find((p) => connected[p] !== false) ?? null;
  // after the game the acting host opens the next waiting room; everyone follows into it
  useEffect(() => {
    if (!seat || !over || !meta.nextMatchID || !view) return;
    rejoinRoom(seat, meta.nextMatchID, { hero: view.heroes[Number(seat.playerID)], young: view.young[Number(seat.playerID)], host: seat.playerID === actingHost })
      .then((s) => navigate(`/kingdom/wait/${s.matchID}`)).catch(() => {});
  }, [over, meta.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!seat || !view || !client) return <Shell title="Runeshift" text="Opening the storybook" />;
  return (
    <KgScreen view={view} me={me} names={meta.names} kind="online" connected={connected}
      send={(a: Action) => client.moves.act(a)} resign={() => client.moves.resign()} dismiss={(p) => client.moves.dismiss(p)}
      chat={{ lines: chat, send: (p: ChatPayload) => client.sendChatMessage?.(p) }}
      onExit={() => navigate('/kingdom')}
      again={me === actingHost ? { label: 'Back to the inn', onClick: () => { void nextRoom(seat); } } : { label: 'Waiting for the host…', onClick: () => {}, disabled: true }} />
  );
}

export function KgWatch({ matchID }: { matchID: string }) {
  const { view, meta, connected, chat } = useMatch(matchID, null);
  if (!view) return <Shell title="Runeshift" text="Finding a good seat" />;
  return <KgScreen view={view} me={null} names={meta.names} kind="watch" connected={connected} chat={{ lines: chat, send: () => {} }} onExit={() => navigate('/kingdom')} />;
}
