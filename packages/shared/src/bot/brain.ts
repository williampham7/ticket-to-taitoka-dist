/**
 * The Medium/Hard decision maker. Medium: plan a ticket network, claim the most urgent planned route, draw what
 * the plan lacks, draw more tickets when done early, grab points at the end. Hard adds an opponent model
 * (blocking), a 1-ply look-ahead on claims, colour reading and end-game timing (see opponents.ts), and plays
 * with tuned prices (claims cost a whole turn, face-up locomotives are not worth a turn).
 */
import { CARD_COLORS, type Card, type CardColor, type GState, type Hand } from '../types';
import { ROUTES, TICKET_BY_ID } from '../map';
import { legalActions, type LegalActions } from '../game';
import { paymentOptions, ROUTE_POINTS } from '../engine/claim';
import type { BotMove, Policy, Rng } from './types';
import { faceUpIndexes, pileCount } from './view';
import {
  ADJ, LEN, RA, RB, ROUTE_INDEX, TWIN, citiesOf, colourNeeds, components, costGraph, longestTrailOf, planNetwork,
  recentOpponentColours, routeUrgency, ticketConnected, type CostGraph, type Plan,
} from './plan';
import { bestKeep, type TicketModel } from './tickets';
import { blockValues, estimateScores, modelOpponents } from './opponents';

export interface Tune {
  /** someone at or below this many trains = end game (no more tickets, cash in points) */
  endgameTrains: number;
  /** draw more tickets only with at least this many trains, and while every opponent has `ticketOther` */
  ticketTrains: number;
  ticketOther: number;
  /** may draw tickets before all are done when the open ones need at most this many more trains */
  ticketEarly: number;
  /** bonus per ticket kept (initial / mid-game choice) */
  keepInitialBonus: number;
  keepBonus: number;
  /** Hard: estimated lead that counts as clearly ahead / behind */
  aheadMargin: number;
  /** Hard: minimum value (points) of a block */
  blockMin: number;
  /** planning: how much cheaper long routes look (points per train) */
  longBias: number;
  /** planning: price of one claim turn, in trains */
  overhead: number;
  /** take a face-up locomotive (whole turn) when the plan lacks at least this many cards and no wanted colour shows */
  locoShort: number;
  /** take a face-up card only if I want its colour at least this much (gray fill ~0.8, coloured shortfall >= 1) */
  faceMin: number;
  /** ticket model: opponents' trains per turn, and completion risk per route still to claim */
  rate: number;
  stepRisk: number;
  /** ticket model: plan with my own prices (overhead etc.) instead of the plain ones */
  ownPrices: boolean;
  /** planning: how much cheaper a coloured route looks when my hand already covers it (fraction) */
  handDiscount: number;
  /** Hard: with all tickets done, not behind, and at most this many trains, spend the hand to end the game sooner */
  rushTrains: number;
  /** Hard rush: shortest route worth a turn */
  rushMin: number;
  /** Hard rush: only with an estimated lead of at least this much */
  rushLead: number;
  /** ticket model: points charged per train a ticket set still needs */
  trainCost: number;
  /** fallback targets: weight of how much of the route my hand already covers */
  targetHeld: number;
  /** fallback targets: how many routes to collect for */
  targetCount: number;
  /** Hard end game: give up a plan that can't be drawn for in time and cash in its trains */
  abandon: boolean;
  /** Hard: minimum block value in the end game (rivals have no time left to go round) */
  blockMinEnd: number;
}

export const DEFAULT_TUNE: Tune = {
  endgameTrains: 8, ticketTrains: 15, ticketOther: 12, ticketEarly: 0, keepInitialBonus: 0, keepBonus: 0,
  aheadMargin: 12, blockMin: 9, blockMinEnd: 9, longBias: 0, overhead: 0.6, handDiscount: 0.2, locoShort: 2,
  faceMin: 0, rate: 1.6, stepRisk: 0.02, trainCost: 0.15, ownPrices: false, rushTrains: 0, rushMin: 2,
  rushLead: -12, targetHeld: 3, targetCount: 2, abandon: false,
};

/**
 * Hard's settings, found by self-play against Medium (thousands of seeded games): a claim costs a whole turn
 * (so fewer, longer routes), a face-up locomotive is never worth a turn, ticket sets that turn more trains into
 * route points are worth more, and once its tickets are done with <= 25 trains left it lays long routes to end
 * the game before the opponents can use their trains.
 */
export const HARD_TUNE: Partial<Tune> = {
  overhead: 4, locoShort: 99, trainCost: -0.2, rushTrains: 25, rushMin: 4, rushLead: -Infinity, aheadMargin: 30, abandon: true,
};

export interface BrainOpts {
  /** chance of a harmless deviation (a blind draw instead of the best face-up card) */
  epsilon: number;
  hard: boolean;
  /** Hard's parts, switchable for tuning/ablation (all on by default) */
  off?: Partial<Record<'block' | 'look' | 'timing' | 'read' | 'trail', boolean>>;
  tune?: Partial<Tune>;
}

interface Ctx {
  view: GState;
  me: string;
  hand: Hand;
  trains: number;
  la: LegalActions;
  graph: CostGraph;
  plan: Plan;
  /** my tickets not yet connected */
  open: string[];
  comp: Int32Array;
  endgame: boolean;
  lastTurn: boolean;
  minOther: number;
  oppCities: Uint8Array;
  hoard: Partial<Record<CardColor, number>>;
  /** routes I am collecting cards for */
  targets: Set<number>;
  want: Record<CardColor, number>;
  shortfall: number;
  opts: BrainOpts;
  tune: Tune;
}

const zeroColours = () => Object.fromEntries(CARD_COLORS.map((c) => [c, 0])) as Record<CardColor, number>;

function analyse(view: GState, me: string, opts: BrainOpts, tune: Tune): Ctx {
  const mine = view.players[me];
  const hand = mine.hand;
  const trains = mine.trains;
  const comp = components(view, me);
  const open = mine.tickets.filter((id) => TICKET_BY_ID[id] && !ticketConnected(comp, id));
  const hoard = recentOpponentColours(view, me);
  let minOther = Infinity;
  let lowest = trains;
  const oppCities = new Uint8Array(comp.length);
  for (const [id, p] of Object.entries(view.players)) {
    lowest = Math.min(lowest, p.trains);
    if (id === me) continue;
    minOther = Math.min(minOther, p.trains);
    const c = citiesOf(view, id);
    for (let i = 0; i < c.length; i++) if (c[i]) oppCities[i] = 1;
  }
  const graph = costGraph(view, me, { hoard, longBias: tune.longBias, overhead: tune.overhead, handDiscount: tune.handDiscount });
  const plan = planNetwork(view, me, open, { graph, budget: trains });
  const ctx: Ctx = {
    view, me, hand, trains, la: legalActions(view, me), graph, plan, open, comp, hoard, oppCities, opts, tune,
    endgame: !!view.finalRound || lowest <= tune.endgameTrains,
    lastTurn: !!view.finalRound,
    minOther: minOther === Infinity ? trains : minOther,
    targets: plan.idx, want: zeroColours(), shortfall: 0,
  };
  if (!plan.idx.size) ctx.targets = fallbackTargets(ctx);
  computeWants(ctx);
  return ctx;
}

function hasMine(ctx: Ctx, city: number): boolean {
  for (const e of ADJ[city]) if (ctx.graph.owned[e]) return true;
  return false;
}

/** With no ticket work left: the long routes worth collecting for (points, plus joining my network). */
function fallbackTargets(ctx: Ctx): Set<number> {
  const { graph, trains, hand } = ctx;
  const minLen = Math.min(4, trains);
  const scored: [number, number][] = [];
  for (let i = 0; i < LEN.length; i++) {
    if (graph.owned[i] || graph.cost[i] === Infinity || LEN[i] > trains || LEN[i] < minLen) continue;
    const c = ROUTES[i].color;
    const held = c === 'gray' ? Math.max(...CARD_COLORS.map((k) => hand[k])) : hand[c];
    const touches = hasMine(ctx, RA[i]) || hasMine(ctx, RB[i]);
    scored.push([i, ROUTE_POINTS[LEN[i]] + (touches ? 3 : 0) + ctx.tune.targetHeld * Math.min(1, held / LEN[i])]);
  }
  scored.sort((x, y) => y[1] - x[1]);
  return new Set(scored.slice(0, ctx.tune.targetCount).map(([i]) => i));
}

/** How much I want one more card of each colour, given what the target routes still lack. */
function computeWants(ctx: Ctx): void {
  const { hand, view } = ctx;
  const { need, gray } = colourNeeds(ctx.targets);
  const want = zeroColours();
  const spare = zeroColours();
  let short = 0;
  for (const c of CARD_COLORS) {
    spare[c] = hand[c] - need[c];
    if (spare[c] < 0) {
      short += -spare[c];
      want[c] = 1 + 0.1 * -spare[c];
    }
  }
  const inMarket = (c: CardColor) => view.market.filter((m) => m === c).length;
  for (const L of gray) {
    // fill a gray route with the colour I have most to spare (and can see in the market)
    let best: CardColor = CARD_COLORS[0];
    for (const c of CARD_COLORS) if (spare[c] + 0.3 * inMarket(c) > spare[best] + 0.3 * inMarket(best)) best = c;
    const lack = L - Math.max(0, spare[best]);
    if (lack > 0) {
      short += lack;
      want[best] = Math.max(want[best], 0.8 + 0.05 * lack);
    }
    spare[best] -= L;
  }
  ctx.want = want;
  ctx.shortfall = Math.max(0, short - hand.locomotive);
}

function draw(ctx: Ctx, first: boolean, rng: Rng): BotMove {
  const { view, want } = ctx;
  let best = -1;
  let bestW = 0;
  view.market.forEach((c, i) => {
    if (!c || c === 'locomotive') return;
    if (want[c] > bestW && want[c] >= ctx.tune.faceMin) { bestW = want[c]; best = i; }
  });
  const pile = pileCount(view);
  const deviate = ctx.opts.epsilon > 0 && rng() < ctx.opts.epsilon && pile > 0;
  if (best >= 0 && !deviate) return { move: 'drawFaceUp', args: [best] };
  if (first && best < 0 && ctx.shortfall >= ctx.tune.locoShort) {
    const loco = view.market.indexOf('locomotive');
    if (loco >= 0) return { move: 'drawFaceUp', args: [loco] };
  }
  if (pile > 0) return { move: 'drawBlind', args: [] };
  const any = faceUpIndexes(view, { allowLoco: first });
  return { move: 'drawFaceUp', args: [best >= 0 ? best : any[0] ?? 0] };
}

/** Damage to the rest of my hand from paying with `opt`: locomotives are dear, then cards other targets need. */
function payDamage(ctx: Ctx, routeIdx: number, opt: Card, needOther: Record<CardColor, number>): number {
  const len = LEN[routeIdx];
  const { hand } = ctx;
  if (opt === 'locomotive') return len * 2.5;
  const spent = Math.min(hand[opt], len);
  const locos = len - spent;
  const spare = Math.max(0, hand[opt] - needOther[opt]);
  return locos * 2.5 + Math.max(0, spent - spare) - 0.01 * hand[opt];
}

function payment(ctx: Ctx, routeIdx: number): { card: Card; damage: number } {
  const opts = paymentOptions(ctx.hand, ROUTES[routeIdx]);
  const rest = [...ctx.targets].filter((i) => i !== routeIdx && i !== TWIN[routeIdx]);
  const { need } = colourNeeds(rest);
  let best: Card = opts[0];
  let bestD = Infinity;
  for (const o of opts) {
    const d = payDamage(ctx, routeIdx, o, need);
    if (d < bestD) { bestD = d; best = o; }
  }
  return { card: best, damage: bestD === Infinity ? 0 : bestD };
}

const claim = (ctx: Ctx, routeIdx: number): BotMove => ({ move: 'claimRoute', args: [ROUTES[routeIdx].id, payment(ctx, routeIdx).card] });

/** Points of open tickets this route would complete. */
function completes(ctx: Ctx, routeIdx: number): number {
  if (!ctx.open.length) return 0;
  const comp = components(ctx.view, ctx.me, [routeIdx]);
  let pts = 0;
  for (const id of ctx.open) if (ticketConnected(comp, id)) pts += TICKET_BY_ID[id].points;
  return pts;
}

function contested(ctx: Ctx, routeIdx: number): number {
  const c = ROUTES[routeIdx].color;
  const near = ctx.oppCities[RA[routeIdx]] || ctx.oppCities[RB[routeIdx]];
  const hoarded = c === 'gray' ? 0 : Math.min(2, ctx.hoard[c] ?? 0);
  // Hard reads colours harder: a hoarded colour next to an opponent's network means a claim is coming.
  const read = ctx.opts.hard && !ctx.opts.off?.read ? (near ? 0.35 : 0.1) : 0.2;
  return 1 + (near ? 0.5 : 0) + read * hoarded;
}

/** Medium's score for a planned route: what losing it would cost x how contested it is + its points. */
function plannedScore(ctx: Ctx, routeIdx: number): number {
  const urg = routeUrgency(ctx.view, ctx.me, ROUTES[routeIdx].id, ctx.plan);
  const done = completes(ctx, routeIdx);
  return urg * contested(ctx, routeIdx) + ROUTE_POINTS[LEN[routeIdx]] + done * (ctx.endgame ? 1 : 0.3);
}

function argmax<T>(xs: T[], f: (x: T) => number): { x: T; v: number } | null {
  let best: { x: T; v: number } | null = null;
  for (const x of xs) {
    const v = f(x);
    if (!best || v > best.v) best = { x, v };
  }
  return best;
}

const idxOf = (ids: string[]) => ids.map((id) => ROUTE_INDEX.get(id)).filter((i): i is number => i !== undefined);

/** Last turn: whatever scores most right now (completing a ticket flips it from minus to plus). */
function lastTurnMove(ctx: Ctx, rng: Rng): BotMove {
  const best = argmax(idxOf(ctx.la.claim), (i) => ROUTE_POINTS[LEN[i]] + 2 * completes(ctx, i));
  if (best) return claim(ctx, best.x);
  return draw(ctx, true, rng);
}

/** Spend trains for points without touching what the plan still needs. */
function pointsClaim(ctx: Ctx, minLen: number): number | null {
  const spare = ctx.trains - ctx.plan.trainsNeeded;
  const cands = idxOf(ctx.la.claim).filter((i) => !ctx.plan.idx.has(i) && LEN[i] <= spare && LEN[i] >= minLen);
  const best = argmax(cands, (i) => ROUTE_POINTS[LEN[i]] + (hasMine(ctx, RA[i]) || hasMine(ctx, RB[i]) ? 0.5 : 0) - 0.1 * payment(ctx, i).damage);
  return best ? best.x : null;
}

/** Time for more tickets: nothing (or almost nothing) left to build, trains to spare, nobody close to the end. */
function wantTickets(ctx: Ctx, trains: number, other: number): boolean {
  if (ctx.endgame || !ctx.la.tickets) return false;
  const left = ctx.plan.idx.size ? ctx.plan.trainsNeeded : 0;
  if (left > ctx.tune.ticketEarly) return false;
  return ctx.trains - left >= trains && ctx.minOther >= other;
}

function mediumTurn(ctx: Ctx, rng: Rng): BotMove {
  if (ctx.lastTurn) return lastTurnMove(ctx, rng);
  const cands = idxOf(ctx.la.claim);
  const planned = cands.filter((i) => ctx.plan.idx.has(i));
  const best = argmax(planned, (i) => plannedScore(ctx, i));
  if (best) return claim(ctx, best.x);
  if (ctx.endgame) {
    const p = pointsClaim(ctx, ctx.plan.idx.size ? 1 : Math.min(2, ctx.trains));
    if (p !== null) return claim(ctx, p);
  }
  if (wantTickets(ctx, ctx.tune.ticketTrains, ctx.tune.ticketOther)) return { move: 'drawTickets', args: [] };
  if (!ctx.plan.idx.size) {
    const p = pointsClaim(ctx, Math.min(4, ctx.trains));
    if (p !== null) return claim(ctx, p);
  }
  return draw(ctx, true, rng);
}

// ---------------------------------------------------------------- Hard

/** Remaining cost of the plan in train-ish units; lost tickets weigh double their points. */
function planPenalty(plan: Plan): number {
  let s = 0;
  for (const i of plan.idx) s += plan.graph.cost[i];
  for (const id of [...plan.unreachable, ...plan.dropped]) s += 2 * TICKET_BY_ID[id].points;
  return s;
}

function afterClaim(ctx: Ctx, routeIdx: number): GState {
  const { view, me } = ctx;
  const mine = view.players[me];
  return { ...view, claims: { ...view.claims, [ROUTES[routeIdx].id]: me }, players: { ...view.players, [me]: { ...mine, trains: mine.trains - LEN[routeIdx] } } };
}

/** 1-ply look-ahead: my points + how much the re-planned network improves + longest-trail gain - hand damage. */
function lookahead(ctx: Ctx, routeIdx: number, before: number, race: { mine: number; best: number } | null): number {
  const v2 = afterClaim(ctx, routeIdx);
  const g2 = costGraph(v2, ctx.me, { hoard: ctx.hoard, longBias: ctx.tune.longBias, overhead: ctx.tune.overhead, handDiscount: ctx.tune.handDiscount });
  const plan2 = planNetwork(v2, ctx.me, ctx.open, { graph: g2, budget: ctx.trains - LEN[routeIdx] });
  let v = ROUTE_POINTS[LEN[routeIdx]] + 0.8 * (before - planPenalty(plan2)) - 0.6 * payment(ctx, routeIdx).damage;
  if (race) {
    const gain = longestTrailOf(ctx.view, ctx.me, ROUTES[routeIdx].id) - race.mine;
    // only worth chasing when the race for the longest path is close
    if (gain > 0 && race.mine + gain >= race.best - 6) v += Math.min(10, gain * 0.8);
  }
  return v;
}

function hardTurn(ctx: Ctx, rng: Rng): BotMove {
  if (ctx.lastTurn) return lastTurnMove(ctx, rng);
  const { view, me } = ctx;
  const off = ctx.opts.off ?? {};
  const models = modelOpponents(view, me);
  const myTrail = longestTrailOf(view, me);
  const est = estimateScores(view, me, models, ctx.plan, ctx.comp, myTrail);
  const lead = est.mine - est.bestOther;
  const cands = idxOf(ctx.la.claim);
  const planned = cands.filter((i) => ctx.plan.idx.has(i));
  const before = planPenalty(ctx.plan);
  const race = !off.trail && (ctx.endgame || !ctx.plan.idx.size) ? { mine: myTrail, best: est.bestOtherTrail } : null;

  // own claims: Medium's urgency score on all, refined by the look-ahead on the top few
  const ranked = planned.map((i) => ({ i, s: plannedScore(ctx, i) })).sort((a, b) => b.s - a.s).slice(0, 5);
  let bestOwn: { i: number; v: number } | null = null;
  for (const { i, s } of ranked) {
    const v = s + (off.look ? 0 : 0.5 * lookahead(ctx, i, before, race));
    if (!bestOwn || v > bestOwn.v) bestOwn = { i, v };
  }

  // blocking: an open route on a rival's likely path, cheap for me, that my plan can spare the trains for
  const blocks = off.block ? new Map<number, number>() : blockValues(view, me, models, est);
  const spareTrains = ctx.trains - ctx.plan.trainsNeeded;
  let bestBlock: { i: number; v: number } | null = null;
  for (const [i, bv] of blocks) {
    if (!cands.includes(i) || LEN[i] > spareTrains) continue;
    const v = bv + ROUTE_POINTS[LEN[i]] - 2.5 * Math.max(0, LEN[i] - 3) - 0.6 * payment(ctx, i).damage + (ctx.plan.idx.has(i) ? plannedScore(ctx, i) : 0);
    if (!bestBlock || v > bestBlock.v) bestBlock = { i, v };
  }
  const blockMin = ctx.endgame ? ctx.tune.blockMinEnd : ctx.tune.blockMin;
  if (bestBlock && bestBlock.v >= blockMin && (!bestOwn || bestBlock.v > bestOwn.v + 2)) return claim(ctx, bestBlock.i);
  if (bestOwn) return claim(ctx, bestOwn.i);

  const ahead = !off.timing && lead >= ctx.tune.aheadMargin;
  const behind = !off.timing && lead <= -ctx.tune.aheadMargin;
  // don't pull the trigger (<= 2 trains) while behind
  const safe = (i: number) => !behind || ctx.trains - LEN[i] > 2;
  if (ctx.endgame) {
    // if the plan can't be drawn for in the turns left, its trains are better spent on points now
    const turns = Math.max(1, Math.floor((ctx.minOther - 2) / 4) + 1);
    const hopeless = ctx.tune.abandon && ctx.shortfall > 2 * turns;
    const spare = ctx.trains - (hopeless ? 0 : ctx.plan.trainsNeeded);
    const minLen = ctx.plan.idx.size && !hopeless ? 1 : Math.min(2, ctx.trains);
    const opts = cands.filter((i) => !ctx.plan.idx.has(i) && LEN[i] <= spare && LEN[i] >= minLen && safe(i));
    const b = argmax(opts, (i) => (race ? lookahead(ctx, i, before, race) : ROUTE_POINTS[LEN[i]]));
    if (b) return claim(ctx, b.x);
  }
  if (!ctx.plan.idx.size && !off.timing && lead >= ctx.tune.rushLead && ctx.trains <= ctx.tune.rushTrains) {
    // rush: cash in the hand now, the end comes before the opponents can use their trains
    const opts = cands.filter((i) => LEN[i] >= Math.min(ctx.tune.rushMin, ctx.trains));
    const b = argmax(opts, (i) => ROUTE_POINTS[LEN[i]] - 0.3 * payment(ctx, i).damage);
    if (b) return claim(ctx, b.x);
  }
  if (wantTickets(ctx, ctx.tune.ticketTrains - (behind ? 3 : 0), ctx.tune.ticketOther - (behind ? 2 : 0))) {
    return { move: 'drawTickets', args: [] };
  }
  if (!ctx.plan.idx.size) {
    // ahead: burn trains on big routes to end it sooner
    const minLen = Math.min(ahead ? 3 : 4, ctx.trains);
    const opts = cands.filter((i) => LEN[i] >= minLen && safe(i));
    const b = argmax(opts, (i) => lookahead(ctx, i, before, race));
    if (b) return claim(ctx, b.x);
  }
  return draw(ctx, true, rng);
}

function ticketModel(view: GState, me: string, tune: Tune): TicketModel {
  const graph = tune.ownPrices ? costGraph(view, me, { longBias: tune.longBias, overhead: tune.overhead, handDiscount: tune.handDiscount }) : undefined;
  return { graph, rate: tune.rate, stepRisk: tune.stepRisk, trainCost: tune.trainCost };
}

export function makePolicy(opts: BrainOpts): Policy {
  const tune: Tune = { ...DEFAULT_TUNE, ...opts.tune };
  return {
    keepInitial: (v, me) => bestKeep(v, me, v.players[me].pending, 2, [], tune.keepInitialBonus, ticketModel(v, me, tune)),
    keepTickets: (v, me) => bestKeep(v, me, v.players[me].pending, 1, v.players[me].tickets, tune.keepBonus, ticketModel(v, me, tune)),
    secondDraw: (v, me, rng) => draw(analyse(v, me, opts, tune), false, rng),
    turn(v, me, rng) {
      const ctx = analyse(v, me, opts, tune);
      return opts.hard ? hardTurn(ctx, rng) : mediumTurn(ctx, rng);
    },
  };
}
