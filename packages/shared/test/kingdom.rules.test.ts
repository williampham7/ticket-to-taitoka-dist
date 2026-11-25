import { describe, expect, it } from 'vitest';
import {
  CELLS, E, FIXED, HOMES, INSERTS, N, S, TREASURE_IDS, W, act, applyShift, cell, dismiss, distances, hostSeat, isFixed, legalShifts,
  lineCells, newGame, opposite, pathTo, reachable, resign, rotMask, shapeOf, viewFor, type KState, type TreasureId,
} from '../src/kingdom';
import { seeded } from './kingdomSim';

const game = (n = 2, o: Parameters<typeof newGame>[2] = {}, seed = 1) => newGame(n, seeded(seed), o);
/** Every tile open on all four sides: everything is reachable. */
const openAll = (G: KState) => { G.board = G.board.map((t) => ({ ...t, m: 15 })); G.spare = { ...G.spare, m: 15 }; };
/** Put treasure `t` on cell `i` (moving it off wherever it was). */
function place(G: KState, t: TreasureId, i: number) {
  G.board = G.board.map((x) => (x.t === t ? { id: x.id, m: x.m } : x));
  if (G.spare.t === t) G.spare = { id: G.spare.id, m: G.spare.m };
  G.board[i] = { ...G.board[i], t };
}
const first = (G: KState) => G.current;
const other = (G: KState) => G.players.find((p) => p !== G.current)!;

describe('Runeshift layout', () => {
  it('has 16 fixed tiles: L homes in the corners, edge T tiles closed toward the edge', () => {
    expect(Object.keys(FIXED)).toHaveLength(16);
    for (const h of HOMES) expect(shapeOf(FIXED[h].m)).toBe('L');
    for (let c = 2; c <= 4; c += 2) {
      expect(FIXED[cell(0, c)].m & N).toBe(0);
      expect(FIXED[cell(6, c)].m & S).toBe(0);
      expect(FIXED[cell(c, 0)].m & W).toBe(0);
      expect(FIXED[cell(c, 6)].m & E).toBe(0);
    }
    for (const h of HOMES) expect(FIXED[h].t).toBeUndefined();
  });

  it('keeps the centre open: each centre fixed tile opens toward both of its centre-side neighbours', () => {
    expect(FIXED[cell(2, 2)].m & (E | S)).toBe(E | S);
    expect(FIXED[cell(2, 4)].m & (W | S)).toBe(W | S);
    expect(FIXED[cell(4, 4)].m & (W | N)).toBe(W | N);
    expect(FIXED[cell(4, 2)].m & (E | N)).toBe(E | N);
  });

  it('sets up 49 tiles and a spare: fixed tiles in place, 12 I / 16 L / 6 T movable, each treasure exactly once', () => {
    const G = game(4);
    for (let i = 0; i < CELLS; i++) if (isFixed(i)) expect(G.board[i]).toEqual({ id: G.board[i].id, ...FIXED[i] });
    const movable = [...G.board.filter((_, i) => !isFixed(i)), G.spare];
    expect(movable).toHaveLength(34);
    const shapes = movable.map((t) => shapeOf(t.m));
    expect(shapes.filter((s) => s === 'I')).toHaveLength(12);
    expect(shapes.filter((s) => s === 'L')).toHaveLength(16);
    expect(shapes.filter((s) => s === 'T')).toHaveLength(6);
    const ts = [...G.board, G.spare].map((t) => t.t).filter(Boolean).sort();
    expect(ts).toEqual([...TREASURE_IDS].sort());
    expect(new Set([...G.board, G.spare].map((t) => t.id)).size).toBe(50);
  });

  it('deals by game length and seats homes clockwise from the top-left in turn order', () => {
    expect(Object.values(game(2).stacks).map((s) => s.length)).toEqual([12, 12]);
    expect(Object.values(game(3).stacks).map((s) => s.length)).toEqual([8, 8, 8]);
    expect(Object.values(game(4, { length: 'medium' }).stacks).map((s) => s.length)).toEqual([5, 5, 5, 5]);
    expect(Object.values(game(3, { length: 'short' }).stacks).map((s) => s.length)).toEqual([3, 3, 3]);
    const G = game(4, {}, 7);
    G.order.forEach((p, k) => { expect(G.home[p]).toBe(HOMES[k]); expect(G.pos[p]).toBe(HOMES[k]); });
    expect(G.current).toBe(G.order[0]);
    const all = Object.values(G.stacks).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('shifting', () => {
  it('slides the line one square, rotates the spare in, and the pushed-out tile becomes the spare', () => {
    const G = game();
    const line = lineCells(0); // N1: down column 1
    const before = line.map((i) => G.board[i]);
    const spare = G.spare;
    const r = applyShift(G.board, G.spare, G.pos, 0, 1);
    expect(r.board[line[0]]).toEqual({ ...spare, m: rotMask(spare.m, 1) });
    for (let k = 1; k < 7; k++) expect(r.board[line[k]]).toEqual(before[k - 1]);
    expect(r.spare).toEqual(before[6]);
    expect(line).toEqual([1, 8, 15, 22, 29, 36, 43]);
  });

  it('wraps heroes on the pushed-out tile onto the inserted tile; heroes in the line ride along', () => {
    const pos = { '0': cell(6, 3), '1': cell(2, 3), '2': cell(6, 3) };
    const G = game();
    const r = applyShift(G.board, G.spare, pos, 1, 0); // N3: column 3 pushed down
    expect(r.pos).toEqual({ '0': cell(0, 3), '1': cell(3, 3), '2': cell(0, 3) });
    expect(r.wraps.sort()).toEqual(['0', '2']);
    const r2 = applyShift(G.board, G.spare, { '0': cell(3, 0) }, opposite(10), 0); // W3 opposite = E3: row 3 pushed left
    expect(r2.pos['0']).toBe(cell(3, 6));
  });

  it('refuses the exact reverse of the previous shift (no undo), and only that one', () => {
    const G = game();
    expect(act(G, first(G), { k: 'shift', at: 4, rot: 0 })).toBeUndefined();
    expect(G.lastAt).toBe(4);
    act(G, G.current, { k: 'move', to: G.pos[G.current] });
    expect(act(G, G.current, { k: 'shift', at: opposite(4), rot: 0 })).toBe('blocked');
    expect(legalShifts(G.spare, G.lastAt).some((s) => s.at === opposite(4))).toBe(false);
    expect(new Set(legalShifts(G.spare, G.lastAt).map((s) => s.at)).size).toBe(11);
    expect(act(G, G.current, { k: 'shift', at: 4, rot: 0 })).toBeUndefined();
  });

  it('only lets the current player shift, once, then move', () => {
    const G = game(3);
    expect(act(G, other(G), { k: 'shift', at: 0, rot: 0 })).toBe('not your turn');
    expect(act(G, first(G), { k: 'move', to: G.pos[first(G)] })).toBe('shift first');
    expect(act(G, first(G), { k: 'shift', at: 12, rot: 0 })).toBe('bad shift');
    expect(act(G, first(G), { k: 'shift', at: 0, rot: 0 })).toBeUndefined();
    expect(act(G, first(G), { k: 'shift', at: 1, rot: 0 })).toBe('already shifted');
  });
});

describe('paths', () => {
  it('connects only through facing openings', () => {
    const G = game();
    G.board = G.board.map((t) => ({ ...t, m: 0 }));
    G.board[cell(3, 3)] = { ...G.board[cell(3, 3)], m: E };
    G.board[cell(3, 4)] = { ...G.board[cell(3, 4)], m: W | S };
    G.board[cell(4, 4)] = { ...G.board[cell(4, 4)], m: E }; // no N opening: not connected
    expect(reachable(G.board, cell(3, 3)).sort((a, b) => a - b)).toEqual([cell(3, 3), cell(3, 4)]);
    expect(pathTo(G.board, cell(3, 3), cell(4, 4))).toBeNull();
  });

  it('pathTo agrees with reachable and BFS distance on many random boards', () => {
    for (let s = 0; s < 40; s++) {
      const G = game(2, {}, s);
      for (const from of [0, 24, 17, 48]) {
        const d = distances(G.board, from);
        const reach = new Set(reachable(G.board, from));
        for (let to = 0; to < CELLS; to++) {
          const p = pathTo(G.board, from, to);
          expect(!!p, `seed ${s} ${from}->${to}`).toBe(reach.has(to));
          if (!p) continue;
          expect(p[0]).toBe(from);
          expect(p[p.length - 1]).toBe(to);
          expect(p.length - 1).toBe(d.get(to));
          for (let k = 1; k < p.length; k++) expect(reachable(G.board, p[k - 1])).toContain(p[k]);
        }
      }
    }
  });

  it('breaks ties N, E, S, W', () => {
    const G = game();
    openAll(G);
    expect(pathTo(G.board, cell(3, 3), cell(2, 4))).toEqual([cell(3, 3), cell(2, 3), cell(2, 4)]);
  });
});

describe('collecting and winning', () => {
  it('collects by staying put', () => {
    const G = game();
    const p = first(G);
    place(G, G.stacks[p][0], G.pos[p] === 0 ? 0 : G.pos[p]);
    G.board[G.pos[p]] = { ...G.board[G.pos[p]], t: G.stacks[p][0] };
    const t = G.stacks[p][0];
    act(G, p, { k: 'shift', at: 0, rot: 0 });
    expect(act(G, p, { k: 'move', to: G.pos[p] })).toBeUndefined();
    expect(G.found[p]).toEqual([t]);
    expect(G.log.slice(-3).map((e) => e.k)).toEqual(['move', 'collect', 'turn']);
  });

  it('collects when the shift carries the target square under you (a hero wraps onto the inserted tile)', () => {
    const G = game();
    const p = first(G);
    const t = G.stacks[p][0];
    G.pos[p] = cell(6, 1);
    G.board = G.board.map((x) => (x.t === t ? { id: x.id, m: x.m } : x));
    G.spare = { ...G.spare, t };
    act(G, p, { k: 'shift', at: 0, rot: 0 }); // N1: (6,1) is pushed out, the hero wraps onto the spare at (0,1)
    expect(G.board[cell(0, 1)].t).toBe(t);
    expect(G.pos[p]).toBe(cell(0, 1));
    act(G, p, { k: 'move', to: cell(0, 1) });
    expect(G.found[p]).toEqual([t]);
  });

  it('never collects a treasure on the spare, nor anyone else’s target', () => {
    const G = game();
    const p = first(G);
    const mine = G.stacks[p][0];
    G.board = G.board.map((x) => (x.t === mine ? { id: x.id, m: x.m } : x));
    G.spare = { ...G.spare, t: mine };
    openAll(G);
    G.step = 'move';
    act(G, p, { k: 'move', to: cell(3, 3) });
    expect(G.found[p]).toEqual([]);
    expect(G.spare.t).toBe(mine);
    const q = G.current;
    const theirs = G.stacks[p][0];
    place(G, theirs, cell(3, 4));
    G.step = 'move';
    act(G, q, { k: 'move', to: cell(3, 4) });
    expect(G.found[q]).toEqual([]);
  });

  it('Young Adventurer: any order, only for that seat', () => {
    const G = game(2, { young: [true, false] });
    const kid = '0', adult = '1';
    openAll(G);
    G.current = kid; G.step = 'move';
    const second = G.stacks[kid][1];
    place(G, second, cell(3, 3));
    act(G, kid, { k: 'move', to: cell(3, 3) });
    expect(G.found[kid]).toEqual([second]);
    G.step = 'move';
    const second2 = G.stacks[adult][1];
    place(G, second2, cell(3, 5));
    act(G, adult, { k: 'move', to: cell(3, 5) });
    expect(G.found[adult]).toEqual([]);
    expect(viewFor(G, kid).targets[kid]).toEqual(G.stacks[kid]);
    expect(viewFor(G, adult).targets[adult]).toEqual([G.stacks[adult][0]]);
  });

  it('wins at home only with an empty stack', () => {
    const G = game(2, { length: 'short' });
    openAll(G);
    const p = first(G);
    G.step = 'move';
    act(G, p, { k: 'move', to: G.home[p] });
    expect(G.result).toBeNull();
    G.current = p; G.step = 'move';
    const last = G.stacks[p][2];
    G.stacks[p] = [last];
    place(G, last, cell(3, 3));
    act(G, p, { k: 'move', to: cell(3, 3) });
    expect(G.stacks[p]).toEqual([]);
    expect(G.log.some((e) => e.k === 'home' && e.p === p)).toBe(true);
    expect(G.result).toBeNull();
    G.current = p; G.step = 'move';
    act(G, p, { k: 'move', to: G.home[p] });
    expect(G.result).toEqual({ winner: p, reason: 'home' });
    expect(G.log[G.log.length - 1]).toMatchObject({ k: 'win', p, reason: 'home' });
    expect(act(G, other(G), { k: 'shift', at: 0, rot: 0 })).toBe('game over');
  });
});

describe('leaving', () => {
  it('resign on your own turn passes the turn; off turn it does not', () => {
    const G = game(3);
    const [a, b, c] = G.order;
    expect(resign(G, a)).toBeUndefined();
    expect(G.current).toBe(b);
    expect(G.step).toBe('shift');
    expect(G.pos[a]).toBeUndefined();
    expect(resign(G, c)).toBeUndefined();
    expect(G.current).toBe(b);
    expect(G.result).toEqual({ winner: b, reason: 'last' });
    expect(resign(G, b)).toBe('game over');
  });

  it('dismiss is host-only, the next human may dismiss a dropped host, and the host role passes on', () => {
    const G = game(4, { bots: [false, true, false, false] });
    expect(hostSeat(G)).toBe('0');
    expect(dismiss(G, '2', '3')).toBe('not the host');
    expect(dismiss(G, '1', '3')).toBe('not the host');
    expect(dismiss(G, '0', '0')).toBe('not the host');
    expect(dismiss(G, '3', '0')).toBe('not the host');
    expect(dismiss(G, '2', '0')).toBeUndefined(); // seat 0 dropped: the next human seat sends them home
    expect(hostSeat(G)).toBe('2');
    expect(dismiss(G, '2', '3')).toBeUndefined();
    expect(G.log.filter((e) => e.k === 'resign').map((e) => (e as { by?: string }).by)).toEqual(['2', '2']);
    expect(G.result).toBeNull();
    expect(dismiss(G, '2', '1')).toBeUndefined();
    expect(G.result).toEqual({ winner: '2', reason: 'last' });
  });
});

describe('view', () => {
  it('shows only my current target (or my whole stack when young); never the stacks; everything after the game', () => {
    const G = game(3);
    const v = viewFor(G, '1');
    expect('stacks' in v).toBe(false);
    expect(v.targets['1']).toEqual([G.stacks['1'][0]]);
    expect(v.targets['0']).toEqual([]);
    expect(v.left).toEqual({ '0': 8, '1': 8, '2': 8 });
    const spect = viewFor(G, null);
    expect(Object.values(spect.targets).flat()).toEqual([]);
    const secrets = Object.entries(G.stacks).filter(([p]) => p !== '1').map(([, s]) => s[0]);
    const json = JSON.stringify(v.log);
    for (const t of secrets) expect(json).not.toContain(t);
    resign(G, '0'); resign(G, '2');
    expect(viewFor(G, null).targets['0']).toEqual(G.stacks['0']);
  });

  it('logs a numbered, public event for every action', () => {
    const G = game(2);
    const p = first(G);
    act(G, p, { k: 'shift', at: 2, rot: 3 });
    const e = G.log[G.log.length - 1];
    expect(e).toMatchObject({ k: 'shift', p, at: 2, rot: 3, n: G.logTotal });
    expect(typeof (e as { out: number }).out).toBe('number');
    act(G, p, { k: 'move', to: G.pos[p] });
    expect(G.log.find((x) => x.k === 'move')).toMatchObject({ p, path: [G.pos[p]] });
    expect(INSERTS).toHaveLength(12);
  });
});
