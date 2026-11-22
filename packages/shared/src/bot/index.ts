import type { GState } from '../types';
import { legalActions, mapOfGame } from '../game';
import { paymentOptions } from '../engine/claim';
import { ROUTE_BY_ID, withMap } from '../map';
import { POLICIES } from './levels';
import { faceUpIndexes, pileCount } from './view';
import type { BotCtx, BotLevel, BotMove, BotStep, Rng } from './types';

export { BOT_LEVELS } from './types';
export type { BotLevel, BotMove, BotStep, BotCtx, Rng, Policy } from './types';

export function botStep(view: GState, ctx: BotCtx, me: string): BotStep | null {
  if (ctx.gameover || view.result) return null;
  const mine = view.players[me];
  if (!mine) return null;
  if (ctx.phase === 'chooseTickets') return mine.pending.length > 0 ? 'initialTickets' : null;
  const stage = ctx.activePlayers?.[me];
  if (stage === 'chooseTickets') return 'tickets';
  if (stage === 'secondDraw') return 'secondDraw';
  if (!stage && ctx.currentPlayer === me && !ctx.activePlayers?.[ctx.currentPlayer]) return 'turn';
  return null;
}

function legalKeep(ids: unknown, pending: string[], required: number): string[] {
  const need = Math.min(required, pending.length);
  if (Array.isArray(ids)) {
    const u = [...new Set(ids as string[])];
    if (u.length >= need && u.every((i) => pending.includes(i))) return u;
  }
  return pending.slice(0, need);
}

/** Safety net: replaces an illegal move with a legal one. */
export function legalize(move: BotMove, view: GState, step: BotStep, me: string, rng: Rng): BotMove {
  void rng;
  const pending = view.players[me].pending;
  if (step === 'initialTickets') return { move: 'keepInitialTickets', args: [legalKeep(move.move === 'keepInitialTickets' ? move.args[0] : null, pending, 2)] };
  if (step === 'tickets') return { move: 'keepTickets', args: [legalKeep(move.move === 'keepTickets' ? move.args[0] : null, pending, 1)] };

  const ups = faceUpIndexes(view, { allowLoco: step === 'turn' });
  const la = legalActions(view, me);
  const okDraw = (m: BotMove): boolean => {
    if (m.move === 'drawBlind') return pileCount(view) > 0;
    if (m.move === 'drawFaceUp') return ups.includes(m.args[0]);
    return false;
  };
  if (step === 'secondDraw') {
    if (okDraw(move)) return move;
    if (pileCount(view) > 0) return { move: 'drawBlind', args: [] };
    return { move: 'drawFaceUp', args: [ups[0]] };
  }
  if (move.move === 'claimRoute') {
    const [id, colour] = move.args;
    if (la.claim.includes(id) && paymentOptions(view.players[me].hand, ROUTE_BY_ID[id]).includes(colour)) return move;
  } else if (move.move === 'drawBlind' || move.move === 'drawFaceUp') {
    if (okDraw(move)) return move;
  } else if (move.move === 'drawTickets') {
    if ((view.ticketDeckCount ?? view.ticketDeck.length) > 0) return move;
  } else if (move.move === 'pass') {
    if (la.pass) return move;
  }
  if (la.claim.length) return { move: 'claimRoute', args: [la.claim[0], paymentOptions(view.players[me].hand, ROUTE_BY_ID[la.claim[0]])[0]] };
  if (pileCount(view) > 0) return { move: 'drawBlind', args: [] };
  if (ups.length) return { move: 'drawFaceUp', args: [ups[0]] };
  if ((view.ticketDeckCount ?? view.ticketDeck.length) > 0) return { move: 'drawTickets', args: [] };
  return { move: 'pass', args: [] };
}

/** The bot's move for this view (or null if it has nothing to do). Runs on the view's own map. */
export function chooseBotMove(view: GState, ctx: BotCtx, me: string, level: BotLevel, rng: Rng): BotMove | null {
  return withMap(mapOfGame(view), () => chooseHere(view, ctx, me, level, rng));
}

function chooseHere(view: GState, ctx: BotCtx, me: string, level: BotLevel, rng: Rng): BotMove | null {
  const step = botStep(view, ctx, me);
  if (!step) return null;
  const p = POLICIES[level];
  let m: BotMove;
  if (step === 'initialTickets') m = { move: 'keepInitialTickets', args: [p.keepInitial(view, me, rng)] };
  else if (step === 'tickets') m = { move: 'keepTickets', args: [p.keepTickets(view, me, rng)] };
  else m = step === 'secondDraw' ? p.secondDraw(view, me, rng) : p.turn(view, me, rng);
  return legalize(m, view, step, me, rng);
}
