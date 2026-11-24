import type { Mode, WarBotLevel } from '@boboland/shared/src/warfront';
import { load, save } from '../lib/storage';

/** A local match: who sits where (a human or a computer general), names, factions, mode and deployment. */
export type SeatKind = 'human' | WarBotLevel;
export interface SeatCfg { kind: SeatKind; name: string; faction: number }
export interface LocalCfg { seats: SeatCfg[]; mode: Mode; autoDeploy: boolean }
export const BOT_TITLE: Record<WarBotLevel, string> = { easy: 'Cadet', medium: 'Colonel', hard: 'Field Marshal' };
export const KIND_LABEL: Record<SeatKind, string> = { human: 'Human', easy: 'Cadet (easy)', medium: 'Colonel (medium)', hard: 'Field Marshal (hard)' };

export const defaultCfg = (name = 'You'): LocalCfg => ({
  seats: [{ kind: 'human', name, faction: 0 }, { kind: 'medium', name: 'Colonel', faction: 1 }, { kind: 'medium', name: 'Colonel 2', faction: 2 }],
  mode: 'domination', autoDeploy: true,
});
const KEY = 'warfront.muster';
export const lastCfg = (name?: string) => load<LocalCfg | null>(KEY, null) ?? defaultCfg(name);
export const rememberCfg = (c: LocalCfg) => save(KEY, c);

export const encodeCfg = (c: LocalCfg) => btoa(encodeURIComponent(JSON.stringify(c)));
export function readCfg(search: string): LocalCfg | null {
  try {
    const s = new URLSearchParams(search).get('s');
    if (!s) return null;
    const c = JSON.parse(decodeURIComponent(atob(s))) as LocalCfg;
    const kinds: SeatKind[] = ['human', 'easy', 'medium', 'hard'];
    if (!Array.isArray(c.seats) || c.seats.length < 2 || c.seats.length > 6) return null;
    if (c.seats.some((x) => !kinds.includes(x.kind) || !Number.isInteger(x.faction) || x.faction < 0 || x.faction > 5)) return null;
    if (new Set(c.seats.map((x) => x.faction)).size !== c.seats.length || !c.seats.some((x) => x.kind === 'human')) return null;
    return { seats: c.seats.map((x) => ({ ...x, name: String(x.name ?? '').slice(0, 24) || 'General' })), mode: c.mode === 'mission' && c.seats.length > 2 ? 'mission' : 'domination', autoDeploy: c.autoDeploy !== false };
  } catch { return null; }
}
