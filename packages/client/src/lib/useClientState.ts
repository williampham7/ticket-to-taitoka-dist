import { useEffect, useState } from 'react';
import type { GState } from '@boboland/shared';

export interface BgioState {
  G: GState;
  ctx: { phase: string; currentPlayer: string; numPlayers: number; activePlayers: Record<string, string> | null; gameover?: { winners: string[] }; turn: number };
  isConnected: boolean;
}

export interface BgioClient {
  playerID: string | null;
  moves: Record<string, (...args: unknown[]) => void>;
  getState(): unknown;
  subscribe(cb: (s: unknown) => void): () => void;
  start(): void;
  stop(): void;
  /** multiplayer only: chat relayed through the game server */
  chatMessages?: { id: string; sender: string; payload: unknown }[];
  sendChatMessage?: (payload: unknown) => void;
}

/**
 * Subscribe a React component to a vanilla boardgame.io client.
 * When the client changes (pass-and-play switching seats), the very first render already returns the
 * new client's state — never the previous seat's view, whose hidden fields would look like fresh changes.
 */
export function useClientState(client: BgioClient | null): BgioState | null {
  const [held, setHeld] = useState<{ client: BgioClient | null; state: BgioState | null }>(() => ({
    client,
    state: (client?.getState() as BgioState) ?? null,
  }));
  useEffect(() => {
    if (!client) return;
    setHeld({ client, state: client.getState() as BgioState });
    return client.subscribe((s) => setHeld({ client, state: s as BgioState }));
  }, [client]);
  if (held.client !== client) return (client?.getState() as BgioState) ?? null;
  return held.state;
}
