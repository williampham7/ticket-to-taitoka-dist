import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { FrontlineGame } from '@boboland/shared/src/frontline';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { readChat, type ChatLine } from '../lib/chat';
import { navigate } from '../lib/router';
import { FrontlineScreen, type FrontlineState } from './FrontlineScreen';
import { fetchMatch, type FlMatch } from './lobby';

/** Read-only view of a match for someone without a seat: no playerID, shown from player 0's side. */
export function FrontlineWatch({ matchID }: { matchID: string }) {
  const client = useMemo(() => Client({
    game: FrontlineGame, numPlayers: 2, matchID, multiplayer: SocketIO({ server: window.location.origin }), debug: false,
  }) as unknown as BgioClient, [matchID]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const raw = useClientState(client) as unknown as FrontlineState | null;
  const rawChat = client.chatMessages;
  const chatLines = useMemo(() => (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null), [rawChat]);
  const [info, setInfo] = useState<FlMatch>({ names: {} });
  useEffect(() => {
    let alive = true;
    const tick = () => fetchMatch(matchID).then((m) => alive && setInfo(m), () => {});
    tick();
    const t = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  if (!raw) return <main className="min-h-screen bg-[#1e2320] p-6 text-[#e8e6df]">Connecting…</main>;
  return <FrontlineScreen spectator state={raw} playerID="0" moves={client.moves} names={info.names} chatLines={chatLines} onExit={() => navigate('/frontline')} />;
}
