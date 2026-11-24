/**
 * Frontline rules, pure functions on the full (server-side) state. No boardgame.io, no maps.
 */
import { DIRS, SIZE, colOf, inZone, isLake, onBoard, other, pos, rowOf, zoneSquares, type PlayerID, type Pos } from './board';
import { ARMY, ARMY_SIZE, ENGINEER, MARSHAL, OPERATIVE, SCOUT, isRank, kindOf, type Rank } from './pieces';

export interface Piece { id: string; owner: PlayerID; rank: Rank; pos: Pos; revealed: boolean }
/** One piece's run of consecutive moves between the same two squares (two-square rule). */
export interface Streak { id: string; a: Pos; b: Pos; n: number }
export interface CombatSide { id: string; owner: PlayerID; rank: Rank }
export type CombatWinner = 'attacker' | 'defender' | 'both';
export interface Combat { at: Pos; attacker: CombatSide; defender: CombatSide; winner: CombatWinner }
export interface Result { winner: PlayerID | null; reason: 'flag' | 'noMoves' | 'draw' | 'resign' | 'timeout' }
/**
 * A running chase (simplified ISF more-squares rule): `chaser` keeps moving next to the opponent's piece `target`,
 * which keeps fleeing. `seen` holds the positions after each chasing move; the chaser may not recreate one.
 */
export interface Chase { chaser: PlayerID; target: string; seen: string[] }
export interface Fallen { owner: PlayerID; rank: Rank }
export interface MoveArgs { from: Pos; to: Pos }
export type Placement = { pos: Pos; rank: Rank }[];

export interface FrontlineState {
  /** Every piece on the board, both sides. Views filter this; stored state is always complete. */
  pieces: Piece[];
  ready: Record<PlayerID, boolean>;
  streak: Record<PlayerID, Streak | null>;
  /** Who moves first (picked at setup with the seeded random). */
  first: PlayerID;
  lastMove: { player: PlayerID; from: Pos; to: Pos } | null;
  lastCombat: Combat | null;
  result: Result | null;
  /** Moves played so far. */
  moves: number;
  chase: Chase | null;
  /** Pieces removed in combat (public: combat reveals both ranks). */
  fallen: Fallen[];
  /** Per-turn time limit in seconds (null: none) and when the current turn started (server clock, ms). */
  turnSeconds: number | null;
  turnStartedAt: number | null;
  /** When play started (both armies set up; server clock, ms), for the elapsed-time readout. */
  startedAt: number | null;
}

/** Most consecutive moves one piece may make between the same two squares. */
export const TWO_SQUARE_LIMIT = 3;

export const emptyState = (): FrontlineState => ({
  pieces: [], ready: { 0: false, 1: false }, streak: { 0: null, 1: null }, first: '0',
  lastMove: null, lastCombat: null, result: null, moves: 0,
  chase: null, fallen: [], turnSeconds: null, turnStartedAt: null, startedAt: null,
});

/** Who survives when `a` attacks `d`. */
export function resolveCombat(a: Rank, d: Rank): CombatWinner {
  if (d === 'F') return 'attacker';
  if (d === 'B') return a === ENGINEER ? 'attacker' : 'defender';
  if (a === OPERATIVE && d === MARSHAL) return 'attacker';
  if (a === d) return 'both';
  return (a as number) > (d as number) ? 'attacker' : 'defender';
}

const samePair = (s: Streak, id: string, from: Pos, to: Pos) =>
  s.id === id && ((s.a === from && s.b === to) || (s.a === to && s.b === from));

/** The part of a state (full, or one player's view) that move generation reads: own pieces need their rank. */
type BoardPiece = { id: string; owner: PlayerID; pos: Pos; rank?: Rank };
export type Board = Pick<FrontlineState, 'streak' | 'lastMove' | 'chase'> & { pieces: readonly BoardPiece[] };

const adjacent = (a: Pos, b: Pos) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1;
/** The whole position after moving piece `movedId` to `to` (ids are stable, so this identifies a position). */
const positionKey = (pieces: readonly BoardPiece[], movedId: string, to: Pos) =>
  pieces.map((p) => `${p.id}@${p.id === movedId ? to : p.pos}`).join(',');

/** A chasing move: no attack, and the moved piece lands next to the piece the opponent just moved. Returns that piece's id. */
function chasedBy(S: Board, player: PlayerID, m: MoveArgs): string | null {
  const lm = S.lastMove;
  if (!lm || lm.player === player) return null;
  const target = S.pieces.find((p) => p.pos === lm.to && p.owner !== player);
  if (!target || S.pieces.some((p) => p.pos === m.to)) return null;
  return adjacent(m.to, target.pos) ? target.id : null;
}

/** True if `m` continues `player`'s chase into a position the chase has already produced. */
function repeatsChase(S: Board, player: PlayerID, m: MoveArgs): boolean {
  const c = S.chase;
  if (!c || c.chaser !== player || chasedBy(S, player, m) !== c.target) return false;
  const mover = S.pieces.find((p) => p.pos === m.from)!;
  return c.seen.includes(positionKey(S.pieces, mover.id, m.to));
}

/** Every move the rules allow, ignoring the two-square rule. */
function rawMoves(S: Board, player: PlayerID, firstOnly = false, onlyFrom?: Pos): MoveArgs[] {
  const occ = new Map<Pos, BoardPiece>();
  for (const p of S.pieces) occ.set(p.pos, p);
  const out: MoveArgs[] = [];
  for (const p of S.pieces) {
    if (onlyFrom !== undefined && p.pos !== onlyFrom) continue;
    if (p.owner !== player || p.rank === undefined || !kindOf(p.rank).movable) continue;
    const reach = p.rank === SCOUT ? SIZE : 1;
    for (const [dr, dc] of DIRS) {
      let r = rowOf(p.pos), c = colOf(p.pos);
      for (let step = 0; step < reach; step++) {
        r += dr; c += dc;
        if (!onBoard(r, c)) break;
        const to = pos(r, c);
        if (isLake(to)) break;
        const there = occ.get(to);
        if (there?.owner === player) break;
        out.push({ from: p.pos, to });
        if (firstOnly) return out;
        if (there) break; // attack ends the line
      }
    }
  }
  return out;
}

/**
/** Whether `player` has any legal move. The two-square rule always yields, so any move at all counts. */
export const hasLegalMove = (S: Board, player: PlayerID) => rawMoves(S, player, true).length > 0;

/**
 * Legal moves for `player`. The two-square rule removes a 4th consecutive move of one piece between the same
 * two squares, and the chase rule removes a chasing move that repeats a position of the chase; both yield if
 * they would leave the player with no move at all.
 */
export function legalMoves(S: Board, player: PlayerID, onlyFrom?: Pos): MoveArgs[] {
  const raw = rawMoves(S, player, false, onlyFrom);
  const st = S.streak[player];
  const twoSquare = !!st && st.n >= TWO_SQUARE_LIMIT;
  const chasing = S.chase?.chaser === player;
  if (!twoSquare && !chasing) return raw;
  const kept = raw.filter((m) => !(twoSquare && S.pieces.find((p) => p.pos === m.from)?.id === st!.id && samePair(st!, st!.id, m.from, m.to))
    && !(chasing && repeatsChase(S, player, m)));
  if (kept.length > 0) return kept;
  // the rule yields only if the player has no other move at all
  return onlyFrom === undefined ? raw : legalMoves(S, player).filter((m) => m.from === onlyFrom);
}

export const isLegal = (S: Board, player: PlayerID, m: MoveArgs) =>
  typeof m.from === 'number' && legalMoves(S, player, m.from).some((x) => x.to === m.to);

/** Play a move on the full state (mutates it). Throws on an illegal move. */
export function applyMove(S: FrontlineState, player: PlayerID, m: MoveArgs): { combat: Combat | null } {
  if (!isLegal(S, player, m)) throw new Error('illegal move');
  const mover = S.pieces.find((p) => p.pos === m.from)!;
  const target = S.pieces.find((p) => p.pos === m.to);
  const chaseTarget = chasedBy(S, player, m);
  const key = chaseTarget ? positionKey(S.pieces, mover.id, m.to) : '';
  // the chased player keeps the chase going only by fleeing with the chased piece
  if (S.chase && S.chase.chaser !== player && mover.id !== S.chase.target) S.chase = null;
  if (chaseTarget) {
    if (S.chase?.chaser === player && S.chase.target === chaseTarget) S.chase.seen.push(key);
    else S.chase = { chaser: player, target: chaseTarget, seen: [key] };
  } else if (S.chase?.chaser === player) S.chase = null;
  const st = S.streak[player];
  S.streak[player] = st && samePair(st, mover.id, m.from, m.to) ? { ...st, n: st.n + 1 } : { id: mover.id, a: m.from, b: m.to, n: 1 };
  S.lastMove = { player, from: m.from, to: m.to };
  S.moves++;
  // a scout running more than one square shows what it is
  const dist = Math.abs(rowOf(m.to) - rowOf(m.from)) + Math.abs(colOf(m.to) - colOf(m.from));
  if (dist > 1) mover.revealed = true;
  if (!target) {
    mover.pos = m.to;
    S.lastCombat = null;
    return { combat: null };
  }
  const winner = resolveCombat(mover.rank, target.rank);
  const combat: Combat = {
    at: m.to, winner,
    attacker: { id: mover.id, owner: mover.owner, rank: mover.rank },
    defender: { id: target.id, owner: target.owner, rank: target.rank },
  };
  if (winner !== 'attacker') S.fallen.push({ owner: mover.owner, rank: mover.rank });
  if (winner !== 'defender') S.fallen.push({ owner: target.owner, rank: target.rank });
  if (winner === 'attacker') {
    S.pieces = S.pieces.filter((p) => p !== target);
    mover.pos = m.to;
    mover.revealed = true;
  } else if (winner === 'defender') {
    S.pieces = S.pieces.filter((p) => p !== mover);
    target.revealed = true;
  } else {
    S.pieces = S.pieces.filter((p) => p !== mover && p !== target);
  }
  S.lastCombat = combat;
  return { combat };
}

/** The result after `mover` has moved (or at the start, with `mover` = the player who does not move first). */
export function outcome(S: FrontlineState, mover: PlayerID): Result | null {
  const next = other(mover);
  if (!S.pieces.some((p) => p.owner === next && p.rank === 'F')) return { winner: mover, reason: 'flag' };
  if (!hasLegalMove(S, next)) {
    return !hasLegalMove(S, mover) ? { winner: null, reason: 'draw' } : { winner: mover, reason: 'noMoves' };
  }
  return null;
}

/** Why a setup is not allowed, or undefined if it is: exactly the army, each piece on its own square in the zone. */
export function validatePlacement(player: PlayerID, placement: unknown): string | undefined {
  if (!Array.isArray(placement)) return 'placement must be a list';
  if (placement.length !== ARMY_SIZE) return `placement must have exactly ${ARMY_SIZE} pieces`;
  const seen = new Set<Pos>();
  const counts = new Map<Rank, number>();
  for (const x of placement as unknown[]) {
    if (!x || typeof x !== 'object') return 'bad piece';
    const { pos: p, rank } = x as { pos: unknown; rank: unknown };
    if (!isRank(rank)) return 'bad rank';
    if (typeof p !== 'number' || !inZone(player, p)) return 'piece outside the setup zone';
    if (seen.has(p)) return 'two pieces overlap on one square';
    seen.add(p);
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  for (const k of ARMY) if ((counts.get(k.rank) ?? 0) !== k.count) return `wrong count of ${k.name}`;
  return undefined;
}

/** A random legal setup for `player`, from a [0, 1) random source. */
export function randomPlacement(player: PlayerID, rnd: () => number): Placement {
  const ranks: Rank[] = ARMY.flatMap((k) => Array<Rank>(k.count).fill(k.rank));
  for (let i = ranks.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ranks[i], ranks[j]] = [ranks[j], ranks[i]];
  }
  return zoneSquares(player).map((p, i) => ({ pos: p, rank: ranks[i] }));
}

/** Put a player's validated setup on the board. Piece ids come from the starting square, so they say nothing of rank. */
export function placeArmy(S: FrontlineState, player: PlayerID, placement: Placement): void {
  S.pieces = S.pieces.filter((p) => p.owner !== player)
    .concat(placement.map((x) => ({ id: `${player}-${x.pos}`, owner: player, rank: x.rank, pos: x.pos, revealed: false })));
}
