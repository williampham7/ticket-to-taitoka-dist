import { CARD_COLORS, type Card, type GState, type Hand, type Route } from '../types';
import { ROUTE_BY_ID } from '../map';

export const ROUTE_POINTS = [0, 1, 2, 4, 7, 10, 15] as const;

/**
 * Ways the hand can pay for the route. A colour means "spend that colour first, top up with
 * locomotives"; 'locomotive' means "pay entirely with locomotives".
 */
export function paymentOptions(hand: Hand, route: Route): Card[] {
  const colours = route.color === 'gray' ? CARD_COLORS : [route.color];
  const opts: Card[] = colours.filter((c) => hand[c] >= 1 && hand[c] + hand.locomotive >= route.length);
  if (hand.locomotive >= route.length) opts.push('locomotive');
  return opts;
}

export function routeOpen(G: GState, routeId: string, playerID: string): boolean {
  const route = ROUTE_BY_ID[routeId];
  if (!route || G.claims[routeId] !== undefined) return false;
  // House rule (any player count): both tracks of a double route are usable, but one player may own only one.
  if (route.twin && G.claims[route.twin] === playerID) return false;
  return true;
}

export function canClaim(G: GState, playerID: string, routeId: string): boolean {
  const route = ROUTE_BY_ID[routeId];
  const p = G.players[playerID];
  return routeOpen(G, routeId, playerID) && p.trains >= route.length && paymentOptions(p.hand, route).length > 0;
}

export function claimRoute(G: GState, playerID: string, routeId: string, color: Card): 'ok' | 'invalid' {
  const route = ROUTE_BY_ID[routeId];
  if (!route || !routeOpen(G, routeId, playerID)) return 'invalid';
  const p = G.players[playerID];
  if (p.trains < route.length || !paymentOptions(p.hand, route).includes(color)) return 'invalid';

  const coloured = color === 'locomotive' ? 0 : Math.min(p.hand[color], route.length);
  const locos = route.length - coloured;
  if (color !== 'locomotive') p.hand[color] -= coloured;
  p.hand.locomotive -= locos;
  for (let i = 0; i < coloured; i++) G.discard.push(color);
  for (let i = 0; i < locos; i++) G.discard.push('locomotive');

  p.trains -= route.length;
  p.score += ROUTE_POINTS[route.length];
  G.claims[routeId] = playerID;
  G.log.push({ t: 'claim', p: playerID, route: routeId, points: ROUTE_POINTS[route.length] });
  return 'ok';
}
