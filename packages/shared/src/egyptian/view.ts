import type { EgwState, PlayerID } from './rules';

/** What every client sees: stack counts, never stack contents; a burned-card count, never the cards. */
export interface EgwView extends Omit<EgwState, 'stacks' | 'burned'> {
  counts: Record<PlayerID, number>;
  burnedCount: number;
}

/**
 * The only hidden-information filter. Nobody sees any stack (including their own) or a burned card, ever,
 * so the view is the same for every player and spectator. Log events never carry a burned card.
 */
export function viewFor(G: EgwState): EgwView {
  const { stacks, burned, ...rest } = G;
  const counts: Record<PlayerID, number> = {};
  for (const p of G.players) counts[p] = stacks[p].length;
  return { ...rest, counts, burnedCount: burned.length };
}
