/** Random legal play, shared by the fuzz tests for each map. */
import { expect } from 'vitest';
import { Client } from 'boardgame.io/client';
import type { Game } from 'boardgame.io';
import { BobolandGame, legalActions } from '../src/game';
import { paymentOptions } from '../src/engine/claim';
import { seededRandom } from '../src/engine/rng';
import { ROUTE_BY_ID } from '../src/map';
import type { GState } from '../src/types';
import { countCards } from './helpers';

const MAX_MOVES = 3000;

/** Plays one seeded game of 2-5 players with random legal moves; returns the number of moves. */
export function playOne(i: number) {
  const numPlayers = 2 + (i % 4);
  const game: Game<GState> = { ...BobolandGame, seed: `fuzz-${i}` };
  const client = Client({ game, numPlayers });
  client.start();
  const store = (client as unknown as { store: { getState(): { G: GState; ctx: any } } }).store;
  const rnd = seededRandom(`moves-${i}`);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];

  let moves = 0;
  while (!store.getState().ctx.gameover) {
    if (++moves > MAX_MOVES) throw new Error(`game ${i} (${numPlayers}p) did not finish in ${MAX_MOVES} moves`);
    const { G, ctx } = store.getState();
    if (ctx.phase === 'chooseTickets') {
      const pid = Object.keys(G.players).find((p) => G.players[p].pending.length > 0)!;
      client.updatePlayerID(pid);
      client.moves.keepInitialTickets(G.players[pid].pending.slice(0, 2 + Math.floor(rnd() * 2)));
      continue;
    }
    const pid = ctx.currentPlayer;
    client.updatePlayerID(pid);
    const stage = ctx.activePlayers?.[pid];
    const before = JSON.stringify(store.getState().G);
    if (stage === 'secondDraw') {
      const faceUp = G.market.map((c, idx) => (c && c !== 'locomotive' ? idx : -1)).filter((x) => x >= 0);
      if (G.deck.length + G.discard.length > 0 && (faceUp.length === 0 || rnd() < 0.5)) client.moves.drawBlind();
      else client.moves.drawFaceUp(pick(faceUp));
    } else if (stage === 'chooseTickets') {
      client.moves.keepTickets(G.players[pid].pending.slice(0, 1 + Math.floor(rnd() * G.players[pid].pending.length)));
    } else {
      const la = legalActions(G, pid);
      const roll = rnd();
      if (la.pass) client.moves.pass();
      else if (la.claim.length && (roll < 0.55 || (!la.draw && !la.tickets))) {
        const r = pick(la.claim);
        client.moves.claimRoute(r, pick(paymentOptions(G.players[pid].hand, ROUTE_BY_ID[r])));
      } else if (la.draw && (roll < 0.93 || !la.tickets)) {
        const faceUp = G.market.map((c, idx) => (c ? idx : -1)).filter((x) => x >= 0);
        if (G.deck.length + G.discard.length > 0 && (faceUp.length === 0 || rnd() < 0.5)) client.moves.drawBlind();
        else client.moves.drawFaceUp(pick(faceUp));
      } else client.moves.drawTickets();
    }
    const after = store.getState().G;
    expect(JSON.stringify(after), `game ${i}: a chosen legal move was rejected`).not.toBe(before);
    expect(countCards(after)).toBe(112);
    for (const p of Object.values(after.players)) expect(p.trains).toBeGreaterThanOrEqual(0);
  }
  const { G } = store.getState();
  expect(G.result).not.toBeNull();
  return moves;
}
