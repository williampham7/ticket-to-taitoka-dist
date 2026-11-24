import { kindOf, type Combat, type Placement, type PlayerID, type Rank } from '@boboland/shared/src/frontline';

/** Where square `pos` is drawn: player 1 sees the board rotated 180 degrees so their army is at the bottom. */
export const displayPos = (me: PlayerID, pos: number): number => (me === '1' ? 99 - pos : pos);

/** A placement with the ranks on squares `a` and `b` exchanged (unchanged if either square is not in it). */
export function swapSquares(placement: Placement, a: number, b: number): Placement {
  if (!placement.some((p) => p.pos === a) || !placement.some((p) => p.pos === b)) return placement;
  return placement.map((p) => (p.pos === a ? { ...p, rank: placement.find((q) => q.pos === b)!.rank } : p.pos === b ? { ...p, rank: placement.find((q) => q.pos === a)!.rank } : p));
}

export const rankLabel = (r: Rank): string => `${kindOf(r).name} (${r})`;

/** "Your Captain (6) attacked their Sergeant (4): Captain wins" */
export function combatSentence(c: Combat, me: PlayerID): string {
  const mine = (owner: PlayerID) => (owner === me ? 'Your' : 'Their');
  const attacked = c.defender.owner === me ? 'your' : 'their';
  const result = c.winner === 'both' ? 'both are removed' : `${kindOf(c.winner === 'attacker' ? c.attacker.rank : c.defender.rank).name} wins`;
  return `${mine(c.attacker.owner)} ${rankLabel(c.attacker.rank)} attacked ${attacked} ${rankLabel(c.defender.rank)}: ${result}`;
}

/** "Bo's Operative (1) attacked Ana's Marshal (10): Operative wins" (neutral wording, for a screen both players see). */
export function combatSentenceNamed(c: Combat, names: Record<PlayerID, string>): string {
  const result = c.winner === 'both' ? 'both are removed' : `${kindOf(c.winner === 'attacker' ? c.attacker.rank : c.defender.rank).name} wins`;
  return `${names[c.attacker.owner]}'s ${rankLabel(c.attacker.rank)} attacked ${names[c.defender.owner]}'s ${rankLabel(c.defender.rank)}: ${result}`;
}

/** A saved army as 40 ranks in display order (the owner's zone, top-left to bottom-right), the same for both sides. */
export function layoutFromPlacement(me: PlayerID, placement: Placement): Rank[] {
  const out: Rank[] = new Array(40);
  for (const p of placement) out[displayPos(me, p.pos) - 60] = p.rank;
  return out;
}

export function placementFromLayout(me: PlayerID, layout: readonly Rank[]): Placement {
  return layout.map((rank, d) => ({ pos: displayPos(me, 60 + d), rank }));
}

/** Whole seconds left in the current turn, or null when there is no limit. */
export function secondsLeft(g: { turnSeconds: number | null; turnStartedAt: number | null }, now: number): number | null {
  if (!g.turnSeconds || g.turnStartedAt === null) return null;
  return Math.max(0, Math.ceil((g.turnStartedAt + g.turnSeconds * 1000 - now) / 1000));
}
