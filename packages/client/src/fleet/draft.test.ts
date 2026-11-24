import { describe, expect, it } from 'vitest';
import { BASE_FLEET, sq, validateDeployment } from '@boboland/shared/src/fleet';
import { EMPTY_DRAFT, anchorForDrop, complete, fits, place, placeDecoy, randomDraft, remove, rotate, squaresOf, toDeployment } from './draft';

const rnd = (seed: number) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

describe('Fleet placement draft', () => {
  it('places ships that fit and refuses overlaps and the Decoy square', () => {
    let d = place(EMPTY_DRAFT, { cls: 'dreadnought', at: sq(0, 0), dir: 'h' })!;
    expect(squaresOf(d)).toEqual([0, 1, 2, 3, 4]);
    expect(place(d, { cls: 'corvette', at: sq(4, 0), dir: 'v' })).toBeNull();
    d = placeDecoy(d, sq(9, 9))!;
    expect(place(d, { cls: 'corvette', at: sq(8, 9), dir: 'h' })).toBeNull();
    expect(placeDecoy(d, 2)).toBeNull();
    expect(fits(d, { cls: 'corvette', at: sq(5, 0), dir: 'h' })).toBe(true);
  });

  it('moving a ship ignores its own old squares', () => {
    const d = place(EMPTY_DRAFT, { cls: 'dreadnought', at: sq(0, 0), dir: 'h' })!;
    expect(place(d, { cls: 'dreadnought', at: sq(1, 0), dir: 'h' })).not.toBeNull();
  });

  it('rotates in place, nudging back from the edge when it would stick out', () => {
    let d = place(EMPTY_DRAFT, { cls: 'cruiser', at: sq(2, 3), dir: 'h' })!;
    d = rotate(d, 'cruiser')!;
    expect(d.ships.cruiser).toEqual({ cls: 'cruiser', at: sq(2, 3), dir: 'v' });
    const edge = place(EMPTY_DRAFT, { cls: 'cruiser', at: sq(0, 8), dir: 'h' })!;
    expect(rotate(edge, 'cruiser')!.ships.cruiser).toEqual({ cls: 'cruiser', at: sq(0, 6), dir: 'v' });
  });

  it('cannot rotate when every nudge is blocked', () => {
    let d = place(EMPTY_DRAFT, { cls: 'corvette', at: sq(0, 0), dir: 'h' })!;
    d = place(d, { cls: 'frigate', at: sq(0, 1), dir: 'h' })!;
    expect(rotate(d, 'corvette')).toBeNull();
  });

  it('turns a drop square and the grabbed segment into a top-left square, kept on the board', () => {
    expect(anchorForDrop('frigate', 'h', sq(5, 5), 1)).toBe(sq(4, 5));
    expect(anchorForDrop('frigate', 'h', sq(9, 5), 0)).toBe(sq(7, 5));
    expect(anchorForDrop('frigate', 'v', sq(2, 0), 2)).toBe(sq(2, 0));
  });

  it('removes a ship back to the tray', () => {
    const d = place(EMPTY_DRAFT, { cls: 'corvette', at: 0, dir: 'h' })!;
    expect(remove(d, 'corvette').ships.corvette).toBeUndefined();
  });

  it('is complete with every class placed and the Decoy when it is needed; becomes a valid deployment', () => {
    const d = randomDraft([...BASE_FLEET, 'cutter'], true, rnd(5));
    expect(complete(d, [...BASE_FLEET, 'cutter'], true)).toBe(true);
    expect(complete(d, [...BASE_FLEET, 'cutter'], false)).toBe(true);
    expect(complete({ ...d, decoy: null }, BASE_FLEET, true)).toBe(false);
    const dep = toDeployment(d, ['decoy', 'reinforcement', 'shield']);
    expect(validateDeployment('super', dep)).toBeUndefined();
    const classic = toDeployment(randomDraft(BASE_FLEET, false, rnd(9)), []);
    expect(classic.decoy).toBeUndefined();
    expect(validateDeployment('classic', classic)).toBeUndefined();
  });
});
