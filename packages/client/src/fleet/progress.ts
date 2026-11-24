/**
 * Fleet progression, per device in localStorage: ships sunk, wins, XP, rank and the feats that unlock weapons.
 * Earned in vs Computer and online games only (never pass and play). Every storage access is guarded.
 */
import { WEAPONS, WEAPON_IDS, type BotLevel, type FleetView, type PlayerID, type WeaponId } from '@boboland/shared/src/fleet';
import type { FleetKind } from './FleetScreen';

export interface Feats { flawless: boolean; quickWin: boolean; salvoAll5: boolean; beatHard: boolean }
export interface Progress extends Feats { sunk: number; wins: number; xp: number }
export const EMPTY_PROGRESS: Progress = { sunk: 0, wins: 0, xp: 0, flawless: false, quickWin: false, salvoAll5: false, beatHard: false };

export const RANKS = [
  { name: 'Cadet', xp: 0 }, { name: 'Ensign', xp: 250 }, { name: 'Lieutenant', xp: 750 }, { name: 'Commander', xp: 2000 },
  { name: 'Captain', xp: 4500 }, { name: 'Commodore', xp: 9000 }, { name: 'Admiral', xp: 18000 },
] as const;

/** XP awards (tuning knobs). */
export const XP = { hit: 2, sink: 15, round: 40, match: 100, beatHard: 25 } as const;

export function rankFor(xp: number): { name: string; index: number; xp: number; next?: { name: string; xp: number } } {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const next = RANKS[i + 1];
  return { name: RANKS[i].name, index: i, xp: RANKS[i].xp, ...(next ? { next: { name: next.name, xp: next.xp } } : {}) };
}

export function isUnlocked(p: Progress, w: WeaponId): boolean {
  const u = WEAPONS[w].unlock;
  switch (u.kind) {
    case 'start': return true;
    case 'sinks': return p.sunk >= u.n;
    case 'flawless': return p.flawless;
    case 'salvoAll5': return p.salvoAll5;
    case 'quickWin': return p.quickWin;
  }
}

export const unlockedWeapons = (p: Progress): WeaponId[] => WEAPON_IDS.filter((w) => isUnlocked(p, w));

export function unlockHint(w: WeaponId): string {
  const u = WEAPONS[w].unlock;
  switch (u.kind) {
    case 'start': return 'Ready from the start';
    case 'sinks': return `Sink ${u.n} ships`;
    case 'flawless': return 'Win a game without losing a ship';
    case 'salvoAll5': return 'Hit all 5 enemy ships with one salvo';
    case 'quickWin': return `Win a game within ${u.turns} of your turns`;
  }
}

export interface Gains { sunk: number; won: boolean; xp: number; feats: Feats }

/** What `me` earned in a finished match (null when nothing is earned: pass and play, watching, or not over yet). */
export function matchGains(v: FleetView, me: PlayerID, kind: FleetKind, level?: BotLevel): Gains | null {
  if (!v.result || (kind !== 'bot' && kind !== 'online')) return null;
  const stats = v.sides[me].stats;
  const hits = stats?.hits ?? 0;
  const sunk = stats?.sunk ?? 0;
  const won = v.result.winner === me;
  const roundsWon = v.rounds.filter((r) => r.winner === me);
  const beatHard = won && kind === 'bot' && level === 'hard';
  const xp = hits * XP.hit + sunk * XP.sink + roundsWon.length * XP.round + (won ? XP.match : 0) + (beatHard ? XP.beatHard : 0);
  return {
    sunk, won, xp,
    feats: {
      flawless: roundsWon.some((r) => r.lost[me] === 0),
      quickWin: roundsWon.some((r) => r.turns[me] <= 10),
      salvoAll5: !!stats?.salvoAll5,
      beatHard,
    },
  };
}

export function applyGains(p: Progress, g: Gains): { next: Progress; unlocked: WeaponId[]; rankUp?: string } {
  const next: Progress = {
    sunk: p.sunk + g.sunk, wins: p.wins + (g.won ? 1 : 0), xp: p.xp + g.xp,
    flawless: p.flawless || g.feats.flawless, quickWin: p.quickWin || g.feats.quickWin,
    salvoAll5: p.salvoAll5 || g.feats.salvoAll5, beatHard: p.beatHard || g.feats.beatHard,
  };
  const unlocked = WEAPON_IDS.filter((w) => !isUnlocked(p, w) && isUnlocked(next, w));
  const before = rankFor(p.xp), after = rankFor(next.xp);
  return { next, unlocked, ...(after.index > before.index ? { rankUp: after.name } : {}) };
}

const KEY = 'fleet.progress';
const count = (x: unknown) => (typeof x === 'number' && Number.isInteger(x) && x >= 0 ? x : null);

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    const o = JSON.parse(raw) as Record<string, unknown>;
    const sunk = count(o.sunk), wins = count(o.wins), xp = count(o.xp);
    if (sunk === null || wins === null || xp === null) return { ...EMPTY_PROGRESS };
    return { sunk, wins, xp, flawless: o.flawless === true, quickWin: o.quickWin === true, salvoAll5: o.salvoAll5 === true, beatHard: o.beatHard === true };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveProgress(p: Progress): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* blocked storage: progress just won't persist */ }
}
