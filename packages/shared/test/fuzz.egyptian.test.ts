import { describe, expect, it } from 'vitest';
import {
  flip, leave, matchSlap, newGame, nextTimed, ready, slap, SLAP_RULE_IDS, tick, TIMING, totalCards, type EgwState, type Rng, type SlapRuleId,
} from '../src/egyptian';
import { prng } from './frontlineHelpers';

const GAMES = 500;
const CAP = 4000;

function rngFrom(rnd: () => number): Rng {
  return {
    shuffle: <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
    die: (n) => 1 + Math.floor(rnd() * n),
  };
}

function rulesFrom(rnd: () => number): SlapRuleId[] {
  const r = SLAP_RULE_IDS.filter(() => rnd() < 0.3);
  return r.length ? r : ['double'];
}

/** Plain checks (vitest's expect per step is too slow for 2000 games): 52 cards; someone can act or an event is pending. */
function check(G: EgwState, seed: number, step: number) {
  const where = `seed ${seed} step ${step}`;
  if (totalCards(G) !== 52) throw new Error(`card count ${totalCards(G)} at ${where}`);
  if (G.result || G.stage !== 'play') return;
  if (G.timer === null && (G.turn === null || G.stacks[G.turn].length === 0 || G.left[G.turn])) throw new Error(`nobody can act at ${where}`);
}

/** One game of scripted random players on a simulated clock: 'over' or 'capped'. */
function playOne(n: number, seed: number): 'over' | 'capped' {
  const rnd = prng(seed);
  const G: EgwState = newGame(n, rulesFrom(rnd), rngFrom(rnd), TIMING);
  let now = 0;
  for (const p of G.players) if (rnd() < 0.9) ready(G, p, now);
  let leftOnce = false;
  for (let step = 0; step < CAP; step++) {
    if (G.result) return 'over';
    now += 30 + Math.floor(rnd() * 670);
    const due = nextTimed(G);
    const p = G.players[Math.floor(rnd() * n)];
    const r = rnd();
    if (due !== null && now >= due && r < 0.5) tick(G, now);
    else if (G.stage !== 'play') tick(G, now);
    else if (r < 0.6 && G.turn !== null) flip(G, G.turn, now);
    else if (r < 0.85) { if (matchSlap(G.pile, G.rules).length && rnd() < 0.7) slap(G, p, G.round, now); }
    else if (r < 0.9) slap(G, p, G.round, now);
    else if (!leftOnce && rnd() < 0.002) { leftOnce = true; leave(G, p, now); }
    else tick(G, now);
    check(G, seed, step);
  }
  return G.result ? 'over' : 'capped';
}

describe('Egyptian War fuzz', () => {
  for (const n of [2, 3, 4, 5]) {
    it(`${GAMES} games with ${n} players: 52 cards always, never stuck`, () => {
      let capped = 0;
      for (let g = 0; g < GAMES; g++) if (playOne(n, n * 100_000 + g) === 'capped') capped++;
      console.info(`egyptian fuzz: ${n} players, ${capped}/${GAMES} games hit the ${CAP}-step cap (unforced games can cycle)`);
      expect(capped).toBeLessThan(GAMES);
    });
  }
});
