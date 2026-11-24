import { describe, expect, it } from 'vitest';
import type { ShipView, ViewReport } from '@boboland/shared/src/fleet';
import { planScenes } from './plan';

const rep = (o: Partial<ViewReport>): ViewReport => ({ seq: 1, by: '0', round: 1, kind: 'shell', cells: [], sunk: [], ...o }) as ViewReport;
const own: ShipView[] = [
  { cls: 'cruiser', sunk: false, squares: [20, 21, 22, 23], hits: [21], shield: false },
  { cls: 'corvette', sunk: false, squares: [80, 81], hits: [], shield: true },
];

describe('which cinematic plays, from what the viewer may know', () => {
  it('the attacker sees the shot go out and a hit, but never which ship it hit', () => {
    const p = planScenes(rep({ cells: [{ sq: 21, r: 'hit' }] }), '0', null);
    expect(p).toMatchObject({ delivery: 'shell', impact: 'hit', hitClass: null, incoming: false, sinks: [] });
  });

  it('the defender sees it come in and knows their own ship', () => {
    const p = planScenes(rep({ cells: [{ sq: 21, r: 'hit' }] }), '1', own);
    expect(p).toMatchObject({ impact: 'hit', hitClass: 'cruiser', incoming: true });
  });

  it('a hit on the Decoy is a generic hit even for its owner', () => {
    expect(planScenes(rep({ cells: [{ sq: 55, r: 'hit' }] }), '1', own).hitClass).toBeNull();
  });

  it('a hit outranks a deflection, a deflection outranks a miss', () => {
    expect(planScenes(rep({ kind: 'salvo', cells: [{ sq: 1, r: 'miss' }, { sq: 2, r: 'hit' }, { sq: 3, r: 'deflect' }] }), '0', null)).toMatchObject({ delivery: 'salvo', impact: 'hit' });
    expect(planScenes(rep({ cells: [{ sq: 1, r: 'miss' }, { sq: 80, r: 'deflect' }] }), '1', own)).toMatchObject({ impact: 'deflect', hitClass: 'corvette' });
    expect(planScenes(rep({ cells: [{ sq: 1, r: 'miss' }] }), '0', null).impact).toBe('splash');
  });

  it('weapons bring their own delivery; a quiet mine drop has no impact', () => {
    expect(planScenes(rep({ kind: 'weapon', weapon: 'thunderhead', cells: [{ sq: 1, r: 'miss' }] }), '0', null).delivery).toBe('thunderhead');
    expect(planScenes(rep({ kind: 'weapon', weapon: 'seaMine' }), '1', own)).toMatchObject({ delivery: 'seaMine', impact: 'none' });
    expect(planScenes(rep({ kind: 'mine', cells: [{ sq: 22, r: 'hit' }] }), '1', own)).toMatchObject({ delivery: 'mineBlast', hitClass: 'cruiser' });
  });

  it('sinkings come from the report as filtered for the viewer', () => {
    expect(planScenes(rep({ cells: [{ sq: 81, r: 'hit' }], sunk: ['corvette'] }), '0', null).sinks).toEqual(['corvette']);
  });

  it('a spectator is never the defender', () => {
    expect(planScenes(rep({ cells: [{ sq: 21, r: 'hit' }] }), null, null)).toMatchObject({ incoming: false, hitClass: null });
  });
});
