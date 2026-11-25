import type { KEvent } from './rules';

/**
 * Full-speed animation lengths (ms) of each public event, shared by the server bots (so a bot acts only
 * once the last thing it did has finished playing) and the client's `kingdom/fx.ts`, which scales them.
 */
export const KT = {
  /** spare flies to the banner, the line slides, the pushed-out tile arcs to the pedestal */
  fly: 380, slide: 520, settle: 160, arc: 420,
  /** a hero hops one square */
  hop: 140,
  /** treasure rises, bursts and flies to the banner; the next card flips */
  collect: 1300,
  /** home banner unfurls */
  home: 1100,
  /** the turn ribbon unrolls */
  turn: 1250,
  /** a hero bows out */
  resign: 1000,
  /** fireworks, confetti, the hop to the castle gate, before the page turns */
  win: 4200,
  /** the reachable glow ripples out (per BFS ring) */
  ripple: 45,
};

/** How long one event's animation plays at full speed. */
export function eventMs(e: KEvent): number {
  switch (e.k) {
    case 'shift': return KT.fly + KT.slide + KT.settle + (e.wraps.length ? 120 : 0);
    case 'move': return Math.max(1, e.path.length - 1) * KT.hop + 120;
    case 'collect': return KT.collect;
    case 'home': return KT.home;
    case 'turn': return KT.turn;
    case 'resign': return KT.resign;
    case 'win': return KT.win;
    default: return 0;
  }
}
