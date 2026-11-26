import { LobbyClient } from 'boardgame.io/client';
import { BLOCKY_GAME_NAME, type BBotLevel, type Board } from '@boboland/shared/src/blocky';
import { gameSeatOf, joinedSeats } from '@boboland/shared/src/lobbyRules';
import { load, save } from '../lib/storage';
import { AVATAR_COUNT } from './text';

/**
 * Online rooms, Runeshift's waiting-room pattern: a 4-seat `blocky` match is the Guild Hall; the host's Start
 * opens a match sized to the people who joined and everyone moves in, in seat order. The room host is the lowest
 * joined human seat; its `settings` rule the room. Each seat picks a unique builder avatar; guilds are dealt at the start.
 */
export const ROOM_SEATS = 4;
const client = new LobbyClient({ server: window.location.origin });

export interface BlySeat { matchID: string; playerID: string; credentials: string; name: string }
export interface RoomSettings { board: Board; hints: boolean }
export interface RoomSeat { id: number; name?: string; avatar?: number; bot?: BBotLevel; settings?: RoomSettings }
export interface RoomInfo { seats: RoomSeat[]; nextMatchID?: string; settings: RoomSettings; host: number | null }
export const DEFAULT_SETTINGS: RoomSettings = { board: 'duo', hints: true };
/** Duo only with exactly two builders; a third seat forces Classic. */
export const boardFor = (s: RoomSettings, joined: number): Board => (joined === 2 ? s.board : 'classic');

const key = (m: string) => `bly.seat.${m}`;
export const savedSeat = (matchID: string) => load<BlySeat | null>(key(matchID), null);
const remember = (s: BlySeat) => save(key(s.matchID), s);

const firstFreeAvatar = (seats: RoomSeat[]) => {
  const used = new Set(seats.filter((s) => s.name).map((s) => s.avatar));
  return [...Array(AVATAR_COUNT).keys()].find((h) => !used.has(h)) ?? 0;
};
/** The lowest joined human seat runs the room. */
export const roomHost = (seats: RoomSeat[]) => joinedSeats(seats).find((s) => !s.bot)?.id ?? null;

export async function hostRoom(name: string): Promise<BlySeat> {
  const { matchID } = await client.createMatch(BLOCKY_GAME_NAME, { numPlayers: ROOM_SEATS });
  return joinRoom(matchID, name, '0', { avatar: 0, settings: DEFAULT_SETTINGS });
}

export async function joinRoom(matchID: string, name: string, playerID?: string, data?: object): Promise<BlySeat> {
  let pid = playerID, d = data;
  if (!pid) {
    const info = await roomInfo(matchID);
    const open = info.seats.filter((s) => !s.name).sort((a, b) => a.id - b.id)[0];
    if (!open) throw new Error('Every seat in the hall is taken.');
    pid = String(open.id);
    d = { avatar: firstFreeAvatar(info.seats) };
  }
  const r = await client.joinMatch(BLOCKY_GAME_NAME, matchID, { playerID: pid, playerName: name, ...(d ? { data: d } : {}) } as never);
  const seat = { matchID, playerID: pid, credentials: r.playerCredentials, name };
  remember(seat);
  return seat;
}

export async function roomInfo(matchID: string): Promise<RoomInfo> {
  const m = await client.getMatch(BLOCKY_GAME_NAME, matchID);
  const seats: RoomSeat[] = m.players.map((p) => {
    const d = (p.data ?? {}) as Omit<RoomSeat, 'id' | 'name'>;
    return { id: p.id, name: p.name, avatar: d.avatar, bot: d.bot, settings: d.settings };
  });
  const host = roomHost(seats);
  const settings = seats.find((s) => s.id === host)?.settings ?? seats.find((s) => s.settings)?.settings ?? DEFAULT_SETTINGS;
  return { seats, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, settings, host };
}

async function patchData(seat: BlySeat, patch: object) {
  const m = await client.getMatch(BLOCKY_GAME_NAME, seat.matchID);
  const cur = (m.players.find((p) => String(p.id) === seat.playerID)?.data ?? {}) as object;
  await client.updatePlayer(BLOCKY_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, data: { ...cur, ...patch } } as never);
}
export const setAvatar = (seat: BlySeat, avatar: number) => patchData(seat, { avatar });
export const setSettings = (seat: BlySeat, settings: RoomSettings) => patchData(seat, { settings });
export async function renameSeat(seat: BlySeat, name: string) {
  await client.updatePlayer(BLOCKY_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, newName: name } as never);
  remember({ ...seat, name });
}
export async function leaveRoom(seat: BlySeat) {
  await client.leaveMatch(BLOCKY_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials });
  save(key(seat.matchID), null);
}

async function botCall(path: 'add' | 'remove', body: object) {
  const r = await fetch(`/api/blocky/bots/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 409 ? 'No empty seat for a computer builder.' : `Request failed (${r.status})`);
}
export const addBot = (seat: BlySeat, level: BBotLevel) => botCall('add', { matchID: seat.matchID, credentials: seat.credentials, level });
export const removeBot = (seat: BlySeat, playerID: number) => botCall('remove', { matchID: seat.matchID, credentials: seat.credentials, playerID });

/** Host: open the game for everyone who joined (avatars and bots in joined order). */
export async function startGame(seat: BlySeat, info: RoomInfo): Promise<string> {
  const joined = joinedSeats(info.seats);
  const avatars: number[] = [];
  for (const s of joined) avatars.push(s.avatar !== undefined && !avatars.includes(s.avatar) ? s.avatar : [...Array(AVATAR_COUNT).keys()].find((h) => !avatars.includes(h) && !joined.some((o) => o !== s && o.avatar === h))!);
  const r = await client.playAgain(BLOCKY_GAME_NAME, seat.matchID, {
    playerID: seat.playerID, credentials: seat.credentials, numPlayers: joined.length,
    setupData: { board: boardFor(info.settings, joined.length), hints: info.settings.hints, avatars, bots: joined.map((s) => !!s.bot) },
  } as never);
  return r.nextMatchID;
}

const entering = new Map<string, Promise<BlySeat>>();
/** Move from the waiting room into the game, in my joined order (safe to call again, e.g. after a reload). */
export function enterGame(room: BlySeat, info: RoomInfo): Promise<BlySeat> {
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
export async function nextRoom(game: BlySeat): Promise<string> {
  const r = await client.playAgain(BLOCKY_GAME_NAME, game.matchID, { playerID: game.playerID, credentials: game.credentials, numPlayers: ROOM_SEATS } as never);
  return r.nextMatchID;
}

/** Back into the next waiting room, keeping my game seat number and avatar. */
export function rejoinRoom(game: BlySeat, roomID: string, keep: { avatar?: number; host: boolean; settings?: RoomSettings }): Promise<BlySeat> {
  const saved = savedSeat(roomID);
  if (saved) return Promise.resolve(saved);
  if (!entering.has(roomID)) {
    const p = joinRoom(roomID, game.name, game.playerID, { avatar: keep.avatar, ...(keep.host ? { settings: keep.settings ?? DEFAULT_SETTINGS } : {}) });
    p.catch(() => entering.delete(roomID));
    entering.set(roomID, p);
  }
  return entering.get(roomID)!;
}

export interface MatchMeta { names: Record<string, string>; bots: Record<string, BBotLevel>; nextMatchID?: string; count: number }
export async function matchMeta(matchID: string): Promise<MatchMeta> {
  const m = await client.getMatch(BLOCKY_GAME_NAME, matchID);
  const names: Record<string, string> = {}, bots: Record<string, BBotLevel> = {};
  for (const p of m.players) { if (p.name) names[String(p.id)] = p.name; const b = (p.data as { bot?: BBotLevel } | undefined)?.bot; if (b) bots[String(p.id)] = b; }
  return { names, bots, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, count: m.players.length };
}

/** The link others open: the public address when online, else this computer's home-network address. */
export async function roomUrl(matchID: string): Promise<string> {
  let lanIp: string | undefined, publicUrl: string | null = null;
  try { const i = await (await fetch('/api/lan-info')).json(); lanIp = i.addresses?.[0]; publicUrl = i.publicUrl ?? null; } catch { /* this page's address */ }
  if (publicUrl) return `${publicUrl.replace(/\/+$/, '')}/blocky/join/${matchID}`;
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${lanIp && hostname === 'localhost' ? lanIp : hostname}${port ? `:${port}` : ''}/blocky/join/${matchID}`;
}
