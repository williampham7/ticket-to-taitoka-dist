import { describe, expect, it } from 'vitest';
import { createPartyStore, PARTY_MAX, STALE_MS } from '../src/party';

function setup() {
  let t = 1_000;
  const store = createPartyStore(() => t);
  return { store, tick: (ms: number) => { t += ms; } };
}

describe('party store', () => {
  it('gives every new visitor a party of their own, and restores it on hello', () => {
    const { store } = setup();
    const a = store.hello({ name: '  Ana  ' });
    expect(a.party.members).toEqual([{ id: a.me.id, name: 'Ana' }]);
    expect(a.party.host).toBe(a.me.id);
    const again = store.hello({ ...a.me, name: 'Ana' });
    expect(again.me).toEqual(a.me);
    expect(again.party.id).toBe(a.party.id);
  });

  it('joins through an invite, up to five people, and a wrong token is a new person', () => {
    const { store } = setup();
    const host = store.hello({ name: 'Host' });
    const ids = [host.me.id];
    for (let i = 1; i < PARTY_MAX; i++) ids.push(store.hello({ name: `P${i}`, invite: host.party.id }).me.id);
    expect(store.poll(host.me.id, host.me.token)!.members.map((m) => m.id)).toEqual(ids);
    const sixth = store.hello({ name: 'Six', invite: host.party.id });
    expect(sixth.full).toBe(true);
    expect(sixth.party.id).not.toBe(host.party.id);
    expect(store.poll(host.me.id, 'nope')).toBeNull();
  });

  it('only the host moves the party, and the main menu forgets the waiting room', () => {
    const { store, tick } = setup();
    const host = store.hello({ name: 'Host' });
    const guest = store.hello({ name: 'Guest', invite: host.party.id });
    expect(store.goto(guest.me.id, guest.me.token, { path: '/menu' })).toBeNull();
    store.setRoom(host.me.id, host.me.token, 'room1');
    const v = store.goto(host.me.id, host.me.token, { path: '/menu', edition: 'china' })!;
    expect(v.at).toEqual({ path: '/menu', edition: 'china' });
    expect(v.room).toBe('room1');
    tick(3000);
    expect(store.poll(guest.me.id, guest.me.token)!.atAge).toBe(3000);
    expect(store.goto(host.me.id, host.me.token, { path: '/' })!.room).toBeUndefined();
  });

  it('kick and leave give the person a party of their own; the host can not kick themself', () => {
    const { store } = setup();
    const host = store.hello({ name: 'Host' });
    const a = store.hello({ name: 'A', invite: host.party.id });
    const b = store.hello({ name: 'B', invite: host.party.id });
    expect(store.kick(a.me.id, a.me.token, b.me.id)).toBeNull();
    expect(store.kick(host.me.id, host.me.token, host.me.id)).toBeNull();
    expect(store.kick(host.me.id, host.me.token, a.me.id)!.members).toHaveLength(2);
    const aNow = store.poll(a.me.id, a.me.token)!;
    expect(aNow.id).not.toBe(host.party.id);
    expect(aNow.host).toBe(a.me.id);
    const bOwn = store.leave(b.me.id, b.me.token)!;
    expect(bOwn.members).toEqual([{ id: b.me.id, name: 'B' }]);
    expect(store.poll(host.me.id, host.me.token)!.members).toHaveLength(1);
  });

  it('renames, and hands the party to the next member when the host goes quiet', () => {
    const { store, tick } = setup();
    const host = store.hello({ name: 'Host' });
    const g = store.hello({ name: 'Guest', invite: host.party.id });
    expect(store.rename(g.me.id, g.me.token, 'Gus')!.members[1].name).toBe('Gus');
    tick(STALE_MS - 1000);
    store.poll(g.me.id, g.me.token);
    tick(2000);
    const v = store.poll(g.me.id, g.me.token)!;
    expect(v.members.map((m) => m.name)).toEqual(['Gus']);
    expect(v.host).toBe(g.me.id);
    expect(store.poll(host.me.id, host.me.token)).toBeNull();
  });
});
