import { useSyncExternalStore } from 'react';
import { load, save } from '../lib/storage';
import type { ConfirmPref } from './input';
import type { FxLevel } from './fx';

/** Personal settings (this browser): animation speed, open-corner diamonds, confirm placements, clean view. */
export interface BlySettings { fx: FxLevel; corners: boolean; confirm: ConfirmPref; clean: boolean }
const KEYS: Record<keyof BlySettings, string> = { fx: 'bly.fx', corners: 'bly.corners', confirm: 'bly.confirm', clean: 'bly.clean' };
const DEFAULTS: BlySettings = { fx: 'full', corners: true, confirm: 'auto', clean: false };
const read = (): BlySettings => ({
  fx: load<FxLevel>(KEYS.fx, DEFAULTS.fx), corners: load<boolean>(KEYS.corners, DEFAULTS.corners),
  confirm: load<ConfirmPref>(KEYS.confirm, DEFAULTS.confirm), clean: load<boolean>(KEYS.clean, DEFAULTS.clean),
});
let state = read();
const subs = new Set<() => void>();
export function setSetting<K extends keyof BlySettings>(k: K, v: BlySettings[K]) {
  save(KEYS[k], v);
  state = { ...state, [k]: v };
  subs.forEach((f) => f());
}
export const getSettings = () => state;
export const useSettings = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
