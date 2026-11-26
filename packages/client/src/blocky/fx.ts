import { eventMs, squaresOf, type BEvent } from '@boboland/shared/src/blocky';
import { load } from '../lib/storage';
import { getSettings } from './settings';

/**
 * Every animation number in one place. Blocking lengths come from the shared `timing.ts` (`eventMs`, which the server
 * bots also wait for); everything else here is residue that overlaps whatever comes next. Full / Fast / Off in
 * `bly.fx`; reduced motion means Fast, never Off. The Gate C reviewer reads the BEAT table.
 */
export type FxLevel = 'full' | 'fast' | 'off';
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const effectiveFx = (l: FxLevel = getSettings().fx): FxLevel => (l === 'full' && reducedMotion() ? 'fast' : l);
export const SPEED: Record<FxLevel, number> = { full: 1, fast: 0.45, off: 0 };
export const fxScale = () => SPEED[effectiveFx()];
export const evMs = (e: BEvent) => Math.round(eventMs(e) * fxScale());

/** Named easings (ART.md, motion principles). */
export const EASE = { outBack: 'cubic-bezier(.34, 1.56, .64, 1)', outQuint: 'cubic-bezier(.22, 1, .36, 1)', inOutSine: 'cubic-bezier(.37, 0, .63, 1)', inQuad: 'cubic-bezier(.55, .085, .68, .53)' } as const;

/**
 * The beat table (full speed, ms from the event's start). Every action plays anticipation → action → impact →
 * settle → residue. `count` = particles. Blocking per event (shared timing.ts): place 500 + 120 per square
 * (≤ 1100), stuck 600, turn 500, start 1800, done 600, resign/dismiss 700, end 0.
 */
export const BEAT = {
  place: {
    anticipation: { at: 0, ms: 120, ease: 'inOutSine', what: 'yours: the ghost dips; others: a glow marks where it will land' },
    travel: { at: 120, ms: 240, ease: 'outQuint', what: "others only: the piece flies in from that guild's banner" },
    drop: { perBlock: 55, fall: 240, ease: 'outBack', squash: 0.78, height: 2.6, what: 'blocks drop in from above one by one, squash on landing' },
    impact: { ms: 160, dust: 3, ripple: 1, what: 'dust puffs at each block, one ring ripples out through the sockets' },
    settle: { ms: 300, what: 'the blocks merge into one moulded piece; its corner joints flash' },
    residue: { plus: 1100, flourish: 1300, growth: 420, what: '"+N" floats up, the stage-1 detail pops in, the guild flourish plays' },
    flourish: { tide: { rings: 3, drops: 8 }, sun: { rays: 10 }, ember: { sparks: 12 }, grove: { leaves: 9 } },
    big: { stars: 8, what: 'a 5-square piece: an extra sparkle burst' },
    first: { ms: 900, what: 'the first piece of a guild plants its flag on the start sigil' },
    last: { confetti: 28, ms: 1800, what: 'all 21 placed (+15/+20): a burst of guild confetti' },
    sprite: { at: 'land + 250', ms: 1700, what: 'a tiny builder pops onto the piece, plants a pennant, waves, hops off' },
  },
  stuck: { ms: 600, cloud: 5, what: 'a cloud puff over the banner, the shelf greys, the GROUNDED stamp lands (out-back)' },
  turn: { ms: 500, ribbon: 1500, what: 'the banner glow moves; to you or another human here: the cloud ribbon unrolls, your shelf rises, anchors pulse once' },
  start: { ms: 1800, what: 'the guild reveal: the card pops, each guild crest drops in with a bounce, "You lead …"' },
  done: { ms: 600, what: 'stamp "Done building" lands on the banner' },
} as const;

/** Your own drop: the ghost dips this long before the blocks fall. */
export const OWN_PRE = 150;

/** Where one placement's beats fall (ms from its start, at the current speed). */
export function placeTimes(points: number, travel: boolean, k = fxScale()) {
  const pre = travel ? BEAT.place.anticipation.ms + BEAT.place.travel.ms : OWN_PRE;
  const land = pre + (Math.max(1, points) - 1) * BEAT.place.drop.perBlock + BEAT.place.drop.fall;
  const s = (x: number) => Math.round(x * k);
  return { pre: s(pre), land: s(land), impact: s(land + BEAT.place.impact.ms), settle: s(land + BEAT.place.impact.ms + BEAT.place.settle.ms), total: s(land + BEAT.place.sprite.ms + 250) };
}
export const placeOf = (e: BEvent) => (e.k === 'place' ? squaresOf(e.piece) : 0);

/** Computer players in local games: wait for what just played, plus a short think (e2e sets bly.botMs). */
export function botMs(events: BEvent[], newTurn: boolean): number {
  const fixed = load<number | string | null>('bly.botMs', null);
  if (fixed !== null) return Number(fixed);
  return events.reduce((t, e) => t + evMs(e), 0) + (newTurn ? 650 : 320) * Math.max(0.3, fxScale());
}
