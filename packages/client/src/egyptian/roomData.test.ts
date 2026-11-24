import { describe, expect, it } from 'vitest';
import { mergeEgwSeatData, parseEgwSeatData, roomRules } from './roomData';

describe('Egyptian War seat data', () => {
  it('keeps only what it understands', () => {
    expect(parseEgwSeatData({ color: 2, rules: ['tens'], junk: 1 })).toEqual({ color: 2, rules: ['tens'] });
    expect(parseEgwSeatData({ color: 9, rules: [] })).toEqual({});
    expect(parseEgwSeatData('x')).toEqual({});
  });
  it('merges a patch over the current data', () => {
    expect(mergeEgwSeatData({ color: 1, rules: ['double'] }, { color: 3 })).toEqual({ color: 3, rules: ['double'] });
    expect(mergeEgwSeatData({ color: 1 }, { rules: ['slapjack'] })).toEqual({ color: 1, rules: ['slapjack'] });
  });
  it('reads the host’s rules, else the defaults', () => {
    expect(roomRules([{ id: 1, data: { rules: ['tens'] } }, { id: 0, data: { rules: ['sixNine', 'court'] } }])).toEqual(['sixNine', 'court']);
    expect(roomRules([{ id: 0, data: { rules: ['bogus'] } }])).toEqual(['double', 'sandwich']);
  });
});
