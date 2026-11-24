import { emptyState, pos, type FrontlineState, type PlayerID, type Rank } from '../src/frontline';

/** A hand-built play-phase board: [owner, rank, row, col] per piece. Ids are owner-row-col. */
export function board(pieces: [PlayerID, Rank, number, number][]): FrontlineState {
  const S = emptyState();
  S.pieces = pieces.map(([owner, rank, r, c]) => ({ id: `${owner}-${pos(r, c)}`, owner, rank, pos: pos(r, c), revealed: false }));
  S.ready = { 0: true, 1: true };
  return S;
}

/** Small deterministic PRNG in [0, 1). */
export function prng(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Seat 0 ends the briefing (the pre-game settings screen) so the armies can be set up. Returns the client. */
export function begin<C extends { playerID: string | null; getState: () => { ctx: { phase: string } } | null; moves: Record<string, (...a: unknown[]) => void> }>(c: C): C {
  if (c.playerID === '0' && c.getState()?.ctx.phase === 'briefing') c.moves.begin();
  return c;
}
