import { useEffect, useState } from 'react';
import { LobbyClient } from 'boardgame.io/client';
import { GAME_NAME, type BotLevel } from '@boboland/shared';
import { load, save } from './storage';
import { shareUrlFor } from './share';
import { MAX_SEATS, gameSeatOf, seatColors, type WaitingSeat } from './lobbyRules';
import { PLAYER_COLORS } from '../theme';
import { EDITION } from '../edition';
import type { EditionId } from '@boboland/shared/src/editions';
import { joinData, mapForRoom, mergeSeatData, parseSeatData, roomEdition } from './seatData';

export const lobby = new LobbyClient({ server: window.location.origin });

export interface Seat { matchID: string; playerID: string; credentials: string; name: string }
const seatKey = (matchID: string) => `boboland.seat.${matchID}`;

export const savedSeat = (matchID: string) => load<Seat | null>(seatKey(matchID), null);
const remember = (seat: Seat) => save(seatKey(seat.matchID), seat);

/**
 * Host a game: a waiting room with room for five; the host sits in seat 0 with the first colour.
 * Seat 0's data carries the room's edition (the map everyone plays), which the host can change.
 */
export async function createLanMatch(name: string): Promise<Seat> {
  const { matchID } = await lobby.createMatch(GAME_NAME, { numPlayers: MAX_SEATS });
  return joinLanMatch(matchID, name, '0', 0, EDITION.id);
}

export async function joinLanMatch(matchID: string, name: string, playerID?: string, color?: number, edition?: EditionId): Promise<Seat> {
  const data = joinData(color, edition);
  const res = await lobby.joinMatch(GAME_NAME, matchID, {
    playerName: name, ...(playerID ? { playerID } : {}), ...(data ? { data } : {}),
  } as { playerName: string; playerID?: string });
  const seat = { matchID, playerID: res.playerID, credentials: res.playerCredentials, name };
  remember(seat);
  return seat;
}

export interface MatchSeat extends WaitingSeat { id: number; name?: string; color?: number; bot?: BotLevel }
/** `edition` is the room's edition, set by the host (seat 0); undefined for a match that has none. */
export interface MatchInfo { seats: MatchSeat[]; nextMatchID?: string; edition?: EditionId }

export async function matchInfo(matchID: string): Promise<MatchInfo> {
  const m = await lobby.getMatch(GAME_NAME, matchID);
  const seats = m.players.map((p) => {
    const { color, bot } = parseSeatData(p.data);
    return { id: p.id, name: p.name, color, ...(bot ? { bot } : {}) };
  });
  return { seats, nextMatchID: (m as { nextMatchID?: string }).nextMatchID, edition: roomEdition(m.players) };
}

export async function matchSeats(matchID: string): Promise<MatchSeat[]> {
  return (await matchInfo(matchID)).seats;
}

/** Change part of my seat's data. updatePlayer replaces `data`, so the rest (colour, edition) is read back and kept. */
async function updateSeatData(seat: Seat, patch: { color?: number; edition?: EditionId }): Promise<void> {
  const m = await lobby.getMatch(GAME_NAME, seat.matchID);
  const current = m.players.find((p) => String(p.id) === seat.playerID)?.data;
  await lobby.updatePlayer(GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, data: mergeSeatData(current, patch) } as never);
}

/** Change my colour in the waiting room (the room's edition on seat 0 stays). */
export function setSeatColor(seat: Seat, color: number): Promise<void> {
  return updateSeatData(seat, { color });
}

/** Host only: pick the map the room plays. Every joined screen follows. */
export function setRoomEdition(seat: Seat, edition: EditionId): Promise<void> {
  return updateSeatData(seat, { edition });
}

async function botCall(path: string, body: object): Promise<Response> {
  const r = await fetch(`/api/bots/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(r.status === 409 ? 'No open seat for a bot.' : `Bot request failed (${r.status})`);
  return r;
}

/** Host only: seat a server-played bot in the lowest open seat. */
export async function addBot(seat: Seat, level: BotLevel): Promise<string> {
  const r = await botCall('add', { matchID: seat.matchID, credentials: seat.credentials, level });
  return ((await r.json()) as { playerID: string }).playerID;
}

/** Host only: take a bot out of its seat. */
export async function removeBot(seat: Seat, playerID: string): Promise<void> {
  await botCall('remove', { matchID: seat.matchID, credentials: seat.credentials, playerID });
}

/** Host only: open the real game, sized to the people who joined. Returns its match id. */
export async function startLanMatch(seat: Seat, players: number): Promise<string> {
  // the waiting room's own setup data names no map: the game gets the room's edition (seat 0), else the one this page shows
  const room = (await matchInfo(seat.matchID)).edition;
  const r = await lobby.playAgain(GAME_NAME, seat.matchID, {
    playerID: seat.playerID, credentials: seat.credentials, numPlayers: players, setupData: { map: mapForRoom(room, EDITION.id) },
  } as never);
  return r.nextMatchID;
}

/**
 * Host only, after a game ends: open a new 5-seat waiting room for the same group, on the map just played
 * (this page shows it; the host re-joins the room with that edition, and can change it before Start).
 * Returns its match id.
 */
export async function openNextWaitingRoom(gameSeat: Seat): Promise<string> {
  const r = await lobby.playAgain(GAME_NAME, gameSeat.matchID, {
    playerID: gameSeat.playerID, credentials: gameSeat.credentials, numPlayers: MAX_SEATS, setupData: { map: EDITION.map },
  } as never);
  return r.nextMatchID;
}

const rejoining = new Map<string, Promise<Seat>>();
/**
 * After a game: move into the new waiting room, keeping my seat number (so the host stays seat 0, the host's seat)
 * and my colour. Safe to call more than once (and after a reload).
 */
export function rejoinWaitingRoom(gameSeat: Seat, waitingID: string, color?: number): Promise<Seat> {
  // the host (seat 0) carries the room's edition: the one just played
  const saved = savedSeat(waitingID);
  if (saved) return Promise.resolve(saved);
  const inFlight = rejoining.get(waitingID);
  if (inFlight) return inFlight;
  const p = joinLanMatch(waitingID, gameSeat.name, gameSeat.playerID, color, gameSeat.playerID === '0' ? EDITION.id : undefined);
  p.catch(() => rejoining.delete(waitingID));
  rejoining.set(waitingID, p);
  return p;
}

const entering = new Map<string, Promise<Seat>>();
/**
 * Move from the waiting room into the real game: take the seat matching my place among the joined players,
 * with my settled colour. Safe to call more than once (and after a reload).
 */
export function enterGame(waiting: Seat, seats: MatchSeat[], nextMatchID: string): Promise<Seat> {
  const saved = savedSeat(nextMatchID);
  if (saved) return Promise.resolve(saved);
  const inFlight = entering.get(nextMatchID);
  if (inFlight) return inFlight;
  const playerID = gameSeatOf(seats, waiting.playerID);
  if (playerID === null) return Promise.reject(new Error('not in this game'));
  const color = seatColors(seats, PLAYER_COLORS.length)[Number(playerID)];
  const p = joinLanMatch(nextMatchID, waiting.name, playerID, color);
  entering.set(nextMatchID, p);
  return p;
}

export async function lanInfo(): Promise<{ addresses: string[]; port: number; publicUrl: string | null }> {
  const r = await fetch('/api/lan-info');
  return r.json();
}

let onlineKnown: boolean | null = null;

/** True when this server was started with `npm run play:online` (it has a public address). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(onlineKnown ?? false);
  useEffect(() => {
    if (onlineKnown !== null) return;
    let alive = true;
    lanInfo().then((i) => { onlineKnown = !!i.publicUrl; if (alive) setOnline(onlineKnown); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return online;
}

/** URL the other players open: the online (tunnel) address if there is one, else this computer on the home network. */
export function shareUrl(info: { publicUrl?: string | null; lanIp?: string }, matchID: string): string {
  return shareUrlFor({ ...info, page: window.location }, matchID);
}
