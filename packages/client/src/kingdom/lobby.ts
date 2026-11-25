import { LobbyClient } from 'boardgame.io/client';
import { HEROES, KINGDOM_GAME_NAME, type KBotLevel, type Length } from '@boboland/shared/src/kingdom';
import { gameSeatOf, joinedSeats } from '@boboland/shared/src/lobbyRules';
import { load, save } from '../lib/storage';

/**
 * Online rooms, Warfront's waiting-room pattern: a 4-seat `kingdom` match is the waiting room; the host's Start
 * opens a match sized to the people who joined and everyone moves in, in seat order. The room host is the lowest
 * joined human seat; its `settings` rule the room. Each seat picks a unique hero and may turn on Young Adventurer.
 */
export const ROOM_SEATS = 4;
const client = new LobbyClient({ server: window.location.origin });

export interface KgSeat { matchID: string; playerID: string; credentials: string; name: string }
export interface RoomSettings { length: Length; hints: boolean }
export interface RoomSeat { id: number; name?: string; hero?: number; young?: boolean; bot?: KBotLevel; settings?: RoomSettings }
export interface RoomInfo { seats: RoomSeat[]; nextMatchID?: string; settings: RoomSettings; host: number | null }
export const DEFAULT_SETTINGS: RoomSettings = { length: 'medium', hints: true };

const key = (m: string) => `kg.seat.${m}`;
export const savedSeat = (matchID: string) => load<KgSeat | null>(key(matchID), null);
const remember = (s: KgSeat) => save(key(s.matchID), s);

const firstFreeHero = (seats: RoomSeat[]) => {
  const used = new Set(seats.filter((s) => s.name).map((s) => s.hero));
  return [...HEROES.keys()].find((h) => !used.has(h)) ?? 0;
};
/** The lowest joined human seat runs the room. */
export const roomHost = (seats: RoomSeat[]) => joinedSeats(seats).find((s) => !s.bot)?.id ?? null;

export async function hostRoom(name: string): Promise<KgSeat> {
  const { matchID } = await client.createMatch(KINGDOM_GAME_NAME, { numPlayers: ROOM_SEATS });
  return joinRoom(matchID, name, '0', { hero: 0, young: false, settings: DEFAULT_SETTINGS });
}

export async function joinRoom(matchID: string, name: string, playerID?: string, data?: object): Promise<KgSeat> {
  let pid = playerID, d = data;
  if (!pid) {
    const info = await roomInfo(matchID);
    const open = info.seats.filter((s) => !s.name).sort((a, b) => a.id - b.id)[0];
    if (!open) throw new Error('Every seat at this table is taken.');
    pid = String(open.id);
    d = { hero: firstFreeHero(info.seats), young: false };
  }
  const r = await client.joinMatch(KINGDOM_GAME_NAME, matchID, { playerID: pid, playerName: name, ...(d ? { data: d } : {}) } as never);
  const seat = { matchID, playerID: pid, credentials: r.playerCredentials, name };
  remember(seat);
  return seat;
}

export async function roomInfo(matchID: string): Promise<RoomInfo> {
  const m = await client.getMatch(KINGDOM_GAME_NAME, matchID);
  const seats: RoomSeat[] = m.players.map((p) => {
    const d = (p.data ?? {}) as Omit<RoomSeat, 'id' | 'name'>;
    return { id: p.id, name: p.name, hero: d.hero, young: !!d.young, bot: d.bot, settings: d.settings };
  });
  const host = roomHost(seats);
  const settings = seats.find((s) => s.id === host)?.settings ?? seats.find((s) => s.settings)?.settings ?? DEFAULT_SETTINGS;
  return { seats, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, settings, host };
}

async function patchData(seat: KgSeat, patch: object) {
  const m = await client.getMatch(KINGDOM_GAME_NAME, seat.matchID);
  const cur = (m.players.find((p) => String(p.id) === seat.playerID)?.data ?? {}) as object;
  await client.updatePlayer(KINGDOM_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, data: { ...cur, ...patch } } as never);
}
export const setHero = (seat: KgSeat, hero: number) => patchData(seat, { hero });
export const setYoung = (seat: KgSeat, young: boolean) => patchData(seat, { young });
export const setSettings = (seat: KgSeat, settings: RoomSettings) => patchData(seat, { settings });
export async function renameSeat(seat: KgSeat, name: string) {
  await client.updatePlayer(KINGDOM_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, newName: name } as never);
  remember({ ...seat, name });
}
export async function leaveRoom(seat: KgSeat) {
  await client.leaveMatch(KINGDOM_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials });
  save(key(seat.matchID), null);
}

async function botCall(path: 'add' | 'remove', body: object) {
  const r = await fetch(`/api/kingdom/bots/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 409 ? 'No empty seat for a computer player.' : `Request failed (${r.status})`);
}
export const addBot = (seat: KgSeat, level: KBotLevel) => botCall('add', { matchID: seat.matchID, credentials: seat.credentials, level });
export const removeBot = (seat: KgSeat, playerID: number) => botCall('remove', { matchID: seat.matchID, credentials: seat.credentials, playerID });

/** Host: open the game for everyone who joined (heroes, Young Adventurer and bots in joined order). */
export async function startGame(seat: KgSeat, info: RoomInfo): Promise<string> {
  const joined = joinedSeats(info.seats);
  const heroes: number[] = [];
  for (const s of joined) heroes.push(s.hero !== undefined && !heroes.includes(s.hero) ? s.hero : [...HEROES.keys()].find((h) => !heroes.includes(h) && !joined.some((o) => o !== s && o.hero === h))!);
  const r = await client.playAgain(KINGDOM_GAME_NAME, seat.matchID, {
    playerID: seat.playerID, credentials: seat.credentials, numPlayers: joined.length,
    setupData: { length: info.settings.length, hints: info.settings.hints, heroes, young: joined.map((s) => !!s.young), bots: joined.map((s) => !!s.bot) },
  } as never);
  return r.nextMatchID;
}

const entering = new Map<string, Promise<KgSeat>>();
/** Move from the waiting room into the game, in my joined order (safe to call again, e.g. after a reload). */
export function enterGame(room: KgSeat, info: RoomInfo): Promise<KgSeat> {
  const next = info.nextMatchID!;
  const saved = savedSeat(next);
  if (saved) return Promise.resolve(saved);
  if (!entering.has(next)) {
    const pid = gameSeatOf(info.seats, room.playerID);
    if (pid === null) return Promise.reject(new Error('not in this game'));
    const p = joinRoom(next, room.name, pid);
    p.catch(() => entering.delete(next));
    entering.set(next, p);
  }
  return entering.get(next)!;
}

/** Host, after a game: open the next waiting room for the same group. */
export async function nextRoom(game: KgSeat): Promise<string> {
  const r = await client.playAgain(KINGDOM_GAME_NAME, game.matchID, { playerID: game.playerID, credentials: game.credentials, numPlayers: ROOM_SEATS } as never);
  return r.nextMatchID;
}

/** Back into the next waiting room, keeping my game seat number, hero and Young Adventurer choice. */
export function rejoinRoom(game: KgSeat, roomID: string, keep: { hero?: number; young?: boolean; host: boolean; settings?: RoomSettings }): Promise<KgSeat> {
  const saved = savedSeat(roomID);
  if (saved) return Promise.resolve(saved);
  if (!entering.has(roomID)) {
    const p = joinRoom(roomID, game.name, game.playerID, { hero: keep.hero, young: !!keep.young, ...(keep.host ? { settings: keep.settings ?? DEFAULT_SETTINGS } : {}) });
    p.catch(() => entering.delete(roomID));
    entering.set(roomID, p);
  }
  return entering.get(roomID)!;
}

export interface MatchMeta { names: Record<string, string>; bots: Record<string, KBotLevel>; nextMatchID?: string; count: number }
export async function matchMeta(matchID: string): Promise<MatchMeta> {
  const m = await client.getMatch(KINGDOM_GAME_NAME, matchID);
  const names: Record<string, string> = {}, bots: Record<string, KBotLevel> = {};
  for (const p of m.players) { if (p.name) names[String(p.id)] = p.name; const b = (p.data as { bot?: KBotLevel } | undefined)?.bot; if (b) bots[String(p.id)] = b; }
  return { names, bots, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, count: m.players.length };
}

/** The link others open: the public address when online, else this computer's home-network address. */
export async function roomUrl(matchID: string): Promise<string> {
  let lanIp: string | undefined, publicUrl: string | null = null;
  try { const i = await (await fetch('/api/lan-info')).json(); lanIp = i.addresses?.[0]; publicUrl = i.publicUrl ?? null; } catch { /* this page's address */ }
  if (publicUrl) return `${publicUrl.replace(/\/+$/, '')}/kingdom/join/${matchID}`;
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${lanIp && hostname === 'localhost' ? lanIp : hostname}${port ? `:${port}` : ''}/kingdom/join/${matchID}`;
}
