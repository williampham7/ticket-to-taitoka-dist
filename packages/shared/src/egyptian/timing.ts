/**
 * Every Egyptian War timing the server enforces (ms). Rule timings never change; the pauses (deal, slap reveal,
 * challenge ribbon) are as long as the Full animations, and `quick` (e2e) shortens them.
 */
export interface Timing {
  /** a flip is refused until this long after the previous flip by anyone */
  minFlipGapMs: number;
  /** a slap also counts if the pattern was on the pile just before a flip this recent */
  latencyMs: number;
  /** after the card that decides a challenge, before the winner collects (slaps still count) */
  graceMs: number;
  /** after a false slap, that player's slaps are ignored */
  lockoutMs: number;
  /** the server flips for a player who has not flipped for this long */
  idleFlipMs: number;
  /** the deal starts this long after the first seat is ready, even if others are not */
  readyWaitMs: number;
  dealMs: number;
  slapPauseMs: number;
  challengePauseMs: number;
}

export const TIMING: Timing = {
  minFlipGapMs: 400, latencyMs: 200, graceMs: 1000, lockoutMs: 1000, idleFlipMs: 15000, readyWaitMs: 8000,
  dealMs: 2600, slapPauseMs: 2400, challengePauseMs: 1800,
};

export const QUICK_TIMING: Timing = { ...TIMING, dealMs: 200, slapPauseMs: 300, challengePauseMs: 300 };
