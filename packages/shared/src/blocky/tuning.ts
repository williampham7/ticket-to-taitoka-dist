/** Every game and bot number for Blocky in one place. */
export type Guild = 'tide' | 'sun' | 'ember' | 'grove';
/** Guilds in play order. */
export const GUILDS: Guild[] = ['tide', 'sun', 'ember', 'grove'];
export type Board = 'classic' | 'duo';
export const BOARDS: Board[] = ['classic', 'duo'];
export const SIZES: Record<Board, 14 | 20> = { classic: 20, duo: 14 };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
/** Start squares as [row, col]: the Classic corners clockwise from the top-left; Duo's house-rule pair. */
export const CLASSIC_STARTS: Record<Guild, [number, number]> = { tide: [0, 0], sun: [0, 19], ember: [19, 19], grove: [19, 0] };
export const DUO_STARTS: Partial<Record<Guild, [number, number]>> = { tide: [4, 4], ember: [9, 9] };
/** Advanced scoring: +15 for placing all 21 pieces, +20 when the last was the monomino. */
export const BONUS_ALL = 15;
export const BONUS_MONO = 20;
/** Public events kept in G.log (logTotal counts them all). */
export const LOG_KEEP = 120;
export const AVATARS = 6;

export const BOT = {
  /** Easy: weight of a placement = squares ** this */
  easyPow: 2,
  /** Medium/Hard: points per square of the piece */
  size: 3,
  /** per net open corner gained */
  corner: 1.5,
  /** per opponent open corner this piece covers */
  block: 2,
  /** the pull towards the centre in a guild's first moves (per cell of distance from the piece's centre) */
  centre: 0.8,
  centreMoves: 4,
  /** random jitter added to Medium/Hard scores so games differ */
  jitter: 0.3,
  /** Hard: candidates it looks ahead from, and the weight of the opponent's mobility (per legal placement) */
  hardTop: 12,
  mobility: 0.4,
  /** Hard: weight of my own legal placements after the move */
  ownMobility: 0.1,
  /** Hard (2-ply option): candidates for the deeper look */
  deepTop: 6,
};
