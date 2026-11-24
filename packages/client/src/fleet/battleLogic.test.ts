import { describe, expect, it } from 'vitest';
import { sq, type SeenCell, type ViewReport } from '@boboland/shared/src/fleet';
import { accuracy, actionFor, aimSquares, displayGrid, toggleMark } from './battleLogic';

const blank = (): SeenCell[] => Array(100).fill(null);

describe('aiming', () => {
  it('a shell aims at one open square', () => {
    expect(aimSquares('shell', 44, 'h', blank())).toEqual([44]);
  });

  it('an area weapon aims at its clipped pattern; a torpedo at its whole column from row 10 up', () => {
    expect(aimSquares('frag', sq(0, 0), 'h', blank())).toEqual([0, 11]);
    expect(aimSquares('airStrike', sq(5, 5), 'v', blank())).toEqual([sq(5, 3), sq(5, 5), sq(5, 7)]);
    expect(aimSquares('torpedo', sq(3, 2), 'h', blank())).toEqual([93, 83, 73, 63, 53, 43, 33, 23, 13, 3]);
  });

  it('turns an aim into the action to send', () => {
    expect(actionFor('shell', 7, 'h')).toEqual({ type: 'shell', sq: 7 });
    expect(actionFor('seaMine', 7, 'h')).toEqual({ type: 'mine', sq: 7 });
    expect(actionFor('airStrike', 7, 'v')).toEqual({ type: 'weapon', id: 'airStrike', sq: 7, dir: 'v' });
    expect(actionFor('frag', 7, 'v')).toEqual({ type: 'weapon', id: 'frag', sq: 7 });
  });
});

describe('salvo marking', () => {
  it('toggles open squares up to the salvo size', () => {
    const seen = blank();
    seen[3] = 'miss';
    let m = toggleMark([], 1, 2, seen);
    m = toggleMark(m, 2, 2, seen);
    expect(m).toEqual([1, 2]);
    expect(toggleMark(m, 5, 2, seen)).toEqual([1, 2]); // full
    expect(toggleMark(m, 1, 2, seen)).toEqual([2]);
    expect(toggleMark([], 3, 2, seen)).toEqual([]); // already shot
  });
});

describe('accuracy', () => {
  it('is hits over shots, rounded, and 0 with no shots', () => {
    expect(accuracy(0, 0)).toBe(0);
    expect(accuracy(1, 3)).toBe(33);
    expect(accuracy(17, 40)).toBe(43);
  });
});

describe('revealing results one square at a time', () => {
  const rep = (seq: number, cells: [number, 'hit' | 'miss'][], sunk: string[] = [], extra: Partial<ViewReport> = {}): ViewReport =>
    ({ seq, by: '0', round: 1, kind: 'salvo', cells: cells.map(([s, r]) => ({ sq: s, r })), sunk, ...extra }) as ViewReport;

  it('hides the squares not revealed yet, and later reports entirely', () => {
    const cells = blank();
    cells[1] = 'miss'; cells[2] = 'hit'; cells[9] = 'miss';
    const out = displayGrid(cells, [rep(5, [[1, 'miss'], [2, 'hit']]), rep(6, [[9, 'miss']])], 1, () => []);
    expect([out[1], out[2], out[9]]).toEqual(['miss', null, null]);
  });

  it('shows a sinking as hits until its report has finished', () => {
    const cells = blank();
    cells[80] = 'sunk'; cells[81] = 'sunk';
    const r = rep(3, [[81, 'hit']], ['corvette']);
    const sq = () => [80, 81];
    expect(displayGrid(cells, [r], 0, sq).slice(80, 82)).toEqual(['hit', null]);
    expect(displayGrid(cells, [r], 1, sq).slice(80, 82)).toEqual(['sunk', 'sunk']);
  });

  it('a Supernova sinking hides the other squares until it lands', () => {
    const cells = blank();
    [0, 1, 2].forEach((s) => { cells[s] = 'sunk'; });
    const r = rep(4, [[1, 'hit']], ['frigate'], { kind: 'weapon', weapon: 'supernova' });
    expect(displayGrid(cells, [r], 0, () => [0, 1, 2]).slice(0, 3)).toEqual([null, null, null]);
  });
});
