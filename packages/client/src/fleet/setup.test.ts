import { describe, expect, it } from 'vitest';
import { hostPath, playPath, readPlay, setupFromSearch } from './setup';

describe('Fleet match settings in the address', () => {
  it('reads mode and match length', () => {
    expect(setupFromSearch('?mode=super&bestOf=3')).toEqual({ mode: 'super', bestOf: 3 });
    expect(setupFromSearch('?mode=salvo')).toEqual({ mode: 'salvo' });
    expect(setupFromSearch('')).toEqual({});
  });

  it('drops anything invalid', () => {
    expect(setupFromSearch('?mode=laser&bestOf=3')).toEqual({});
    expect(setupFromSearch('?bestOf=4')).toEqual({});
  });

  it('round-trips through the host path', () => {
    const path = hostPath({ mode: 'salvo', bestOf: 5 });
    expect(path).toBe('/fleet/host?mode=salvo&bestOf=5');
    expect(setupFromSearch(path.slice(path.indexOf('?')))).toEqual({ mode: 'salvo', bestOf: 5 });
  });
});

describe('Fleet menu choice to address and back', () => {
  it('sends each play type to its screen with the settings', () => {
    const base = { mode: 'super', bestOf: 3, level: 'hard', allUnlocked: true } as const;
    expect(playPath({ ...base, play: 'local' })).toBe('/fleet/local?mode=super&bestOf=3&all=1');
    expect(playPath({ ...base, play: 'bot' })).toBe('/fleet/bot?mode=super&bestOf=3&level=hard&all=1');
    expect(playPath({ ...base, play: 'online' })).toBe('/fleet/host?mode=super&bestOf=3&all=1');
    expect(playPath({ ...base, mode: 'classic', allUnlocked: false, play: 'bot' })).toBe('/fleet/bot?mode=classic&bestOf=3&level=hard');
  });

  it('reads the settings a play screen needs, with safe defaults', () => {
    expect(readPlay('?mode=super&bestOf=3&level=hard&all=1')).toEqual({ setup: { mode: 'super', bestOf: 3 }, level: 'hard', allUnlocked: true });
    expect(readPlay('?level=boss')).toEqual({ setup: { mode: 'classic', bestOf: 1 }, level: 'medium', allUnlocked: false });
  });
});
