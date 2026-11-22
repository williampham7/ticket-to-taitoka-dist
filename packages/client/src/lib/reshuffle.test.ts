import { describe, it, expect } from 'vitest';
import { hasRedeal } from './reshuffle';

describe('hasRedeal', () => {
  it('detects the redeal marker among new entries', () => {
    expect(hasRedeal([{ t: 'drawFaceUp' }, { t: 'redeal' }])).toBe(true);
  });
  it('is false without it', () => {
    expect(hasRedeal([{ t: 'drawFaceUp' }, { t: 'claim' }])).toBe(false);
    expect(hasRedeal([])).toBe(false);
  });
});
