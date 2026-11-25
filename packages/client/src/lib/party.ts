import { useSyncExternalStore } from 'react';
import { load, save } from './storage';
import { navigate, onNavigate } from './router';
import { EDITION, setEdition } from '../edition';
import type { EditionId } from '@boboland/shared/src/editions';
import { followTarget } from './partyRules';
import { lanInfo, leaveSeat, renameSeat, savedSeat } from './lobby';
import { inviteUrlFor } from './share';
import { savedSeat as savedFrontlineSeat } from '../frontline/lobby';
import { savedSeat as savedFleetSeat } from '../fleet/lobby';
import { savedSeat as savedEgyptianSeat } from '../egyptian/lobby';
import { savedSeat as savedWarfrontSeat } from '../warfront/lobby'; // Warfront
import { savedSeat as savedKingdomSeat } from '../kingdom/lobby'; // Kingdom

/**
 * The party on this browser: who I am (kept in localStorage), my name, and my party as the server last told it.
 * Polls the server; as host, reports where this screen is; as a member, follows the host (partyRules.ts).
 */
export const NAME_KEY = 'boboland.myName';
const ME_KEY = 'ttb.party.me';
export const PARTY_MAX = 5;
const POLL_MS = 1500;

export interface PartyView {
  id: string; host: string; members: { id: string; name: string }[];
  at: { path: string; edition?: string }; atAge: number; room?: string; rev: number;
}
interface Me { id: string; token: string }
export interface PartyState { name: string; me: Me | null; party: PartyView | null; notice: string | null }

let state: PartyState = { name: load<string>(NAME_KEY, ''), me: load<Me | null>(ME_KEY, null), party: null, notice: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<PartyState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => listeners.delete(cb); };

export const usePartyState = (): PartyState => useSyncExternalStore(subscribe, () => state);
export const isHost = (s: PartyState = state) => !!s.party && !!s.me && s.party.host === s.me.id;
/** In a party with other people, and not its host: this screen follows the host. */
export const isFollower = (s: PartyState = state) => !!s.party && s.party.members.length > 1 && !isHost(s);

async function call<T>(path: string, body: object): Promise<T | null> {
  const r = await fetch(`/api/party/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error(`party ${path}: ${r.status}`);
  return r.json() as Promise<T>;
}

let pendingInvite: string | null = null;
/** Set by an expected move (my own join or leave), so a party change is not read as being removed. */
let expectMove = false;

async function hello(): Promise<void> {
  const invite = pendingInvite;
  const r = await call<{ me: Me; party: PartyView; full?: boolean }>('hello', { ...(state.me ?? {}), name: state.name, invite });
  if (!r) return;
  pendingInvite = null;
  save(ME_KEY, r.me);
  expectMove = true;
  apply(r.party, { me: r.me, notice: r.full ? 'That party is full (5 people), so you are in a party of your own.' : state.notice });
}

/** Take in the server's answer: notice being removed, report or follow. */
function apply(party: PartyView, extra: Partial<PartyState> = {}) {
  const was = state.party;
  set({ ...extra, party });
  const moved = !!was && was.id !== party.id;
  if (moved && !expectMove) {
    void releaseSeats(was);
    set({ notice: 'You were removed from the party.' });
    navigate('/');
  }
  expectMove = false;
  if (isHost()) report();
  else follow();
}

/** As host: tell the party where this screen is (path and map). */
function report() {
  const p = state.party, me = state.me;
  if (!p || !me || !isHost()) return;
  const path = window.location.pathname;
  const at = { path, ...(path === '/' || path.startsWith('/frontline') || path.startsWith('/fleet') || path.startsWith('/warfront') || path.startsWith('/kingdom') /* Kingdom */ ? {} : { edition: EDITION.id }) };
  if (p.at.path === at.path && p.at.edition === at.edition) return;
  void call<PartyView>('goto', { ...me, at }).then((v) => v && set({ party: v })).catch(() => {});
}

/** As member: go where the host is. */
function follow() {
  const p = state.party, me = state.me;
  if (!p || !me || !isFollower()) return;
  const others = p.members.filter((m) => m.id !== p.host);
  const t = followTarget({
    at: p.at, atAge: p.atAge, here: window.location.pathname, edition: EDITION.id,
    hasSeat: (id) => !!savedSeat(id), hasFrontlineSeat: (id) => !!savedFrontlineSeat(id), hasFleetSeat: (id) => !!savedFleetSeat(id), hasEgyptianSeat: (id) => !!savedEgyptianSeat(id), hasWarfrontSeat: (id) => !!savedWarfrontSeat(id), hasKingdomSeat: (id) => !!savedKingdomSeat(id) /* Kingdom */, firstMember: others[0]?.id === me.id,
  });
  if (!t) return;
  if (t.edition) setEdition(t.edition as EditionId, { path: t.path });
  else navigate(t.path, true);
}

/** My seat in the party's waiting room, if I have one there. */
async function releaseSeats(p: PartyView | null) {
  const seat = p?.room ? savedSeat(p.room) : null;
  if (seat) await leaveSeat(seat).catch(() => {});
}

/** Start the party on page load: an invite link (/p/:id) is remembered, then everyone says hello once they have a name. */
export function startParty() {
  const m = /^\/p\/([\w-]+)/.exec(window.location.pathname);
  if (m) { pendingInvite = m[1]; window.history.replaceState(null, '', '/'); }
  if (state.name) void hello().catch(() => {});
  setInterval(() => {
    if (!state.name) return;
    const me = state.me;
    const ask = me ? call<PartyView>('poll', me) : Promise.resolve(null);
    ask.then((v) => (v ? apply(v) : hello())).catch(() => {});
  }, POLL_MS);
  onNavigate(() => { if (isHost()) report(); });
}

/** First visit: the name everyone sees. */
export async function setFirstName(name: string) {
  const n = name.trim().slice(0, 16);
  if (!n) return;
  save(NAME_KEY, n);
  set({ name: n });
  await hello().catch(() => {});
}

/** Change my name in the party, and on my seat in the waiting room I am in. */
export async function rename(name: string) {
  const n = name.trim().slice(0, 16);
  if (!n || n === state.name) return;
  save(NAME_KEY, n);
  set({ name: n });
  const me = state.me;
  if (me) { const v = await call<PartyView>('rename', { ...me, name: n }).catch(() => null); if (v) set({ party: v }); }
  const room = /^\/wait\/([\w-]+)/.exec(window.location.pathname)?.[1];
  const seat = room ? savedSeat(room) : null;
  if (seat) await renameSeat(seat, n).catch(() => {});
}

export async function kick(target: string) {
  const me = state.me;
  if (!me) return;
  const v = await call<PartyView>('kick', { ...me, target }).catch(() => null);
  if (v) set({ party: v });
}

export async function leaveParty() {
  const me = state.me;
  if (!me) return;
  const was = state.party;
  expectMove = true;
  const v = await call<PartyView>('leave', me).catch(() => null);
  if (!v) { expectMove = false; return; }
  await releaseSeats(was);
  set({ party: v });
  expectMove = false;
  navigate('/');
}

/** Host: the waiting room the party is in (kept while the host moves between maps; dropped on the main menu). */
export function setPartyRoom(room: string) {
  const me = state.me;
  if (!me || !isHost() || state.party?.room === room) return;
  void call<PartyView>('room', { ...me, room }).then((v) => v && set({ party: v })).catch(() => {});
}

export const clearNotice = () => set({ notice: null });

let lan: { lanIp?: string; publicUrl?: string | null } | null = null;
/** The invite link for my party (the online address when there is one, else this computer on the home network). */
export async function inviteUrl(partyID: string): Promise<string> {
  if (!lan) lan = await lanInfo().then((i) => ({ lanIp: i.addresses[0], publicUrl: i.publicUrl })).catch(() => ({}));
  return inviteUrlFor({ ...lan, page: window.location }, partyID);
}
