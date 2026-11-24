import { useEffect, useMemo, useState } from 'react';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import { FleetGame, type FleetSetupData, type PlayerID } from '@boboland/shared/src/fleet';
import { useClientState, type BgioClient } from '../lib/useClientState';
import { navigate } from '../lib/router';
import { controlsFor, viewOf, type FleetClientState } from './controls';
import { FleetScreen } from './FleetScreen';
import { readPlay } from './setup';
import { seatToShow } from './helpers';
import { Curtain } from './RoundResult';

/** Pass and play: one device, a Local() master with a client per seat; the screen shows the seat whose turn it is. */
export function FleetLocal() {
  const play = useMemo(() => readPlay(window.location.search), []);
  const [n, setN] = useState(0);
  return <LocalMatch key={n} setup={play.setup} allUnlocked={play.allUnlocked} onRematch={() => setN((x) => x + 1)} />;
}

function LocalMatch({ setup, allUnlocked, onRematch }: { setup: Required<FleetSetupData>; allUnlocked: boolean; onRematch: () => void }) {
  const clients = useMemo(() => {
    const game = { ...FleetGame, setup: (ctx: Parameters<NonNullable<typeof FleetGame.setup>>[0]) => FleetGame.setup!(ctx, setup) };
    const multiplayer = Local();
    return (['0', '1'] as const).map((id) => Client({ game, numPlayers: 2, multiplayer, playerID: id, debug: false }) as unknown as BgioClient);
  }, [setup]);
  useEffect(() => {
    clients.forEach((c) => c.start());
    return () => clients.forEach((c) => c.stop());
  }, [clients]);
  const s0 = useClientState(clients[0]) as unknown as FleetClientState | null;
  const s1 = useClientState(clients[1]) as unknown as FleetClientState | null;
  const controls = useMemo(() => clients.map(controlsFor), [clients]);

  // the seat on screen, whether its results are still landing, and the last report each seat has seen
  const [shown, setShown] = useState<PlayerID>('0');
  const [curtain, setCurtain] = useState(false);
  const [seen, setSeen] = useState<Record<PlayerID, number>>({ 0: 0, 1: 0 });
  const v0 = s0 ? viewOf(s0) : null;
  const want = v0 ? seatToShow(v0) : '0';
  const over = !!v0?.result;
  // results the seat on screen has not watched yet (read from the report counter, so a shot just fired counts at once)
  const unseen = !!v0 && v0.stage !== 'placement' && seen[shown] < v0.seq;
  useEffect(() => {
    // the attacker first watches their result land; then the screen goes dark for the next player
    if (!v0 || over || unseen || curtain || want === shown) return;
    setCurtain(true);
  }, [want, shown, unseen, curtain, over, v0]);

  if (!s0 || !s1) return null;
  const names = { 0: 'Player 1', 1: 'Player 2' };
  if (curtain) {
    return (
      <main className="fleet fleet-game">
        <Curtain name={names[want]} onGo={() => { setShown(want); setCurtain(false); }} />
      </main>
    );
  }
  const state = shown === '0' ? s0 : s1;
  return (
    <FleetScreen key={shown} view={viewOf(state)} me={shown} kind="local" allUnlocked={allUnlocked} controls={controls[Number(shown)]}
      names={names} onExit={() => navigate('/fleet')} rematch={{ onClick: onRematch }} revealFrom={seen[shown]}
      onReveal={(b, seq) => { if (!b) setSeen((cur) => (cur[shown] === seq ? cur : { ...cur, [shown]: seq })); }} />
  );
}
