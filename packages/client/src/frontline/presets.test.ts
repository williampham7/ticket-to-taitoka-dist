import { describe, expect, it } from 'vitest';
import { validatePlacement, type Placement, type PlayerID } from '@boboland/shared/src/frontline';
import { PRESETS, SPOTTER_PRESETS, fillRest, moveTo, placeAt, presetPlacement, presetsFor, remaining, removeAt } from './presets';

const rnd = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

describe('deployment presets', () => {
  it('there are 2 to 5, each a legal army for both sides', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(2);
    expect(PRESETS.length).toBeLessThanOrEqual(5);
    for (const p of PRESETS) for (const me of ['0', '1'] as PlayerID[]) {
      expect(validatePlacement(me, presetPlacement(me, p)), p.id).toBeUndefined();
    }
  });

  it('the command post is never on the front row', () => {
    for (const p of PRESETS) expect(p.ranks.indexOf('F')).toBeGreaterThanOrEqual(10);
  });
});

describe('placing pieces by hand', () => {
  it('places from the tray, replaces, moves, swaps and removes', () => {
    let pl: Placement = [];
    pl = placeAt(pl, 60, 'F');
    expect(remaining(pl).get('F')).toBe(0);
    expect(placeAt(pl, 61, 'F')).toBe(pl); // none left
    pl = placeAt(pl, 61, 2);
    pl = placeAt(pl, 61, 3); // the scout goes back to the tray
    expect(remaining(pl).get(2)).toBe(8);
    expect(pl).toHaveLength(2);
    pl = moveTo(pl, 61, 62);
    expect(pl.find((p) => p.pos === 62)?.rank).toBe(3);
    pl = moveTo(pl, 62, 60); // swap
    expect(pl.find((p) => p.pos === 60)?.rank).toBe(3);
    expect(pl.find((p) => p.pos === 62)?.rank).toBe('F');
    pl = removeAt(pl, 60);
    expect(remaining(pl).get(3)).toBe(5);
  });

  it('fill the rest completes any partial army into a legal one', () => {
    for (const me of ['0', '1'] as PlayerID[]) {
      const start = presetPlacement(me, PRESETS[0]).slice(0, 13);
      const pl = fillRest(me, start, rnd(7));
      expect(validatePlacement(me, pl)).toBeUndefined();
      expect(pl.slice(0, 13)).toEqual(start);
    }
    expect(validatePlacement('1', fillRest('1', [], rnd(3)))).toBeUndefined();
  });
});

describe('Spotter army presets and tray', () => {
  it('each preset is a legal 30-piece Spotter army for both sides, command post off the front row', () => {
    expect(SPOTTER_PRESETS.length).toBeGreaterThanOrEqual(2);
    for (const p of SPOTTER_PRESETS) {
      expect(p.ranks).toHaveLength(30);
      expect(p.ranks.indexOf('F')).toBeGreaterThanOrEqual(10);
      for (const me of ['0', '1'] as PlayerID[]) expect(validatePlacement(me, presetPlacement(me, p), 'spotter'), p.id).toBeUndefined();
    }
    expect(presetsFor('spotter')).toBe(SPOTTER_PRESETS);
    expect(presetsFor('classic')).toBe(PRESETS);
  });

  it('counts the tray and fills the rest from the Spotter army', () => {
    expect(remaining([], 'spotter').get('P')).toBe(2);
    expect(remaining([], 'spotter').get(2)).toBe(4);
    expect(remaining([], 'classic').has('P')).toBe(false);
    const pl = fillRest('1', placeAt([], 5, 'P', 'spotter'), rnd(4), 'spotter');
    expect(validatePlacement('1', pl, 'spotter')).toBeUndefined();
    expect(placeAt([], 5, 'P')).toEqual([]); // no Spotter in the classic tray
  });
});
