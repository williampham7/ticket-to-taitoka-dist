/**
 * What an Egyptian War seat carries in its `data`: a colour, and on seat 0 (the host) the room's slap rules.
 * Untrusted, so always parsed. boardgame.io's updatePlayer replaces `data`, so updates go through mergeEgwSeatData.
 */
import { DEFAULT_RULES, validateRules, type SlapRuleId } from '@boboland/shared/src/egyptian';
import { EGW_COLORS } from './colors';

export interface EgwSeatData { color?: number; rules?: SlapRuleId[] }

export function parseEgwSeatData(raw: unknown): EgwSeatData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const color = typeof d.color === 'number' && Number.isInteger(d.color) && d.color >= 0 && d.color < EGW_COLORS.length ? d.color : undefined;
  return {
    ...(color !== undefined ? { color } : {}),
    ...(validateRules(d.rules) === undefined ? { rules: [...(d.rules as SlapRuleId[])] } : {}),
  };
}

export function mergeEgwSeatData(current: unknown, patch: EgwSeatData): EgwSeatData {
  const out = parseEgwSeatData(current);
  if (patch.color !== undefined) out.color = patch.color;
  if (patch.rules !== undefined) out.rules = [...patch.rules];
  return out;
}

/** The room's rules: the host's (seat 0) when valid, else the defaults. */
export function roomRules(players: readonly { id: number; data?: unknown }[]): SlapRuleId[] {
  return parseEgwSeatData(players.find((p) => p.id === 0)?.data).rules ?? [...DEFAULT_RULES];
}
