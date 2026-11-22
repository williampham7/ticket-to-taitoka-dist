import { describe, expect, it } from 'vitest';
import { CITIES, CITY_BY_ID } from '../src';
import { SKINS, cityNameIn, gameTitle, skinFor } from '../src/skins';

describe('skins', () => {
  it('Taitoka is the default', () => {
    expect(skinFor(undefined)).toBe(SKINS.taitoka);
    expect(skinFor('')).toBe(SKINS.taitoka);
    expect(skinFor('nonsense')).toBe(SKINS.taitoka);
    expect(Object.keys(SKINS)).toEqual(['taitoka', 'beijing', 'europa']);
  });

  it('Taitoka renames the game and the hub city', () => {
    const t = skinFor('taitoka');
    expect(gameTitle(t)).toBe('Ticket to Taitoka');
    expect(cityNameIn(t, CITY_BY_ID.BOB)).toBe('Taitoka');
    expect(cityNameIn(SKINS.europa, { name: 'whatever', hub: true })).toBe('Europa');
    expect(gameTitle(SKINS.beijing)).toBe('Ticket to Beijing');
  });

  it('only the hub city is renamed', () => {
    for (const c of CITIES) {
      if (!c.hub) expect(cityNameIn(SKINS.taitoka, c)).toBe(c.name);
      else expect(cityNameIn(SKINS.taitoka, c)).toBe('Taitoka');
    }
  });
});
