/** Ticket evaluation: how much a set of destination tickets is worth to me, given my trains and the time left. */
import type { GState } from '../types';
import { TICKET_BY_ID } from '../map';
import { components, costGraph, planNetwork, ticketConnected, type CostGraph } from './plan';
import { handSize } from './view';

/** Trains an average player lays per turn (bots: ≈ 50 trains over ≈ 30 turns). */
export const TRAINS_PER_TURN = 1.6;
/** Cards an average draw turn yields. */
const CARDS_PER_DRAW = 1.9;

/** Turns I can still expect to play: the game ends a round after someone is down to ≤ 2 trains. */
export function turnsLeft(view: GState, me: string, rate = TRAINS_PER_TURN): number {
  if (view.finalRound) return 1;
  let low = Infinity;
  for (const [id, p] of Object.entries(view.players)) if (id !== me) low = Math.min(low, p.trains);
  const mine = view.players[me].trains;
  // I set my own pace, but I can't outlast my own train stock either
  const opp = low === Infinity ? mine : low;
  return Math.max(1, (Math.max(0, opp - 2) / rate) + 1);
}

/** Knobs of the ticket model (defaults are Medium's). */
export interface TicketModel {
  graph?: CostGraph;
  /** opponents' trains laid per turn, for the time left */
  rate?: number;
  /** completion risk per route still to claim */
  stepRisk?: number;
  /** points charged per train the set still needs */
  trainCost?: number;
}

export interface SetValue {
  value: number;
  trainsNeeded: number;
  feasible: number;
}

/**
 * Expected points of holding `kept` + `candidates`: completed tickets count in full, reachable ones by their
 * chance of completion (from trains and turns needed vs. available), unreachable or unaffordable ones as losses.
 */
export function evaluateTicketSetDetail(view: GState, me: string, keptIds: string[], candidateIds: string[], model: TicketModel = {}): SetValue {
  const ids = [...keptIds, ...candidateIds];
  const p = view.players[me];
  const g = model.graph ?? costGraph(view, me);
  const plan = planNetwork(view, me, ids, { graph: g, budget: p.trains });
  const comp = components(view, me);
  const cardsNeeded = Math.max(0, plan.trainsNeeded - 0.8 * Math.min(handSize(view, me), plan.trainsNeeded));
  const turnsNeeded = cardsNeeded / CARDS_PER_DRAW + plan.idx.size;
  const ratio = Math.max(plan.trainsNeeded / Math.max(1, p.trains), turnsNeeded / turnsLeft(view, me, model.rate));
  const feasible = Math.min(0.95, Math.max(0.05, 0.9 - 0.8 * (ratio - 0.5)));
  let value = 0;
  const lost = new Set([...plan.unreachable, ...plan.dropped]);
  for (const id of ids) {
    const pts = TICKET_BY_ID[id]?.points ?? 0;
    if (ticketConnected(comp, id)) { value += pts; continue; }
    if (lost.has(id)) { value -= pts; continue; }
    const steps = plan.perTicket.get(id)?.idx.length ?? 0;
    const q = feasible * (1 - (model.stepRisk ?? 0.02) * steps);
    value += (2 * q - 1) * pts;
  }
  // a little route value for trains the plan will turn into points anyway, so "all bad" sets still rank sensibly
  return { value: value - (model.trainCost ?? 0.15) * plan.trainsNeeded, trainsNeeded: plan.trainsNeeded, feasible };
}

export function evaluateTicketSet(view: GState, me: string, keptIds: string[], candidateIds: string[]): number {
  return evaluateTicketSetDetail(view, me, keptIds, candidateIds).value;
}

/** The subset of `pending` (at least `min`) that adds the most expected value to the tickets I already hold. */
export function bestKeep(
  view: GState,
  me: string,
  pending: string[],
  min: number,
  kept: string[] = view.players[me].tickets,
  perTicket = 0,
  model: TicketModel = {},
): string[] {
  const need = Math.min(min, pending.length);
  const m = { ...model, graph: model.graph ?? costGraph(view, me) };
  let best: string[] = pending.slice(0, need);
  let bestV = -Infinity;
  const n = pending.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = pending.filter((_, i) => mask & (1 << i));
    if (subset.length < need) continue;
    const v = evaluateTicketSetDetail(view, me, kept, subset, m).value + perTicket * subset.length;
    if (v > bestV + 1e-9) { bestV = v; best = subset; }
  }
  return best;
}
