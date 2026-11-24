import { describe, expect, it, vi } from 'vitest';
import { loadLocal, saveLocal, toggleRule } from './localSetup';

describe('local setup', () => {
  it('toggles rules in catalogue order and never empties the set', () => {
    expect(toggleRule(['sandwich'], 'double')).toEqual(['double', 'sandwich']);
    expect(toggleRule(['double', 'sandwich'], 'double')).toEqual(['sandwich']);
    expect(toggleRule(['slapjack'], 'slapjack')).toEqual(['slapjack']);
  });
  it('loads saved names and rules, with fallbacks', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    expect(loadLocal()).toEqual({ names: ['Player 1', 'Player 2'], rules: ['double', 'sandwich'] });
    saveLocal({ names: ['Ana', 'Bo'], rules: ['tens'] });
    expect(loadLocal()).toEqual({ names: ['Ana', 'Bo'], rules: ['tens'] });
    store.set('egw.local', JSON.stringify({ names: ['', 5], rules: ['nope'] }));
    expect(loadLocal()).toEqual({ names: ['Player 1', 'Player 2'], rules: ['double', 'sandwich'] });
    vi.unstubAllGlobals();
  });
});
