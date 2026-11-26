import { suggestMove, type BView } from '@boboland/shared/src/blocky';
import type { Pending } from './input';

/** "Suggest a move" (Medium's pick from your seat) always ends in a pending ghost, whatever Confirm placements says. */
export function suggestPending(v: BView, me: string): Pending | null {
  const m = suggestMove(v, me);
  return m ? { guild: v.current, place: m, pointerType: 'suggest' } : null;
}
