import type { BBotLevel, Board } from '@boboland/shared/src/blocky';
import { load, save } from '../lib/storage';
import { AVATAR_COUNT, BOT_TITLE } from './text';

/** A local match (pass and play or vs computer): who sits where, their avatar, and the room options. */
export type SeatKind = 'human' | BBotLevel;
export interface SeatCfg { kind: SeatKind; name: string; avatar: number }
export interface LocalCfg { seats: SeatCfg[]; board: Board; hints: boolean }
export const KIND_LABEL: Record<SeatKind, string> = { human: 'Player', easy: `Computer · ${BOT_TITLE.easy}`, medium: `Computer · ${BOT_TITLE.medium}`, hard: `Computer · ${BOT_TITLE.hard}` };

export const defaultCfg = (mode: 'bot' | 'local', name = 'You'): LocalCfg => mode === 'bot'
  ? { seats: [{ kind: 'human', name, avatar: 0 }, { kind: 'medium', name: BOT_TITLE.medium, avatar: 1 }], board: 'duo', hints: true }
  : { seats: [{ kind: 'human', name: 'Player 1', avatar: 0 }, { kind: 'human', name: 'Player 2', avatar: 1 }], board: 'duo', hints: true };
const KEY = (mode: 'bot' | 'local') => `bly.setup.${mode}`;
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
    if (c.seats.some((x) => !kinds.includes(x.kind) || !Number.isInteger(x.avatar) || x.avatar < 0 || x.avatar >= AVATAR_COUNT)) return null;
    if (new Set(c.seats.map((x) => x.avatar)).size !== c.seats.length || !c.seats.some((x) => x.kind === 'human')) return null;
    if (c.board !== 'duo' && c.board !== 'classic') return null;
    if (c.board === 'duo' && c.seats.length !== 2) return null;
    return { seats: c.seats.map((x) => ({ kind: x.kind, avatar: x.avatar, name: String(x.name ?? '').slice(0, 20) || 'Builder' })), board: c.board, hints: c.hints !== false };
  } catch { return null; }
}
