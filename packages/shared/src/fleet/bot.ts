/**
 * Fleet computer opponent. It decides only from its own player view (`FleetView`), so it plays fair:
 * enemy ships, decoy and loadout are unknown to it. Deterministic for a seeded rng.
 * - Easy: random shots; fires a ready weapon now and then, anywhere.
 * - Medium: hunt (parity on the smallest ship left) and target (finish a ship once found).
 * - Hard: probability density over every placement of the ships still afloat; a smart loadout;
 *   weapons only where they beat a single shell.
 */
import { CELLS, SIZE, sq, xOf, yOf, type PlayerID } from './board';
import { SHIPS, randomDeployment, type Deployment, type Mode } from './ships';
import { isOpen, type FleetAction, type SeenCell } from './rules';
import { enemyAfloat, viewActionError, viewSalvoSize, viewWeaponReady, type FleetView } from './view';
import { AREA_WEAPONS, LOADOUT_SIZE, WEAPONS, WEAPON_IDS, patternSquares, type Dir, type WeaponId } from './weapons';

export type BotLevel = 'easy' | 'medium' | 'hard';
export const BOT_LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];

/** Hard loadouts: one defence and two weapons that pay off. */
const HARD_LOADOUTS: WeaponId[][] = [
  ['shield', 'thunderhead', 'supernova'],
  ['shield', 'maelstrom', 'airStrike'],
  ['decoy', 'thunderhead', 'torpedo'],
  ['decoy', 'maelstrom', 'supernova'],
  ['reinforcement', 'chainGun', 'supernova'],
  ['shield', 'torpedo', 'cherry'],
];

const pick = <T>(xs: readonly T[], rnd: () => number): T => xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))];
function pickN<T>(xs: readonly T[], n: number, rnd: () => number): T[] {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

export function botLoadout(level: BotLevel, rnd: () => number): WeaponId[] {
  if (level === 'hard') return [...pick(HARD_LOADOUTS, rnd)];
  if (level === 'medium') {
    const passives = WEAPON_IDS.filter((w) => WEAPONS[w].passive);
    const actives = WEAPON_IDS.filter((w) => !WEAPONS[w].passive);
    return [pick(passives, rnd), ...pickN(actives, LOADOUT_SIZE - 1, rnd)];
  }
  return pickN(WEAPON_IDS, LOADOUT_SIZE, rnd);
}

export function botDeployment(mode: Mode, level: BotLevel, rnd: () => number): Deployment {
  return randomDeployment(mode, mode === 'super' ? botLoadout(level, rnd) : [], rnd);
}

/* ---------- scoring the target grid ---------- */

const openSquares = (seen: readonly SeenCell[]) => Array.from({ length: CELLS }, (_, i) => i).filter((i) => isOpen(seen[i]));
const at = (x: number, y: number) => (x >= 0 && x < SIZE && y >= 0 && y < SIZE ? sq(x, y) : -1);

/** Medium: squares next to unfinished hits (line ends weigh more), else a parity hunt. */
function huntTarget(seen: readonly SeenCell[], lens: number[]): number[] {
  const score = Array<number>(CELLS).fill(0);
  let targeting = false;
  for (let h = 0; h < CELLS; h++) {
    if (seen[h] !== 'hit') continue;
    const x = xOf(h), y = yOf(h);
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      const line = seen[at(x + dx, y + dy)] === 'hit' || seen[at(x - dx, y - dy)] === 'hit';
      for (const s of [1, -1]) {
        // walk along the line of hits to its first non-hit square
        let k = 1;
        while (seen[at(x + s * k * dx, y + s * k * dy)] === 'hit') k++;
        const end = at(x + s * k * dx, y + s * k * dy);
        if (end >= 0 && isOpen(seen[end])) {
          score[end] += line ? 3 : 1;
          targeting = true;
        }
      }
    }
  }
  if (targeting) return score.map((v) => v * 100);
  const step = Math.max(2, Math.min(...lens, 5));
  const parity = openSquares(seen).filter((s) => (xOf(s) + yOf(s)) % step === 0);
  for (const s of parity.length ? parity : openSquares(seen)) score[s] = 1;
  return score;
}

/** Hard: how many placements of the ships still afloat cover each open square (hits make a placement far likelier). */
function density(seen: readonly SeenCell[], lens: number[]): number[] {
  const d = Array<number>(CELLS).fill(0);
  for (const len of lens) {
    for (let s = 0; s < CELLS; s++) {
      for (const dir of ['h', 'v'] as Dir[]) {
        const x = xOf(s), y = yOf(s);
        if ((dir === 'h' ? x : y) + len > SIZE) continue;
        let blocked = false, hits = 0;
        const cells: number[] = [];
        for (let i = 0; i < len; i++) {
          const c = dir === 'h' ? sq(x + i, y) : sq(x, y + i);
          const v = seen[c];
          if (v === 'miss' || v === 'sunk') { blocked = true; break; }
          if (v === 'hit') hits++;
          cells.push(c);
        }
        if (blocked) continue;
        const w = hits ? 40 ** hits : 1;
        for (const c of cells) if (isOpen(seen[c])) d[c] += w;
      }
    }
  }
  return d;
}

/** Open squares by score, best first; ties broken by the rng. */
function ranked(seen: readonly SeenCell[], score: number[], rnd: () => number): number[] {
  const open = openSquares(seen);
  const jitter = new Map(open.map((s) => [s, rnd()]));
  return open.sort((a, b) => score[b] - score[a] || jitter.get(a)! - jitter.get(b)!);
}

/* ---------- weapons ---------- */

function bestArea(id: WeaponId, seen: readonly SeenCell[], score: number[]): { sq: number; dir: Dir; value: number } {
  let best = { sq: 0, dir: 'h' as Dir, value: -1 };
  for (let s = 0; s < CELLS; s++) {
    for (const dir of (id === 'airStrike' ? ['h', 'v'] : ['h']) as Dir[]) {
      const value = patternSquares(id, s, dir).reduce((sum, c) => sum + (isOpen(seen[c]) ? score[c] : 0), 0);
      if (value > best.value) best = { sq: s, dir, value };
    }
  }
  return best;
}

function bestTorpedo(seen: readonly SeenCell[], score: number[]): { sq: number; value: number } {
  let best = { sq: sq(0, SIZE - 1), value: -1 };
  for (let x = 0; x < SIZE; x++) {
    let value = 0;
    for (let y = SIZE - 1; y >= 0; y--) if (isOpen(seen[sq(x, y)])) value += score[sq(x, y)];
    if (value > best.value) best = { sq: sq(x, SIZE - 1), value };
  }
  return { ...best, value: best.value * 0.6 };
}

function weaponChoice(V: FleetView, me: PlayerID, level: BotLevel, score: number[], top: number, rnd: () => number): FleetAction | null {
  const seen = V.sides[me].shots;
  const ready = (V.sides[me].loadout ?? []).filter((w) => viewWeaponReady(V, me, w));
  if (!ready.length) return null;
  if (level === 'easy') {
    if (rnd() < 0.5) return null;
    const id = pick(ready, rnd);
    const s = pick(openSquares(seen), rnd);
    return id === 'seaMine' ? { type: 'mine', sq: s } : { type: 'weapon', id, sq: s, dir: rnd() < 0.5 ? 'h' : 'v' };
  }
  const base = Math.max(score[top], 1e-9);
  const targeting = seen.some((c) => c === 'hit');
  const options: { a: FleetAction; value: number }[] = [];
  for (const id of ready) {
    if (AREA_WEAPONS.includes(id)) {
      const b = bestArea(id, seen, score);
      options.push({ a: { type: 'weapon', id, sq: b.sq, dir: b.dir }, value: b.value });
    } else if (id === 'torpedo') {
      const b = bestTorpedo(seen, score);
      options.push({ a: { type: 'weapon', id, sq: b.sq }, value: b.value });
    } else if (id === 'supernova') options.push({ a: { type: 'weapon', id, sq: top }, value: base * (targeting ? 3 : 1.2) });
    else if (id === 'seaMine') options.push({ a: { type: 'mine', sq: top }, value: base * 1.5 });
  }
  options.sort((p, q) => q.value - p.value);
  const best = options[0];
  if (!best) return null;
  if (level === 'hard' && best.value < base * 1.8) return null;
  return best.a;
}

/* ---------- the decision ---------- */

function legalize(V: FleetView, me: PlayerID, a: FleetAction): FleetAction {
  if (viewActionError(V, me, a) === undefined) return a;
  const open = openSquares(V.sides[me].shots);
  if (V.mode === 'salvo') return { type: 'salvo', sqs: open.slice(0, viewSalvoSize(V, me)) };
  return { type: 'shell', sq: open[0] };
}

/** The bot's whole turn, from its own view. Always legal when it is the bot's turn in battle. */
export function chooseBotAction(V: FleetView, me: PlayerID, level: BotLevel, rnd: () => number): FleetAction {
  const seen = V.sides[me].shots;
  const lens = enemyAfloat(V, me).map((c) => SHIPS[c].length);
  if (!lens.length) lens.push(2);
  const score = level === 'easy' ? seen.map((c) => (isOpen(c) ? 1 : 0)) : level === 'medium' ? huntTarget(seen, lens) : density(seen, lens);
  const order = ranked(seen, score, rnd);

  if (V.mode === 'salvo') return legalize(V, me, { type: 'salvo', sqs: order.slice(0, viewSalvoSize(V, me)) });

  if (level !== 'easy') {
    // a deflected square is a ship whose Shield is spent: shoot it again at once
    const deflected = order.find((s) => seen[s] === 'deflect');
    if (deflected !== undefined) return legalize(V, me, { type: 'shell', sq: deflected });
  }
  if (V.mode === 'super') {
    const w = weaponChoice(V, me, level, score, order[0], rnd);
    if (w) return legalize(V, me, w);
  }
  return legalize(V, me, { type: 'shell', sq: order[0] });
}

