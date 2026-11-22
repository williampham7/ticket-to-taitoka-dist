import type { Card, GState } from '../../types';
import { ROUTE_BY_ID, TICKET_BY_ID } from '../../map';
import { legalActions } from '../../game';
import { paymentOptions } from '../../engine/claim';
import type { BotMove, Policy, Rng } from '../types';
import { faceUpIndexes, hopPath, myTickets, ticketDone } from '../view';

const pts = (id: string) => TICKET_BY_ID[id].points;
const byPoints = (ids: string[]) => [...ids].sort((a, b) => pts(a) - pts(b));
const pick = <T,>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

function wantedRoutes(v: GState, me: string): string[] {
  const out = new Set<string>();
  for (const t of myTickets(v, me)) {
    if (ticketDone(v, me, t.id)) continue;
    for (const id of hopPath(v, me, t.a, t.b) ?? []) out.add(id);
  }
  return [...out];
}

/** The colour held most (non-locomotive first). */
function bestPayment(v: GState, me: string, routeId: string): Card {
  const hand = v.players[me].hand;
  const opts = paymentOptions(hand, ROUTE_BY_ID[routeId]);
  const coloured = opts.filter((c) => c !== 'locomotive').sort((a, b) => hand[b] - hand[a]);
  return coloured[0] ?? opts[0];
}

function draw(v: GState, me: string, rng: Rng, allowLoco: boolean): BotMove {
  const ups = faceUpIndexes(v, { allowLoco });
  const wanted = wantedRoutes(v, me).map((id) => ROUTE_BY_ID[id]);
  const good = ups.filter((i) => {
    const c = v.market[i]!;
    return c !== 'locomotive' && wanted.some((r) => r.color === 'gray' || r.color === c);
  });
  if (good.length) return { move: 'drawFaceUp', args: [good[0]] };
  const loco = ups.find((i) => v.market[i] === 'locomotive');
  if (allowLoco && loco !== undefined && rng() < 0.5) return { move: 'drawFaceUp', args: [loco] };
  return { move: 'drawBlind', args: [] };
}

export const easy: Policy = {
  keepInitial: (v, me, rng) =>
    rng() < 0.2 ? [...v.players[me].pending].sort(() => rng() - 0.5).slice(0, 2) : byPoints(v.players[me].pending).slice(0, 2),
  keepTickets: (v, me) => byPoints(v.players[me].pending).slice(0, 1),
  secondDraw: (v, me, rng) => draw(v, me, rng, false),
  turn(v, me, rng) {
    const la = legalActions(v, me);
    const trains = v.players[me].trains;
    const claim = (id: string): BotMove => ({ move: 'claimRoute', args: [id, bestPayment(v, me, id)] });
    const affordable = la.claim;
    if (trains <= 6 && affordable.length) return claim(pick(affordable, rng));
    const wanted = wantedRoutes(v, me)
      .filter((id) => affordable.includes(id))
      .sort((a, b) => ROUTE_BY_ID[b].length - ROUTE_BY_ID[a].length);
    if (affordable.length && rng() < 0.25) return claim(pick(affordable, rng));
    if (wanted.length) return claim(wanted[0]);
    const allDone = myTickets(v, me).every((t) => ticketDone(v, me, t.id));
    if (allDone && trains > 12 && la.tickets && rng() < 0.3) return { move: 'drawTickets', args: [] };
    return draw(v, me, rng, true);
  },
};
