import type { PlayerID, Pos } from './board';
import type { Rank } from './pieces';
import type { FrontlineState } from './rules';

/** A piece as one player sees it: `rank` only for own pieces, revealed pieces, and after the game. */
export interface ViewPiece { id: string; owner: PlayerID; pos: Pos; revealed: boolean; rank?: Rank }
export type FrontlineView = Omit<FrontlineState, 'pieces'> & { pieces: ViewPiece[] };

/**
 * What `viewer` may see of the full state. This is the only place hidden ranks are filtered:
 * - setup phase: the other side's army is left out entirely;
 * - play: enemy pieces that have not been revealed carry no rank (not even a placeholder key);
 * - game over: everything is shown to everyone.
 * A spectator (`viewer` null) is treated as nobody's side.
 */
export function viewFor(G: FrontlineState, phase: string | null | undefined, viewer: string | null | undefined): FrontlineView {
  const all = !!G.result;
  const pieces: ViewPiece[] = [];
  for (const p of G.pieces) {
    if (all || p.owner === viewer) pieces.push({ ...p });
    else if (phase === 'setup') continue;
    else if (p.revealed) pieces.push({ ...p });
    else pieces.push({ id: p.id, owner: p.owner, pos: p.pos, revealed: false });
  }
  return { ...G, pieces };
}
