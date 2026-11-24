import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { FrontlineGame, type PlayerID } from '@boboland/shared/src/frontline';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { readChat, type ChatLine, type ChatPayload } from '../lib/chat';
import { navigate } from '../lib/router';
import { inviteUrl, usePartyState } from '../lib/party';
import { BriefingPanel, btn, btnPrimary, CopyLink, FrontlineScreen, type FrontlineState } from './FrontlineScreen';
import { useClaimTimeout, useNow } from './timer';
import { secondsLeft } from './helpers';
import { enterNext, fetchMatch, frontlineJoinUrl, hostMatch, joinSeat, rematchFor, savedSeat, type FlMatch, type FlSeat } from './lobby';

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="fls flex! items-start justify-center pt-14!">
      <section className="fls-panel grid w-full max-w-[380px] gap-3">
        <h1 className="fls-h">{title}</h1>
        {children}
      </section>
    </main>
  );
}

/** Create the match at once (settings live in the game's briefing) and go to it. */
export function FrontlineHost() {
  const { name } = usePartyState();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  useEffect(() => {
    if (started.current === attempt) return;
    started.current = attempt;
    hostMatch(name || 'Player').then((s) => navigate(`/frontline/play/${s.matchID}`, true), () => setError('Could not create the game. Is the server running?'));
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Shell title={error ? 'Host an online game' : 'Opening a channel…'}>
      {error ? (
        <>
          <p className="text-[#ff9a8a]" role="alert">{error}</p>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} data-testid="fl-go" onClick={() => { setError(null); setAttempt((a) => a + 1); }}>Try again</button>
            <button type="button" className={btn} onClick={() => navigate('/frontline')}>Back</button>
          </div>
        </>
      ) : <p className="opacity-80">Creating your game…</p>}
    </Shell>
  );
}

/** Take the second seat (the party brought me here), with my party name. */
export function FrontlineJoin({ matchID }: { matchID: string }) {
  const { name } = usePartyState();
  const [error, setError] = useState<string | null>(null);
  const tried = useRef(false);
  useEffect(() => {
    if (savedSeat(matchID)) { navigate(`/frontline/play/${matchID}`, true); return; }
    if (!name || tried.current) return;
    tried.current = true;
    joinSeat(matchID, '1', name).then(() => navigate(`/frontline/play/${matchID}`, true), () => setError('Could not join: the game is full or does not exist.'));
  }, [matchID, name]);
  return <Shell title="Joining…">{error ? <p className="text-[#ff9a8a]" role="alert">{error}</p> : <p>Taking your seat…</p>}</Shell>;
}

export function FrontlinePlay({ matchID }: { matchID: string }) {
  const seat = useMemo(() => savedSeat(matchID), [matchID]);
  if (!seat) {
    return (
      <Shell title="No seat here">
        <p>This device has no seat in that game.</p>
        <button type="button" className={btnPrimary} onClick={() => navigate(`/frontline/join/${matchID}`)}>Join the game</button>
      </Shell>
    );
  }
  return <PlaySeat key={matchID} seat={seat} />;
}

function PlaySeat({ seat }: { seat: FlSeat }) {
  const { matchID } = seat;
  const client = useMemo(() => Client({
    game: FrontlineGame, numPlayers: 2, matchID, playerID: seat.playerID, credentials: seat.credentials,
    multiplayer: SocketIO({ server: window.location.origin }), debug: false,
  }) as unknown as BgioClient, [matchID, seat.playerID, seat.credentials]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const raw = useClientState(client) as unknown as (FrontlineState & { isConnected: boolean }) | null;
  const rawChat = client.chatMessages;
  const chat = useMemo(() => ({
    lines: (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null),
    send: (p: ChatPayload) => client.sendChatMessage?.(p),
  }), [rawChat, client]);

  // names and the next match come from the lobby
  const [info, setInfo] = useState<FlMatch>({ names: {} });
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
    enterNext(seat, info.nextMatchID).then(() => navigate(`/frontline/play/${info.nextMatchID}`), () => { entering.current = false; });
  }, [info.nextMatchID, seat]);

  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const waitingForJoiner = seat.playerID === '0' && !info.names['1'];
  const bothSeated = !!info.names['0'] && !!info.names['1'];
  useEffect(() => { frontlineJoinUrl(matchID).then(setJoinUrl); }, [matchID]);
  // the opponent joins through the party: anyone who opens the party link follows the host into this game
  const party = usePartyState();
  const [partyUrl, setPartyUrl] = useState('');
  useEffect(() => { if (party.party) void inviteUrl(party.party.id).then(setPartyUrl); }, [party.party?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // the waiting player ends the game when the other one's clock has run out
  const G = raw?.G;
  const playing = !!raw && raw.ctx.phase === 'play' && !G?.result;
  const now = useNow(playing && !!G?.turnSeconds);
  const expired = playing && !!G && raw!.ctx.currentPlayer !== seat.playerID && secondsLeft(G, now) === 0;
  useClaimTimeout(expired, () => client.moves.claimTimeout?.());

  if (!raw) return <Shell title="Connecting…"><p className="opacity-80">Connecting…</p></Shell>;
  const host = seat.playerID === '0';
  const notice = (
    <>
      {!raw.isConnected && <p role="status" className="w-full rounded-md bg-[#5a2a22] px-3 py-2 text-[14px]">Connection lost. Reconnecting…</p>}
      {bothSeated && joinUrl && (
        <div className="grid gap-1 text-[12px]" data-testid="fl-spectator-link">
          <span className="fls-sub">Spectator link</span>
          <CopyLink url={joinUrl.replace('/join/', '/watch/')} testid="fl-copy-watch" />
        </div>
      )}
    </>
  );
  const invite = waitingForJoiner && partyUrl ? (
    <div className="grid gap-2 rounded-md border border-[#3c4639] bg-[#161b15] p-3" data-testid="fl-invite">
      <span className="fls-sub">Invite your opponent</span>
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded bg-white p-1.5"><QRCodeSVG value={partyUrl} size={84} /></div>
        <p className="text-[13px] leading-snug opacity-85">Send this link. Whoever opens it joins your party and takes the other seat.</p>
      </div>
      <span className="hidden" data-testid="fl-join-url">{partyUrl}</span>
      <CopyLink url={partyUrl} testid="fl-copy-link" />
    </div>
  ) : null;
  const briefing = host ? (
    <BriefingPanel turnSeconds={raw.G.turnSeconds} onTurnSeconds={(s) => client.moves.setTurnLimit(s)}
      start={{ onClick: () => client.moves.begin(), disabled: !bothSeated, hint: bothSeated ? `${info.names['1']} is here. Start when ready.` : 'Waiting for an opponent to join…' }}>
      {invite}
    </BriefingPanel>
  ) : (
    <BriefingPanel turnSeconds={raw.G.turnSeconds} waiting={`Waiting for ${info.names['0'] || 'the host'} to start the game…`} />
  );
  return (
    <FrontlineScreen state={raw} playerID={seat.playerID as PlayerID} moves={client.moves} chat={chat} notice={notice} briefing={briefing}
      names={info.names} onExit={() => navigate('/frontline')}
      rematch={{ waiting: asked, onClick: () => { setAsked(true); rematchFor(seat, raw.G.turnSeconds ?? 0).catch(() => setAsked(false)); } }} />
  );
}
