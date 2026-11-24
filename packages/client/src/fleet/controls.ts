import { moveFor, type Deployment, type FleetAction, type FleetState, type FleetView } from '@boboland/shared/src/fleet';
import type { BgioClient } from '../lib/useClientState';

/** What the Fleet screen can ask of a seat. */
export interface FleetControls {
  deploy: (d: Deployment) => void;
  undeploy: () => void;
  act: (a: FleetAction) => void;
  nextRound: () => void;
  resign: () => void;
}

export function controlsFor(client: BgioClient): FleetControls {
  return {
    deploy: (d) => client.moves.deploy(d),
    undeploy: () => client.moves.undeploy(),
    act: (a) => {
      const m = moveFor(a);
      client.moves[m.name](...m.args);
    },
    nextRound: () => client.moves.nextRound(),
    resign: () => client.moves.resign(),
  };
}

/** The raw state of a Fleet client: G is already the player's view. */
export interface FleetClientState {
  G: FleetState;
  ctx: { phase: string; currentPlayer: string; gameover?: { winner?: string } };
  isConnected?: boolean;
}
export const viewOf = (s: FleetClientState): FleetView => s.G as unknown as FleetView;
