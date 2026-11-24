import { LobbyClient } from 'boardgame.io/client';
import { FLEET_GAME_NAME, type FleetSetupData } from '@boboland/shared/src/fleet';
import { load, save } from '../lib/storage';

const client = new LobbyClient({ server: window.location.origin });

export interface FleetSeat { matchID: string; playerID: string; credentials: string; name: string }
export interface FleetMatch { names: Record<string, string>; nextMatchID?: string }

const seatKey = (matchID: string) => `fleet.seat.${matchID}`;
export const savedSeat = (matchID: string): FleetSeat | null => load<FleetSeat | null>(seatKey(matchID), null);
const saveSeat = (s: FleetSeat) => save(seatKey(s.matchID), s);

/** Create a two-seat match (mode and match length in setupData) and sit in seat 0. */
export async function hostMatch(name: string, setupData: FleetSetupData): Promise<FleetSeat> {
  const { matchID } = await client.createMatch(FLEET_GAME_NAME, { numPlayers: 2, setupData });
  return joinSeat(matchID, '0', name);
}

export async function joinSeat(matchID: string, playerID: string, name: string): Promise<FleetSeat> {
  const { playerCredentials } = await client.joinMatch(FLEET_GAME_NAME, matchID, { playerID, playerName: name });
  const seat = { matchID, playerID, credentials: playerCredentials, name };
  saveSeat(seat);
  return seat;
}

export async function fetchMatch(matchID: string): Promise<FleetMatch> {
  const m = await client.getMatch(FLEET_GAME_NAME, matchID);
  const names: Record<string, string> = {};
  for (const p of m.players) if (p.name) names[String(p.id)] = p.name;
  return { names, nextMatchID: (m as { nextMatchID?: string }).nextMatchID };
}

/** Ask for the next match with the same settings; returns its id (the same id if the other player already asked). */
export async function rematchFor(seat: FleetSeat, setupData: FleetSetupData): Promise<string> {
  const { nextMatchID } = await client.playAgain(FLEET_GAME_NAME, seat.matchID, { playerID: seat.playerID, credentials: seat.credentials, numPlayers: 2, setupData });
  return nextMatchID;
}

/** Take my seat in the next match and remember it. */
export const enterNext = (seat: FleetSeat, nextMatchID: string) => joinSeat(nextMatchID, seat.playerID, seat.name);

/** The link the other player opens (public address when online, else this computer's home-network address). */
export async function fleetJoinUrl(matchID: string): Promise<string> {
  let lanIp: string | undefined;
  let publicUrl: string | null = null;
  try {
    const i = await (await fetch('/api/lan-info')).json();
    lanIp = i.addresses?.[0];
    publicUrl = i.publicUrl ?? null;
  } catch { /* fall back to this page's address */ }
  if (publicUrl) return `${publicUrl.replace(/\/+$/, '')}/fleet/join/${matchID}`;
  const { protocol, hostname, port } = window.location;
  const host = lanIp && hostname === 'localhost' ? lanIp : hostname;
  return `${protocol}//${host}${port ? `:${port}` : ''}/fleet/join/${matchID}`;
}
