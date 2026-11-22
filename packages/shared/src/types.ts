import type { MapId } from './map/model';

/** Seven colours (purple was removed so sets are easier to collect). */
export const CARD_COLORS = ['blue', 'orange', 'white', 'green', 'yellow', 'black', 'red'] as const;
export type CardColor = (typeof CARD_COLORS)[number];
export type Card = CardColor | 'locomotive';
export type RouteColor = CardColor | 'gray';
export const ALL_CARDS: readonly Card[] = [...CARD_COLORS, 'locomotive'];

export interface City {
  id: string;
  name: string;
  /** Chinese name, shown above the English one on the China map. */
  zh?: string;
  lon: number;
  lat: number;
  /** on-screen offset (map units) applied after projection, to untangle routes */
  nudge?: [number, number];
  /** label placement relative to the node ('tl' = above and to the left, 'bl' = below and to the left) */
  label: 't' | 'b' | 'l' | 'r' | 'tl' | 'bl';
  special?: boolean;
  hub?: boolean;
  /** hub only: where its name banner sits relative to the dot, and its size (default: [0, 64, 1], just below it) */
  banner?: [dx: number, dy: number, scale?: number];
}

export interface Route {
  id: string;
  a: string;
  b: string;
  length: 1 | 2 | 3 | 4 | 5 | 6;
  color: RouteColor;
  /** id of the parallel lane, for double routes */
  twin?: string;
  /** which lane of a double route: -1 or 1 (0 / undefined for singles) */
  lane?: -1 | 1;
  /** Drawn as a curve: a bend (fraction of the straight distance, + bows to the left going a->b on screen),
   *  or a smooth line through waypoints given as [lon, lat]. Both lanes of a double share it. */
  curve?: RouteCurve;
}

export type RouteCurve = number | { via: [number, number][] };

export interface Ticket {
  id: string;
  a: string;
  b: string;
  points: number;
}

export type Hand = Record<Card, number>;

export interface PlayerState {
  hand: Hand;
  tickets: string[];
  /** tickets dealt and awaiting a keep decision */
  pending: string[];
  trains: number;
  /** points from claimed routes */
  score: number;
  /** filled by playerView for opponents (hand/tickets hidden) */
  handCount?: number;
  ticketCount?: number;
  pendingCount?: number;
  /** private: the last card this player drew blind (stripped from opponents' views) */
  lastDrawn?: { card: Card; seq: number };
}

export type LogEntry =
  | { t: 'drawBlind'; p: string }
  | { t: 'drawFaceUp'; p: string; card: Card; slot: number }
  | { t: 'claim'; p: string; route: string; points: number }
  | { t: 'drawTickets'; p: string; n: number }
  | { t: 'tickets'; p: string; kept: number }
  | { t: 'pass'; p: string }
  | { t: 'redeal' }
  | { t: 'finalRound'; p: string };

export interface PlayerResult {
  routePoints: number;
  ticketPoints: number;
  completed: number;
  failed: number;
  longest: number;
  bonus: number;
  total: number;
  tickets: { id: string; done: boolean }[];
}

export interface FinalResult {
  players: Record<string, PlayerResult>;
  longest: number;
  winners: string[];
}

export interface GState {
  players: Record<string, PlayerState>;
  deck: Card[];
  discard: Card[];
  market: (Card | null)[];
  ticketDeck: string[];
  /** routeId -> playerID */
  claims: Record<string, string>;
  /** cards drawn so far this turn (0 or 1) */
  draws: number;
  finalRound: { triggeredBy: string; turnsLeft: number } | null;
  log: LogEntry[];
  result: FinalResult | null;
  numPlayers: number;
  /** seat ids in the order they take turns in the main phase: a random shuffle drawn during setup; the first one starts */
  turnOrder: string[];
  /** consecutive turns that ended in a pass; a full round of passes ends the game */
  passStreak: number;
  /** wall-clock ms when the game was set up / when final scoring happened (game timer) */
  startedAt: number;
  endedAt: number | null;
  /** the map this game is played on (set by setup; hand-built states without it use the default map) */
  mapId?: MapId;
  /** filled by playerView (deck order hidden) */
  deckCount?: number;
  discardCount?: number;
  ticketDeckCount?: number;
}
