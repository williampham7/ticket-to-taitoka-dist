import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, deploy, newMatch, resign, viewFor, WEAPON_IDS, type FleetState } from '@boboland/shared/src/fleet';
import {
  EMPTY_PROGRESS, RANKS, applyGains, isUnlocked, loadProgress, matchGains, rankFor, saveProgress, unlockHint, unlockedWeapons,
} from './progress';

const SHIPS = [
  { cls: 'dreadnought', at: 0, dir: 'h' }, { cls: 'cruiser', at: 20, dir: 'h' }, { cls: 'frigate', at: 40, dir: 'h' },
  { cls: 'submarine', at: 60, dir: 'h' }, { cls: 'corvette', at: 80, dir: 'h' },
] as const;
const SQUARES = [0, 1, 2, 3, 4, 20, 21, 22, 23, 40, 41, 42, 60, 61, 62, 80, 81];
const WATER = Array.from({ length: 100 }, (_, i) => i).filter((i) => Math.floor(i / 10) % 2 === 1);

/** Seat 0 sinks seat 1's whole fleet in 17 turns without losing a ship. */
function flawlessWin(mode: 'classic' | 'salvo' = 'classic'): FleetState {
  const S = newMatch(mode, 1, '0');
  deploy(S, '0', { ships: [...SHIPS], loadout: [] });
  deploy(S, '1', { ships: [...SHIPS], loadout: [] });
  let w = 0;
  for (const s of SQUARES) {
    if (S.stage !== 'battle') break;
    act(S, '0', { type: 'shell', sq: s }, () => 0);
    if (S.stage === 'battle') act(S, '1', { type: 'shell', sq: WATER[w++] }, () => 0);
  }
  return S;
}

describe('Fleet ranks', () => {
  it('climbs Cadet to Admiral by XP', () => {
    expect(RANKS.map((r) => r.name)).toEqual(['Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Commodore', 'Admiral']);
    expect(rankFor(0).name).toBe('Cadet');
    expect(rankFor(249).name).toBe('Cadet');
    expect(rankFor(250).name).toBe('Ensign');
    expect(rankFor(250).next?.name).toBe('Lieutenant');
    expect(rankFor(99999).name).toBe('Admiral');
    expect(rankFor(99999).next).toBeUndefined();
  });
});

describe('Fleet unlocks', () => {
  it('starts with Frag Bomb, Air Strike, Chain Gun and Shield', () => {
    expect(unlockedWeapons(EMPTY_PROGRESS).sort()).toEqual(['airStrike', 'chainGun', 'frag', 'shield']);
  });

  it('unlocks by ships sunk and by feats', () => {
    const p = { ...EMPTY_PROGRESS, sunk: 45, flawless: true };
    expect(isUnlocked(p, 'seaMine')).toBe(true);
    expect(isUnlocked(p, 'torpedo')).toBe(true);
    expect(isUnlocked(p, 'supernova')).toBe(false);
    expect(isUnlocked(p, 'cherry')).toBe(true);
    expect(isUnlocked(p, 'maelstrom')).toBe(false);
  });

  it('has a plain hint for every weapon', () => {
    for (const w of WEAPON_IDS) expect(unlockHint(w).length).toBeGreaterThan(3);
    expect(unlockHint('supernova')).toBe('Sink 100 ships');
    expect(WEAPON_IDS).not.toContain('smoke');
  });
});

describe('Fleet gains', () => {
  it('a flawless quick win vs Hard earns sinks, XP and every win feat', () => {
    const S = flawlessWin();
    const g = matchGains(viewFor(S, '0'), '0', 'bot', 'hard')!;
    expect(g.sunk).toBe(5);
    expect(g.won).toBe(true);
    // 17 hits x2 + 5 sinks x15 + 1 round x40 + match 100 + Hard 25
    expect(g.xp).toBe(34 + 75 + 40 + 100 + 25);
    expect(g.feats).toEqual({ flawless: true, quickWin: false, salvoAll5: false, beatHard: true });
  });

  it('the loser still earns for hits and sinks', () => {
    const S = flawlessWin();
    const g = matchGains(viewFor(S, '1'), '1', 'online')!;
    expect(g.won).toBe(false);
    expect(g.sunk).toBe(0);
    expect(g.xp).toBe(0);
  });

  it('nothing in pass and play, nor before the match is over', () => {
    expect(matchGains(viewFor(flawlessWin(), '0'), '0', 'local')).toBeNull();
    const S = newMatch('classic', 1, '0');
    expect(matchGains(viewFor(S, '0'), '0', 'bot', 'easy')).toBeNull();
  });

  it('a win by resignation counts as a win', () => {
    const S = newMatch('classic', 1, '0');
    resign(S, '1');
    const g = matchGains(viewFor(S, '0'), '0', 'online')!;
    expect(g.won).toBe(true);
    expect(g.xp).toBe(100);
  });

  it('applying gains reports new unlocks and a rank up', () => {
    const before = { ...EMPTY_PROGRESS, sunk: 8, xp: 240 };
    const { next, unlocked, rankUp } = applyGains(before, { sunk: 3, won: true, xp: 20, feats: { flawless: true, quickWin: false, salvoAll5: false, beatHard: false } });
    expect(next.sunk).toBe(11);
    expect(next.wins).toBe(1);
    expect(next.xp).toBe(260);
    expect(unlocked.sort()).toEqual(['cherry', 'seaMine']);
    expect(rankUp).toBe('Ensign');
  });
});

describe('Fleet progress storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) });
  });

  it('saves and loads, and survives junk', () => {
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
    saveProgress({ ...EMPTY_PROGRESS, xp: 30 });
    expect(loadProgress().xp).toBe(30);
    localStorage.setItem('fleet.progress', '{bad json');
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
    localStorage.setItem('fleet.progress', JSON.stringify({ xp: 'lots', sunk: -3 }));
    expect(loadProgress()).toEqual(EMPTY_PROGRESS);
  });
});
