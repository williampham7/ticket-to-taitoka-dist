import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import { EgyptianGame, type EgwState } from '@boboland/shared/src/egyptian';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { controlsFor, viewOf, type EgwClientState } from './controls';
import { EgwScreen } from './EgwScreen';
import { isE2E } from './fx';
import { loadLocal } from './localSetup';
import { EGW_COLORS } from './colors';

/** Pass and play: two players on one keyboard, one Local() master with a client per seat. `?seed=` fixes the deal. */
export function EgyptianLocal() {
  const [n, setN] = useState(0);
  return <LocalMatch key={n} onRematch={() => setN((x) => x + 1)} />;
}

function LocalMatch({ onRematch }: { onRematch: () => void }) {
  const setup = useMemo(() => loadLocal(), []);
  const clients = useMemo(() => {
    const seed = new URLSearchParams(window.location.search).get('seed');
    const data = { rules: setup.rules, ...(isE2E() ? { quick: true } : {}) };
    const base: Game<EgwState> = seed ? { ...EgyptianGame, seed } : { ...EgyptianGame };
    const game = { ...base, setup: (ctx: Parameters<NonNullable<Game<EgwState>['setup']>>[0]) => base.setup!(ctx, data) };
    const multiplayer = Local();
    return (['0', '1'] as const).map((id) => Client({ game, numPlayers: 2, multiplayer, playerID: id, debug: false }) as unknown as BgioClient);
  }, [setup]);
  useEffect(() => {
    clients.forEach((c) => c.start());
    return () => clients.forEach((c) => c.stop());
  }, [clients]);
  const s0 = useClientState(clients[0]) as unknown as EgwClientState | null;
  const controls = useMemo(() => clients.map(controlsFor), [clients]);
  const names = useMemo(() => ({ 0: setup.names[0], 1: setup.names[1] }), [setup]);
  if (!s0) return null;
  return (
    <EgwScreen view={viewOf(s0)} me={null} mode="local" names={names} colors={{ 0: EGW_COLORS[0], 1: EGW_COLORS[1] }}
      controls={controls} onExit={() => navigate('/egyptian')} again={{ label: 'Rematch', onClick: onRematch }} />
  );
}
