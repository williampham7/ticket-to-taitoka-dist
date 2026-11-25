import type { TreasureId } from './tiles';
import type { KState, PlayerID } from './rules';

/**
 * The only hidden-information filter. `stacks` never leaves the server: you get your current target
 * (your whole remaining stack in Young Adventurer mode), everyone's remaining count, and after the game everything.
 */
export interface KView extends Omit<KState, 'stacks'> {
  targets: Record<PlayerID, TreasureId[]>;
  left: Record<PlayerID, number>;
  me: PlayerID | null;
}

export function viewFor(G: KState, playerID: PlayerID | null | undefined): KView {
  const me = playerID ?? null;
  const over = !!G.result;
  const { stacks, ...rest } = G;
  const targets: Record<PlayerID, TreasureId[]> = {};
  for (const p of G.players) {
    const s = stacks[p];
    targets[p] = over ? [...s] : p === me ? (G.young[Number(p)] ? [...s] : s.slice(0, 1)) : [];
  }
  return {
    ...structuredClone(rest),
    targets, left: Object.fromEntries(G.players.map((p) => [p, stacks[p].length])), me,
  };
}
