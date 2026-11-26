import { describe, expect, it } from 'vitest';
import { ALL_ORIENTS } from '@boboland/shared/src/blocky';
import { inset, loops, outline } from './shape';

describe('piece outline', () => {
  it('one loop per piece, 4 corners per square, X has 12', () => {
    for (const o of ALL_ORIENTS) expect(loops(o.shape.cells)).toHaveLength(1);
    expect(loops([[0, 0]])[0]).toEqual([[0, 0], [1, 0], [1, 1], [0, 1]]);
    expect(loops([[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]])[0]).toHaveLength(12);
  });
  it('inset moves a square inward', () => {
    expect(inset([[0, 0], [1, 0], [1, 1], [0, 1]], 0.1)).toEqual([[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]);
  });
  it('outline is a closed path', () => { expect(outline([[0, 0], [0, 1]])).toMatch(/^M.*Z$/); });
});
