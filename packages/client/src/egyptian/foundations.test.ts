import { describe, expect, it, vi } from 'vitest';
import { TIMING } from '@boboland/shared/src/egyptian';
import { actionFor, conflicts, DEFAULT_KEYS, keyLabel, loadKeys, rebind, saveKeys } from './keys';
import { challengeShowMs, dealShowMs, FX, slapShowMs } from './fx';
import { seatAngle, seatOrder } from './seating';

const press = (code: string, extra: Partial<{ repeat: boolean; target: EventTarget | null }> = {}) => ({ code, repeat: false, target: null, ...extra });

describe('key bindings', () => {
  it('maps the defaults per mode', () => {
    expect(actionFor(DEFAULT_KEYS, 'local', press('KeyQ'))).toBe('p1Flip');
    expect(actionFor(DEFAULT_KEYS, 'local', press('BracketLeft'))).toBe('p2Slap');
    expect(actionFor(DEFAULT_KEYS, 'online', press('Space'))).toBe('slap');
    expect(actionFor(DEFAULT_KEYS, 'online', press('KeyQ'))).toBeNull();
  });
  it('ignores repeat', () => {
    expect(actionFor(DEFAULT_KEYS, 'local', press('KeyW', { repeat: true }))).toBeNull();
  });
  it('ignores editable targets', () => {
    const input = { tagName: 'INPUT' } as unknown as EventTarget;
    const div = { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget;
    expect(actionFor(DEFAULT_KEYS, 'online', press('Space', { target: input }))).toBeNull();
    expect(actionFor(DEFAULT_KEYS, 'online', press('Space', { target: div }))).toBeNull();
    expect(actionFor(DEFAULT_KEYS, 'online', press('Space', { target: { tagName: 'BUTTON' } as unknown as EventTarget }))).toBe('slap');
  });
  it('flags conflicts within a mode only', () => {
    expect(conflicts(DEFAULT_KEYS).size).toBe(0);
    expect([...conflicts(rebind(DEFAULT_KEYS, 'p1Slap', 'KeyQ'))].sort()).toEqual(['p1Flip', 'p1Slap']);
    expect(conflicts(rebind(DEFAULT_KEYS, 'flip', 'KeyQ')).size).toBe(0);
  });
  it('labels keys', () => {
    expect(['KeyQ', 'BracketRight', 'Space', 'Digit7', 'Numpad3'].map(keyLabel)).toEqual(['Q', ']', 'Space', '7', 'Num 3']);
  });
  it('persists, and falls back to defaults on bad storage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
    saveKeys(rebind(DEFAULT_KEYS, 'slap', 'KeyJ'));
    expect(loadKeys().slap).toBe('KeyJ');
    store.set('egw.keys', '{bad');
    expect(loadKeys()).toEqual(DEFAULT_KEYS);
    store.set('egw.keys', JSON.stringify({ flip: 5, slap: 'KeyK' }));
    expect(loadKeys()).toEqual({ ...DEFAULT_KEYS, slap: 'KeyK' });
    vi.unstubAllGlobals();
  });
});

describe('fx timings fit the server pauses', () => {
  it('full animations fit; off is instant', () => {
    expect(slapShowMs('full')).toBeLessThanOrEqual(TIMING.slapPauseMs);
    expect(challengeShowMs('full')).toBeLessThanOrEqual(TIMING.challengePauseMs);
    expect(dealShowMs('full')).toBeLessThanOrEqual(TIMING.dealMs);
    expect(FX.full.flipMs).toBeLessThanOrEqual(TIMING.minFlipGapMs + 100);
    expect(Object.values(FX.off).every((v) => v === 0)).toBe(true);
  });
});

describe('seating', () => {
  it('puts me at the bottom and the next player to my left', () => {
    expect(seatOrder(['2', '0', '1'], '0')).toEqual(['0', '1', '2']);
    expect(seatOrder(['2', '0', '1'], null)).toEqual(['2', '0', '1']);
    expect(seatAngle(0, 4)).toBe(90);
    expect(seatAngle(1, 4)).toBe(180);
    expect(seatAngle(2, 4)).toBe(270);
  });
});
