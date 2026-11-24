import { describe, expect, it } from 'vitest';
import { followTarget, HOLD, SETTLE_MS, type FollowInput } from './partyRules';

const base: FollowInput = {
  at: { path: '/menu', edition: 'usa' }, atAge: SETTLE_MS, here: '/', edition: 'usa',
  hasSeat: () => false, hasFrontlineSeat: () => false, hasFleetSeat: () => false, hasEgyptianSeat: () => false, firstMember: true,
};
const go = (o: Partial<FollowInput>) => followTarget({ ...base, ...o });

describe('followTarget', () => {
  it('waits for the host to settle, and does nothing when already there', () => {
    expect(go({ atAge: 10 })).toBeNull();
    expect(go({ here: '/menu' })).toBeNull();
    expect(go({})).toEqual({ path: '/menu' });
  });

  it('follows the host to the main menu and the map menus, switching edition when the host is on another map', () => {
    expect(go({ at: { path: '/' }, here: '/menu', edition: 'china' })).toEqual({ path: '/' });
    expect(go({ at: { path: '/menu', edition: 'china' }, here: '/menu' })).toEqual({ path: '/menu', edition: 'china' });
  });

  it('seats members in the waiting room, and lets games hand people over themselves', () => {
    expect(go({ at: { path: '/wait/r1', edition: 'usa' } })).toEqual({ path: '/join/r1' });
    expect(go({ at: { path: '/wait/r1', edition: 'usa' }, hasSeat: (id) => id === 'r1', here: '/menu' })).toEqual({ path: '/wait/r1' });
    expect(go({ at: { path: '/wait/r2', edition: 'usa' }, here: '/play/g1' })).toBeNull();
    expect(go({ at: { path: '/play/g1', edition: 'usa' }, here: '/wait/r1' })).toBeNull();
    expect(go({ at: { path: '/play/g1', edition: 'usa' }, here: '/menu' })).toEqual({ path: HOLD });
    expect(go({ at: { path: '/play/g1', edition: 'usa' }, here: '/menu', hasSeat: () => true })).toEqual({ path: '/play/g1' });
    expect(go({ at: { path: '/host', edition: 'usa' } })).toBeNull();
  });

  it('holds members while the host plays on their own device', () => {
    expect(go({ at: { path: '/local', edition: 'usa' } })).toEqual({ path: HOLD });
    expect(go({ at: { path: '/frontline/bot' } })).toEqual({ path: HOLD });
    expect(go({ at: { path: '/fleet/bot' } })).toEqual({ path: HOLD });
    expect(go({ at: { path: '/fleet/local' } })).toEqual({ path: HOLD });
  });

  it('Frontline: the first member takes the second seat, the others watch', () => {
    expect(go({ at: { path: '/frontline' } })).toEqual({ path: '/frontline' });
    expect(go({ at: { path: '/frontline/play/m1' } })).toEqual({ path: '/frontline/join/m1' });
    expect(go({ at: { path: '/frontline/play/m1' }, firstMember: false })).toEqual({ path: '/frontline/watch/m1' });
    expect(go({ at: { path: '/frontline/play/m1' }, hasFrontlineSeat: () => true })).toEqual({ path: '/frontline/play/m1' });
    expect(go({ at: { path: '/frontline/host' } })).toBeNull();
  });

  it('Fleet: the first member takes the second seat, the others watch', () => {
    expect(go({ at: { path: '/fleet' } })).toEqual({ path: '/fleet' });
    expect(go({ at: { path: '/fleet/play/m1' } })).toEqual({ path: '/fleet/join/m1' });
    expect(go({ at: { path: '/fleet/play/m1' }, firstMember: false })).toEqual({ path: '/fleet/watch/m1' });
    expect(go({ at: { path: '/fleet/play/m1' }, hasFleetSeat: () => true })).toEqual({ path: '/fleet/play/m1' });
    expect(go({ at: { path: '/fleet/play/m1' }, hasFrontlineSeat: () => true })).toEqual({ path: '/fleet/join/m1' });
    expect(go({ at: { path: '/fleet/watch/m1' } })).toEqual({ path: '/fleet/watch/m1' });
    expect(go({ at: { path: '/fleet/host' } })).toBeNull();
  });

  it('Fleet keeps no edition: a member on another map is not reloaded', () => {
    expect(go({ at: { path: '/fleet' }, edition: 'china', here: '/menu' })).toEqual({ path: '/fleet' });
  });

  it('Egyptian War: members take seats in the waiting room, follow into the game, and watch without a seat', () => {
    const seat = { hasEgyptianSeat: () => true };
    expect(go({ at: { path: '/egyptian' } })).toEqual({ path: '/egyptian' });
    expect(go({ at: { path: '/egyptian/local' } })).toEqual({ path: HOLD });
    expect(go({ at: { path: '/egyptian/host' } })).toBeNull();
    expect(go({ at: { path: '/egyptian/deck' } })).toBeNull();
    expect(go({ at: { path: '/egyptian/wait/r1' } })).toEqual({ path: '/egyptian/join/r1' });
    expect(go({ at: { path: '/egyptian/wait/r1' }, ...seat })).toEqual({ path: '/egyptian/wait/r1' });
    expect(go({ at: { path: '/egyptian/wait/r1' }, here: '/egyptian/play/g1' })).toBeNull();
    expect(go({ at: { path: '/egyptian/play/g1' }, ...seat })).toEqual({ path: '/egyptian/play/g1' });
    expect(go({ at: { path: '/egyptian/play/g1' } })).toEqual({ path: '/egyptian/watch/g1' });
    expect(go({ at: { path: '/egyptian/play/g1' }, here: '/egyptian/wait/r1' })).toBeNull();
    expect(go({ at: { path: '/egyptian/watch/g1' } })).toEqual({ path: '/egyptian/watch/g1' });
    expect(go({ at: { path: '/egyptian/play/g1', edition: 'china' }, ...seat })).toEqual({ path: '/egyptian/play/g1' });
  });
});

// Warfront
describe('followTarget: Warfront', () => {
  const wf = (o: Partial<FollowInput>) => go({ hasWarfrontSeat: () => false, ...o });
  it('follows into the menu and the war room, never with an edition', () => {
    expect(wf({ at: { path: '/warfront' } })).toEqual({ path: '/warfront' });
    expect(wf({ at: { path: '/warfront/wait/r1' } })).toEqual({ path: '/warfront/join/r1' });
    expect(wf({ at: { path: '/warfront/wait/r1' }, hasWarfrontSeat: (id) => id === 'r1' })).toEqual({ path: '/warfront/wait/r1' });
  });
  it('seated members play, others watch; local battles put members on hold', () => {
    expect(wf({ at: { path: '/warfront/play/g1' }, hasWarfrontSeat: (id) => id === 'g1' })).toEqual({ path: '/warfront/play/g1' });
    expect(wf({ at: { path: '/warfront/play/g1' } })).toEqual({ path: '/warfront/watch/g1' });
    expect(wf({ at: { path: '/warfront/play/g1' }, here: '/warfront/wait/r1' })).toBeNull();
    expect(wf({ at: { path: '/warfront/bot' } })).toEqual({ path: HOLD });
  });
});
