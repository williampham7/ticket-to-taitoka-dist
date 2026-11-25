import {
  CELLS, DIRS, FIXED, HOMES, SIZE, TREASURE_IDS, isFixed, lineCells, movableTiles, opposite, rc, rotMask,
  type Tile, type TreasureId,
} from './tiles';
import { LOG_KEEP, MAX_PLAYERS, MIN_PLAYERS, treasuresEach, type Length } from './tuning';

/**
 * Shifting Kingdom rules: pure functions over a plain state. `act` validates one action and applies it,
 * returning an error string (nothing changed) or undefined. Everything random comes in as `rng`.
 */
export type PlayerID = string;
export type Step = 'shift' | 'move';
export type Action = { k: 'shift'; at: number; rot: number } | { k: 'move'; to: number };
export type KEvent =
  | { k: 'shift'; n: number; p: PlayerID; at: number; rot: number; out: number; wraps: PlayerID[] }
  | { k: 'move'; n: number; p: PlayerID; path: number[] }
  | { k: 'collect'; n: number; p: PlayerID; t: TreasureId }
  | { k: 'home'; n: number; p: PlayerID }
  | { k: 'turn'; n: number; p: PlayerID }
  | { k: 'resign'; n: number; p: PlayerID; by?: PlayerID }
  | { k: 'win'; n: number; p: PlayerID; reason: 'home' | 'last' };
type NoN<T> = T extends unknown ? Omit<T, 'n'> : never;
export interface Result { winner: PlayerID; reason: 'home' | 'last' }

export interface KState {
  board: Tile[];
  spare: Tile;
  players: PlayerID[];
  /** turn order (a seeded shuffle of the seats) */
  order: PlayerID[];
  current: PlayerID;
  step: Step;
  /** where the last shift went in (its opposite is blocked) */
  lastAt: number | null;
  pos: Record<PlayerID, number>;
  home: Record<PlayerID, number>;
  /** secret: each player's remaining treasures, the current target first */
  stacks: Record<PlayerID, TreasureId[]>;
  found: Record<PlayerID, TreasureId[]>;
  young: boolean[];
  heroes: number[];
  bots: boolean[];
  hints: boolean;
  length: Length;
  out: PlayerID[];
  result: Result | null;
  log: KEvent[];
  logTotal: number;
  turn: number;
}

export interface GameOpts { length?: Length; hints?: boolean; young?: boolean[]; heroes?: number[]; bots?: boolean[] }

function shuffle<T>(a: T[], rng: () => number): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

export function newGame(n: number, rng: () => number, o: GameOpts = {}): KState {
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new Error('2-4 players');
  const tiles = shuffle(movableTiles(), rng).map((t) => ({ ...t, m: rotMask(t.m, Math.floor(rng() * 4)) }));
  const board: Tile[] = [];
  let k = 0;
  for (let i = 0; i < CELLS; i++) board.push(isFixed(i) ? { id: fixedId(i), ...FIXED[i] } : tiles[k++]);
  const spare = tiles[k];
  const length = o.length ?? 'full';
  const deck = shuffle(TREASURE_IDS, rng);
  const each = treasuresEach(length, n);
  const players = Array.from({ length: n }, (_, i) => String(i));
  const order = shuffle(players, rng);
  const stacks: Record<PlayerID, TreasureId[]> = {};
  players.forEach((p, i) => { stacks[p] = deck.slice(i * each, (i + 1) * each); });
  const home = Object.fromEntries(order.map((p, i) => [p, HOMES[i]]));
  return {
    board, spare, players, order, current: order[0], step: 'shift', lastAt: null,
    pos: { ...home }, home, stacks, found: Object.fromEntries(players.map((p) => [p, []])),
    young: players.map((_, i) => !!o.young?.[i]), heroes: o.heroes?.length === n ? [...o.heroes] : players.map((_, i) => i),
    bots: players.map((_, i) => !!o.bots?.[i]), hints: o.hints ?? true, length,
    out: [], result: null, log: [], logTotal: 0, turn: 1,
  };
}
/** Fixed tiles have ids 0-15, in reading order. */
const FIXED_CELLS = Object.keys(FIXED).map(Number).sort((a, b) => a - b);
const fixedId = (i: number) => FIXED_CELLS.indexOf(i);

export interface ShiftResult { board: Tile[]; spare: Tile; pos: Record<PlayerID, number>; wraps: PlayerID[] }
/** Push the spare (turned `rot` quarter turns clockwise) in at insertion point `at`. Pure. */
export function applyShift(board: Tile[], spare: Tile, pos: Record<PlayerID, number>, at: number, rot: number): ShiftResult {
  const line = lineCells(at);
  const b = [...board];
  for (let k = SIZE - 1; k > 0; k--) b[line[k]] = board[line[k - 1]];
  b[line[0]] = { ...spare, m: rotMask(spare.m, rot) };
  const wraps: PlayerID[] = [];
  const np: Record<PlayerID, number> = {};
  for (const [p, c] of Object.entries(pos)) {
    const k = line.indexOf(c);
    if (k < 0) np[p] = c;
    else if (k === SIZE - 1) { np[p] = line[0]; wraps.push(p); } else np[p] = line[k + 1];
  }
  return { board: b, spare: board[line[SIZE - 1]], pos: np, wraps };
}

/** Neighbours reachable in one step through facing openings, in the order N, E, S, W. */
export function steps(board: Tile[], i: number): number[] {
  const [r, c] = rc(i);
  const out: number[] = [];
  for (const d of DIRS) {
    const nr = r + d.dr, nc = c + d.dc;
    if (nr < 0 || nc < 0 || nr >= SIZE || nc >= SIZE) continue;
    const j = nr * SIZE + nc;
    if (board[i].m & d.bit && board[j].m & d.opp) out.push(j);
  }
  return out;
}
/** BFS distance to every reachable cell; insertion order is BFS order. */
export function distances(board: Tile[], from: number): Map<number, number> {
  const d = new Map([[from, 0]]);
  const q = [from];
  for (let h = 0; h < q.length; h++) for (const j of steps(board, q[h])) if (!d.has(j)) { d.set(j, d.get(q[h])! + 1); q.push(j); }
  return d;
}
export const reachable = (board: Tile[], from: number): number[] => [...distances(board, from).keys()];
/** The shortest walk from `from` to `to` inclusive (ties broken N, E, S, W), or null. */
export function pathTo(board: Tile[], from: number, to: number): number[] | null {
  const prev = new Map<number, number>([[from, -1]]);
  const q = [from];
  for (let h = 0; h < q.length && !prev.has(to); h++) for (const j of steps(board, q[h])) if (!prev.has(j)) { prev.set(j, q[h]); q.push(j); }
  if (!prev.has(to)) return null;
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0])!);
  return path;
}

/** Every legal shift: 11 insertion points (12 on the first turn), one per distinct orientation of the spare. */
export function legalShifts(spare: Tile, lastAt: number | null): { at: number; rot: number }[] {
  const blocked = lastAt === null ? -1 : opposite(lastAt);
  const rots: number[] = [];
  const seen = new Set<number>();
  for (let r = 0; r < 4; r++) { const m = rotMask(spare.m, r); if (!seen.has(m)) { seen.add(m); rots.push(r); } }
  const out: { at: number; rot: number }[] = [];
  for (let at = 0; at < 12; at++) if (at !== blocked) for (const rot of rots) out.push({ at, rot });
  return out;
}

export const alive = (G: Pick<KState, 'order' | 'out'>) => G.order.filter((p) => !G.out.includes(p));

function log(G: KState, e: NoN<KEvent>) {
  G.logTotal++;
  G.log.push({ ...e, n: G.logTotal } as KEvent);
  if (G.log.length > LOG_KEEP) G.log.splice(0, G.log.length - LOG_KEEP);
}
function nextTurn(G: KState) {
  const live = alive(G);
  const i = G.order.indexOf(G.current);
  for (let k = 1; k <= G.order.length; k++) {
    const p = G.order[(i + k) % G.order.length];
    if (live.includes(p)) { G.current = p; break; }
  }
  G.step = 'shift';
  G.turn++;
  log(G, { k: 'turn', p: G.current });
}

export function act(G: KState, p: PlayerID | null | undefined, a: Action): string | undefined {
  if (G.result) return 'game over';
  if (!p || !G.players.includes(p) || G.out.includes(p)) return 'not playing';
  if (p !== G.current) return 'not your turn';
  if (!a || typeof a !== 'object') return 'bad action';
  if (a.k === 'shift') {
    if (G.step !== 'shift') return 'already shifted';
    if (!Number.isInteger(a.at) || a.at < 0 || a.at > 11 || !Number.isInteger(a.rot) || a.rot < 0 || a.rot > 3) return 'bad shift';
    if (G.lastAt !== null && a.at === opposite(G.lastAt)) return 'blocked';
    const out = G.board[lineCells(a.at)[SIZE - 1]].id;
    const r = applyShift(G.board, G.spare, G.pos, a.at, a.rot);
    G.board = r.board; G.spare = r.spare; G.pos = r.pos; G.lastAt = a.at; G.step = 'move';
    log(G, { k: 'shift', p, at: a.at, rot: a.rot, out, wraps: r.wraps });
    return undefined;
  }
  if (a.k === 'move') {
    if (G.step !== 'move') return 'shift first';
    if (!Number.isInteger(a.to)) return 'bad move';
    const path = pathTo(G.board, G.pos[p], a.to);
    if (!path) return 'unreachable';
    G.pos[p] = a.to;
    log(G, { k: 'move', p, path });
    const stack = G.stacks[p];
    const t = G.board[a.to].t;
    const young = G.young[Number(p)];
    if (t && stack.length && (young ? stack.includes(t) : stack[0] === t)) {
      stack.splice(stack.indexOf(t), 1);
      G.found[p].push(t);
      log(G, { k: 'collect', p, t });
      if (!stack.length) log(G, { k: 'home', p });
    } else if (!stack.length && a.to === G.home[p]) {
      G.result = { winner: p, reason: 'home' };
      log(G, { k: 'win', p, reason: 'home' });
      return undefined;
    }
    nextTurn(G);
    return undefined;
  }
  return 'bad action';
}

function bowOut(G: KState, p: PlayerID, by?: PlayerID) {
  G.out.push(p);
  delete G.pos[p];
  log(G, { k: 'resign', p, ...(by ? { by } : {}) });
  const live = alive(G);
  if (live.length === 1) { G.result = { winner: live[0], reason: 'last' }; log(G, { k: 'win', p: live[0], reason: 'last' }); return; }
  if (G.current === p) nextTurn(G);
}

/** Leave the game at any time. */
export function resign(G: KState, p: PlayerID | null | undefined): string | undefined {
  if (G.result) return 'game over';
  if (!p || !G.players.includes(p) || G.out.includes(p)) return 'not playing';
  bowOut(G, p);
  return undefined;
}

/** Humans still in the game, lowest seat first. */
const humans = (G: KState) => G.players.filter((p) => !G.out.includes(p) && !G.bots[Number(p)]);
/** Who holds the host's buttons: the lowest seat that is human and still in. */
export const hostSeat = (G: KState): PlayerID | null => humans(G)[0] ?? null;

/** The host sends a dropped player home; the next human may send home a dropped host. */
export function dismiss(G: KState, by: PlayerID | null | undefined, seat: PlayerID): string | undefined {
  if (G.result) return 'game over';
  const h = humans(G);
  if (!by || typeof seat !== 'string' || !G.players.includes(seat) || G.out.includes(seat) || by === seat) return 'not the host';
  const ok = by === h[0] || (seat === h[0] && by === h[1]);
  if (!ok) return 'not the host';
  bowOut(G, seat, by);
  return undefined;
}

/** Where a treasure is: a board cell, or -1 on the spare. */
export function cellOf(G: Pick<KState, 'board'>, t: TreasureId): number {
  return G.board.findIndex((x) => x.t === t);
}
