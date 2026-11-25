import { badgeOf, boardRows, kindOf, type ArmyId, type Combat, type Placement, type PlayerID, type Rank, type Spot } from '@boboland/shared/src/frontline';

const COLS = 'ABCDEFGHIJ';
/** Real coordinates, the same for both players: column letter, row number counted from player 0's back row. */
export const coordOf = (pos: number, rows = 10) => `${COLS[pos % 10]}${rows - Math.floor(pos / 10)}`;

/** Where square `pos` is drawn: player 1 sees the board rotated 180 degrees so their army is at the bottom. */
export const displayPos = (me: PlayerID, pos: number, rows = 10): number => (me === '1' ? rows * 10 - 1 - pos : pos);

/** A placement with the ranks on squares `a` and `b` exchanged (unchanged if either square is not in it). */
export function swapSquares(placement: Placement, a: number, b: number): Placement {
  if (!placement.some((p) => p.pos === a) || !placement.some((p) => p.pos === b)) return placement;
  return placement.map((p) => (p.pos === a ? { ...p, rank: placement.find((q) => q.pos === b)!.rank } : p.pos === b ? { ...p, rank: placement.find((q) => q.pos === a)!.rank } : p));
}

/** "Captain (6)"; in the Spotter army the Spotter is (1) and the Operative (S), as its tiles show. */
export const rankLabel = (r: Rank, army: ArmyId = 'classic'): string => `${kindOf(r).name} (${badgeOf(r, army) || r})`;

/** "Your Captain (6) attacked their Sergeant (4): Captain wins" */
export function combatSentence(c: Combat, me: PlayerID, army: ArmyId = 'classic'): string {
  const mine = (owner: PlayerID) => (owner === me ? 'Your' : 'Their');
  const attacked = c.defender.owner === me ? 'your' : 'their';
  const result = c.winner === 'both' ? 'both are removed' : `${kindOf(c.winner === 'attacker' ? c.attacker.rank : c.defender.rank).name} wins`;
  return `${mine(c.attacker.owner)} ${rankLabel(c.attacker.rank, army)} attacked ${attacked} ${rankLabel(c.defender.rank, army)}: ${result}`;
}

/** "Bo's Operative (1) attacked Ana's Marshal (10): Operative wins" (neutral wording, for a screen both players see). */
export function combatSentenceNamed(c: Combat, names: Record<PlayerID, string>, army: ArmyId = 'classic'): string {
  const result = c.winner === 'both' ? 'both are removed' : `${kindOf(c.winner === 'attacker' ? c.attacker.rank : c.defender.rank).name} wins`;
  return `${names[c.attacker.owner]}'s ${rankLabel(c.attacker.rank, army)} attacked ${names[c.defender.owner]}'s ${rankLabel(c.defender.rank, army)}: ${result}`;
}

const a = (r: Rank) => (/^[AEIOU]/.test(kindOf(r).name) ? 'an' : 'a');
const spotResult = (s: Spot) => (s.hit ? 'correct, it is removed' : 'wrong, it stays hidden');

/** "Your Spotter named their piece at E6 a Marshal (10): correct, it is removed" */
export function spotSentence(s: Spot, me: PlayerID, army: ArmyId = 'spotter'): string {
  const whose = s.player === me ? ['Your', 'their'] : ['Their', 'your'];
  return `${whose[0]} Spotter named ${whose[1]} piece at ${coordOf(s.at, boardRows(army))} ${a(s.guess)} ${rankLabel(s.guess, army)}: ${spotResult(s)}`;
}

/** "Ana's Spotter named Bo's piece at E6 a Marshal (10): correct, it is removed" (neutral wording). */
export function spotSentenceNamed(s: Spot, names: Record<PlayerID, string>, army: ArmyId = 'spotter'): string {
  const foe: PlayerID = s.player === '0' ? '1' : '0';
  return `${names[s.player]}'s Spotter named ${names[foe]}'s piece at ${coordOf(s.at, boardRows(army))} ${a(s.guess)} ${rankLabel(s.guess, army)}: ${spotResult(s)}`;
}

/** A saved army as `size` ranks in display order (the owner's zone, top-left to bottom-right), the same for both sides. */
export function layoutFromPlacement(me: PlayerID, placement: Placement, size = 40, rows = 10): Rank[] {
  const out: Rank[] = new Array(size);
  for (const p of placement) out[displayPos(me, p.pos, rows) - (rows * 10 - size)] = p.rank;
  return out;
}

export function placementFromLayout(me: PlayerID, layout: readonly Rank[], rows = 10): Placement {
  return layout.map((rank, d) => ({ pos: displayPos(me, rows * 10 - layout.length + d, rows), rank }));
}

/** Whole seconds left in the current turn, or null when there is no limit. */
export function secondsLeft(g: { turnSeconds: number | null; turnStartedAt: number | null }, now: number): number | null {
  if (!g.turnSeconds || g.turnStartedAt === null) return null;
  return Math.max(0, Math.ceil((g.turnStartedAt + g.turnSeconds * 1000 - now) / 1000));
}
