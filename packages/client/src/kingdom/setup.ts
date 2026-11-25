import { HEROES, type KBotLevel, type Length } from '@boboland/shared/src/kingdom';
import { load, save } from '../lib/storage';

/** A local match (pass and play or vs computer): who sits where, their hero, Young Adventurer, and the room options. */
export type SeatKind = 'human' | KBotLevel;
export interface SeatCfg { kind: SeatKind; name: string; hero: number; young: boolean }
export interface LocalCfg { seats: SeatCfg[]; length: Length; hints: boolean }
export const BOT_TITLE: Record<KBotLevel, string> = { easy: 'Page', medium: 'Squire', hard: 'Sage' };
export const KIND_LABEL: Record<SeatKind, string> = { human: 'Player', easy: 'Computer · Page (easy)', medium: 'Computer · Squire (medium)', hard: 'Computer · Sage (hard)' };

export const defaultCfg = (mode: 'bot' | 'local', name = 'You'): LocalCfg => mode === 'bot'
  ? { seats: [{ kind: 'human', name, hero: 0, young: false }, { kind: 'easy', name: 'Page', hero: 1, young: false }], length: 'short', hints: true }
  : { seats: [{ kind: 'human', name: 'Player 1', hero: 0, young: false }, { kind: 'human', name: 'Player 2', hero: 1, young: false }], length: 'short', hints: true };
const KEY = (mode: 'bot' | 'local') => `kg.setup.${mode}`;
export const lastCfg = (mode: 'bot' | 'local', name?: string) => load<LocalCfg | null>(KEY(mode), null) ?? defaultCfg(mode, name);
export const rememberCfg = (mode: 'bot' | 'local', c: LocalCfg) => save(KEY(mode), c);

export const encodeCfg = (c: LocalCfg) => btoa(encodeURIComponent(JSON.stringify(c)));
export function readCfg(search: string): LocalCfg | null {
  try {
    const s = new URLSearchParams(search).get('s');
    if (!s) return null;
    const c = JSON.parse(decodeURIComponent(atob(s))) as LocalCfg;
    const kinds: SeatKind[] = ['human', 'easy', 'medium', 'hard'];
    if (!Array.isArray(c.seats) || c.seats.length < 2 || c.seats.length > 4) return null;
    if (c.seats.some((x) => !kinds.includes(x.kind) || !Number.isInteger(x.hero) || x.hero < 0 || x.hero >= HEROES.length)) return null;
    if (new Set(c.seats.map((x) => x.hero)).size !== c.seats.length || !c.seats.some((x) => x.kind === 'human')) return null;
    return {
      seats: c.seats.map((x) => ({ kind: x.kind, hero: x.hero, young: !!x.young, name: String(x.name ?? '').slice(0, 20) || 'Hero' })),
      length: (['full', 'medium', 'short'] as Length[]).includes(c.length) ? c.length : 'short', hints: c.hints !== false,
    };
  } catch { return null; }
}
