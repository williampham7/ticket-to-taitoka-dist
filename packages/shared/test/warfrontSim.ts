import { act, alive, chooseWarAction, newGame, viewFor, type Mode, type WarBotLevel, type WarState } from '../src/warfront';

/** Deterministic random numbers (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dice rolls as random numbers: die(v) for each face value. */
export const dice = (...faces: number[]) => { let i = 0; return () => (faces[i++ % faces.length] - 1) / 6 + 0.01; };

export interface SimResult { G: WarState; steps: number; finished: boolean }
/** Plays a whole game with bots (each from its own view). Throws if a bot ever picks an illegal action. */
export function simulate(levels: WarBotLevel[], mode: Mode, seed: number, autoDeploy = true, maxSteps = 40000): SimResult {
  const rng = seeded(seed);
  const G = newGame(levels.length, mode, rng, { autoDeploy });
  let steps = 0;
  while (!G.result && steps < maxSteps) {
    const p = G.current;
    const a = chooseWarAction(viewFor(G, p), p, levels[Number(p)], rng);
    const err = act(G, p, a, rng);
    if (err) throw new Error(`seed ${seed} step ${steps}: ${p} ${JSON.stringify(a)} -> ${err} (stage ${G.stage})`);
    steps++;
    if (alive(G).length === 0) throw new Error('nobody left');
  }
  return { G, steps, finished: !!G.result };
}
