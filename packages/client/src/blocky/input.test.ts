import { describe, expect, it } from 'vitest';
import { act, anchors, canPlace, cellsOf, fits, legalMoves, newGame, type BView } from '@boboland/shared/src/blocky';
import { cellAt, fitCycle, ghostCell, keepPending, needsConfirm, originAt, snap, tapAnchor, badCells, TOUCH_LIFT } from './input';
import { fixture, rng } from './fixtures';

const duo = () => newGame(2, rng(3), { board: 'duo' }) as BView;

describe('blocky input', () => {
  it('cellAt maps a point through a meet-scaled viewBox', () => {
    const box = { x: -2, y: -2, w: 24, h: 31 };
    const rect = { left: 100, top: 50, width: 480, height: 620 };
    expect(cellAt({ x: 100 + 2 * 20 + 0.5 * 20, y: 50 + 2 * 20 + 0.5 * 20 }, rect, box)).toEqual({ r: 0.5, c: 0.5 });
  });
  it('touch ghost sits above finger', () => {
    expect(ghostCell({ r: 6, c: 3 }, 'touch')).toEqual({ r: 6 - TOUCH_LIFT, c: 3 });
    expect(ghostCell({ r: 6, c: 3 }, 'mouse')).toEqual({ r: 6, c: 3 });
    expect(ghostCell({ r: 6, c: 3 }, 'pen')).toEqual({ r: 6, c: 3 });
  });
  it('snap picks nearest legal within half cell', () => {
    const s = duo(); const g = s.current;
    const p = fits(s, g, 'X')[0];
    const r = Math.floor(p.at / s.size), c = p.at % s.size;
    expect(snap(s, g, 'X', p.orient, { r: r + 0.3, c: c - 0.2 })).toEqual(p);
    expect(snap(s, g, 'X', p.orient, { r: r + 1.6, c })).not.toEqual(p);
    for (let i = 0; i < 50; i++) { const o = { r: i % 14 - 0.4, c: (i * 7) % 14 + 0.3 }; const q = snap(s, g, 'L5', 0, o); if (q) expect(canPlace(s, g, q)).toBeNull(); }
  });
  it('fitCycle only fitting orients', () => {
    const s = fixture('mid'); const g = s.current;
    for (const a of anchors(s, g)) for (const piece of s.shelf[g]) for (const p of fitCycle(s, g, piece, a)) { expect(canPlace(s, g, p)).toBeNull(); expect(cellsOf(s.size, p)).toContain(a); }
  });
  it('tapAnchor prefers current orient', () => {
    const s = duo(); const g = s.current; const a = anchors(s, g)[0];
    const all = fitCycle(s, g, 'L4', a);
    const other = all.find((p) => p.orient !== all[0].orient)!;
    expect(tapAnchor(s, g, 'L4', other.orient, a)!.orient).toBe(other.orient);
    expect(tapAnchor(s, g, 'L4', 99, a)).toEqual(all[0]);
  });
  it('badCells names the reason and the offending cells', () => {
    const s = duo(); const g = s.current;
    const p = { piece: 'I5' as const, orient: 0, at: 0 };
    expect(badCells(s, g, p, { r: 0, c: 0 }).reason).toBe('notStart');
    const m = legalMoves(s, g)[0]; act(s, s.actor, { k: 'place', ...m });
    const s2 = s; const over = { piece: 'O4' as const, orient: 0, at: m.at };
    if (canPlace(s2, g, over) === 'overlap') expect(badCells(s2, g, over, originAt({ r: 0, c: 0 }, 'O4', 0)).reason).toBe('overlap');
  });
  it('confirm follows the pointer type unless forced', () => {
    expect(needsConfirm('auto', 'touch')).toBe(true);
    expect(needsConfirm('auto', 'pen')).toBe(true);
    expect(needsConfirm('auto', 'mouse')).toBe(false);
    expect(needsConfirm('on', 'mouse')).toBe(true);
    expect(needsConfirm('off', 'touch')).toBe(false);
  });
});

describe('blocky pending', () => {
  it('pending revalidated on event', () => {
    const s = fixture('duo'); const me = s.actor, g = s.current;
    const place = legalMoves(s, g)[0];
    const pend = { guild: g, place, pointerType: 'touch' };
    expect(keepPending(pend, s, me, false)).toBe(pend);
    // an event that covers the spot makes it illegal: dropped, not sent
    const t = structuredClone(s); t.cells[cellsOf(t.size, place)[0]] = 0;
    expect(keepPending(pend, t, me, false)).toBeNull();
    // the turn passing away drops it too
    expect(keepPending(pend, { ...s, actor: me === '0' ? '1' : '0' }, me, false)).toBeNull();
  });
  it('jump clears pending', () => {
    const s = fixture('duo'); const g = s.current;
    const pend = { guild: g, place: legalMoves(s, g)[0], pointerType: 'mouse' };
    expect(keepPending(pend, s, s.actor, true)).toBeNull();
  });
  it('mouse drop commits when confirm off', () => {
    expect(needsConfirm('off', 'mouse')).toBe(false);
    expect(needsConfirm('auto', 'mouse')).toBe(false);
  });
  it('suggest always pending', async () => {
    const { suggestPending } = await import('./usePending');
    const s = fixture('duo');
    const p = suggestPending(s, s.actor);
    expect(p).not.toBeNull();
    expect(p!.pointerType).toBe('suggest');
    expect(canPlace(s, s.current, p!.place)).toBeNull();
  });
});
