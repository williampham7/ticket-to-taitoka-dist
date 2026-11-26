import { describe, expect, it } from 'vitest';
import { ALL_ORIENTS, orientations, type Place } from '../src/blocky/pieces';
import { applyPlace, anchors, canPlace, fits, hasMove, legalMoves, newGame, rawAnchors, type Reason } from '../src/blocky/rules';
import { brute, idx, keysOf, randomGame, seeded } from './blockySim';

const I1 = (at: number): Place => ({ piece: 'I1', orient: 0, at });
const I2h = (at: number): Place => ({ piece: 'I2', orient: 0, at });

describe('Blocky placement', () => {
  it('first move must cover start square (Classic corners clockwise, Duo 4,4 and 9,9)', () => {
    const s = newGame(4, seeded(1), { board: 'classic' });
    expect(s.size).toBe(20);
    expect(canPlace(s, 'tide', I1(idx('classic', 0, 0)))).toBeNull();
    expect(canPlace(s, 'sun', I1(idx('classic', 0, 19)))).toBeNull();
    expect(canPlace(s, 'ember', I1(idx('classic', 19, 19)))).toBeNull();
    expect(canPlace(s, 'grove', I1(idx('classic', 19, 0)))).toBeNull();
    expect(canPlace(s, 'sun', I1(0))).toBe('notStart');
    expect(canPlace(s, 'tide', I1(idx('classic', 5, 5)))).toBe('notStart');
    // a bigger piece may cover the start from any of its cells
    const o = orientations('I5')[1]; // vertical
    expect(o.h).toBe(5);
    expect(canPlace(s, 'grove', { piece: 'I5', orient: 1, at: idx('classic', 15, 0) })).toBeNull();
    expect(canPlace(s, 'grove', { piece: 'I5', orient: 1, at: idx('classic', 14, 0) })).toBe('notStart');
    const d = newGame(2, seeded(2), { board: 'duo' });
    expect(d.size).toBe(14);
    expect(canPlace(d, 'tide', I1(idx('duo', 4, 4)))).toBeNull();
    expect(canPlace(d, 'ember', I1(idx('duo', 9, 9)))).toBeNull();
    expect(canPlace(d, 'tide', I1(idx('duo', 9, 9)))).toBe('notStart');
    expect(legalMoves(d, 'tide').every((p) => {
      const sh = orientations(p.piece)[p.orient];
      const r0 = Math.floor(p.at / 14), c0 = p.at % 14;
      return sh.cells.some(([r, c]) => r0 + r === 4 && c0 + c === 4);
    })).toBe(true);
    expect(rawAnchors(d, 'ember')).toEqual([idx('duo', 9, 9)]);
  });

  it('reason codes: one case per code', () => {
    const s = newGame(2, seeded(3), { board: 'duo' });
    const at = (r: number, c: number) => idx('duo', r, c);
    const reasons: Record<string, Reason | null> = {};
    reasons.offBoard = canPlace(s, 'tide', { piece: 'I5', orient: 0, at: at(4, 10) });
    reasons.offBoardNeg = canPlace(s, 'tide', I1(-1));
    reasons.notStart = canPlace(s, 'tide', I1(at(0, 0)));
    reasons.notYours = canPlace(s, 'sun', I1(at(4, 4)));
    applyPlace(s, 'tide', I1(at(4, 4)));
    reasons.used = canPlace(s, 'tide', I1(at(5, 5)));
    reasons.overlap = canPlace(s, 'tide', I2h(at(4, 3)));
    expect(reasons).toMatchObject({ offBoard: 'offBoard', offBoardNeg: 'offBoard', notStart: 'notStart', notYours: 'notYours', used: 'used', overlap: 'overlap' });
    expect(canPlace(s, 'tide', I2h(at(4, 5)))).toBe('ownEdge'); // shares an edge with (4,4)
    expect(canPlace(s, 'tide', I2h(at(8, 8)))).toBe('noCorner');
    expect(canPlace(s, 'tide', I2h(at(5, 5)))).toBeNull();
    s.grounded.push('tide');
    expect(canPlace(s, 'tide', I2h(at(5, 5)))).toBe('grounded');
  });

  it('edge contact with other guilds is legal', () => {
    const s = newGame(2, seeded(4), { board: 'duo' });
    const at = (r: number, c: number) => idx('duo', r, c);
    applyPlace(s, 'tide', I1(at(4, 4)));
    applyPlace(s, 'ember', I1(at(3, 2))); // lies edge to edge with where tide wants to go
    const up: Place = { piece: 'I2', orient: 1, at: at(2, 3) }; // (2,3),(3,3): diagonal to (4,4), edge to ember's (3,2)
    expect(canPlace(s, 'tide', up)).toBeNull();
    expect(legalMoves(s, 'tide').some((p) => p.piece === 'I2' && p.orient === 1 && p.at === at(2, 3))).toBe(true);
  });

  it('fits and anchors agree with legalMoves', () => {
    for (let seed = 0; seed < 12; seed++) {
      const s = randomGame(3 + (seed % 2), seed, { board: 'classic' }, 24);
      for (const g of s.guilds) {
        const all = legalMoves(s, g);
        const viaFits = s.shelf[g].flatMap((p) => fits(s, g, p));
        expect(keysOf(viaFits)).toEqual(keysOf(all));
        expect(hasMove(s, g)).toBe(all.length > 0);
        const covered = new Set<number>();
        for (const p of all) {
          const sh = orientations(p.piece)[p.orient];
          const r0 = Math.floor(p.at / s.size), c0 = p.at % s.size;
          for (const [r, c] of sh.cells) covered.add((r0 + r) * s.size + c0 + c);
        }
        const raw = rawAnchors(s, g);
        expect(anchors(s, g)).toEqual(raw.filter((a) => covered.has(a)));
      }
    }
  });

  it('legalMoves has no duplicates and equals brute force on 200 random positions', () => {
    for (let seed = 0; seed < 200; seed++) {
      const n = 2 + (seed % 3);
      const s = randomGame(n, seed + 100, n === 2 && seed % 4 < 2 ? { board: 'duo' } : { board: 'classic' }, 4 + (seed % 36));
      const g = s.guilds[seed % s.guilds.length];
      const fast = keysOf(legalMoves(s, g));
      expect(new Set(fast).size).toBe(fast.length);
      expect(fast).toEqual(keysOf(brute(s, g)));
    }
  }, 120_000);

  it('a grounded or finished guild has no moves', () => {
    const s = newGame(2, seeded(5), { board: 'duo' });
    s.grounded.push('tide');
    expect(legalMoves(s, 'tide')).toEqual([]);
    expect(hasMove(s, 'tide')).toBe(false);
    s.shelf.ember = [];
    expect(legalMoves(s, 'ember')).toEqual([]);
    expect(ALL_ORIENTS.length).toBe(91);
  });
});
