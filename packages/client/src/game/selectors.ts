import {
  ALL_CARDS, CARD_COLORS, ROUTES, ROUTE_BY_ID, TICKET_BY_ID, buildPlayerGraph, canClaim, isTicketComplete, paymentOptions, ticketPath,
  type Card, type GState, type Hand, type Ticket,
} from '@boboland/shared';

export function claimableRoutes(G: GState, playerID: string): Set<string> {
  return new Set(ROUTES.filter((r) => canClaim(G, playerID, r.id)).map((r) => r.id));
}

export function paymentOptionsFor(G: GState, playerID: string, routeId: string): Card[] {
  return paymentOptions(G.players[playerID].hand, ROUTE_BY_ID[routeId]);
}

export interface TicketStatus { id: string; ticket: Ticket; done: boolean; path: string[] }
export function ticketStatus(G: GState, playerID: string): TicketStatus[] {
  const g = buildPlayerGraph(G, playerID);
  return G.players[playerID].tickets.map((id) => {
    const ticket = TICKET_BY_ID[id];
    return { id, ticket, done: isTicketComplete(g, ticket), path: ticketPath(g, ticket) };
  });
}

const pendingOf = (G: GState, p: string) => Math.max(G.players[p].pending.length, G.players[p].pendingCount ?? 0);

/** Which seat a shared (pass-and-play) screen should be showing. */
export function seatToShow(G: GState, ctx: { phase: string; currentPlayer: string }): string {
  if (ctx.phase === 'chooseTickets') {
    const waiting = Object.keys(G.players).find((p) => pendingOf(G, p) > 0);
    if (waiting) return waiting;
  }
  return ctx.currentPlayer;
}

export function handList(hand: Hand): [Card, number][] {
  return ALL_CARDS.filter((c) => hand[c] > 0).map((c) => [c, hand[c]]);
}

export const handSize = (hand: Hand) => Object.values(hand).reduce((s, n) => s + n, 0);

/** Where the viewing player is in the turn (for explaining refused actions). */
export interface Turn { phase: string; currentPlayer: string; stage?: string; over: boolean }
type Names = Record<string, string>;

function turnProblem(t: Turn, me: string, names: Names): string | null {
  if (t.over) return 'The game is over.';
  if (t.phase === 'chooseTickets') return 'Choose your destination tickets first.';
  if (t.currentPlayer !== me) return `It's ${names[t.currentPlayer] ?? 'another player'}'s turn.`;
  if (t.stage === 'chooseTickets') return 'Choose which tickets to keep first.';
  return null;
}
const SECOND = 'You already drew a card this turn. Take one more card to finish.';
const pile = (G: GState) => (G.deckCount ?? G.deck.length) + (G.discardCount ?? G.discard.length);

/** Plain-language reasons an action is refused; null when it is allowed. */
export const whyNot = {
  claim(G: GState, me: string, routeId: string, t: Turn, names: Names): string | null {
    const turn = turnProblem(t, me, names);
    if (turn) return turn;
    if (t.stage === 'secondDraw') return SECOND;
    const r = ROUTE_BY_ID[routeId];
    const owner = G.claims[routeId];
    if (owner === me) return 'You already own this route.';
    if (owner !== undefined) return `${names[owner] ?? 'Another player'} already claimed this route.`;
    if (r.twin && G.claims[r.twin] === me) return 'You already own the other track between these cities.';
    const p = G.players[me];
    if (p.trains < r.length) return `You only have ${p.trains} ${p.trains === 1 ? 'train' : 'trains'} left. This route needs ${r.length}.`;
    if (paymentOptions(p.hand, r).length === 0) {
      if (r.color === 'gray') {
        const best = Math.max(0, ...CARD_COLORS.map((c) => p.hand[c])) + p.hand.locomotive;
        return `You need ${r.length} cards of one colour (locomotives count). Your best set is ${best}.`;
      }
      return `You need ${r.length} ${r.color} cards (locomotives count). You have ${p.hand[r.color] + p.hand.locomotive}.`;
    }
    return null;
  },
  faceUp(G: GState, me: string, slot: number, t: Turn, names: Names): string | null {
    const turn = turnProblem(t, me, names);
    if (turn) return turn;
    const card = G.market[slot];
    if (!card) return 'That slot is empty.';
    if (t.stage === 'secondDraw' && card === 'locomotive') return "A face-up locomotive can't be your second card. Take another card or draw from the deck.";
    return null;
  },
  deck(G: GState, me: string, t: Turn, names: Names): string | null {
    const turn = turnProblem(t, me, names);
    if (turn) return turn;
    if (pile(G) === 0) return 'The deck is empty. Take a face-up card or claim a route.';
    return null;
  },
  tickets(G: GState, me: string, t: Turn, names: Names): string | null {
    const turn = turnProblem(t, me, names);
    if (turn) return turn;
    if (t.stage === 'secondDraw') return SECOND;
    if ((G.ticketDeckCount ?? G.ticketDeck.length) === 0) return 'No destination tickets are left.';
    return null;
  },
};

/** Players who have already taken their last turn of the final round (play order starts after the trigger). */
export function finalTurnsDone(finalRound: GState['finalRound'], turnOrder: string[]): string[] {
  if (!finalRound) return [];
  const n = turnOrder.length;
  const done = n - finalRound.turnsLeft;
  const t = turnOrder.indexOf(finalRound.triggeredBy);
  return Array.from({ length: done }, (_, i) => turnOrder[(t + 1 + i) % n]);
}
