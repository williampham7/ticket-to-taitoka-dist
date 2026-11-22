import type { Game, Move } from 'boardgame.io';
import { ActivePlayers, INVALID_MOVE } from 'boardgame.io/core';
import type { Card, GState, PlayerState } from './types';
import { DEFAULT_MAP_ID, ROUTES, isMapId, withMap, type MapId } from './map';
import { takeBlind, takeFaceUp } from './engine/deck';
import { canClaim, claimRoute as claim } from './engine/claim';
import { dealTickets, keepTickets as keep } from './engine/tickets';
import { INITIAL_TICKETS, createInitialState, emptyHand } from './engine/state';
import { finalScore } from './engine/scoring';

export const GAME_NAME = 'boboland';
export const TICKETS_PER_DRAW = 3;

export interface LegalActions {
  draw: boolean;
  claim: string[];
  tickets: boolean;
  pass: boolean;
}

/** The map a game state belongs to (states without one, e.g. hand-built in tests, use the default map). */
export const mapOfGame = (G: Pick<GState, 'mapId'> | null | undefined): MapId => G?.mapId ?? DEFAULT_MAP_ID;

/** Run `fn` (synchronously) on the map of this game state or player view. */
export const withGameMap = <T>(G: Pick<GState, 'mapId'> | null | undefined, fn: () => T): T => withMap(mapOfGame(G), fn);

/** setupData a match may be created with. `map` picks the map (default: the startup map). */
export interface SetupData {
  map?: MapId;
}

export function validateSetupData(setupData: unknown): string | undefined {
  if (setupData === undefined || setupData === null) return undefined;
  if (typeof setupData !== 'object' || Array.isArray(setupData)) return 'setupData must be an object';
  const map = (setupData as { map?: unknown }).map;
  if (map !== undefined && !isMapId(map)) return `unknown map: ${String(map)}`;
  return undefined;
}

const setupMap = (setupData: unknown): MapId =>
  validateSetupData(setupData) === undefined ? (setupData as SetupData | undefined)?.map ?? DEFAULT_MAP_ID : DEFAULT_MAP_ID;

/** What the player may start a turn with. Works on full state and on a player view (uses the counts). */
export function legalActions(G: GState, playerID: string): LegalActions {
  return withMap(mapOfGame(G), () => legalActionsHere(G, playerID));
}

function legalActionsHere(G: GState, playerID: string): LegalActions {
  const pile = (G.deckCount ?? G.deck.length) + (G.discardCount ?? G.discard.length);
  const draw = pile > 0 || G.market.some((c) => c !== null);
  const tickets = (G.ticketDeckCount ?? G.ticketDeck.length) > 0;
  const claimable = ROUTES.filter((r) => canClaim(G, playerID, r.id)).map((r) => r.id);
  return { draw, claim: claimable, tickets, pass: !draw && !tickets && claimable.length === 0 };
}

type Events = { endTurn: () => void; setStage: (s: string) => void };
const afterDraw = (result: string, events: Events) => {
  if (result === 'invalid') return INVALID_MOVE;
  if (result === 'endsTurn') events.endTurn();
  else events.setStage('secondDraw');
};

const drawBlind: Move<GState> = {
  move: ({ G, playerID, events, random }) => afterDraw(takeBlind(G, playerID, random.Shuffle), events),
  client: false,
};

const drawFaceUp: Move<GState> = {
  move: ({ G, playerID, events, random }, index: number) => afterDraw(takeFaceUp(G, playerID, index, random.Shuffle), events),
  client: false,
};

const claimRoute: Move<GState> = {
  move: ({ G, playerID, events }, routeId: string, color: Card) => {
    if (claim(G, playerID, routeId, color) === 'invalid') return INVALID_MOVE;
    G.passStreak = 0;
    events.endTurn();
  },
  client: false,
};

const drawTickets: Move<GState> = {
  move: ({ G, playerID, events }) => {
    if (G.ticketDeck.length === 0) return INVALID_MOVE;
    const dealt = dealTickets(G, playerID, TICKETS_PER_DRAW);
    G.log.push({ t: 'drawTickets', p: playerID, n: dealt.length });
    events.setStage('chooseTickets');
  },
  client: false,
};

const keepTickets: Move<GState> = {
  move: ({ G, playerID, events }, ids: string[]) => {
    if (keep(G, playerID, ids, 1) === 'invalid') return INVALID_MOVE;
    G.log.push({ t: 'tickets', p: playerID, kept: ids.length });
    G.passStreak = 0;
    events.endTurn();
  },
  client: false,
};

const pass: Move<GState> = {
  move: ({ G, playerID, events }) => {
    if (!legalActions(G, playerID).pass) return INVALID_MOVE;
    G.log.push({ t: 'pass', p: playerID });
    G.passStreak += 1;
    events.endTurn();
  },
  client: false,
};

const keepInitialTickets: Move<GState> = {
  move: ({ G, playerID }, ids: string[]) => {
    if (G.players[playerID].pending.length === 0) return INVALID_MOVE;
    if (keep(G, playerID, ids, 2) === 'invalid') return INVALID_MOVE;
  },
  client: false,
};

function hidePlayer(p: PlayerState): PlayerState {
  return {
    ...p,
    hand: emptyHand(),
    tickets: [],
    pending: [],
    lastDrawn: undefined,
    handCount: Object.values(p.hand).reduce((s, n) => s + n, 0),
    ticketCount: p.tickets.length,
    pendingCount: p.pending.length,
  };
}

const rawGame: Game<GState, Record<string, unknown>, SetupData> = {
  name: GAME_NAME,
  minPlayers: 2,
  maxPlayers: 5,

  validateSetupData: (setupData) => validateSetupData(setupData),

  setup: ({ ctx, random }, setupData) => {
    const G = createInitialState(ctx.numPlayers, random.Shuffle);
    // drawn after the card shuffles, so a seed deals the same cards as before: who starts and who follows whom
    G.turnOrder = random.Shuffle(Array.from({ length: ctx.numPlayers }, (_, i) => String(i)));
    G.mapId = setupMap(setupData);
    return G;
  },

  playerView: ({ G, ctx, playerID }) => {
    const reveal = G.result !== null;
    // While starting tickets are chosen, nobody learns how many anyone else kept: no ticket counts, and the
    // ticket deck count is shown as dealt (before tickets returned under it). Both show once everyone has chosen.
    const choosing = ctx?.phase === 'chooseTickets';
    const players: Record<string, PlayerState> = {};
    let returned = 0;
    for (const [id, p] of Object.entries(G.players)) {
      if (p.pending.length === 0 && p.tickets.length > 0) returned += Math.max(0, INITIAL_TICKETS - p.tickets.length);
      if (id === playerID || reveal) players[id] = { ...p, pendingCount: p.pending.length };
      else players[id] = choosing ? { ...hidePlayer(p), ticketCount: undefined } : hidePlayer(p);
    }
    return {
      ...G,
      players,
      deck: [],
      discard: [],
      ticketDeck: [],
      deckCount: G.deck.length,
      discardCount: G.discard.length,
      ticketDeckCount: choosing && !reveal ? G.ticketDeck.length - returned : G.ticketDeck.length,
    };
  },

  phases: {
    chooseTickets: {
      start: true,
      turn: { activePlayers: ActivePlayers.ALL },
      moves: { keepInitialTickets },
      endIf: ({ G }) => Object.values(G.players).every((p) => p.pending.length === 0),
      next: 'main',
    },
    main: {
      moves: { drawBlind, drawFaceUp, claimRoute, drawTickets, pass },
      turn: {
        order: {
          playOrder: ({ G, ctx }) => G.turnOrder ?? ctx.playOrder,
          first: () => 0,
          next: ({ ctx }) => (ctx.playOrderPos + 1) % ctx.numPlayers,
        },
        stages: {
          secondDraw: { moves: { drawBlind, drawFaceUp } },
          chooseTickets: { moves: { keepTickets } },
        },
        onEnd: ({ G, ctx }) => {
          G.draws = 0;
          const pid = ctx.currentPlayer;
          if (G.finalRound) {
            G.finalRound.turnsLeft -= 1;
            if (G.finalRound.turnsLeft <= 0) G.result = finalScore(G);
          } else if (G.players[pid].trains <= 2) {
            G.finalRound = { triggeredBy: pid, turnsLeft: ctx.numPlayers };
            G.log.push({ t: 'finalRound', p: pid });
          }
          // Nobody can do anything for a whole round: end rather than loop forever.
          if (!G.result && G.passStreak >= ctx.numPlayers) G.result = finalScore(G);
          if (G.result && G.endedAt === null) G.endedAt = Date.now();
        },
      },
    },
  },

  endIf: ({ G }) => (G.result ? { winners: G.result.winners } : undefined),
};

// ---- every hook runs on its game's map ----------------------------------------------------------
// One server runs games on different maps. boardgame.io hooks are synchronous and Node is single-threaded,
// so switching the map around each hook call is safe.

type AnyFn = (...args: any[]) => any;
/** A hook whose first argument carries `G`, run on G's map. */
const onMap = <F extends AnyFn | undefined>(fn: F): F =>
  (fn && ((arg: { G?: GState }, ...rest: unknown[]) => withGameMap(arg?.G, () => fn(arg, ...rest)))) as F;

function bindMoves(moves: Record<string, any> | undefined) {
  if (!moves) return moves;
  return Object.fromEntries(
    Object.entries(moves).map(([k, m]) => [k, typeof m === 'function' ? onMap(m) : { ...m, move: onMap(m.move) }]),
  );
}

function bindTurn(turn: Record<string, any> | undefined) {
  if (!turn) return turn;
  const out = { ...turn };
  for (const k of ['onBegin', 'onEnd', 'endIf', 'onMove']) if (typeof out[k] === 'function') out[k] = onMap(out[k]);
  if (out.order) {
    out.order = { ...out.order };
    for (const k of ['first', 'next', 'playOrder']) if (typeof out.order[k] === 'function') out.order[k] = onMap(out.order[k]);
  }
  if (out.stages) {
    out.stages = Object.fromEntries(Object.entries(out.stages as Record<string, any>).map(([k, st]) => [k, { ...st, moves: bindMoves(st.moves) }]));
  }
  return out;
}

/** Wraps every hook of a game (setup, moves, playerView, phases, turn order, endIf...) in `withMap(G.mapId, ...)`. */
export function bindMap<S extends SetupData>(game: Game<GState, Record<string, unknown>, S>): Game<GState, Record<string, unknown>, S> {
  const out: Record<string, any> = { ...game };
  if (game.setup) {
    const setup = game.setup;
    out.setup = (api: any, setupData?: S) => withMap(setupMap(setupData), () => setup(api, setupData));
  }
  for (const k of ['playerView', 'endIf', 'onEnd']) if (typeof out[k] === 'function') out[k] = onMap(out[k]);
  out.moves = bindMoves(out.moves);
  out.turn = bindTurn(out.turn);
  if (out.phases) {
    out.phases = Object.fromEntries(
      Object.entries(out.phases as Record<string, any>).map(([k, ph]) => {
        const p = { ...ph, moves: bindMoves(ph.moves), turn: bindTurn(ph.turn) };
        for (const h of ['onBegin', 'onEnd', 'endIf']) if (typeof p[h] === 'function') p[h] = onMap(p[h]);
        return [k, p];
      }),
    );
  }
  return out as Game<GState, Record<string, unknown>, S>;
}

export const BobolandGame: Game<GState> = bindMap(rawGame) as Game<GState>;
