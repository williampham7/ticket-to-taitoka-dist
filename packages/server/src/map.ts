import type { MapId } from '@boboland/shared';

const MAPS_KNOWN: readonly string[] = ['usa', 'china', 'europe', 'sg'];

/**
 * The map of a match created without `setupData.map`: `--map=usa` on the command line, else the TTB_MAP
 * environment variable, else the USA map. Matches that name their map in setupData ignore this.
 */
export function defaultMap(argv: string[], env: Record<string, string | undefined>): MapId {
  const arg = argv.find((a) => a.startsWith('--map='))?.slice('--map='.length);
  const pick = arg || env.TTB_MAP;
  return (pick && MAPS_KNOWN.includes(pick) ? pick : 'usa') as MapId;
}
