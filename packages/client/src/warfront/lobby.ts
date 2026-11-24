import { LobbyClient } from 'boardgame.io/client';
import { WARFRONT_GAME_NAME, type Mode, type WarBotLevel } from '@boboland/shared/src/warfront';
import { firstFreeColor, gameSeatOf, joinedSeats, seatColors } from '@boboland/shared/src/lobbyRules';
import { load, save } from '../lib/storage';

/**
 * Online/LAN rooms, the Ticket waiting-room pattern: a 6-seat Warfront match is the war room; the host's Start
 * opens a match sized to the people who joined and everyone moves in, in seat order. Seat 0's data carries the
 * room's settings (mode, deployment).
 */
export const ROOM_SEATS = 6;
const client = new LobbyClient({ server: window.location.origin });

export interface WarSeat { matchID: string; playerID: string; credentials: string; name: string }
export interface RoomSettings { mode: Mode; autoDeploy: boolean }
export interface RoomSeat { id: number; name?: string; color?: number; bot?: WarBotLevel; settings?: RoomSettings }
export interface RoomInfo { seats: RoomSeat[]; nextMatchID?: string; settings: RoomSettings }
export const DEFAULT_SETTINGS: RoomSettings = { mode: 'domination', autoDeploy: true };

const key = (m: string) => `warfront.seat.${m}`;
export const savedSeat = (matchID: string) => load<WarSeat | null>(key(matchID), null);
const remember = (s: WarSeat) => save(key(s.matchID), s);

export async function hostRoom(name: string): Promise<WarSeat> {
  const { matchID } = await client.createMatch(WARFRONT_GAME_NAME, { numPlayers: ROOM_SEATS });
  return joinRoom(matchID, name, '0', { color: 0, settings: DEFAULT_SETTINGS });
}

export async function joinRoom(matchID: string, name: string, playerID?: string, data?: object): Promise<WarSeat> {
  let pid = playerID, d = data;
  if (!pid) {
    const info = await roomInfo(matchID);
    const open = info.seats.filter((s) => !s.name).sort((a, b) => a.id - b.id)[0];
    if (!open) throw new Error('The war room is full.');
    pid = String(open.id);
    d = { color: firstFreeColor(info.seats, ROOM_SEATS) };
  }
  const r = await client.joinMatch(WARFRONT_GAME_NAME, matchID, { playerID: pid, playerName: name, ...(d ? { data: d } : {}) } as never);
  const seat = { matchID, playerID: pid, credentials: r.playerCredentials, name };
  remember(seat);
  return seat;
}

export async function roomInfo(matchID: string): Promise<RoomInfo> {
  const m = await client.getMatch(WARFRONT_GAME_NAME, matchID);
  const seats: RoomSeat[] = m.players.map((p) => {
    const d = (p.data ?? {}) as { color?: number; bot?: WarBotLevel; settings?: RoomSettings };
    return { id: p.id, name: p.name, color: d.color, bot: d.bot, settings: d.settings };
  });
  return { seats, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, settings: seats[0]?.settings ?? DEFAULT_SETTINGS };
}

async function patchData(seat: WarSeat, patch: object) {
  const m = await client.getMatch(WARFRONT_GAME_NAME, seat.matchID);
  const cur = (m.players.find((p) => String(p.id) === seat.playerID)?.data ?? {}) as object;
  await client.updatePlayer(WARFRONT_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, data: { ...cur, ...patch } } as never);
}
export const setColor = (seat: WarSeat, color: number) => patchData(seat, { color });
export const setSettings = (seat: WarSeat, settings: RoomSettings) => patchData(seat, { settings });
export async function renameSeat(seat: WarSeat, name: string) {
  await client.updatePlayer(WARFRONT_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, newName: name } as never);
  remember({ ...seat, name });
}
export async function leaveRoom(seat: WarSeat) {
  await client.leaveMatch(WARFRONT_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials });
  save(key(seat.matchID), null);
}

async function botCall(path: 'add' | 'remove', body: object) {
  const r = await fetch(`/api/warfront/bots/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 409 ? 'No open seat for a computer general.' : `Request failed (${r.status})`);
}
export const addBot = (seat: WarSeat, level: WarBotLevel) => botCall('add', { matchID: seat.matchID, credentials: seat.credentials, level });
export const removeBot = (seat: WarSeat, playerID: number) => botCall('remove', { matchID: seat.matchID, credentials: seat.credentials, playerID });

/** Host: open the battle for everyone who joined. */
export async function startBattle(seat: WarSeat, info: RoomInfo): Promise<string> {
  const joined = joinedSeats(info.seats);
  const factions = seatColors(info.seats, ROOM_SEATS);
  const r = await client.playAgain(WARFRONT_GAME_NAME, seat.matchID, {
    playerID: seat.playerID, credentials: seat.credentials, numPlayers: joined.length,
    setupData: { mode: joined.length === 2 ? 'domination' : info.settings.mode, autoDeploy: info.settings.autoDeploy, factions },
  } as never);
  return r.nextMatchID;
}

const entering = new Map<string, Promise<WarSeat>>();
/** Move from the war room into the battle, in my joined order (safe to call again, e.g. after a reload). */
export function enterBattle(room: WarSeat, info: RoomInfo): Promise<WarSeat> {
  const next = info.nextMatchID!;
  const saved = savedSeat(next);
  if (saved) return Promise.resolve(saved);
  if (!entering.has(next)) {
    const pid = gameSeatOf(info.seats, room.playerID);
    if (pid === null) return Promise.reject(new Error('not in this battle'));
    const p = joinRoom(next, room.name, pid);
    p.catch(() => entering.delete(next));
    entering.set(next, p);
  }
  return entering.get(next)!;
}

/** Host, after a battle: open the next war room for the same group. */
export async function nextRoom(game: WarSeat): Promise<string> {
  const r = await client.playAgain(WARFRONT_GAME_NAME, game.matchID, { playerID: game.playerID, credentials: game.credentials, numPlayers: ROOM_SEATS } as never);
  return r.nextMatchID;
}

/** Back into the next war room, keeping my battle seat number (the host stays seat 0) and my colour. */
export function rejoinRoom(game: WarSeat, roomID: string, color: number | undefined): Promise<WarSeat> {
  const saved = savedSeat(roomID);
  if (saved) return Promise.resolve(saved);
  if (!entering.has(roomID)) {
    const p = joinRoom(roomID, game.name, game.playerID, { color, ...(game.playerID === '0' ? { settings: DEFAULT_SETTINGS } : {}) });
    p.catch(() => entering.delete(roomID));
    entering.set(roomID, p);
  }
  return entering.get(roomID)!;
}

export async function matchNames(matchID: string): Promise<{ names: Record<string, string>; bots: Record<string, WarBotLevel>; nextMatchID?: string; count: number }> {
  const m = await client.getMatch(WARFRONT_GAME_NAME, matchID);
  const names: Record<string, string> = {}, bots: Record<string, WarBotLevel> = {};
  for (const p of m.players) { if (p.name) names[String(p.id)] = p.name; const b = (p.data as { bot?: WarBotLevel } | undefined)?.bot; if (b) bots[String(p.id)] = b; }
  return { names, bots, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, count: m.players.length };
}

/** The link others open: the public address when online, else this computer's home-network address. */
export async function roomUrl(matchID: string): Promise<string> {
  let lanIp: string | undefined, publicUrl: string | null = null;
  try { const i = await (await fetch('/api/lan-info')).json(); lanIp = i.addresses?.[0]; publicUrl = i.publicUrl ?? null; } catch { /* this page's address */ }
  if (publicUrl) return `${publicUrl.replace(/\/+$/, '')}/warfront/join/${matchID}`;
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${lanIp && hostname === 'localhost' ? lanIp : hostname}${port ? `:${port}` : ''}/warfront/join/${matchID}`;
}
