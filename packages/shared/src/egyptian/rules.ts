/**
 * Egyptian War rules, pure. Every action takes an explicit `now` (ms) so tests own the clock; boardgame.io's
 * moves pass the server's Date.now(). An action returns an error string when refused (and leaves G untouched),
 * undefined when applied. Spec: docs/egyptian/SPEC.md.
 */
import { challengeTries, DECK_SIZE, fullDeck, type Card } from './cards';
import { DEFAULT_RULES, matchSlap, type SlapMatch, type SlapRuleId } from './slapRules';
import { TIMING, type Timing } from './timing';

export type PlayerID = string;
export type Stage = 'waiting' | 'ready' | 'dealing' | 'play' | 'over';

export interface Challenge { by: PlayerID; target: PlayerID; tries: number; face: Card }
export type Timer =
  | { kind: 'grace'; at: number; winner: PlayerID; why: 'challenge' | 'last' }
  | { kind: 'collect'; at: number };
export interface Won { by: PlayerID; how: 'slap' | 'slapIn' | 'challenge' | 'last'; matches: SlapMatch[]; pile: Card[]; face?: Card }
export interface Stats { flips: number; slapsWon: number; falseSlaps: number; challengesWon: number; longest: number }

export type EgwEventBody =
  | { kind: 'deal' }
  | { kind: 'flip'; by: PlayerID; card: Card; auto?: true }
  | { kind: 'challenge'; by: PlayerID; target: PlayerID; face: Card; tries: number }
  | { kind: 'pass'; target: PlayerID; tries: number }
  | { kind: 'grace'; winner: PlayerID }
  | { kind: 'slap'; by: PlayerID; how: 'slap' | 'slapIn' }
  | { kind: 'falseSlap'; by: PlayerID; penalty: boolean }
  | { kind: 'won'; by: PlayerID; how: Won['how'] }
  | { kind: 'collect'; by: PlayerID; cards: number }
  | { kind: 'out'; by: PlayerID }
  | { kind: 'left'; by: PlayerID }
  | { kind: 'win'; by: PlayerID };
export type EgwEvent = EgwEventBody & { seq: number; at: number };

export interface EgwState {
  stage: Stage;
  rules: SlapRuleId[];
  timing: Timing;
  /** deal order = clockwise order of play */
  players: PlayerID[];
  /** each stack's top is index 0 (hidden: never in a player view) */
  stacks: Record<PlayerID, Card[]>;
  /** face up, played order; the top is last */
  pile: Card[];
  /** false-slap burns, face down under the pile (hidden) */
  burned: Card[];
  round: number;
  leader: PlayerID;
  turn: PlayerID | null;
  /** who played the pile's top card this round */
  topBy: PlayerID | null;
  challenge: Challenge | null;
  timer: Timer | null;
  won: Won | null;
  lastFlip: { at: number; by: PlayerID } | null;
  turnSince: number;
  lockout: Record<PlayerID, number>;
  slapInUsed: Record<PlayerID, boolean>;
  left: Record<PlayerID, boolean>;
  ready: Record<PlayerID, boolean>;
  firstReadyAt: number | null;
  playAt: number | null;
  /** server time of the last applied action (clients measure countdowns from it) */
  clock: number;
  stats: Record<PlayerID, Stats>;
  log: EgwEvent[];
  seq: number;
  result: { winner: PlayerID } | null;
}

export interface Rng { shuffle<T>(a: T[]): T[]; die(n: number): number }

export const LOG_SIZE = 40;

const perPlayer = <T>(players: PlayerID[], v: () => T): Record<PlayerID, T> => Object.fromEntries(players.map((p) => [p, v()]));

function base(players: PlayerID[], rules: SlapRuleId[], timing: Timing): EgwState {
  return {
    stage: 'waiting', rules: [...rules], timing, players, stacks: perPlayer(players, () => []), pile: [], burned: [],
    round: 1, leader: players[0] ?? '0', turn: null, topBy: null, challenge: null, timer: null, won: null, lastFlip: null,
    turnSince: 0, lockout: perPlayer(players, () => 0), slapInUsed: perPlayer(players, () => false), left: perPlayer(players, () => false),
    ready: perPlayer(players, () => false), firstReadyAt: null, playAt: null, clock: 0,
    stats: perPlayer(players, () => ({ flips: 0, slapsWon: 0, falseSlaps: 0, challengesWon: 0, longest: 0 })),
    log: [], seq: 0, result: null,
  };
}

/** The 5-seat waiting room's state: no cards, no moves. */
export const waitingRoom = (rules: SlapRuleId[] = DEFAULT_RULES): EgwState => base([], rules, TIMING);

/** Shuffle, seat the deal order, pick a starting player (separately), deal one card at a time. */
export function newGame(numPlayers: number, rules: SlapRuleId[], rng: Rng, timing: Timing = TIMING): EgwState {
  const deck = rng.shuffle(fullDeck());
  const players = rng.shuffle(Array.from({ length: numPlayers }, (_, i) => String(i)));
  const start = players[rng.die(numPlayers) - 1];
  const G = base(players, rules, timing);
  deck.forEach((c, i) => G.stacks[players[i % numPlayers]].push(c));
  for (const p of players) G.stats[p].longest = G.stacks[p].length;
  G.stage = 'ready';
  G.turn = start;
  G.leader = start;
  return G;
}

/* ---------- helpers ---------- */

function event(G: EgwState, now: number, e: EgwEventBody) {
  G.log.push({ ...e, seq: ++G.seq, at: now } as EgwEvent);
  if (G.log.length > LOG_SIZE) G.log.splice(0, G.log.length - LOG_SIZE);
}

const holds = (G: EgwState, p: PlayerID) => !G.left[p] && G.stacks[p].length > 0;
export const totalCards = (G: EgwState): number =>
  G.pile.length + G.burned.length + G.players.reduce((s, p) => s + G.stacks[p].length, 0);

/** The next player clockwise after `from` who holds cards (`from` itself last, if allowed). */
export function nextWithCards(G: EgwState, from: PlayerID, includeSelf: boolean): PlayerID | null {
  const n = G.players.length;
  const i = G.players.indexOf(from);
  for (let k = 1; k < n; k++) {
    const q = G.players[(i + k) % n];
    if (holds(G, q)) return q;
  }
  return includeSelf && holds(G, from) ? from : null;
}

function nextNotLeft(G: EgwState, from: PlayerID): PlayerID | null {
  const n = G.players.length;
  const i = G.players.indexOf(from);
  for (let k = 1; k < n; k++) if (!G.left[G.players[(i + k) % n]]) return G.players[(i + k) % n];
  return null;
}

function grace(G: EgwState, winner: PlayerID, why: 'challenge' | 'last', now: number) {
  G.timer = { kind: 'grace', at: now + G.timing.graceMs, winner, why };
  G.turn = null;
  event(G, now, { kind: 'grace', winner });
}

/** Nobody holds cards: the challenger, else whoever played the top card, else the round's leader takes the pile. */
function noOneToAct(G: EgwState, now: number) {
  if (G.challenge) grace(G, G.challenge.by, 'challenge', now);
  else grace(G, G.topBy ?? G.leader, 'last', now);
}

function passTurnAfter(G: EgwState, p: PlayerID, now: number) {
  const t = nextWithCards(G, p, true);
  if (!t) return noOneToAct(G, now);
  G.turn = t;
  G.turnSince = now;
}

/** The challenged player is out of cards: their tries pass on, or the challenger wins. */
function passTries(G: EgwState, now: number) {
  const ch = G.challenge!;
  const next = nextWithCards(G, ch.target, false);
  if (!next || next === ch.by) return grace(G, ch.by, 'challenge', now);
  ch.target = next;
  G.turn = next;
  G.turnSince = now;
  event(G, now, { kind: 'pass', target: next, tries: ch.tries });
}

/** `p` holds no more cards (a flip, a burn or leaving): the turn or the challenge moves on. */
function runOut(G: EgwState, p: PlayerID, now: number) {
  if (G.timer) return;
  if (G.challenge && G.challenge.target === p) passTries(G, now);
  else if (G.turn === p) passTurnAfter(G, p, now);
}

function startDeal(G: EgwState, now: number) {
  G.stage = 'dealing';
  G.playAt = now + G.timing.dealMs;
  event(G, now, { kind: 'deal' });
}

function doFlip(G: EgwState, p: PlayerID, now: number, auto = false) {
  const c = G.stacks[p].shift()!;
  G.pile.push(c);
  G.topBy = p;
  G.lastFlip = { at: now, by: p };
  G.turnSince = now;
  G.stats[p].flips++;
  event(G, now, auto ? { kind: 'flip', by: p, card: c, auto: true } : { kind: 'flip', by: p, card: c });
  const out = G.stacks[p].length === 0;
  if (out) event(G, now, { kind: 'out', by: p });
  const tries = challengeTries(c);
  if (tries) {
    const target = nextWithCards(G, p, false);
    G.challenge = { by: p, target: target ?? p, tries, face: c };
    event(G, now, { kind: 'challenge', by: p, target: target ?? p, face: c, tries });
    if (!target) grace(G, p, 'challenge', now);
    else G.turn = target;
  } else if (G.challenge) {
    G.challenge.tries--;
    if (G.challenge.tries === 0) grace(G, G.challenge.by, 'challenge', now);
    else if (out) passTries(G, now);
  } else {
    passTurnAfter(G, p, now);
  }
}

function collect(G: EgwState, now: number) {
  let w = G.won!.by;
  if (G.left[w]) w = nextNotLeft(G, w) ?? w;
  const cards = G.burned.length + G.pile.length;
  G.stacks[w].push(...G.burned, ...G.pile);
  G.burned = [];
  G.pile = [];
  G.won = null;
  G.timer = null;
  G.challenge = null;
  G.round++;
  G.leader = w;
  G.turn = w;
  G.topBy = null;
  G.turnSince = now;
  for (const p of G.players) G.slapInUsed[p] = false;
  G.stats[w].longest = Math.max(G.stats[w].longest, G.stacks[w].length);
  event(G, now, { kind: 'collect', by: w, cards });
  if (G.stacks[w].length === DECK_SIZE) finish(G, w, now);
}

function finish(G: EgwState, winner: PlayerID, now: number) {
  G.result = { winner };
  G.stage = 'over';
  G.turn = null;
  G.timer = null;
  event(G, now, { kind: 'win', by: winner });
}

const seated = (G: EgwState, p: PlayerID) => G.players.includes(p);

/* ---------- actions ---------- */

export function ready(G: EgwState, p: PlayerID, now: number): string | undefined {
  if (G.stage !== 'ready' || !seated(G, p)) return 'not now';
  if (G.ready[p]) return 'already ready';
  G.ready[p] = true;
  G.firstReadyAt ??= now;
  G.clock = now;
  if (G.players.every((q) => G.ready[q])) startDeal(G, now);
  return undefined;
}

export function flip(G: EgwState, p: PlayerID, now: number): string | undefined {
  if (G.stage !== 'play' || G.result) return 'not playing';
  if (G.timer) return 'wait';
  if (G.turn !== p) return 'not your turn';
  if (G.lastFlip && now - G.lastFlip.at < G.timing.minFlipGapMs) return 'too fast';
  if (!holds(G, p)) return 'no cards';
  doFlip(G, p, now);
  G.clock = now;
  return undefined;
}

/** `round` is the round the slapper saw: a slap on a pile that was already won is ignored. */
export function slap(G: EgwState, p: PlayerID, round: number, now: number): string | undefined {
  if (G.stage !== 'play' || G.result || !seated(G, p)) return 'not playing';
  if (G.left[p]) return 'left';
  if (round !== G.round) return 'stale';
  if (G.timer?.kind === 'collect') return 'paused';
  const out = G.stacks[p].length === 0;
  if (out && G.slapInUsed[p]) return 'spent';
  if (!out && now < G.lockout[p]) return 'locked';
  let matches = matchSlap(G.pile, G.rules);
  if (!matches.length && G.topBy !== null && G.lastFlip && now - G.lastFlip.at <= G.timing.latencyMs) {
    matches = matchSlap(G.pile.slice(0, -1), G.rules);
  }
  G.clock = now;
  if (matches.length) {
    const how = out ? 'slapIn' : 'slap';
    G.won = { by: p, how, matches, pile: [...G.pile] };
    G.challenge = null;
    G.turn = null;
    G.timer = { kind: 'collect', at: now + G.timing.slapPauseMs };
    G.stats[p].slapsWon++;
    event(G, now, { kind: 'slap', by: p, how });
    return undefined;
  }
  G.stats[p].falseSlaps++;
  if (out) {
    G.slapInUsed[p] = true;
    event(G, now, { kind: 'falseSlap', by: p, penalty: false });
    return undefined;
  }
  G.burned.push(G.stacks[p].shift()!);
  G.lockout[p] = now + G.timing.lockoutMs;
  event(G, now, { kind: 'falseSlap', by: p, penalty: true });
  if (G.stacks[p].length === 0) {
    event(G, now, { kind: 'out', by: p });
    if (G.stage === 'play') runOut(G, p, now);
  }
  return undefined;
}

/** Resolve whatever timed event is due on the server clock. */
export function tick(G: EgwState, now: number): string | undefined {
  if (G.result) return 'over';
  if (G.stage === 'ready') {
    if (G.firstReadyAt === null || now - G.firstReadyAt < G.timing.readyWaitMs) return 'nothing due';
    startDeal(G, now);
  } else if (G.stage === 'dealing') {
    if (now < G.playAt!) return 'nothing due';
    G.stage = 'play';
    G.turnSince = now;
  } else if (G.stage === 'play') {
    const t = G.timer;
    if (t && now < t.at) return 'nothing due';
    if (t?.kind === 'grace') {
      if (t.why === 'challenge') G.stats[t.winner].challengesWon++;
      G.won = { by: t.winner, how: t.why, matches: [], pile: [...G.pile], ...(G.challenge ? { face: G.challenge.face } : {}) };
      G.challenge = null;
      G.timer = { kind: 'collect', at: now + G.timing.challengePauseMs };
      event(G, now, { kind: 'won', by: t.winner, how: t.why });
    } else if (t?.kind === 'collect') {
      collect(G, now);
    } else if (G.turn !== null && now - G.turnSince >= G.timing.idleFlipMs && (!G.lastFlip || now - G.lastFlip.at >= G.timing.minFlipGapMs)) {
      doFlip(G, G.turn, now, true);
    } else return 'nothing due';
  } else return 'nothing due';
  G.clock = now;
  return undefined;
}

/** Leave for good: my cards go under the pile; if one player remains, they win. */
export function leave(G: EgwState, p: PlayerID, now: number): string | undefined {
  if (G.result || !seated(G, p) || G.stage === 'waiting') return 'not now';
  if (G.left[p]) return 'left';
  const had = G.stacks[p].length > 0;
  G.left[p] = true;
  G.ready[p] = true;
  G.burned.push(...G.stacks[p]);
  G.stacks[p] = [];
  G.clock = now;
  event(G, now, { kind: 'left', by: p });
  const rest = G.players.filter((q) => !G.left[q]);
  if (rest.length === 1) {
    finish(G, rest[0], now);
    return undefined;
  }
  if (G.stage === 'ready' && G.players.every((q) => G.ready[q])) startDeal(G, now);
  if (G.stage === 'play') {
    if (had || G.turn === p || G.challenge?.target === p) runOut(G, p, now);
  } else if (G.turn === p) {
    G.turn = nextWithCards(G, p, false);
    G.leader = G.turn ?? G.leader;
  }
  return undefined;
}

/** When the next timed event is due (null: none pending). */
export function nextTimed(G: EgwState): number | null {
  if (G.result) return null;
  if (G.stage === 'ready') return G.firstReadyAt === null ? null : G.firstReadyAt + G.timing.readyWaitMs;
  if (G.stage === 'dealing') return G.playAt;
  if (G.stage !== 'play') return null;
  if (G.timer) return G.timer.at;
  if (G.turn === null) return null;
  const gap = G.lastFlip ? G.lastFlip.at + G.timing.minFlipGapMs : 0;
  return Math.max(G.turnSince + G.timing.idleFlipMs, gap);
}
