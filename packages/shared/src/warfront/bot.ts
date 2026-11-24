import { ADJ, CONTINENTS, CONT_TERRS, TERR, TERRITORY_IDS, type ContId } from './map';
import { setsIn } from './cards';
import { NEUTRAL, connected, maxDice, mustPlaceNeutral, territoriesOf, type Action } from './rules';
import type { WarView } from './view';

export type WarBotLevel = 'easy' | 'medium' | 'hard';
export const WAR_BOT_LEVELS: WarBotLevel[] = ['easy', 'medium', 'hard'];
type Rng = () => number;

/** Enemy armies that could strike t next turn (the neutral army never attacks). */
const threat = (v: WarView, me: string, t: string) =>
  ADJ[t].reduce((s, n) => (v.owner[n] !== me && v.owner[n] !== NEUTRAL && v.owner[n] ? s + v.armies[n] - 1 : s), 0);
const isBorder = (v: WarView, me: string, t: string) => ADJ[t].some((n) => v.owner[n] !== me);
const pick = <T>(a: T[], rng: Rng) => a[Math.floor(rng() * a.length)];
const best = <T>(a: T[], score: (x: T) => number): T | undefined => {
  let b: T | undefined, s = -Infinity;
  for (const x of a) { const y = score(x); if (y > s) { s = y; b = x; } }
  return b;
};

/** Continent the bot is building toward: mission continents first, then the cheapest to complete. */
function goalConts(v: WarView, me: string, level: WarBotLevel): ContId[] {
  const m = v.missions?.[me];
  const score = (c: ContId) => {
    const ts = CONT_TERRS[c];
    const mine = ts.filter((t) => v.owner[t] === me).length / ts.length;
    const enemy = ts.reduce((s, t) => (v.owner[t] !== me ? s + v.armies[t] : s), 0);
    const bonus = CONTINENTS.find((x) => x.id === c)!.bonus;
    const missionBoost = level === 'hard' && m?.kind === 'conts' && m.conts.includes(c) ? 2 : 0;
    return mine * 3 + bonus / ts.length - enemy / 25 + missionBoost;
  };
  return [...CONTINENTS.map((c) => c.id)].sort((a, b) => score(b) - score(a)).slice(0, 2);
}

/** How much the bot wants to take territory t. */
function targetValue(v: WarView, me: string, t: string, goals: ContId[], level: WarBotLevel): number {
  const c = TERR[t].cont, ts = CONT_TERRS[c];
  const owner = v.owner[t]!;
  let s = goals.includes(c) ? 3 : 1;
  const missing = ts.filter((x) => v.owner[x] !== me).length;
  const bonus = CONTINENTS.find((x) => x.id === c)!.bonus;
  if (missing === 1) s += bonus * 2;
  if (level !== 'easy' && owner !== NEUTRAL && ts.every((x) => v.owner[x] === owner)) s += bonus * 1.5; // break a continent
  if (level === 'hard' && owner !== NEUTRAL) {
    const theirs = TERRITORY_IDS.filter((x) => v.owner[x] === owner);
    if (theirs.length <= 2) s += 6 + 2 * (v.handCount[owner] ?? 0);
    const m = v.missions?.[me];
    if (m?.kind === 'destroy' && m.target === owner) s += 4;
  }
  if (owner === NEUTRAL) s -= 0.5;
  return s;
}

/** One action for `me`, chosen only from its own view. Always legal. */
export function chooseWarAction(v: WarView, me: string, level: WarBotLevel, rng: Rng): Action {
  const a = choose(v, me, level, rng);
  return a ?? fallbackAction(v, me);
}

function choose(v: WarView, me: string, level: WarBotLevel, rng: Rng): Action | null {
  if (v.result || v.current !== me) return null;
  const mine = territoriesOf(v, me);
  const goals = goalConts(v, me, level);
  switch (v.stage) {
    case 'claim': {
      const free = TERRITORY_IDS.filter((t) => v.owner[t] === null);
      if (level === 'easy') return { type: 'claim', t: pick(free, rng) };
      const t = best(free, (t) => {
        const c = TERR[t].cont, ts = CONT_TERRS[c];
        const share = ts.filter((x) => v.owner[x] === me).length - ts.filter((x) => v.owner[x] && v.owner[x] !== me).length;
        return share * 2 + 8 / ts.length + ADJ[t].filter((n) => v.owner[n] === me).length + rng() * 0.5;
      });
      return { type: 'claim', t: t! };
    }
    case 'place': {
      if (mustPlaceNeutral(v)) {
        const ns = territoriesOf(v, NEUTRAL);
        const t = level === 'easy' ? pick(ns, rng) : best(ns, (t) => ADJ[t].filter((n) => v.owner[n] && v.owner[n] !== me && v.owner[n] !== NEUTRAL).length + rng() * 0.3);
        return { type: 'placeNeutral', t: t! };
      }
      if (level === 'easy') return { type: 'place', t: pick(mine, rng) };
      const t = best(mine.filter((t) => isBorder(v, me, t)), (t) => (goals.includes(TERR[t].cont) ? 2 : 0) + threat(v, me, t) / Math.max(1, v.armies[t]) + rng() * 0.3);
      return { type: 'place', t: t ?? mine[0] };
    }
    case 'reinforce': {
      const hand = v.hands[me] ?? [];
      const sets = setsIn(hand, (t) => v.owner[t] === me);
      const mustTrade = hand.length >= 5;
      if (sets.length && (!v.forced || hand.length > 4) && (mustTrade || level !== 'easy')) return { type: 'trade', cards: sets[0] };
      return { type: 'deploy', alloc: deployPlan(v, me, mine, goals, level, rng) };
    }
    case 'occupy': {
      const o = v.occupy!;
      const max = v.armies[o.from] - 1;
      if (level === 'easy') return { type: 'occupy', n: rng() < 0.5 ? o.min : max };
      const fromExposed = threat(v, me, o.from) > 0 || ADJ[o.from].some((n) => v.owner[n] !== me && n !== o.to);
      const toExposed = ADJ[o.to].some((n) => v.owner[n] !== me);
      const n = !fromExposed ? max : !toExposed ? o.min : Math.max(o.min, Math.round(max * (level === 'hard' ? 0.65 : 0.5)));
      return { type: 'occupy', n: Math.min(max, n) };
    }
    case 'attack': {
      const atk = chooseAttack(v, me, mine, goals, level, rng);
      if (atk) return atk;
      return chooseFortify(v, me, mine, level) ?? { type: 'endTurn' };
    }
    case 'fortify':
      return chooseFortify(v, me, mine, level) ?? { type: 'endTurn' };
    default:
      return null;
  }
}

function deployPlan(v: WarView, me: string, mine: string[], goals: ContId[], level: WarBotLevel, rng: Rng): Record<string, number> {
  let n = v.reinforcements;
  const alloc: Record<string, number> = {};
  const add = (t: string, k: number) => { if (k > 0) { alloc[t] = (alloc[t] ?? 0) + k; n -= k; } };
  const borders = mine.filter((t) => isBorder(v, me, t));
  const pool = borders.length ? borders : mine;
  if (level === 'easy') { add(pick(pool, rng), n); return alloc; }
  if (level === 'hard') {
    // shore up held continents first, at most half the armies
    for (const c of CONTINENTS) {
      if (!CONT_TERRS[c.id].every((t) => v.owner[t] === me)) continue;
      for (const t of CONT_TERRS[c.id]) {
        const need = threat(v, me, t) - v.armies[t] + 1;
        if (need > 0) add(t, Math.min(need, Math.floor(n / 2)));
      }
    }
  }
  // the rest on the best launch point: a border next to the most valuable reachable target
  const launch = best(pool, (t) => {
    const targets = ADJ[t].filter((x) => v.owner[x] !== me);
    const val = targets.reduce((s, x) => Math.max(s, targetValue(v, me, x, goals, level) - v.armies[x] / 4), 0);
    return val + v.armies[t] / 10 + rng() * 0.2;
  })!;
  add(launch, n);
  return alloc;
}

function chooseAttack(v: WarView, me: string, mine: string[], goals: ContId[], level: WarBotLevel, rng: Rng): Action | null {
  const cands: { from: string; to: string; score: number }[] = [];
  for (const from of mine) {
    const a = v.armies[from];
    if (a < 2) continue;
    for (const to of ADJ[from]) {
      if (v.owner[to] === me) continue;
      const d = v.armies[to];
      const edge = a - 1 - d;
      const ok = level === 'easy' ? (a - 1 >= d * 2 && a >= 4) || (a > 25 && a - 1 > d * 1.2)
        : level === 'medium' ? edge >= 2 || (!v.conquered && a - 1 > d && a >= 3)
          : edge >= 2 || ((a - 1) / d >= 1.4 && a >= 4) || (!v.conquered && a - 1 >= d + 1 && a >= 3);
      if (!ok) continue;
      cands.push({ from, to, score: targetValue(v, me, to, goals, level) + edge / 3 + (level === 'easy' ? rng() * 4 : 0) });
    }
  }
  const c = best(cands, (x) => x.score);
  if (!c) return null;
  if (level === 'easy' && v.armies[c.from] <= 25) return { type: 'attack', from: c.from, to: c.to, dice: maxDice(v, c.from) };
  return { type: 'blitz', from: c.from, to: c.to };
}

function chooseFortify(v: WarView, me: string, mine: string[], level: WarBotLevel): Action | null {
  if (level === 'easy') return null;
  const interior = mine.filter((t) => !isBorder(v, me, t) && v.armies[t] > 1).sort((a, b) => v.armies[b] - v.armies[a]);
  for (const from of interior) {
    const reach = [...connected(v, from)].filter((t) => t !== from && isBorder(v, me, t));
    const to = best(reach, (t) => threat(v, me, t) - v.armies[t] + (level === 'hard' ? ADJ[t].filter((n) => v.owner[n] !== me).length : 0));
    if (to) return { type: 'fortify', from, to, n: v.armies[from] - 1 };
  }
  return null;
}

/** A legal action in any state where it is `me`'s move (used when a choice is impossible). */
export function fallbackAction(v: WarView, me: string): Action {
  const mine = territoriesOf(v, me);
  switch (v.stage) {
    case 'claim': return { type: 'claim', t: TERRITORY_IDS.find((t) => v.owner[t] === null)! };
    case 'place': return mustPlaceNeutral(v) ? { type: 'placeNeutral', t: territoriesOf(v, NEUTRAL)[0] } : { type: 'place', t: mine[0] };
    case 'reinforce': {
      const hand = v.hands[me] ?? [];
      if (hand.length >= 5) return { type: 'trade', cards: setsIn(hand)[0] };
      return { type: 'deploy', alloc: { [mine[0]]: v.reinforcements } };
    }
    case 'occupy': return { type: 'occupy', n: v.occupy!.min };
    default: return { type: 'endTurn' };
  }
}
