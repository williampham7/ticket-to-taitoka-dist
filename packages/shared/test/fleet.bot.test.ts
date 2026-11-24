import { describe, expect, it } from 'vitest';
import {
  BOT_LEVELS, act, botDeployment, chooseBotAction, deploy, newMatch, validateDeployment, viewActionError, viewFor, weaponReady,
  type BotLevel, type FleetAction, type PlayerID,
} from '../src/fleet';
import { prng } from './frontlineHelpers';
import { STANDARD, battle } from './fleetHelpers';
import { simulate } from './fleetSim';

const ZERO = () => 0;

describe('Fleet bot: deployment', () => {
  it('always deploys a valid fleet and loadout, deterministically', () => {
    for (const level of BOT_LEVELS) {
      for (const mode of ['classic', 'salvo', 'super'] as const) {
        for (let s = 1; s <= 30; s++) expect(validateDeployment(mode, botDeployment(mode, level, prng(s)))).toBeUndefined();
      }
      expect(botDeployment('super', level, prng(4))).toEqual(botDeployment('super', level, prng(4)));
    }
  });

  it('Hard picks a loadout with a defence and a heavy weapon', () => {
    for (let s = 1; s <= 20; s++) {
      const lo = botDeployment('super', 'hard', prng(s)).loadout;
      expect(lo.some((w) => ['shield', 'decoy', 'reinforcement'].includes(w))).toBe(true);
      expect(lo.some((w) => ['thunderhead', 'maelstrom', 'supernova', 'torpedo', 'chainGun'].includes(w))).toBe(true);
    }
  });
});

describe('Fleet bot: decisions', () => {
  it('decides from its own view only: hidden enemy positions do not change its choice', () => {
    const A = battle();
    const B = newMatch('classic', 1, '0');
    // same seen grid for seat 0, a different hidden enemy fleet
    const moved = STANDARD.map((s) => ({ ...s, at: s.at + 5 }));
    deploy(B, '0', { ships: STANDARD, loadout: [] });
    deploy(B, '1', { ships: moved, loadout: [] });
    for (const level of BOT_LEVELS) {
      expect(chooseBotAction(viewFor(A, '0'), '0', level, prng(7))).toEqual(chooseBotAction(viewFor(B, '0'), '0', level, prng(7)));
    }
  });

  it('Medium and Hard finish a ship they have found', () => {
    for (const level of ['medium', 'hard'] as BotLevel[]) {
      const S = battle();
      act(S, '0', { type: 'shell', sq: 41 }, ZERO); // the Frigate's middle square
      act(S, '1', { type: 'shell', sq: 99 }, ZERO);
      const a = chooseBotAction(viewFor(S, '0'), '0', level, prng(3)) as Extract<FleetAction, { type: 'shell' }>;
      expect([31, 40, 42, 51]).toContain(a.sq);
    }
  });

  it('Medium and Hard re-shoot a deflected square at once', () => {
    for (const level of ['medium', 'hard'] as BotLevel[]) {
      const S = battle('super', { loadout: { 0: ['frag', 'cherry', 'chainGun'], 1: ['shield', 'frag', 'cherry'] } });
      act(S, '0', { type: 'shell', sq: 60 }, ZERO);
      act(S, '1', { type: 'shell', sq: 99 }, ZERO);
      const a = chooseBotAction(viewFor(S, '0'), '0', level, prng(3));
      expect(a).toEqual({ type: 'shell', sq: 60 });
    }
  });

  it('every level always picks a legal action, in every mode, with weapons charged', () => {
    const rnd = prng(42);
    for (const level of BOT_LEVELS) {
      for (const mode of ['classic', 'salvo', 'super'] as const) {
        simulate({
          mode, levels: { 0: level, 1: level }, seed: Math.floor(rnd() * 1e6),
          onTurn: (S) => {
            if (S.stage !== 'battle') return;
            const p = S.turn;
            const v = viewFor(S, p);
            expect(viewActionError(v, p, chooseBotAction(v, p, level, prng(1)))).toBeUndefined();
          },
        });
      }
    }
  });

  it('Hard fires its weapons when they are ready', () => {
    const S = battle('super', { loadout: { 0: ['thunderhead', 'frag', 'cherry'], 1: ['frag', 'cherry', 'chainGun'] } });
    const rnd = prng(5);
    let usedWeapon = false;
    for (let t = 0; t < 40 && S.stage === 'battle'; t++) {
      const p = S.turn;
      const ready = p === '0' && (['thunderhead', 'frag', 'cherry'] as const).some((w) => weaponReady(S, '0', w));
      const a = chooseBotAction(viewFor(S, p), p, p === '0' ? 'hard' : 'easy', rnd);
      if (ready && a.type === 'weapon') usedWeapon = true;
      act(S, p, a, rnd);
    }
    expect(usedWeapon).toBe(true);
  });
});

describe('Fleet bot: strength', () => {
  function winRate(strong: BotLevel, weak: BotLevel, games: number): number {
    let wins = 0;
    for (let g = 0; g < games; g++) {
      const strongSeat: PlayerID = g % 2 ? '0' : '1';
      const levels = { [strongSeat]: strong, [strongSeat === '0' ? '1' : '0']: weak } as Record<PlayerID, BotLevel>;
      const S = simulate({ mode: 'classic', levels, seed: 1000 + g * 17 });
      if (S.result!.winner === strongSeat) wins++;
    }
    return wins / games;
  }

  it('Medium beats Easy and Hard beats Medium', () => {
    expect(winRate('medium', 'easy', 80)).toBeGreaterThan(0.75);
    expect(winRate('hard', 'medium', 120)).toBeGreaterThan(0.55);
  });
});
