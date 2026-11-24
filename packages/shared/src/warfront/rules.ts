import { ADJ, CONTINENTS, CONT_TERRS, TERRITORY_IDS, adjacent } from './map';
import { BASE_MISSIONS, DECK, TERRITORY_BONUS, isSet, tradeValue, type Card, type Mission } from './cards';

/**
 * Warfront rules engine (pure, mutating). Follows the classic territory-conquest board game:
 * claim, place, then turns of Reinforce -> Attack -> Fortify, cards traded in escalating sets.
 */
export type PlayerID = string;
export const NEUTRAL = 'N';
export type Mode = 'domination' | 'mission';
export type Stage = 'claim' | 'place' | 'reinforce' | 'attack' | 'occupy' | 'fortify' | 'over';

export const START_ARMIES: Record<number, number> = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
const LOG_MAX = 140;

export interface Roll { att: number[]; def: number[] }
export interface Battle { seq: number; p: PlayerID; d: PlayerID; from: string; to: string; rolls: Roll[]; attLoss: number; defLoss: number; conquered: boolean; blitz: boolean }
export type LogEvent =
  | { k: 'turn'; p: PlayerID; round: number }
  | { k: 'trade'; p: PlayerID; armies: number; bonus?: string }
  | { k: 'deploy'; p: PlayerID; n: number }
  | { k: 'battle'; p: PlayerID; d: PlayerID; from: string; to: string; attLoss: number; defLoss: number; conquered: boolean }
  | { k: 'move'; p: PlayerID; from: string; to: string; n: number; fortify: boolean }
  | { k: 'card'; p: PlayerID }
  | { k: 'eliminate'; p: PlayerID; target: PlayerID }
  | { k: 'resign'; p: PlayerID }
  | { k: 'win'; p: PlayerID; reason: Result['reason'] };
export interface Stats { rolls: number; dice: number; diceSum: number; conquered: number; lost: number; kills: number; losses: number; trades: number }
export interface Result { winner: PlayerID; reason: 'domination' | 'mission' | 'resign' }

export interface WarState {
  mode: Mode;
  players: PlayerID[];
  /** turn order (shuffled seat ids) */
  order: PlayerID[];
  /** two-player game: a neutral army holds territory */
  neutral: boolean;
  owner: Record<string, PlayerID | null>;
  armies: Record<string, number>;
  stage: Stage;
  current: PlayerID;
  round: number;
  setupLeft: Record<string, number>;
  /** own armies placed this setup turn (two players place 2 + 1 neutral) */
  turnPlaced: number;
  reinforcements: number;
  /** a mid-turn trade after taking a defeated player's cards (hand must drop to 4) */
  forced: boolean;
  forcedNext: boolean;
  hands: Record<PlayerID, Card[]>;
  deck: Card[];
  discard: Card[];
  trades: number;
  conquered: boolean;
  occupy: { from: string; to: string; min: number } | null;
  missions: Record<PlayerID, Mission> | null;
  out: PlayerID[];
  eliminatedBy: Record<PlayerID, PlayerID | null>;
  battle: Battle | null;
  seq: number;
  log: LogEvent[];
  /** events ever logged (the log keeps the last LOG_MAX), so screens can tell which are new */
  logTotal: number;
  stats: Record<PlayerID, Stats>;
  history: Record<string, number>[];
  result: Result | null;
}

export type Action =
  | { type: 'claim'; t: string }
  | { type: 'place'; t: string }
  | { type: 'placeNeutral'; t: string }
  | { type: 'autoPlace' }
  | { type: 'trade'; cards: string[] }
  | { type: 'deploy'; alloc: Record<string, number> }
  | { type: 'attack'; from: string; to: string; dice: number }
  | { type: 'blitz'; from: string; to: string }
  | { type: 'occupy'; n: number }
  | { type: 'endAttack' }
  | { type: 'fortify'; from: string; to: string; n: number }
  | { type: 'endTurn' };

type Rng = () => number;
export const die = (rng: Rng) => 1 + Math.floor(rng() * 6);
export function shuffle<T>(a: T[], rng: Rng): T[] {
  const o = [...a];
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}

// ---------- read helpers (work on the state or a player's view) ----------
type Board = Pick<WarState, 'owner' | 'armies'>;
export const territoriesOf = (G: Board, p: string) => TERRITORY_IDS.filter((t) => G.owner[t] === p);
export const ownsContinent = (G: Board, p: string, c: keyof typeof CONT_TERRS) => CONT_TERRS[c].every((t) => G.owner[t] === p);
export const continentsOf = (G: Board, p: string) => CONTINENTS.filter((c) => ownsContinent(G, p, c.id));
export const reinforcementsFor = (G: Board, p: string) =>
  Math.max(3, Math.floor(territoriesOf(G, p).length / 3)) + continentsOf(G, p).reduce((s, c) => s + c.bonus, 0);
export const alive = (G: Pick<WarState, 'players' | 'out'>) => G.players.filter((p) => !G.out.includes(p));
export const maxDice = (G: Board, from: string) => Math.min(3, (G.armies[from] ?? 0) - 1);

/** Territories reachable from `from` through the player's own territories (fortify paths). */
export function connected(G: Board, from: string): Set<string> {
  const p = G.owner[from], seen = new Set([from]), q = [from];
  while (q.length) for (const n of ADJ[q.pop()!]) if (!seen.has(n) && G.owner[n] === p) { seen.add(n); q.push(n); }
  return seen;
}

// ---------- setup ----------
export interface NewGameOpts { autoDeploy?: boolean }
export function newGame(numPlayers: number, mode: Mode, rng: Rng, opts: NewGameOpts = {}): WarState {
  const players = Array.from({ length: numPlayers }, (_, i) => String(i));
  const neutral = numPlayers === 2;
  const order = shuffle(players, rng);
  const start = START_ARMIES[numPlayers];
  const G: WarState = {
    mode: neutral ? 'domination' : mode, players, order, neutral,
    owner: Object.fromEntries(TERRITORY_IDS.map((t) => [t, null])), armies: Object.fromEntries(TERRITORY_IDS.map((t) => [t, 0])),
    stage: 'claim', current: order[0], round: 0,
    setupLeft: { ...Object.fromEntries(players.map((p) => [p, start])), ...(neutral ? { [NEUTRAL]: start } : {}) },
    turnPlaced: 0, reinforcements: 0, forced: false, forcedNext: false,
    hands: Object.fromEntries(players.map((p) => [p, []])), deck: shuffle(DECK, rng), discard: [], trades: 0,
    conquered: false, occupy: null, missions: null, out: [], eliminatedBy: {}, battle: null, seq: 0, log: [], logTotal: 0,
    stats: Object.fromEntries(players.map((p) => [p, { rolls: 0, dice: 0, diceSum: 0, conquered: 0, lost: 0, kills: 0, losses: 0, trades: 0 }])),
    history: [], result: null,
  };
  if (G.mode === 'mission') {
    const pool = shuffle([...BASE_MISSIONS, ...players.map((target): Mission => ({ kind: 'destroy', target }))], rng);
    G.missions = Object.fromEntries(order.map((p, i) => {
      const m = pool[i];
      return [p, m.kind === 'destroy' && m.target === p ? { kind: 'count', n: 24 } : m];
    }));
  }
  // two players: territories are always dealt (one third each to the players and the neutral army)
  if (opts.autoDeploy || neutral) {
    const holders = neutral ? [...order, NEUTRAL] : order;
    shuffle(TERRITORY_IDS, rng).forEach((t, i) => occupySetup(G, t, holders[i % holders.length]));
    startPlacing(G);
  }
  return G;
}

function occupySetup(G: WarState, t: string, p: string) {
  G.owner[t] = p;
  G.armies[t] = 1;
  G.setupLeft[p]--;
}

function startPlacing(G: WarState) {
  G.stage = 'place';
  G.turnPlaced = 0;
  G.current = G.order[0];
  if (!needsPlacing(G, G.current)) advanceSetup(G);
}

const needsPlacing = (G: WarState, p: string) => G.setupLeft[p] > 0 && !G.out.includes(p);

/** Two-player setup: own armies this turn (2, or what is left) then one neutral. */
const ownQuota = (G: WarState, p: string) => (G.neutral ? Math.min(2, G.setupLeft[p] + G.turnPlaced) : 1);
export const mustPlaceNeutral = (G: Pick<WarState, 'neutral' | 'setupLeft' | 'turnPlaced' | 'stage' | 'current'>) =>
  G.stage === 'place' && G.neutral && (G.setupLeft[NEUTRAL] ?? 0) > 0 && G.turnPlaced >= Math.min(2, G.setupLeft[G.current] + G.turnPlaced);

function advanceSetup(G: WarState) {
  G.turnPlaced = 0;
  if (G.stage === 'claim') {
    if (TERRITORY_IDS.every((t) => G.owner[t] !== null)) startPlacingFrom(G);
    else G.current = nextInOrder(G, G.current);
    return;
  }
  startPlacingFrom(G);
}

function startPlacingFrom(G: WarState) {
  G.stage = 'place';
  for (let i = 0; i < G.order.length; i++) {
    G.current = nextInOrder(G, G.current);
    if (needsPlacing(G, G.current)) return;
  }
  // every player is done; any neutral armies left are spread at random-ish (evenly) over the neutral territories
  if (G.neutral && G.setupLeft[NEUTRAL] > 0) {
    const ns = territoriesOf(G, NEUTRAL);
    for (let i = 0; G.setupLeft[NEUTRAL] > 0 && ns.length; i++) { G.armies[ns[i % ns.length]]++; G.setupLeft[NEUTRAL]--; }
  }
  beginTurn(G, G.order.find((p) => !G.out.includes(p))!, true);
}

function nextInOrder(G: WarState, p: string): string {
  const i = G.order.indexOf(p);
  for (let k = 1; k <= G.order.length; k++) {
    const q = G.order[(i + k) % G.order.length];
    if (!G.out.includes(q)) return q;
  }
  return p;
}

// ---------- turns ----------
function push(G: WarState, e: LogEvent) {
  G.log.push(e);
  G.logTotal++;
  if (G.log.length > LOG_MAX) G.log.splice(0, G.log.length - LOG_MAX);
}

const counts = (G: WarState) => Object.fromEntries([...G.players, ...(G.neutral ? [NEUTRAL] : [])].map((p) => [p, territoriesOf(G, p).length]));

function beginTurn(G: WarState, p: string, first = false) {
  if (first || G.order.indexOf(p) <= G.order.indexOf(G.current)) { G.round++; G.history.push(counts(G)); }
  G.current = p;
  G.stage = 'reinforce';
  G.reinforcements = reinforcementsFor(G, p);
  G.forced = false;
  G.forcedNext = false;
  G.conquered = false;
  G.occupy = null;
  push(G, { k: 'turn', p, round: G.round });
}

function endTurn(G: WarState) {
  const p = G.current;
  if (G.conquered) {
    if (!G.deck.length && G.discard.length) { G.deck = G.discard; G.discard = []; }
    const c = G.deck.shift();
    if (c) { G.hands[p].push(c); push(G, { k: 'card', p }); }
  }
  beginTurn(G, nextInOrder(G, p));
}

function missionDone(G: WarState, p: string): boolean {
  const m = G.missions?.[p];
  if (!m) return false;
  const mine = territoriesOf(G, p);
  const count24 = () => mine.length >= 24;
  switch (m.kind) {
    case 'conts':
      return m.conts.every((c) => ownsContinent(G, p, c)) && (!m.plus || continentsOf(G, p).length > m.conts.length);
    case 'count': return mine.length >= m.n;
    case 'count2': return mine.filter((t) => G.armies[t] >= 2).length >= m.n;
    case 'destroy':
      if (!G.out.includes(m.target)) return false;
      return G.eliminatedBy[m.target] === p || count24();
  }
}

function checkWin(G: WarState) {
  if (G.result) return;
  const left = alive(G);
  if (left.length === 1) return win(G, left[0], 'domination');
  if (G.mode === 'mission' && G.stage !== 'claim' && G.stage !== 'place' && missionDone(G, G.current)) win(G, G.current, 'mission');
}

function win(G: WarState, p: string, reason: Result['reason']) {
  G.result = { winner: p, reason };
  G.stage = 'over';
  G.history.push(counts(G));
  push(G, { k: 'win', p, reason });
}

function eliminate(G: WarState, target: string, by: string | null) {
  if (G.out.includes(target)) return;
  G.out.push(target);
  G.eliminatedBy[target] = by;
  if (by) {
    G.hands[by].push(...G.hands[target]);
    push(G, { k: 'eliminate', p: by, target });
    if (G.hands[by].length >= 6) G.forcedNext = true;
  } else G.discard.push(...G.hands[target]);
  G.hands[target] = [];
}

function roll(G: WarState, p: string, from: string, to: string, dice: number, rng: Rng): Roll {
  const d = G.owner[to]!;
  const att = Array.from({ length: dice }, () => die(rng)).sort((a, b) => b - a);
  const def = Array.from({ length: Math.min(2, G.armies[to]) }, () => die(rng)).sort((a, b) => b - a);
  let al = 0, dl = 0;
  for (let i = 0; i < Math.min(att.length, def.length); i++) if (att[i] > def[i]) dl++; else al++;
  G.armies[from] -= al;
  G.armies[to] -= dl;
  const s = G.stats[p];
  s.rolls++; s.dice += att.length; s.diceSum += att.reduce((a, b) => a + b, 0); s.kills += dl; s.losses += al;
  if (G.stats[d]) { G.stats[d].kills += al; G.stats[d].losses += dl; }
  return { att, def };
}

function afterConquest(G: WarState, p: string, from: string, to: string, min: number) {
  const d = G.owner[to]!;
  G.owner[to] = p;
  G.conquered = true;
  G.stats[p].conquered++;
  if (G.stats[d]) G.stats[d].lost++;
  if (d !== NEUTRAL && territoriesOf(G, d).length === 0) eliminate(G, d, p);
  G.occupy = { from, to, min };
  G.stage = 'occupy';
  checkWin(G);
  if (G.result) {
    // the war is won: the victors march in
    const n = G.armies[from] - 1;
    G.armies[from] -= n;
    G.armies[to] += n;
    G.occupy = null;
  } else if (G.armies[from] - 1 <= min) doOccupy(G, p, G.armies[from] - 1);
}

function doOccupy(G: WarState, p: string, n: number) {
  const { from, to } = G.occupy!;
  G.armies[from] -= n;
  G.armies[to] += n;
  push(G, { k: 'move', p, from, to, n, fortify: false });
  G.occupy = null;
  if (G.forcedNext) { G.forcedNext = false; G.forced = true; G.stage = 'reinforce'; G.reinforcements = 0; }
  else G.stage = 'attack';
  checkWin(G);
}

// ---------- actions ----------
/** Validates and applies one action for player p. Returns an error message, or null when applied. */
export function act(G: WarState, p: string, a: Action, rng: Rng): string | null {
  if (G.result) return 'game over';
  if (p !== G.current) return 'not your turn';
  const own = (t: string) => G.owner[t] === p;
  switch (a.type) {
    case 'claim':
      if (G.stage !== 'claim') return 'not claiming';
      if (!(a.t in G.owner) || G.owner[a.t] !== null) return 'taken';
      occupySetup(G, a.t, p);
      advanceSetup(G);
      return null;
    case 'place': {
      if (G.stage !== 'place' || mustPlaceNeutral(G)) return 'not placing';
      if (!own(a.t) || G.setupLeft[p] <= 0) return 'bad territory';
      G.armies[a.t]++;
      G.setupLeft[p]--;
      G.turnPlaced++;
      if (G.turnPlaced >= ownQuota(G, p) && !mustPlaceNeutral(G)) advanceSetup(G);
      return null;
    }
    case 'placeNeutral':
      if (!mustPlaceNeutral(G)) return 'no neutral to place';
      if (G.owner[a.t] !== NEUTRAL) return 'not neutral';
      G.armies[a.t]++;
      G.setupLeft[NEUTRAL]--;
      advanceSetup(G);
      return null;
    case 'autoPlace': {
      if (G.stage !== 'place' || G.setupLeft[p] <= 0) return 'not placing';
      const mine = territoriesOf(G, p);
      const front = mine.filter((t) => ADJ[t].some((n) => G.owner[n] !== p));
      const spots = front.length ? front : mine;
      for (let i = 0; G.setupLeft[p] > 0; i++) { G.armies[spots[Math.floor(rng() * spots.length)]]++; G.setupLeft[p]--; }
      if (G.neutral) {
        const ns = territoriesOf(G, NEUTRAL);
        const share = Math.ceil(G.setupLeft[NEUTRAL] / 2);
        for (let i = 0; i < share && G.setupLeft[NEUTRAL] > 0; i++) { G.armies[ns[Math.floor(rng() * ns.length)]]++; G.setupLeft[NEUTRAL]--; }
      }
      advanceSetup(G);
      return null;
    }
    case 'trade': {
      if (G.stage !== 'reinforce') return 'not reinforcing';
      if (G.forced && G.hands[p].length <= 4) return 'no trade needed';
      const ids = new Set(a.cards);
      const cards = G.hands[p].filter((c) => ids.has(c.id));
      if (ids.size !== 3 || cards.length !== 3 || !isSet(cards)) return 'not a set';
      const armies = tradeValue(G.trades++);
      G.reinforcements += armies;
      const bonus = cards.find((c) => c.t && own(c.t))?.t ?? undefined;
      if (bonus) G.armies[bonus] += TERRITORY_BONUS;
      G.hands[p] = G.hands[p].filter((c) => !ids.has(c.id));
      G.discard.push(...cards);
      G.stats[p].trades++;
      push(G, { k: 'trade', p, armies, ...(bonus ? { bonus } : {}) });
      checkWin(G);
      return null;
    }
    case 'deploy': {
      if (G.stage !== 'reinforce') return 'not reinforcing';
      if (G.hands[p].length >= 5) return 'trade cards first';
      const entries = Object.entries(a.alloc ?? {});
      if (entries.some(([t, n]) => !own(t) || !Number.isInteger(n) || n < 1)) return 'bad allocation';
      if (entries.reduce((s, [, n]) => s + n, 0) !== G.reinforcements) return 'place every army';
      for (const [t, n] of entries) G.armies[t] += n;
      push(G, { k: 'deploy', p, n: G.reinforcements });
      G.reinforcements = 0;
      G.forced = false;
      G.stage = 'attack';
      checkWin(G);
      return null;
    }
    case 'attack':
    case 'blitz': {
      if (G.stage !== 'attack') return 'not attacking';
      if (!own(a.from) || G.armies[a.from] < 2 || !adjacent(a.from, a.to) || own(a.to) || G.owner[a.to] === null) return 'bad attack';
      const blitz = a.type === 'blitz';
      const dice = blitz ? maxDice(G, a.from) : a.dice;
      if (!Number.isInteger(dice) || dice < 1 || dice > maxDice(G, a.from)) return 'bad dice';
      const d = G.owner[a.to]!;
      const b: Battle = { seq: ++G.seq, p, d, from: a.from, to: a.to, rolls: [], attLoss: 0, defLoss: 0, conquered: false, blitz };
      let used = dice;
      do {
        used = blitz ? maxDice(G, a.from) : dice;
        const before = [G.armies[a.from], G.armies[a.to]];
        b.rolls.push(roll(G, p, a.from, a.to, used, rng));
        b.attLoss += before[0] - G.armies[a.from];
        b.defLoss += before[1] - G.armies[a.to];
      } while (blitz && G.armies[a.to] > 0 && G.armies[a.from] >= 2);
      b.conquered = G.armies[a.to] === 0;
      G.battle = b;
      push(G, { k: 'battle', p, d, from: a.from, to: a.to, attLoss: b.attLoss, defLoss: b.defLoss, conquered: b.conquered });
      if (b.conquered) afterConquest(G, p, a.from, a.to, used);
      return null;
    }
    case 'occupy':
      if (G.stage !== 'occupy' || !G.occupy) return 'nothing to occupy';
      if (!Number.isInteger(a.n) || a.n < G.occupy.min || a.n > G.armies[G.occupy.from] - 1) return 'bad count';
      doOccupy(G, p, a.n);
      return null;
    case 'endAttack':
      if (G.stage !== 'attack') return 'not attacking';
      G.stage = 'fortify';
      return null;
    case 'fortify': {
      if (G.stage !== 'attack' && G.stage !== 'fortify') return 'cannot fortify now';
      if (a.from === a.to || !own(a.from) || !own(a.to) || !connected(G, a.from).has(a.to)) return 'not connected';
      if (!Number.isInteger(a.n) || a.n < 1 || a.n > G.armies[a.from] - 1) return 'bad count';
      G.armies[a.from] -= a.n;
      G.armies[a.to] += a.n;
      push(G, { k: 'move', p, from: a.from, to: a.to, n: a.n, fortify: true });
      endTurn(G);
      return null;
    }
    case 'endTurn':
      if (G.stage !== 'attack' && G.stage !== 'fortify') return 'cannot end turn now';
      endTurn(G);
      return null;
  }
  return 'unknown action';
}

/** A player leaves: their territories turn neutral (they keep defending), their cards go to the discard pile. */
export function resign(G: WarState, p: string): string | null {
  if (G.result || !G.players.includes(p) || G.out.includes(p)) return 'cannot resign';
  for (const t of territoriesOf(G, p)) G.owner[t] = NEUTRAL;
  G.setupLeft[p] = 0;
  eliminate(G, p, null);
  push(G, { k: 'resign', p });
  const left = alive(G);
  if (left.length === 1) { win(G, left[0], 'resign'); return null; }
  if (G.current === p) {
    if (G.stage === 'claim' || G.stage === 'place') {
      G.current = nextInOrder(G, p);
      if (G.stage === 'claim' && TERRITORY_IDS.every((t) => G.owner[t] !== null)) startPlacingFrom(G);
      else if (G.stage === 'place' && !needsPlacing(G, G.current)) startPlacingFrom(G);
    } else beginTurn(G, nextInOrder(G, p));
  }
  return null;
}
