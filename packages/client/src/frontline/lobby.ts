import { LobbyClient } from 'boardgame.io/client';
import { FRONTLINE_GAME_NAME, type ArmyId } from '@boboland/shared/src/frontline';
import { load, save } from '../lib/storage';

const client = new LobbyClient({ server: window.location.origin });

export interface FlSeat { matchID: string; playerID: string; credentials: string; name: string }
export interface FlMatch { names: Record<string, string>; nextMatchID?: string }

const seatKey = (matchID: string) => `frontline.seat.${matchID}`;
export const savedSeat = (matchID: string): FlSeat | null => load<FlSeat | null>(seatKey(matchID), null);
const saveSeat = (s: FlSeat) => save(seatKey(s.matchID), s);

/** Create a two-seat match and sit in seat 0. */
export async function hostMatch(name: string, turnSeconds = 0): Promise<FlSeat> {
  const { matchID } = await client.createMatch(FRONTLINE_GAME_NAME, { numPlayers: 2, setupData: { turnSeconds } });
  return joinSeat(matchID, '0', name);
}

export async function joinSeat(matchID: string, playerID: string, name: string): Promise<FlSeat> {
  const { playerCredentials } = await client.joinMatch(FRONTLINE_GAME_NAME, matchID, { playerID, playerName: name });
  const seat = { matchID, playerID, credentials: playerCredentials, name };
  saveSeat(seat);
  return seat;
}

export async function fetchMatch(matchID: string): Promise<FlMatch> {
  const m = await client.getMatch(FRONTLINE_GAME_NAME, matchID);
  const names: Record<string, string> = {};
  for (const p of m.players) if (p.name) names[String(p.id)] = p.name;
  return { names, nextMatchID: (m as { nextMatchID?: string }).nextMatchID };
}

/** Ask for the next match; returns its id (the same id if the other player already asked). */
export async function rematchFor(seat: FlSeat, turnSeconds = 0, army: ArmyId = 'classic'): Promise<string> {
  const { nextMatchID } = await client.playAgain(FRONTLINE_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, numPlayers: 2, setupData: { turnSeconds, army } });
  return nextMatchID;
}

/** Take my seat in the next match and remember it. */
export const enterNext = (seat: FlSeat, nextMatchID: string) => joinSeat(nextMatchID, seat.playerID, seat.name);

/** The link the other player opens (public address when online, else this computer's home-network address). */
export async function frontlineJoinUrl(matchID: string): Promise<string> {
  let lanIp: string | undefined;
  let publicUrl: string | null = null;
  try {
    const i = await (await fetch('/api/lan-info')).json();
    lanIp = i.addresses?.[0];
    publicUrl = i.publicUrl ?? null;
  } catch { /* fall back to this page's address */ }
  if (publicUrl) return `${publicUrl.replace(/\/+$/, '')}/frontline/join/${matchID}`;
  const { protocol, hostname, port } = window.location;
  const host = lanIp && hostname === 'localhost' ? lanIp : hostname;
  return `${protocol}//${host}${port ? `:${port}` : ''}/frontline/join/${matchID}`;
}
