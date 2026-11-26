import { describe, expect, it } from 'vitest';
import { squaresOf } from '../src/blocky/pieces';
import { LOG_KEEP, type Guild } from '../src/blocky/tuning';
import { act, dismiss, hostSeat, legalMoves, newGame, playerScores, resign, score, seatOf, type BState } from '../src/blocky/rules';
import { validateBlockySetupData } from '../src/blocky/game';
import { idx, randomGame, seeded } from './blockySim';

/** The actor plays the first legal placement of the current guild. */
function step(s: BState, pick = 0) {
  const m = legalMoves(s, s.current);
  const err = act(s, s.actor, { k: 'place', ...m[Math.min(pick, m.length - 1)] });
  if (err) throw new Error(err);
}
function playOut(s: BState, rng: () => number, max = 600) {
  for (let i = 0; i < max && !s.result; i++) step(s, Math.floor(rng() * 5));
}
const I1 = (at: number) => ({ k: 'place' as const, piece: 'I1' as const, orient: 0, at });

describe('Blocky game flow', () => {
  it("start event names every guild's seat", () => {
    const s = newGame(3, seeded(1), { board: 'classic' });
    const first = s.log[0];
    expect(first.k).toBe('start');
    if (first.k === 'start') expect(first.seats).toEqual(s.seats);
    expect(s.log[1]).toMatchObject({ k: 'turn', guild: 'tide', actor: s.seats.tide });
    expect(s.actor).toBe(s.seats.tide);
  });

  it('4p seeded seat shuffle: a permutation, repeatable, and it varies', () => {
    const a = newGame(4, seeded(11), {});
    expect([a.seats.tide, a.seats.sun, a.seats.ember, a.seats.grove].sort()).toEqual(['0', '1', '2', '3']);
    expect(newGame(4, seeded(11), {}).seats).toEqual(a.seats);
    const seen = new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(newGame(4, seeded(i), {}).seats)));
    expect(seen.size).toBeGreaterThan(5);
  });

  it('2p classic: one seat holds tide+ember or sun+grove, scores summed; Duo is the 2p default', () => {
    expect(newGame(2, seeded(1), {}).board).toBe('duo');
    expect(newGame(3, seeded(1), { board: 'duo' }).board).toBe('classic');
    const s = newGame(2, seeded(5), { board: 'classic' });
    expect(s.guilds).toEqual(['tide', 'sun', 'ember', 'grove']);
    expect(s.seats.tide).toBe(s.seats.ember);
    expect(s.seats.sun).toBe(s.seats.grove);
    expect(s.seats.tide).not.toBe(s.seats.sun);
    const flip = new Set(Array.from({ length: 12 }, (_, i) => newGame(2, seeded(i), { board: 'classic' }).seats.tide));
    expect(flip.size).toBe(2);
    s.shelf.tide = s.shelf.tide.slice(5); // some squares gone
    const g = score(s), ps = playerScores(s);
    expect(ps[s.seats.tide]).toBe(g.tide + g.ember);
    expect(ps[s.seats.sun]).toBe(g.sun + g.grove);
    expect(g.tide).not.toBe(g.ember);
  });

  it('3p: grove shared, rotation order[k%3], unscored', () => {
    const s = newGame(3, seeded(2), { board: 'classic' });
    expect(s.seats.grove).toBe('shared');
    expect(new Set(s.order)).toEqual(new Set(['0', '1', '2']));
    expect([s.seats.tide, s.seats.sun, s.seats.ember]).toEqual(s.order);
    let k = 0;
    for (let i = 0; i < 300 && !s.result; i++) {
      if (s.current === 'grove') { expect(s.actor).toBe(s.order[k % 3]); expect(seatOf(s, 'grove')).toBe(s.actor); k++; }
      step(s, i % 3);
    }
    expect(k).toBeGreaterThan(5);
    expect(Object.keys(playerScores(s)).sort()).toEqual(['0', '1', '2']);
    expect(playerScores(s)[s.order[0]]).toBe(score(s).tide);
  });

  it('shared rotation skips resigned seat', () => {
    const s = newGame(3, seeded(3), { board: 'classic' });
    const [a, b, c] = s.order;
    s.sharedTurns = 1; // grove's 2nd turn belongs to order[1]
    expect(seatOf(s, 'grove')).toBe(b);
    expect(resign(s, b)).toBeUndefined();
    expect(seatOf(s, 'grove')).toBe(c);
    s.sharedTurns = 2;
    expect(seatOf(s, 'grove')).toBe(c);
    s.sharedTurns = 3;
    expect(seatOf(s, 'grove')).toBe(a);
    // and in a real game
    const t = newGame(3, seeded(4), { board: 'classic' });
    const [x, y, z] = t.order;
    step(t); // tide
    expect(resign(t, y)).toBeUndefined(); // sun's seat goes home
    const seen: string[] = [];
    for (let i = 0; i < 200 && !t.result; i++) {
      if (t.current === 'grove') seen.push(t.actor);
      step(t);
    }
    expect(seen.length).toBeGreaterThan(4);
    expect(seen.slice(0, 4)).toEqual([x, z, z, x]); // k=0 x, k=1 y (out) -> z, k=2 z, k=3 x
    expect(seen).not.toContain(y);
  });

  it('grounded seat still plays shared turns', () => {
    const s = newGame(3, seeded(6), { board: 'classic' });
    const x = s.seats.tide;
    expect(act(s, x, { k: 'done' })).toBeUndefined(); // tide's seat is first and has only tide
    expect(s.grounded).toEqual(['tide']);
    let played = false;
    for (let i = 0; i < 300 && !s.result; i++) {
      if (s.current === 'grove' && s.actor === x) { played = true; expect(s.grounded).not.toContain('grove'); }
      step(s);
    }
    expect(played).toBe(true);
    expect(s.placed.filter((q) => q.guild === 'tide')).toHaveLength(0);
  });

  it('done grounds own guilds only', () => {
    const s = newGame(2, seeded(7), { board: 'classic' });
    const p = s.actor, q = s.order.find((x) => x !== p)!;
    expect(act(s, q, { k: 'done' })).toBe('notYours');
    expect(act(s, p, { k: 'done' })).toBeUndefined();
    expect(s.grounded.sort()).toEqual(['ember', 'tide']);
    expect(s.log.some((e) => e.k === 'done' && e.p === p)).toBe(true);
    expect(s.current).toBe('sun');
    expect(s.actor).toBe(q);
    const t = newGame(3, seeded(8), { board: 'classic' });
    act(t, t.actor, { k: 'done' });
    expect(t.grounded).toEqual(['tide']);
    expect(act(t, t.actor, { k: 'done' })).toBeUndefined(); // sun's seat
    expect(act(t, t.actor, { k: 'done' })).toBeUndefined(); // ember's seat
    expect(t.grounded.sort()).toEqual(['ember', 'sun', 'tide']);
    expect(t.current).toBe('grove');
    expect(act(t, t.actor, { k: 'done' })).toBe('nothing to ground'); // the shared guild is never grounded by done
    expect(t.result).toBeNull();
  });

  it('auto-pass only when no move', () => {
    const s = newGame(4, seeded(9), { board: 'classic' });
    act(s, s.actor, I1(idx('classic', 0, 0))); // tide's I1 on its corner: its only open corner is (1,1)
    expect(s.current).toBe('sun');
    // someone else's piece takes that corner square (set directly, as a test of the engine only)
    s.cells[idx('classic', 1, 1)] = s.placed.length;
    s.placed.push({ piece: 'I1', orient: 0, at: idx('classic', 1, 1), guild: 'grove', n: s.placed.length });
    s.shelf.grove = s.shelf.grove.filter((x) => x !== 'I1');
    for (let i = 0; i < 3; i++) step(s);
    expect(s.log.filter((e) => e.k === 'stuck')).toEqual([{ k: 'stuck', guild: 'tide', n: expect.any(Number) }]);
    expect(s.grounded).toEqual(['tide']);
    expect(s.current).toBe('sun'); // the others still had moves and were never skipped
    expect(s.log.filter((e) => e.k === 'place').map((e) => e.k === 'place' && e.guild)).toEqual(['tide', 'sun', 'ember', 'grove']);
  });

  it('+15 all pieces, +20 when last is I1; ends when every guild is stuck or finished; ties share the win', () => {
    const mk = (a: 'I1' | 'I2', b: 'I1' | 'I2') => {
      const s = newGame(2, seeded(10), { board: 'duo' });
      s.shelf.tide = [a]; s.shelf.ember = [b];
      return s;
    };
    const s = mk('I1', 'I1');
    const [t, e] = [s.seats.tide, s.seats.ember];
    expect(act(s, t, I1(idx('duo', 4, 4)))).toBeUndefined();
    expect(s.result).toBeNull();
    expect(act(s, e, I1(idx('duo', 9, 9)))).toBeUndefined();
    expect(s.result).toMatchObject({ scores: { [t]: 20, [e]: 20 } });
    expect(s.result!.winners.sort()).toEqual(['0', '1']);
    expect(s.log.at(-1)).toMatchObject({ k: 'end' });
    const u = mk('I2', 'I1');
    act(u, u.seats.tide, { k: 'place', piece: 'I2', orient: 0, at: idx('duo', 4, 4) });
    act(u, u.seats.ember, I1(idx('duo', 9, 9)));
    expect(playerScores(u)).toEqual({ [u.seats.tide]: 15, [u.seats.ember]: 20 });
    expect(u.result!.winners).toEqual([u.seats.ember]);
    expect(u.result!.ranking).toEqual([u.seats.ember, u.seats.tide]);
    expect(act(u, u.seats.tide, { k: 'done' })).toBe('game over');
  });

  it('2p resign ends game', () => {
    for (const board of ['duo', 'classic'] as const) {
      const s = newGame(2, seeded(12), { board });
      const quitter = s.order[1]; // not the one to move
      expect(resign(s, quitter)).toBeUndefined();
      expect(s.result).not.toBeNull();
      expect(s.result!.winners).toEqual([s.order[0]]);
      expect(s.result!.ranking).toEqual([s.order[0], quitter]);
      expect(s.out).toEqual([quitter]);
      expect(resign(s, s.order[0])).toBe('game over');
    }
  });

  it('resigned rank last', () => {
    const s = newGame(4, seeded(13), { board: 'classic' });
    const x = s.actor;
    act(s, x, { k: 'place', piece: 'I5', orient: 0, at: idx('classic', 0, 0) });
    for (let i = 0; i < 3; i++) act(s, s.actor, { k: 'done' });
    expect(s.result).toBeNull(); // x is still playing
    expect(s.current).toBe('tide');
    expect(resign(s, x)).toBeUndefined();
    const r = s.result!;
    expect(r).not.toBeNull();
    expect(r.ranking[3]).toBe(x);
    expect(r.scores[x]).toBeGreaterThan(r.scores[r.ranking[0]]); // it scored higher but still ranks last
    expect(r.winners.sort()).toEqual(s.order.filter((p) => p !== x).sort()); // the other three tie at -89
  });

  it('dismiss host-only after handover to lowest human seat', () => {
    const s = newGame(3, seeded(14), { board: 'classic', bots: [true, false, false] });
    expect(hostSeat(s)).toBe('1');
    expect(dismiss(s, '0', '2')).toBe('not the host'); // a bot cannot
    expect(dismiss(s, '2', '1')).toBeUndefined(); // the next human may send home a dropped host
    expect(hostSeat(s)).toBe('2');
    expect(s.out).toEqual(['1']);
    expect(s.log.some((e) => e.k === 'dismiss' && e.p === '1' && e.by === '2')).toBe(true);
    const t = newGame(4, seeded(15), { board: 'classic' });
    expect(dismiss(t, '2', '3')).toBe('not the host');
    expect(dismiss(t, '0', '0')).toBe('not the host');
    expect(dismiss(t, '0', '3')).toBeUndefined();
    expect(hostSeat(t)).toBe('0');
    expect(resign(t, '0')).toBeUndefined();
    expect(hostSeat(t)).toBe('1');
  });

  it('log capped at LOG_KEEP, logTotal monotonic', () => {
    const s = newGame(4, seeded(16), { board: 'classic' });
    let last = s.logTotal;
    for (let i = 0; i < 600 && !s.result; i++) {
      step(s, i % 4);
      expect(s.logTotal).toBeGreaterThanOrEqual(last);
      last = s.logTotal;
      expect(s.log.length).toBeLessThanOrEqual(LOG_KEEP);
      expect(s.log.at(-1)!.n).toBe(s.logTotal);
    }
    expect(s.result).not.toBeNull();
    expect(s.logTotal).toBeGreaterThan(LOG_KEEP);
    const ns = s.log.map((e) => e.n);
    expect(ns).toEqual(ns.map((_, i) => ns[0] + i));
  });

  it('illegal place returns reason, state unchanged', () => {
    const s = randomGame(4, 21, { board: 'classic' }, 10);
    const before = JSON.stringify(s);
    expect(act(s, s.actor, I1(idx('classic', 10, 10)))).toMatch(/^(noCorner|notStart|used)$/);
    expect(act(s, s.actor, { k: 'place', piece: 'I5', orient: 0, at: 18 })).toBe('offBoard');
    const other = s.order.find((p) => p !== s.actor)!;
    expect(act(s, other, I1(0))).toBe('notYours');
    expect(act(s, undefined, I1(0))).toBe('not playing');
    expect(act(s, s.actor, { k: 'place', piece: 'Q', orient: 0, at: 0 } as never)).toBe('used');
    expect(act(s, s.actor, { k: 'place', piece: 'I1', orient: 1.5, at: 0 } as never)).toBe('bad action');
    expect(act(s, s.actor, null as never)).toBe('bad action');
    expect(JSON.stringify(s)).toBe(before);
  });

  it('a full random game: squares on the board plus shelf = 89 per guild, scores recount, board matches placed', () => {
    for (const [n, board] of [[2, 'duo'], [2, 'classic'], [3, 'classic'], [4, 'classic']] as const) {
      const s = newGame(n, seeded(30 + n), { board });
      playOut(s, seeded(n));
      expect(s.result).not.toBeNull();
      const sc = score(s);
      for (const guild of s.guilds) {
        const onBoard = s.cells.filter((c) => c >= 0 && s.placed[c].guild === guild).length;
        const shelf = s.shelf[guild].reduce((a, id) => a + squaresOf(id), 0);
        expect(onBoard + shelf).toBe(89);
        const bonus = shelf === 0 ? (s.placed.filter((q) => q.guild === guild).at(-1)!.piece === 'I1' ? 20 : 15) : 0;
        expect(sc[guild]).toBe(-shelf + bonus);
      }
      const ps = playerScores(s);
      expect(s.result!.scores).toEqual(ps);
      for (const p of s.order) expect(ps[p]).toBe(s.guilds.filter((g) => s.seats[g] === p).reduce((a, g) => a + sc[g], 0));
    }
  });

  it('validates setup data', () => {
    expect(validateBlockySetupData({ board: 'classic', hints: false, bots: [true, false], avatars: [0, 5] }, 4)).toBeUndefined();
    expect(validateBlockySetupData(undefined, 3)).toBeUndefined();
    expect(validateBlockySetupData({ board: 'duo' }, 2)).toBeUndefined();
    expect(validateBlockySetupData({ board: 'duo' }, 3)).toBe('duo needs exactly 2 players');
    expect(validateBlockySetupData({ board: 'moon' }, 2)).toBe('bad board');
    expect(validateBlockySetupData({ hints: 'yes' }, 2)).toBe('bad hints');
    expect(validateBlockySetupData({ bots: [1] }, 2)).toBe('bad bots');
    expect(validateBlockySetupData({ avatars: [9] }, 2)).toBe('bad avatars');
    expect(validateBlockySetupData([], 2)).toBe('setupData must be an object');
  });
});
