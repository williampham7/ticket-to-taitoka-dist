/**
 * Egyptian War lobby: a 5-seat waiting room (an `egyptian` match with setupData { waiting: true }) where people
 * pick colours and the host picks the slap rules (seat 0's data). Start opens the real game sized to who joined
 * (playAgain); everyone moves into it in seat order. After a game the host opens the next waiting room the same way.
 */
import { LobbyClient } from 'boardgame.io/client';
import { EGYPTIAN_GAME_NAME, type SlapRuleId } from '@boboland/shared/src/egyptian';
import { gameSeatOf, joinedSeats, seatColors, MAX_SEATS } from '@boboland/shared';
import { load, save } from '../lib/storage';
import { EGW_COLORS } from './colors';
import { isE2E } from './fx';
import { mergeEgwSeatData, parseEgwSeatData, roomRules, type EgwSeatData } from './roomData';

const client = new LobbyClient({ server: window.location.origin });

export interface EgwSeat { matchID: string; playerID: string; credentials: string; name: string }
export interface RoomSeat { id: number; name?: string; color?: number }
export interface RoomInfo { seats: RoomSeat[]; rules: SlapRuleId[]; nextMatchID?: string }
export interface GameInfo { names: Record<string, string>; colors: Record<string, string>; nextMatchID?: string }

const seatKey = (matchID: string) => `egw.seat.${matchID}`;
export const savedSeat = (matchID: string): EgwSeat | null => load<EgwSeat | null>(seatKey(matchID), null);
const remember = (s: EgwSeat) => save(seatKey(s.matchID), s);

const gameData = (rules: SlapRuleId[]) => ({ rules, ...(isE2E() ? { quick: true } : {}) });

export async function joinRoom(matchID: string, name: string, playerID?: string, data?: EgwSeatData): Promise<EgwSeat> {
  const res = await client.joinMatch(EGYPTIAN_GAME_NAME, matchID, {
    playerName: name, ...(playerID ? { playerID } : {}), ...(data && Object.keys(data).length ? { data } : {}),
  } as { playerName: string; playerID?: string });
  const seat = { matchID, playerID: res.playerID, credentials: res.playerCredentials, name };
  remember(seat);
  return seat;
}

/** Open a waiting room and sit in seat 0 with the room's rules. */
export async function createRoom(name: string, rules: SlapRuleId[]): Promise<EgwSeat> {
  const { matchID } = await client.createMatch(EGYPTIAN_GAME_NAME, { numPlayers: MAX_SEATS, setupData: { waiting: true, rules } });
  return joinRoom(matchID, name, '0', { color: 0, rules });
}

export async function roomInfo(matchID: string): Promise<RoomInfo> {
  const m = await client.getMatch(EGYPTIAN_GAME_NAME, matchID);
  const seats = m.players.map((p) => ({ id: p.id, name: p.name, ...parseEgwSeatData(p.data) }));
  return { seats, rules: roomRules(m.players), nextMatchID: (m as { nextMatchID?: string }).nextMatchID };
}

async function updateSeat(seat: EgwSeat, patch: EgwSeatData) {
  const m = await client.getMatch(EGYPTIAN_GAME_NAME, seat.matchID);
  const current = m.players.find((p) => String(p.id) === seat.playerID)?.data;
  await client.updatePlayer(EGYPTIAN_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, data: mergeEgwSeatData(current, patch) } as never);
}
export const setSeatColor = (seat: EgwSeat, color: number) => updateSeat(seat, { color });
/** Host only: the room's slap rules (every screen in the room shows them live). */
export const setRoomRules = (seat: EgwSeat, rules: SlapRuleId[]) => updateSeat(seat, { rules });

export async function renameSeat(seat: EgwSeat, name: string) {
  await client.updatePlayer(EGYPTIAN_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, newName: name } as never);
  remember({ ...seat, name });
}

export async function leaveRoom(seat: EgwSeat) {
  await client.leaveMatch(EGYPTIAN_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials });
  save(seatKey(seat.matchID), null);
}

/** Host only: open the game for everyone who joined. */
export async function startGame(seat: EgwSeat, players: number, rules: SlapRuleId[]): Promise<string> {
  const r = await client.playAgain(EGYPTIAN_GAME_NAME, seat.matchID, {
    playerID: seat.playerID, credentials: seat.credentials, numPlayers: players, setupData: gameData(rules),
  } as never);
  return r.nextMatchID;
}

const entering = new Map<string, Promise<EgwSeat>>();
/** Move from the waiting room into the game: my place among the joined players, with my settled colour. */
export function enterGame(room: EgwSeat, seats: RoomSeat[], nextMatchID: string): Promise<EgwSeat> {
  const saved = savedSeat(nextMatchID);
  if (saved) return Promise.resolve(saved);
  const inFlight = entering.get(nextMatchID);
  if (inFlight) return inFlight;
  const playerID = gameSeatOf(seats, room.playerID);
  if (playerID === null) return Promise.reject(new Error('not in this game'));
  const color = seatColors(seats, EGW_COLORS.length)[Number(playerID)];
  const p = joinRoom(nextMatchID, room.name, playerID, { color });
  p.catch(() => entering.delete(nextMatchID));
  entering.set(nextMatchID, p);
  return p;
}

export async function gameInfo(matchID: string): Promise<GameInfo> {
  const m = await client.getMatch(EGYPTIAN_GAME_NAME, matchID);
  const names: Record<string, string> = {}, colors: Record<string, string> = {};
  for (const p of m.players) {
    names[String(p.id)] = p.name ?? `Player ${p.id + 1}`;
    colors[String(p.id)] = EGW_COLORS[parseEgwSeatData(p.data).color ?? p.id % EGW_COLORS.length];
  }
  return { names, colors, nextMatchID: (m as { nextMatchID?: string }).nextMatchID };
}

/** Host only, after a game: open the next waiting room with the same rules. */
export async function openNextRoom(gameSeat: EgwSeat, rules: SlapRuleId[]): Promise<string> {
  const r = await client.playAgain(EGYPTIAN_GAME_NAME, gameSeat.matchID, {
    playerID: gameSeat.playerID, credentials: gameSeat.credentials, numPlayers: MAX_SEATS, setupData: { waiting: true, rules },
  } as never);
  return r.nextMatchID;
}

const rejoining = new Map<string, Promise<EgwSeat>>();
/** After a game: take my game seat number in the next room (the host stays seat 0 and carries the rules). */
export function rejoinRoom(gameSeat: EgwSeat, roomID: string, color: number | undefined, rules: SlapRuleId[]): Promise<EgwSeat> {
  const saved = savedSeat(roomID);
  if (saved) return Promise.resolve(saved);
  const inFlight = rejoining.get(roomID);
  if (inFlight) return inFlight;
  const data: EgwSeatData = { ...(color !== undefined ? { color } : {}), ...(gameSeat.playerID === '0' ? { rules } : {}) };
  const p = joinRoom(roomID, gameSeat.name, gameSeat.playerID, data);
  p.catch(() => rejoining.delete(roomID));
  rejoining.set(roomID, p);
  return p;
}

/** The address others open: the public one when online, else this computer's home-network address. */
export async function egwUrl(path: string): Promise<string> {
  let lanIp: string | undefined;
  let publicUrl: string | null = null;
  try {
    const i = await (await fetch('/api/lan-info')).json();
    lanIp = i.addresses?.[0];
    publicUrl = i.publicUrl ?? null;
  } catch { /* fall back to this page's address */ }
  if (publicUrl) return `${publicUrl.replace(/\/+$/, '')}${path}`;
  const { protocol, hostname, port } = window.location;
  const host = lanIp && hostname === 'localhost' ? lanIp : hostname;
  return `${protocol}//${host}${port ? `:${port}` : ''}${path}`;
}

export { joinedSeats };
