import { ALL_ORIENTS, PIECE_IDS, orientations, squaresOf, type Place, type PieceId } from './pieces';
import {
  AVATARS, BONUS_ALL, BONUS_MONO, CLASSIC_STARTS, DUO_STARTS, GUILDS, LOG_KEEP, MAX_PLAYERS, MIN_PLAYERS, SIZES,
  type Board, type Guild,
} from './tuning';

/**
 * Blocky rules: pure functions over a plain state. `act` validates one action and applies it, returning an
 * error string (nothing changed) or undefined. A rejected placement returns its `Reason` code. Everything random
 * comes in as `rng`. Board truth is `placed` (and `cells`, an index into it); the log is only the public story.
 */
export type PlayerID = string;
export type Reason = 'offBoard' | 'overlap' | 'ownEdge' | 'noCorner' | 'notStart' | 'notYours' | 'used' | 'grounded';
export type Action = ({ k: 'place' } & Place) | { k: 'done' };
/** n = global placement index (its index in `placed`). */
export interface Placed extends Place { guild: Guild; n: number }
export type BEvent = { n: number } & (
  | { k: 'start'; seats: Record<Guild, string | 'shared'> }
  | { k: 'place'; p: string; guild: Guild; piece: PieceId; orient: number; at: number; points: number }
  | { k: 'stuck'; guild: Guild } | { k: 'done'; p: string } | { k: 'resign'; p: string } | { k: 'dismiss'; p: string; by: string }
  | { k: 'turn'; guild: Guild; actor: string } | { k: 'end'; scores: Record<string, number> });
type NoN<T> = T extends unknown ? Omit<T, 'n'> : never;
export interface BResult { ranking: string[]; scores: Record<string, number>; winners: string[] }

export interface BState {
  board: Board;
  size: 14 | 20;
  /** -1 or an index into `placed` */
  cells: number[];
  placed: Placed[];
  /** guilds in play, in play order */
  guilds: Guild[];
  /** the seat leading each guild, or 'shared'; '' for a guild not in play */
  seats: Record<Guild, string | 'shared'>;
  /** the seats, in the order of the guilds they lead first (the shared guild rotates through this) */
  order: string[];
  /** how many turns the shared guild has had */
  sharedTurns: number;
  /** the pieces each guild still holds, in PIECE_IDS order */
  shelf: Record<Guild, PieceId[]>;
  /** guilds that are stuck, finished or sent home */
  grounded: Guild[];
  /** resigned or dismissed seats */
  out: string[];
  /** the guild to place, and the seat that must act for it (compare `actor`, never `current`) */
  current: Guild;
  actor: string;
  hints: boolean;
  bots: boolean[];
  avatars: number[];
  log: BEvent[];
  logTotal: number;
  result: BResult | null;
}

export interface GameOpts { board?: Board; hints?: boolean; bots?: boolean[]; avatars?: number[] }

// ---- geometry --------------------------------------------------------------------------------------------------

export function startIndex(board: Board, guild: Guild): number | null {
  const st = board === 'duo' ? DUO_STARTS[guild] : CLASSIC_STARTS[guild];
  return st ? st[0] * SIZES[board] + st[1] : null;
}

/** Board indices covered by a placement (assumes it lies on the board). */
export function cellsOf(size: number, p: Place): number[] {
  const sh = orientations(p.piece)[p.orient];
  const r0 = Math.floor(p.at / size), c0 = p.at % size;
  return sh.cells.map(([r, c]) => (r0 + r) * size + c0 + c);
}

const EDGE: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const startedBy = (s: BState, guild: Guild) => { for (const q of s.placed) if (q.guild === guild) return true; return false; };

/** Why a placement is illegal for `guild` right now, or null. (Whose turn it is is `act`'s business.) */
export function canPlace(s: BState, guild: Guild, p: Place): Reason | null {
  if (!s.guilds.includes(guild)) return 'notYours';
  if (s.grounded.includes(guild)) return 'grounded';
  if (!s.shelf[guild].includes(p.piece)) return 'used';
  const size = s.size;
  const sh = Number.isInteger(p.orient) ? orientations(p.piece)[p.orient] : undefined;
  if (!sh || !Number.isInteger(p.at) || p.at < 0 || p.at >= size * size) return 'offBoard';
  const r0 = Math.floor(p.at / size), c0 = p.at % size;
  if (r0 + sh.h > size || c0 + sh.w > size) return 'offBoard';
  const idx = sh.cells.map(([r, c]) => (r0 + r) * size + c0 + c);
  for (const i of idx) if (s.cells[i] >= 0) return 'overlap';
  if (!startedBy(s, guild)) return idx.includes(startIndex(s.board, guild) ?? -1) ? null : 'notStart';
  const mine = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size && s.cells[r * size + c] >= 0 && s.placed[s.cells[r * size + c]].guild === guild;
  let corner = false;
  for (const i of idx) {
    const r = Math.floor(i / size), c = i % size;
    for (const [dr, dc] of EDGE) if (mine(r + dr, c + dc)) return 'ownEdge';
    if (!corner) for (const [dr, dc] of DIAG) if (mine(r + dr, c + dc)) { corner = true; break; }
  }
  return corner ? null : 'noCorner';
}

/** What a guild's board looks like to it: squares it may not cover, its own squares, and its open corners. */
export interface Grid { blocked: Uint8Array; own: Uint8Array; anchors: number[] }
export function gridOf(s: BState, guild: Guild): Grid {
  const size = s.size, N = size * size;
  const blocked = new Uint8Array(N), own = new Uint8Array(N);
  let started = false;
  for (let i = 0; i < N; i++) {
    const k = s.cells[i];
    if (k >= 0) { blocked[i] = 1; if (s.placed[k].guild === guild) { own[i] = 1; started = true; } }
  }
  if (!started) {
    const st = startIndex(s.board, guild);
    return { blocked, own, anchors: st !== null && !blocked[st] && s.guilds.includes(guild) ? [st] : [] };
  }
  for (let i = 0; i < N; i++) if (own[i]) {
    const r = Math.floor(i / size), c = i % size;
    for (const [dr, dc] of EDGE) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < size && cc < size) blocked[rr * size + cc] = 1; }
  }
  const mark = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (own[i]) {
    const r = Math.floor(i / size), c = i % size;
    for (const [dr, dc] of DIAG) { const rr = r + dr, cc = c + dc; if (rr >= 0 && cc >= 0 && rr < size && cc < size && !blocked[rr * size + cc]) mark[rr * size + cc] = 1; }
  }
  const anchors: number[] = [];
  for (let i = 0; i < N; i++) if (mark[i]) anchors.push(i);
  return { blocked, own, anchors };
}

/** Every open corner (or the start square before the first piece), live or dead. */
export function rawAnchors(s: BState, guild: Guild): number[] {
  return gridOf(s, guild).anchors;
}

/** Calls `visit` for each placement of `piece` covering `anchor`; stops early when it returns true. */
function eachAt(size: number, blocked: Uint8Array, piece: PieceId, anchor: number, visit: (p: Place) => boolean | void): boolean {
  const ar = Math.floor(anchor / size), ac = anchor % size;
  const os = orientations(piece);
  for (let o = 0; o < os.length; o++) {
    const sh = os[o];
    for (const [dr, dc] of sh.cells) {
      const r0 = ar - dr, c0 = ac - dc;
      if (r0 < 0 || c0 < 0 || r0 + sh.h > size || c0 + sh.w > size) continue;
      let ok = true;
      for (const [r, c] of sh.cells) if (blocked[(r0 + r) * size + c0 + c]) { ok = false; break; }
      if (ok && visit({ piece, orient: o, at: r0 * size + c0 }) === true) return true;
    }
  }
  return false;
}

const live = (s: BState, g: Guild) => s.guilds.includes(g) && !s.grounded.includes(g);

/** All legal placements of one piece (corner-anchored, deduplicated). */
export function fits(s: BState, guild: Guild, piece: PieceId): Place[] {
  if (!live(s, guild) || !s.shelf[guild].includes(piece)) return [];
  const gr = gridOf(s, guild), out: Place[] = [];
  const seen = new Set<number>();
  for (const a of gr.anchors) eachAt(s.size, gr.blocked, piece, a, (p) => {
    const k = p.at * 91 + FIRST[piece] + p.orient;
    if (!seen.has(k)) { seen.add(k); out.push(p); }
  });
  return out;
}

/** Every legal placement for a guild, in shelf order. */
export function legalMoves(s: BState, guild: Guild): Place[] {
  if (!live(s, guild)) return [];
  const gr = gridOf(s, guild), out: Place[] = [];
  if (!gr.anchors.length) return out;
  const seen = new Uint8Array(s.size * s.size * 91);
  for (const piece of s.shelf[guild]) {
    const base = FIRST[piece];
    for (const a of gr.anchors) eachAt(s.size, gr.blocked, piece, a, (p) => {
      const k = p.at * 91 + base + p.orient;
      if (!seen[k]) { seen[k] = 1; out.push(p); }
    });
  }
  return out;
}
const FIRST = Object.fromEntries(PIECE_IDS.map((id) => [id, ALL_ORIENTS.find((o) => o.piece === id)!.gid])) as Record<PieceId, number>;

/** Is there any legal placement? (early exit) */
export function hasMove(s: BState, guild: Guild): boolean {
  if (!live(s, guild)) return false;
  const gr = gridOf(s, guild);
  for (const piece of s.shelf[guild]) for (const a of gr.anchors) if (eachAt(s.size, gr.blocked, piece, a, () => true)) return true;
  return false;
}

/** Open corners where some remaining piece really fits (the number the danger badge needs). */
export function anchors(s: BState, guild: Guild): number[] {
  if (!live(s, guild)) return [];
  const gr = gridOf(s, guild);
  return gr.anchors.filter((a) => s.shelf[guild].some((piece) => eachAt(s.size, gr.blocked, piece, a, () => true)));
}

/** Put a piece on the board without any rules (callers check `canPlace` first). Returns its index in `placed`. */
export function applyPlace(s: BState, guild: Guild, p: Place): number {
  const n = s.placed.length;
  s.placed.push({ piece: p.piece, orient: p.orient, at: p.at, guild, n });
  for (const i of cellsOf(s.size, p)) s.cells[i] = n;
  s.shelf[guild] = s.shelf[guild].filter((x) => x !== p.piece);
  return n;
}

// ---- scoring ---------------------------------------------------------------------------------------------------

const left = (s: BState, g: Guild) => s.shelf[g].reduce((n, id) => n + squaresOf(id), 0);
/** Squares a guild has put on the board. */
export const squaresPlaced = (s: BState, g: Guild) => s.placed.reduce((n, q) => n + (q.guild === g ? squaresOf(q.piece) : 0), 0);

/** Advanced scoring per guild: -1 per square left on the shelf; +15 for all 21 pieces, +20 if the last was the monomino. */
export function score(s: BState): Record<Guild, number> {
  const out = { tide: 0, sun: 0, ember: 0, grove: 0 } as Record<Guild, number>;
  for (const g of s.guilds) {
    let v = -left(s, g);
    if (!s.shelf[g].length) {
      let last: Placed | undefined;
      for (const q of s.placed) if (q.guild === g) last = q;
      v += last?.piece === 'I1' ? BONUS_MONO : BONUS_ALL;
    }
    out[g] = v;
  }
  return out;
}
/** Each seat's score: its guilds added together (the shared guild is not scored). */
export function playerScores(s: BState): Record<string, number> {
  const g = score(s);
  const out: Record<string, number> = Object.fromEntries(s.order.map((p) => [p, 0]));
  for (const guild of s.guilds) if (s.seats[guild] !== 'shared') out[s.seats[guild]] += g[guild];
  return out;
}
/** The guilds a seat leads. */
export const guildsOf = (s: BState, p: PlayerID): Guild[] => s.guilds.filter((g) => s.seats[g] === p);

// ---- setup -----------------------------------------------------------------------------------------------------

function shuffle<T>(a: T[], rng: () => number): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}

export function newGame(n: number, rng: () => number, o: GameOpts = {}): BState {
  if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new Error('2-4 players');
  const board: Board = n === 2 && (o.board ?? 'duo') === 'duo' ? 'duo' : 'classic';
  const sh = shuffle(Array.from({ length: n }, (_, i) => String(i)), rng);
  const guilds: Guild[] = board === 'duo' ? ['tide', 'ember'] : [...GUILDS];
  const seats = { tide: '', sun: '', ember: '', grove: '' } as Record<Guild, string>;
  if (board === 'duo') { seats.tide = sh[0]; seats.ember = sh[1]; }
  else if (n === 2) { seats.tide = seats.ember = sh[0]; seats.sun = seats.grove = sh[1]; }
  else { seats.tide = sh[0]; seats.sun = sh[1]; seats.ember = sh[2]; seats.grove = n === 4 ? sh[3] : 'shared'; }
  const s: BState = {
    board, size: SIZES[board], cells: new Array(SIZES[board] ** 2).fill(-1), placed: [],
    guilds, seats, order: sh, sharedTurns: 0,
    shelf: Object.fromEntries(GUILDS.map((g) => [g, guilds.includes(g) ? [...PIECE_IDS] : []])) as Record<Guild, PieceId[]>,
    grounded: [], out: [], current: guilds[guilds.length - 1], actor: '',
    hints: o.hints ?? true, bots: sh.map((_, i) => !!o.bots?.[i]),
    avatars: sh.map((_, i) => (o.avatars?.[i] ?? i) % AVATARS),
    log: [], logTotal: 0, result: null,
  };
  log(s, { k: 'start', seats: { ...seats } });
  settle(s, true);
  return s;
}

// ---- turns -----------------------------------------------------------------------------------------------------

function log(s: BState, e: NoN<BEvent>) {
  s.logTotal++;
  s.log.push({ ...e, n: s.logTotal } as BEvent);
  if (s.log.length > LOG_KEEP) s.log.splice(0, s.log.length - LOG_KEEP);
}
const ground = (s: BState, g: Guild) => { if (!s.grounded.includes(g)) s.grounded.push(g); };
export const alive = (s: Pick<BState, 'order' | 'out'>) => s.order.filter((p) => !s.out.includes(p));

/** The seat that plays a guild now. The shared guild's k-th turn goes to order[k % n], or the next live seat after it. */
export function seatOf(s: BState, guild: Guild): string {
  const h = s.seats[guild];
  if (h !== 'shared') return h;
  const n = s.order.length;
  for (let j = 0; j < n; j++) { const p = s.order[(s.sharedTurns + j) % n]; if (!s.out.includes(p)) return p; }
  return s.order[s.sharedTurns % n];
}

function finish(s: BState) {
  const scores = playerScores(s);
  const idx = (p: string) => s.order.indexOf(p);
  const by = (a: string, b: string) => scores[b] - scores[a] || idx(a) - idx(b);
  const inGame = s.order.filter((p) => !s.out.includes(p)).sort(by);
  const gone = s.order.filter((p) => s.out.includes(p)).sort(by);
  const ranking = [...inGame, ...gone];
  const pool = inGame.length ? inGame : gone;
  const best = Math.max(...pool.map((p) => scores[p]));
  s.result = { ranking, scores, winners: pool.filter((p) => scores[p] === best) };
  log(s, { k: 'end', scores });
}

/**
 * Find the guild to play: from the next one after `current` (step) or from `current` itself, skipping grounded
 * guilds and grounding (with a `stuck` event) any that cannot move. Ends the game when nobody can.
 */
function settle(s: BState, step: boolean) {
  if (alive(s).length <= 1) return finish(s);
  const gs = s.guilds;
  const pg = s.current, pa = s.actor;
  const from = gs.indexOf(s.current) + (step ? 1 : 0);
  for (let t = 0; t < gs.length; t++) {
    const g = gs[(from + t) % gs.length];
    if (s.grounded.includes(g)) continue;
    if (!hasMove(s, g)) { ground(s, g); if (s.shelf[g].length) log(s, { k: 'stuck', guild: g }); continue; }
    s.current = g;
    s.actor = seatOf(s, g);
    if (step || g !== pg || s.actor !== pa) log(s, { k: 'turn', guild: g, actor: s.actor });
    return;
  }
  finish(s);
}

export function act(s: BState, p: PlayerID | null | undefined, a: Action): string | undefined {
  if (s.result) return 'game over';
  if (!p || !s.order.includes(p) || s.out.includes(p)) return 'not playing';
  if (!a || typeof a !== 'object') return 'bad action';
  if (p !== s.actor) return 'notYours';
  if (a.k === 'place') {
    if (typeof a.piece !== 'string' || !Number.isInteger(a.orient) || !Number.isInteger(a.at)) return 'bad action';
    const g = s.current;
    const why = canPlace(s, g, a);
    if (why) return why;
    applyPlace(s, g, a);
    log(s, { k: 'place', p, guild: g, piece: a.piece, orient: a.orient, at: a.at, points: squaresOf(a.piece) });
    if (s.seats[g] === 'shared') s.sharedTurns++;
    if (!s.shelf[g].length) ground(s, g);
    settle(s, true);
    return undefined;
  }
  if (a.k === 'done') {
    const own = guildsOf(s, p).filter((g) => !s.grounded.includes(g));
    if (!own.length) return 'nothing to ground';
    own.forEach((g) => ground(s, g));
    log(s, { k: 'done', p });
    settle(s, false);
    return undefined;
  }
  return 'bad action';
}

function bowOut(s: BState, p: PlayerID, by?: PlayerID) {
  s.out.push(p);
  guildsOf(s, p).forEach((g) => ground(s, g));
  log(s, by ? { k: 'dismiss', p, by } : { k: 'resign', p });
  settle(s, false);
}

/** Leave the game at any time: your guilds are grounded and you rank last. */
export function resign(s: BState, p: PlayerID | null | undefined): string | undefined {
  if (s.result) return 'game over';
  if (!p || !s.order.includes(p) || s.out.includes(p)) return 'not playing';
  bowOut(s, p);
  return undefined;
}

/** Humans still in the game, lowest seat first. */
const humans = (s: BState) => s.order.filter((p) => !s.out.includes(p) && !s.bots[Number(p)]).sort((a, b) => Number(a) - Number(b));
/** Who holds the host's buttons: the lowest seat that is human and still in. */
export const hostSeat = (s: BState): PlayerID | null => humans(s)[0] ?? null;

/** The host sends a dropped player home; the next human may send home a dropped host. */
export function dismiss(s: BState, by: PlayerID | null | undefined, seat: PlayerID): string | undefined {
  if (s.result) return 'game over';
  const h = humans(s);
  if (!by || typeof seat !== 'string' || !s.order.includes(seat) || s.out.includes(seat) || by === seat) return 'not the host';
  const ok = by === h[0] || (seat === h[0] && by === h[1]);
  if (!ok) return 'not the host';
  bowOut(s, seat, by);
  return undefined;
}
