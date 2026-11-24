import { describe, expect, it } from 'vitest';
import { card, DEFAULT_RULES, TIMING, type EgwView, type EgwEvent, type Won } from '@boboland/shared/src/egyptian';
import { describeEvent, liftedCards, newEvents, revealText, seatBadges, statusLine } from './screenLogic';

const names = { 0: 'Ana', 1: 'Bo', 2: 'Cy' };
const base = (o: Partial<EgwView> = {}): EgwView => ({
  stage: 'play', rules: DEFAULT_RULES, timing: TIMING, players: ['0', '1', '2'], pile: [], round: 1, leader: '0', turn: '0', topBy: null,
  challenge: null, timer: null, won: null, lastFlip: null, turnSince: 0, lockout: { 0: 0, 1: 0, 2: 0 }, slapInUsed: { 0: false, 1: false, 2: false },
  left: { 0: false, 1: false, 2: false }, ready: { 0: true, 1: true, 2: true }, firstReadyAt: 0, playAt: 0, clock: 0,
  stats: {}, log: [], seq: 0, result: null, counts: { 0: 20, 1: 20, 2: 12 }, burnedCount: 0, ...o,
});

describe('status line', () => {
  it('says what is happening', () => {
    expect(statusLine(base(), names)).toBe('Ana to flip');
    expect(statusLine(base({ challenge: { by: '0', target: '1', tries: 4, face: card('AS') } }), names)).toBe('Ace: Bo has 4 tries');
    expect(statusLine(base({ challenge: { by: '0', target: '1', tries: 1, face: card('KS') } }), names)).toBe('King: Bo has 1 try');
    expect(statusLine(base({ timer: { kind: 'grace', at: 5, winner: '2', why: 'challenge' } }), names)).toBe('Cy takes the pile unless someone slaps…');
    expect(statusLine(base({ won: { by: '1', how: 'slap', matches: [{ rule: 'sandwich', cards: [0, 2] }], pile: [] } }), names)).toBe('Bo slaps: Sandwich!');
    expect(statusLine(base({ result: { winner: '2' }, stage: 'over' }), names)).toBe('Cy wins the war!');
  });
  it('describes events for screen readers', () => {
    const e = (x: object) => ({ seq: 1, at: 0, ...x }) as EgwEvent;
    expect(describeEvent(e({ kind: 'flip', by: '0', card: card('7H') }), names)).toBe('Ana plays 7 of hearts');
    expect(describeEvent(e({ kind: 'falseSlap', by: '1', penalty: true }), names)).toBe('Bo slaps wrong and burns a card');
  });
});

describe('seat badges', () => {
  it('marks turn, challenge, lockout, out, spent and left', () => {
    const v = base({ challenge: { by: '0', target: '1', tries: 2, face: card('QS') }, turn: '1', lockout: { 0: 0, 1: 1500, 2: 0 }, counts: { 0: 20, 1: 32, 2: 0 }, slapInUsed: { 0: false, 1: false, 2: true } });
    expect(seatBadges(v, '1', 1000)).toMatchObject({ turn: true, challenged: true, lockedFor: 500 });
    expect(seatBadges(v, '2', 1000)).toMatchObject({ out: true, spent: true, left: false });
    expect(seatBadges(base({ left: { 0: false, 1: false, 2: true }, counts: { 0: 26, 1: 26, 2: 0 } }), '2', 0)).toMatchObject({ out: false, left: true });
  });
});

describe('reveal', () => {
  it('names the rule and its cards, headline first', () => {
    const won: Won = { by: '0', how: 'slap', pile: ['3C', '7S', '2H', '7D'].map(card), matches: [{ rule: 'sandwich', cards: [1, 3] }, { rule: 'lucky7', cards: [3] }] };
    expect(revealText(won, names)).toEqual({ headline: 'Sandwich · 7 · 2 · 7', lines: ['Lucky Seven · 7'] });
    expect(liftedCards(won)).toEqual(['7S', '2H', '7D'].map(card));
    const tb: Won = { by: '0', how: 'slap', pile: ['9D', '3C', '5H', '9S'].map(card), matches: [{ rule: 'topBottom', cards: [0, 3] }] };
    expect(revealText(tb, names).headline).toBe('Top & Bottom · 9 · … · 9');
    expect(revealText({ by: '1', how: 'challenge', pile: [], matches: [], face: card('AH') }, names).headline).toBe('Challenge won by Bo · Ace');
  });
  it('finds new events', () => {
    const log = [1, 2, 3].map((seq) => ({ seq, at: 0, kind: 'deal' }) as EgwEvent);
    expect(newEvents(1, log).map((e) => e.seq)).toEqual([2, 3]);
    expect(newEvents(3, log)).toEqual([]);
  });
});
