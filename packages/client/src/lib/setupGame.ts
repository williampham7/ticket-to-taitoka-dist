import type { Game } from 'boardgame.io';
import type { MapId, SetupData } from '@boboland/shared';

/**
 * The game, set up on `map`. boardgame.io's local Client has no setupData option (it always passes
 * undefined), so pass-and-play wraps `setup` instead; setupData given anyway still wins.
 */
export function gameOnMap<G extends Game>(game: G, map: MapId): G {
  const setup = game.setup!;
  return { ...game, setup: (api: Parameters<typeof setup>[0], data?: SetupData) => setup(api, data ?? { map }) };
}
