import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { FleetGame, type PlayerID } from '@boboland/shared/src/fleet';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { navigate } from '../lib/router';
import { load } from '../lib/storage';
import { inviteUrl, usePartyState } from '../lib/party';
import { controlsFor, viewOf, type FleetClientState } from './controls';
import { FleetScreen } from './FleetScreen';
import { enterNext, fetchMatch, fleetJoinUrl, hostMatch, joinSeat, rematchFor, savedSeat, type FleetMatch, type FleetSeat } from './lobby';
import { CopyLink, Shell, btn, btnPrimary } from './ui';
import { setupFromSearch } from './setup';

/** Create the match at once and go to it. */
export function FleetHost() {
  const { name } = usePartyState();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    hostMatch(name || 'Player', setupFromSearch(window.location.search))
      .then((s) => navigate(`/fleet/play/${s.matchID}`, true), () => setError('Could not create the game. Is the server running?'));
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Shell title={error ? 'Host an online game' : 'Opening a channel…'}>
      {error ? (
        <>
          <p className="fleet-warn" role="alert">{error}</p>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} data-testid="fleet-retry" onClick={() => { setError(null); setAttempt((a) => a + 1); }}>Try again</button>
            <button type="button" className={btn} onClick={() => navigate('/fleet')}>Back</button>
          </div>
        </>
      ) : <p className="opacity-80">Creating your game…</p>}
    </Shell>
  );
}

/** Take the second seat (the party or a link brought me here), with my party name. */
export function FleetJoin({ matchID }: { matchID: string }) {
  const { name } = usePartyState();
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/fleet/play/${matchID}`, true); return; }
    if (!name || tried.current) return;
    tried.current = true;
    joinSeat(matchID, '1', name).then(() => navigate(`/fleet/play/${matchID}`, true), () => setError('Could not join: the game is full or does not exist.'));
  }, [matchID, name]);
  return <Shell title="Joining…">{error ? <p className="fleet-warn" role="alert">{error}</p> : <p>Taking your seat…</p>}</Shell>;
}

export function FleetPlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  if (!seat) {
    return (
      <Shell title="No seat here">
        <p>This device has no seat in that game.</p>
        <button type="button" className={btnPrimary} onClick={() => navigate(`/fleet/join/${matchID}`)}>Join the game</button>
      </Shell>
    );
  }
  return <PlaySeat key={matchID} seat={seat} />;
}

function PlaySeat({ seat }: { seat: FleetSeat }) {
  const { matchID } = seat;
  const client = useMemo(() => Client({
    game: FleetGame, numPlayers: 2, matchID, playerID: seat.playerID, credentials: seat.credentials,
    multiplayer: SocketIO({ server: window.location.origin }), debug: false,
  }) as unknown as BgioClient, [matchID, seat.playerID, seat.credentials]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const raw = useClientState(client) as unknown as FleetClientState | null;
  const controls = useMemo(() => controlsFor(client), [client]);
  const rawChat = client.chatMessages;
  const chat = useMemo(() => ({
    lines: (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null),
    send: (p: ChatPayload) => client.sendChatMessage?.(p),
  }), [rawChat, client]);

  // names and the next match come from the lobby
  const [info, setInfo] = useState<FleetMatch>({ names: {} });
  useEffect(() => {
    let alive = true;
    const tick = () => fetchMatch(matchID).then((m) => alive && setInfo(m), () => {});
    tick();
    const t = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);

  const [asked, setAsked] = useState(false);
  const entering = useRef(false);
  useEffect(() => {
    if (!info.nextMatchID || entering.current) return;
    entering.current = true;
    enterNext(seat, info.nextMatchID).then(() => navigate(`/fleet/play/${info.nextMatchID}`), () => { entering.current = false; });
  }, [info.nextMatchID, seat]);

  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const waitingForJoiner = seat.playerID === '0' && !info.names['1'];
  const bothSeated = !!info.names['0'] && !!info.names['1'];
  useEffect(() => { fleetJoinUrl(matchID).then(setJoinUrl); }, [matchID]);
  // the opponent joins through the party: anyone who opens the party link follows the host into this game
  const party = usePartyState();
  const [partyUrl, setPartyUrl] = useState('');
  useEffect(() => { if (party.party) void inviteUrl(party.party.id).then(setPartyUrl); }, [party.party?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!raw) return <Shell title="Connecting…"><p className="opacity-80">Connecting…</p></Shell>;
  const view = viewOf(raw);
  const notice = (
    <>
      {!raw.isConnected && <p role="status" className="fleet-alert">Connection lost. Reconnecting…</p>}
      {bothSeated && joinUrl && (
        <div className="grid gap-1 text-[12px]" data-testid="fleet-spectator-link">
          <span className="fleet-sub">Spectator link</span>
          <CopyLink url={joinUrl.replace('/join/', '/watch/')} testid="fleet-copy-watch" />
        </div>
      )}
    </>
  );
  const invite = waitingForJoiner && (partyUrl || joinUrl) ? (
    <section className="fleet-plate fleet-invite" data-testid="fleet-invite" aria-label="Invite your opponent">
      <div className="fleet-invite-qr"><QRCodeSVG value={partyUrl || joinUrl!} size={96} /></div>
      <div className="fleet-invite-body">
        <span className="fleet-station">Invite your opponent</span>
        <p className="fleet-help">Send this link, or let them scan the code. Whoever opens it takes the other seat. Load your weapons and place your fleet while you wait.</p>
      </div>
      <div className="fleet-invite-link">
        <span className="sr-only" data-testid="fleet-join-url">{partyUrl || joinUrl}</span>
        <CopyLink url={partyUrl || joinUrl!} testid="fleet-copy-link" />
      </div>
      <span className="fleet-invite-status" role="status"><i aria-hidden />Waiting for opponent</span>
    </section>
  ) : null;
  return (
    <FleetScreen view={view} me={seat.playerID as PlayerID} kind="online" matchKey={matchID} allUnlocked={load<{ allUnlocked?: boolean }>('fleet.menu', {}).allUnlocked === true} controls={controls} chat={chat} notice={notice} invite={invite}
      names={info.names} onExit={() => navigate('/fleet')}
      rematch={{ waiting: asked, onClick: () => { setAsked(true); rematchFor(seat, { mode: view.mode, bestOf: view.bestOf }).catch(() => setAsked(false)); } }} />
  );
}
