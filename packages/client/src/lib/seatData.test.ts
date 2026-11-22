import { describe, expect, it } from 'vitest';
import { editionForMap, editionToFollow, joinData, mapForRoom, mergeSeatData, parseSeatData, roomEdition, shouldFollow } from './seatData';

describe('seat data parsing', () => {
  it('keeps a numeric colour, a known bot level and a known edition, and drops anything else', () => {
    expect(parseSeatData({ color: 2, bot: 'hard', edition: 'china' })).toEqual({ color: 2, bot: 'hard', edition: 'china' });
    expect(parseSeatData({ color: '2', bot: 'godlike', edition: 'mars' })).toEqual({});
    expect(parseSeatData({ color: 1, extra: 'x' })).toEqual({ color: 1 });
    expect(parseSeatData(undefined)).toEqual({});
    expect(parseSeatData('nope')).toEqual({});
    expect(parseSeatData(null)).toEqual({});
  });
});

describe('merging seat data (updatePlayer replaces data, so every update must carry the rest)', () => {
  it('a colour change keeps the edition, and an edition change keeps the colour', () => {
    expect(mergeSeatData({ color: 1, edition: 'europe' }, { color: 3 })).toEqual({ color: 3, edition: 'europe' });
    expect(mergeSeatData({ color: 1, edition: 'europe' }, { edition: 'china' })).toEqual({ color: 1, edition: 'china' });
  });
  it('keeps a bot level and ignores undefined patch values', () => {
    expect(mergeSeatData({ color: 1, bot: 'easy' }, { edition: undefined, color: 2 })).toEqual({ color: 2, bot: 'easy' });
  });
  it('starts from nothing, and ignores junk already stored', () => {
    expect(mergeSeatData(undefined, { color: 0 })).toEqual({ color: 0 });
    expect(mergeSeatData({ color: 'x', edition: 'mars' }, { color: 4 })).toEqual({ color: 4 });
  });
});

describe('joinData', () => {
  it('is only the parts given, and nothing when empty', () => {
    expect(joinData(0, 'usa')).toEqual({ color: 0, edition: 'usa' });
    expect(joinData(2)).toEqual({ color: 2 });
    expect(joinData(undefined, 'europe')).toEqual({ edition: 'europe' });
    expect(joinData()).toBeUndefined();
  });
});

describe('room edition', () => {
  it('is the edition on seat 0, wherever that seat sits in the list', () => {
    const players = [{ id: 1, data: { edition: 'china' } }, { id: 0, data: { color: 0, edition: 'europe' } }];
    expect(roomEdition(players)).toBe('europe');
  });
  it('is undefined when seat 0 has none or an invalid one', () => {
    expect(roomEdition([{ id: 0, data: { color: 0 } }])).toBeUndefined();
    expect(roomEdition([{ id: 0, data: { edition: 'mars' } }])).toBeUndefined();
    expect(roomEdition([{ id: 1, data: { edition: 'china' } }])).toBeUndefined();
    expect(roomEdition([])).toBeUndefined();
  });
});

describe('following the room', () => {
  it('switches only when the room edition is known, valid and different', () => {
    expect(editionToFollow('china', 'usa')).toBe('china');
    expect(editionToFollow('usa', 'usa')).toBeNull();
    expect(editionToFollow(undefined, 'usa')).toBeNull();
    expect(editionToFollow('mars', 'usa')).toBeNull();
  });
  it('does not reload to the same target twice in a few seconds (blocked storage would loop)', () => {
    expect(shouldFollow('china', null, 1000)).toBe(true);
    expect(shouldFollow('china', { id: 'china', at: 1000 }, 3000)).toBe(false);
    expect(shouldFollow('china', { id: 'china', at: 1000 }, 20000)).toBe(true);
    expect(shouldFollow('europe', { id: 'china', at: 1000 }, 1500)).toBe(true);
  });
});

describe('edition of a map', () => {
  it('maps G.mapId to its edition; an unknown map has none', () => {
    expect(editionForMap('europe')).toBe('europe');
    expect(editionForMap('china')).toBe('china');
    expect(editionForMap('usa')).toBe('usa');
    expect(editionForMap('mars')).toBeUndefined();
    expect(editionForMap(undefined)).toBeUndefined();
  });
});

describe('map for the game', () => {
  it('is the map of the room edition when the host set one, else of the edition this page shows', () => {
    expect(mapForRoom('china', 'usa')).toBe('china');
    expect(mapForRoom('europe', 'china')).toBe('europe');
    expect(mapForRoom(undefined, 'europe')).toBe('europe');
    expect(mapForRoom('mars', 'china')).toBe('china');
  });
});
