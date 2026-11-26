import type { BState, PlayerID } from './rules';

/**
 * Blocky has no hidden information (every shelf and board is public), so the view is the state itself.
 * It exists as the one place to filter if that ever changes. boardgame.io keeps its rng in `ctx`, not in G.
 */
export type BView = BState;
export function viewFor(s: BState, _playerID?: PlayerID | null): BView {
  return s;
}
