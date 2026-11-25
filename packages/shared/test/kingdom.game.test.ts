import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import { KingdomGame, TREASURE_IDS, cellOf, legalShifts, applyShift, pathTo, validateKingdomSetupData, type KState, type KView } from '../src/kingdom';
import { seeded } from './kingdomSim';

type C = ReturnType<typeof Client<KState>>;
const view = (c: C) => c.getState()!.G as unknown as KView;

function table(n: number, setupData: unknown) {
  const base = { ...KingdomGame };
  const game: Game<KState> = { ...base, setup: (ctx) => base.setup!(ctx, setupData) };
  const multiplayer = Local();
  const make = (id: string | undefined) => { const c = Client<KState>({ game, numPlayers: n, multiplayer, playerID: id }); c.start(); return c; };
  return { seats: Array.from({ length: n }, (_, i) => make(String(i))), make };
}

/** Nothing a client holds may show another seat's stack or target. */
function assertNoLeak(c: C, secrets: Record<string, string[]>) {
  const me = c.playerID;
  const v = view(c);
  if (v.result) return;
  expect('stacks' in v).toBe(false);
  for (const p of v.players) if (p !== me) expect(v.targets[p]).toEqual([]);
  const blob = JSON.stringify({ log: v.log, bgLog: c.getState()!.log ?? [] });
  for (const [p, s] of Object.entries(secrets)) if (p !== me) for (const t of s) {
    if (!v.found[p].includes(t as never)) expect(blob.includes(`"t":"${t}"`)).toBe(false);
  }
}

/** A plain player: the first shift that reaches the target, then walk there (else stay). Uses only its own view. */
function plainTurn(c: C, rng: () => number) {
  const v = view(c);
  const me = c.playerID!;
  const goal = v.targets[me].length ? cellOf(v, v.targets[me][0]) : v.home[me];
  if (v.step === 'shift') {
    const all = legalShifts(v.spare, v.lastAt);
    const hit = all.find((s) => {
      const r = applyShift(v.board, v.spare, v.pos, s.at, s.rot);
      const g = v.targets[me].length ? cellOf({ board: r.board }, v.targets[me][0]) : goal;
      return g >= 0 && pathTo(r.board, r.pos[me], g);
    });
    c.moves.act({ k: 'shift', ...(hit ?? all[Math.floor(rng() * all.length)]) });
  } else {
    c.moves.act({ k: 'move', to: goal >= 0 && pathTo(v.board, v.pos[me], goal) ? goal : v.pos[me] });
  }
}

describe('KingdomGame (boardgame.io)', () => {
  it('validates setup data', () => {
    expect(validateKingdomSetupData({ length: 'short', heroes: [3, 1], young: [true, false], hints: false })).toBeUndefined();
    expect(validateKingdomSetupData({ length: 'epic' })).toBe('bad length');
    expect(validateKingdomSetupData({ heroes: [1, 1] })).toBe('bad heroes');
    expect(validateKingdomSetupData({ young: ['yes'] })).toBe('bad young');
  });

  it('plays a 4-player game to the end through Local(), never leaking a target, surviving a reconnect', () => {
    const { seats, make } = table(4, { length: 'short', heroes: [2, 0, 3, 1] });
    // the stacks as dealt: read once from the end-of-game view of a fresh spectator later; meanwhile collect from owners
    const secrets: Record<string, string[]> = {};
    for (const c of seats) secrets[c.playerID!] = [...view(c).targets[c.playerID!]];
    const rng = seeded(9);
    let steps = 0;
    while (!view(seats[0]).result && steps < 4000) {
      const cur = view(seats[0]).current;
      for (const c of seats) { const t = view(c).targets[c.playerID!][0]; if (t && !secrets[c.playerID!].includes(t)) secrets[c.playerID!].push(t); }
      plainTurn(seats[Number(cur)], rng);
      if (steps % 25 === 0) seats.forEach((c) => assertNoLeak(c, secrets));
      if (steps === 40) {
        const before = view(seats[2]);
        seats[2].stop(); seats[2] = make('2');
        expect(view(seats[2]).targets['2']).toEqual(before.targets['2']);
        expect(view(seats[2]).board).toEqual(before.board);
      }
      steps++;
    }
    const end = view(seats[0]);
    expect(end.result).not.toBeNull();
    expect(end.heroes).toEqual([2, 0, 3, 1]);
    expect(seats[0].getState()!.ctx.gameover).toBeTruthy();
    const spectator = make(undefined);
    const all = Object.values(view(spectator).targets).flat().concat(Object.values(view(spectator).found).flat());
    expect(all.every((t) => TREASURE_IDS.includes(t))).toBe(true);
    expect(all).toHaveLength(12);
  });

  it('refuses moves out of turn; anyone may resign; only the host may dismiss', () => {
    const { seats } = table(3, {});
    const cur = view(seats[0]).current;
    const others = seats.filter((c) => c.playerID !== cur);
    const before = JSON.stringify(view(seats[0]).board);
    others[0].moves.act({ k: 'shift', at: 0, rot: 0 });
    expect(JSON.stringify(view(seats[0]).board)).toBe(before);
    seats[2].moves.dismiss('1');
    expect(view(seats[0]).out).toEqual([]);
    seats[0].moves.dismiss('1');
    expect(view(seats[0]).out).toEqual(['1']);
    seats[2].moves.resign();
    expect(view(seats[0]).result).toEqual({ winner: '0', reason: 'last' });
  });
});
