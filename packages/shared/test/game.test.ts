import { describe, expect, it } from 'vitest';
import { Client } from 'boardgame.io/client';
import { Local } from 'boardgame.io/multiplayer';
import type { Game } from 'boardgame.io';
import { BobolandGame, legalActions } from '../src/game';
import type { GState } from '../src/types';
import { makeState } from './helpers';

type Seat = ReturnType<typeof seat>;
function seat(game: Game<GState>, multiplayer: ReturnType<typeof Local>, playerID: string, numPlayers: number) {
  const c = Client({ game, numPlayers, multiplayer, playerID });
  c.start();
  return c;
}

function table(game: Game<GState>, numPlayers = 2) {
  const multiplayer = Local();
  const seats: Seat[] = [];
  for (let i = 0; i < numPlayers; i++) seats.push(seat(game, multiplayer, String(i), numPlayers));
  return seats;
}

const raw = (c: Seat) => (c as unknown as { store: { getState(): { G: GState; ctx: any } } }).store.getState();
const keepFirst = (c: Seat, n: number) => {
  const s = c.getState()!;
  c.moves.keepInitialTickets(s.G.players[c.playerID!].pending.slice(0, n));
};

/** A seeded game where player 0 starts, so turn-by-turn tests read simply. */
const seeded = (seed: string): Game<GState> => ({
  ...BobolandGame,
  seed,
  setup: (ctx) => { const G = BobolandGame.setup!(ctx); return { ...G, turnOrder: [...G.turnOrder].sort() }; },
});

describe('boardgame.io game: turn order', () => {
  const orderOf = (seed: string, numPlayers: number) => {
    const seats = table({ ...BobolandGame, seed }, numPlayers);
    for (const s of seats) keepFirst(s, 2);
    return { seats, order: raw(seats[0]).G.turnOrder, ctx: seats[0].getState()!.ctx };
  };

  it('is a random permutation of every seat, the same way every time for the same seed', () => {
    expect(orderOf('ord-a', 4).order).toEqual(orderOf('ord-a', 4).order);
    const seen = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const { order } = orderOf(`ord-${i}`, 3);
      expect([...order].sort()).toEqual(['0', '1', '2']);
      seen.add(order.join(''));
    }
    // all 6 orders of 3 seats turn up, not just the 3 rotations of 0-1-2
    expect(seen.size).toBe(6);
  });

  it('starts with the first player in the order, and every seat starts about equally often', () => {
    const firsts: Record<string, number> = {};
    for (let i = 0; i < 90; i++) {
      const { order, ctx } = orderOf(`start-${i}`, 3);
      expect(ctx.currentPlayer).toBe(order[0]);
      firsts[order[0]] = (firsts[order[0]] ?? 0) + 1;
    }
    expect(Object.keys(firsts).sort()).toEqual(['0', '1', '2']);
    for (const n of Object.values(firsts)) expect(n).toBeGreaterThan(10);
  });

  it('then turns follow the shuffled order and wrap round', () => {
    for (let i = 0; i < 12; i++) {
      const { seats, order } = orderOf(`round-${i}`, 4);
      for (let t = 0; t < 8; t++) {
        const who = order[t % 4];
        expect(seats[0].getState()!.ctx.currentPlayer).toBe(who);
        seats[Number(who)].moves.drawBlind(); seats[Number(who)].moves.drawBlind();
      }
    }
  });
});

describe('boardgame.io game: setup phase', () => {
  it('starts with everyone choosing tickets; keeping one is not enough; then the main phase starts with player 0', () => {
    const [a, b] = table(seeded('setup'));
    expect(a.getState()!.ctx.phase).toBe('chooseTickets');
    keepFirst(a, 1);
    expect(a.getState()!.G.players['0'].pending).toHaveLength(4);
    keepFirst(a, 2);
    expect(a.getState()!.G.players['0'].tickets).toHaveLength(2);
    expect(a.getState()!.ctx.phase).toBe('chooseTickets');
    keepFirst(b, 3);
    const s = a.getState()!;
    expect(s.ctx.phase).toBe('main');
    expect(s.ctx.currentPlayer).toBe('0');
  });
});

describe('boardgame.io game: turns', () => {
  function started(seed = 'turns', numPlayers = 2) {
    const seats = table(seeded(seed), numPlayers);
    for (const s of seats) keepFirst(s, 2);
    return seats;
  }

  it('two blind draws end the turn', () => {
    const [a, b] = started();
    a.moves.drawBlind();
    expect(a.getState()!.ctx.currentPlayer).toBe('0');
    expect(a.getState()!.ctx.activePlayers?.['0']).toBe('secondDraw');
    a.moves.drawBlind();
    expect(b.getState()!.ctx.currentPlayer).toBe('1');
    expect(Object.values(a.getState()!.G.players['0'].hand).reduce((x, y) => x + y, 0)).toBe(6);
  });

  it('taking a face-up locomotive first ends the turn', () => {
    const game: Game<GState> = {
      ...seeded('loco'),
      setup: (ctx) => {
        const G = BobolandGame.setup!(ctx);
        G.turnOrder = ['0', '1'];
        G.market[2] = 'locomotive';
        return G;
      },
    };
    const seats = table(game);
    for (const s of seats) keepFirst(s, 2);
    seats[0].moves.drawFaceUp(2);
    expect(seats[0].getState()!.ctx.currentPlayer).toBe('1');
  });

  it('drawing tickets: keeping none is invalid, keeping one ends the turn', () => {
    const [a] = started();
    a.moves.drawTickets();
    expect(a.getState()!.G.players['0'].pending).toHaveLength(3);
    a.moves.keepTickets([]);
    expect(a.getState()!.G.players['0'].pending).toHaveLength(3);
    a.moves.keepTickets(a.getState()!.G.players['0'].pending.slice(0, 1));
    expect(a.getState()!.G.players['0'].tickets).toHaveLength(3);
    expect(a.getState()!.ctx.currentPlayer).toBe('1');
  });

  it('once tickets are drawn they cannot be put back: at least one must be kept', () => {
    const [a] = started();
    a.moves.drawTickets();
    expect(raw(a).G.log.at(-1)).toEqual({ t: 'drawTickets', p: '0', n: 3 });
    expect(a.moves.returnTickets).toBeUndefined();
    a.moves.drawBlind();
    expect(a.getState()!.G.players['0'].pending).toHaveLength(3);
    expect(a.getState()!.ctx.activePlayers?.['0']).toBe('chooseTickets');
  });

  it('cannot claim and draw in the same turn', () => {
    const [a] = started();
    a.moves.drawBlind();
    const before = raw(a).G.claims;
    a.moves.claimRoute('SEA-POR', 'locomotive');
    expect(raw(a).G.claims).toEqual(before);
  });

  it('final round: every player including the trigger gets exactly one more turn', () => {
    const game: Game<GState> = {
      ...seeded('final'),
      setup: (ctx) => {
        const G = BobolandGame.setup!(ctx);
        G.turnOrder = ['0', '1'];
        G.players['0'].trains = 3;
        G.players['0'].hand.locomotive += 2;
        return G;
      },
    };
    const [a, b] = table(game);
    keepFirst(a, 2); keepFirst(b, 2);
    a.moves.claimRoute('SEA-POR', 'locomotive'); // length 1 -> 2 trains left: triggers
    expect(raw(a).G.finalRound).toEqual({ triggeredBy: '0', turnsLeft: 2 });
    expect(a.getState()!.ctx.gameover).toBeUndefined();
    b.moves.drawBlind(); b.moves.drawBlind();
    expect(a.getState()!.ctx.gameover).toBeUndefined();
    expect(a.getState()!.ctx.currentPlayer).toBe('0');
    a.moves.drawBlind(); a.moves.drawBlind();
    const s = a.getState()!;
    expect(s.ctx.gameover).toBeDefined();
    expect(s.G.result).not.toBeNull();
    expect(s.ctx.gameover.winners).toEqual(s.G.result!.winners);
    expect(s.G.endedAt).toBeGreaterThanOrEqual(s.G.startedAt);
  });
});

describe('player view hides secrets', () => {
  it('opponents see counts, not cards, tickets or deck order', () => {
    const [a, b] = table(seeded('view'));
    const view = b.getState()!.G;
    expect(view.deck).toEqual([]);
    expect(view.ticketDeck).toEqual([]);
    expect(view.deckCount).toBe(112 - 8 - 5);
    expect(view.players['0'].pending).toEqual([]);
    expect(view.players['0'].pendingCount).toBe(4);
    expect(Object.values(view.players['0'].hand).every((n) => n === 0)).toBe(true);
    expect(view.players['0'].handCount).toBe(4);
    expect(view.players['1'].pending).toHaveLength(4);
    expect(Object.values(view.players['1'].hand).reduce((x, y) => x + y, 0)).toBe(4);
    void a;
  });

  it('hides which card an opponent drew blind', () => {
    const G = makeState();
    G.players['0'].lastDrawn = { card: 'red', seq: 3 };
    const v = BobolandGame.playerView!({ G, ctx: {} as never, playerID: '1' });
    expect(v.players['0'].lastDrawn).toBeUndefined();
    const mine = BobolandGame.playerView!({ G, ctx: {} as never, playerID: '0' });
    expect(mine.players['0'].lastDrawn).toEqual({ card: 'red', seq: 3 });
  });

  it('hides how many starting tickets an opponent kept until everyone has chosen', () => {
    const G = makeState({ ticketDeck: ['T-A', 'T-B', 'T-C'] });
    // player 0 locked in 2 of 4 (2 went back under the deck); player 1 is still choosing
    G.players['0'].tickets = ['T-POR-SLC', 'T-X'];
    G.players['0'].pending = [];
    G.ticketDeck.push('T-R1', 'T-R2');
    G.players['1'].pending = ['T-1', 'T-2', 'T-3', 'T-4'];
    const choosing = { phase: 'chooseTickets' } as never;
    const v = BobolandGame.playerView!({ G, ctx: choosing, playerID: '1' });
    expect(v.players['0'].ticketCount).toBeUndefined();
    expect(v.ticketDeckCount).toBe(3); // the deck as dealt, before anyone's returns
    // your own count is yours to see
    expect(BobolandGame.playerView!({ G, ctx: choosing, playerID: '0' }).players['0'].tickets).toHaveLength(2);
    // once everyone has chosen, the counts show
    const after = BobolandGame.playerView!({ G, ctx: { phase: 'main' } as never, playerID: '1' });
    expect(after.players['0'].ticketCount).toBe(2);
    expect(after.ticketDeckCount).toBe(5);
  });

  it('reveals everyone\'s tickets once the game is over', () => {
    const G = makeState({ result: { players: {}, longest: 0, winners: ['0'] } });
    G.players['0'].tickets = ['T-POR-SLC'];
    const v = BobolandGame.playerView!({ G, ctx: {} as never, playerID: '1' });
    expect(v.players['0'].tickets).toEqual(['T-POR-SLC']);
  });
});

describe('legal actions', () => {
  it('pass is the only move when nothing else is legal', () => {
    const G = makeState();
    expect(legalActions(G, '0')).toEqual({ draw: false, claim: [], tickets: false, pass: true });
  });

  it('lists claimable routes and available draws', () => {
    const G = makeState({ deck: ['red'], ticketDeck: ['T-POR-SLC'] });
    G.players['0'].hand.locomotive = 1;
    const la = legalActions(G, '0');
    expect(la.draw).toBe(true);
    expect(la.tickets).toBe(true);
    expect(la.pass).toBe(false);
    expect(la.claim).toContain('SEA-POR');
    expect(la.claim).not.toContain('SPO-BIL');
  });
});
