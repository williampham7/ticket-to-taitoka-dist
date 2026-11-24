import { describe, expect, it } from 'vitest';
import {
  card, cardName, cardOf, challengeTries, fullDeck, rankOf, DEFAULT_RULES, matchSlap, RULE_BY_ID, SLAP_RULES, validateRules,
  type SlapRuleId,
} from '../src/egyptian';

const p = (...s: string[]) => s.map(card);
const det = (id: SlapRuleId, ...s: string[]) => RULE_BY_ID[id].detect(p(...s));

describe('cards', () => {
  it('encodes rank and suit', () => {
    expect(rankOf(cardOf(12, 'D'))).toBe(12);
    expect(cardName(cardOf(1, 'S'))).toBe('Ace of spades');
    expect(cardName(card('7H'))).toBe('7 of hearts');
    expect(fullDeck()).toEqual(Array.from({ length: 52 }, (_, i) => i));
    expect([card('JS'), card('QS'), card('KS'), card('AS'), card('10S')].map(challengeTries)).toEqual([1, 2, 3, 4, 0]);
  });
});

describe('slap rules', () => {
  it('catalogue is in spec order with working examples', () => {
    expect(SLAP_RULES.map((r) => r.id)).toEqual(['double', 'sandwich', 'staircase', 'marriage', 'divorce', 'topBottom', 'tens',
      'tenSandwich', 'sixNine', 'thirteen', 'slapjack', 'lucky7', 'suitRun', 'court']);
    for (const r of SLAP_RULES) expect(r.detect(r.example), r.id).not.toBeNull();
  });
  it('double / sandwich', () => {
    expect(det('double', '2C', '7S', '7H')).toEqual([1, 2]);
    expect(det('double', '7S', '8H')).toBeNull();
    expect(det('sandwich', '7S', '2H', '7D')).toEqual([0, 2]);
    expect(det('sandwich', '7S', '7D')).toBeNull();
  });
  it('staircase: up, down, ace low and high, no wrap', () => {
    expect(det('staircase', 'QS', 'KH', 'AD')).toEqual([0, 1, 2]);
    expect(det('staircase', 'AS', '2H', '3D')).not.toBeNull();
    expect(det('staircase', '3S', '2H', 'AD')).not.toBeNull();
    expect(det('staircase', 'AS', 'KH', 'QD')).not.toBeNull();
    expect(det('staircase', 'KS', 'AH', '2D')).toBeNull();
    expect(det('staircase', '5S', '6H', '8D')).toBeNull();
  });
  it('marriage / divorce', () => {
    expect(det('marriage', 'QS', 'KH')).toEqual([0, 1]);
    expect(det('marriage', 'KS', 'KH')).toBeNull();
    expect(det('divorce', 'KS', '4D', 'QS')).toEqual([0, 2]);
    expect(det('divorce', 'KS', 'QS')).toBeNull();
  });
  it('top & bottom needs 3+ cards', () => {
    expect(det('topBottom', '7S', '2H', '7D')).toEqual([0, 2]);
    expect(det('topBottom', '7S', '7D')).toBeNull();
  });
  it('tens and ten sandwich ignore J/Q/K', () => {
    expect(det('tens', 'AS', '9H')).not.toBeNull();
    expect(det('tens', '4S', '6H')).toEqual([0, 1]);
    expect(det('tens', '5S', '5H')).not.toBeNull();
    expect(det('tens', '10S', 'JH')).toBeNull();
    expect(det('tens', 'KS', '3H')).toBeNull();
    expect(det('tenSandwich', '3H', 'KC', '7S')).toEqual([0, 2]);
    expect(det('tenSandwich', 'QH', '2C', 'QS')).toBeNull();
  });
  it('six-nine, thirteen, slapjack, lucky seven', () => {
    expect(det('sixNine', '9S', '6H')).not.toBeNull();
    expect(det('sixNine', '6S', '6H')).toBeNull();
    expect(det('thirteen', 'QS', 'AH')).not.toBeNull();
    expect(det('thirteen', 'KS', 'AH')).toBeNull();
    expect(det('slapjack', '2S', 'JH')).toEqual([1]);
    expect(det('slapjack', 'JH', '2S')).toBeNull();
    expect(det('lucky7', '7D')).toEqual([0]);
    expect(det('lucky7', '8D')).toBeNull();
  });
  it('three of a suit, royal court', () => {
    expect(det('suitRun', '2H', '9H', '5H')).toEqual([0, 1, 2]);
    expect(det('suitRun', '2H', '9H', '5S')).toBeNull();
    expect(det('court', 'JC', 'KD', 'QS')).not.toBeNull();
    expect(det('court', 'JC', 'KD', 'AS')).toBeNull();
  });
  it('several matches come back in catalogue order', () => {
    expect(matchSlap(p('7S', '7H'), ['slapjack', 'double', 'lucky7']).map((m) => m.rule)).toEqual(['double', 'lucky7']);
    expect(matchSlap(p('JS', '2H', 'JD'), ['slapjack', 'sandwich']).map((m) => m.rule)).toEqual(['sandwich', 'slapjack']);
    expect(matchSlap([], DEFAULT_RULES)).toEqual([]);
  });
  it('validates rule sets', () => {
    expect(validateRules(DEFAULT_RULES)).toBeUndefined();
    expect(validateRules([])).toBeDefined();
    expect(validateRules(['nope'])).toBeDefined();
    expect(validateRules(['double', 'double'])).toBeDefined();
    expect(validateRules('double')).toBeDefined();
  });
});
