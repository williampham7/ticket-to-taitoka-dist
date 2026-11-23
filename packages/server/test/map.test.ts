import { describe, expect, it } from 'vitest';
import { defaultMap } from '../src/map';

describe('the default map of a match made without setupData', () => {
  it('prefers --map=, then TTB_MAP, else the USA map', () => {
    expect(defaultMap(['node', 'index.ts', '--map=europe'], {})).toBe('europe');
    expect(defaultMap(['node', 'index.ts', '--map=china'], { TTB_MAP: 'europe' })).toBe('china');
    expect(defaultMap([], { TTB_MAP: 'china' })).toBe('china');
    expect(defaultMap([], { TTB_MAP: 'sg' })).toBe('sg');
    expect(defaultMap([], {})).toBe('usa');
  });

  it('falls back to the USA map for an unknown name', () => {
    expect(defaultMap(['--map=mars'], {})).toBe('usa');
    expect(defaultMap([], { TTB_MAP: '' })).toBe('usa');
    expect(defaultMap(['--map=west'], {})).toBe('usa');
    expect(defaultMap(['--map=sf'], {})).toBe('usa');
  });
});
