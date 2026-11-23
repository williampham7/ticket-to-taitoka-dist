import { describe, expect, it } from 'vitest';
import { followTarget, HOLD, SETTLE_MS, type FollowInput } from './partyRules';

const base: FollowInput = {
  at: { path: '/menu', edition: 'usa' }, atAge: SETTLE_MS, here: '/', edition: 'usa',
  hasSeat: () => false, hasFrontlineSeat: () => false, firstMember: true,
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
  });

  it('Frontline: the first member takes the second seat, the others watch', () => {
    expect(go({ at: { path: '/frontline' } })).toEqual({ path: '/frontline' });
    expect(go({ at: { path: '/frontline/play/m1' } })).toEqual({ path: '/frontline/join/m1' });
    expect(go({ at: { path: '/frontline/play/m1' }, firstMember: false })).toEqual({ path: '/frontline/watch/m1' });
    expect(go({ at: { path: '/frontline/play/m1' }, hasFrontlineSeat: () => true })).toEqual({ path: '/frontline/play/m1' });
    expect(go({ at: { path: '/frontline/host' } })).toBeNull();
  });
});
