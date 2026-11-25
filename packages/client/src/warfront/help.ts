import { CONTINENTS, CONT_TERRS, START_ARMIES, continentsOf, territoriesOf, type WarView } from '@boboland/shared/src/warfront';

/** Player-facing numbers that the rules imply but never show: income breakdown, army totals, attack odds. */
export interface Income { territories: number; base: number; conts: { name: string; bonus: number }[]; total: number }
export function incomeOf(v: WarView, p: string): Income {
  const territories = territoriesOf(v, p).length;
  const base = Math.max(3, Math.floor(territories / 3));
  const conts = continentsOf(v, p).map((c) => ({ name: c.name, bonus: c.bonus }));
  return { territories, base, conts, total: base + conts.reduce((s, c) => s + c.bonus, 0) };
}
export const armiesOf = (v: WarView, p: string) => territoriesOf(v, p).reduce((s, t) => s + v.armies[t], 0);
export const startArmies = (v: WarView) => START_ARMIES[v.players.length] ?? 30;

/** Armies traded in this turn (since the last turn event) by p. */
export function tradedThisTurn(v: WarView, p: string): number {
  let n = 0;
  for (let i = v.log.length - 1; i >= 0; i--) {
    const e = v.log[i];
    if (e.k === 'turn') break;
    if (e.k === 'trade' && e.p === p) n += e.armies;
  }
  return n;
}

/** Continents closest to completion for p: how many territories are still missing. */
export function nearContinents(v: WarView, p: string) {
  return CONTINENTS.map((c) => ({ c, missing: CONT_TERRS[c.id].filter((t) => v.owner[t] !== p).length }))
    .filter((x) => x.missing > 0 && x.missing <= 2).sort((a, b) => a.missing - b.missing);
}

// one roll: [P(defender loses all compared), P(split), P(attacker loses all compared)] by [attacker dice][defender dice]
const ROLL: Record<string, [number, number, number]> = {
  '3,2': [0.3717, 0.3358, 0.2926], '2,2': [0.2276, 0.3241, 0.4483], '1,2': [0.2546, 0, 0.7454],
  '3,1': [0.6597, 0, 0.3403], '2,1': [0.5787, 0, 0.4213], '1,1': [0.4167, 0, 0.5833],
};
const memo = new Map<string, number>();
/** Chance that an attack fought to the end (blitz) takes the territory: a armies able to attack (total − 1), d defenders. */
export function blitzOdds(a: number, d: number): number {
  if (d <= 0) return 1;
  if (a <= 0) return 0;
  const k = `${a},${d}`;
  const hit = memo.get(k);
  if (hit !== undefined) return hit;
  const ad = Math.min(3, a), dd = Math.min(2, d), [win, split, lose] = ROLL[`${ad},${dd}`];
  const pair = Math.min(ad, dd);
  const r = pair === 2
    ? win * blitzOdds(a, d - 2) + split * blitzOdds(a - 1, d - 1) + lose * blitzOdds(a - 2, d)
    : win * blitzOdds(a, d - 1) + lose * blitzOdds(a - 1, d);
  memo.set(k, r);
  return r;
}
