import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { SocketIO } from 'boardgame.io/multiplayer';
import { FleetGame } from '@boboland/shared/src/fleet';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { readChat, type ChatLine } from '../lib/chat';
import { navigate } from '../lib/router';
import { controlsFor, viewOf, type FleetClientState } from './controls';
import { FleetScreen } from './FleetScreen';
import { fetchMatch, type FleetMatch } from './lobby';
import { Shell } from './ui';

/** Read-only view of a match for someone without a seat: no playerID, so neither fleet is shown until the round ends. */
export function FleetWatch({ matchID }: { matchID: string }) {
  const client = useMemo(() => Client({
    game: FleetGame, numPlayers: 2, matchID, multiplayer: SocketIO({ server: window.location.origin }), debug: false,
  }) as unknown as BgioClient, [matchID]);
  useEffect(() => { client.start(); return () => client.stop(); }, [client]);
  const raw = useClientState(client) as unknown as FleetClientState | null;
  const controls = useMemo(() => controlsFor(client), [client]);
  const rawChat = client.chatMessages;
  const chatLines = useMemo(() => (rawChat ?? []).map(readChat).filter((l): l is ChatLine => l !== null), [rawChat]);
  const [info, setInfo] = useState<FleetMatch>({ names: {} });
  useEffect(() => {
    let alive = true;
    const tick = () => fetchMatch(matchID).then((m) => alive && setInfo(m), () => {});
    tick();
    const t = setInterval(tick, 2000);
    return () => { alive = false; clearInterval(t); };
  }, [matchID]);
  if (!raw) return <Shell title="Connecting…"><p className="opacity-80">Connecting…</p></Shell>;
  return <FleetScreen spectator kind="watch" view={viewOf(raw)} me="0" controls={controls} names={info.names} chatLines={chatLines} onExit={() => navigate('/fleet')} />;
}
