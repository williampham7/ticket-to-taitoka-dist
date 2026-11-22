import type { LogEntry } from '@boboland/shared';

/** True when the new log entries include the engine's marker for "3 face-up locomotives: all five replaced". */
export function hasRedeal(entries: readonly Pick<LogEntry, 't'>[]): boolean {
  return entries.some((e) => e.t === 'redeal');
}

export const RESHUFFLE_MS = 1500;
/** Cards show as backs sweeping away for this long, then the new five deal in. */
export const RESHUFFLE_BACKS_MS = 700;
