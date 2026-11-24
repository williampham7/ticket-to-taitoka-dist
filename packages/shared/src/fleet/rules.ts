/**
 * Fleet rules on the full state (pure, no boardgame.io). G holds everything; `view.ts` decides what each player sees.
 * Randomness (Sea Mine drift) comes in as `rng`: the server's seeded random in the game, a PRNG in tests.
 */
import { CELLS, isSquare, neighbours, other, sq, xOf, type PlayerID } from './board';
import { SHIPS, shipSquares, validateDeployment, type Deployment, type Mode, type ShipClass } from './ships';
import { AREA_WEAPONS, WEAPONS, isWeaponId, patternSquares, type Dir, type WeaponId } from './weapons';

/** A resolved square on a target grid. `deflect` = a Shield took it: a ship is there, and it may be shot again. */
export type Cell = 'miss' | 'hit' | 'deflect' | 'sunk';
/** A square as one player sees it (null = not shot). */
export type SeenCell = Cell | null;
export type Stage = 'placement' | 'battle' | 'roundEnd' | 'over';
export type BestOf = 1 | 3 | 5;

export interface Ship { cls: ShipClass; squares: number[]; hits: number[]; shield: boolean; sunk: boolean }

/** Match totals for one player (all rounds). */
export interface Stats { shots: number; hits: number; turns: number; sunk: number; lost: number; salvoAll5: boolean }

export interface Side {
  deployed: boolean;
  /** roundEnd: wants the next round */
  ready: boolean;
  ships: Ship[];
  decoy: number | null;
  decoyHit: boolean;
  loadout: WeaponId[];
  /** charge counters of the active weapons in the loadout */
  charge: Partial<Record<WeaponId, number>>;
  /** once-per-round weapons already fired */
  spent: WeaponId[];
  /** this player's live Sea Mine on the enemy grid (nobody sees it) */
  mine: number | null;
  mineFresh: boolean;
  /** this player's results on the enemy grid (the truth) */
  shots: (Cell | null)[];
  /** turns taken this round */
  turns: number;
  stats: Stats;
}

export type FleetAction =
  | { type: 'shell'; sq: number }
  | { type: 'salvo'; sqs: number[] }
  | { type: 'weapon'; id: WeaponId; sq: number; dir?: Dir }
  | { type: 'mine'; sq: number };

/** One resolved action, in order. The view filters it per player; the client animates new ones. */
export interface Report {
  seq: number;
  by: PlayerID;
  round: number;
  kind: 'shell' | 'salvo' | 'weapon' | 'mine';
  weapon?: WeaponId;
  anchor?: number;
  dir?: Dir;
  cells: { sq: number; r: Cell }[];
  sunk: ShipClass[];
}

export interface RoundRecord { winner: PlayerID; turns: Record<PlayerID, number>; lost: Record<PlayerID, number> }

export interface FleetState {
  mode: Mode;
  bestOf: BestOf;
  round: number;
  wins: Record<PlayerID, number>;
  /** opens the current round */
  opener: PlayerID;
  turn: PlayerID;
  stage: Stage;
  sides: Record<PlayerID, Side>;
  log: Report[];
  seq: number;
  rounds: RoundRecord[];
  result: { winner: PlayerID; reason: 'fleet' | 'resign' } | null;
}

export const LOG_KEEP = 60;
export const winsNeeded = (bestOf: BestOf): number => (bestOf + 1) / 2;

const newStats = (): Stats => ({ shots: 0, hits: 0, turns: 0, sunk: 0, lost: 0, salvoAll5: false });
function newSide(stats: Stats = newStats()): Side {
  return {
    deployed: false, ready: false, ships: [], decoy: null, decoyHit: false, loadout: [], charge: {}, spent: [],
    mine: null, mineFresh: false, shots: Array(CELLS).fill(null), turns: 0, stats,
  };
}

export function newMatch(mode: Mode, bestOf: BestOf, opener: PlayerID): FleetState {
  return {
    mode, bestOf, round: 1, wins: { 0: 0, 1: 0 }, opener, turn: opener, stage: 'placement',
    sides: { 0: newSide(), 1: newSide() }, log: [], seq: 0, rounds: [], result: null,
  };
}

/* ---------- placement ---------- */

export function deploy(S: FleetState, p: PlayerID, d: Deployment): string | undefined {
  if (S.stage !== 'placement') return 'not placing';
  const side = S.sides[p];
  if (side.deployed) return 'already deployed';
  const err = validateDeployment(S.mode, d);
  if (err) return err;
  const shield = d.loadout.includes('shield');
  side.ships = d.ships.map((s) => ({ cls: s.cls, squares: shipSquares(s)!, hits: [], shield, sunk: false }));
  side.loadout = [...d.loadout];
  side.decoy = d.loadout.includes('decoy') ? (d.decoy as number) : null;
  side.charge = {};
  for (const w of side.loadout) if (!WEAPONS[w].passive) side.charge[w] = 0;
  side.deployed = true;
  if (S.sides['0'].deployed && S.sides['1'].deployed) {
    S.stage = 'battle';
    S.turn = S.opener;
    tick(S, S.turn);
  }
  return undefined;
}

export function undeploy(S: FleetState, p: PlayerID): string | undefined {
  if (S.stage !== 'placement' || !S.sides[p].deployed) return 'nothing to take back';
  S.sides[p] = newSide(S.sides[p].stats);
  return undefined;
}

/* ---------- what a player sees of their own shots ---------- */

export const seenShots = (S: FleetState, p: PlayerID): SeenCell[] => S.sides[p].shots.slice();

/** A square a shell may target: never shot, or deflected. */
export const isOpen = (c: SeenCell | undefined): boolean => c === null || c === 'deflect';

export const afloat = (side: Pick<Side, 'ships'>): number => side.ships.filter((s) => !s.sunk).length;

export function salvoSize(S: FleetState, p: PlayerID): number {
  return Math.min(afloat(S.sides[p]), seenShots(S, p).filter(isOpen).length);
}

/** Can `p` fire this weapon now (ignoring whose turn it is)? */
export function weaponReady(S: FleetState, p: PlayerID, id: WeaponId): boolean {
  const side = S.sides[p];
  return S.mode === 'super' && weaponReadyFor(side, id);
}

/** Readiness from what a player knows of their own side; shared with the view and the bot. */
export function weaponReadyFor(
  side: Pick<Side, 'loadout' | 'charge' | 'spent'> & { mine?: number | null; mineLive?: boolean },
  id: WeaponId,
): boolean {
  const def = WEAPONS[id];
  if (!def || def.passive || !side.loadout.includes(id)) return false;
  if ((side.charge[id] ?? 0) < def.charge) return false;
  if (def.oncePerRound && side.spent.includes(id)) return false;
  if (id === 'seaMine' && (side.mineLive ?? (side.mine !== null && side.mine !== undefined))) return false;
  return true;
}

/**
 * Why `a` is not a legal action for a player who sees `seen` on their target grid, or undefined.
 * Turn and stage are checked by `actionError`; this part only needs what the player knows.
 */
export function actionErrorFor(
  mode: Mode, seen: readonly SeenCell[], ready: (id: WeaponId) => boolean, salvo: number, a: FleetAction,
): string | undefined {
  if (!a || typeof a !== 'object') return 'bad action';
  switch (a.type) {
    case 'shell':
      if (mode === 'salvo') return 'fire a salvo';
      return isSquare(a.sq) && isOpen(seen[a.sq]) ? undefined : 'not an open square';
    case 'salvo': {
      if (mode !== 'salvo') return 'no salvo in this mode';
      if (!Array.isArray(a.sqs) || a.sqs.length !== salvo) return `mark ${salvo} squares`;
      if (new Set(a.sqs).size !== a.sqs.length) return 'squares must differ';
      return a.sqs.every((s) => isSquare(s) && isOpen(seen[s])) ? undefined : 'not an open square';
    }
    case 'mine':
      if (mode !== 'super' || !ready('seaMine')) return 'Sea Mine not ready';
      return isSquare(a.sq) ? undefined : 'not a square';
    case 'weapon': {
      if (mode !== 'super') return 'no weapons in this mode';
      if (!isWeaponId(a.id) || a.id === 'seaMine') return 'bad weapon';
      if (!ready(a.id)) return 'weapon not ready';
      if (!isSquare(a.sq)) return 'not a square';
      if (a.id === 'torpedo') {
        const x = xOf(a.sq);
        return Array.from({ length: 10 }, (_, y) => sq(x, y)).some((s) => isOpen(seen[s])) ? undefined : 'column already cleared';
      }
      if (a.id === 'supernova') return isOpen(seen[a.sq]) ? undefined : 'not an open square';
      if (a.dir !== undefined && a.dir !== 'h' && a.dir !== 'v') return 'bad direction';
      if (!AREA_WEAPONS.includes(a.id)) return 'bad weapon';
      return patternSquares(a.id, a.sq, a.dir ?? 'h').some((s) => isOpen(seen[s])) ? undefined : 'nothing left to hit there';
    }
    default:
      return 'bad action';
  }
}

export function actionError(S: FleetState, p: PlayerID, a: FleetAction): string | undefined {
  if (S.stage !== 'battle') return 'not in battle';
  if (S.turn !== p) return 'not your turn';
  return actionErrorFor(S.mode, seenShots(S, p), (id) => weaponReady(S, p, id), salvoSize(S, p), a);
}

/* ---------- resolving ---------- */

/** A ship square not yet damaged, or the Decoy not yet hit: what a Torpedo or a Sea Mine goes off on. */
function liveTarget(S: FleetState, defender: PlayerID, s: number): boolean {
  const D = S.sides[defender];
  if (D.ships.some((sh) => !sh.sunk && sh.squares.includes(s) && !sh.hits.includes(s))) return true;
  return D.decoy === s && !D.decoyHit;
}

/** `p` strikes square `s` of the enemy grid. */
function strike(S: FleetState, p: PlayerID, s: number, rep: Report, supernova = false): Cell {
  const A = S.sides[p], D = S.sides[other(p)];
  const ship = D.ships.find((sh) => sh.squares.includes(s));
  let r: Cell;
  if (ship && !ship.sunk && !ship.hits.includes(s)) {
    if (ship.shield) {
      ship.shield = false;
      r = 'deflect';
    } else {
      ship.hits = supernova ? [...ship.squares] : [...ship.hits, s];
      r = 'hit';
    }
  } else if (ship) r = A.shots[s] ?? 'hit';
  else if (D.decoy === s) {
    D.decoyHit = true;
    r = 'hit';
  } else r = 'miss';
  A.shots[s] = r;
  A.stats.shots++;
  if (r === 'hit') A.stats.hits++;
  rep.cells.push({ sq: s, r });
  if (ship && r === 'hit' && !ship.sunk && ship.squares.every((q) => ship.hits.includes(q))) {
    ship.sunk = true;
    for (const q of ship.squares) A.shots[q] = 'sunk';
    rep.sunk.push(ship.cls);
    A.stats.sunk++;
    D.stats.lost++;
  }
  return r;
}

const fleetDown = (S: FleetState, p: PlayerID) => S.sides[p].ships.every((s) => s.sunk);

function report(S: FleetState, p: PlayerID, kind: Report['kind'], extra: Partial<Report> = {}): Report {
  return { seq: ++S.seq, by: p, round: S.round, kind, cells: [], sunk: [], ...extra };
}

function push(S: FleetState, rep: Report) {
  S.log.push(rep);
  if (S.log.length > LOG_KEEP) S.log.splice(0, S.log.length - LOG_KEEP);
}

/** Charge the active weapons at the start of `p`'s turn. */
function tick(S: FleetState, p: PlayerID) {
  const side = S.sides[p];
  for (const w of Object.keys(side.charge) as WeaponId[]) side.charge[w] = Math.min((side.charge[w] ?? 0) + 1, WEAPONS[w].charge);
}

function endRound(S: FleetState, winner: PlayerID) {
  S.wins[winner]++;
  const lost = (p: PlayerID) => S.sides[p].ships.filter((s) => s.sunk).length;
  S.rounds.push({ winner, turns: { 0: S.sides['0'].turns, 1: S.sides['1'].turns }, lost: { 0: lost('0'), 1: lost('1') } });
  S.sides['0'].ready = S.sides['1'].ready = false;
  if (S.wins[winner] >= winsNeeded(S.bestOf)) {
    S.result = { winner, reason: 'fleet' };
    S.stage = 'over';
  } else S.stage = 'roundEnd';
}

/** Apply `p`'s whole turn. Returns an error (and changes nothing) when the action is not legal. */
export function act(S: FleetState, p: PlayerID, a: FleetAction, rng: () => number): string | undefined {
  const err = actionError(S, p, a);
  if (err) return err;
  const e = other(p);
  const A = S.sides[p];
  A.turns++;
  A.stats.turns++;
  const won = () => fleetDown(S, e);

  switch (a.type) {
    case 'shell': {
      const rep = report(S, p, 'shell');
      strike(S, p, a.sq, rep);
      push(S, rep);
      break;
    }
    case 'salvo': {
      const rep = report(S, p, 'salvo');
      for (const s of a.sqs) {
        if (won()) break;
        strike(S, p, s, rep);
      }
      const hitShips = new Set(rep.cells.filter((c) => c.r === 'hit').map((c) => S.sides[e].ships.findIndex((sh) => sh.squares.includes(c.sq))).filter((i) => i >= 0));
      if (hitShips.size >= 5) A.stats.salvoAll5 = true;
      push(S, rep);
      break;
    }
    case 'mine': {
      A.charge.seaMine = 0;
      const rep = report(S, p, 'weapon', { weapon: 'seaMine', anchor: a.sq });
      if (liveTarget(S, e, a.sq)) strike(S, p, a.sq, rep);
      else {
        A.mine = a.sq;
        A.mineFresh = true;
      }
      push(S, rep);
      break;
    }
    case 'weapon': {
      const id = a.id;
      A.charge[id] = 0;
      if (WEAPONS[id].oncePerRound) A.spent.push(id);
      const rep = report(S, p, 'weapon', { weapon: id, anchor: a.sq });
      if (id === 'supernova') strike(S, p, a.sq, rep, true);
      else if (id === 'torpedo') {
        const x = xOf(a.sq);
        rep.anchor = sq(x, 9);
        for (let y = 9; y >= 0; y--) {
          const s = sq(x, y);
          if (liveTarget(S, e, s)) {
            strike(S, p, s, rep);
            break;
          }
          if (A.shots[s] === null) {
            A.shots[s] = 'miss';
            rep.cells.push({ sq: s, r: 'miss' });
          }
        }
      } else {
        rep.dir = id === 'airStrike' ? a.dir ?? 'h' : undefined;
        if (rep.dir === undefined) delete rep.dir;
        const seen = seenShots(S, p);
        for (const s of patternSquares(id, a.sq, a.dir ?? 'h')) {
          if (won()) break;
          if (isOpen(seen[s])) strike(S, p, s, rep);
        }
      }
      push(S, rep);
      break;
    }
  }

  // end of the turn: the mine drifts (not on the turn it was dropped)
  if (!won() && A.mine !== null) {
    if (A.mineFresh) A.mineFresh = false;
    else {
      const ns = neighbours(A.mine);
      A.mine = ns[Math.min(ns.length - 1, Math.floor(rng() * ns.length))];
      if (liveTarget(S, e, A.mine)) {
        const rep = report(S, p, 'mine', { anchor: A.mine });
        strike(S, p, A.mine, rep);
        A.mine = null;
        push(S, rep);
      }
    }
  }

  if (won()) endRound(S, p);
  else {
    S.turn = e;
    tick(S, e);
  }
  return undefined;
}

/** roundEnd: a player is ready for the next round; when both are, the fleets are placed again and the loser opens. */
export function nextRound(S: FleetState, p: PlayerID): string | undefined {
  if (S.stage !== 'roundEnd' || S.sides[p].ready) return 'not between rounds';
  S.sides[p].ready = true;
  if (!S.sides['0'].ready || !S.sides['1'].ready) return undefined;
  const lastWinner = S.rounds[S.rounds.length - 1].winner;
  S.round++;
  S.opener = other(lastWinner);
  S.turn = S.opener;
  S.sides = { 0: newSide(S.sides['0'].stats), 1: newSide(S.sides['1'].stats) };
  S.log = [];
  S.stage = 'placement';
  return undefined;
}

export function resign(S: FleetState, p: PlayerID): string | undefined {
  if (S.result) return 'already over';
  S.result = { winner: other(p), reason: 'resign' };
  S.stage = 'over';
  return undefined;
}

export const shipName = (c: ShipClass): string => SHIPS[c].name;
