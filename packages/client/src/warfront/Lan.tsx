import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { QRCodeSVG } from 'qrcode.react';
import { WarfrontGame, type Action, type WarBotLevel } from '@boboland/shared/src/warfront';
import { joinedSeats } from '@boboland/shared/src/lobbyRules';
import type { BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { usePartyState } from '../lib/party';
import { WarScreen, type WarClientView } from './WarScreen';
import { FACTIONS } from './factions';
import { BOT_TITLE } from './setup';
import {
  addBot, enterBattle, hostRoom, joinRoom, leaveRoom, matchNames, nextRoom, rejoinRoom, removeBot, renameSeat, roomInfo, roomUrl, savedSeat,
  setColor, setSettings, startBattle, type RoomInfo, type WarSeat,
} from './lobby';

const myName = (n?: string) => n?.trim() || 'General';

export function WarHost() {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => { hostRoom(myName(party.name)).then((s) => navigate(`/warfront/wait/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Opening the war room" text={err || 'Securing a line…'} />;
}

export function WarJoin({ matchID }: { matchID: string }) {
  const party = usePartyState();
  const [err, setErr] = useState('');
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/warfront/wait/${matchID}`, true); return; }
    joinRoom(matchID, myName(party.name)).then(() => navigate(`/warfront/wait/${matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [matchID]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Shell title="Joining the war room" text={err || 'Presenting credentials…'} />;
}

function Shell({ title, text }: { title: string; text: string }) {
  return (
    <div className="warfront wf-desk-page"><div className="wf-sheet wf-sheet-sm"><h1>{title}</h1><p>{text}</p><button type="button" className="wf-btn" onClick={() => navigate('/warfront')}>Back</button></div></div>
  );
}

export function WarWait({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const [name, setName] = useState(seat?.name ?? '');
  useEffect(() => { if (!seat) navigate(`/warfront/join/${matchID}`, true); }, [seat, matchID]);
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
    enterBattle(seat, info).then((s) => navigate(`/warfront/play/${s.matchID}`, true)).catch((e) => setErr(String(e.message ?? e)));
  }, [info?.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!seat || !info) return <Shell title="War room" text="Connecting…" />;
  const host = seat.playerID === '0';
  const joined = joinedSeats(info.seats);
  const taken = new Set(joined.map((s) => s.color));
  const run = (p: Promise<unknown>) => p.catch((e) => setErr(String(e.message ?? e)));
  const two = joined.length === 2;
  return (
    <div className="warfront wf-desk-page">
      <div className="wf-sheet wf-room">
        <header className="wf-sheet-head">
          <span className="wf-stencil">WAR ROOM</span>
          <small>Operation order · {joined.length} of 6 generals</small>
          <button type="button" className="wf-btn" onClick={() => run(leaveRoom(seat).then(() => navigate('/warfront')))} data-testid="wf-room-leave">Leave</button>
        </header>
        <div className="wf-room-cols">
          <ol className="wf-roster">
            {info.seats.map((s) => {
              const mine = String(s.id) === seat.playerID;
              const f = s.color !== undefined ? FACTIONS[s.color] : null;
              return (
                <li key={s.id} className={`wf-roster-row${s.name ? '' : ' wf-open'}`} style={{ ['--fc' as string]: f?.color ?? '#bdb39c' }} data-testid={`wf-seat-${s.id}`}>
                  <span className="wf-roster-flag" />
                  {s.name ? (
                    <>
                      {mine ? (
                        <input value={name} maxLength={24} aria-label="Your name" onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== seat.name && run(renameSeat(seat, name.trim()))} />
                      ) : <b>{s.name}</b>}
                      <small>{s.bot ? `Computer · ${BOT_TITLE[s.bot]}` : s.id === 0 ? 'Host' : 'General'}{f ? ` · ${f.name}` : ''}</small>
                      {mine && (
                        <span className="wf-swatches" role="group" aria-label="Your faction">
                          {FACTIONS.map((ff, i) => <button key={i} type="button" style={{ background: ff.color }} aria-label={ff.name} aria-pressed={s.color === i} disabled={taken.has(i) && s.color !== i} onClick={() => run(setColor(seat, i))} />)}
                        </span>
                      )}
                      {host && s.bot && <button type="button" className="wf-x" aria-label="Remove computer general" onClick={() => run(removeBot(seat, s.id))}>×</button>}
                    </>
                  ) : (
                    <>
                      <b>Open seat</b>
                      {host && (
                        <span className="wf-row">
                          {(['easy', 'medium', 'hard'] as WarBotLevel[]).map((l) => <button key={l} type="button" className="wf-btn wf-btn-sm" onClick={() => run(addBot(seat, l))} data-testid={`wf-addbot-${l}`}>+ {BOT_TITLE[l]}</button>)}
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="wf-room-side">
            <div className="wf-invite">
              <b>Invite generals</b>
              {url && <QRCodeSVG value={url} size={132} bgColor="#fbf4df" fgColor="#2b2116" />}
              <code data-testid="wf-room-url">{url}</code>
              <button type="button" className="wf-btn wf-btn-sm" onClick={() => navigator.clipboard?.writeText(url)}>Copy link</button>
            </div>
            <div className="wf-settings">
              <b>Rules of engagement</b>
              <label className="wf-opt"><input type="radio" disabled={!host} checked={info.settings.mode === 'domination' || two} onChange={() => run(setSettings(seat, { ...info.settings, mode: 'domination' }))} /> World Domination</label>
              <label className="wf-opt"><input type="radio" disabled={!host || two} checked={info.settings.mode === 'mission' && !two} onChange={() => run(setSettings(seat, { ...info.settings, mode: 'mission' }))} /> Secret Mission <small>(3+ generals)</small></label>
              <label className="wf-opt"><input type="checkbox" disabled={!host} checked={info.settings.autoDeploy} onChange={(e) => run(setSettings(seat, { ...info.settings, autoDeploy: e.target.checked }))} /> Deal territories at random</label>
            </div>
            {host ? (
              <button type="button" className="wf-key" disabled={joined.length < 2} onClick={() => run(startBattle(seat, info))} data-testid="wf-start">Start the war</button>
            ) : <p className="wf-hint">The host starts the war when everyone is in.</p>}
            {err && <p className="wf-err">{err}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function useMatch(matchID: string, seat: WarSeat | null) {
  const [meta, setMeta] = useState<{ names: Record<string, string>; nextMatchID?: string; count: number } | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = () => matchNames(matchID).then((m) => alive && setMeta(m)).catch(() => {});
    poll();
    const t = setInterval(poll, 2500);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  const count = meta?.count;
  // the client needs the real number of seats (it builds a placeholder state until the server's arrives)
  const client = useMemo(() => (count ? Client({
    game: WarfrontGame, numPlayers: count, multiplayer: SocketIO({ server: window.location.origin }), matchID, debug: false,
    ...(seat ? { playerID: seat.playerID, credentials: seat.credentials } : {}),
  }) as unknown as BgioClient : null), [matchID, seat, count]);
  const [view, setView] = useState<WarClientView | null>(null);
  useEffect(() => {
    if (!client) return;
    client.start();
    const off = client.subscribe((s) => {
      const st = s as { G: WarClientView; isConnected?: boolean; _stateID?: number } | null;
      // ignore the placeholder until the server's state has arrived
      if (st && (st._stateID ?? 0) >= 0 && st.G?.players?.length === count) setView(st.G);
    });
    return () => { off(); client.stop(); };
  }, [client, count]);
  return { client, view, meta: meta ?? { names: {} as Record<string, string>, nextMatchID: undefined as string | undefined, count: 0 } };
}

export function WarPlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  useEffect(() => { if (!seat) navigate(`/warfront/watch/${matchID}`, true); }, [seat, matchID]);
  const { client, view, meta } = useMatch(matchID, seat);
  const over = !!view?.result;
  // after the war the host opens the next war room; everyone follows into it
  useEffect(() => {
    if (!seat || !over || !meta.nextMatchID) return;
    rejoinRoom(seat, meta.nextMatchID, view?.factions[Number(seat.playerID)]).then((s) => navigate(`/warfront/wait/${s.matchID}`)).catch(() => {});
  }, [over, meta.nextMatchID]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!seat || !view || !client) return <Shell title="Warfront" text="Connecting to the front…" />;
  const host = seat.playerID === '0';
  return (
    <WarScreen view={view} me={seat.playerID} names={meta.names} kind="online" send={(a: Action) => client.moves.act(a)} resign={() => client.moves.resign()}
      onExit={() => navigate('/warfront')}
      again={host ? { label: 'Back to the war room', onClick: () => { void nextRoom(seat); } } : { label: 'Waiting for the host…', onClick: () => {} }} />
  );
}

export function WarWatch({ matchID }: { matchID: string }) {
  const { view, meta } = useMatch(matchID, null);
  if (!view) return <Shell title="Warfront" text="Connecting to the front…" />;
  return <WarScreen view={view} me={null} names={meta.names} kind="watch" send={() => {}} onExit={() => navigate('/warfront')} />;
}
