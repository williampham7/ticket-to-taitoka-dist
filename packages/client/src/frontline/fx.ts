import { colOf, rowOf, type Combat, type Pos, type Spot } from '@boboland/shared/src/frontline';

/** What a combat looked like, from the attacker's side. */
export type CombatOutcome = 'win' | 'repel' | 'trade' | 'blast' | 'defuse' | 'capture';

export function combatOutcome(c: Combat): CombatOutcome {
  if (c.defender.rank === 'F') return 'capture';
  if (c.defender.rank === 'B') return c.winner === 'attacker' ? 'defuse' : 'blast';
  return c.winner === 'attacker' ? 'win' : c.winner === 'defender' ? 'repel' : 'trade';
}

/**
 * The combat cinematic, in ms from the moment the move arrives. The duel overlay reads these as CSS
 * variables (`--t-*`), so this table is the only place the timing lives.
 */
export const COMBAT_T = {
  /** the attacker advances on the board, a reticle locks on the target */
  approach: 0,
  /** the duel panel opens: both tiles slide in */
  duel: 380,
  /** the hidden tile(s) flip over */
  reveal: 760,
  /** both tiles rush together */
  clash: 1150,
  /** contact: flash and shake */
  impact: 1380,
  /** the loser is destroyed, the verdict is stamped */
  result: 1420,
  /** the panel closes */
  out: 2250,
} as const;
export const COMBAT_MS = 2550;
/** A mine going off or a command post falling gets a little longer to land. */
export const BIG_EXTRA_MS = 350;
export const REDUCED_COMBAT_MS = 1500;

/**
 * A Spotter's spot, in ms: the sight line reaches out and the reticle locks on, the call (the named rank) is
 * shown over the target, then the verdict lands (a hit: the target is struck off the board). Read as `--s-*`.
 */
export const SPOT_T = {
  /** the sight line draws from the Spotter to the target */
  aim: 0,
  /** the called rank pops up over the target */
  call: 420,
  /** the verdict: hit or miss */
  result: 1150,
  /** everything fades */
  out: 1850,
} as const;
export const SPOT_MS = 2200;
export const REDUCED_SPOT_MS = 1100;

/** After the last move's animation, the computer waits this long before it answers. */
export const BOT_PAUSE_MS = 1200;

export type Fx =
  | { kind: 'move'; from: Pos; to: Pos; ms: number }
  | { kind: 'combat'; from: Pos; combat: Combat; outcome: CombatOutcome; ms: number }
  | { kind: 'spot'; spot: Spot; ms: number };

interface MoveInfo { moves: number; lastMove: { from: Pos; to: Pos } | null; lastCombat: Combat | null; lastSpot?: Spot | null }

const distance = (a: Pos, b: Pos) => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
export const slideMs = (from: Pos, to: Pos) => Math.min(560, 200 + 60 * distance(from, to));

const big = (o: CombatOutcome) => o === 'blast' || o === 'capture';

/** The animation for the latest move, whatever came before it. */
function fxOfLast(G: MoveInfo, reduced: boolean): Fx | null {
  if (G.lastSpot && G.moves > 0) return { kind: 'spot', spot: G.lastSpot, ms: reduced ? REDUCED_SPOT_MS : SPOT_MS };
  const m = G.lastMove;
  if (!m || G.moves === 0) return null;
  if (G.lastCombat) {
    const outcome = combatOutcome(G.lastCombat);
    const ms = reduced ? REDUCED_COMBAT_MS : COMBAT_MS + (big(outcome) ? BIG_EXTRA_MS : 0);
    return { kind: 'combat', from: m.from, combat: G.lastCombat, outcome, ms };
  }
  return { kind: 'move', from: m.from, to: m.to, ms: reduced ? 0 : slideMs(m.from, m.to) };
}

/** The animation to play when the state moves on from `prevMoves` moves to G: only for exactly one new move. */
export function fxFor(prevMoves: number, G: MoveInfo, reduced = false): Fx | null {
  if (G.moves !== prevMoves + 1) return null;
  return fxOfLast(G, reduced);
}

/** How long the latest move animates (0 if there is none). */
export const fxMs = (G: MoveInfo, reduced = false): number => fxOfLast(G, reduced)?.ms ?? 0;

/** How long the computer waits before its move: the human's move plays out, then a pause. */
export const botDelay = (G: MoveInfo, reduced = false): number => fxMs(G, reduced) + BOT_PAUSE_MS;

/** CSS variables for the spot timeline (reduced motion: the same beats, faster). */
export function spotVars(reduced: boolean): Record<string, string> {
  const k = reduced ? REDUCED_SPOT_MS / SPOT_MS : 1;
  return Object.fromEntries(Object.entries(SPOT_T).map(([n, ms]) => [`--s-${n}`, `${Math.round(ms * k)}ms`]));
}

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
