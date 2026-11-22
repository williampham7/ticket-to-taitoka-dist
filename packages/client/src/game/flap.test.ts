import { describe, expect, it } from 'vitest';
import { DIGIT_DRUM, LETTER_DRUM, flapDigits, flapSteps, nextFlap } from './Roll';

describe('split-flap departure board', () => {
  it('right-aligns a score on blank tiles, minus sign included', () => {
    expect(flapDigits(7)).toEqual([' ', ' ', '7']);
    expect(flapDigits(45)).toEqual([' ', '4', '5']);
    expect(flapDigits(-12)).toEqual(['-', '1', '2']);
    expect(flapDigits(123, 2)).toEqual(['1', '2', '3']);
  });

  it('turns each drum forwards only, one card at a time, and stops on the target', () => {
    expect(nextFlap('3', '5', DIGIT_DRUM)).toBe('4');
    expect(nextFlap('9', '0', DIGIT_DRUM)).toBe(' ');
    expect(nextFlap('5', '5', DIGIT_DRUM)).toBe('5');
    expect(flapSteps(' ', '9', DIGIT_DRUM)).toBe(10);
    expect(flapSteps('Z', 'A', LETTER_DRUM)).toBeLessThan(LETTER_DRUM.length);
  });

  it('never flashes a minus sign while a positive score counts up or down', () => {
    for (const [a, b] of [[' ', '7'], ['9', ' '], ['5', '2']]) {
      let c = a;
      while (c !== b) { c = nextFlap(c, b, DIGIT_DRUM); expect(c).not.toBe('-'); }
    }
    // a minus sign is not on the drum: it shows at once
    expect(nextFlap('3', '-', DIGIT_DRUM)).toBe('-');
  });
});
