import { describe, expect, it } from 'vitest';
import { curtainUp, nextShown } from './handoff';

describe('blocky pass and play', () => {
  it('curtain only between different humans', () => {
    const humans = ['0', '1'];
    // the same human acts twice in a row (the shared guild): the screen stays, no curtain
    let shown = '0', opened = '0';
    shown = nextShown(shown, '0', humans, []);
    expect(curtainUp(true, false, opened, shown)).toBe(false);
    // a computer seat acts: the last human's screen stays up, no curtain
    shown = nextShown(shown, '2', humans, []);
    expect(shown).toBe('0');
    expect(curtainUp(true, false, opened, shown)).toBe(false);
    // a different human acts: the screen passes and the curtain falls until they open it
    shown = nextShown(shown, '1', humans, []);
    expect(shown).toBe('1');
    expect(curtainUp(true, false, opened, shown)).toBe(true);
    opened = '1';
    expect(curtainUp(true, false, opened, shown)).toBe(false);
    // a single human (vs computer) never gets one; nor does the end
    expect(curtainUp(false, false, '', '0')).toBe(false);
    expect(curtainUp(true, true, '0', '1')).toBe(false);
    // a seat that left is never handed the screen
    expect(nextShown('0', '1', humans, ['1'])).toBe('0');
  });
});
