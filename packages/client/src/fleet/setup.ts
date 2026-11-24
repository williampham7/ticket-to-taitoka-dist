import { validateFleetSetupData, type BotLevel, type FleetSetupData } from '@boboland/shared/src/fleet';

/** The match settings the menu passes in the address: `/fleet/host?mode=super&bestOf=3`. Invalid settings are dropped. */
export function setupFromSearch(search: string): FleetSetupData {
  const q = new URLSearchParams(search);
  const d: FleetSetupData = {};
  const mode = q.get('mode');
  const bestOf = Number(q.get('bestOf'));
  if (mode) d.mode = mode as FleetSetupData['mode'];
  if (bestOf) d.bestOf = bestOf as FleetSetupData['bestOf'];
  return validateFleetSetupData(d) === undefined ? d : {};
}

/** Where the menu sends a host: the host screen with the chosen settings. */
export const hostPath = (d: Required<FleetSetupData>): string => `/fleet/host?mode=${d.mode}&bestOf=${d.bestOf}`;

export type PlayType = 'local' | 'bot' | 'online';
const LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];

/** Everything the menu decides. */
export interface MenuChoice extends Required<FleetSetupData> { play: PlayType; level: BotLevel; allUnlocked: boolean }

/** The screen a menu choice opens, with its settings in the address. */
export function playPath(c: MenuChoice): string {
  const screen = c.play === 'online' ? 'host' : c.play;
  const q = [`mode=${c.mode}`, `bestOf=${c.bestOf}`];
  if (c.play === 'bot') q.push(`level=${c.level}`);
  if (c.mode === 'super' && c.allUnlocked) q.push('all=1');
  return `/fleet/${screen}?${q.join('&')}`;
}

/** What a play screen reads back from its address; anything missing or invalid falls back to the defaults. */
export function readPlay(search: string): { setup: Required<FleetSetupData>; level: BotLevel; allUnlocked: boolean } {
  const q = new URLSearchParams(search);
  const s = setupFromSearch(search);
  const level = q.get('level') as BotLevel;
  return {
    setup: { mode: s.mode ?? 'classic', bestOf: s.bestOf ?? 1 },
    level: LEVELS.includes(level) ? level : 'medium',
    allUnlocked: q.get('all') === '1',
  };
}
