/**
 * Pure helpers for what a waiting-room seat carries in its `data` (colour, bot level, and on seat 0 the
 * room's edition), and for following the host's edition. No DOM, so they are unit-tested in Node.
 * boardgame.io's `updatePlayer` replaces `data`, so every update goes through `mergeSeatData`.
 */
import { BOT_LEVELS, type BotLevel } from '@boboland/shared';
import { EDITIONS, EDITION_IDS, isEditionId, type EditionId } from '@boboland/shared/src/editions';
import type { MapId } from '@boboland/shared/src/map/model';

export interface SeatData { color?: number; bot?: BotLevel; edition?: EditionId }

/** The parts of untrusted seat data we understand. */
export function parseSeatData(raw: unknown): SeatData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bot = BOT_LEVELS.find((l) => l === d.bot);
  return {
    ...(typeof d.color === 'number' ? { color: d.color } : {}),
    ...(bot ? { bot } : {}),
    ...(isEditionId(d.edition) ? { edition: d.edition } : {}),
  };
}

/** `current` with `patch` laid over it (undefined patch values leave the current one). */
export function mergeSeatData(current: unknown, patch: SeatData): SeatData {
  const out: SeatData = { ...parseSeatData(current) };
  if (patch.color !== undefined) out.color = patch.color;
  if (patch.bot !== undefined) out.bot = patch.bot;
  if (patch.edition !== undefined) out.edition = patch.edition;
  return out;
}

/** The `data` to send when joining a seat, or undefined when there is nothing to say. */
export function joinData(color?: number, edition?: EditionId): SeatData | undefined {
  const d: SeatData = { ...(color !== undefined ? { color } : {}), ...(edition ? { edition } : {}) };
  return Object.keys(d).length ? d : undefined;
}

/** The room's edition: the one on seat 0 (the host), if it is a valid edition. */
export function roomEdition(players: readonly { id: number; data?: unknown }[]): EditionId | undefined {
  return parseSeatData(players.find((p) => p.id === 0)?.data).edition;
}

/** The edition to move to so this page matches the room, or null when there is nothing to do. */
export function editionToFollow(room: unknown, current: EditionId): EditionId | null {
  return isEditionId(room) && room !== current ? room : null;
}

export interface FollowAttempt { id: string; at: number }
const FOLLOW_COOLDOWN_MS = 8000;

/** Guard against a reload loop (e.g. storage that cannot save): skip a reload to the same edition just tried. */
export function shouldFollow(target: string, last: FollowAttempt | null, now: number): boolean {
  return !(last && last.id === target && now - last.at < FOLLOW_COOLDOWN_MS);
}

/** The edition that plays a map (G.mapId), if any. */
export function editionForMap(map: string | undefined): EditionId | undefined {
  return EDITION_IDS.find((id) => EDITIONS[id].map === map);
}

/** The map the game starts on: the room's edition when the host set one, else the edition this page shows. */
export function mapForRoom(room: unknown, current: EditionId): MapId {
  return EDITIONS[isEditionId(room) ? room : current].map;
}
