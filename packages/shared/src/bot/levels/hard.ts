import { HARD_TUNE, makePolicy } from '../brain';

/** Medium without slips, plus an opponent model (blocking), a 1-ply look-ahead, colour reading, end-game timing and tuned prices. */
export const hard = makePolicy({ epsilon: 0, hard: true, tune: HARD_TUNE });
