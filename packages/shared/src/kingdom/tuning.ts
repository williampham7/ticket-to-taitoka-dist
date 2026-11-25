/** Every game and bot number for Runeshift in one place. */
export type Length = 'full' | 'medium' | 'short';
export const LENGTHS: Length[] = ['full', 'medium', 'short'];
/** Treasures dealt to each player: Full shares all 24 out evenly. */
export const treasuresEach = (length: Length, players: number) => (length === 'full' ? Math.floor(24 / players) : length === 'medium' ? 5 : 3);
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
/** Public events kept in G.log (logTotal counts them all). */
export const LOG_KEEP = 80;

export const BOT = {
  /** Hard: how many of Medium's best shifts it looks ahead from */
  hardShifts: 8,
  /** Hard: how many of the closest reachable squares it scores per shift */
  hardSquares: 6,
  /** Hard: bonus (in next-turn reaching shifts) for ending on a fixed tile, which can't be pushed away */
  fixedBonus: 0.5,
  /** Medium/Hard: weight of the walk length when breaking distance ties */
  walkTie: 0.01,
};
