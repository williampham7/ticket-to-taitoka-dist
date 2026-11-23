/**
 * Skins: the same game under different names. A skin only changes the game's name (which is also
 * the hub city's name). Rules, map, styling, animations and sounds are shared, so every change to the
 * game applies to all skins.
 *
 * The skin comes from the edition the player picks at runtime (see editions.ts).
 */
export interface Skin {
  id: string;
  /** Game is "Ticket to <name>", and the hub city is called <name>. */
  name: string;
  /** The hub's Chinese name (China map). */
  zh?: string;
  /** The hub's own name when it differs from the game's name (Singapore: Marina Bay). */
  hubName?: string;
  /** Hearts next to the special cities on the map. */
  hearts?: boolean;
}

export const SKINS = {
  taitoka: { id: 'taitoka', name: 'Taitoka' },
  beijing: { id: 'beijing', name: 'Beijing', zh: '北京' },
  europa: { id: 'europa', name: 'Europa' },
  singapore: { id: 'singapore', name: 'Singapore', hubName: 'Marina Bay', hearts: false },
} as const satisfies Record<string, Skin>;

export function skinFor(id: string | null | undefined): Skin {
  return (id && (SKINS as Record<string, Skin>)[id]) || SKINS.taitoka;
}

export const gameTitle = (skin: Skin) => `Ticket to ${skin.name}`;

/** A city's name in this skin: the hub takes the skin's name, every other city keeps its own. */
export const cityNameIn = (skin: Skin, city: { name: string; hub?: boolean }) => (city.hub ? skin.hubName ?? skin.name : city.name);
