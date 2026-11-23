import { randomBytes } from 'node:crypto';
import koaBody from 'koa-body';

/**
 * Parties: up to five real people who move around the site together. The host's screen leads: the host's client reports
 * where it is (`at`), and the members' clients follow. Kept in memory (lost when the server restarts, like matches).
 * Everyone is always in a party, at least one of their own. Bots are never party members.
 */
export const PARTY_MAX = 5;
/** A member not heard from for this long (closed tab, lost Wi-Fi) is dropped; clients poll every ~1.5 s. */
export const STALE_MS = 25_000;

export interface Where { path: string; edition?: string }
interface Member { id: string; token: string; name: string; seen: number }
interface Party { id: string; host: string; members: Member[]; at: Where; atSince: number; room?: string; rev: number }

export interface PartyView {
  id: string; host: string; members: { id: string; name: string }[];
  at: Where; atAge: number; room?: string; rev: number;
}
export interface Hello { id?: string; token?: string; name: string; invite?: string }
export type HelloResult = { me: { id: string; token: string }; party: PartyView; full?: boolean };

const rid = (n = 6) => randomBytes(n).toString('base64url');
const cleanName = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, 16) : '') || 'Player';

export function createPartyStore(now: () => number = Date.now) {
  const parties = new Map<string, Party>();
  const partyOf = new Map<string, string>(); // member id -> party id

  const view = (p: Party): PartyView => ({
    id: p.id, host: p.host, members: p.members.map(({ id, name }) => ({ id, name })),
    at: p.at, atAge: now() - p.atSince, ...(p.room ? { room: p.room } : {}), rev: p.rev,
  });
  const touch = (p: Party) => { p.rev++; };

  function remove(p: Party, memberId: string) {
    p.members = p.members.filter((m) => m.id !== memberId);
    partyOf.delete(memberId);
    if (!p.members.length) { parties.delete(p.id); return; }
    if (p.host === memberId) p.host = p.members[0].id;
    touch(p);
  }

  function solo(m: Member, at: Where = { path: '/' }): Party {
    const p: Party = { id: rid(), host: m.id, members: [m], at, atSince: now(), rev: 1 };
    parties.set(p.id, p);
    partyOf.set(m.id, p.id);
    return p;
  }

  function prune() {
    const cut = now() - STALE_MS;
    for (const p of [...parties.values()]) for (const m of [...p.members]) if (m.seen < cut) remove(p, m.id);
  }

  /** Find a member by id and token, refreshing when they were last seen. */
  function auth(id: unknown, token: unknown): { p: Party; m: Member } | null {
    const pid = typeof id === 'string' ? partyOf.get(id) : undefined;
    const p = pid ? parties.get(pid) : undefined;
    const m = p?.members.find((x) => x.id === id && x.token === token);
    if (!p || !m) return null;
    m.seen = now();
    return { p, m };
  }

  return {
    /** Restore or create this browser's member, and join the party of an invite link when there is room. */
    hello(h: Hello): HelloResult {
      prune();
      let found = auth(h.id, h.token);
      if (!found) {
        const m: Member = { id: rid(), token: rid(12), name: cleanName(h.name), seen: now() };
        found = { p: solo(m), m };
      } else if (h.name) {
        found.m.name = cleanName(h.name);
        touch(found.p);
      }
      let { p } = found;
      const { m } = found;
      let full = false;
      const target = h.invite ? parties.get(h.invite) : undefined;
      if (target && target !== p) {
        if (target.members.length >= PARTY_MAX) full = true;
        else {
          remove(p, m.id);
          target.members.push(m);
          partyOf.set(m.id, target.id);
          touch(target);
          p = target;
        }
      }
      return { me: { id: m.id, token: m.token }, party: view(p), ...(full ? { full } : {}) };
    },
    /** The member's party (null: unknown member, they say hello again). */
    poll(id: unknown, token: unknown): PartyView | null {
      prune();
      const f = auth(id, token);
      return f ? view(f.p) : null;
    },
    rename(id: unknown, token: unknown, name: unknown): PartyView | null {
      const f = auth(id, token);
      if (!f) return null;
      f.m.name = cleanName(name);
      touch(f.p);
      return view(f.p);
    },
    /** Host only: where the host is now. Going back to the main menu forgets the waiting room. */
    goto(id: unknown, token: unknown, at: Where): PartyView | null {
      const f = auth(id, token);
      if (!f || f.p.host !== f.m.id) return null;
      const path = typeof at?.path === 'string' ? at.path.slice(0, 200) : '/';
      const edition = typeof at?.edition === 'string' ? at.edition.slice(0, 20) : undefined;
      if (path !== f.p.at.path || edition !== f.p.at.edition) {
        f.p.at = { path, ...(edition ? { edition } : {}) };
        f.p.atSince = now();
        if (path === '/') delete f.p.room;
        touch(f.p);
      }
      return view(f.p);
    },
    /** Host only: the party's current waiting room (kept while the host moves between maps). */
    setRoom(id: unknown, token: unknown, room: unknown): PartyView | null {
      const f = auth(id, token);
      if (!f || f.p.host !== f.m.id) return null;
      if (typeof room === 'string' && room) f.p.room = room.slice(0, 64); else delete f.p.room;
      touch(f.p);
      return view(f.p);
    },
    /** Host only: remove a member, who gets a party of their own. */
    kick(id: unknown, token: unknown, target: unknown): PartyView | null {
      const f = auth(id, token);
      if (!f || f.p.host !== f.m.id || target === f.m.id) return null;
      const t = f.p.members.find((m) => m.id === target);
      if (!t) return view(f.p);
      remove(f.p, t.id);
      solo(t);
      return view(f.p);
    },
    /** Leave the party for one of my own. */
    leave(id: unknown, token: unknown): PartyView | null {
      const f = auth(id, token);
      if (!f) return null;
      if (f.p.members.length === 1) return view(f.p);
      remove(f.p, f.m.id);
      return view(solo(f.m));
    },
  };
}

export type PartyStore = ReturnType<typeof createPartyStore>;

/** The party API under /api/party/*. Every call answers with the caller's party, or 401 (say hello again). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function installParty(server: { router: any }, store: PartyStore = createPartyStore()) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answer = (ctx: any, v: unknown) => { if (v) ctx.body = v; else { ctx.status = 401; ctx.body = { error: 'unknown member' }; } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = (name: string, fn: (b: any) => unknown) => server.router.post(`/api/party/${name}`, koaBody(), (ctx: any) => answer(ctx, fn(ctx.request.body ?? {})));
  post('hello', (b) => store.hello({ id: b.id, token: b.token, name: b.name, invite: b.invite }));
  post('poll', (b) => store.poll(b.id, b.token));
  post('rename', (b) => store.rename(b.id, b.token, b.name));
  post('goto', (b) => store.goto(b.id, b.token, b.at));
  post('room', (b) => store.setRoom(b.id, b.token, b.room));
  post('kick', (b) => store.kick(b.id, b.token, b.target));
  post('leave', (b) => store.leave(b.id, b.token));
  return store;
}
