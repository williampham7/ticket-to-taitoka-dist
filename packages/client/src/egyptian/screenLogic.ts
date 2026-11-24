/** Pure helpers for the Egyptian War screen: words, badges, and which events are new. */
import {
  cardName, challengeTries, rankLabel, rankOf, RULE_BY_ID, type EgwEvent, type EgwView, type PlayerID, type Won,
} from '@boboland/shared/src/egyptian';

export type Names = Record<PlayerID, string>;
const nm = (names: Names, p: PlayerID | null | undefined) => (p == null ? 'Someone' : names[p] ?? `Player ${Number(p) + 1}`);
const FACE_NAME: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };

/** Events newer than `seen`, oldest first. */
export const newEvents = (seen: number, log: readonly EgwEvent[]): EgwEvent[] => log.filter((e) => e.seq > seen);

/** The one line under the table that says what is happening. */
export function statusLine(v: EgwView, names: Names): string {
  if (v.stage === 'waiting') return 'Waiting room';
  if (v.stage === 'ready') return 'Waiting for everyone to sit down…';
  if (v.stage === 'dealing') return 'Dealing…';
  if (v.result) return `${nm(names, v.result.winner)} wins the war!`;
  if (v.won) {
    if (v.won.how === 'slapIn') return `${nm(names, v.won.by)} slaps back in!`;
    if (v.won.how === 'slap') return `${nm(names, v.won.by)} slaps: ${RULE_BY_ID[v.won.matches[0].rule].name}!`;
    if (v.won.how === 'challenge') return `Challenge won by ${nm(names, v.won.by)}`;
    return `${nm(names, v.won.by)} takes the pile`;
  }
  if (v.timer?.kind === 'grace') return `${nm(names, v.timer.winner)} takes the pile unless someone slaps…`;
  if (v.challenge) {
    const t = v.challenge.tries;
    return `${FACE_NAME[rankOf(v.challenge.face)]}: ${nm(names, v.challenge.target)} has ${t} ${t === 1 ? 'try' : 'tries'}`;
  }
  return v.turn ? `${nm(names, v.turn)} to flip` : '';
}

/** What a screen reader hears for an event (null: nothing worth saying). */
export function describeEvent(e: EgwEvent, names: Names): string | null {
  switch (e.kind) {
    case 'deal': return 'The cards are dealt.';
    case 'flip': return `${nm(names, e.by)} plays ${cardName(e.card)}${e.auto ? ' (auto)' : ''}`;
    case 'challenge': return e.target === e.by ? `${nm(names, e.by)} plays a challenge nobody can answer` : `${nm(names, e.target)} has ${e.tries} ${e.tries === 1 ? 'try' : 'tries'}`;
    case 'pass': return `${nm(names, e.target)} takes over with ${e.tries} ${e.tries === 1 ? 'try' : 'tries'}`;
    case 'slap': return e.how === 'slapIn' ? `${nm(names, e.by)} slaps back in!` : `${nm(names, e.by)} slaps and wins the pile`;
    case 'falseSlap': return e.penalty ? `${nm(names, e.by)} slaps wrong and burns a card` : `${nm(names, e.by)} misses their slap-in`;
    case 'won': return e.how === 'challenge' ? `Challenge won by ${nm(names, e.by)}` : `${nm(names, e.by)} takes the pile`;
    case 'collect': return `${nm(names, e.by)} collects ${e.cards} cards`;
    case 'out': return `${nm(names, e.by)} is out of cards`;
    case 'left': return `${nm(names, e.by)} left the game`;
    case 'win': return `${nm(names, e.by)} wins the war!`;
    default: return null;
  }
}

export interface SeatBadges {
  turn: boolean;
  challenged: boolean;
  /** ms of lockout left (server time) */
  lockedFor: number;
  out: boolean;
  spent: boolean;
  left: boolean;
}

export function seatBadges(v: EgwView, p: PlayerID, serverNow: number): SeatBadges {
  const out = (v.counts[p] ?? 0) === 0 && v.stage !== 'ready' && v.stage !== 'dealing';
  return {
    turn: v.stage === 'play' && v.turn === p && !v.timer,
    challenged: !!v.challenge && v.challenge.target === p && !v.timer,
    lockedFor: Math.max(0, (v.lockout[p] ?? 0) - serverNow),
    out: out && !v.left[p],
    spent: out && !!v.slapInUsed[p],
    left: !!v.left[p],
  };
}

/** Ribbon text for a won pile: the headline rule and its cards, then any other matches. */
export function revealText(won: Won, names: Names): { headline: string; lines: string[] } {
  if (won.how === 'challenge') {
    return { headline: `Challenge won by ${nm(names, won.by)}${won.face !== undefined ? ` · ${FACE_NAME[rankOf(won.face)]}` : ''}`, lines: [] };
  }
  if (won.how === 'last') return { headline: `${nm(names, won.by)} takes the pile`, lines: [] };
  const ranks = (m: Won['matches'][number]) => {
    const lo = Math.min(...m.cards), hi = Math.max(...m.cards);
    const idx = m.rule === 'topBottom' ? m.cards : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    return idx.map((i) => rankLabel(rankOf(won.pile[i]))).join(m.rule === 'topBottom' ? ' · … · ' : ' · ');
  };
  const [first, ...rest] = won.matches;
  return {
    headline: `${RULE_BY_ID[first.rule].name} · ${ranks(first)}`,
    lines: rest.map((m) => `${RULE_BY_ID[m.rule].name} · ${ranks(m)}`),
  };
}

/** The cards a won pile lifts out to show: the headline match's span (both ends for Top & Bottom). */
export function liftedCards(won: Won): number[] {
  if (!won.matches.length) return [];
  const m = won.matches[0];
  if (m.rule === 'topBottom') return m.cards.map((i) => won.pile[i]);
  const lo = Math.min(...m.cards), hi = Math.max(...m.cards);
  return won.pile.slice(lo, hi + 1);
}

/** Tries a challenge card gives, for the ankh pips. */
export const challengeTotal = (face: number) => challengeTries(face);
