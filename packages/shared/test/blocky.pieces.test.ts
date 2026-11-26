import { describe, expect, it } from 'vitest';
import { ALL_ORIENTS, PIECES, PIECE_IDS, PIECE_NAME, orientations, squaresOf } from '../src/blocky/pieces';

const key = (cells: [number, number][]) => cells.map(([r, c]) => `${r},${c}`).sort().join('|');

describe('Blocky pieces', () => {
  it('21 pieces, 89 squares', () => {
    expect(PIECE_IDS).toHaveLength(21);
    expect(PIECE_IDS.reduce((n, id) => n + squaresOf(id), 0)).toBe(89);
    const by = (n: number) => PIECE_IDS.filter((id) => squaresOf(id) === n).length;
    expect([by(1), by(2), by(3), by(4), by(5)]).toEqual([1, 1, 2, 5, 12]);
  });

  it('91 fixed orientations', () => {
    expect(ALL_ORIENTS).toHaveLength(91);
    expect(PIECE_IDS.reduce((n, id) => n + orientations(id).length, 0)).toBe(91);
  });

  it('orientations are distinct and normalised', () => {
    for (const id of PIECE_IDS) {
      const keys = new Set<string>();
      for (const o of orientations(id)) {
        keys.add(key(o.cells));
        expect(Math.min(...o.cells.map((c) => c[0]))).toBe(0);
        expect(Math.min(...o.cells.map((c) => c[1]))).toBe(0);
        expect(o.h).toBe(Math.max(...o.cells.map((c) => c[0])) + 1);
        expect(o.w).toBe(Math.max(...o.cells.map((c) => c[1])) + 1);
        expect(o.cells).toHaveLength(squaresOf(id));
      }
      expect(keys.size).toBe(orientations(id).length);
    }
  });

  it('no two pieces are the same shape', () => {
    const seen = new Map<string, string>();
    for (const o of ALL_ORIENTS) {
      const k = key(o.shape.cells);
      expect(seen.get(k) ?? o.piece).toBe(o.piece);
      seen.set(k, o.piece);
    }
  });

  it('X has 1, I5 has 2, F has 8', () => {
    expect(orientations('X')).toHaveLength(1);
    expect(orientations('I5')).toHaveLength(2);
    expect(orientations('F')).toHaveLength(8);
    expect(orientations('O4')).toHaveLength(1);
    expect(orientations('I1')).toHaveLength(1);
  });

  it('PIECES is the first orientation; every piece has a themed name', () => {
    for (const id of PIECE_IDS) expect(PIECES[id]).toEqual(orientations(id)[0]);
    expect(PIECE_NAME.X).toBe('Crossroads');
    expect(PIECE_NAME.I5).toBe('Causeway');
    expect(PIECE_NAME.U).toBe('Harbour');
    expect(PIECE_NAME.T5).toBe('Watchtower');
    expect(PIECE_NAME.O4).toBe('Plaza');
    expect(PIECE_NAME.I1).toBe('Keystone');
    expect(new Set(Object.values(PIECE_NAME)).size).toBe(21);
  });
});
